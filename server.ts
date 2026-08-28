import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy init Gemini AI
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
];

async function generateContentWithFallback(params: {
  contents: any[];
  systemInstruction?: string;
  responseMimeType?: string;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`Attempting generation with model: ${model}`);
      const config: any = {};
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err?.message || err);
      lastError = err;
      // Recoverable error: continues to next model in the fallback ladder
    }
  }

  throw lastError || new Error('All models in fallback chain failed to generate response.');
}

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// API: Multi-turn Reflection Chat Endpoint
app.post('/api/reflect/chat', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { messages = [], intent = 'deep_reflection', userTone = 'thoughtful' } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and must not be empty.' });
    }

    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are MindMirror, an empathetic, intellectually rigorous, and calm cognitive journaling companion.
Your purpose is to help the user think deeply, unpack complex thoughts, gain self-awareness, and find clarity without ever feeling judged.

Current Reference Date: ${currentDateStr} (${currentDayOfWeek}).

Core Reflection Guidelines:
1. Active Empathetic Listening: Validate feelings subtly without generic cliches (avoid "I understand that must be hard").
2. Socratic Guidance: Ask 1-2 sharp, thoughtful, and clarifying follow-up questions at the end of each turn that invite the user to inspect their assumptions, underlying motives, or latent emotions.
3. Cognitive Restructuring & Reframing: If the user displays cognitive distortions (e.g. catastrophizing, black-and-white thinking, fortune telling), gently introduce alternative perspectives.
4. Structured Clarity: Use bullet points, bold key concepts, or brief paragraphs when summarizing or providing actionable steps.
5. Intent Adaptation:
   - "deep_reflection": Focus on root causes, personal values, emotional nuance, and introspective depth.
   - "brainstorm": Offer creative divergence, multiple strategic angles, and exploratory hypotheses.
   - "summary": Distill core insights, patterns, and synthesized conclusions concisely.
   - "action_plan": Outline structured, prioritized, small, low-friction micro-actions.
   - "cognitive_restructuring": Identify thinking habits, examine the evidence, and construct balanced self-talk.
   - "gratitude": Anchor on savoring, connection, and grounded appreciation.

Tone: Calm, wise, concise, warm, and grounded. Format the "content" text using clean Markdown.

Action Detection Guidelines:
You must analyze the user's latest thought and reflection context for commitments or physical places mentioned:
1. Calendar Action Detection:
   - Detect commitments, reminders, meetings, interviews, appointments, deadlines, tasks with dates, or events mentioned naturally in the reflection.
   - Examples:
     * "Add my interview to my calendar." -> title: "Interview", date calculated relative to current reference date (${currentDateStr})
     * "Remind me to renew my passport next Friday." -> title: "Renew passport", date: next Friday's ISO date (YYYY-MM-DD)
     * "Meeting tomorrow at 3 PM." -> title: "Meeting", date: tomorrow's ISO date, time: "3:00 PM", duration: "1 hour"
     * "Dentist appointment this Thursday at 10am" -> title: "Dentist appointment", date: upcoming Thursday's ISO date, time: "10:00 AM"
   - Output fields for calendar action:
     * "type": "calendar"
     * "title": string (concise, clear event title)
     * "date": string (ISO date string YYYY-MM-DD or readable date string)
     * "time": string (optional, e.g. "3:00 PM" or "15:00")
     * "duration": string (optional, e.g. "30 mins" or "1 hour")
     * "description": string (optional, brief note)
2. Maps Action Detection:
   - Detect physical locations, venues, hospitals, parks, offices, landmarks, or addresses naturally mentioned.
   - Examples:
     * "Apollo Hospital, Velachery" -> placeName: "Apollo Hospital, Velachery"
     * "Marina Beach" -> placeName: "Marina Beach"
     * "Tidel Park" -> placeName: "Tidel Park"
   - Output fields for maps action:
     * "type": "maps"
     * "placeName": string (exact detected place name or location query)
3. If no calendar commitments or physical locations are mentioned, return an empty array "actions": []. Do not invent artificial actions.

Response Format:
You MUST respond strictly with valid JSON conforming to this schema:
{
  "content": "Empathetic, structured Markdown response with Socratic questions...",
  "actions": [
    // optional detected calendar and/or maps actions, or []
  ]
}`;

    // Map conversation to Gemini contents format
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content || '') }]
    }));

    const result = await generateContentWithFallback({
      contents,
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json'
    });

    let parsedContent = "I've reflected on your thought.";
    let detectedActions: any[] = [];

    try {
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.content === 'string') {
        parsedContent = parsed.content;
      } else if (typeof parsed === 'string') {
        parsedContent = parsed;
      }
      if (Array.isArray(parsed.actions)) {
        detectedActions = parsed.actions
          .filter((act: any) => act && (act.type === 'calendar' || act.type === 'maps'))
          .map((act: any, idx: number) => ({
            ...act,
            id: act.id || `act_${Date.now()}_${idx}`
          }));
      }
    } catch (parseErr) {
      console.warn('Could not parse JSON response from chat endpoint, falling back to raw text:', parseErr);
      parsedContent = result.text;
    }

    return res.json({
      content: parsedContent,
      actions: detectedActions,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in /api/reflect/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate reflection with Gemini AI.'
    });
  }
});

// API: Synthesize Session / Generate Insights & Summary
app.post('/api/reflect/synthesize', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { messages = [], intent = 'deep_reflection' } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const conversationText = messages
      .map((m: any) => `${m.role === 'user' ? 'User' : 'MindMirror'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Analyze this cognitive reflection session and generate a structured JSON synthesis.

Session Intent: ${intent}
Conversation:
"""
${conversationText}
"""

You MUST respond strictly with valid JSON conforming to this TypeScript schema:
{
  "title": "A crisp, evocative 3-6 word title summarizing the core reflection topic",
  "summary": "A cohesive 2-3 sentence executive summary of the user's reflection and thought process",
  "mood": "One or two words describing user emotional state (e.g. Contemplative & Hopeful, Overwhelmed, Energized)",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "cognitiveBiases": ["identified bias or healthy thinking pattern if present"],
  "takeaways": ["Core realization 1", "Core realization 2"],
  "actionItems": ["Actionable next step 1", "Actionable next step 2"],
  "suggestedPromptForNextTime": "A gentle provocative question for their next journaling session"
}`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json'
    });

    let parsed = {};
    try {
      // Remove possible markdown wrappers if model added them
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse synthesis JSON:', result.text);
      parsed = {
        title: 'Cognitive Reflection Session',
        summary: result.text.slice(0, 200),
        keyThemes: ['Reflection'],
        takeaways: ['Session completed'],
        actionItems: []
      };
    }

    return res.json({
      synthesis: parsed,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error('Error in /api/reflect/synthesize:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to synthesize reflection session.'
    });
  }
});

// API: Weekly Cognitive Growth & Patterns Analyzer
app.post('/api/reflect/patterns', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { entries = [] } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.json({
        patterns: "Start writing daily reflections to unlock long-term AI memory and cognitive pattern analytics."
      });
    }

    const summaries = entries.slice(0, 10).map((e: any, idx: number) => {
      return `[Entry ${idx + 1} (${e.createdAt}) - ${e.title} (${e.intent})]:\nSummary: ${e.summary || 'N/A'}\nTakeaways: ${(e.insights?.takeaways || []).join('; ')}\nThemes: ${(e.insights?.keyThemes || []).join(', ')}`;
    }).join('\n\n');

    const prompt = `Review the user's past journal entries and synthesize their overarching cognitive trends, emotional trajectory, recurring themes, and mental resilience growth.

Past Entries:
"""
${summaries}
"""

Format your response in warm, elegant Markdown with these sections:
### 🧠 Cognitive Themes & Focus Areas
### 📈 Emotional Trajectory & Resilience
### 💡 Strategic Recommendations for Your Second Brain`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return res.json({
      insights: result.text,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error('Error in /api/reflect/patterns:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate pattern insights.'
    });
  }
});

// Mount Vite middleware or Static handler
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindMirror server active on http://0.0.0.0:${PORT}`);
  });
}

start();
