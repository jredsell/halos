import { useState, useEffect, useRef } from 'react'
import { Peer } from 'peerjs'
import { ExternalLink } from 'lucide-react'
import FileSystemSetup from './components/FileSystemSetup'
import { getStoredDirectoryHandle } from './utils/fileSystem'
import Sidebar from './components/Sidebar'
import PreviewEditor from './components/PreviewEditor'
import LiveControl from './components/LiveControl'
import DragDropZone from './components/DragDropZone'
import ImageArrayViewer from './components/ImageArrayViewer'
import SongEditor from './components/SongEditor'
import LiturgyEditor from './components/LiturgyEditor'
import { useFileSystemWatcher } from './hooks/useFileSystemWatcher'
import { useSearchIndexer } from './hooks/useSearchIndexer'
import { useFolderContents } from './hooks/useFolderContents'
import { parseSongMarkdown } from './utils/songParser'
import { parseLiturgyMarkdown } from './utils/liturgyParser'
import ConfirmModal from './components/ConfirmModal'
import { verifyPermission, reResolveMedia, formatVerseRanges, getYoutubeEmbedUrl } from './utils/media'
import OutputScreen from './components/OutputScreen'

const TABS = ['Service', 'Songs', 'Bible', 'Liturgy', 'Videos', 'Images', 'Music', 'Settings'];

function App() {

  const [libraryHandle, setLibraryHandle] = useState(null)
  const projectorWindowRef = useRef(null);
  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const livePayloadRef = useRef(null);
  
  // Routing State
  const [isProjectorView, setIsProjectorView] = useState(false);
  const [isNetworkView, setIsNetworkView] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [networkPayload, setNetworkPayload] = useState(null);
  
  // App Global Data State
  const [activeTab, setActiveTab] = useState('Service');
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [serviceItems, setServiceItems] = useState([]); 
  const [playedItems, setPlayedItems] = useState(new Set());
  const [editingSong, setEditingSong] = useState(null);
  const [linesPerSlide, setLinesPerSlide] = useState(2);
  const [presentationPaused, setPresentationPaused] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(5);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);

  // Global Projection State
  const [isLive, setIsLive] = useState(false);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isShowLogo, setIsShowLogo] = useState(false);
  const [isClearText, setIsClearText] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [livePayload, setLivePayload] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState({ time: 0, duration: 0, paused: true });
  const [churchName, setChurchName] = useState("HALOS");

  // System Hooks
  const [systemTrigger, refreshLibrary] = useFileSystemWatcher(libraryHandle);
  const searchState = useSearchIndexer(libraryHandle, systemTrigger);
  const folderFiles = useFolderContents(libraryHandle, activeTab, systemTrigger);
  const musicFiles = useFolderContents(libraryHandle, 'Music', systemTrigger);

  // Handshake and Init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('projector')) setIsProjectorView(true);
    if (params.get('network')) setIsNetworkView(true);
    const roomFromUrl = params.get('room');

    const init = async () => {
      try {
        const { get, set } = await import('idb-keyval');
        
        // Handle Room ID
        let currentRoom = roomFromUrl;
        if (!isNetworkView) {
           currentRoom = await get('halos_room_id');
           if (!currentRoom) {
              currentRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
              await set('halos_room_id', currentRoom);
           }
        }
        setRoomId(currentRoom);
        
        // 1. Initial Load from DB (Fast, no permissions)
        const savedChurch = await get('halos_church_name');
        if (savedChurch) setChurchName(savedChurch);

        const savedService = await get('halos_service_items');
        if (savedService && Array.isArray(savedService)) {
           setServiceItems(savedService);
        }
        
        const blob = await get('halos_logo_blob');
        if (blob) setLogoUrl(URL.createObjectURL(blob));

        // 2. Directory Handle & Re-resolution (Permission gated)
        const handle = await getStoredDirectoryHandle()
        if (handle) {
          const hasPerm = await verifyPermission(handle)
          if (hasPerm) {
            setLibraryHandle(handle)
            if (savedService) {
              const resolved = await reResolveMedia(savedService, handle);
              setServiceItems(resolved);
            }
          }
        }
      } catch (err) {
        console.error("Halos Init Failed:", err);
      } finally {
        setIsLoaded(true);
      }
    }
    init()
  }, [])

  // Self-Healing Protocol: Orphaned Blob Resolution
  // Shouts a signal heavily tying the lifecycle of popups to this exact dashboard instance. 
  // If we refresh, popups must reboot to maintain Chrome Blob access scopes.
  useEffect(() => {
     const bc = new BroadcastChannel('halos-projector-hub');
     bc.postMessage({ type: 'master-reboot' });
     bc.close();
  }, []);

  // Global YouTube API Loader
  useEffect(() => {
    if (!window.YT) {
       const tag = document.createElement('script');
       tag.src = "https://www.youtube.com/iframe_api";
       const firstScriptTag = document.getElementsByTagName('script')[0];
       firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // WebRTC PeerJS Master Initialization
  useEffect(() => {
    if (isProjectorView || isNetworkView || !roomId) return;
    
    let peer = null;
    try {
      peer = new Peer('halos-' + roomId);
      peerRef.current = peer;
      
      peer.on('connection', (conn) => {
        connectionsRef.current.push(conn);
        
        conn.on('close', () => {
          connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
        });
        
        // Immediately sync the latest state to any newly connecting follower
        conn.on('open', () => {
           if (livePayloadRef.current) {
              conn.send({ type: 'state', payload: livePayloadRef.current });
           }
        });
      });
      
      peer.on('error', (err) => {
         console.error('PeerJS Master Error:', err);
      });
    } catch (e) {
      console.error(e);
    }
    
    return () => {
       if (peer) peer.destroy();
    };
  }, [roomId, isProjectorView, isNetworkView]);

  // Live Re-sharding: Automatically re-shard songs when the linesPerSlide setting changes
  useEffect(() => {
    if (!isLoaded) return;
    
    // Only re-shard if it's a song or liturgy and has rawText source
    const reShard = (item) => {
       if ((item?.type === 'song' || item?.type === 'liturgy') && item.rawText) {
          const parsed = item.type === 'song'
            ? parseSongMarkdown(item.rawText, linesPerSlide)
            : parseLiturgyMarkdown(item.rawText, linesPerSlide);
          return { ...item, slides: parsed.slides };
       }
       return item;
    };

    if (selectedItem) setSelectedItem(prev => reShard(prev));
    if (liveItem) setLiveItem(prev => reShard(prev));
  }, [linesPerSlide]);


  const [remoteCommand, setRemoteCommand] = useState(null);
  
  const [liveItem, setLiveItem] = useState(null);
  const [liveSlideIndex, setLiveSlideIndex] = useState(0);

  const [isSyncingMedia, setIsSyncingMedia] = useState(false);
  const [syncedMediaUrl, setSyncedMediaUrl] = useState(null);
  const lastUploadedRef = useRef(null);
  useEffect(() => {
    const syncMedia = async () => {
      let targetUrl = null;
      if (isShowLogo && logoUrl?.startsWith('blob:')) targetUrl = logoUrl;
      else if (liveItem?.url?.startsWith('blob:')) {
         if (liveItem.type !== 'audio') targetUrl = liveItem.url;
      }
      else if (liveItem?.type === 'image' || liveItem?.type === 'slide_deck') {
         const img = liveItem.images?.[liveSlideIndex];
         if (img?.url?.startsWith('blob:')) targetUrl = img.url;
      }

      if (targetUrl && targetUrl !== lastUploadedRef.current) {
        lastUploadedRef.current = targetUrl;
        setIsSyncingMedia(true);
        connectionsRef.current.forEach(conn => {
            conn.send({ type: 'sync-start', id: targetUrl });
        });

        try {
          if (liveItem?.type === 'video' || liveItem?.type === 'audio') {
             // Only block ultra-massive raw ultra-HD video buffering to prevent memory crash (e.g. over 200MB)
             // Typical 13MB 1080p clips will process completely fine!
          }

          const res = await fetch(targetUrl);
          const blob = await res.blob();
          const buffer = await blob.arrayBuffer();

          // Yield execution to the main thread briefly so the Projector's <video> element 
          // can smoothly mount and start playing locally before we block the thread to send.
          await new Promise(r => setTimeout(r, 150));

          connectionsRef.current.forEach(conn => {
              conn.send({ type: 'media', id: targetUrl, data: buffer, mime: blob.type });
          });
          
          setSyncedMediaUrl(targetUrl);
        } catch (e) {
          console.error("Sync Media Failed:", e);
        }
        
        connectionsRef.current.forEach(conn => {
            conn.send({ type: 'sync-end', id: targetUrl });
        });
        setIsSyncingMedia(false);
      }
    };
    syncMedia();
  }, [liveItem, liveSlideIndex, logoUrl, isShowLogo]);

  // Projection Engine Compiler
  useEffect(() => {
    const payload = {
       isLive,
       isBlackScreen,
       isShowLogo,
       isClearText,
       logoUrl,
       linesPerSlide,
       mediaType: null,
       activeSlide: null,
       activeMediaUrl: null,
       currentTime: playbackStatus.time,
       currentTimeTs: playbackStatus.ts || Date.now(),
       duration: playbackStatus.duration,
       isPaused: playbackStatus.paused,
       slideshowInterval: slideshowInterval,
       itemAutoPlay: liveItem?.autoPlay || false,
       churchName: churchName
    };

    // Populate content if we have a LIVE selection (Locked to Service Flow)
    if (liveItem) {
       payload.mediaType = liveItem.type;
       
       if (liveItem.type === 'song' || liveItem.type === 'bible') {
          const slides = liveItem.slides || [];
          if (slides[liveSlideIndex]) {
             payload.activeSlide = slides[liveSlideIndex].content;
          }
        } else if (liveItem.type === 'liturgy') {
           const slides = liveItem.slides || [];
           if (slides[liveSlideIndex]) {
              payload.activeSlide = slides[liveSlideIndex].content;
              payload.liturgyType = slides[liveSlideIndex].type; // 'speaker' | 'response'
              payload.liturgyAlignment = slides[liveSlideIndex].alignment; // 'left' | 'center' | 'right'
           }
        } else if (liveItem.type === 'image' || liveItem.type === 'slide_deck') {
          const imgs = liveItem.images || [];
          if (imgs[liveSlideIndex]) {
             payload.activeMediaUrl = imgs[liveSlideIndex].url;
          }
        } else if (liveItem.type === 'audio') {
           payload.activeMediaUrl = liveItem.url || '';
        } else if (liveItem.type === 'video') {
           let finalUrl = liveItem.url || '';
           const isYouTube = liveItem.isYouTube || finalUrl.includes('youtube.com') || finalUrl.includes('youtu.be');
           const isVimeo = liveItem.isVimeo || finalUrl.includes('vimeo.com');

           if (isYouTube) {
              finalUrl = getYoutubeEmbedUrl(finalUrl);
           } else if (isVimeo && !finalUrl.includes('player.vimeo.com')) {
              let videoId = finalUrl.split('vimeo.com/')[1]?.split('?')[0];
              if (videoId) finalUrl = `https://player.vimeo.com/video/${videoId}?controls=0`;
           }

           payload.activeMediaUrl = finalUrl;
           payload.isYouTube = isYouTube;
           payload.isVimeo = isVimeo;
        }
    }

    setLivePayload(payload);
    
    // Broadcast to local popup instantly
    const bc = new BroadcastChannel('halos-projector-hub');
    bc.postMessage(payload);
    bc.close();

    // Broadcast to network hub (JSON only)
    const broadcast = async () => {
      // For network broadcast, retain original BLOB URL strings to act as unique cache keys on the follower.
      const networkPayload = { ...payload };
      if (networkPayload.logoUrl?.startsWith('blob:')) {
         if (payload.logoUrl !== syncedMediaUrl) networkPayload.logoUrl = null;
      }
      if (networkPayload.activeMediaUrl?.startsWith('blob:')) {
         if (payload.activeMediaUrl !== syncedMediaUrl) networkPayload.activeMediaUrl = null;
      }
      
      networkPayload.isNetworkViewer = true; // Mark specifically for phone viewers
      livePayloadRef.current = networkPayload;

      connectionsRef.current.forEach(conn => {
         conn.send({ type: 'state', payload: networkPayload });
      });
    };

    broadcast();
  }, [isLive, isBlackScreen, isShowLogo, isClearText, logoUrl, liveItem, liveSlideIndex, linesPerSlide, playbackStatus, slideshowInterval, syncedMediaUrl, churchName]);

  useEffect(() => {
    const bc = new BroadcastChannel('halos-projector-hub');
     bc.onmessage = (e) => {
        if (!e.data) return;
        
        if ((e.data === 'ping' || e.data?.type === 'request-sync') && livePayload) {
           bc.postMessage(livePayload);
        }
        
        if (e.data.type === 'playback') {
           setRemoteCommand({ ...e.data, ts: Date.now() });
           if (e.data.command === 'play') setPresentationPaused(false);
           if (e.data.command === 'pause') setPresentationPaused(true);
           
           // Forward to WebRTC connections
           connectionsRef.current.forEach(conn => {
              conn.send({ ...e.data, ts: Date.now() });
           });
        }

        if (e.data.type === 'status') {
           setPlaybackStatus({ 
              time: e.data.time, 
              duration: e.data.duration, 
              paused: e.data.paused,
              ts: e.data.ts || Date.now()
           });
           if (e.data.paused !== undefined) setPresentationPaused(e.data.paused);
           if (e.data.slideshowInterval !== undefined) setSlideshowInterval(e.data.slideshowInterval);
        }
     };
     return () => bc.close();
   }, [livePayload]);

  // Network Listener (Followers)
  useEffect(() => {
    if (!isNetworkView) return;
    
    const fetchLive = async () => {
      try {
        if (!roomId) return;
        const res = await fetch(`/api/live?room=${roomId}`);
        if (res.ok) {
           const data = await res.json();
           setNetworkPayload(data);
        }
      } catch (e) {}
    };

    fetchLive();
    const interval = setInterval(fetchLive, 2000);
    return () => clearInterval(interval);
  }, [isNetworkView, roomId]);

  const isInitialLoad = useRef(true);

  // Auto-Save Service Flow
  useEffect(() => {
      if (!isLoaded) return;
      
      // Skip the very first run after loading finished to prevent overwriting with initial state
      if (isInitialLoad.current) {
         isInitialLoad.current = false;
         return;
      }

      const timer = setTimeout(async () => {
         const { set } = await import('idb-keyval');
         await set('halos_service_items', serviceItems);
      }, 500);

      return () => clearTimeout(timer);
  }, [serviceItems, isLoaded]);

  useEffect(() => {
      if (!isLoaded || isInitialLoad.current) return;
      import('idb-keyval').then(({ set }) => {
         set('halos_church_name', churchName);
      });
  }, [churchName, isLoaded]);

  // Slideshow Autoplay Engine
  useEffect(() => {
     if (presentationPaused || liveItem?.type !== 'slide_deck' || !liveItem?.images?.length) return;
     
     const intervalTime = slideshowInterval * 1000;
     const timer = setInterval(() => {
         setLiveSlideIndex(prev => {
             const nextIndex = prev + 1;
             return nextIndex >= liveItem.images.length ? 0 : nextIndex;
         });
     }, intervalTime);
     
     return () => clearInterval(timer);
  }, [presentationPaused, liveItem, slideshowInterval]);

  // Monitor Projector Window Closure
  useEffect(() => {
     if (!isLive) return;
     const interval = setInterval(() => {
        if (projectorWindowRef.current && projectorWindowRef.current.closed) {
           setIsLive(false);
        }
     }, 1000);
     return () => clearInterval(interval);
  }, [isLive]);

  const handleSetSlideIndex = (index) => {
    const nextIndex = typeof index === 'function' ? index(activeSlideIndex) : index;
    setActiveSlideIndex(nextIndex);
    
    // Synchronize Live Output ONLY if the preview matches the live selection
    if (selectedItem?.id === liveItem?.id) {
       setLiveSlideIndex(nextIndex);
    }
  };

  // Core Keyboard Navigator
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (!selectedItem) return;
      
      const isMediaArray = selectedItem.images || selectedItem.isPpt;
      const slidesArray = selectedItem.slides;
      const maxIndex = slidesArray ? slidesArray.length - 1 : (isMediaArray ? selectedItem.images?.length - 1 || 0 : 0);

      switch(e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleSetSlideIndex(prev => Math.min(prev + 1, maxIndex));
          // Auto-disable clear text on slide changes
          setIsClearText(false);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSetSlideIndex(prev => Math.max(prev - 1, 0));
          setIsClearText(false);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (slidesArray) {
            const currentGroup = slidesArray[activeSlideIndex]?.type;
            let targetGroupIdx = 0;
            for(let i = activeSlideIndex - 1; i >= 0; i--) {
               if (slidesArray[i].type !== currentGroup) {
                 targetGroupIdx = slidesArray.findIndex(s => s.type === slidesArray[i].type);
                 break;
               }
            }
            handleSetSlideIndex(targetGroupIdx);
            setIsClearText(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (slidesArray) {
            const currentGroup = slidesArray[activeSlideIndex]?.type;
            const idx = slidesArray.findIndex((s, i) => i > activeSlideIndex && s.type !== currentGroup);
            if (idx !== -1) handleSetSlideIndex(idx);
            else handleSetSlideIndex(maxIndex);
            setIsClearText(false);
          }
          break;
      }

      if (/^[1-9]$/.test(e.key)) {
         e.preventDefault();
         const num = parseInt(e.key) - 1;
         handleSetSlideIndex(Math.min(num, maxIndex));
         setIsClearText(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, activeSlideIndex]);

  // ROUTING LAYER: PROJECTOR
  if (isProjectorView) {
    return (
       <div className="w-screen h-screen bg-black overflow-hidden relative">
          <OutputScreen payload={livePayload} isMaster={true} onStatusUpdate={(s) => { const bc = new BroadcastChannel('halos-projector-hub'); bc.postMessage({ type: 'status', time: s.time, duration: s.duration, paused: s.paused, ts: s.ts || Date.now() }); bc.close(); }} remoteCommand={remoteCommand} />
       </div>
    );
  }

  // ROUTING LAYER: NETWORK
  if (isNetworkView) {
    return (
       <div className="w-screen h-screen bg-black overflow-hidden relative">
          <OutputScreen payload={networkPayload} isLiveBroadcast={true} />
       </div>
    );
  }

  if (!libraryHandle) {
    return <FileSystemSetup onReady={(handle) => setLibraryHandle(handle)} />
  }

  // Control Actions
  const handleSelectItem = async (item) => {
    if (item.type === 'new_song') {
       setSelectedItem(item);
       setActiveTab('new_song');
       return;
    }
    if (item.type === 'new_liturgy') {
       setSelectedItem(item);
       setActiveTab('new_liturgy');
       return;
    }
    if (item.type === 'liturgy') {
       // Re-parse to ensure slides are fresh
       let fresh = item;
       if (item.rawText) {
         const parsed = parseLiturgyMarkdown(item.rawText, linesPerSlide);
         fresh = { ...item, slides: parsed.slides };
       }
       setSelectedItem(fresh);
       // If selecting from Service tab, set live output but stay on Service view
       if (activeTab === 'Service') {
         setLiveItem(fresh);
         setLiveSlideIndex(0);
         setPlayedItems(prev => new Set(prev).add(fresh.id));
       }
       // Only switch to Liturgy tab if we're being called from the Liturgy sidebar
       // (not from service — let the service stay focused)
       if (activeTab === 'Liturgy') {
         // show editor — tab is already Liturgy
       }
       setActiveSlideIndex(0);
       setSelectedIndices(new Set());
       setIsClearText(false);
       return;
    }
    
    let itemToView = { ...item };
    
    // Self-healing: If it's a service item with media, re-resolve URLs from library instantly
    if (libraryHandle && (item.type === 'video' || item.type === 'image' || item.type === 'slide_deck')) {
       const resolved = await reResolveMedia([item], libraryHandle);
       if (resolved && resolved[0]) itemToView = resolved[0];
    }

     // Always re-parse songs and liturgy so linesPerSlide is respected
     if ((item.type === 'song' || item.type === 'liturgy') && item.rawText) {
        const parsed = item.type === 'song' 
          ? parseSongMarkdown(item.rawText, linesPerSlide)
          : parseLiturgyMarkdown(item.rawText, linesPerSlide);
        itemToView = { ...item, slides: parsed.slides };
     }
    // Decoupled Seleciton: Only update Live Output if selecting from the Service tab
    if (activeTab === 'Service') {
       setLiveItem(itemToView);
       setLiveSlideIndex(0);
       setPlayedItems(prev => new Set(prev).add(itemToView.id));
       
       const willAutoPlay = itemToView.autoPlay === true;
       setPresentationPaused(!willAutoPlay); 
       setPlaybackStatus({ time: 0, duration: 0, paused: !willAutoPlay, ts: Date.now() });
       
       if (willAutoPlay) {
           setTimeout(() => {
               const bc = new BroadcastChannel('halos-projector-hub');
               bc.postMessage({ type: 'playback', command: 'play', source: 'system', isYoutube: itemToView.isYouTube, isVimeo: itemToView.isVimeo, ts: Date.now() });
               bc.close();
           }, 200); // Buffer element mounting sequence inside the Projector DOM
       }
    }
    
    setSelectedItem(itemToView);
    setActiveSlideIndex(0);
    setSelectedIndices(new Set()); // Clear selection on new item
    setIsClearText(false); // Reset overlays when changing items
  }



  const handleAddToService = () => {
    if (!selectedItem || selectedItem.type === 'new_song') {
      alert("Please select a valid item to add to the service.");
      return;
    }

    let itemToAdd = { ...selectedItem };

    // If there's a specific selection in the preview, only add those slides
    if (selectedIndices.size > 0 && selectedItem.slides) {
      const selectedSlides = Array.from(selectedIndices).sort((a,b) => a-b).map(idx => selectedItem.slides[idx]);
      
      let selectionLabel = " (Selected)";
      if (selectedItem.type === 'bible') {
        const verseNumbers = selectedSlides
          .map(s => s.type.replace('Verse ', ''))
          .filter(v => !isNaN(v) && v.trim() !== '')
          .map(Number);
        
        if (verseNumbers.length > 0) {
          selectionLabel = ":" + formatVerseRanges(verseNumbers);
        }
      }

      itemToAdd = {
        ...selectedItem,
        title: (selectedItem.title || selectedItem.reference) + selectionLabel,
        slides: selectedSlides
      };
      setSelectedIndices(new Set()); // Reset after adding
    }

    setServiceItems([...serviceItems, { ...itemToAdd, id: Date.now().toString() }]);
  };

  const handleDeleteItem = (id) => {
    if (selectedItem && (selectedItem.id === id || selectedItem.filename === id)) {
      setSelectedItem(null);
      setActiveSlideIndex(0);
    }
    // Also cleanup service items if they match this item's filename/id
    setServiceItems(prev => prev.filter(item => item.id !== id && item.filename !== id));
  };

  const handleSaveService = async () => {
    try {
      const options = {
        suggestedName: `halos-service-${new Date().toISOString().split('T')[0]}.json`,
        types: [{
          description: 'Halos Service File',
          accept: { 'application/json': ['.json'] },
        }],
      };
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(serviceItems, null, 2));
      await writable.close();
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Save failed', err);
    }
  };

  const handleLoadService = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Halos Service File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const file = await handle.getFile();
      const content = await file.text();
      const loadedItems = JSON.parse(content);
      if (Array.isArray(loadedItems)) {
        const resolved = await reResolveMedia(loadedItems, libraryHandle);
        setServiceItems(resolved);
      } else {
        alert("Invalid service file format.");
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Load failed', err);
    }
  };

  const handleClearService = () => {
    setShowClearConfirm(true);
  };

  const handleRemoveServiceItem = (idx) => {
    const item = serviceItems[idx];
    const next = [...serviceItems];
    next.splice(idx, 1);
    setServiceItems(next);
    
    // Clear playback if we removed the live item
    if (liveItem?.id === item?.id) setLiveItem(null);
    if (selectedItem?.id === item?.id) setSelectedItem(null);
  };

  const handleUpdateServiceItem = (idx, updatedItem) => {
    const next = [...serviceItems];
    next[idx] = updatedItem;
    setServiceItems(next);
  };

  const toggleLive = () => {
     if (!isLive) {
        // Break out projection window via standard OS popups
        projectorWindowRef.current = window.open('?projector=true', 'HalosProjector', 'menubar=no,location=no,resizable=yes,scrollbars=no,status=no,width=1280,height=720');
        setIsLive(true);
     } else {
        setShowOfflineConfirm(true);
     }
  };

  const executeGoOffline = () => {
     if (projectorWindowRef.current) projectorWindowRef.current.close();
     setIsLive(false);
     setShowOfflineConfirm(false);
  };

  return (
    <DragDropZone libraryHandle={libraryHandle}>
      <div className="h-screen bg-neutral-950 text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
          
          {/* TOP NAVIGATION BAR */}
          <header className="h-16 border-b border-neutral-800/80 flex flex-col justify-between px-6 bg-neutral-900/60 backdrop-blur-xl z-20 pt-2 shadow-sm">
            <div className="flex justify-between items-end w-full h-full">
              <div className="flex items-center gap-3 pb-3">
                  <h1 className="text-xl font-extrabold tracking-widest text-white drop-shadow">HALOS</h1>
              </div>
              
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 justify-center px-4">
                {TABS.map(tab => (
                   <button 
                     key={tab}
                     onClick={() => {
                       setActiveTab(tab);
                       setSelectedItem(null);
                       setActiveSlideIndex(0);
                     }}
                     className={`px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all duration-200 border-b-2 flex items-center h-full ${
                       activeTab === tab 
                          ? 'text-white border-blue-500 bg-neutral-800/80 shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)]' 
                          : 'text-neutral-400 border-transparent hover:text-neutral-300 hover:bg-neutral-800/40'
                     }`}
                   >
                     {tab}
                   </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4 pb-3">
                <div className="text-[10px] font-bold px-3 py-1.5 bg-green-950/40 text-green-400 rounded-full border border-green-800/50 tracking-wider uppercase flex items-center gap-2 shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Connected
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 flex overflow-hidden relative">
            
            <div className="w-[340px] border-r border-neutral-800/50 p-5 bg-neutral-900/30 flex flex-col gap-6 flex-shrink-0 z-10 shadow-lg relative">
              <Sidebar 
                 activeTab={activeTab}
                 libraryHandle={libraryHandle}
                 searchState={searchState}
                 folderFiles={folderFiles}
                 serviceItems={serviceItems}
                 systemTrigger={systemTrigger}
                 onRefresh={refreshLibrary}
                 onServiceReorder={setServiceItems}
                 onSelectItem={handleSelectItem}
                 onDeleteItem={handleDeleteItem}
                 onAddToService={handleAddToService}
                 onNewSong={() => handleSelectItem({ type: 'new_song' })}
                 onRemoveServiceItem={handleRemoveServiceItem}
                 onUpdateServiceItem={handleUpdateServiceItem}
                 onSaveService={handleSaveService}
                 onLoadService={handleLoadService}
                 onClearService={handleClearService}
                 roomId={roomId}
                 liveItemId={liveItem?.id}
                 playedItems={playedItems}
                 onResetPlayed={() => setPlayedItems(new Set())}
                 onResetItemPlayed={(id) => setPlayedItems(prev => {
                   const next = new Set(prev);
                   next.delete(id);
                   return next;
                 })}
                 churchName={churchName}
                 setChurchName={setChurchName}
              />
            </div>
            
            <div className="flex-1 p-8 bg-neutral-950/90 overflow-y-auto relative custom-scrollbar flex flex-col z-0">
              {(activeTab === 'new_liturgy' || (activeTab === 'Liturgy' && selectedItem?.type === 'liturgy')) ? (
                 <LiturgyEditor
                   libraryHandle={libraryHandle}
                   initialFile={selectedItem?.type === 'liturgy' && selectedItem?.fileHandle
                     ? { name: selectedItem.filename, handle: selectedItem.fileHandle }
                     : null
                   }
                   onSaved={(saved) => {
                     // Re-load the saved file into selectedItem
                     const load = async () => {
                       const f = await saved.handle.getFile();
                       const text = await f.text();
                       const parsed = parseLiturgyMarkdown(text);
                       const updated = {
                         type: 'liturgy',
                         id: saved.name,
                         filename: saved.name,
                         title: parsed.metadata.title || saved.name.replace('.md', ''),
                         slides: parsed.slides,
                         rawText: text,
                         fileHandle: saved.handle,
                       };
                       setSelectedItem(updated);
                       setActiveTab('Liturgy');
                     };
                     load();
                   }}
                   onDeleted={() => {
                     setSelectedItem(null);
                     setActiveTab('Liturgy');
                   }}
                   onRefresh={refreshLibrary}
                 />
              ) : activeTab === 'new_song' ? (
                 <SongEditor 
                   libraryHandle={libraryHandle} 
                   initialData={editingSong}
                   onSaved={() => {
                     setSelectedItem(null);
                     setEditingSong(null);
                     setActiveTab('Songs');
                   }} 
                 />
               ) : selectedItem?.type === 'slide_deck' || selectedItem?.type === 'image' ? (
                  <ImageArrayViewer images={selectedItem.images} currentIndex={activeSlideIndex} onSelectIndex={handleSetSlideIndex} />
               ) : selectedItem?.type === 'video' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-2xl border border-neutral-800 p-8 shadow-inner overflow-hidden relative">
                     <div className="absolute top-4 left-4 z-10 text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-3">
                        {selectedItem.title}
                        {selectedItem.isExternal && (
                          <a 
                            href={selectedItem.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-[9px] bg-neutral-800 hover:bg-neutral-700 px-2 py-0.5 rounded border border-neutral-700 transition text-neutral-400 hover:text-blue-400"
                          >
                            <ExternalLink size={10} /> OPEN SOURCE
                          </a>
                        )}
                     </div>
                     {(selectedItem.isYouTube || selectedItem.isVimeo) ? (
                       <iframe 
                         src={selectedItem.url} 
                         className="w-full h-full rounded-lg" 
                         frameBorder="0" 
                         allow="autoplay; fullscreen; picture-in-picture; encrypted-media" 
                         allowFullScreen
                       />
                     ) : (
                       <video src={selectedItem.url} controls className="w-full h-full object-contain rounded-lg" />
                     )}
                  </div>
               ) : selectedItem?.isPpt || selectedItem?.isDocument ? (
                 <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-black rounded-2xl border-2 border-neutral-800 shadow-inner">
                    <h3 className="text-3xl font-extrabold mb-4 text-white tracking-widest">{selectedItem.title}</h3>
                    <p className="text-neutral-400 text-sm max-w-md font-medium leading-relaxed">Presentations and Document files cannot be natively controlled or paginated inside a web browser frame.<br/><br/>Please export your slides or pages as images (.jpg or .png) and drop them into the Images folder for native viewing, or use an external application alongside Halos.</p>
                 </div>
              ) : selectedItem?.slides ? (
                  <PreviewEditor 
                    item={selectedItem} 
                    activeIndex={activeSlideIndex} 
                    linesPerSlide={linesPerSlide}
                    selectedIndices={selectedIndices}
                    isServiceItem={serviceItems.some(si => si.id === selectedItem?.id)}
                    onToggleSelection={(idx) => {
                       const next = new Set(selectedIndices);
                       if (next.has(idx)) next.delete(idx);
                       else next.add(idx);
                       setSelectedIndices(next);
                    }}
                    onSelectIndex={handleSetSlideIndex} 
                    onEdit={(song) => {
                       setEditingSong(song);
                       setActiveTab('new_song');
                    }}
                    onAddSelectedToService={handleAddToService}
                    onRemoveSelectedFromService={() => {
                      if (selectedIndices.size === 0) return;
                      const remainingSlides = selectedItem.slides.filter((_, idx) => !selectedIndices.has(idx));
                      
                      if (remainingSlides.length === 0) {
                        handleDeleteItem(selectedItem.id);
                      } else {
                        const updatedItem = { ...selectedItem, slides: remainingSlides };
                        setServiceItems(serviceItems.map(si => si.id === selectedItem.id ? updatedItem : si));
                        setSelectedItem(updatedItem);
                      }
                      setSelectedIndices(new Set());
                    }}
                    onChangeLinesPerSlide={(n) => {
                      setLinesPerSlide(n);
                      if (selectedItem?.rawText) {
                        const parsed = parseSongMarkdown(selectedItem.rawText, n);
                        setSelectedItem(prev => ({ ...prev, slides: parsed.slides }));
                        setActiveSlideIndex(0);
                      }
                    }}
                 />
              ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto opacity-30 pointer-events-none">
                    <h3 className="text-2xl font-black mb-3 tracking-widest text-neutral-400">NO MEDIA SELECTED</h3>
                    <p className="text-neutral-500 font-bold text-sm leading-loose">Use the tabs above to select content folders.<br/>Select an item to preview it, then click "Add to Service".</p>
                 </div>
              )}
            </div>
            
            <div className="w-[360px] border-l border-neutral-800/50 p-6 bg-neutral-900/50 shadow-2xl z-20 flex-shrink-0 overflow-y-auto custom-scrollbar">
               <LiveControl 
                 isLive={isLive} toggleLive={toggleLive}
                 isBlackScreen={isBlackScreen} setIsBlackScreen={setIsBlackScreen}
                 isShowLogo={isShowLogo} setIsShowLogo={setIsShowLogo}
                 isClearText={isClearText} setIsClearText={setIsClearText}
                 onPickLogo={setLogoUrl}
                 livePayload={livePayload}
                 remoteCommand={remoteCommand}
                 playbackStatus={playbackStatus}
                 presentationPaused={presentationPaused}
                 setPresentationPaused={setPresentationPaused}
                 isSyncingMedia={isSyncingMedia}
                 roomId={roomId}
                 musicFiles={musicFiles}
              />
            </div>
          </main>
          
         <ConfirmModal 
             isOpen={showClearConfirm}
             title="Clear Service Flow?"
             message="This will permanently remove all items from your current service. This action cannot be undone."
             onConfirm={() => {
                 setServiceItems([]);
                 setLiveItem(null);
                 setSelectedItem(null);
                 setShowClearConfirm(false);
              }}
             onCancel={() => setShowClearConfirm(false)}
             confirmText="Clear Everything"
          />
          <ConfirmModal 
             isOpen={showOfflineConfirm}
             title="End Live Broadcast?"
             message="This will close the main projector window and disconnect all network viewers immediately."
             onConfirm={executeGoOffline}
             onCancel={() => setShowOfflineConfirm(false)}
             confirmText="End Broadcast"
          />
      </div>
    </DragDropZone>
  )
}

export default App
