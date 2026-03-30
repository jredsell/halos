import { useState, useEffect, useRef } from 'react';
import { Peer } from 'peerjs';
import OutputScreen from './OutputScreen';

const LiveViewer = () => {
  const [networkPayload, setNetworkPayload] = useState(null);
  const [remoteCommand, setRemoteCommand] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const mediaMapCache = useRef({});
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (!roomId) return;

    let peer = null;

    try {
      peer = new Peer();
      
      peer.on('open', () => {
        const conn = peer.connect('halos-' + roomId);
        
        conn.on('data', (data) => {
          if (data?.type === 'state') {
             const payload = data.payload;
             // Remap blob references matching cache
             if (payload.logoUrl?.startsWith('blob:') && mediaMapCache.current[payload.logoUrl]) {
                payload.logoUrl = mediaMapCache.current[payload.logoUrl];
             }
             if (payload.activeMediaUrl?.startsWith('blob:') && mediaMapCache.current[payload.activeMediaUrl]) {
                payload.activeMediaUrl = mediaMapCache.current[payload.activeMediaUrl];
             }
             if (payload.mediaType === 'image' || payload.mediaType === 'slide_deck') {
                if (payload.activeSlide && Array.isArray(payload.activeSlide)) {
                   payload.activeSlide = payload.activeSlide.map(item => {
                      if (item.url?.startsWith('blob:') && mediaMapCache.current[item.url]) {
                         return { ...item, url: mediaMapCache.current[item.url] };
                      }
                      return item;
                   });
                }
             }
             
             setNetworkPayload(payload);
          } else if (data?.type === 'playback') {
             setRemoteCommand({ ...data, ts: Date.now() });
          } else if (data?.type === 'sync-start') {
             setIsSyncing(true);
          } else if (data?.type === 'sync-end') {
             setIsSyncing(false);
          } else if (data?.type === 'media') {
             // Reconstruct isolated binary Buffer to local memory blob map
             const blob = new Blob([data.data], { type: data.mime || 'application/octet-stream' });
             const localUrl = URL.createObjectURL(blob);
             mediaMapCache.current[data.id] = localUrl;
             
             // Force UI evaluation so the new payload replaces the old activeMediaUrl immediately
             setNetworkPayload(prev => {
                if (!prev) return prev;
                const copy = { ...prev };
                let changed = false;
                if (copy.logoUrl === data.id) { copy.logoUrl = localUrl; changed = true; }
                if (copy.activeMediaUrl === data.id) { copy.activeMediaUrl = localUrl; changed = true; }
                return changed ? copy : prev;
             });
          }
        });
        
        conn.on('close', () => {
           console.log("Master WebRTC connection closed");
        });
      });
    } catch (e) {
      console.error(e);
    }
    
    return () => {
       if (peer) peer.destroy();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const { clientWidth, clientHeight } = containerRef.current;
      const targetW = 1600;
      const targetH = 900;
      
      const scaleX = clientWidth / targetW;
      const scaleY = clientHeight / targetH;
      const s = Math.max(scaleX, scaleY); // Cover viewport
      setScale(s);
    };

    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    handleResize();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-screen h-screen bg-black overflow-hidden relative font-sans select-none">
       <OutputScreen 
          payload={networkPayload || { isLive: false }} 
          isLiveBroadcast={true} 
          remoteCommand={remoteCommand}
       />
       
       <div className="fixed bottom-4 right-6 text-[10px] font-black text-white/50 uppercase tracking-widest pointer-events-none z-50 flex items-center gap-4">
          {isSyncing && (
             <div className="flex items-center gap-2 text-blue-400 bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-500/20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Receiving Media...
             </div>
          )}
          Halos Live View • WebRTC Secure Tunnel
       </div>
    </div>
  );
};

export default LiveViewer;
