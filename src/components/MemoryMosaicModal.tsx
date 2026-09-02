import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Quote, 
  BrainCircuit, 
  Tag, 
  Heart,
  Users,
  Compass
} from 'lucide-react';
import { MemoryMosaic } from '../types';

interface MemoryMosaicModalProps {
  mosaic: MemoryMosaic;
  onClose: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  isOwner?: boolean;
}

export const MemoryMosaicModal: React.FC<MemoryMosaicModalProps> = ({
  mosaic,
  onClose,
  onRegenerate,
  isRegenerating = false,
  isOwner = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    const textToCopy = `✨ ${mosaic.title}\n\n${mosaic.narrative}\n\nKey Perspectives:\n${mosaic.perspectives.map(p => `• ${p.contributorName}: "${p.keyHighlight}" (${p.emotionalTone || 'Reflective'})`).join('\n')}\n\nShared Themes: ${mosaic.sharedThemes.join(', ')}\n\nCollective Takeaways:\n${mosaic.collectiveTakeaways.map(t => `• ${t}`).join('\n')}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = mosaic.synthesizedAt 
    ? new Date(mosaic.synthesizedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Just now';

  return (
    <div id="memory-mosaic-modal-backdrop" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="memory-mosaic-modal-content"
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 bg-stone-50/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-amber-100/80 border border-amber-300/80 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900">
                  AI Memory Mosaic
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  Synthesized {formattedDate}
                </span>
                {mosaic.modelUsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-500">
                    {mosaic.modelUsed}
                  </span>
                )}
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-1">
                {mosaic.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="copy-mosaic-btn"
              onClick={handleCopyText}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Copy Mosaic to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="close-mosaic-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-stone-800">
          {/* Synthesized Narrative */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="font-serif font-bold text-sm text-stone-900 uppercase tracking-wider text-[11px]">
                Collective Narrative
              </h3>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200/60 text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line space-y-3 font-serif">
              {mosaic.narrative}
            </div>
          </div>

          {/* Individual Perspective Highlights */}
          {mosaic.perspectives && mosaic.perspectives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-600 shrink-0" />
                <h3 className="font-serif font-bold text-sm text-stone-900 uppercase tracking-wider text-[11px]">
                  Individual Vantage Points ({mosaic.perspectives.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mosaic.perspectives.map((p, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2 text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-stone-900 text-stone-50 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {p.contributorName ? p.contributorName.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {p.contributorName}
                        </span>
                      </div>
                      {p.emotionalTone && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 shrink-0 border border-stone-200/60">
                          {p.emotionalTone}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 italic leading-relaxed pl-2 border-l-2 border-amber-300">
                      "{p.keyHighlight}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Highlights */}
          {mosaic.timelineHighlights && mosaic.timelineHighlights.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>Timeline Highlights</span>
              </div>
              <ul className="text-xs text-stone-700 space-y-1.5 pl-3 list-disc">
                {mosaic.timelineHighlights.map((highlight, i) => (
                  <li key={i} className="leading-relaxed font-serif">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shared Themes & Collective Takeaways Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shared Themes */}
            {mosaic.sharedThemes && mosaic.sharedThemes.length > 0 && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <Tag className="w-3.5 h-3.5 text-stone-500" />
                  <span>Shared Themes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mosaic.sharedThemes.map((theme, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-800 shadow-2xs"
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Collective Takeaways */}
            {mosaic.collectiveTakeaways && mosaic.collectiveTakeaways.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <Heart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Collective Resonance</span>
                </div>
                <ul className="text-xs text-emerald-950 space-y-1.5 pl-3 list-disc">
                  {mosaic.collectiveTakeaways.map((takeaway, i) => (
                    <li key={i} className="leading-relaxed">
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />
            <span>Crafted by Valeria Memory Intelligence</span>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && onRegenerate && (
              <button
                type="button"
                id="regenerate-mosaic-btn"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-700 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Synthesizing...' : 'Regenerate Mosaic'}</span>
              </button>
            )}
            <button
              type="button"
              id="close-mosaic-bottom-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-900 hover:bg-stone-800 text-white transition cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
