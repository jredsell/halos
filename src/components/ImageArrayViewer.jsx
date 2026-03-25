export default function ImageArrayViewer({ images, currentIndex, onSelectIndex }) {
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-2xl">
        <span className="text-neutral-500 font-bold uppercase tracking-widest text-sm">No Document Selected</span>
      </div>
    );
  }

  const currentImg = images[currentIndex] || images[0];

  return (
    <div className="w-full h-full flex flex-col relative focus:outline-none">
       <div className="flex-1 overflow-hidden rounded-2xl bg-black border border-neutral-800 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center group">
         <img 
           src={currentImg.url} 
           className="w-full h-full object-contain pointer-events-none transition-transform duration-500 ease-out" 
           alt={`Slide ${currentIndex + 1}`} 
         />
         <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-xl px-4 py-1.5 rounded-full text-xs font-bold text-neutral-300 tracking-widest border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
           {currentIndex + 1} / {images.length}
         </div>
       </div>

       {/* Thumbnail strip */}
       <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 snap-x">
         {images.map((img, i) => (
           <div 
             key={i} 
             onClick={() => onSelectIndex(i)}
             className={`w-32 aspect-video snap-start flex-shrink-0 rounded-xl overflow-hidden border-[3px] transition-all cursor-pointer ${
               i === currentIndex 
                 ? 'border-blue-500 opacity-100 shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-105 transform -translate-y-1' 
                 : 'border-transparent opacity-40 hover:opacity-100 hover:border-neutral-700'
             }`}
           >
             <img src={img.url} className="w-full h-full object-cover" alt={`Thumb ${i+1}`} />
             <div className="absolute inset-0 bg-black/20"></div>
             <div className="absolute bottom-1 right-1 text-[9px] font-black text-white bg-black/60 px-1 rounded">{i+1}</div>
           </div>
         ))}
       </div>
    </div>
  );
}
