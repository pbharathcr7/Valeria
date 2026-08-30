import { JournalEntry, CognitivePatternAnalysis, MemoryReference } from '../types';

interface RetrieveMemoriesParams {
  currentMessage: string;
  currentMessages?: { role: string; content: string }[];
  pastEntries: JournalEntry[];
  cognitivePatterns?: CognitivePatternAnalysis | null;
  currentEntryId?: string;
  maxResults?: number;
}

export interface RetrievedMemoryContext {
  relevantMemories: MemoryReference[];
  cognitiveContext: {
    matchingGoals: string[];
    matchingChallenges: string[];
    matchingStrengths: string[];
  } | null;
}

// Common stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'feel', 'feeling', 'think', 'thinking', 'today', 'really', 'want', 'like', 'going'
]);

/**
 * Tokenize and normalize text into meaningful semantic tokens
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  return Array.from(new Set(words));
}

/**
 * Format a readable date from ISO string
 */
function formatMemoryDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Previous session';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Previous session';
  }
}

/**
 * Clean reusable memory-retrieval utility for Valeria
 * Retrieves relevant previous memories belonging to the authenticated user.
 */
export function retrieveRelevantMemories({
  currentMessage,
  currentMessages = [],
  pastEntries,
  cognitivePatterns,
  currentEntryId,
  maxResults = 4
}: RetrieveMemoriesParams): RetrievedMemoryContext {
  if (!currentMessage && currentMessages.length === 0) {
    return { relevantMemories: [], cognitiveContext: null };
  }

  // Aggregate user context from current message and recent turns (up to last 3 user messages)
  const recentUserTexts = currentMessages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content)
    .concat(currentMessage);

  const contextText = recentUserTexts.join(' ');
  const queryKeywords = extractKeywords(contextText);

  if (queryKeywords.length === 0) {
    return { relevantMemories: [], cognitiveContext: null };
  }

  // Filter out the current reflection session from past memories
  const candidates = pastEntries.filter(entry => entry.id !== currentEntryId);
  const scoredMemories: { entry: JournalEntry; score: number; matchedKeywords: string[]; reason: string }[] = [];

  for (const candidate of candidates) {
    let score = 0;
    const matchedKeywords: string[] = [];

    // 1. Title matching (High weight)
    const titleKeywords = extractKeywords(candidate.title || '');
    for (const qk of queryKeywords) {
      if (titleKeywords.includes(qk)) {
        score += 3.5;
        matchedKeywords.push(qk);
      } else if (titleKeywords.some(tk => tk.includes(qk) || qk.includes(tk))) {
        score += 2.0;
        matchedKeywords.push(qk);
      }
    }

    // 2. Tags and Key Themes (High weight)
    const themes = [
      ...(candidate.tags || []),
      ...(candidate.insights?.keyThemes || [])
    ].map(t => t.toLowerCase());

    const themeKeywords = extractKeywords(themes.join(' '));
    for (const qk of queryKeywords) {
      if (themeKeywords.includes(qk)) {
        score += 3.0;
        matchedKeywords.push(qk);
      }
    }

    // 3. Summary & Takeaways matching (Moderate weight)
    const summaryKeywords = extractKeywords(candidate.summary || '');
    const takeawaysKeywords = extractKeywords((candidate.insights?.takeaways || []).join(' '));
    
    for (const qk of queryKeywords) {
      if (summaryKeywords.includes(qk)) {
        score += 1.5;
        matchedKeywords.push(qk);
      }
      if (takeawaysKeywords.includes(qk)) {
        score += 1.5;
        matchedKeywords.push(qk);
      }
    }

    // 4. Message content (Low weight)
    const firstMsgContent = candidate.messages?.[0]?.content || '';
    const firstMsgKeywords = extractKeywords(firstMsgContent);
    for (const qk of queryKeywords) {
      if (firstMsgKeywords.includes(qk)) {
        score += 0.8;
        matchedKeywords.push(qk);
      }
    }

    // Deduplicate matched keywords
    const uniqueMatched = Array.from(new Set(matchedKeywords));

    // Threshold check: must match at least 2 keywords or 1 high-impact theme/title term
    if (score >= 2.8 && uniqueMatched.length > 0) {
      let reason = '';
      if (candidate.insights?.keyThemes && candidate.insights.keyThemes.length > 0) {
        reason = `Explores related themes in "${candidate.insights.keyThemes.slice(0, 2).join(', ')}"`;
      } else if (uniqueMatched.length > 0) {
        reason = `Touches on ${uniqueMatched.slice(0, 3).map(k => `"${k}"`).join(', ')}`;
      } else {
        reason = 'Related past reflection';
      }

      scoredMemories.push({
        entry: candidate,
        score,
        matchedKeywords: uniqueMatched,
        reason
      });
    }
  }

  // Sort candidates by score descending
  scoredMemories.sort((a, b) => b.score - a.score);

  // Take top results (up to maxResults)
  const topMemories = scoredMemories.slice(0, maxResults);

  const relevantMemories: MemoryReference[] = topMemories.map(item => {
    const excerpt = item.entry.summary || 
      (item.entry.insights?.takeaways && item.entry.insights.takeaways.length > 0 
        ? item.entry.insights.takeaways[0] 
        : item.entry.messages?.[0]?.content?.slice(0, 140) || 'Past reflection session');

    return {
      reflectionId: item.entry.id,
      title: item.entry.title || 'Untitled Reflection',
      date: formatMemoryDate(item.entry.createdAt),
      excerpt: excerpt.length > 180 ? excerpt.slice(0, 177) + '...' : excerpt,
      reason: item.reason,
      relevanceBadge: item.score >= 5.0 ? 'Highly relevant' : 'Related'
    };
  });

  // Long-Term Cognitive Pattern relevance
  let cognitiveContext: RetrievedMemoryContext['cognitiveContext'] = null;
  if (cognitivePatterns) {
    const matchingGoals = (cognitivePatterns.recurringGoals || []).filter(g => {
      const gKw = extractKeywords(g);
      return queryKeywords.some(qk => gKw.includes(qk));
    });

    const matchingChallenges = (cognitivePatterns.recurringChallenges || []).filter(c => {
      const cKw = extractKeywords(c);
      return queryKeywords.some(qk => cKw.includes(qk));
    });

    const matchingStrengths = (cognitivePatterns.strengthsObserved || []).filter(s => {
      const sKw = extractKeywords(s);
      return queryKeywords.some(qk => sKw.includes(qk));
    });

    if (matchingGoals.length > 0 || matchingChallenges.length > 0 || matchingStrengths.length > 0) {
      cognitiveContext = {
        matchingGoals,
        matchingChallenges,
        matchingStrengths
      };
    }
  }

  return {
    relevantMemories,
    cognitiveContext
  };
}

/**
 * Helper to build the structured text prompt block for Gemini
 */
export function formatMemoryPromptContext(context: RetrievedMemoryContext): string {
  const parts: string[] = [];

  if (context.relevantMemories.length > 0) {
    parts.push('RELEVANT PREVIOUS MEMORIES:');
    context.relevantMemories.forEach((mem, idx) => {
      parts.push(`${idx + 1}. "${mem.title}" (${mem.date})`);
      parts.push(`   Excerpt/Summary: ${mem.excerpt}`);
      if (mem.reason) {
        parts.push(`   Relevance: ${mem.reason}`);
      }
    });
  }

  if (context.cognitiveContext) {
    parts.push('\nLONG-TERM COGNITIVE MEMORY:');
    if (context.cognitiveContext.matchingGoals.length > 0) {
      parts.push(`- Recurring Goals: ${context.cognitiveContext.matchingGoals.join('; ')}`);
    }
    if (context.cognitiveContext.matchingChallenges.length > 0) {
      parts.push(`- Recurring Challenges: ${context.cognitiveContext.matchingChallenges.join('; ')}`);
    }
    if (context.cognitiveContext.matchingStrengths.length > 0) {
      parts.push(`- Observed Strengths: ${context.cognitiveContext.matchingStrengths.join('; ')}`);
    }
  }

  return parts.join('\n');
}
