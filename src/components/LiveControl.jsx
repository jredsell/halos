import { useState, useEffect, useRef, useCallback } from 'react';
import { MonitorPlay, MonitorX, Image as ImageIcon, Plus, Play, Pause, RotateCcw, Volume2, VolumeX, Repeat, Repeat1 } from 'lucide-react';
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
    isSyncingMedia = false,
    roomId = null,
    musicFiles = []
}) {
  const [playVolume, setPlayVolume] = useState(1);
  const [scrubTime, setScrubTime] = useState(0);
  
  // Background Music state
  const [bgmFile, setBgmFile] = useState('');
  const [bgmUrl, setBgmUrl] = useState(null);
  const [bgmPaused, setBgmPaused] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.5);
  const [bgmPlaylistMode, setBgmPlaylistMode] = useState(false);
  const bgmAudioRef = useRef(null);

  const [flatAudioFiles, setFlatAudioFiles] = useState([]);

  useEffect(() => {
    let isCancelled = false;
    const scan = async () => {
       const flat = [];
       const traverse = async (handles, path = '') => {
           for (const f of handles) {
               if (!f || !f.name) continue;
               
               // If it's a file, check extension
               if (!f.isDirectory) {
                   const isAudio = /\.(mp3|wav|m4a|aac|ogg|flac|m4p)$/i.test(f.name);
                   if (isAudio) {
                      flat.push({ ...f, displayPath: path ? `${path}/${f.name}` : f.name });
                   }
               } else if (f.isDirectory && f.handle && f.handle.entries) {
                   // If it's a directory, recurse
                   try {
                       const children = [];
                       for await (const [name, handle] of f.handle.entries()) {
                           children.push({ name, handle, isDirectory: handle.kind === 'directory' });
                       }
                       await traverse(children, path ? `${path}/${f.name}` : f.name);
                   } catch (e) {
                       console.warn("BGM Scan failed for folder:", f.name, e);
                   }
               }
           }
       };
       
       if (musicFiles && musicFiles.length > 0) {
          await traverse(musicFiles);
          if (!isCancelled) {
              setFlatAudioFiles(flat.sort((a,b) => a.displayPath.localeCompare(b.displayPath, undefined, {numeric: true})));
          }
       }
    };
    scan();
    return () => { isCancelled = true; };
  }, [musicFiles]);

  useEffect(() => {
    if (!bgmFile) {
       setBgmUrl(null);
       return;
    }
    const match = flatAudioFiles?.find(f => f.displayPath === bgmFile);
    if (!match) return;
    
    let isCancelled = false;
    match.handle.getFile().then(file => {
       if (!isCancelled) setBgmUrl(URL.createObjectURL(file));
    });
    return () => { isCancelled = true; }
  }, [bgmFile, flatAudioFiles]);

  useEffect(() => {
    if (bgmAudioRef.current) {
        if (bgmPaused) bgmAudioRef.current.pause();
        else {
           bgmAudioRef.current.muted = false;
           bgmAudioRef.current.volume = bgmVolume;
           bgmAudioRef.current.play().catch(() => {});
        }
    }
  }, [bgmPaused, bgmVolume, bgmUrl]);


  // localStatus is updated IMMEDIATELY when the preview's OutputScreen reports an event.
  // This gives instant playhead movement and icon state without waiting for the
  // BroadcastChannel → App.jsx → prop roundtrip.
  const [localStatus, setLocalStatus] = useState({ time: 0, duration: 0, paused: true });

  const isDragging = useRef(false);
  const isDraggingVol = useRef(false);
  const lastBroadcastRef = useRef(0);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.2);
  const lastStatusUpdateRef = useRef(0);
  const scrubTimeRef = useRef(0);

  // Merge: prefer the App-level playbackStatus (which can include projector popup feedback)
  // but also update immedialety from localStatus for snappy UI.
  const displayTime = isDragging.current
    ? scrubTime
    : (playbackStatus?.time || localStatus.time || livePayload?.currentTime || 0);
  const displayDuration = playbackStatus?.duration || localStatus.duration || livePayload?.duration || 0;
  // Use localStatus.paused for instant icon response; playbackStatus confirms from projector.
  const displayPaused = playbackStatus?.paused !== undefined
    ? playbackStatus.paused
    : (localStatus.paused !== undefined ? localStatus.paused : presentationPaused);
  const displayVolume = isDraggingVol.current ? playVolume : (playbackStatus?.volume ?? playVolume);

  // 16:9 preview scaler
  useEffect(() => {
     if (!previewRef.current) return;
     const ro = new ResizeObserver((entries) => {
        for (let entry of entries) {
           setPreviewScale(entry.contentRect.width / 1600);
        }
     });
     ro.observe(previewRef.current);
     return () => ro.disconnect();
  }, []);

  // broadcastPlayback sends a command to the projector popup via BroadcastChannel
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

  // notifyAppOfStatus tells App.jsx to update its playbackStatus state (and re-send to network)
  const notifyAppOfStatus = useCallback((fresh) => {
     const channel = new BroadcastChannel('halos-projector-hub');
     channel.postMessage({
        type: 'status',
        time: fresh.time,
        paused: fresh.paused,
        duration: fresh.duration,
        ts: Date.now(),
        slideshowInterval: fresh.slideshowInterval
     });
     channel.close();
  }, []);

  // handleStatusUpdate is called by the preview's OutputScreen (isMaster=true) on every
  // time/play/pause event. We update localStatus immediately for snappy controls.
  const handleStatusUpdate = useCallback((status) => {
     if (!status) return;
     setLocalStatus(prev => ({
        time:     status.time     !== undefined ? status.time     : prev.time,
        duration: status.duration !== undefined ? status.duration : prev.duration,
        paused:   status.paused   !== undefined ? status.paused   : prev.paused,
     }));
     // Broadcast so App updates playbackStatus (which feeds the projector popup & network)
     notifyAppOfStatus(status);
  }, [notifyAppOfStatus]);

  // Reset localStatus when item changes
  useEffect(() => {
     setLocalStatus({ time: 0, duration: 0, paused: !livePayload?.itemAutoPlay });
  }, [livePayload?.activeMediaUrl]);

  const handlePickLogo = async (e) => {
    e.stopPropagation();
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Images', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] } }]
      });
      const file = await fileHandle.getFile();
      const { set } = await import('idb-keyval');
      await set('halos_logo_blob', file);
      onPickLogo(URL.createObjectURL(file));
      setIsShowLogo(true);
    } catch(err) {}
  };

  const formatTime = (sec) => {
     if (!sec || isNaN(sec) || sec <= 0) return "0:00";
     const m = Math.floor(sec / 60);
     const s = Math.floor(sec % 60);
     return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const preMuteVolumeRef = useRef(1);

  return (
    <div className="flex flex-col items-center h-full space-y-4 pt-1">

      {/* 1. Live Preview Box */}
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
           <div style={{
             width: '1600px', height: '900px',
             transform: `scale(${previewScale})`,
             transformOrigin: 'top left',
             position: 'absolute', top: 0, left: 0
           }}>
              {/* isMaster={true} → this preview is the local status authority.
                  muteAudio={false} → this is the ONLY place audio plays out from. */}
              <OutputScreen
                payload={livePayload}
                isMaster={true}
                muteAudio={false}
                onStatusUpdate={handleStatusUpdate}
                remoteCommand={remoteCommand}
                isLiveBroadcast={true}
              />
           </div>
        </div>

        {/* 2. Playback Controls */}
        {(livePayload?.mediaType === 'video' || livePayload?.mediaType === 'audio' || livePayload?.mediaType === 'slide_deck') && (
           <div className="mt-3 bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                 {/* Play / Pause button */}
                 <button
                   onClick={() => {
                      const nextPaused = !displayPaused;
                      // Update localStatus immediately for instant icon switch
                      setLocalStatus(prev => ({ ...prev, paused: nextPaused }));
                      broadcastPlayback(nextPaused ? 'pause' : 'play');
                      setPresentationPaused(nextPaused);
                   }}
                   className="w-9 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition active:scale-95 shadow-lg flex-shrink-0"
                 >
                    {displayPaused
                      ? <Play size={18} fill="currentColor" className="ml-0.5" />
                      : <Pause size={18} fill="currentColor" />}
                 </button>

                 {(livePayload?.mediaType === 'video' || livePayload?.mediaType === 'audio') ? (
                     <>
                         <div className="flex-1 flex flex-col gap-1">
                            {/* Seek / playhead slider */}
                            <input
                              type="range"
                              min="0"
                              max={displayDuration || 100}
                              step="0.1"
                              value={Math.min(displayTime, displayDuration || 100)}
                              onMouseDown={() => { isDragging.current = true; setScrubTime(displayTime); }}
                              onMouseUp={() => {
                                 isDragging.current = false;
                                 const channel = new BroadcastChannel('halos-projector-hub');
                                 channel.postMessage({
                                    type: 'playback', command: 'seek', value: scrubTimeRef.current,
                                    source: 'dashboard-ui', isYoutube: livePayload?.isYouTube, isVimeo: livePayload?.isVimeo
                                 });
                                 channel.close();
                                 if (!displayPaused) setTimeout(() => broadcastPlayback('play'), 50);
                                 setLocalStatus(prev => ({ ...prev, time: scrubTimeRef.current }));
                                 notifyAppOfStatus({ time: scrubTimeRef.current, paused: displayPaused, duration: displayDuration });
                              }}
                              onChange={(e) => {
                                 const time = parseFloat(e.target.value);
                                 scrubTimeRef.current = time;
                                 setScrubTime(time);
                                 broadcastPlayback('seek', time);
                                 const now = Date.now();
                                 if (now - lastStatusUpdateRef.current > 200) {
                                    lastStatusUpdateRef.current = now;
                                    notifyAppOfStatus({ time, paused: displayPaused, duration: displayDuration });
                                 }
                              }}
                              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            {/* Time display */}
                            <div className="flex justify-between text-[10px] font-black font-mono tracking-tighter">
                               <span className={displayTime > 0 ? "text-blue-400" : "text-neutral-500"}>
                                  {formatTime(displayTime)}
                               </span>
                               <div className="flex items-center gap-2">
                                  {isSyncingMedia && <span className="text-blue-500 animate-pulse uppercase tracking-tighter">Syncing...</span>}
                                  <span className={displayDuration > 0 ? "text-white font-black" : "text-neutral-600"}>
                                     -{formatTime(Math.max(0, displayDuration - displayTime))}
                                  </span>
                               </div>
                            </div>
                         </div>

                         {/* Restart button */}
                         <button
                            onClick={() => {
                               setScrubTime(0);
                               setLocalStatus(prev => ({ ...prev, time: 0, paused: false }));
                               setPresentationPaused(false);
                               broadcastPlayback('seek', 0);
                               setTimeout(() => broadcastPlayback('play'), 100);
                               notifyAppOfStatus({ time: 0, paused: false, duration: displayDuration });
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
                               notifyAppOfStatus({ slideshowInterval: parseInt(e.target.value) });
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

              {/* Volume control */}
              {(livePayload.mediaType === 'video' || livePayload.mediaType === 'audio') && (
                  <div className="flex items-center gap-2.5 border-t border-neutral-800/50 pt-2.5">
                     <button onClick={() => {
                        const targetVol = displayVolume > 0 ? 0 : (preMuteVolumeRef.current || 1);
                        if (displayVolume > 0) preMuteVolumeRef.current = displayVolume;
                        broadcastPlayback('volume', targetVol);
                        setPlayVolume(targetVol);
                     }}>
                        {displayVolume > 0.5
                          ? <Volume2 size={14} className="text-neutral-500" />
                          : displayVolume > 0
                            ? <Volume2 size={14} className="text-neutral-500 opacity-60" />
                            : <VolumeX size={14} className="text-red-500" />}
                     </button>
                     <input
                       type="range" min="0" max="1" step="0.1"
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

      {/* 3. Background Music Control */}
      <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5"><Volume2 size={12}/> Background Music</span>
          </div>
          
          <select 
             value={bgmFile} 
             onChange={(e) => {
                 setBgmFile(e.target.value);
                 if (e.target.value) setBgmPaused(false);
             }}
             className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-2 text-white outline-none focus:border-blue-500 transition mb-2"
          >
             <option value="">No background music</option>
             {flatAudioFiles?.map(f => (
                <option key={f.displayPath} value={f.displayPath}>{f.displayPath}</option>
             ))}
          </select>

          {bgmFile && (
             <div className="flex items-center gap-3">
                <button
                  onClick={() => setBgmPaused(!bgmPaused)}
                  className="w-7 h-7 bg-purple-600 hover:bg-purple-500 text-white rounded-full flex items-center justify-center transition active:scale-95 shadow-lg flex-shrink-0"
                >
                   {bgmPaused
                     ? <Play size={12} fill="currentColor" className="ml-0.5" />
                     : <Pause size={12} fill="currentColor" />}
                </button>
                <button
                   onClick={() => setBgmPlaylistMode(!bgmPlaylistMode)}
                   className={`p-1.5 rounded-lg transition ${bgmPlaylistMode ? 'bg-purple-500/20 text-purple-400' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'}`}
                   title={bgmPlaylistMode ? "Playlist Mode (Folder)" : "Loop Single Track"}
                >
                   {bgmPlaylistMode ? <Repeat size={14} /> : <Repeat1 size={14} />}
                </button>
                <div className="flex-1 flex items-center gap-2">
                    <VolumeX size={12} className="text-neutral-600" />
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value={bgmVolume}
                        onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
             </div>
          )}
      </div>
      {bgmUrl && (
          <audio 
             ref={bgmAudioRef} 
             src={bgmUrl} 
             loop={!bgmPlaylistMode} 
             onEnded={() => {
                 if (bgmPlaylistMode) {
                     const currentIndex = flatAudioFiles.findIndex(f => f.displayPath === bgmFile);
                     if (currentIndex !== -1 && currentIndex < flatAudioFiles.length - 1) {
                         setBgmFile(flatAudioFiles[currentIndex + 1].displayPath);
                     } else if (flatAudioFiles.length > 0) {
                         setBgmFile(flatAudioFiles[0].displayPath);
                     }
                 }
             }}
             className="hidden" 
          />
      )}

      {/* GO LIVE button */}
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
