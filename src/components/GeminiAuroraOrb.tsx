import React, { useRef, useEffect } from 'react';
import { Mic, RefreshCw } from 'lucide-react';
import { LiveConnectionState } from '../types';

interface GeminiAuroraOrbProps {
  state: LiveConnectionState;
  micVolume: number;
  playbackVolume: number;
  waveFrequencies: number[];
  selectedVoice: string;
  onClick: () => void;
}

export const GeminiAuroraOrb: React.FC<GeminiAuroraOrbProps> = ({
  state,
  micVolume,
  playbackVolume,
  waveFrequencies,
  selectedVoice,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Smooth interpolated volume for seamless physics
  const smoothVolRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    // Handle high-DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const size = 320; // internal coordinate space
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      if (!isRunning) return;

      const targetVol = state === 'speaking' 
        ? Math.max(0.2, playbackVolume * 2.2) 
        : state === 'listening' 
        ? Math.max(0.15, micVolume * 2.5) 
        : state === 'connecting'
        ? 0.35
        : 0.08;

      // Smooth volume interpolation
      smoothVolRef.current += (targetVol - smoothVolRef.current) * 0.12;
      const vol = smoothVolRef.current;

      const speed = state === 'speaking' ? 0.045 : state === 'listening' ? 0.035 : state === 'connecting' ? 0.05 : 0.015;
      timeRef.current += speed;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = 86;

      // 1. Multi-layered Chromatic Aurora Plasma Blobs
      ctx.save();

      // Outer atmospheric aura glow
      const auraGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.8 + vol * 30);
      if (state === 'speaking') {
        auraGrad.addColorStop(0, 'rgba(129, 140, 248, 0.45)');   // Indigo
        auraGrad.addColorStop(0.35, 'rgba(192, 132, 252, 0.35)'); // Violet
        auraGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.25)');   // Cyan
        auraGrad.addColorStop(0.9, 'rgba(251, 191, 36, 0.15)');   // Amber
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (state === 'listening') {
        auraGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');   // Amber
        auraGrad.addColorStop(0.4, 'rgba(236, 72, 153, 0.3)');   // Rose
        auraGrad.addColorStop(0.75, 'rgba(99, 102, 241, 0.2)');  // Indigo
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (state === 'connecting') {
        auraGrad.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        auraGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        auraGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        auraGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.15)');
        auraGrad.addColorStop(0.8, 'rgba(245, 158, 11, 0.1)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.8 + vol * 30, 0, Math.PI * 2);
      ctx.fill();

      // 2. Soundwave Harmonic Ripple Waves
      if (state === 'speaking' || state === 'listening') {
        const ringCount = 3;
        for (let r = 0; r < ringCount; r++) {
          const ringProgress = (t * 0.4 + r / ringCount) % 1;
          const ringRad = baseRadius + ringProgress * 48 * (1 + vol * 1.2);
          const ringAlpha = Math.max(0, (1 - ringProgress) * (0.35 + vol * 0.4));

          ctx.beginPath();
          ctx.arc(cx, cy, ringRad, 0, Math.PI * 2);
          ctx.strokeStyle = r % 2 === 0 ? `rgba(168, 85, 247, ${ringAlpha})` : `rgba(56, 189, 248, ${ringAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 3. Fluid Wave Deformed Chromatic Sphere
      const numPoints = 64;
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        // Multi-frequency harmonic wave deformation
        const w1 = Math.sin(angle * 3 + t * 2) * (10 + vol * 16);
        const w2 = Math.cos(angle * 5 - t * 2.8) * (7 + vol * 12);
        const w3 = Math.sin(angle * 2 + t * 1.4) * (6 + vol * 10);
        const r = baseRadius + w1 + w2 + w3;

        points.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        });
      }

      // Draw smooth deformed fluid path
      ctx.beginPath();
      ctx.moveTo((points[0].x + points[numPoints - 1].x) / 2, (points[0].y + points[numPoints - 1].y) / 2);

      for (let i = 0; i < numPoints; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % numPoints];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.closePath();

      // Multi-stop Chromatic Gradient (Violet -> Indigo -> Cyan -> Amber -> Magenta)
      const gradAngle = t * 0.8;
      const gx1 = cx + Math.cos(gradAngle) * baseRadius;
      const gy1 = cy + Math.sin(gradAngle) * baseRadius;
      const gx2 = cx - Math.cos(gradAngle) * baseRadius;
      const gy2 = cy - Math.sin(gradAngle) * baseRadius;

      const chromaticGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
      chromaticGrad.addColorStop(0, '#7c3aed');   // Deep Violet
      chromaticGrad.addColorStop(0.25, '#4f46e5'); // Royal Indigo
      chromaticGrad.addColorStop(0.55, '#06b6d4'); // Bright Cyan
      chromaticGrad.addColorStop(0.78, '#f59e0b'); // Radiant Amber
      chromaticGrad.addColorStop(1, '#db2777');   // Magenta / Pink

      ctx.fillStyle = chromaticGrad;
      ctx.fill();

      // 4. Internal Glowing Core & Liquid Plasma Nodes
      ctx.save();
      ctx.clip(); // Clip inside the fluid sphere

      // Internal fluid swirling node 1 (Cyan/Indigo)
      const n1x = cx + Math.sin(t * 1.7) * (baseRadius * 0.45);
      const n1y = cy + Math.cos(t * 2.1) * (baseRadius * 0.4);
      const n1Grad = ctx.createRadialGradient(n1x, n1y, 5, n1x, n1y, baseRadius * 0.8);
      n1Grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)'); // Cyan
      n1Grad.addColorStop(1, 'rgba(79, 70, 229, 0)');
      ctx.fillStyle = n1Grad;
      ctx.beginPath();
      ctx.arc(n1x, n1y, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Internal fluid swirling node 2 (Amber/Violet)
      const n2x = cx + Math.cos(t * 1.5 + 2) * (baseRadius * 0.45);
      const n2y = cy + Math.sin(t * 1.9 + 1) * (baseRadius * 0.4);
      const n2Grad = ctx.createRadialGradient(n2x, n2y, 5, n2x, n2y, baseRadius * 0.85);
      n2Grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)'); // Amber
      n2Grad.addColorStop(1, 'rgba(219, 39, 119, 0)');
      ctx.fillStyle = n2Grad;
      ctx.beginPath();
      ctx.arc(n2x, n2y, baseRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Internal fluid swirling node 3 (Electric Violet)
      const n3x = cx + Math.sin(t * 1.1 + 4) * (baseRadius * 0.35);
      const n3y = cy + Math.cos(t * 1.3 + 3) * (baseRadius * 0.35);
      const n3Grad = ctx.createRadialGradient(n3x, n3y, 2, n3x, n3y, baseRadius * 0.7);
      n3Grad.addColorStop(0, 'rgba(192, 132, 252, 0.8)'); // Violet
      n3Grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = n3Grad;
      ctx.beginPath();
      ctx.arc(n3x, n3y, baseRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // 5. Soft Glass Refraction & Specular Highlights
      // Upper glass crest highlight
      const glassGrad = ctx.createLinearGradient(cx, cy - baseRadius, cx, cy + baseRadius);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      glassGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.15)');
      glassGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.05)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + 15, 0, Math.PI * 2);
      ctx.fill();

      // Specular light glint (top left)
      const glintX = cx - baseRadius * 0.35;
      const glintY = cy - baseRadius * 0.38;
      const glintGrad = ctx.createRadialGradient(glintX, glintY, 1, glintX, glintY, baseRadius * 0.4);
      glintGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      glintGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
      glintGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glintGrad;
      ctx.beginPath();
      ctx.arc(glintX, glintY, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // end clip

      // Outer delicate iridescent rim
      ctx.beginPath();
      ctx.moveTo((points[0].x + points[numPoints - 1].x) / 2, (points[0].y + points[numPoints - 1].y) / 2);
      for (let i = 0; i < numPoints; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % numPoints];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, micVolume, playbackVolume]);

  return (
    <div className="relative flex items-center justify-center my-1 select-none">
      {/* Interactive Trigger wrapping Canvas & Floating UI */}
      <button
        id="voice-orb-interactive-btn"
        type="button"
        onClick={onClick}
        className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center cursor-pointer group focus:outline-none focus:ring-4 focus:ring-amber-300/40 transition-transform active:scale-95"
        title={
          state === 'idle' 
            ? 'Click to Begin Voice Session' 
            : state === 'speaking' 
            ? 'Tap to Interrupt' 
            : 'Click to End Voice Session'
        }
      >
        {/* Real-time HTML5 2D Canvas Fluid Plasma Orb */}
        <canvas
          ref={canvasRef}
          className="w-full h-full pointer-events-none drop-shadow-xl"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Center Minimalist Glass Badge / Status Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 text-center px-4">
          <div className="px-3.5 py-1.5 rounded-full bg-stone-950/40 backdrop-blur-md border border-white/20 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:bg-stone-950/60">
            {state === 'idle' ? (
              <>
                <div className="w-5 h-5 rounded-full bg-amber-400/30 flex items-center justify-center text-amber-200">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-white tracking-wide">Begin Voice</span>
              </>
            ) : state === 'connecting' ? (
              <>
                <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                <span className="text-xs font-medium text-amber-100">Connecting...</span>
              </>
            ) : state === 'speaking' ? (
              <>
                <div className="flex items-center gap-0.5 h-3.5">
                  {waveFrequencies.slice(0, 4).map((f, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-300 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(4, f * 16)}px` }}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-white">Speaking</span>
                <span className="text-[9px] text-stone-300/80 font-mono">(Tap to stop)</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-white">Listening</span>
                <span className="text-[9px] text-stone-300/80 font-mono">(Speak now)</span>
              </>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};
