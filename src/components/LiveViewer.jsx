import { useState, useEffect, useRef } from 'react';
import OutputScreen from './OutputScreen';

const LiveViewer = () => {
  const [networkPayload, setNetworkPayload] = useState(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let lastPayloadStr = "";

    const fetchUpdate = () => {
      fetch('/api/live')
        .then(res => res.json())
        .then(data => {
          const currentStr = JSON.stringify(data || {});
          if (currentStr !== lastPayloadStr) {
            setNetworkPayload(data || {});
            lastPayloadStr = currentStr;
          }
        })
        .catch(() => {});
    };

    fetchUpdate();
    const interval = setInterval(fetchUpdate, 300);
    return () => clearInterval(interval);
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
       />
       
       <div className="fixed bottom-4 right-6 text-[10px] font-black text-white/10 uppercase tracking-widest pointer-events-none z-50">
          Halos Live View • Same-Network Sync
       </div>
    </div>
  );
};

export default LiveViewer;
