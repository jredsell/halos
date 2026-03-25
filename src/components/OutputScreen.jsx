import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Volume2, HelpCircle, Monitor, ChevronRight } from 'lucide-react';
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
    const isMuted = !isMaster;

    // Tracking for Master & Followers
    const followerTimeRef = useRef(0);
    const followerDurationRef = useRef(0);
    const followerPausedRef = useRef(payload?.isPaused ?? true);
    const lastUrlRef = useRef("");
    const lastSentPauseRef = useRef(null);
    const isMutingReports = useRef(false);
    const isVimeoReady = useRef(false);

    // 1. URL/Mute Engine
    const iframeSrc = useMemo(() => {
       if (!payload?.activeMediaUrl) return '';
       let url = payload.activeMediaUrl;
       if (payload.isYouTube) url = getYoutubeEmbedUrl(url);
       const urlObj = new URL(url);
       if (payload.isYouTube) urlObj.searchParams.set('enablejsapi', '1');
       if (payload.isVimeo) {
          urlObj.searchParams.set('api', '1');
          urlObj.searchParams.set('player_id', 'halos-vimeo');
       }
       urlObj.searchParams.set('controls', '0');
       urlObj.searchParams.set('rel', '0');
       urlObj.searchParams.set('modestbranding', '1');
       urlObj.searchParams.set('iv_load_policy', '3');
       urlObj.searchParams.set('origin', window.location.origin);
       if (!isMaster) urlObj.searchParams.set('autoplay', '1');
       else urlObj.searchParams.set('autoplay', payload.itemAutoPlay ? '1' : '0');
       
       // Always start muted in the URL to ensure the browser allows the player to load and start.
       // We will unmute via API (forceUnmute) after interaction.
       if (payload.isYouTube) urlObj.searchParams.set('mute', '1');
       if (payload.isVimeo) urlObj.searchParams.set('muted', '1');
       return urlObj.toString();
    }, [payload?.activeMediaUrl, isMaster, payload?.isYouTube, payload?.itemAutoPlay]);

    // 2. Command Handler
    const sendIframeCommand = (cmd, args = []) => {
       if (!iframeRef.current) return;
       const msg = JSON.stringify({ event: 'command', func: cmd, args: args });
       iframeRef.current.contentWindow?.postMessage(msg, '*');
    };

     const sendVimeoCommand = (method, value = "") => {
        if (!iframeRef.current?.contentWindow) return;
        const msg = { method, value };
        // The modern Vimeo player accepts objects directly
        iframeRef.current.contentWindow.postMessage(msg, '*');
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
              setTimeout(() => {
                 sendVimeoCommand('setVolume', 1);
                 sendVimeoCommand('play');
                 // If stuck at 0, a tiny seek can sometimes kickstart playback
                 if (followerTimeRef.current === 0) {
                    sendVimeoCommand('setCurrentTime', 0.1);
                 }
              }, 200);
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
                 
                 // Vimeo events use 'event' field, responses use 'method' field
                 const eventName = data.event || data.method;
                 
                 if (eventName === 'ready') {
                    isVimeoReady.current = true;
                    sendVimeoCommand('addEventListener', 'play');
                    sendVimeoCommand('addEventListener', 'pause');
                    sendVimeoCommand('addEventListener', 'finish');
                    sendVimeoCommand('addEventListener', 'timeupdate');
                    // If we're already supposed to be playing, send play command now that we're ready
                    if (!followerPausedRef.current) {
                        sendVimeoCommand('play');
                    }
                 }

                 if (eventName === 'timeupdate' && data.data) {
                    const time = data.data.seconds;
                    const duration = data.data.duration;
                    // If we're getting timeupdates, we're likely playing
                    if (followerPausedRef.current && time > followerTimeRef.current) {
                        followerPausedRef.current = false;
                    }
                    statusHandlerRef.current?.({ time, duration, paused: followerPausedRef.current, ts: Date.now() });
                    followerTimeRef.current = time;
                    followerDurationRef.current = duration;
                 } else if (eventName === 'play') {
                    statusHandlerRef.current?.({ paused: false, ts: Date.now() });
                    followerPausedRef.current = false;
                 } else if (eventName === 'pause') {
                    statusHandlerRef.current?.({ paused: true, ts: Date.now() });
                    followerPausedRef.current = true;
                 } else if (eventName === 'finish') {
                    statusHandlerRef.current?.({ paused: true, time: followerDurationRef.current, ts: Date.now() });
                    followerPausedRef.current = true;
                 } else if (data.method === 'getCurrentTime') {
                    const time = data.value;
                    statusHandlerRef.current?.({ time, ts: Date.now() });
                    followerTimeRef.current = time;
                 } else if (data.method === 'getDuration') {
                    const duration = data.value;
                    statusHandlerRef.current?.({ duration, ts: Date.now() });
                    followerDurationRef.current = duration;
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
             // Ensure we are subscribed even if we missed the 'ready' event
             if (!isVimeoReady.current) {
               sendVimeoCommand('addEventListener', 'play');
               sendVimeoCommand('addEventListener', 'pause');
               sendVimeoCommand('addEventListener', 'finish');
               sendVimeoCommand('addEventListener', 'timeupdate');
             }
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
       if (isMaster && command === 'play') {
           forceUnmute();
           // Don't report status here, wait for the actual 'play' event from the player
       }
       if (isMaster && command === 'pause') {
           // We can report paused: true immediately to let the UI react
           followerPausedRef.current = true;
           statusHandlerRef.current?.({ paused: true, ts: Date.now() });
       }

       if (payload?.isYouTube) {
          if (command === 'play') sendIframeCommand('playVideo');
          if (command === 'pause') sendIframeCommand('pauseVideo');
          if (command === 'seek') sendIframeCommand('seekTo', [value, true]);
          if (command === 'volume') sendIframeCommand('setVolume', [value * 100]);
       } else if (payload?.isVimeo) {
          if (command === 'play') sendVimeoCommand('play');
          if (command === 'pause') sendVimeoCommand('pause');
          if (command === 'seek') sendVimeoCommand('setCurrentTime', value);
          if (command === 'volume') sendVimeoCommand('setVolume', value);
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

    const renderContent = () => {
        if (!payload || !shouldShowLiveContent) {
           return (
             <div className="flex flex-col items-center justify-center text-center w-full h-full bg-black">
                <h1 className="text-[12cqw] font-black tracking-[0.2em] text-white uppercase relative z-10">Halos</h1>
             </div>
           );
        }

        if (payload.isBlackScreen) return <div className="absolute inset-0 bg-black z-40" />;
        
        if (payload.isShowLogo && payload.logoUrl) {
            return (
              <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
                 <img src={payload.logoUrl} className="w-full h-full object-contain animate-in zoom-in-95" />
              </div>
            );
        }

        return (
           <>
              {(payload.mediaType === 'image' || payload.mediaType === 'slide_deck') && payload.activeMediaUrl && (
                 <img src={payload.activeMediaUrl} className="w-full h-full object-cover pointer-events-none" />
              )}
              {payload.mediaType === 'video' && payload.activeMediaUrl && (
                 (payload.isYouTube || payload.isVimeo) ? (
                    <div className={`w-full h-full relative transition-all duration-500 ${(isMaster && hasInteracted) || !isMaster ? 'pointer-events-none' : ''}`}>
                      <iframe 
                        ref={iframeRef} 
                        id={payload.isVimeo ? "halos-vimeo" : undefined}
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
        );
    };

    return (
      <div className="w-full h-full bg-black overflow-hidden relative font-sans" onClick={() => setHasInteracted(true)}>
         
         {renderContent()}

      </div>
    );
}
