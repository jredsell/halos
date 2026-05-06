import { useState, useEffect, useRef } from 'react';
import { Peer } from 'peerjs';
import { Play, Pause, SkipForward, SkipBack, MonitorOff, LayoutTemplate, XCircle, Settings, Monitor, Radio, FileText, Music, Image as ImgIcon, Video, AlignLeft, BookOpen, Presentation, ChevronRight, ChevronLeft, Headphones } from 'lucide-react';

export default function RemoteControl({ roomId }) {
  const [status, setStatus] = useState('connecting');
  const [payload, setPayload] = useState(null);
  const [serviceItems, setServiceItems] = useState([]);
  const [error, setError] = useState(null);
  const connRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    setStatus('connecting');

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect('halos-' + roomId, { reliable: true });
      connRef.current = conn;

      conn.on('open', () => {
        setStatus('connected');
      });

      conn.on('data', (data) => {
        if (data.type === 'state') {
          if (data.payload) setPayload(data.payload);
          if (data.serviceItems) setServiceItems(data.serviceItems);
        }
      });

      conn.on('close', () => {
        setStatus('disconnected');
      });
      
      conn.on('error', (err) => {
         setError(err.message);
         setStatus('error');
      });
    });

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
         setError("Cannot find the Master presentation. Make sure it is open and connected to the internet.");
      } else {
         setError(err.message);
      }
      setStatus('error');
    });

    return () => {
      if (connRef.current) connRef.current.close();
      if (peer) peer.destroy();
    };
  }, [roomId]);

  const sendCommand = (cmd, args = {}) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ type: 'remote_command', command: cmd, ...args });
    }
  };

  if (status === 'connecting') {
     return <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6"><div className="w-8 h-8 rounded-full border-t-2 border-blue-500 animate-spin mb-4"></div><p>Connecting to {roomId}...</p></div>;
  }
  
  if (status === 'error' || status === 'disconnected') {
     return (
       <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Connection Lost</h2>
          <p className="text-neutral-400 mb-6">{error || "The connection to the Master presentation was lost."}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition">Try Reconnecting</button>
       </div>
     );
  }

  const isMedia = payload?.mediaType === 'audio' || payload?.mediaType === 'video';
  const hasSlides = payload?.mediaType === 'song' || payload?.mediaType === 'liturgy' || payload?.mediaType === 'bible' || payload?.mediaType === 'slide_deck' || payload?.mediaType === 'image';

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 bg-neutral-900 border-b border-neutral-800 flex-shrink-0">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-bold tracking-widest text-sm uppercase">Live Remote</span>
           </div>
           <div className="text-xs text-neutral-500 font-mono bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800">
              {roomId}
           </div>
        </header>

        {/* Live Controls Section */}
        <div className="bg-neutral-900/50 p-4 border-b border-neutral-800 flex flex-col gap-4 flex-shrink-0 relative overflow-hidden">
           
           <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
               <Radio className="w-32 h-32" />
           </div>
           
           <div className="relative z-10">
              <h2 className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Monitor size={12} /> Now Playing</h2>
              <div className="font-bold text-lg leading-tight truncate">
                 {payload?.activeMediaUrl ? payload.activeMediaUrl.split('/').pop() : (payload?.itemId ? serviceItems.find(i => i.id === payload.itemId)?.title || "Unknown Item" : "Nothing playing")}
              </div>
           </div>

           <div className="flex items-center gap-2 relative z-10">
              {hasSlides && (
                 <div className="flex flex-1 items-center gap-2">
                    <button onClick={() => sendCommand('prev_slide')} className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 rounded-xl flex items-center justify-center transition border border-neutral-700/50">
                       <ChevronLeft size={24} />
                    </button>
                    <button onClick={() => sendCommand('next_slide')} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl flex items-center justify-center transition shadow-lg shadow-blue-500/20 font-bold tracking-widest uppercase text-sm gap-2">
                       Next Slide <ChevronRight size={18} />
                    </button>
                 </div>
              )}
              {isMedia && (
                 <div className="flex flex-1 items-center gap-2">
                    <button onClick={() => sendCommand('play')} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl flex items-center justify-center transition shadow-lg shadow-blue-500/20">
                       <Play size={24} className={!payload?.isPaused ? 'opacity-50' : ''} />
                    </button>
                    <button onClick={() => sendCommand('pause')} className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 rounded-xl flex items-center justify-center transition border border-neutral-700/50">
                       <Pause size={24} className={payload?.isPaused ? 'opacity-50' : ''} />
                    </button>
                 </div>
              )}
           </div>

           {/* Quick Actions */}
           <div className="flex flex-wrap items-center gap-2 mt-2 relative z-10">
              <button 
                onClick={() => sendCommand('toggle_live')} 
                className={`flex-1 min-w-[80px] py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition shadow-md ${payload?.isLive ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/50'}`}
              >
                 <Presentation size={18} /> {payload?.isLive ? 'End Live' : 'Go Live'}
              </button>
              <button 
                onClick={() => sendCommand('black_screen')} 
                className={`flex-1 min-w-[80px] py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition border ${payload?.isBlackScreen ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-neutral-950 text-neutral-400 border-neutral-800 active:bg-neutral-800'}`}
              >
                 <MonitorOff size={18} /> Black
              </button>
              <button 
                onClick={() => sendCommand('show_logo')} 
                className={`flex-1 min-w-[80px] py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition border ${payload?.isShowLogo ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-neutral-950 text-neutral-400 border-neutral-800 active:bg-neutral-800'}`}
              >
                 <LayoutTemplate size={18} /> Logo
              </button>
              <button 
                onClick={() => sendCommand('clear_text')} 
                className={`flex-1 min-w-[80px] py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition border ${payload?.isClearText ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-neutral-950 text-neutral-400 border-neutral-800 active:bg-neutral-800'}`}
              >
                 <AlignLeft size={18} /> Clear
              </button>
           </div>
         </div>
         
         {/* Slide Tiles / Active Item Grid */}
         {hasSlides && (payload?.itemSlides || payload?.itemImagesCount > 0) && (
            <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex-shrink-0">
               <h3 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-3 pl-1">Slide Selection</h3>
               <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 pb-1">
                  {payload.itemSlides ? (
                     payload.itemSlides.map((slide, idx) => {
                        const isActive = payload.slideIndex === idx;
                        return (
                           <button
                              key={idx}
                              onClick={() => sendCommand('set_slide_index', { index: idx })}
                              className={`aspect-video rounded-xl flex flex-col relative overflow-hidden transition-all active:scale-95 text-left p-3 ${
                                 isActive 
                                   ? 'bg-blue-600 border-2 border-blue-400 shadow-lg shadow-blue-900/50' 
                                   : 'bg-neutral-900 border-2 border-neutral-800 hover:border-neutral-700'
                              }`}
                           >
                              <div className="flex-1 w-full overflow-hidden flex items-center justify-center">
                                 <div className={`font-black text-[10px] leading-tight w-full whitespace-pre-wrap ${
                                    slide.alignment === 'left' ? 'text-left' : slide.alignment === 'right' ? 'text-right' : 'text-center'
                                 } ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                                    {(slide.content || []).slice(0, 4).map((line, li) => <div key={li}>{line}</div>)}
                                    {(slide.content || []).length > 4 && <div className="text-blue-300/50 mt-1">...</div>}
                                 </div>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                 <span className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-200' : 'text-neutral-500'}`}>
                                    {slide.type || 'SLIDE'}
                                 </span>
                                 <span className={`text-[8px] font-bold ${isActive ? 'text-white' : 'text-neutral-600'}`}>
                                    {idx + 1}
                                 </span>
                              </div>
                           </button>
                        );
                     })
                  ) : (
                     Array.from({ length: payload.itemImagesCount }).map((_, idx) => {
                        const isActive = payload.slideIndex === idx;
                        return (
                           <button
                              key={idx}
                              onClick={() => sendCommand('set_slide_index', { index: idx })}
                              className={`aspect-video rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-95 border-2 ${
                                 isActive 
                                   ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/50 text-white' 
                                   : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                              }`}
                           >
                              <div className="flex flex-col items-center gap-1">
                                 <ImgIcon size={24} className={isActive ? 'opacity-100' : 'opacity-50'} />
                                 <span className="text-[10px] font-bold tracking-widest uppercase">Slide {idx + 1}</span>
                              </div>
                           </button>
                        );
                     })
                  )}
               </div>
            </div>
         )}

         {/* Service Flow List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-4 pb-24">
           <h3 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-3 pl-1">Service Flow</h3>
           <div className="flex flex-col gap-2">
              {serviceItems.map((item, idx) => {
                 const isLive = payload?.itemId === item.id;
                 
                 let Icon = FileText;
                 if (item.type === 'song') Icon = Music;
                 if (item.type === 'bible') Icon = BookOpen;
                 if (item.type === 'image' || item.type === 'slide_deck') Icon = ImgIcon;
                 if (item.type === 'video') Icon = Video;
                 if (item.type === 'audio') Icon = Headphones;

                 return (
                    <button 
                       key={item.id + idx}
                       onClick={() => sendCommand('select_item', { itemId: item.id })}
                       className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition active:scale-[0.98] border ${
                          isLive 
                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/50' 
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                       }`}
                    >
                       <div className={`p-2 rounded-lg ${isLive ? 'bg-white/20' : 'bg-neutral-950'}`}>
                          <Icon size={18} className={isLive ? 'text-white' : 'text-neutral-400'} />
                       </div>
                       <div className="flex-1 overflow-hidden">
                          <div className={`font-bold truncate text-sm ${isLive ? 'text-white' : 'text-neutral-200'}`}>
                             {item.title || item.filename}
                          </div>
                          <div className={`text-[10px] uppercase tracking-widest font-bold truncate mt-0.5 ${isLive ? 'text-blue-200' : 'text-neutral-500'}`}>
                             {item.type.replace('_', ' ')}
                          </div>
                       </div>
                       {isLive && (
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                       )}
                    </button>
                 );
              })}
           </div>
        </div>
    </div>
  );
}
