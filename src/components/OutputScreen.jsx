import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
      if (!container) return;
      const targetSize = Math.max(12, Math.round(container.clientHeight * 0.085));
      setFontSize(targetSize);
    };
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    fit();
    return () => ro.disconnect();
  }, [lines, isHighImpact]);
  return (
    <div ref={containerRef} className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-300 ${paddingClass} ${opacityClass}`}>
      <div ref={textRef} className="font-black text-white text-center leading-[1.3] drop-shadow-[0_4px_48px_rgba(0,0,0,1)] antialiased w-full text-balance whitespace-pre-wrap" style={{ fontSize: fontSize + 'px', wordBreak: 'break-word' }}>
        {lines.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );
}

// Liturgy-aware scaler — white for speaker, amber/yellow for response
function AutoFitLiturgy({ lines, liturgyType = 'speaker', alignment = 'center', isMaster = false, isLiveBroadcast = false, isClearText = false }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(20);
  const isHighImpact = isMaster || isLiveBroadcast;
  const paddingClass = isHighImpact ? "px-[10%] py-[10%]" : "p-4";
  const opacityClass = isClearText ? "opacity-0" : "opacity-100";
  const isResponse = liturgyType === 'response';
  const isCandidate = liturgyType === 'candidate';
  
  const textAlign = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';
  const flexAlign = alignment === 'left' ? 'items-start' : alignment === 'right' ? 'items-end' : 'items-center';

  useEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      if (!container) return;
      const targetSize = Math.max(12, Math.round(container.clientHeight * 0.085));
      setFontSize(targetSize);
    };
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    fit();
    return () => ro.disconnect();
  }, [lines, isHighImpact]);

  return (
    <div ref={containerRef} className={`absolute inset-0 flex flex-col ${flexAlign} justify-center overflow-hidden transition-opacity duration-300 ${paddingClass} ${opacityClass}`}>
      <div
        ref={textRef}
        className={`font-black ${textAlign} leading-[1.3] drop-shadow-[0_4px_48px_rgba(0,0,0,1)] antialiased w-full text-balance whitespace-pre-wrap transition-colors duration-300`}
        style={{
          fontSize: fontSize + 'px',
          wordBreak: 'break-word',
          color: isCandidate ? '#4ade80' : isResponse ? '#fcd34d' : '#ffffff',
          textShadow: isCandidate
            ? '0 0 60px rgba(74,222,128,0.4), 0 4px 48px rgba(0,0,0,1)'
            : isResponse
            ? '0 0 60px rgba(251,191,36,0.4), 0 4px 48px rgba(0,0,0,1)'
            : '0 4px 48px rgba(0,0,0,1)',
        }}
      >
        {lines.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );
}

// muteAudio: force-silence this instance (used by dashboard preview monitor).
// isMaster: this instance drives playback & reports status.
export default function OutputScreen({ payload, isMaster = false, isLiveBroadcast = false, muteAudio = false, onStatusUpdate = null, remoteCommand = null }) {
    const videoRef = useRef(null);
    const stickyAudioRef = useRef(null);
    const iframeRef = useRef(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Network Viewers (payload.isNetworkViewer) MUST be kept muted permanently to ensure continuous mobile silent autoplay.
    const isMuted = muteAudio || !isMaster;

    const hasInteractedRef = useRef(false);
    useEffect(() => { hasInteractedRef.current = hasInteracted; }, [hasInteracted]);

    // Tracking for Master & Followers
    const followerTimeRef = useRef(0);
    const followerDurationRef = useRef(0);
    const followerPausedRef = useRef(payload?.isPaused ?? true);
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
          urlObj.searchParams.set('autopause', '0');
       }
       urlObj.searchParams.set('controls', '0');
       urlObj.searchParams.set('rel', '0');
       urlObj.searchParams.set('modestbranding', '1');
       urlObj.searchParams.set('iv_load_policy', '3');
       urlObj.searchParams.set('origin', window.location.origin);

       // For master (projector/preview): respect the item's autoPlay setting.
       // For followers (network view): autoplay only if the master is actively playing.
       if (!isMaster) {
          urlObj.searchParams.set('autoplay', payload?.isPaused ? '0' : '1');
       } else {
          urlObj.searchParams.set('autoplay', payload.itemAutoPlay ? '1' : '0');
       }

       // YouTube & Vimeo must start muted (browser autoplay policy).
       // We unmute via API after the first user interaction / play command.
       if (payload.isYouTube) urlObj.searchParams.set('mute', '1');
       if (payload.isVimeo) urlObj.searchParams.set('muted', '1');

       return urlObj.toString();
    }, [payload?.activeMediaUrl, isMaster, payload?.isYouTube, payload?.isVimeo, payload?.itemAutoPlay]);

    // Sticky Audio Playback Logic
    useEffect(() => {
       if (stickyAudioRef.current && payload?.stickyAudioUrl) {
          const a = stickyAudioRef.current;
          if (isMaster && !muteAudio) {
             a.muted = false;
             a.volume = 1;
          } else {
             a.muted = true;
          }
          a.play().catch(() => {});
       } else if (stickyAudioRef.current) {
          stickyAudioRef.current.pause();
       }
    }, [payload?.stickyAudioUrl, isMaster, muteAudio]);

    // 2. Command Helpers
    const sendIframeCommand = (cmd, args = []) => {
       if (!iframeRef.current) return;
       iframeRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: cmd, args }), '*');
    };

    const sendVimeoCommand = (method, value = "") => {
       if (!iframeRef.current?.contentWindow) return;
       iframeRef.current.contentWindow.postMessage(JSON.stringify({ method, value }), '*');
    };

    // forceUnmute: removes the forced-mute that browsers apply at startup.
    // Called when the user (or a remote play command) triggers playback.
    const forceUnmute = () => {
       setHasInteracted(true);
       if (muteAudio || !isMaster) return; // Only master can unmute
       
       if (payload?.isYouTube) {
          sendIframeCommand('mute');
          setTimeout(() => {
             sendIframeCommand('unMute');
             sendIframeCommand('setVolume', [100]);
          }, 100);
       } else if (payload?.isVimeo) {
          sendVimeoCommand('setMuted', false);
          sendVimeoCommand('setVolume', 1);
          setTimeout(() => {
             sendVimeoCommand('setMuted', false);
             sendVimeoCommand('setVolume', 1);
             if (followerTimeRef.current <= 0) sendVimeoCommand('setCurrentTime', 0.1);
             else if (!payload?.isPaused) sendVimeoCommand('play');
          }, 500);
       } else if (videoRef.current) {
          // Local video/audio: unmute programmatically
          videoRef.current.muted = false;
          videoRef.current.volume = 1;
          if (!payload?.isPaused) {
              videoRef.current.play().catch(() => {});
          }
       }

       if (stickyAudioRef.current && payload?.stickyAudioUrl) {
          stickyAudioRef.current.muted = false;
          stickyAudioRef.current.volume = 1;
          stickyAudioRef.current.play().catch(() => {});
       }
    };

    useEffect(() => { if (hasInteracted && isMaster) forceUnmute(); }, [hasInteracted]);

    // 3. YouTube & Vimeo Status Polling (Master only)
    const statusHandlerRef = useRef(onStatusUpdate);
    useEffect(() => { statusHandlerRef.current = onStatusUpdate; }, [onStatusUpdate]);

    useEffect(() => {
       if (!payload?.activeMediaUrl) return;
       if (!payload.isYouTube && !payload.isVimeo) return;

       let isYouTubeListening = false;
       let lastStatusTs = 0;
       let lastPaused = null;

       const handleMessage = (event) => {
          try {
             if (payload.isYouTube) {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const info = data.info || data.data;
                if ((data.event === 'infoDelivery' || data.event === 'initialDelivery' || data.event === 'onStateChange') && info) {
                   if (!isYouTubeListening && (data.event === 'initialDelivery' || data.event === 'infoDelivery') && hasInteractedRef.current && isMaster && !muteAudio) {
                      sendIframeCommand('unMute');
                      sendIframeCommand('setVolume', [100]);
                   }
                   isYouTubeListening = true;

                   const time = info.currentTime ?? followerTimeRef.current;
                   const duration = info.duration ?? followerDurationRef.current;
                   const paused = info.playerState !== undefined ? (info.playerState !== 1 && info.playerState !== 3) : followerPausedRef.current;
                   followerPausedRef.current = paused;
                   if (duration > 0) {
                      const now = Date.now();
                      if (now - lastStatusTs > 500 || paused !== lastPaused) {
                          lastStatusTs = now;
                          lastPaused = paused;
                          statusHandlerRef.current?.({ time, duration, paused, ts: now });
                      }
                      followerTimeRef.current = time;
                      followerDurationRef.current = duration;
                   }
                }
             }

             if (payload.isVimeo) {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const eventName = data.event || data.method;

                if (eventName === 'ready') {
                   isVimeoReady.current = true;
                   sendVimeoCommand('addEventListener', 'play');
                   sendVimeoCommand('addEventListener', 'pause');
                   sendVimeoCommand('addEventListener', 'finish');
                   sendVimeoCommand('addEventListener', 'timeupdate');
                   
                   if (hasInteractedRef.current && isMaster && !muteAudio) {
                      sendVimeoCommand('setMuted', false);
                      sendVimeoCommand('setVolume', 1);
                   }
                   
                   if (!followerPausedRef.current) sendVimeoCommand('play');
                }
                if (eventName === 'timeupdate' && data.data) {
                   const time = data.data.seconds;
                   const duration = data.data.duration;
                   
                   const now = Date.now();
                   if (now - lastStatusTs > 500) {
                      lastStatusTs = now;
                      statusHandlerRef.current?.({ time, duration, paused: followerPausedRef.current, ts: now });
                   }
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
                   statusHandlerRef.current?.({ time: data.value, ts: Date.now() });
                   followerTimeRef.current = data.value;
                } else if (data.method === 'getDuration') {
                   statusHandlerRef.current?.({ duration: data.value, ts: Date.now() });
                   followerDurationRef.current = data.value;
                }
             }
          } catch (e) {}
       };

       window.addEventListener('message', handleMessage);

       const poll = setInterval(() => {
          if (!iframeRef.current?.contentWindow) return;
          if (payload.isVimeo) {
             sendVimeoCommand('getCurrentTime');
             sendVimeoCommand('getDuration');
             if (!isVimeoReady.current) {
               sendVimeoCommand('addEventListener', 'play');
               sendVimeoCommand('addEventListener', 'pause');
               sendVimeoCommand('addEventListener', 'finish');
               sendVimeoCommand('addEventListener', 'timeupdate');
             }
          }
       }, 500);

       return () => {
          window.removeEventListener('message', handleMessage);
          clearInterval(poll);
       };
    }, [isMaster, payload?.activeMediaUrl, payload?.isYouTube, payload?.isVimeo]);

    // 4. Remote Command Relay (play/pause/seek/volume from dashboard controls)
    useEffect(() => {
       if (!remoteCommand) return;
       const { command, value } = remoteCommand;

       // Any play command triggers forceUnmute so YouTube/Vimeo/local audio is restored.
       if (isMaster && command === 'play') {
           forceUnmute();
       }
       if (isMaster && command === 'pause') {
           followerPausedRef.current = true;
           statusHandlerRef.current?.({ paused: true, ts: Date.now() });
       }

       if (payload?.isYouTube) {
          if (command === 'play') sendIframeCommand('playVideo');
          if (command === 'pause') sendIframeCommand('pauseVideo');
          if (command === 'seek') {
             sendIframeCommand('seekTo', [value, true]);
             if (followerPausedRef.current) setTimeout(() => sendIframeCommand('pauseVideo'), 300);
          }
          if (command === 'volume') {
             if (!isMaster) return; // Never unmute followers
             sendIframeCommand('unMute');
             sendIframeCommand('setVolume', [value * 100]);
          }
       } else if (payload?.isVimeo) {
          if (command === 'play') sendVimeoCommand('play');
          if (command === 'pause') sendVimeoCommand('pause');
          if (command === 'seek') {
             sendVimeoCommand('setCurrentTime', value);
             if (followerPausedRef.current) setTimeout(() => sendVimeoCommand('pause'), 300);
          }
          if (command === 'volume') {
             if (!isMaster) return; // Never unmute followers
             sendVimeoCommand('setMuted', value === 0);
             sendVimeoCommand('setVolume', value);
          }
       }

       if (videoRef.current) {
          const v = videoRef.current;
          if (command === 'play') { 
              v.play().catch(() => {}); 
          }
          if (command === 'pause') v.pause();
          if (command === 'seek') v.currentTime = value;
          if (command === 'volume') { if (isMaster) { v.volume = value; v.muted = (value === 0); } }
          if (command === 'loop') v.loop = value;
       }
       setTimeout(() => { isMutingReports.current = false; }, 300);
    }, [remoteCommand, isMaster, payload?.isYouTube, payload?.isVimeo]);

    // 5. Follower Passive Sync (network/projector followers)
    useEffect(() => {
       if (isMaster || !payload) return;
       const { currentTime, isPaused, currentTimeTs } = payload;
       let targetTime = currentTime;
       if (!isPaused) {
           targetTime += ((Date.now() - (currentTimeTs || Date.now())) / 1000);
       }

       if (payload.isYouTube || payload.isVimeo) {
          const diff = Math.abs(followerTimeRef.current - targetTime);
          if (diff > 2.0) {
             if (payload.isYouTube) sendIframeCommand('seekTo', [targetTime, true]);
             else sendVimeoCommand('setCurrentTime', targetTime);
             followerTimeRef.current = targetTime;
          }
          if (isPaused && !followerPausedRef.current) {
             if (payload.isYouTube) sendIframeCommand('pauseVideo');
             else sendVimeoCommand('pause');
             followerPausedRef.current = true;
          } else if (!isPaused && followerPausedRef.current) {
             if (payload.isYouTube) sendIframeCommand('playVideo');
             else sendVimeoCommand('play');
             followerPausedRef.current = false;
          }
       }
       if (videoRef.current) {
          const v = videoRef.current;
          const rawDiff = v.currentTime - targetTime;
          
          if (Math.abs(rawDiff) > 0.5) {
             if (v.readyState >= 1) {
                try { v.currentTime = targetTime; } catch(e){}
             }
             v.playbackRate = 1;
          } else if (!isPaused) {
             if (rawDiff > 0.05) v.playbackRate = 0.95;
             else if (rawDiff < -0.05) v.playbackRate = 1.05;
             else v.playbackRate = 1;
          }

          if (isPaused && !v.paused) {
             v.pause();
             v.playbackRate = 1;
          } else if (!isPaused && v.paused) {
             v.play().catch(() => {});
          }
       }
    }, [payload?.currentTime, payload?.isPaused, isMaster]);

    const isFollowerWindow = !isMaster;
    const isNetworkViewer = new URLSearchParams(window.location.search).get('network') === 'true';
    const forceStandby = (isFollowerWindow && !payload?.isLive) || (isNetworkViewer && payload?.mediaType === 'audio');
    const hasMedia = payload?.activeMediaUrl || (payload?.activeSlide && payload?.activeSlide.length > 0);
    const isStandby = !payload || forceStandby || (!hasMedia && !payload?.isBlackScreen && !payload?.isShowLogo);

    const renderContent = () => {
        if (isStandby) {
           return (
             <div className="flex flex-col items-center justify-center text-center w-full h-full bg-gradient-to-b from-neutral-950 to-black @container relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0,transparent_40%)] animate-[spin_60s_linear_infinite]"></div>
                
                {/* Connection Status Badge */}
                <div className="absolute top-[4cqh] right-[4cqw] flex items-center gap-[1cqw] bg-white/5 border border-white/10 px-[2cqw] py-[1cqh] rounded-full backdrop-blur-md z-20">
                   <div className="w-[1cqw] h-[1cqw] max-w-2 max-h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-white/70 text-[min(1.5cqw,2cqh)] font-bold tracking-widest uppercase truncate max-w-[40cqw]">Connected to {payload?.churchName || "Server"}</span>
                </div>

                {/* HALOS Logo/Watermark */}
                <div className="absolute bottom-[4cqh] flex flex-col items-center opacity-30 z-20">
                   <span className="text-[min(2cqw,3cqh)] font-black tracking-[0.4em] text-white uppercase drop-shadow-lg">HALOS</span>
                   <span className="text-[min(1cqw,1.5cqh)] font-bold tracking-widest text-white/70 uppercase mt-1">Presentation System</span>
                </div>

                <div className="relative z-10 flex flex-col items-center w-[85%]">
                    <h1 className="text-[min(10cqw,15cqh)] font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 uppercase drop-shadow-2xl leading-[1.1] text-balance">
                       {payload?.churchName || "STANDBY"}
                    </h1>
                    {payload?.churchName && (
                        <div className="flex flex-col items-center mt-[4cqh]">
                            <div className="h-[2px] w-[12cqw] bg-blue-500/40 rounded-full mb-[3cqh]"></div>
                            <span className="text-white/50 text-[min(2cqw,3cqh)] font-bold tracking-[0.3em] uppercase">Ready for broadcast</span>
                        </div>
                    )}
                </div>
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

        // Show the "Restore Audio" overlay ONLY when:
        // - This is a master instance (projector popup or dashboard preview)
        // - The video is YouTube or Vimeo
        // - The user hasn't interacted yet
        const needsAudioRestore = isMaster
            && !muteAudio
            && !hasInteracted
            && (payload.mediaType === 'video' && (payload.isYouTube || payload.isVimeo));

        return (
           <>
              {(payload.mediaType === 'image' || payload.mediaType === 'slide_deck') && payload.activeMediaUrl && (
                 <img src={payload.activeMediaUrl} className="w-full h-full object-cover pointer-events-none" />
              )}
              {payload.mediaType === 'video' && payload.activeMediaUrl && (
                 (payload.isYouTube || payload.isVimeo) ? (
                    <div className={`w-full h-full relative ${(isMaster && hasInteracted) || !isMaster ? 'pointer-events-none' : ''}`}>
                      <iframe
                        ref={iframeRef}
                        id={payload.isVimeo ? "halos-vimeo" : undefined}
                        src={iframeSrc}
                        onLoad={(e) => {
                           if (payload.isYouTube) {
                              e.target.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
                           }
                        }}
                        className="w-full h-full scale-[1.01] origin-center"
                        style={{ clipPath: 'inset(1% 1% 1% 1%)' }}
                        frameBorder="0"
                        allow="autoplay; fullscreen; encrypted-media"
                      />
                    </div>
                 ) : (
                    <video
                      ref={videoRef}
                      key={payload.activeMediaUrl}
                      src={payload.activeMediaUrl}
                      autoPlay={isMaster ? payload.itemAutoPlay : true}
                      defaultMuted={isMuted}
                      loop={payload.itemLoop ?? true}
                      className={`w-full h-full object-cover ${(isMaster && hasInteracted) || !isMaster ? 'pointer-events-none' : ''}`}
                      onLoadedMetadata={(e) => {
                         if (isMaster) {
                            // Ensure local video has audio (browser may have blocked it)
                            if (!muteAudio) { e.target.muted = false; e.target.volume = 1; }
                            statusHandlerRef.current?.({
                               duration: e.target.duration,
                               time: e.target.currentTime,
                               paused: e.target.paused,
                               ts: Date.now()
                            });
                         } else if (payload) {
                            // Follower mid-playback synchronization initialization
                            const target = payload.currentTime + (payload.isPaused ? 0 : ((Date.now() - (payload.currentTimeTs || Date.now())) / 1000));
                            e.target.currentTime = target;
                            if (!payload.isPaused) e.target.play().catch(() => {});
                         }
                      }}
                      onTimeUpdate={(e) => {
                         if (isMaster) {
                            const now = Date.now();
                            if (!videoRef.current._lastReport || now - videoRef.current._lastReport > 250) {
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
              {payload.mediaType === 'audio' && payload.activeMediaUrl && !new URLSearchParams(window.location.search).get('projector') && !new URLSearchParams(window.location.search).get('network') && (
                  <audio
                    ref={videoRef}
                    key={payload.activeMediaUrl}
                    src={payload.activeMediaUrl}
                    autoPlay={isMaster ? payload.itemAutoPlay : true}
                    defaultMuted={isMuted}
                    loop={payload.itemLoop ?? false}
                    className="hidden"
                    onLoadedMetadata={(e) => {
                       if (isMaster) {
                          if (!muteAudio) { e.target.muted = false; e.target.volume = 1; }
                          statusHandlerRef.current?.({
                             duration: e.target.duration,
                             time: e.target.currentTime,
                             paused: e.target.paused,
                             ts: Date.now()
                          });
                       } else if (payload) {
                          const target = payload.currentTime + (payload.isPaused ? 0 : ((Date.now() - (payload.currentTimeTs || Date.now())) / 1000));
                          e.target.currentTime = target;
                          if (!payload.isPaused) e.target.play().catch(() => {});
                       }
                    }}
                    onTimeUpdate={(e) => {
                       if (isMaster) {
                          const now = Date.now();
                          if (!videoRef.current._lastReport || now - videoRef.current._lastReport > 250) {
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
              )}

              {/* Persistent Audio Layer */}
              {payload.stickyAudioUrl && (
                  <audio 
                    ref={stickyAudioRef}
                    src={payload.stickyAudioUrl} 
                    autoPlay={true} 
                    muted={isMuted || muteAudio} 
                    onEnded={() => {
                        if (isMaster) {
                           const bc = new BroadcastChannel('halos-projector-hub');
                           bc.postMessage({ type: 'sticky-audio-ended' });
                           bc.close();
                        }
                    }}
                    className="hidden" 
                  />
              )}

              {(payload.mediaType === 'song' || payload.mediaType === 'bible') && payload.activeSlide && payload.activeSlide.length > 0 && (
                 <AutoFitLyrics lines={payload.activeSlide} isMaster={isMaster} isLiveBroadcast={isLiveBroadcast} isClearText={payload.isClearText} />
              )}
              {payload.mediaType === 'liturgy' && payload.activeSlide && payload.activeSlide.length > 0 && (
                 <AutoFitLiturgy
                   lines={payload.activeSlide}
                   liturgyType={payload.liturgyType || 'speaker'}
                   alignment={payload.liturgyAlignment || 'center'}
                   isMaster={isMaster}
                   isLiveBroadcast={isLiveBroadcast}
                   isClearText={payload.isClearText}
                 />
              )}

              {needsAudioRestore && (
                 <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-12 cursor-pointer" onClick={() => forceUnmute()}>
                    <div className="bg-blue-600 p-8 rounded-full mb-6 animate-bounce shadow-2xl">
                       <Volume2 size={64} fill="currentColor" />
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-widest text-center">Restore Audio</h2>
                    <p className="mt-4 text-white/80 font-bold uppercase tracking-widest text-sm text-center">Click to enable audio on this projector</p>
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
