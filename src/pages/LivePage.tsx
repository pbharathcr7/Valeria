import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Hand, 
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
  Download,
  Flame,
  Feather
} from 'lucide-react';
import { UserProfile, LiveConnectionState, LiveVoiceName, LiveTranscriptItem } from '../types';

interface LivePageProps {
  user: UserProfile;
  onNavigate?: (path: string) => void;
}

const AVAILABLE_VOICES: { name: LiveVoiceName; label: string; tone: string; desc: string }[] = [
  { name: 'Zephyr', label: 'Zephyr', tone: 'Calm & Mindful', desc: 'Soothing, gentle pacing, ideal for deep self-reflection' },
  { name: 'Aoede', label: 'Aoede', tone: 'Warm & Empathetic', desc: 'Heartfelt, emotionally attuned, active listener' },
  { name: 'Kore', label: 'Kore', tone: 'Grounded & Serene', desc: 'Balanced clarity, meditative presence, grounding cadence' },
  { name: 'Puck', label: 'Puck', tone: 'Engaging & Dynamic', desc: 'Upbeat curiosity, insightful questioning, energetic' },
  { name: 'Charon', label: 'Charon', tone: 'Deep & Resonant', desc: 'Steady anchor, rich low timbre, philosophical depth' },
  { name: 'Fenrir', label: 'Fenrir', tone: 'Direct & Crisp', desc: 'Articulate clarity, structured thoughts, focused' }
];

const REFLECTION_PROMPTS = [
  { label: 'Unpack My Day', prompt: 'I want to reflect on how my day went and clear my mental clutter.' },
  { label: 'Decision Clarity', prompt: 'Help me think through a tough choice I have been deliberating.' },
  { label: 'Mindful Breathing', prompt: 'Guide me through a brief, calming pause to center my energy.' },
  { label: 'Reframe a Frustration', prompt: 'I experienced some friction earlier and want a fresh perspective.' }
];

export const LivePage: React.FC<LivePageProps> = ({ user }) => {
  // Session & Connection State
  const [state, setState] = useState<LiveConnectionState>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>('Zephyr');
  const [showVoiceDropdown, setShowVoiceDropdown] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Session duration timer
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState<number>(0);

  // Transcripts & Conversation State
  const [transcriptHistory, setTranscriptHistory] = useState<LiveTranscriptItem[]>([]);
  const [currentInterimUserText, setCurrentInterimUserText] = useState<string>('');
  const [currentStreamingModelText, setCurrentStreamingModelText] = useState<string>('');
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  // Audio Visualization Spectrum Levels (Array of 16 bars)
  const [spectrumBars, setSpectrumBars] = useState<number[]>(new Array(16).fill(0.08));
  const [micVolume, setMicVolume] = useState<number>(0);
  const [playbackVolume, setPlaybackVolume] = useState<number>(0);

  // Audio & WebSocket Refs
  const wsRef = useRef<WebSocket | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);

  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackGainNodeRef = useRef<GainNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const scheduledAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  const isMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const isSessionActiveRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Keep ref flags synced
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
    if (playbackGainNodeRef.current) {
      playbackGainNodeRef.current.gain.value = isSpeakerMuted ? 0 : 1;
    }
  }, [isSpeakerMuted]);

  // Session duration timer loop
  useEffect(() => {
    if (state !== 'idle' && state !== 'error') {
      timerIntervalRef.current = setInterval(() => {
        setSessionDurationSeconds(prev => prev + 1);
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

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptHistory, currentInterimUserText, currentStreamingModelText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endLiveSession();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Visualizer loop for model playback volume & spectrum animation
  const startVisualizerLoop = () => {
    const updateLevels = () => {
      if (!isSessionActiveRef.current) {
        setSpectrumBars(new Array(16).fill(0.08));
        setPlaybackVolume(0);
        return;
      }

      if (playbackAnalyserRef.current && state === 'speaking') {
        const array = new Uint8Array(playbackAnalyserRef.current.frequencyBinCount);
        playbackAnalyserRef.current.getByteFrequencyData(array);
        let sum = 0;
        const bars: number[] = [];
        const step = Math.floor(array.length / 16);

        for (let i = 0; i < 16; i++) {
          let barSum = 0;
          for (let j = 0; j < step; j++) {
            barSum += array[i * step + j] || 0;
          }
          const barAvg = barSum / (step * 255);
          bars.push(Math.max(0.1, Math.min(1, barAvg * 1.8)));
          sum += barAvg;
        }

        const avg = sum / 16;
        setPlaybackVolume(Math.min(1, avg * 2.2));
        setSpectrumBars(bars);
      } else if (state === 'listening' && !isMutedRef.current) {
        // Generate soft dancing bars from microphone volume
        const currentVol = micVolume;
        const bars = Array.from({ length: 16 }, (_, i) => {
          const harmonic = Math.sin((i / 16) * Math.PI) * 0.8 + 0.2;
          return Math.max(0.08, Math.min(0.95, currentVol * harmonic * 1.5 + Math.random() * 0.05));
        });
        setSpectrumBars(bars);
        setPlaybackVolume(0);
      } else {
        setPlaybackVolume(0);
        setSpectrumBars(new Array(16).fill(0.08));
      }

      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };
    animationFrameRef.current = requestAnimationFrame(updateLevels);
  };

  // Stop currently scheduled and playing audio immediately (barge-in / interrupt)
  const stopAllPlayback = () => {
    try {
      scheduledAudioNodesRef.current.forEach(node => {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // ignore
        }
      });
      scheduledAudioNodesRef.current = [];

      if (playbackAudioContextRef.current) {
        nextPlayTimeRef.current = playbackAudioContextRef.current.currentTime + 0.02;
      }
    } catch (e) {
      console.warn('Error stopping audio:', e);
    }
  };

  // Convert raw 24kHz linear PCM base64 string to AudioBuffer with glitch-free playback
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
      // Linear PCM 16-bit requires even byte count
      const safeLen = rawLen - (rawLen % 2);
      if (safeLen === 0) return;

      const bytes = new Uint8Array(safeLen);
      for (let i = 0; i < safeLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little-endian to Float32 [-1.0, 1.0] using DataView to avoid misalignment
      const sampleCount = safeLen / 2;
      const float32Array = new Float32Array(sampleCount);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, safeLen);

      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
      }

      // Apply subtle micro-ramp (fade-in / fade-out over first/last 16 samples) to eliminate click/beep artifacts
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

      // Schedule gapless playback with jitter lookahead buffer
      const currentTime = audioCtx.currentTime;
      const startTime = Math.max(currentTime + 0.01, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      scheduledAudioNodesRef.current.push(source);
      source.onended = () => {
        const index = scheduledAudioNodesRef.current.indexOf(source);
        if (index > -1) {
          scheduledAudioNodesRef.current.splice(index, 1);
        }
        if (scheduledAudioNodesRef.current.length === 0 && isSessionActiveRef.current) {
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

  // Start microphone streaming with zero-gain silent loop to prevent audio feedback & beeps
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
      // Script processor buffer size 2048
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      micProcessorRef.current = processor;

      // CRITICAL FIX: Create silent gain node to avoid feeding microphone back to speaker destination (which causes high pitch beeps/whine)
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

        // Stream audio chunk to backend WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'realtime_input',
            audio: base64
          }));
        }
      };

      source.connect(processor);
      // Route through 0-gain node to destination to keep processor active without audio bleed
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);
    } catch (err: any) {
      console.warn('Error starting microphone stream:', err);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access to talk with MindMirror.'
          : `Failed to access microphone: ${err.message}`
      );
      setState('error');
    }
  };

  // Start Live Voice Session
  const startLiveSession = async () => {
    setErrorMessage(null);
    setState('connecting');
    setSessionDurationSeconds(0);
    isSessionActiveRef.current = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setState('connected');

        ws.send(JSON.stringify({
          type: 'setup',
          voiceName: selectedVoice
        }));

        await startMicrophoneCapture();
        startVisualizerLoop();
        setState('listening');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'session_ready') {
            setState('listening');
          } else if (data.type === 'audio') {
            playAudioChunk(data.audio);
          } else if (data.type === 'model_transcript_chunk') {
            setCurrentStreamingModelText(prev => prev + data.text);
          } else if (data.type === 'model_transcript') {
            setCurrentStreamingModelText(data.text);
          } else if (data.type === 'user_transcript') {
            setCurrentInterimUserText(data.text);
          } else if (data.type === 'interrupted') {
            stopAllPlayback();
            setState('interrupted');
            setTimeout(() => {
              if (isSessionActiveRef.current) {
                setState('listening');
              }
            }, 500);
          } else if (data.type === 'turn_complete' || data.type === 'generation_complete') {
            setCurrentInterimUserText(userTxt => {
              if (userTxt.trim()) {
                setTranscriptHistory(hist => [
                  ...hist,
                  {
                    id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    role: 'user',
                    text: userTxt.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }
              return '';
            });

            setCurrentStreamingModelText(modelTxt => {
              if (modelTxt.trim()) {
                setTranscriptHistory(hist => [
                  ...hist,
                  {
                    id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    role: 'model',
                    text: modelTxt.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }
              return '';
            });

            if (scheduledAudioNodesRef.current.length === 0) {
              setState('listening');
            }
          } else if (data.type === 'error') {
            console.warn('MindMirror Live notice:', data.error);
            setErrorMessage(data.error || 'Live voice bridge notice.');
            setState('error');
          }
        } catch (err) {
          // ignore
        }
      };

      ws.onerror = () => {
        setErrorMessage('Unable to connect to real-time voice server.');
        setState('error');
      };

      ws.onclose = () => {
        if (isSessionActiveRef.current) {
          endLiveSession();
        }
      };
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start Live session.');
      setState('error');
    }
  };

  // End Live Session and release all resources cleanly
  const endLiveSession = () => {
    isSessionActiveRef.current = false;
    setState('idle');
    setMicVolume(0);
    setPlaybackVolume(0);
    setSpectrumBars(new Array(16).fill(0.08));

    stopAllPlayback();

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.disconnect();
      } catch {
        // ignore
      }
      micProcessorRef.current = null;
    }

    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect();
      } catch {
        // ignore
      }
      silentGainRef.current = null;
    }

    if (micAudioContextRef.current) {
      try {
        micAudioContextRef.current.close();
      } catch {
        // ignore
      }
      micAudioContextRef.current = null;
    }

    if (playbackAudioContextRef.current) {
      try {
        playbackAudioContextRef.current.close();
      } catch {
        // ignore
      }
      playbackAudioContextRef.current = null;
      playbackGainNodeRef.current = null;
      playbackAnalyserRef.current = null;
    }

    // Preserve any pending turn text
    if (currentInterimUserText.trim()) {
      setTranscriptHistory(hist => [
        ...hist,
        {
          id: 'usr_' + Date.now(),
          role: 'user',
          text: currentInterimUserText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setCurrentInterimUserText('');
    }

    if (currentStreamingModelText.trim()) {
      setTranscriptHistory(hist => [
        ...hist,
        {
          id: 'mod_' + Date.now(),
          role: 'model',
          text: currentStreamingModelText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setCurrentStreamingModelText('');
    }
  };

  // Manual interrupt (barge-in button click)
  const handleManualInterrupt = () => {
    stopAllPlayback();
    setState('interrupted');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setTimeout(() => {
      if (isSessionActiveRef.current) {
        setState('listening');
      }
    }, 400);
  };

  // Switch voice dynamically
  const handleSelectVoice = (voice: LiveVoiceName) => {
    setSelectedVoice(voice);
    setShowVoiceDropdown(false);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSessionActiveRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'setup',
        voiceName: voice
      }));
    }
  };

  // Prompt chip click - inject topic into live conversation or start with it
  const handleSelectPrompt = async (promptText: string) => {
    if (state === 'idle') {
      await startLiveSession();
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'text',
            text: promptText
          }));
        }
      }, 1000);
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: promptText
      }));
    }
  };

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = () => {
    const text = transcriptHistory
      .map(item => `[${item.timestamp}] ${item.role === 'user' ? (user.displayName || 'You') : `MindMirror (${selectedVoice})`}: ${item.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Clear conversation transcript
  const handleClearTranscript = () => {
    setTranscriptHistory([]);
    setCurrentInterimUserText('');
    setCurrentStreamingModelText('');
  };

  // Dynamic Status Badge Configuration
  const getStatusConfig = () => {
    switch (state) {
      case 'idle':
        return {
          label: 'Sanctuary Ready',
          dot: 'bg-stone-400',
          badge: 'bg-white/80 text-stone-600 border-stone-200 shadow-2xs'
        };
      case 'connecting':
        return {
          label: 'Connecting Voice Sanctuary...',
          dot: 'bg-amber-500 animate-ping',
          badge: 'bg-amber-50/90 text-amber-900 border-amber-300 animate-pulse shadow-xs'
        };
      case 'connected':
        return {
          label: 'Bridge Active',
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
        };
      case 'listening':
        return {
          label: isMuted ? 'Microphone Muted' : 'Listening with Presence...',
          dot: isMuted ? 'bg-rose-400' : 'bg-amber-500 animate-pulse',
          badge: isMuted ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-100/90 text-amber-950 border-amber-300 shadow-xs'
        };
      case 'speaking':
        return {
          label: `MindMirror Reflecting (${selectedVoice})`,
          dot: 'bg-indigo-600 animate-pulse',
          badge: 'bg-indigo-50/90 text-indigo-900 border-indigo-200 shadow-xs'
        };
      case 'interrupted':
        return {
          label: 'Present — Listening to You',
          dot: 'bg-rose-500',
          badge: 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs'
        };
      case 'error':
        return {
          label: 'Connection Interrupted',
          dot: 'bg-red-500',
          badge: 'bg-red-50 text-red-800 border-red-200 shadow-xs'
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Dynamic Resonant Voice Orb Calculations
  const getOrbTransforms = () => {
    if (state === 'speaking') {
      const boost = 1 + playbackVolume * 0.45;
      return {
        core: boost,
        mid: 1 + playbackVolume * 0.75,
        outer: 1 + playbackVolume * 1.15
      };
    }
    if (state === 'listening' && !isMuted) {
      const boost = 1 + micVolume * 0.35;
      return {
        core: boost,
        mid: 1 + micVolume * 0.65,
        outer: 1 + micVolume * 0.95
      };
    }
    if (state === 'connecting') {
      return { core: 1.05, mid: 1.15, outer: 1.25 };
    }
    return { core: 1, mid: 1, outer: 1 };
  };

  const orb = getOrbTransforms();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto select-none">
      {/* Background Zen Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center -z-10">
        <div className={`w-[36rem] h-[36rem] rounded-full blur-3xl opacity-35 transition-all duration-1000 ${
          state === 'speaking' ? 'bg-indigo-300/60 scale-110' :
          state === 'listening' ? 'bg-amber-300/50 scale-105' :
          state === 'interrupted' ? 'bg-rose-300/50' : 'bg-stone-300/40 scale-95'
        }`} />
      </div>

      {/* 1. Header Bar: Title, Live Persona Selector, Session Timer & Status */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 backdrop-blur-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-sm ring-1 ring-stone-800">
            <Radio className={`w-5 h-5 ${state === 'speaking' || state === 'listening' ? 'animate-pulse text-amber-300' : 'text-stone-300'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight">
                MindMirror Live
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                Live Spoken Voice
              </span>
            </div>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Bidirectional real-time spoken dialogue with fluid reflection and zero latency.
            </p>
          </div>
        </div>

        {/* Top Controls: Voice Selector Dropdown, Timer & Transcript */}
        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Active Session Timer */}
          {state !== 'idle' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-stone-200 text-xs font-mono text-stone-700 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{formatDuration(sessionDurationSeconds)}</span>
            </div>
          )}

          {/* Voice Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="live-voice-selector-btn"
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/95 border border-stone-300 hover:border-stone-400 text-xs font-medium text-stone-800 shadow-2xs hover:shadow-xs transition cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5 text-stone-500" />
              <span>Voice: <strong className="font-semibold text-stone-900">{selectedVoice}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {showVoiceDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl border border-stone-200/90 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1.5 border-b border-stone-100 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                    Select Voice Persona
                  </span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </div>
                {AVAILABLE_VOICES.map(v => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => handleSelectVoice(v.name)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between hover:bg-stone-50 transition cursor-pointer ${
                      selectedVoice === v.name ? 'bg-amber-50/70' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-stone-900">{v.label}</p>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600">
                          {v.tone}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{v.desc}</p>
                    </div>
                    {selectedVoice === v.name && (
                      <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection Status Pill */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium ${statusConfig.badge}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            <span>{statusConfig.label}</span>
          </div>

          {/* Transcript Toggle Button */}
          <button
            type="button"
            id="live-transcript-toggle-btn"
            onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer shadow-2xs ${
              showTranscriptDrawer 
                ? 'bg-stone-900 text-stone-50 border-stone-900' 
                : 'bg-white/95 border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
            <span>Transcript</span>
            {transcriptHistory.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[10px] font-mono font-bold">
                {transcriptHistory.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="my-3 p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-red-900 text-xs flex items-start gap-3 backdrop-blur-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Voice Bridge Notice</p>
            <p className="mt-0.5 text-red-700">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 text-xs font-mono font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Main Center Sanctuary: Resonant Harmonic Orb & Visualizer */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 relative">
        {/* Harmonic Multi-Wave Voice Orb */}
        <div className="relative flex items-center justify-center my-4 sm:my-6">
          {/* Outermost Atmospheric Aura */}
          <div 
            className={`absolute rounded-full transition-all duration-300 ${
              state === 'speaking' ? 'bg-indigo-300/25 border border-indigo-400/30' :
              state === 'listening' ? 'bg-amber-300/25 border border-amber-400/30' :
              state === 'interrupted' ? 'bg-rose-300/30 border border-rose-400/30' : 
              'bg-stone-200/30 border border-stone-300/40'
            }`}
            style={{
              width: '260px',
              height: '260px',
              transform: `scale(${orb.outer})`,
              transition: 'transform 0.12s ease-out'
            }}
          />

          {/* Middle Harmonic Wave */}
          <div 
            className={`absolute rounded-full transition-all duration-300 ${
              state === 'speaking' ? 'bg-indigo-400/30 border border-indigo-500/40' :
              state === 'listening' ? 'bg-amber-400/30 border border-amber-500/40' :
              state === 'interrupted' ? 'bg-rose-400/30' : 
              'bg-stone-300/40'
            }`}
            style={{
              width: '200px',
              height: '200px',
              transform: `scale(${orb.mid})`,
              transition: 'transform 0.1s ease-out'
            }}
          />

          {/* Core Interactive Center Sphere */}
          <div 
            className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative z-10 border ${
              state === 'speaking' ? 'bg-gradient-to-tr from-indigo-950 via-indigo-900 to-amber-700 text-amber-200 border-indigo-400/50 shadow-indigo-900/30' :
              state === 'listening' ? (isMuted ? 'bg-stone-900 text-stone-400 border-stone-700' : 'bg-gradient-to-tr from-stone-950 via-stone-900 to-amber-700 text-amber-300 border-amber-500/40 shadow-amber-900/20') :
              state === 'connecting' ? 'bg-stone-900 text-amber-300 border-amber-400/50 animate-pulse' :
              state === 'interrupted' ? 'bg-gradient-to-tr from-rose-950 to-stone-950 text-rose-200 border-rose-400/50' :
              'bg-stone-900 text-stone-200 hover:scale-105 border-stone-700 hover:border-amber-400/50 shadow-xl'
            }`}
            style={{
              transform: `scale(${orb.core})`,
              transition: 'transform 0.08s ease-out'
            }}
          >
            {state === 'idle' ? (
              <button
                type="button"
                id="live-start-hero-btn"
                onClick={startLiveSession}
                className="w-full h-full rounded-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-stone-100 hover:text-amber-300 transition group p-3"
                title="Start Voice Session"
              >
                <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center group-hover:scale-110 transition">
                  <Radio className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <span className="text-xs font-mono uppercase font-bold tracking-widest text-amber-300 group-hover:text-amber-200">
                  Begin Voice
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 p-3">
                {state === 'speaking' && <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />}
                {state === 'listening' && (
                  isMuted ? <MicOff className="w-8 h-8 text-stone-400" /> : <Mic className="w-8 h-8 text-amber-300 animate-pulse" />
                )}
                {state === 'connecting' && <div className="w-7 h-7 border-2 border-amber-300/40 border-t-amber-300 rounded-full animate-spin" />}
                {state === 'interrupted' && <Hand className="w-8 h-8 text-rose-300" />}

                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-300 font-semibold">
                  {state === 'speaking' ? 'Reflecting' :
                   state === 'listening' ? (isMuted ? 'Muted' : 'Listening') :
                   state === 'connecting' ? 'Connecting' :
                   state === 'interrupted' ? 'Attentive' : 'Active'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Subtitles / Spoken Utterance Stream Container */}
        <div className="w-full max-w-xl text-center min-h-[90px] flex flex-col items-center justify-center px-4 py-6 mt-2">
          {state === 'idle' && (
            <div className="space-y-6">
              <p className="text-stone-500 text-sm font-serif italic max-w-md mx-auto">
                "Speak openly. MindMirror listens with mindful clarity, reflecting back insights to untangle your thoughts in real time."
              </p>

              {/* Reflection Inspiration Prompt Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {REFLECTION_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPrompt(p.prompt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-stone-900 hover:text-amber-300 text-stone-700 text-xs font-medium border border-stone-200/90 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Feather className="w-3 h-3 text-amber-600" />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {state === 'connecting' && (
            <p className="text-amber-800 text-sm font-mono animate-pulse">
              Establishing audio bridge with Gemini Live...
            </p>
          )}

          {state === 'listening' && !currentInterimUserText && !currentStreamingModelText && (
            <p className="text-stone-400 text-xs font-mono tracking-wide">
              {isMuted ? 'Microphone is muted. Unmute to speak.' : 'Listening... Speak naturally when you are ready.'}
            </p>
          )}

          {/* User Spoken Utterance (Real-Time Subtitle) */}
          {currentInterimUserText && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl px-5 py-3 shadow-xs max-w-lg mb-2 backdrop-blur-xs animate-in fade-in">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800 block mb-0.5 text-left flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-600" /> You:
              </span>
              <p className="text-sm font-sans text-stone-900 font-medium text-left leading-relaxed">
                "{currentInterimUserText}"
              </p>
            </div>
          )}

          {/* Model Spoken Utterance (Real-Time Subtitle) */}
          {currentStreamingModelText && (
            <div className="bg-white/95 border border-indigo-100 rounded-2xl px-5 py-3.5 shadow-sm max-w-lg backdrop-blur-xs animate-in fade-in">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-800 block mb-0.5 text-left flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" /> MindMirror Live ({selectedVoice}):
              </span>
              <p className="text-sm font-serif text-stone-900 leading-relaxed text-left italic">
                {currentStreamingModelText}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 3. Bottom Control Console (Clean, refined controls when session is active) */}
      {state !== 'idle' && (
        <footer className="pt-4 pb-2 border-t border-stone-200/80 flex items-center justify-center">
          <div className="flex items-center gap-3">
            {/* Mute Mic Button */}
            <button
              type="button"
              id="live-mute-mic-btn"
              onClick={() => setIsMuted(!isMuted)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition cursor-pointer shadow-2xs ${
                isMuted 
                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100' 
                  : 'bg-white/95 border-stone-300 text-stone-800 hover:bg-stone-50'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-amber-600" />}
              <span className="text-xs font-medium">{isMuted ? 'Unmute' : 'Mute Mic'}</span>
            </button>

            {/* Mute Speaker Button */}
            <button
              type="button"
              id="live-mute-speaker-btn"
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition cursor-pointer shadow-2xs ${
                isSpeakerMuted 
                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100' 
                  : 'bg-white/95 border-stone-300 text-stone-800 hover:bg-stone-50'
              }`}
              title={isSpeakerMuted ? 'Unmute Voice Playback' : 'Mute Voice Playback'}
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-stone-700" />}
              <span className="text-xs font-medium">{isSpeakerMuted ? 'Unmute Audio' : 'Mute Speaker'}</span>
            </button>

            {/* Manual Interrupt Button (Active during model speech) */}
            {state === 'speaking' && (
              <button
                type="button"
                id="live-interrupt-btn"
                onClick={handleManualInterrupt}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer animate-in fade-in"
              >
                <Hand className="w-4 h-4 text-amber-800" />
                <span>Interrupt</span>
              </button>
            )}

            {/* End Session Button */}
            <button
              type="button"
              id="live-end-session-btn"
              onClick={endLiveSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-rose-300 hover:text-rose-200 text-xs font-semibold shadow-md active:scale-98 transition cursor-pointer"
            >
              <Power className="w-4 h-4 text-rose-400" />
              <span>End Session</span>
            </button>
          </div>
        </footer>
      )}

      {/* 4. Slide-Over Transcript History Drawer */}
      {showTranscriptDrawer && (
        <aside className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white/95 backdrop-blur-xl border-l border-stone-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-semibold text-stone-900">Live Voice Transcript</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {transcriptHistory.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200/60 text-xs flex items-center gap-1 cursor-pointer transition"
                    title="Copy Transcript"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono">{copiedTranscript ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearTranscript}
                    className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200/60 text-xs flex items-center gap-1 cursor-pointer transition"
                    title="Clear Transcript"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono">Clear</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowTranscriptDrawer(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 text-xs font-mono font-bold cursor-pointer transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Transcript Message Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/40">
            {transcriptHistory.length === 0 && !currentInterimUserText && !currentStreamingModelText && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                <Radio className="w-8 h-8 opacity-40 text-stone-500" />
                <p className="text-xs font-sans">
                  Spoken dialogue and reflections will appear here in real-time.
                </p>
              </div>
            )}

            {transcriptHistory.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                  item.role === 'user'
                    ? 'bg-amber-50/90 border border-amber-200/90 text-stone-900 ml-4 shadow-2xs'
                    : 'bg-white border border-stone-200 text-stone-800 mr-4 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                  <span className="font-semibold text-stone-700">
                    {item.role === 'user' ? (user.displayName || 'You') : `MindMirror (${selectedVoice})`}
                  </span>
                  <span>{item.timestamp}</span>
                </div>
                <p className="font-sans leading-relaxed text-stone-800">
                  {item.text}
                </p>
              </div>
            ))}

            {/* Active Streaming Turn Previews */}
            {currentInterimUserText && (
              <div className="p-3.5 rounded-2xl text-xs bg-amber-100/70 border border-amber-300 text-stone-900 ml-4 animate-pulse">
                <span className="text-[10px] font-mono text-amber-800 font-semibold block mb-0.5">
                  Speaking now...
                </span>
                <p className="font-sans italic">{currentInterimUserText}</p>
              </div>
            )}

            {currentStreamingModelText && (
              <div className="p-3.5 rounded-2xl text-xs bg-indigo-50/90 border border-indigo-200 text-stone-800 mr-4 animate-pulse">
                <span className="text-[10px] font-mono text-indigo-800 font-semibold block mb-0.5">
                  MindMirror Reflecting...
                </span>
                <p className="font-serif italic">{currentStreamingModelText}</p>
              </div>
            )}

            <div ref={transcriptBottomRef} />
          </div>
        </aside>
      )}
    </div>
  );
};
