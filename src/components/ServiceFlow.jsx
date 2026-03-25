import { GripVertical, Trash2, Save, Upload, Eraser, PlayCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
export default function ServiceFlow({ items, onReorder, onSelect, onRemove, onUpdate, onSave, onLoad, onClear, liveItemId, playedItems, onResetPlayed, onResetItemPlayed }) {
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    // Allow move effect
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    
    const newItems = [...items];
    const item = newItems.splice(draggedIdx, 1)[0];
    newItems.splice(targetIdx, 0, item);
    
    setDraggedIdx(targetIdx);
    onReorder(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const Header = () => (
    <div className="flex flex-col gap-3 mb-4 px-1">
      <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none block">Service Flow</h2>
      <div className="grid grid-cols-4 gap-1.5">
         <button 
           onClick={onClear}
           title="Clear Service"
           className="p-2 flex flex-col items-center justify-center gap-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 border border-neutral-700/50 rounded-lg transition text-[8px] font-black uppercase tracking-widest text-center shadow-lg"
         >
           <Eraser size={14} /> Clear
         </button>
         <button 
           onClick={onResetPlayed}
           title="Reset All Statuses"
           className="p-2 flex flex-col items-center justify-center gap-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700/50 rounded-lg transition text-[8px] font-black uppercase tracking-widest text-center shadow-lg"
         >
           <RotateCcw size={14} /> Reset
         </button>
         <button 
           onClick={onLoad}
           title="Load Service"
           className="p-2 flex flex-col items-center justify-center gap-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-blue-400 border border-neutral-700/50 rounded-lg transition text-[8px] font-black uppercase tracking-widest text-center shadow-lg"
         >
           <Upload size={14} /> Load
         </button>
         <button 
           onClick={onSave}
           title="Save Service"
           className="p-2 flex flex-col items-center justify-center gap-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-green-400 border border-neutral-700/50 rounded-lg transition text-[8px] font-black uppercase tracking-widest text-center shadow-lg"
         >
           <Save size={14} /> Save
         </button>
      </div>
    </div>
  );

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col h-full mt-2 w-full">
        <Header />
        <div className="text-sm font-medium text-neutral-400 p-6 text-center bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed shadow-inner leading-relaxed opacity-60">
          Your service is currently empty.<br/><br/>Go to Songs, Bible, or Media tabs to search and add items to your flow.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full mt-2">
      <Header />
      <div className="flex-1 overflow-y-auto space-y-2.5 px-1 pb-4">
        {items.map((item, index) => {
          const isPlaying = liveItemId === item.id;
          const isPlayed = !isPlaying && playedItems?.has(item.id);
          
          return (
          <div 
            key={item.id || index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(item)}
            className={`p-3.5 rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing group border transition-all shadow-md hover:shadow-lg ${
              isPlaying ? 'border-green-500/50 bg-green-900/10' : 'border-neutral-700/50 hover:border-blue-500/50 bg-neutral-800/80 hover:bg-neutral-700/90'
            } ${
              isPlayed ? 'opacity-50' : 'opacity-100'
            } ${
              draggedIdx === index ? 'opacity-30 scale-95' : 'scale-100'
            }`}
          >
            <GripVertical size={18} className="text-neutral-500 group-hover:text-blue-400 transition-colors" />
            <div className="min-w-0 flex-1">
              <div className={`font-bold text-sm truncate flex items-center gap-2 ${isPlaying ? 'text-green-400' : 'text-neutral-100'}`}>
                 {item.title || item.reference || 'Untitled Item'}
                 {isPlayed && <CheckCircle size={14} className="text-neutral-500 ml-1" />}
              </div>
              <div className="flex items-center gap-3 mt-1">
                 <div className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest leading-none">{item.type || 'Media'}</div>
                 
                 {(item.type === 'video' || item.type === 'slide_deck') && (
                    <button
                       onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(index, { ...item, autoPlay: !item.autoPlay });
                       }}
                       className={`flex items-center gap-1 min-w-max px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                          item.autoPlay 
                             ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                             : 'bg-neutral-800/80 text-neutral-500 border border-neutral-700/50 hover:text-neutral-400'
                       }`}
                       title="Auto Play when pushed Live"
                    >
                       <PlayCircle size={10} className={item.autoPlay ? 'text-blue-400' : 'text-neutral-500'} /> Auto Play
                    </button>
                 )}
              </div>
            </div>
            
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
               {isPlayed && (
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     if (onResetItemPlayed) onResetItemPlayed(item.id);
                   }}
                   className="p-2 hover:bg-neutral-600/50 hover:text-white text-neutral-500 rounded-lg transition-all mr-1"
                   title="Reset Status"
                 >
                   <RotateCcw size={16} />
                 </button>
               )}
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className="p-2 hover:bg-red-500/20 hover:text-red-500 text-neutral-500 rounded-lg transition-all"
                  title="Remove from Service"
               >
                 <Trash2 size={16} />
               </button>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
