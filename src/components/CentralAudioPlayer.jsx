import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function CentralAudioPlayer({ 
    item, 
    isLiveItem, 
    playbackStatus, 
    setPresentationPaused 
}) {
    const [localTime, setLocalTime] = useState(0);
    const [localDuration, setLocalDuration] = useState(0);
    const [localPaused, setLocalPaused] = useState(true);
    const [localVolume, setLocalVolume] = useState(1);
    
    const audioRef = useRef(null);
    const isDragging = useRef(false);
    const isDraggingVol = useRef(false);
    const preMuteVolumeRef = useRef(1);

    // Reset when item changes
    useEffect(() => {
        if (!isLiveItem) {
            setLocalTime(0);
            setLocalPaused(true);
        }
    }, [item?.url, isLiveItem]);

    // Sync with live output
    useEffect(() => {
        if (isLiveItem && playbackStatus) {
            if (playbackStatus.time !== undefined && !isDragging.current) setLocalTime(playbackStatus.time);
            if (playbackStatus.duration !== undefined) setLocalDuration(playbackStatus.duration);
            if (playbackStatus.paused !== undefined) setLocalPaused(playbackStatus.paused);
            // playbackStatus might not always contain volume, so we rely on localVolume for the UI mostly
            if (playbackStatus.volume !== undefined && !isDraggingVol.current) setLocalVolume(playbackStatus.volume);
        }
    }, [isLiveItem, playbackStatus]);

    const formatTime = (sec) => {
        if (!sec || isNaN(sec) || sec <= 0) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        const nextPaused = !localPaused;
        setLocalPaused(nextPaused); // Optimistic UI update
        
        if (isLiveItem) {
            const channel = new BroadcastChannel('halos-projector-hub');
            channel.postMessage({ type: 'playback', command: nextPaused ? 'pause' : 'play', source: 'dashboard-ui' });
            channel.close();
            setPresentationPaused(nextPaused);
        } else {
            if (nextPaused) audioRef.current?.pause();
            else audioRef.current?.play();
        }
    };

    const handleSeek = (val) => {
        setLocalTime(val); // Optimistic UI update
        if (isLiveItem) {
            const channel = new BroadcastChannel('halos-projector-hub');
            channel.postMessage({ type: 'playback', command: 'seek', value: val, source: 'dashboard-ui' });
            channel.close();
        } else {
            if (audioRef.current) audioRef.current.currentTime = val;
        }
    };

    const handleVolume = (val) => {
        setLocalVolume(val); // Optimistic UI update
        if (isLiveItem) {
            const channel = new BroadcastChannel('halos-projector-hub');
            channel.postMessage({ type: 'playback', command: 'volume', value: val, source: 'dashboard-ui' });
            channel.close();
        } else {
            if (audioRef.current) audioRef.current.volume = val;
        }
    };

    const toggleMute = () => {
        if (localVolume > 0) {
            preMuteVolumeRef.current = localVolume;
            handleVolume(0);
        } else {
            handleVolume(preMuteVolumeRef.current || 1);
        }
    };

    return (
        <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-w-2xl mx-auto mt-4 relative overflow-hidden">
            {!isLiveItem && (
                <audio 
                    ref={audioRef} 
                    src={item.url} 
                    onTimeUpdate={(e) => { if (!isDragging.current) setLocalTime(e.target.currentTime); }}
                    onLoadedMetadata={(e) => setLocalDuration(e.target.duration)}
                    onEnded={() => setLocalPaused(true)}
                    onPlay={() => setLocalPaused(false)}
                    onPause={() => setLocalPaused(true)}
                    className="hidden" 
                />
            )}
            
            <div className={`absolute top-0 left-0 w-full h-1 ${isLiveItem ? 'bg-green-500 animate-pulse' : 'bg-neutral-800'}`} />

            {isLiveItem && (
                <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest text-center mb-1 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Controlling Live Output
                </div>
            )}
            {!isLiveItem && (
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center mb-1">
                    Local Preview Mode
                </div>
            )}

            <div className="flex items-center gap-5 w-full">
                <button 
                    onClick={handlePlayPause}
                    className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition active:scale-95 shadow-lg flex-shrink-0"
                >
                    {localPaused ? <Play size={24} fill="currentColor" className="ml-1" /> : <Pause size={24} fill="currentColor" />}
                </button>
                
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <input 
                        type="range" min="0" max={localDuration || 100} step="0.1" 
                        value={Math.min(localTime, localDuration || 100)}
                        onMouseDown={() => isDragging.current = true}
                        onMouseUp={(e) => {
                            isDragging.current = false;
                            handleSeek(parseFloat(e.target.value));
                        }}
                        onChange={(e) => {
                            setLocalTime(parseFloat(e.target.value));
                        }}
                        className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs font-black font-mono tracking-tighter">
                        <span className={localTime > 0 ? "text-blue-400" : "text-neutral-500"}>{formatTime(localTime)}</span>
                        <span className={localDuration > 0 ? "text-neutral-400" : "text-neutral-600"}>-{formatTime(Math.max(0, localDuration - localTime))}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 min-w-[140px] w-1/4 border-l border-neutral-800 pl-5 flex-shrink-0">
                    <button onClick={toggleMute} className="text-neutral-400 hover:text-white transition flex-shrink-0">
                        {localVolume > 0.5 ? <Volume2 size={18} /> : localVolume > 0 ? <Volume2 size={18} className="opacity-60" /> : <VolumeX size={18} className="text-red-500" />}
                    </button>
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        value={localVolume}
                        onMouseDown={() => isDraggingVol.current = true}
                        onMouseUp={() => isDraggingVol.current = false}
                        onChange={(e) => handleVolume(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            </div>
        </div>
    );
}
