import React from 'react';
import { BrainCircuit, Sparkles, ArrowUpRight, History } from 'lucide-react';
import { MemoryReference } from '../types';

interface RelatedMemoriesCardProps {
  memoryReferences?: MemoryReference[];
  onOpenMemory?: (reflectionId: string) => void;
}

export const RelatedMemoriesCard: React.FC<RelatedMemoriesCardProps> = ({
  memoryReferences,
  onOpenMemory
}) => {
  if (!memoryReferences || memoryReferences.length === 0) {
    return null;
  }

  return (
    <div 
      id="related-memories-card-container" 
      className="mt-3 pt-3 border-t border-stone-100/90 space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-stone-600">
          <History className="w-3.5 h-3.5 text-amber-700" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-700">
            Related Memories ({memoryReferences.length})
          </span>
        </div>
        <span className="text-[10px] font-mono text-stone-400">
          From your past reflections
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {memoryReferences.map((memory) => {
          const isClickable = Boolean(onOpenMemory);

          return (
            <div
              key={memory.reflectionId}
              id={`related-memory-${memory.reflectionId}`}
              onClick={() => {
                if (onOpenMemory) {
                  onOpenMemory(memory.reflectionId);
                }
              }}
              className={`p-3 rounded-xl bg-stone-50/90 border border-stone-200/90 text-left transition ${
                isClickable 
                  ? 'hover:bg-amber-50/50 hover:border-amber-300/80 cursor-pointer group shadow-2xs' 
                  : ''
              }`}
              title={isClickable ? `Click to open "${memory.title}"` : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-serif font-bold text-xs text-stone-900 truncate group-hover:text-amber-950">
                      "{memory.title}"
                    </h5>
                    
                    {memory.relevanceBadge && (
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md ${
                        memory.relevanceBadge === 'Highly relevant'
                          ? 'bg-amber-100/80 text-amber-900 border border-amber-200/80'
                          : 'bg-stone-200/70 text-stone-700 border border-stone-300/60'
                      }`}>
                        {memory.relevanceBadge}
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-stone-400">
                      {memory.date}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                    {memory.excerpt}
                  </p>

                  {memory.reason && (
                    <div className="text-[11px] text-stone-500 italic pt-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{memory.reason}</span>
                    </div>
                  )}
                </div>

                {isClickable && (
                  <div className="p-1 rounded-lg text-stone-400 group-hover:text-amber-800 group-hover:bg-amber-100/60 transition shrink-0 mt-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
