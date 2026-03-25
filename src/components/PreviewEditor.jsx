import { Edit3, CheckCircle, Circle, Plus, Minus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * UniformTile: renders slide text at a fixed 18px font size for perfect continuity.
 */
function UniformTile({ lines }) {
  return (
    <div className="flex-1 w-full flex items-center justify-center overflow-hidden px-4 py-2">
      <div
        className="font-black text-white text-center leading-tight tracking-tight drop-shadow-2xl w-full"
        style={{ fontSize: '18px', whiteSpace: 'pre-wrap' }}
      >
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export default function PreviewEditor({ 
  item, 
  activeIndex, 
  selectedIndices = new Set(),
  isServiceItem = false,
  onToggleSelection,
  onSelectIndex, 
  onEdit, 
  onAddSelectedToService,
  onRemoveSelectedFromService,
  linesPerSlide = 2, 
  onChangeLinesPerSlide 
}) {
  const tileRefs = useRef([]);

  // Auto-scroll the active tile into view on keyboard navigation
  useEffect(() => {
    if (tileRefs.current[activeIndex]) {
      tileRefs.current[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  if (!item) return null;

  const slides = item.slides || [];
  const title = item.title || item.reference || 'Untitled';
  const subtitle = item.artist
    ? `${item.artist}${item.ccli ? ` | CCLI #${item.ccli}` : ''}`
    : (item.translation || '');
  const isSong = item.type === 'song';

  const handleAddSelected = () => {
    onAddSelectedToService();
  };

  const handleRemoveSelected = () => {
    onRemoveSelectedFromService();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b border-neutral-800/50 pb-4">
        <div className="flex flex-col">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">{title}</h2>
          {subtitle && (
            <div className="text-sm font-bold text-neutral-400 mt-2 uppercase tracking-widest leading-none">
              {subtitle}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Dynamic "Add/Remove Selected" Button */}
          {selectedIndices.size > 0 && (
            isServiceItem ? (
              <button
                onClick={handleRemoveSelected}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20 active:scale-95"
              >
                <Minus size={16} strokeWidth={3} />
                Remove Selected ({selectedIndices.size})
              </button>
            ) : (
              <button
                onClick={handleAddSelected}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95"
              >
                <Plus size={16} strokeWidth={3} />
                Add Selected ({selectedIndices.size})
              </button>
            )
          )}

          {/* Lines per slide toggle — only for songs */}
          {isSong && onChangeLinesPerSlide && (
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden p-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 px-2">Lines</span>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => onChangeLinesPerSlide(n)}
                  className={`w-8 h-7 text-xs font-black rounded-lg transition-all ${
                    linesPerSlide === n
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {isSong && onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl border border-neutral-700/50 transition-all font-bold text-xs uppercase tracking-widest shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Edit3 size={14} className="text-blue-400" />
              Edit Song
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 pt-2 px-1">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12">
          {slides.map((slide, i) => (
            <div key={i} ref={el => tileRefs.current[i] = el} className="flex flex-col gap-2 group">
              {/* Card */}
              <div
                onClick={() => onSelectIndex && onSelectIndex(i)}
                className={`aspect-video rounded-3xl flex flex-col relative cursor-pointer border-2 transition-all duration-300 overflow-hidden ${
                  i === activeIndex
                    ? 'bg-blue-900/10 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)] scale-[1.02] transform z-10'
                    : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 hover:scale-[1.01] transform'
                } ${selectedIndices.has(i) ? 'border-blue-500/50' : ''}`}
              >
                <UniformTile lines={slide.content || []} />

                {/* Selection Indicator */}
                <div 
                  onClick={(e) => { e.stopPropagation(); onToggleSelection(i); }}
                  className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    selectedIndices.has(i) 
                      ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                      : 'bg-black/40 text-white/40 hover:bg-black/60 hover:text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {selectedIndices.has(i) ? <CheckCircle size={20} /> : <Circle size={20} />}
                </div>
              </div>

              {/* Label Row */}
              <div className="flex justify-between items-center px-4">
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${
                  i === activeIndex || selectedIndices.has(i) ? 'text-blue-400' : 'text-neutral-400'
                }`}>
                  {slide.type}
                </div>
                <div className={`text-[10px] font-black ${
                  i === activeIndex || selectedIndices.has(i) ? 'text-blue-500/80' : 'text-neutral-700'
                }`}>
                  SLIDE {i + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
