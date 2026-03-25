import { useState, useEffect, useRef, useCallback } from 'react';
import { MonitorPlay, MonitorX, Image as ImageIcon, Plus, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import OutputScreen from './OutputScreen';

export default function LiveControl({ 
    isLive, toggleLive, 
    isBlackScreen, setIsBlackScreen, 
    isShowLogo, setIsShowLogo, 
    isClearText, setIsClearText, 
    onPickLogo, livePayload,
    remoteCommand = null,
    playbackStatus = { time: 0, duration: 0, paused: true, volume: 1 },
    presentationPaused = true,
    setPresentationPaused = () => {},
    isSyncingMedia = false
}) {
  const [playVolume, setPlayVolume] = useState(1);
  const [scrubTime, setScrubTime] = useState(0);
  
  const isDragging = useRef(false);
  const isDraggingVol = useRef(false);
  const lastBroadcastRef = useRef(0);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.2);
  const lastStatusUpdateRef = useRef(0);
  const scrubTimeRef = useRef(0);

  const displayTime = isDragging.current ? scrubTime : (playbackStatus?.time || livePayload?.currentTime || 0);
  const displayDuration = playbackStatus?.duration || livePayload?.duration || 0;
  const displayPaused = playbackStatus?.paused ?? presentationPaused;
  const displayVolume = isDraggingVol.current ? playVolume : (playbackStatus?.volume ?? playVolume);

  // Pixel-Perfect Parity: Scaler for the Virtual 16:9 Screen (1600x900)
  useEffect(() => {
     if (!previewRef.current) return;
     const ro = new ResizeObserver((entries) => {
        for (let entry of entries) {
           const width = entry.contentRect.width;
           setPreviewScale(width / 1600);
        }
     });
     ro.observe(previewRef.current);
     return () => ro.disconnect();
  }, []);

  // Consolidate playback commands into the same channel as the payload for reliability
  const broadcastPlayback = (cmdType, val) => {
     if (cmdType === 'seek') {
        const now = Date.now();
        if (now - lastBroadcastRef.current < 50) return;
        lastBroadcastRef.current = now;
     }

     const channel = new BroadcastChannel('halos-projector-hub');
     channel.postMessage({ 
        type: 'playback', 
        command: cmdType, 
        value: val, 
        source: 'dashboard-ui', 
        isYoutube: livePayload?.isYouTube, 
        isVimeo: livePayload?.isVimeo 
     });
     channel.close();
  };

  const lastCommandTimeRef = useRef(0);

   const handleStatusUpdate = useCallback((status) => {
      if (status && (status.time !== undefined || status.duration !== undefined)) {
         notifyAppOfStatus(status);
      }
   }, [livePayload, displayPaused]);

  const handlePickLogo = async (e) => {
    e.stopPropagation();
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Images',
          accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] }
        }]
      });
      const file = await fileHandle.getFile();
      const { set } = await import('idb-keyval');
      await set('halos_logo_blob', file);
      onPickLogo(URL.createObjectURL(file));
      setIsShowLogo(true);
    } catch(err) {
      console.log('User cancelled logo selection');
    }
  };

  const formatTime = (sec) => {
     if (!sec || isNaN(sec)) return "0:00";
     const m = Math.floor(sec / 60);
     const s = Math.floor(sec % 60);
     return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const notifyAppOfStatus = (overrides) => {
     const channel = new BroadcastChannel('halos-projector-hub');
     channel.postMessage({ 
        type: 'status', 
        time: overrides.time !== undefined ? overrides.time : displayTime, 
        paused: overrides.paused !== undefined ? overrides.paused : presentationPaused, 
        duration: overrides.duration !== undefined ? overrides.duration : displayDuration,
        ts: Date.now(),
        slideshowInterval: overrides.slideshowInterval
     });
     channel.close();
  };

  const handleTogglePlay = () => {
      const nextPaused = !presentationPaused;
      lastCommandTimeRef.current = Date.now();
      broadcastPlayback(nextPaused ? 'pause' : 'play');
      setPresentationPaused(nextPaused);
      notifyAppOfStatus({ paused: nextPaused });
  };

  const preMuteVolumeRef = useRef(1);

  return (
    <div className="flex flex-col items-center h-full space-y-4 pt-1">
      
      {/* 1. True Local WYSIWYG Preview Box */}
      <div className="w-full">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full transition-colors ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
             Live Output Preview
          </div>
        </div>
        
        <div 
           ref={previewRef}
           className={`aspect-video w-full bg-black rounded-xl border-2 shadow-inner transition-colors duration-500 overflow-hidden relative ${isLive ? 'border-green-500/30' : 'border-neutral-800'}`}
        >
           <div 
              style={{ 
                width: '1600px', 
                height: '900px', 
                transform: `scale(${previewScale})`, 
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0
              }}
           >
              <OutputScreen 
                payload={livePayload} 
                isMaster={true}
                onStatusUpdate={handleStatusUpdate} 
                remoteCommand={remoteCommand}
                isLiveBroadcast={true} /* Force High-Impact Scaling Mode */
              />
           </div>
        </div>

        {/* 2. REMOTE PLAYBACK CONTROLS (Compact Version) */}
        {(livePayload?.mediaType === 'video' || livePayload?.mediaType === 'slide_deck') && (
           <div className="mt-3 bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                 <button 
                  onClick={() => {
                        const nextPaused = !displayPaused;
                        lastCommandTimeRef.current = Date.now();
                        broadcastPlayback(nextPaused ? 'pause' : 'play');
                        setPresentationPaused(nextPaused); // Optimistic local update
                    }}
                   className="w-9 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition active:scale-95 shadow-lg flex-shrink-0"
                 >
                    {displayPaused ? <Play size={18} fill="currentColor" className="ml-0.5" /> : <Pause size={18} fill="currentColor" />}
                 </button>
                 
                 {livePayload?.mediaType === 'video' ? (
                     <>
                         <div className="flex-1 flex flex-col gap-1">
                            <input 
                              type="range"
                              min="0"
                              max={displayDuration}
                              step="0.1"
                              value={displayTime}
                              onMouseDown={() => { 
                                  isDragging.current = true; 
                                  setScrubTime(displayTime);
                              }}
                              onMouseUp={() => { 
                                 isDragging.current = false;
                                 const channel = new BroadcastChannel('halos-projector-hub');
                                 channel.postMessage({ 
                                    type: 'playback', command: 'seek', value: scrubTimeRef.current, 
                                    source: 'dashboard-ui', isYoutube: livePayload?.isYouTube, isVimeo: livePayload?.isVimeo 
                                 });
                                 channel.close();
                                 if (!displayPaused) setTimeout(() => broadcastPlayback('play'), 50);
                                 notifyAppOfStatus({ time: scrubTimeRef.current, paused: displayPaused });
                              }}
                              onChange={(e) => {
                                 const time = parseFloat(e.target.value);
                                 scrubTimeRef.current = time;
                                 setScrubTime(time);
                                 broadcastPlayback('seek', time);
                                 const now = Date.now();
                                 if (now - lastStatusUpdateRef.current > 200) {
                                    lastStatusUpdateRef.current = now;
                                    notifyAppOfStatus({ time, paused: displayPaused });
                                 }
                              }}
                              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-[10px] font-black font-mono tracking-tighter">
                               <span className={displayTime > 0 ? "text-blue-400" : "text-neutral-500"}>
                                  {formatTime(displayTime)}
                               </span>
                               <div className="flex items-center gap-2">
                                  {isSyncingMedia && <span className="text-blue-500 animate-pulse uppercase tracking-tighter">Syncing...</span>}
                                  <span className="text-white/60">REMAINING</span>
                                  <span className="text-white font-black">-{formatTime(Math.max(0, displayDuration - displayTime))}</span>
                               </div>
                            </div>
                         </div>

                         <button 
                            onClick={() => { 
                               setScrubTime(0);
                               setPresentationPaused(false);
                               broadcastPlayback('seek', 0);
                               setTimeout(() => broadcastPlayback('play'), 100);
                               notifyAppOfStatus({ time: 0, paused: false });
                            }}
                            className="p-1.5 text-neutral-500 hover:text-white transition"
                         >
                            <RotateCcw size={16} />
                         </button>
                     </>
                 ) : (
                     <div className="flex-1 flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Auto Timer</span>
                        <select 
                           value={livePayload?.slideshowInterval || 5}
                           onChange={(e) => {
                               const val = parseInt(e.target.value);
                               notifyAppOfStatus({ slideshowInterval: val });
                           }}
                           className="bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg outline-none focus:border-blue-500 transition cursor-pointer"
                        >
                           <option value="3">3 Seconds</option>
                           <option value="5">5 Seconds</option>
                           <option value="10">10 Seconds</option>
                           <option value="15">15 Seconds</option>
                           <option value="20">20 Seconds</option>
                           <option value="30">30 Seconds</option>
                           <option value="60">1 Minute</option>
                        </select>
                     </div>
                 )}
              </div>

              {livePayload.mediaType === 'video' && (
                  <div className="flex items-center gap-2.5 border-t border-neutral-800/50 pt-2.5">
                     <button onClick={() => {
                        const targetVol = displayVolume > 0 ? 0 : (preMuteVolumeRef.current || 1);
                        if (displayVolume > 0) preMuteVolumeRef.current = displayVolume;
                        broadcastPlayback('volume', targetVol);
                        setPlayVolume(targetVol);
                     }}>
                        {displayVolume > 0.5 ? <Volume2 size={14} className="text-neutral-500" /> : 
                         displayVolume > 0 ? <Volume2 size={14} className="text-neutral-500 opacity-60" /> : 
                         <VolumeX size={14} className="text-red-500" />}
                     </button>
                     <input 
                       type="range"
                       min="0" max="1" step="0.1"
                       value={displayVolume}
                       onMouseDown={() => isDraggingVol.current = true}
                       onMouseUp={() => isDraggingVol.current = false}
                       onChange={(e) => {
                          const vol = parseFloat(e.target.value);
                          broadcastPlayback('volume', vol);
                          setPlayVolume(vol);
                       }}
                       className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
                     />
                  </div>
              )}
           </div>
        )}
      </div>

      <button 
        onClick={toggleLive}
        className={`w-full py-4 text-lg font-black text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
          isLive ? 'bg-green-600 shadow-lg' : 'bg-red-600 shadow-lg'
        }`}
      >
        <MonitorPlay size={20} />
        {isLive ? 'LIVE' : 'GO LIVE'}
      </button>

      <div className="w-full space-y-3">
        <button 
          onClick={() => setIsClearText(!isClearText)}
          className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
            isClearText 
              ? 'bg-red-900/20 border-red-500 text-red-500' 
              : 'bg-neutral-800/50 hover:bg-neutral-800 border-transparent text-neutral-400'
          }`}
        >
          <MonitorX size={16} />
          Clear Text
        </button>
        
        <button 
          onClick={() => setIsBlackScreen(!isBlackScreen)}
          className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
            isBlackScreen 
              ? 'bg-yellow-900/10 border-yellow-500 text-yellow-500' 
              : 'bg-black hover:bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isBlackScreen ? 'bg-yellow-500' : 'bg-neutral-700'}`} />
          Black Screen
        </button>

        <div className="relative w-full flex">
          <button 
            onClick={() => setIsShowLogo(!isShowLogo)}
            className={`flex-1 p-3.5 border-y-2 border-l-2 rounded-l-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-3 ${
              isShowLogo ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-neutral-800/50 border-neutral-800 text-neutral-500'
            }`}
          >
            <ImageIcon size={16} />
            Show Logo
          </button>
          
          <button 
            onClick={handlePickLogo}
            className={`px-4 border-y-2 border-r-2 rounded-r-xl transition flex items-center justify-center ${
              isShowLogo ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-700 border-neutral-800 text-neutral-400'
            }`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
