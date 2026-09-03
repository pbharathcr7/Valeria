import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles, 
  RotateCcw, 
  Power, 
  MessageSquare, 
  ChevronDown, 
  AlertCircle,
  Headphones,
  Check,
  Clock,
  Copy,
  FileText,
  Brain,
  Calendar,
  BookmarkPlus,
  ArrowRight,
  ShieldCheck,
  Layers,
  Compass,
  ChevronRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  FileSearch,
  User,
  Bot
} from 'lucide-react';
import { 
  UserProfile, 
  JournalEntry, 
  CognitivePatternAnalysis, 
  LiveConnectionState, 
  LiveVoiceName, 
  LiveTranscriptItem, 
  DocumentItem,
  DocumentChunk,
  ReflectionIntent
} from '../types';
import { 
  initFirebase, 
  collection, 
  doc, 
  setDoc, 
  sanitizePayload, 
  loadUserDocuments,
  loadDocumentChunks,
  getAuthToken
} from '../lib/firebase';
import { GeminiAuroraOrb } from '../components/GeminiAuroraOrb';

interface LivePageProps {
  user: UserProfile;
  entries?: JournalEntry[];
  cognitivePatterns?: CognitivePatternAnalysis | null;
  initialDocId?: string | null;
  onNavigate?: (path: string) => void;
  onNewReflection?: (intent?: ReflectionIntent) => void;
  onRefreshEntries?: () => void;
}

const AVAILABLE_VOICES: { name: LiveVoiceName; label: string; tone: string; desc: string; vibe: string }[] = [
  { 
    name: 'Zephyr', 
    label: 'Zephyr', 
    tone: 'Calm & Mindful', 
    desc: 'Soothing cadence and reflective tone, ideal for deep introspection and grounding.',
    vibe: 'Reflective • Balanced'
  },
  { 
    name: 'Aoede', 
    label: 'Aoede', 
    tone: 'Warm & Empathetic', 
    desc: 'Heartfelt, emotionally attuned active listener with high warmth.',
    vibe: 'Empathetic • Attuned'
  },
  { 
    name: 'Kore', 
    label: 'Kore', 
    tone: 'Grounded & Serene', 
    desc: 'Serene clarity and grounded presence for organizing complex thoughts.',
    vibe: 'Clarity • Grounding'
  },
  { 
    name: 'Puck', 
    label: 'Puck', 
    tone: 'Engaging & Inquisitive', 
    desc: 'Dynamic curiosity and sharp questioning to challenge assumptions.',
    vibe: 'Inquisitive • Dynamic'
  },
  { 
    name: 'Charon', 
    label: 'Charon', 
    tone: 'Deep & Resonant', 
    desc: 'Low, steady timbre with philosophical gravitas for heavy decisions.',
    vibe: 'Resonant • Philosophical'
  },
  { 
    name: 'Fenrir', 
    label: 'Fenrir', 
    tone: 'Direct & Crisp', 
    desc: 'Crisp, structured thoughts for execution and cutting through hesitation.',
    vibe: 'Direct • Structured'
  }
];

const INQUIRY_STARTERS = [
  {
    category: 'Daily Mindful Clear',
    title: 'Unpack Mental Clutter',
    prompt: 'I want to unpack how my day went and clarify the thoughts occupying my headspace right now.',
    icon: Compass
  },
  {
    category: 'Decision Intelligence',
    title: 'Evaluate a Crossroads',
    prompt: 'I am facing a decision with conflicting priorities. Help me stress-test my reasoning objectively.',
    icon: Layers
  },
  {
    category: 'Workspace & Documents',
    title: 'Synthesize Document Insights',
    prompt: 'Let us discuss the core ideas and implications from the documents in my workspace.',
    icon: FileText
  },
  {
    category: 'Cognitive Reframing',
    title: 'Reframe a Friction Point',
    prompt: 'I experienced some situational frustration earlier. Help me inspect the root cause and reframe it constructively.',
    icon: Brain
  }
];

export const LivePage: React.FC<LivePageProps> = ({
  user,
  entries = [],
  cognitivePatterns = null,
  initialDocId = null,
  onNavigate,
  onNewReflection,
  onRefreshEntries
}) => {
  // Session & Connection State
  const [state, setState] = useState<LiveConnectionState>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>('Zephyr');
  const [showVoiceDropdown, setShowVoiceDropdown] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Session duration timer
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState<number>(0);

  // Live Dialogue Stream (Permanent turn history + active streaming turn)
  const [dialogueItems, setDialogueItems] = useState<LiveTranscriptItem[]>([]);
  const [activeUserLiveText, setActiveUserLiveText] = useState<string>('');
  const [activeModelLiveText, setActiveModelLiveText] = useState<string>('');
  const [lastCompletedUtterance, setLastCompletedUtterance] = useState<{ role: 'user' | 'model'; text: string } | null>(null);

  // Workspace Documents state for live grounding
  const [userDocuments, setUserDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocId || null);
  const [selectedDocChunks, setSelectedDocChunks] = useState<DocumentChunk[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(false);

  // Synchronize initialDocId when passed from props
  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  // Derive active document object
  const activeDoc = useMemo(() => {
    return userDocuments.find((d) => d.id === selectedDocId) || null;
  }, [userDocuments, selectedDocId]);

  // Live extracted action items / takeaways during session
  const [extractedTakeaways, setExtractedTakeaways] = useState<string[]>([]);
  const [isSavingJournal, setIsSavingJournal] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  // Audio Levels & Visualizer state
  const [micVolume, setMicVolume] = useState<number>(0);
  const [playbackVolume, setPlaybackVolume] = useState<number>(0);
  const [waveFrequencies, setWaveFrequencies] = useState<number[]>([0.15, 0.25, 0.4, 0.6, 0.4, 0.25, 0.15]);

  // Audio & WebSocket Refs
  const wsRef = useRef<WebSocket | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);

  // Session readiness state & refs for latency-aware speech synchronization
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  const isSessionReadyRef = useRef<boolean>(false);
  const pendingInitialPromptRef = useRef<string | null>(null);

  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackGainNodeRef = useRef<GainNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const scheduledAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // Live model speech-to-text timing synchronization refs
  const modelTurnFullTextRef = useRef<string>('');
  const modelSpokenTextRef = useRef<string>('');
  const turnAudioStartTimeRef = useRef<number>(0);
  const turnAudioTotalDurationRef = useRef<number>(0);
  const revealedWordsCountRef = useRef<number>(0);

  const isMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const isSessionActiveRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  // Synchronize ref states
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
    if (playbackGainNodeRef.current) {
      playbackGainNodeRef.current.gain.value = isSpeakerMuted ? 0 : 1;
    }
  }, [isSpeakerMuted]);

  // Load user workspace documents for cognitive grounding
  useEffect(() => {
    if (user && user.uid) {
      setDocsLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const targetDocId = initialDocId || urlParams.get('docId');

      loadUserDocuments(user.uid)
        .then((docs) => {
          const docList = docs as DocumentItem[];
          setUserDocuments(docList);
          if (targetDocId && docList.some(d => d.id === targetDocId)) {
            setSelectedDocId(targetDocId);
          } else if (docList.length > 0 && !selectedDocId && !targetDocId) {
            setSelectedDocId(docList[0].id);
          }
        })
        .catch((err) => console.warn('Could not load user documents for live grounding:', err))
        .finally(() => setDocsLoading(false));
    }
  }, [user, initialDocId]);

  // Load active document chunks whenever selectedDocId changes
  useEffect(() => {
    if (user?.uid && selectedDocId) {
      loadDocumentChunks(user.uid, selectedDocId)
        .then((chunks) => {
          setSelectedDocChunks(chunks as DocumentChunk[]);
        })
        .catch((err) => {
          console.warn('Could not load chunks for selected document:', err);
          setSelectedDocChunks([]);
        });
    } else {
      setSelectedDocChunks([]);
    }
  }, [user?.uid, selectedDocId]);

  // Session duration timer loop
  useEffect(() => {
    if (state !== 'idle' && state !== 'error') {
      timerIntervalRef.current = setInterval(() => {
        setSessionDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [state]);

  // Auto-scroll live dialogue stream
  useEffect(() => {
    if (dialogueEndRef.current) {
      dialogueEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogueItems, activeUserLiveText, activeModelLiveText]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      endLiveSession();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Format timer
  const formattedTimer = useMemo(() => {
    const mins = Math.floor(sessionDurationSeconds / 60);
    const secs = sessionDurationSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [sessionDurationSeconds]);

  // Build cognitive grounding context string
  const buildGroundingContext = () => {
    const parts: string[] = [];

    // 1. Recent Memories / Reflections
    if (entries && entries.length > 0) {
      parts.push(`RECENT REFLECTIONS (${entries.length} in archive):`);
      entries.slice(0, 3).forEach((e, idx) => {
        parts.push(`- "${e.title || 'Untitled'}" (${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'Recent'}): ${e.summary || (e.messages?.[0]?.content ? e.messages[0].content.slice(0, 100) + '...' : '')}`);
      });
    }

    // 2. Cognitive Growth & Patterns
    if (cognitivePatterns) {
      parts.push('\nLONG-TERM COGNITIVE PATTERNS:');
      if (cognitivePatterns.recurringGoals?.length) {
        parts.push(`- Goals/Ambitions: ${cognitivePatterns.recurringGoals.join('; ')}`);
      }
      if (cognitivePatterns.recurringChallenges?.length) {
        parts.push(`- Recurring Challenges: ${cognitivePatterns.recurringChallenges.join('; ')}`);
      }
      if (cognitivePatterns.strengthsObserved?.length) {
        parts.push(`- Observed Strengths: ${cognitivePatterns.strengthsObserved.join('; ')}`);
      }
    }

    // 3. Document Intelligence Context
    if (selectedDocId && userDocuments.length > 0) {
      const activeDoc = userDocuments.find((d) => d.id === selectedDocId);
      if (activeDoc) {
        parts.push(`\nACTIVE DOCUMENT GROUNDING:\n- User has selected workspace document: "${activeDoc.fileName}" (${activeDoc.pageCount || 1} pages).`);
        if (selectedDocChunks && selectedDocChunks.length > 0) {
          const docText = selectedDocChunks
            .map((chunk) => `[Page ${chunk.pageNumber || 1}]:\n${chunk.text}`)
            .join('\n\n');
          // Truncate to a safe token budget (up to 12,000 characters) for Live system instruction
          const safeExcerpt = docText.length > 12000 
            ? docText.slice(0, 12000) + '\n... [Additional document content truncated]' 
            : docText;
          parts.push(`FULL DOCUMENT CONTENT & KNOWLEDGE (Use this exact text to answer questions about the document, such as skills, projects, work experience, concepts, etc.):\n${safeExcerpt}`);
        }
      }
    }

    return parts.join('\n');
  };

  // Visualizer loop for model playback volume, fluid harmonics & speech-synced text pacing
  const startVisualizerLoop = () => {
    const updateLevels = () => {
      if (!isSessionActiveRef.current) {
        setWaveFrequencies([0.15, 0.25, 0.4, 0.6, 0.4, 0.25, 0.15]);
        setPlaybackVolume(0);
        return;
      }

      // Synchronize live speech words progressive revelation with audio playback
      if (state === 'speaking' || scheduledAudioNodesRef.current.length > 0) {
        if (playbackAudioContextRef.current && turnAudioTotalDurationRef.current > 0) {
          const audioCtx = playbackAudioContextRef.current;
          const elapsed = Math.max(0, audioCtx.currentTime - turnAudioStartTimeRef.current);
          const totalDuration = Math.max(0.4, turnAudioTotalDurationRef.current);
          // Calculate progress ratio (0.0 -> 1.0)
          const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

          const fullText = modelTurnFullTextRef.current.trim();
          if (fullText) {
            const words = fullText.split(/\s+/).filter(Boolean);
            if (words.length > 0) {
              // Word pacing synchronized to human spoken cadence
              const targetCount = Math.min(words.length, Math.max(1, Math.ceil(progress * words.length)));
              if (targetCount > revealedWordsCountRef.current) {
                revealedWordsCountRef.current = targetCount;
                const currentSpoken = words.slice(0, targetCount).join(' ');
                modelSpokenTextRef.current = currentSpoken;
                setActiveModelLiveText(currentSpoken);
              }
            }
          }
        }
      }

      if (playbackAnalyserRef.current && state === 'speaking') {
        const array = new Uint8Array(playbackAnalyserRef.current.frequencyBinCount);
        playbackAnalyserRef.current.getByteFrequencyData(array);
        let sum = 0;
        const waves: number[] = [];
        const step = Math.floor(array.length / 7);

        for (let i = 0; i < 7; i++) {
          let barSum = 0;
          for (let j = 0; j < step; j++) {
            barSum += array[i * step + j] || 0;
          }
          const barAvg = barSum / (step * 255);
          waves.push(Math.max(0.12, Math.min(1, barAvg * 2.2)));
          sum += barAvg;
        }

        const avg = sum / 7;
        setPlaybackVolume(Math.min(1, avg * 2.4));
        setWaveFrequencies(waves);
      } else if (state === 'listening' && !isMutedRef.current) {
        const currentVol = micVolume;
        const waves = [
          Math.max(0.15, currentVol * 0.4 + 0.1),
          Math.max(0.2, currentVol * 0.7 + 0.15),
          Math.max(0.3, currentVol * 1.1 + 0.2),
          Math.max(0.4, currentVol * 1.5 + 0.25),
          Math.max(0.3, currentVol * 1.1 + 0.2),
          Math.max(0.2, currentVol * 0.7 + 0.15),
          Math.max(0.15, currentVol * 0.4 + 0.1)
        ];
        setWaveFrequencies(waves);
        setPlaybackVolume(0);
      } else {
        setPlaybackVolume(0);
        setWaveFrequencies([0.15, 0.25, 0.4, 0.6, 0.4, 0.25, 0.15]);
      }

      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    animationFrameRef.current = requestAnimationFrame(updateLevels);
  };

  // Stop active scheduled audio playback & commit partial speech safely
  const stopAllPlayback = () => {
    try {
      scheduledAudioNodesRef.current.forEach((node) => {
        try {
          node.stop();
          node.disconnect();
        } catch (e) {
          // Ignore if already ended
        }
      });
      scheduledAudioNodesRef.current = [];
      nextPlayTimeRef.current = 0;
      turnAudioTotalDurationRef.current = 0;

      // If speech was interrupted in-flight, commit whatever text was actually spoken
      const spokenSoFar = modelSpokenTextRef.current.trim() || activeModelLiveText.trim();
      if (spokenSoFar) {
        const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setDialogueItems((prev) => {
          const lastItem = prev[prev.length - 1];
          if (lastItem && lastItem.role === 'model' && lastItem.text === spokenSoFar) {
            return prev;
          }
          return [
            ...prev,
            {
              id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              role: 'model',
              text: spokenSoFar,
              timestamp: nowStamp
            }
          ];
        });
        setLastCompletedUtterance({ role: 'model', text: spokenSoFar });
      }

      setActiveModelLiveText('');
      modelTurnFullTextRef.current = '';
      modelSpokenTextRef.current = '';
      revealedWordsCountRef.current = 0;

      if (playbackGainNodeRef.current && playbackAudioContextRef.current) {
        playbackGainNodeRef.current.gain.setValueAtTime(0, playbackAudioContextRef.current.currentTime);
        playbackGainNodeRef.current.gain.setValueAtTime(isSpeakerMutedRef.current ? 0 : 1, playbackAudioContextRef.current.currentTime + 0.05);
      }
    } catch (e) {
      console.warn('Error stopping audio:', e);
    }
  };

  // Subtle harmonic ready chime via Web Audio API to notify the user when Valeria is active and listening
  const playReadyChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primary crystal tone: E5 (659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Harmonious upper overtone: A5 (880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      gain2.gain.setValueAtTime(0.07, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } catch (e) {
      // Audio chime is a non-blocking enhancement
    }
  };

  // Convert raw 24kHz linear PCM base64 string to AudioBuffer with glitch-free playback and synchronous word tracking
  const playAudioChunk = (base64Audio: string) => {
    if (isSpeakerMutedRef.current) return;

    try {
      if (!playbackAudioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        playbackAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      }

      const audioCtx = playbackAudioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Ensure gain and analyser nodes exist
      if (!playbackGainNodeRef.current) {
        playbackGainNodeRef.current = audioCtx.createGain();
        playbackAnalyserRef.current = audioCtx.createAnalyser();
        playbackAnalyserRef.current.fftSize = 64;

        playbackGainNodeRef.current.connect(playbackAnalyserRef.current);
        playbackAnalyserRef.current.connect(audioCtx.destination);
      }

      // Decode base64 to binary buffer safely
      const binaryString = window.atob(base64Audio);
      const rawLen = binaryString.length;
      const safeLen = rawLen - (rawLen % 2);
      if (safeLen === 0) return;

      const bytes = new Uint8Array(safeLen);
      for (let i = 0; i < safeLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little-endian to Float32 [-1.0, 1.0] using DataView
      const sampleCount = safeLen / 2;
      const float32Array = new Float32Array(sampleCount);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, safeLen);

      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
      }

      // Apply subtle micro-ramp (fade-in / fade-out) to eliminate DC offset click artifacts
      if (sampleCount > 32) {
        for (let i = 0; i < 16; i++) {
          const factor = i / 16;
          float32Array[i] *= factor;
          float32Array[sampleCount - 1 - i] *= factor;
        }
      }

      // Create 24000Hz mono AudioBuffer
      const audioBuffer = audioCtx.createBuffer(1, sampleCount, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Create Buffer Source Node
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackGainNodeRef.current);

      // If starting fresh model utterance sequence, calibrate turn timeline
      if (scheduledAudioNodesRef.current.length === 0) {
        turnAudioStartTimeRef.current = audioCtx.currentTime;
        turnAudioTotalDurationRef.current = 0;
        revealedWordsCountRef.current = 0;
      }

      // Schedule gapless playback with jitter lookahead buffer
      const currentTime = audioCtx.currentTime;
      const startTime = Math.max(currentTime + 0.01, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      turnAudioTotalDurationRef.current += audioBuffer.duration;

      scheduledAudioNodesRef.current.push(source);
      source.onended = () => {
        const index = scheduledAudioNodesRef.current.indexOf(source);
        if (index > -1) {
          scheduledAudioNodesRef.current.splice(index, 1);
        }
        if (scheduledAudioNodesRef.current.length === 0 && isSessionActiveRef.current) {
          // Finalize speech: reveal 100% of accumulated turn text and commit to dialogue stream
          const finalText = modelTurnFullTextRef.current.trim() || modelSpokenTextRef.current.trim();
          if (finalText) {
            const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setDialogueItems((prev) => {
              const lastItem = prev[prev.length - 1];
              if (lastItem && lastItem.role === 'model' && lastItem.text === finalText) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  role: 'model',
                  text: finalText,
                  timestamp: nowStamp
                }
              ];
            });
            setLastCompletedUtterance({ role: 'model', text: finalText });

            // Synthesize extracted takeaways for the right deck
            if (finalText.length > 40) {
              setExtractedTakeaways((prev) => {
                const snippet = finalText.split(/[.!?]/)[0].trim();
                if (snippet && snippet.length > 15 && !prev.includes(snippet)) {
                  return [...prev.slice(-3), snippet];
                }
                return prev;
              });
            }
          }

          setActiveModelLiveText('');
          modelTurnFullTextRef.current = '';
          modelSpokenTextRef.current = '';
          revealedWordsCountRef.current = 0;
          turnAudioTotalDurationRef.current = 0;
          setState('listening');
        }
      };

      setState('speaking');
    } catch (err) {
      console.warn('Error decoding/playing model audio chunk:', err);
    }
  };

  // Downsample input microphone audio to 16000Hz PCM
  const downsampleTo16kPCM = (inputBuffer: Float32Array, inputSampleRate: number): Int16Array => {
    if (inputSampleRate === 16000) {
      const output = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return output;
    }

    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(inputBuffer.length / ratio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
        accum += inputBuffer[i];
        count++;
      }
      const val = count > 0 ? accum / count : 0;
      const s = Math.max(-1, Math.min(1, val));
      result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  // Convert Int16Array to base64 string
  const int16ArrayToBase64 = (int16Array: Int16Array): string => {
    const uint8 = new Uint8Array(int16Array.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return window.btoa(binary);
  };

  // Start microphone streaming with zero-gain silent loop to prevent audio feedback
  const startMicrophoneCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      micAudioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      micProcessorRef.current = processor;

      // Silent gain node to avoid feeding microphone back to speaker destination
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      silentGainRef.current = silentGain;

      processor.onaudioprocess = (e) => {
        if (!isSessionActiveRef.current || isMutedRef.current) {
          setMicVolume(0);
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Compute RMS volume for audio visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalizedVol = Math.min(1, rms * 4.5);
        setMicVolume(normalizedVol);

        // Client-side barge-in detection when user speaks loudly while AI is talking
        if (rms > 0.05 && scheduledAudioNodesRef.current.length > 0) {
          stopAllPlayback();
          setState('listening');
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
          }
        }

        // Downsample to 16kHz PCM
        const pcm16 = downsampleTo16kPCM(inputData, audioCtx.sampleRate);
        const base64 = int16ArrayToBase64(pcm16);

        // Stream audio chunk to backend WebSocket (will be safely buffered/forwarded by backend if still initializing)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'realtime_input',
            audio: base64
          }));
        }
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);
    } catch (err: any) {
      console.warn('Error starting microphone stream:', err);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access to talk with Valeria.'
          : `Failed to access microphone: ${err.message}`
      );
      setState('error');
    }
  };

  // Start Live Voice Session
  const startLiveSession = async (customInitialPrompt?: string) => {
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    setState('connecting');
    setIsSessionReady(false);
    isSessionReadyRef.current = false;
    pendingInitialPromptRef.current = customInitialPrompt || null;
    setSessionDurationSeconds(0);
    isSessionActiveRef.current = true;

    try {
      const authToken = await getAuthToken();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = authToken 
        ? `${protocol}//${window.location.host}/ws/live?token=${encodeURIComponent(authToken)}`
        : `${protocol}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Send setup with voice selection AND cognitive grounding context
        const grounding = buildGroundingContext();
        ws.send(JSON.stringify({
          type: 'setup',
          authToken: authToken || undefined,
          voiceName: selectedVoice,
          groundingContext: grounding
        }));

        // Prime audio permissions and visualizer pipeline immediately so there is 0 hardware lag
        await startMicrophoneCapture();
        startVisualizerLoop();
        // State remains in 'connecting' ("Valeria is getting ready...") until backend emits session_ready!
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'session_ready') {
            setIsSessionReady(true);
            isSessionReadyRef.current = true;
            setState('listening');
            playReadyChime();

            // If an inquiry starter was queued, dispatch it now that Gemini Live is live and ready
            if (pendingInitialPromptRef.current) {
              const promptToSend = pendingInitialPromptRef.current;
              pendingInitialPromptRef.current = null;
              const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setDialogueItems((prev) => [
                ...prev,
                {
                  id: 'usr_' + Date.now(),
                  role: 'user',
                  text: promptToSend,
                  timestamp: nowStamp
                }
              ]);
              setLastCompletedUtterance({ role: 'user', text: promptToSend });

              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'text',
                  text: promptToSend
                }));
              }
            }
          } else if (data.type === 'audio') {
            playAudioChunk(data.audio);
          } else if (data.type === 'model_transcript_chunk') {
            // Buffer model transcript chunk so words reveal in sync with spoken audio pacing
            if (data.text) {
              modelTurnFullTextRef.current += data.text;
            }
          } else if (data.type === 'model_transcript') {
            // If full model transcript arrives, synchronize turn buffer
            if (data.text) {
              if (data.text.startsWith(modelTurnFullTextRef.current)) {
                modelTurnFullTextRef.current = data.text;
              } else {
                modelTurnFullTextRef.current += data.text;
              }
            }
          } else if (data.type === 'user_transcript') {
            // Live user speech transcription
            setActiveUserLiveText(data.text);
          } else if (data.type === 'interrupted') {
            stopAllPlayback();
            setState('interrupted');
            setTimeout(() => {
              if (isSessionActiveRef.current) {
                setState('listening');
              }
            }, 400);
          } else if (data.type === 'turn_complete') {
            // Authoritative turn settlement: finalize user text immediately
            const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setActiveUserLiveText((userTxt) => {
              if (userTxt && userTxt.trim()) {
                const cleanUserText = userTxt.trim();
                setDialogueItems((prev) => {
                  // Prevent duplicate entries if the text was already committed
                  const lastItem = prev[prev.length - 1];
                  if (lastItem && lastItem.role === 'user' && lastItem.text === cleanUserText) {
                    return prev;
                  }
                  return [
                    ...prev,
                    {
                      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                      role: 'user',
                      text: cleanUserText,
                      timestamp: nowStamp
                    }
                  ];
                });
                setLastCompletedUtterance({ role: 'user', text: cleanUserText });
              }
              return '';
            });

            // If no audio is queued (e.g. muted or text-only fallback), finalize model utterance immediately:
            if (scheduledAudioNodesRef.current.length === 0) {
              const finalText = modelTurnFullTextRef.current.trim() || modelSpokenTextRef.current.trim();
              if (finalText) {
                setDialogueItems((prev) => {
                  const lastItem = prev[prev.length - 1];
                  if (lastItem && lastItem.role === 'model' && lastItem.text === finalText) {
                    return prev;
                  }
                  return [
                    ...prev,
                    {
                      id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                      role: 'model',
                      text: finalText,
                      timestamp: nowStamp
                    }
                  ];
                });
                setLastCompletedUtterance({ role: 'model', text: finalText });

                if (finalText.length > 40) {
                  setExtractedTakeaways((prev) => {
                    const snippet = finalText.split(/[.!?]/)[0].trim();
                    if (snippet && snippet.length > 15 && !prev.includes(snippet)) {
                      return [...prev.slice(-3), snippet];
                    }
                    return prev;
                  });
                }
              }

              setActiveModelLiveText('');
              modelTurnFullTextRef.current = '';
              modelSpokenTextRef.current = '';
              revealedWordsCountRef.current = 0;
              setState('listening');
            }
            // If audio nodes are still playing, source.onended handles finalized commit when speech finishes!

            if (scheduledAudioNodesRef.current.length === 0) {
              setState('listening');
            }
          } else if (data.type === 'error') {
            console.warn('Valeria Live error:', data.error);
            setErrorMessage(data.error || 'Live voice bridge notice.');
            setState('error');
          } else if (data.type === 'session_closed') {
            if (isSessionActiveRef.current) {
              endLiveSession();
            }
          }
        } catch (e) {
          // Safe ignore
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        setErrorMessage('Could not connect to Valeria live voice service.');
        setState('error');
      };

      ws.onclose = () => {
        if (isSessionActiveRef.current) {
          endLiveSession();
        }
      };
    } catch (err: any) {
      console.warn('Failed to start live session:', err);
      setErrorMessage(`Failed to initiate voice session: ${err?.message || 'Unknown error'}`);
      setState('error');
    }
  };

  // End Live Voice Session
  const endLiveSession = () => {
    isSessionActiveRef.current = false;
    isSessionReadyRef.current = false;
    setIsSessionReady(false);
    pendingInitialPromptRef.current = null;
    setState('idle');
    setMicVolume(0);
    setPlaybackVolume(0);

    // Commit any in-flight live text before cleanup
    if (activeUserLiveText.trim()) {
      const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDialogueItems((prev) => [
        ...prev,
        {
          id: 'usr_' + Date.now(),
          role: 'user',
          text: activeUserLiveText.trim(),
          timestamp: nowStamp
        }
      ]);
      setActiveUserLiveText('');
    }

    if (activeModelLiveText.trim()) {
      const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDialogueItems((prev) => [
        ...prev,
        {
          id: 'mod_' + Date.now(),
          role: 'model',
          text: activeModelLiveText.trim(),
          timestamp: nowStamp
        }
      ]);
      setActiveModelLiveText('');
    }

    stopAllPlayback();

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignored
      }
      wsRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (micAudioContextRef.current) {
      try {
        micAudioContextRef.current.close();
      } catch (e) {
        // Ignored
      }
      micAudioContextRef.current = null;
    }

    if (playbackAudioContextRef.current) {
      try {
        playbackAudioContextRef.current.close();
      } catch (e) {
        // Ignored
      }
      playbackAudioContextRef.current = null;
    }
  };

  // Manual User Interruption / Barge-in trigger
  const handleManualInterrupt = () => {
    stopAllPlayback();
    setState('listening');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
  };

  // Copy full live dialogue
  const handleCopyTranscript = () => {
    if (dialogueItems.length === 0 && !activeModelLiveText && !activeUserLiveText) return;
    const lines = dialogueItems.map((item) => `[${item.timestamp}] ${item.role === 'user' ? (user.displayName || 'User') : `Valeria (${selectedVoice})`}: ${item.text}`);
    if (activeUserLiveText) lines.push(`[Live] ${user.displayName || 'User'}: ${activeUserLiveText}`);
    if (activeModelLiveText) lines.push(`[Live] Valeria (${selectedVoice}): ${activeModelLiveText}`);
    
    navigator.clipboard.writeText(lines.join('\n\n'));
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Save live session into Reflections Journal (Firestore)
  const handleSaveToReflections = async () => {
    if (!user || !user.uid || dialogueItems.length === 0) return;
    setIsSavingJournal(true);
    setSaveSuccessMessage(null);

    try {
      const { db } = await initFirebase();
      const newEntryId = `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const entryRef = doc(db, 'users', user.uid, 'interactions', newEntryId);

      const title = dialogueItems.find((d) => d.role === 'user')?.text.slice(0, 45) || 'Live Cognitive Voice Reflection';
      const fullSummary = dialogueItems.map((d) => `${d.role === 'user' ? 'User' : 'Valeria'}: ${d.text}`).join('\n\n');

      const journalData: Partial<JournalEntry> = {
        id: newEntryId,
        userId: user.uid,
        title: title.length > 40 ? title + '...' : title,
        intent: 'deep_reflection',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        summary: `Live voice inquiry (${formattedTimer}) with persona ${selectedVoice}. Key dialogue:\n${fullSummary.slice(0, 400)}...`,
        messages: dialogueItems.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.text,
          timestamp: new Date().toISOString()
        })),
        insights: {
          mood: 'Contemplative & Grounded',
          keyThemes: ['Live Voice Reflection', 'Cognitive Dialogue'],
          takeaways: extractedTakeaways.length > 0 ? extractedTakeaways : ['Completed live mindful dialogue'],
          actionItems: []
        }
      };

      const sanitized = sanitizePayload(journalData);
      await setDoc(entryRef, sanitized);

      setSaveSuccessMessage('Session saved to your Reflections journal!');
      if (onRefreshEntries) {
        onRefreshEntries();
      }
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save live reflection:', err);
      setErrorMessage(`Failed to save reflection: ${err?.message || 'Firestore write failed'}`);
    } finally {
      setIsSavingJournal(false);
    }
  };

  // State descriptor for top pill
  const stateBadge = useMemo(() => {
    switch (state) {
      case 'connecting':
        return { 
          label: 'Valeria is getting ready...', 
          color: 'bg-amber-100/90 text-amber-900 border-amber-300 ring-2 ring-amber-200/50' 
        };
      case 'connected':
        return { 
          label: 'Valeria is getting ready...', 
          color: 'bg-amber-100/90 text-amber-900 border-amber-300' 
        };
      case 'listening':
        return { 
          label: isMuted ? 'Microphone Muted' : 'Listening Mindfully (Speak now)', 
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300' 
        };
      case 'speaking':
        return { 
          label: `Reflecting • ${selectedVoice}`, 
          color: 'bg-indigo-100 text-indigo-900 border-indigo-300' 
        };
      case 'interrupted':
        return { 
          label: 'Attentive & Ready', 
          color: 'bg-stone-200 text-stone-800 border-stone-300' 
        };
      case 'error':
        return { 
          label: 'Connection Notice', 
          color: 'bg-rose-100 text-rose-900 border-rose-300' 
        };
      default:
        return { 
          label: 'Voice Sanctuary Idle', 
          color: 'bg-stone-100 text-stone-700 border-stone-200' 
        };
    }
  }, [state, isMuted, selectedVoice]);

  const activeVoiceObj = AVAILABLE_VOICES.find((v) => v.name === selectedVoice) || AVAILABLE_VOICES[0];

  return (
    <div id="Valeria-live-workspace" className="min-h-[calc(100vh-4rem)] bg-stone-50/70 p-4 flex flex-col justify-between max-w-7xl mx-auto">
      
      {/* Top Header & Cognitive Grounding Bar */}
      <div id="live-header-bar" className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100/80 text-amber-900 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
              Valeria Live
            </span>
            <span className="text-xs text-stone-500 font-medium">Cognitive Voice Sanctuary</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-1 tracking-tight">
            Conversational Thinking & Real-Time Reflection
          </h1>
        </div>

        {/* Right Header Controls: Voice Selector & Session Duration */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Voice Selector Dropdown */}
          <div className="relative">
            <button
              id="voice-persona-dropdown-btn"
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              disabled={state !== 'idle' && state !== 'error'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 shadow-xs transition-colors disabled:opacity-75"
              title="Select Voice Persona"
            >
              <Headphones className="w-3.5 h-3.5 text-amber-600" />
              <span>Voice: <strong className="font-semibold text-stone-900">{selectedVoice}</strong></span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 hidden sm:inline">{activeVoiceObj.vibe}</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {showVoiceDropdown && (
              <div 
                id="voice-persona-menu"
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Select Reflective Persona
                </div>
                <div className="space-y-1 mt-1">
                  {AVAILABLE_VOICES.map((voice) => (
                    <button
                      key={voice.name}
                      onClick={() => {
                        setSelectedVoice(voice.name);
                        setShowVoiceDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                        selectedVoice === voice.name ? 'bg-amber-50/80 border border-amber-200/80 text-amber-950 font-medium' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          {voice.label}
                          <span className="text-[10px] font-normal text-stone-500">({voice.tone})</span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{voice.desc}</p>
                      </div>
                      {selectedVoice === voice.name && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Session Timer */}
          {state !== 'idle' && (
            <div id="session-timer-pill" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-amber-300 text-xs font-mono font-medium shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{formattedTimer}</span>
            </div>
          )}

          {/* Save to Reflections Journal Button */}
          {dialogueItems.length > 0 && (
            <button
              id="save-live-session-btn"
              onClick={handleSaveToReflections}
              disabled={isSavingJournal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-xs transition-all disabled:opacity-60"
            >
              {isSavingJournal ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" />
              )}
              <span>{isSavingJournal ? 'Saving...' : 'Save to Journal'}</span>
            </button>
          )}

          {/* Copy Transcript Button */}
          {dialogueItems.length > 0 && (
            <button
              id="copy-transcript-btn"
              onClick={handleCopyTranscript}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium shadow-xs transition-colors"
              title="Copy conversation transcript"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('/reflections')}
              className="underline hover:text-emerald-950 font-semibold ml-4"
            >
              View in Reflections →
            </button>
          )}
        </div>
      )}

      {/* Error Notice Banner */}
      {errorMessage && (
        <div className="mt-3 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Cognitive Workspace Grid */}
      <div id="live-workspace-content" className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1 items-stretch">
        
        {/* Left Column: Live Voice Sanctuary & Live Dialogue Stream (7 cols) */}
        <div id="live-dialogue-column" className="lg:col-span-7 flex flex-col justify-between bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6 relative overflow-hidden">
          
          {/* Top Presence & Fluid Voice Orb Area */}
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            
            {/* Status Pill */}
            <div className="mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-xs transition-all duration-300 ${stateBadge.color}`}>
                <span className={`w-2 h-2 rounded-full ${
                  state === 'listening' ? 'bg-amber-500 animate-pulse' :
                  state === 'speaking' ? 'bg-indigo-600 animate-ping' :
                  state === 'connected' ? 'bg-emerald-500' : 'bg-stone-400'
                }`}></span>
                <span>{stateBadge.label}</span>
              </div>
            </div>

            {/* Gemini Ethereal Aurora Fluid Orb */}
            <GeminiAuroraOrb
              state={state}
              micVolume={micVolume}
              playbackVolume={playbackVolume}
              waveFrequencies={waveFrequencies}
              selectedVoice={selectedVoice}
              onClick={() => {
                if (state === 'idle' || state === 'error') {
                  startLiveSession();
                } else if (state === 'speaking') {
                  handleManualInterrupt();
                } else {
                  endLiveSession();
                }
              }}
            />

            {/* Live Subtitle Focus HUD (Permanently visible and communicates session preparation state) */}
            <div id="live-subtitle-hud" className="w-full max-w-lg mt-3 px-4 py-2.5 rounded-xl bg-stone-50/90 border border-stone-200/80 text-center min-h-[50px] flex items-center justify-center transition-all duration-300">
              {state === 'connecting' || (state === 'connected' && !isSessionReady) ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-amber-950 animate-pulse">
                  <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <span>Valeria is waking up and preparing your session...</span>
                  </div>
                  <span className="text-[11px] sm:text-xs text-stone-500 font-sans">
                    Please hold on a moment before speaking.
                  </span>
                </div>
              ) : activeUserLiveText ? (
                <p className="text-xs sm:text-sm text-amber-950 font-medium animate-in fade-in duration-150">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mr-1.5">You:</span>
                  "{activeUserLiveText}"
                </p>
              ) : activeModelLiveText ? (
                <p className="text-xs sm:text-sm text-stone-800 font-serif italic animate-in fade-in duration-150">
                  <span className="text-[11px] font-sans font-semibold text-indigo-600 uppercase tracking-wider not-italic mr-1.5">{selectedVoice}:</span>
                  "{activeModelLiveText}"
                </p>
              ) : lastCompletedUtterance ? (
                <p className="text-xs text-stone-600">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase mr-1">Last {lastCompletedUtterance.role === 'user' ? 'thought' : 'reflection'}:</span>
                  <span className="font-serif italic text-stone-700">"{lastCompletedUtterance.text.slice(0, 110)}{lastCompletedUtterance.text.length > 110 ? '...' : ''}"</span>
                </p>
              ) : state === 'listening' ? (
                <p className="text-xs sm:text-sm text-emerald-900 font-medium animate-in fade-in duration-200 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>Valeria is ready and listening — speak naturally whenever you're ready.</span>
                </p>
              ) : (
                <p className="text-xs text-stone-400 font-serif italic">
                  "Speak your reflections or questions naturally. Valeria responds with mindful clarity."
                </p>
              )}
            </div>
          </div>

          {/* Real-Time Live Dialogue Stream (The conversational back-and-forth) */}
          <div className="flex-1 mt-4 flex flex-col border-t border-stone-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Dialogue Stream</span>
                {dialogueItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 text-[10px]">
                    {dialogueItems.length} turns
                  </span>
                )}
              </div>
              {dialogueItems.length > 0 && (
                <button
                  onClick={() => setDialogueItems([])}
                  className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Stream
                </button>
              )}
            </div>

            {/* Scrollable Message Box */}
            <div 
              id="live-dialogue-scrollbox"
              className="flex-1 overflow-y-auto max-h-[320px] sm:max-h-[360px] space-y-3 pr-1 py-1"
            >
              {dialogueItems.length === 0 && !activeUserLiveText && !activeModelLiveText ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-stone-50/50 border border-dashed border-stone-200">
                  <Sparkles className="w-6 h-6 text-amber-400 mb-1.5" />
                  <p className="text-xs font-medium text-stone-700">Voice dialogue will stream here in real time</p>
                  <p className="text-[11px] text-stone-400 mt-0.5 max-w-xs">
                    Begin speaking or select one of the cognitive starters on the right to initiate inquiry.
                  </p>
                </div>
              ) : (
                <>
                  {dialogueItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-col rounded-xl p-3 text-xs sm:text-sm transition-all ${
                        item.role === 'user'
                          ? 'bg-amber-50/70 border border-amber-200/70 text-amber-950 ml-4'
                          : 'bg-stone-50 border border-stone-200/80 text-stone-900 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[11px] flex items-center gap-1 text-stone-600">
                          {item.role === 'user' ? (
                            <>
                              <User className="w-3 h-3 text-amber-600" />
                              {user.displayName || 'You'}
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3 text-indigo-600" />
                              Valeria ({selectedVoice})
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-stone-400">{item.timestamp}</span>
                      </div>
                      <p className={`leading-relaxed ${item.role === 'model' ? 'font-serif text-[13px] sm:text-[14px]' : 'font-sans'}`}>
                        {item.text}
                      </p>
                    </div>
                  ))}

                  {/* Active In-Flight User Stream Card */}
                  {activeUserLiveText && (
                    <div className="flex flex-col rounded-xl p-3 bg-amber-50 border border-amber-300 text-amber-950 ml-4 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[11px] flex items-center gap-1 text-amber-800">
                          <User className="w-3 h-3 text-amber-600" />
                          {user.displayName || 'You'} (Speaking...)
                        </span>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      </div>
                      <p className="text-xs sm:text-sm font-sans leading-relaxed">{activeUserLiveText}</p>
                    </div>
                  )}

                  {/* Active In-Flight Model Stream Card */}
                  {activeModelLiveText && (
                    <div className="flex flex-col rounded-xl p-3 bg-stone-50 border border-indigo-200 text-stone-900 mr-4 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[11px] flex items-center gap-1 text-indigo-700">
                          <Bot className="w-3 h-3 text-indigo-600" />
                          Valeria ({selectedVoice}) (Reflecting...)
                        </span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      </div>
                      <p className="font-serif text-[13px] sm:text-[14px] leading-relaxed">{activeModelLiveText}</p>
                    </div>
                  )}
                  <div ref={dialogueEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Floating Control Bar at Bottom */}
          <div id="live-bottom-dock" className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* Mic Mute Toggle */}
              <button
                id="toggle-mic-mute-btn"
                onClick={() => setIsMuted(!isMuted)}
                disabled={state === 'idle'}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isMuted
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                } disabled:opacity-50`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-stone-600" />}
                <span className="text-[11px]">{isMuted ? 'Muted' : 'Mic Active'}</span>
              </button>

              {/* Speaker Mute Toggle */}
              <button
                id="toggle-speaker-mute-btn"
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isSpeakerMuted
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
                title={isSpeakerMuted ? 'Unmute Speaker Output' : 'Mute Speaker Output'}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-stone-600" />}
                <span className="text-[11px]">{isSpeakerMuted ? 'Audio Off' : 'Speaker'}</span>
              </button>

              {/* Barge-In / Interrupt Trigger */}
              {state === 'speaking' && (
                <button
                  id="barge-in-interrupt-btn"
                  onClick={handleManualInterrupt}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors animate-pulse"
                >
                  Interrupt AI
                </button>
              )}
            </div>

            {/* End / Start Session Trigger */}
            <div>
              {state !== 'idle' ? (
                <button
                  id="end-live-session-btn"
                  onClick={endLiveSession}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>End Session</span>
                </button>
              ) : (
                <button
                  id="start-live-session-btn"
                  onClick={() => startLiveSession()}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Voice Session</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Cognitive Workspace Intelligence & Grounding Deck (5 cols) */}
        <div id="live-grounding-column" className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Card 1: Live Cognitive Grounding Status */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Cognitive Grounding Deck
                </h3>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active Workspace
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {docsLoading ? (
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/90 text-xs text-stone-500 italic flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Loading workspace documents...</span>
                </div>
              ) : userDocuments.length > 0 ? (
                /* Unified Extended Active Grounding Document Card with integrated select option */
                <div id="active-grounding-doc-card" className="p-3.5 bg-stone-50/90 rounded-xl border border-stone-200/90 space-y-3">
                  {/* Card Header & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        activeDoc
                          ? 'bg-amber-100/90 border-amber-200/80 text-amber-900'
                          : 'bg-stone-100 border-stone-200 text-stone-600'
                      }`}>
                        {activeDoc ? <FileText className="w-4 h-4" /> : <Brain className="w-4 h-4 text-stone-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-serif font-bold text-stone-900 truncate leading-snug" title={activeDoc ? activeDoc.fileName : 'General Cognitive Reflection'}>
                          {activeDoc ? activeDoc.fileName : 'General Cognitive Reflection'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] font-mono text-stone-500">
                          {activeDoc ? (
                            <>
                              <span>{activeDoc.pageCount || 1} {(activeDoc.pageCount || 1) === 1 ? 'page' : 'pages'}</span>
                              <span>•</span>
                              <span>{activeDoc.chunkCount || selectedDocChunks.length || 0} chunks</span>
                            </>
                          ) : (
                            <span>Grounded in memory & cognitive patterns</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Clear Option */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeDoc ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Indexed</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedDocId(null)}
                            title="Detach document and return to general reflection"
                            className="px-1.5 py-0.5 text-[10px] font-medium text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition cursor-pointer"
                          >
                            Detach
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-stone-100 text-stone-600 border border-stone-200">
                          <span>Archive Mode</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Integrated Document Selection Control */}
                  <div className="pt-2 border-t border-stone-200/70 space-y-1.5">
                    <label htmlFor="grounding-document-select" className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                      {activeDoc ? 'Switch Grounding Document:' : 'Attach Document for Live Grounding:'}
                    </label>
                    <div className="relative">
                      <select
                        id="grounding-document-select"
                        value={selectedDocId || ''}
                        onChange={(e) => setSelectedDocId(e.target.value || null)}
                        className="w-full text-xs bg-white border border-stone-200 hover:border-stone-300 rounded-lg py-2 pl-2.5 pr-8 text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs transition-colors cursor-pointer appearance-none"
                      >
                        <option value="">No document (General Archive Reflection)</option>
                        {userDocuments.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            📄 {doc.fileName} ({doc.pageCount || 1} pgs{doc.chunkCount ? ` • ${doc.chunkCount} chunks` : ''})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Context Indicator Footer */}
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-medium truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeDoc ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <span className="truncate">
                        {activeDoc
                          ? 'Conversation grounded in this document'
                          : 'Reflecting across thoughts & long-term patterns'}
                      </span>
                    </div>
                    {activeDoc && selectedDocChunks.length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-700 font-medium shrink-0">
                        {selectedDocChunks.length} sections ready
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
                  <span>No uploaded PDFs in workspace yet.</span>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('/documents')}
                      className="text-amber-700 font-semibold hover:underline cursor-pointer"
                    >
                      Upload PDF →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Cognitive Inquiry Starters */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-4 sm:p-5 flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Inquiry Starters
                </h3>
              </div>
              <span className="text-[10px] text-stone-400">Click to ask live</span>
            </div>

            <div className="mt-3 space-y-2">
              {INQUIRY_STARTERS.map((starter, idx) => {
                const IconComponent = starter.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (state === 'idle' || state === 'error') {
                        startLiveSession(starter.prompt);
                      } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        const nowStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setDialogueItems((prev) => [
                          ...prev,
                          {
                            id: 'usr_' + Date.now(),
                            role: 'user',
                            text: starter.prompt,
                            timestamp: nowStamp
                          }
                        ]);
                        setLastCompletedUtterance({ role: 'user', text: starter.prompt });
                        wsRef.current.send(JSON.stringify({ type: 'text', text: starter.prompt }));
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-stone-200/90 hover:border-amber-300 hover:bg-amber-50/50 transition-all group flex items-start justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 group-hover:bg-amber-100 flex items-center justify-center text-stone-600 group-hover:text-amber-700 shrink-0 transition-colors mt-0.5">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-stone-800 group-hover:text-amber-950">
                          {starter.title}
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                          {starter.prompt}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Live Extracted Takeaways & Action Items */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Live Synthesized Takeaways
                </h3>
              </div>
              {extractedTakeaways.length > 0 && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                  {extractedTakeaways.length} Key Points
                </span>
              )}
            </div>

            <div className="mt-3">
              {extractedTakeaways.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">
                  As you speak with Valeria, key reflections and realizations will distill here automatically.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {extractedTakeaways.map((takeaway, index) => (
                    <li key={index} className="text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-200/70 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-snug font-serif italic text-stone-800">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
