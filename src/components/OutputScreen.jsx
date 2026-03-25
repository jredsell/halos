import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Volume2, HelpCircle, Smartphone, Monitor, X, ChevronRight } from 'lucide-react';
import { getYoutubeEmbedUrl } from '../utils/media';

// High-Impact Smart Scaler
function AutoFitLyrics({ lines, isMaster = false, isLiveBroadcast = false, isClearText = false }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(20);
  const isHighImpact = isMaster || isLiveBroadcast;
  const paddingClass = isHighImpact ? "px-[10%] py-[10%]" : "p-4";
  const opacityClass = isClearText ? "opacity-0" : "opacity-100";
  useEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      const maxW = container.clientWidth * (isHighImpact ? 0.8 : 0.95);
      const maxH = container.clientHeight * (isHighImpact ? 0.8 : 0.9);
      let lo = 8, hi = Math.max(8, container.clientHeight), best = 8;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        text.style.fontSize = mid + 'px';
        if (text.scrollWidth <= maxW && text.scrollHeight <= maxH) { best = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      setFontSize(best);
    };
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    fit();
    return () => ro.disconnect();
  }, [lines, isHighImpact]);
  return (
    <div ref={containerRef} className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-300 ${paddingClass} ${opacityClass}`}>
      <div ref={textRef} className="font-black text-white text-center leading-[1.2] drop-shadow-[0_4px_48px_rgba(0,0,0,1)] antialiased w-max" style={{ fontSize: fontSize + 'px' }}>
        {lines.map((line, i) => <div key={i} className="whitespace-nowrap">{line}</div>)}
      </div>
    </div>
  );
}

export default function OutputScreen({ payload, isMaster = false, isLiveBroadcast = false, onStatusUpdate = null, remoteCommand = null }) {
    const videoRef = useRef(null);
    const iframeRef = useRef(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const isMuted = !isMaster;

    // Tracking for Master & Followers
    const followerTimeRef = useRef(0);
    const followerDurationRef = useRef(0);
    const followerPausedRef = useRef(true);
    const lastUrlRef = useRef("");
    const lastSentPauseRef = useRef(null);
    const isMutingReports = useRef(false);

    // 1. URL/Mute Engine
    const iframeSrc = useMemo(() => {
       if (!payload?.activeMediaUrl) return '';
       let url = payload.activeMediaUrl;
       if (payload.isYouTube) url = getYoutubeEmbedUrl(url);
       const urlObj = new URL(url);
       urlObj.searchParams.set('enablejsapi', '1');
       urlObj.searchParams.set('controls', '0');
       urlObj.searchParams.set('rel', '0');
       urlObj.searchParams.set('modestbranding', '1');
       urlObj.searchParams.set('iv_load_policy', '3');
       urlObj.searchParams.set('origin', window.location.origin);
       if (!isMaster) urlObj.searchParams.set('autoplay', '1');
       else urlObj.searchParams.set('autoplay', payload.itemAutoPlay ? '1' : '0');
       urlObj.searchParams.set('mute', isMaster ? '0' : '1');
       return urlObj.toString();
    }, [payload?.activeMediaUrl, isMaster, payload?.isYouTube, payload?.itemAutoPlay]);

    // 2. Command Handler
    const sendIframeCommand = (cmd, args = []) => {
       if (!iframeRef.current) return;
       const msg = JSON.stringify({ event: 'command', func: cmd, args: args });
       iframeRef.current.contentWindow?.postMessage(msg, '*');
    };

    const sendVimeoCommand = (method, value) => {
       if (!iframeRef.current) return;
       const msg = JSON.stringify({ method, value });
       iframeRef.current.contentWindow?.postMessage(msg, '*');
    };

    const forceUnmute = () => {
       setHasInteracted(true);
       if (isMaster) {
          if (payload?.isYouTube) {
             sendIframeCommand('mute');
             setTimeout(() => {
                sendIframeCommand('unMute');
                sendIframeCommand('setVolume', [100]);
             }, 100);
          } else if (payload?.isVimeo) {
             sendVimeoCommand('setVolume', 0);
             setTimeout(() => sendVimeoCommand('setVolume', 1), 100);
          }
       }
       if (videoRef.current && isMaster) {
          videoRef.current.muted = true;
          setTimeout(() => { videoRef.current.muted = false; videoRef.current.volume = 1; }, 100);
       }
    };

    useEffect(() => { if (hasInteracted && isMaster) forceUnmute(); }, [hasInteracted]);

    // 3. Robust YouTube/Vimeo/Local Master Sync Engine
    const statusHandlerRef = useRef(onStatusUpdate);
    useEffect(() => { statusHandlerRef.current = onStatusUpdate; }, [onStatusUpdate]);

    useEffect(() => {
       if (!isMaster || !payload?.activeMediaUrl) return;
       if (!payload.isYouTube && !payload.isVimeo) return;

       const handleMessage = (event) => {
          try {
             // 1. YouTube Protocol
             if (payload.isYouTube) {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const info = data.info || data.data;
                if ((data.event === 'infoDelivery' || data.event === 'initialDelivery' || data.event === 'onStateChange') && info) {
                   const time = info.currentTime ?? followerTimeRef.current;
                   const duration = info.duration ?? followerDurationRef.current;
                   const paused = info.playerState !== undefined ? (info.playerState !== 1 && info.playerState !== 3) : followerPausedRef.current;
                   
                   if (duration > 0) {
                      statusHandlerRef.current?.({ time, duration, paused, ts: Date.now() });
                      followerTimeRef.current = time;
                      followerDurationRef.current = duration;
                      followerPausedRef.current = paused;
                   }
                }
             }

             // 2. Vimeo Protocol
             if (payload.isVimeo) {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (data.event === 'timeupdate' && data.data) {
                   statusHandlerRef.current?.({ time: data.data.seconds, duration: data.data.duration, paused: false, ts: Date.now() });
                }
             }
          } catch (e) {}
       };

       window.addEventListener('message', handleMessage);

       const poll = setInterval(() => {
          if (!iframeRef.current?.contentWindow) return;
          const win = iframeRef.current.contentWindow;
          
          if (payload.isYouTube) {
             win.postMessage(JSON.stringify({ event: "listening" }), "*");
             win.postMessage(JSON.stringify({ event: "command", func: "getDuration" }), "*");
             win.postMessage(JSON.stringify({ event: "command", func: "getCurrentTime" }), "*");
          } else if (payload.isVimeo) {
             sendVimeoCommand('getCurrentTime');
             sendVimeoCommand('getDuration');
          }
       }, 500); // 500ms for smoother master tracking

       return () => {
          window.removeEventListener('message', handleMessage);
          clearInterval(poll);
       };
    }, [isMaster, payload?.activeMediaUrl, payload?.isYouTube, payload?.isVimeo]);

    // 3. Remote Command Relay
    useEffect(() => {
       if (!remoteCommand) return;
       const { command, value } = remoteCommand;
       
       // AUTO-UNMUTE: If we get a play command on the dashboard, clear the interaction overlay
       if (isMaster && command === 'play') forceUnmute();

       if (payload?.isYouTube) {
          if (command === 'play') sendIframeCommand('playVideo');
          if (command === 'pause') sendIframeCommand('pauseVideo');
          if (command === 'seek') sendIframeCommand('seekTo', [value, true]);
          if (command === 'volume') sendIframeCommand('setVolume', [value * 100]);
       } else if (payload?.isVimeo) {
          if (command === 'play') sendVimeoCommand('play');
          if (command === 'pause') sendVimeoCommand('pause');
          if (command === 'seek') sendVimeoCommand('setCurrentTime', value);
       }

       if (videoRef.current) {
          const v = videoRef.current;
          if (command === 'play') v.play().catch(() => {});
          if (command === 'pause') v.pause();
          if (command === 'seek') v.currentTime = value;
       }
       setTimeout(() => { isMutingReports.current = false; }, 300);
    }, [remoteCommand, isMaster, payload?.isYouTube, payload?.isVimeo]);

    // 5. Follower Passive Sync
    useEffect(() => {
       if (isMaster || !payload) return;
       const { currentTime, isPaused, currentTimeTs } = payload;
       let targetTime = currentTime + ((Date.now() - (currentTimeTs || Date.now())) / 1000);

       if (payload.isYouTube || payload.isVimeo) {
          const diff = Math.abs(followerTimeRef.current - targetTime);
          if (diff > 2.0) {
             if (payload.isYouTube) sendIframeCommand('seekTo', [targetTime, true]);
             else sendVimeoCommand('setCurrentTime', targetTime);
             followerTimeRef.current = targetTime;
          }
          if (isPaused !== lastSentPauseRef.current) {
             lastSentPauseRef.current = isPaused;
             if (payload.isYouTube) sendIframeCommand(isPaused ? 'pauseVideo' : 'playVideo');
             else sendVimeoCommand(isPaused ? 'pause' : 'play');
          }
       }
       if (videoRef.current) {
          const diff = Math.abs(videoRef.current.currentTime - targetTime);
          if (diff > 0.5) videoRef.current.currentTime = targetTime;
          if (isPaused !== lastSentPauseRef.current) {
             lastSentPauseRef.current = isPaused;
             if (isPaused) videoRef.current.pause(); else videoRef.current.play().catch(() => {});
          }
       }
    }, [payload?.currentTime, payload?.isPaused, isMaster]);

    const isNetworkViewer = payload?.isNetworkViewer;
    const isDashboardPreview = !isMaster && !isNetworkViewer;
    const shouldShowLiveContent = payload?.isLive || isDashboardPreview || payload?.isBlackScreen || payload?.isShowLogo;

    if (!payload || !shouldShowLiveContent) {
       return (
         <div className="w-full h-full bg-black flex flex-col items-center justify-center p-12 text-center select-none">
            <h1 className="text-[12cqw] font-black tracking-[0.2em] text-white uppercase relative z-10">Halos</h1>
         </div>
       );
    }

    return (
      <div className="w-full h-full bg-black overflow-hidden relative font-sans" onClick={() => setHasInteracted(true)}>
         {!payload?.isBlackScreen && !payload?.isShowLogo && (
            (payload?.activeSlide?.length > 0 || payload?.activeMediaUrl) ? (
               <>
                  {(payload.mediaType === 'image' || payload.mediaType === 'slide_deck') && payload.activeMediaUrl && (
                     <img src={payload.activeMediaUrl} className="w-full h-full object-cover pointer-events-none" />
                  )}
                  {payload.mediaType === 'video' && payload.activeMediaUrl && (
                     (payload.isYouTube || payload.isVimeo) ? (
                        <div className={`w-full h-full relative transition-all duration-500 ${(isMaster && hasInteracted) || !isMaster ? 'pointer-events-none' : ''}`}>
                          <iframe 
                            ref={iframeRef} 
                            src={iframeSrc}
                            className="w-full h-full scale-[1.01] origin-center" 
                            style={{ clipPath: 'inset(1% 1% 1% 1%)' }}
                            frameBorder="0" 
                            allow="autoplay; fullscreen; encrypted-media"
                          />
                        </div>
                     ) : (
                        <video 
                          ref={videoRef} 
                          src={payload.activeMediaUrl} 
                          autoPlay={payload.itemAutoPlay} 
                          muted={isMuted} 
                          loop 
                          className={`w-full h-full object-cover transition-all duration-500 ${(isMaster && hasInteracted) || !isMaster ? 'pointer-events-none' : ''}`}
                          onLoadedMetadata={(e) => {
                             if (isMaster) {
                                statusHandlerRef.current?.({ 
                                   duration: e.target.duration, 
                                   time: e.target.currentTime, 
                                   paused: e.target.paused, 
                                   ts: Date.now() 
                                });
                             }
                          }}
                          onTimeUpdate={(e) => {
                             if (isMaster) {
                                // Throttle reporting to avoid React state flood on dashboard
                                const now = Date.now();
                                if (!videoRef.current._lastReport || now - videoRef.current._lastReport > 500) {
                                   videoRef.current._lastReport = now;
                                   statusHandlerRef.current?.({ 
                                      time: e.target.currentTime, 
                                      duration: e.target.duration, 
                                      paused: e.target.paused, 
                                      ts: now 
                                   });
                                }
                             }
                          }}
                          onPlay={() => isMaster && statusHandlerRef.current?.({ paused: false, ts: Date.now() })}
                          onPause={() => isMaster && statusHandlerRef.current?.({ paused: true, ts: Date.now() })}
                        />
                     )
                  )}
                  {payload.activeSlide && payload.activeSlide.length > 0 && (
                     <AutoFitLyrics lines={payload.activeSlide} isMaster={isMaster} isLiveBroadcast={isLiveBroadcast} isClearText={payload.isClearText} />
                  )}
                  {isMaster && !hasInteracted && payload.mediaType === 'video' && (
                     <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-12 cursor-pointer">
                        <div className="bg-blue-600 p-8 rounded-full mb-6 animate-bounce shadow-2xl">
                           <Volume2 size={64} fill="currentColor" />
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-widest text-shadow">Restore Audio</h2>
                        <p className="mt-4 text-white/80 font-bold uppercase tracking-widest text-sm text-center">Dashboard requires one interaction to enable core app sound</p>
                     </div>
                  )}
               </>
            ) : (
               <div className="flex flex-col items-center justify-center text-center w-full h-full bg-black">
                  <h1 className="text-[12cqw] font-black tracking-[0.2em] text-white uppercase relative z-10">Halos</h1>
               </div>
            )
         )}
         {payload?.isBlackScreen && <div className="absolute inset-0 bg-black z-40" />}
         {payload?.isShowLogo && payload?.logoUrl && !payload?.isBlackScreen && (
            <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
               <img src={payload.logoUrl} className="w-full h-full object-contain animate-in zoom-in-95" />
            </div>
         )}

         {/* Network Guide Trigger */}
         {isLiveBroadcast && !showGuide && (
            <button 
                onClick={(e) => { e.stopPropagation(); setShowGuide(true); }}
                className="absolute bottom-6 right-6 z-[60] p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-110 active:scale-95 group"
                title="How to save this app"
            >
                <HelpCircle size={24} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">How to save Halos</span>
            </button>
         )}

         {/* Network Guide Overlay */}
         {isLiveBroadcast && showGuide && (
            <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <button 
                        onClick={() => setShowGuide(false)}
                        className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                            <Smartphone size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Install Halos App</h2>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Follower Guide</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-4 items-start group">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">1</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-neutral-200 mb-1">Open Browser Menu</div>
                                <div className="text-[11px] text-neutral-400 leading-relaxed">
                                    On <span className="text-white">iPhone</span>, tap the <strong>Share</strong> button. On <span className="text-white">Android</span>, tap the <strong>three dots (⋮)</strong>.
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start group">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">2</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-neutral-200 mb-1">Select "Install App"</div>
                                <div className="text-[11px] text-neutral-400 leading-relaxed">
                                    Look for <span className="text-white">"Add to Home Screen"</span> or <span className="text-white">"Install App"</span> in the menu options.
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start group">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">3</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-neutral-200 mb-1">Run Like a Pro</div>
                                <div className="text-[11px] text-neutral-400 leading-relaxed">
                                    Halos will now appear on your home screen and run in <span className="text-white font-bold">Fullscreen Mode</span> for the best experience.
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowGuide(false)}
                        className="w-full mt-10 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                    >
                        Got it, thanks!
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Powered by Halos Professional Engine</p>
                    </div>
                </div>
            </div>
         )}
      </div>
    );
}
