import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Layers, File, Music, Image as ImgIcon, Video, FileText, CheckCircle, Check, Trash2, Sparkles, Settings, BookOpen, Headphones } from 'lucide-react';
import BibleModule from './BibleModule';
import ServiceFlow from './ServiceFlow';
import { processBibleJson } from '../services/bibleService';
import ConfirmModal from './ConfirmModal';
import SettingsView from './SettingsView';
import { parseLiturgyMarkdown } from '../utils/liturgyParser';

export default function Sidebar({ 
  activeTab, 
  libraryHandle, 
  searchState, 
  folderFiles,
  serviceItems, 
  onServiceReorder, 
  onSelectItem, 
  onAddToService,
  onNewSong,
  onRemoveServiceItem,
  onUpdateServiceItem,
  onSaveService,
  onLoadService,
  onClearService,
  systemTrigger,
  onDeleteItem,
  liveItemId,
  playedItems,
  onResetPlayed,
  onResetItemPlayed,
  roomId,
  churchName,
  setChurchName
}) {
  const [localQuery, setLocalQuery] = useState('');
  const [showAdded, setShowAdded] = useState(false);
  const [bibleToDelete, setBibleToDelete] = useState(null);
  const [songToDelete, setSongToDelete] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);

  // Liturgy state
  const [liturgyFiles, setLiturgyFiles] = useState([]);
  const [liturgyToDelete, setLiturgyToDelete] = useState(null);
  const [selectedLiturgyFile, setSelectedLiturgyFile] = useState(null);

  const loadLiturgyFiles = useCallback(async () => {
    if (!libraryHandle) return;
    try {
      const dir = await libraryHandle.getDirectoryHandle('Liturgy', { create: true });
      const files = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          files.push({ name, handle });
        }
      }
      files.sort((a, b) => a.name.localeCompare(b.name));
      setLiturgyFiles(files);
    } catch (err) {
      console.warn('Could not read Liturgy folder', err);
    }
  }, [libraryHandle]);

  useEffect(() => {
    if (activeTab === 'Liturgy') loadLiturgyFiles();
  }, [activeTab, systemTrigger, loadLiturgyFiles]);
  
  // Multi-Source Integrated Search
  const [searchMode, setSearchMode] = useState('local'); // 'local', 'songselect', 'web', 'lyrics-ovh'
  const [ssResults, setSsResults] = useState([]);
  const [webResults, setWebResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef(null);

  const triggerAddFeedback = () => {
     onAddToService();
     setShowAdded(true);
     setTimeout(() => setShowAdded(false), 2000);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setLocalQuery(val);
    
    if (activeTab === 'Songs') {
      if (searchMode === 'local') {
        if (searchState && searchState.search) searchState.search(val);
      } else {
        // Debounced Global Searches
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
          if (searchMode === 'songselect') performSSSearch(val);
          if (searchMode === 'web') performUniversalSearch(val);
          if (searchMode === 'lyrics-ovh') performQuickLyricsSearch(val);
        }, 600);
      }
    }
  };

  const performSSSearch = async (q) => {
    if (!q.trim()) {
      setSsResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const resp = await fetch(`/api/songselect-search?q=${encodeURIComponent(q)}`);
      const html = await resp.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const items = doc.querySelectorAll('.song-item');
      
      const parsed = Array.from(items).map(item => {
          const titleEl = item.querySelector('.song-item-title a');
          const subtitleEl = item.querySelector('.song-item-subtitle');
          return {
              id: titleEl?.getAttribute('href') || Math.random().toString(),
              title: titleEl?.textContent?.trim() || 'Unknown Title',
              artist: subtitleEl?.textContent?.trim() || 'Unknown Author',
              url: `https://songselect.ccli.com${titleEl?.getAttribute('href')}/viewlyrics`
          };
      });
      setSsResults(parsed);
    } catch (err) {
      console.error("SS Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const performUniversalSearch = async (q) => {
    if (!q.trim()) {
      setWebResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const resp = await fetch(`/api/universal-search?q=${encodeURIComponent(q)}`);
      const html = await resp.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('.result-link');
      
      const parsed = Array.from(links).map(link => {
          const row = link.closest('tr');
          const snippet = row?.nextElementSibling?.querySelector('.result-snippet');
          
          let href = link.getAttribute('href');
          // Strip DuckDuckGo's internal tracking redirect proxy
          if (href && href.includes('uddg=')) {
              try {
                  const urlObj = new URL(href, 'http://localhost');
                  href = decodeURIComponent(urlObj.searchParams.get('uddg'));
              } catch(e) {}
          }

          return {
              id: href,
              title: link.textContent?.trim() || 'Unknown Title',
              url: href,
              snippet: snippet?.textContent?.trim() || ''
          };
      });
      setWebResults(parsed);
    } catch (err) {
      console.error("Web Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const performQuickLyricsSearch = async (q) => {
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      // Try to split artist and title if possible, otherwise treat as title
      let artist = 'Various';
      let title = q;
      let hasFormat = false;
      if (q.includes('-')) {
         [artist, title] = q.split('-').map(s => s.trim());
         hasFormat = true;
      } else if (q.toLowerCase().includes(' by ')) {
         [title, artist] = q.toLowerCase().split(' by ').map(s => s.trim());
         hasFormat = true;
      }

      if (!hasFormat) {
         setWebResults([{
             id: 'format-tip',
             title: 'Quick Search requires Artist - Title',
             url: '#',
             snippet: 'Example: "Brandon Lake - Gratitude" or "Gratitude by Brandon Lake". (Lyrics.ovh API requires splitting the artist and title).'
         }]);
         return;
      }

      const resp = await fetch(`/api/lyrics-ovh?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.lyrics) {
          // Open in a virtual "Magic Import" view or just log it
          // For now, let's just create a single result card
          setWebResults([{ 
              id: 'ovh-match', 
              title: `${title} (${artist})`, 
              url: 'virtual:lyrics-ovh', 
              content: data.lyrics,
              snippet: 'Found direct lyrics match! Click to import.' 
          }]);
        } else {
          setWebResults([{
             id: 'no-match',
             title: 'No direct lyrics found in DB',
             url: '#',
             snippet: 'Try using the Global Web Search tab instead to scrape Google/DuckDuckGo.'
          }]);
        }
      }
    } catch (err) {
      console.error("Lyrics.ovh failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenExternalLyrics = (res) => {
     if (res.url === 'virtual:lyrics-ovh') {
        // Special case: we already have the lyrics! 
        // We'll pass them via session storage or window name
        window.lyricsToImport = res.content;
        window.open('about:blank', 'LyricsImporter', 'width=600,height=800');
     } else {
        window.open(res.url, 'LyricsImporter', 'width=600,height=800,menubar=no,location=no');
     }
  };

  const handleAddExternalVideo = (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    let url = videoUrl.trim();
    let title = videoTitle.trim() || "External Video";
    let isVideo = true;
    let type = 'video';
    let isYouTube = false;
    let isVimeo = false;

    // Detect YouTube
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
       url = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
       isYouTube = true;
       if (!videoTitle.trim()) title = "YouTube Video";
    }

    // Detect Vimeo
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (vimeoMatch) {
       url = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
       isVimeo = true;
       if (!videoTitle.trim()) title = "Vimeo Video";
    }
 
    if (!ytMatch && !vimeoMatch && !videoTitle.trim()) {
       try {
         const pathname = new URL(url).pathname;
         const filename = pathname.split('/').pop();
         if (filename) title = filename;
       } catch(e) {}
    }

    onSelectItem({
      title,
      url,
      isVideo,
      type,
      isYouTube,
      isVimeo,
      isExternal: true,
      id: url,
      filename: title
    });
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!videoUrl.trim() || activeTab !== 'Videos') return;
    
    const fetchTitle = async () => {
      // Basic check for YT/Vimeo to avoid unnecessary fetches
      const isYT = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
      const isVimeo = videoUrl.includes('vimeo.com');
      
      if (!isYT && !isVimeo) return;

      setIsFetchingTitle(true);
      try {
        let endpoint = '';
        if (isYT) endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        if (isVimeo) endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;

        const res = await fetch(endpoint);
        if (res.ok) {
           const data = await res.json();
           if (data.title) setVideoTitle(data.title);
        }
      } catch (err) {
        console.warn("Failed to fetch video title", err);
      } finally {
        setIsFetchingTitle(false);
      }
    };

    const timer = setTimeout(fetchTitle, 500);
    return () => clearTimeout(timer);
  }, [videoUrl, activeTab]);

  const handleGenericFileClick = async (fileObj) => {
    if (fileObj.isDirectory) {
        const imgArray = [];
        for await (const [name, handle] of fileObj.handle.entries()) {
             if (handle.kind === 'file' && name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                 const file = await handle.getFile();
                 imgArray.push({ name, url: URL.createObjectURL(file) });
             }
        }
        
        imgArray.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        onSelectItem({
            title: fileObj.name,
            type: 'slide_deck',
            images: imgArray.map(img => ({ url: img.url })),
            id: fileObj.name,
            folder: activeTab,
            filename: fileObj.name
        });
        return;
    }

    const fileHandle = fileObj.handle || fileObj;
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop().toLowerCase();
    
    let previewItem = {
      title: file.name,
      type: 'media',
      url: url,
      fileHandle: fileHandle,
      extension: ext,
      id: file.name,
      folder: activeTab, // Track which folder it came from
      filename: file.name
    };

    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
       previewItem.images = [{ url }];
       previewItem.type = 'image';
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
       previewItem.isVideo = true;
       previewItem.type = 'video';
    } else if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) {
       previewItem.isAudio = true;
       previewItem.type = 'audio';
    } else if (['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'key', 'pages', 'numbers'].includes(ext)) {
       previewItem.isDocument = true;
       previewItem.type = 'document';
    } else if (['json'].includes(ext) && activeTab === 'Bible') {
       const text = await file.text();
       const rawData = JSON.parse(text);
       const parsedData = processBibleJson(rawData);
       previewItem = { ...parsedData, id: file.name, type: 'bible', folder: 'Bible', filename: file.name }; 
    }

    onSelectItem(previewItem);
  };

  // Reusable Add Button matching states
  const AddButton = () => (
    <button 
        onClick={triggerAddFeedback} 
        className={`w-full py-4 text-white font-extrabold tracking-wide uppercase rounded-xl border transition flex items-center justify-center gap-2 mt-auto shadow-lg flex-shrink-0 ${
           showAdded 
             ? 'bg-green-600 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
             : 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border-neutral-700/50'
        }`}
    >
        {showAdded ? <Check size={18} className="text-white" /> : <Plus size={18} className="text-blue-400" />} 
        {showAdded ? 'Added!' : 'Add to Service'}
    </button>
  );

  const checkInService = (idOrTitle) => serviceItems.some(i => 
    i.id === idOrTitle || 
    i.title === idOrTitle || 
    i.reference === idOrTitle ||
    i.filename === idOrTitle
  );

  const handleDeleteBibleFile = (e, file) => {
    e.stopPropagation();
    setBibleToDelete(file);
  };

  const confirmDeleteBible = async () => {
    if (!libraryHandle || !bibleToDelete) return;
    try {
        const dir = await libraryHandle.getDirectoryHandle('Bible');
      await dir.removeEntry(bibleToDelete.name);
      if (onDeleteItem) onDeleteItem(bibleToDelete.name);
      if (onRefresh) onRefresh();
      setBibleToDelete(null); // Close modal after successful deletion
    } catch(err) {
      alert("Failed to delete Bible file: " + err.message);
      setBibleToDelete(null); // Close modal even on error
    }
  };

  const confirmDeleteSong = async () => {
    if (!libraryHandle || !songToDelete) return;
    try {
      const dir = await libraryHandle.getDirectoryHandle('Songs');
      await dir.removeEntry(songToDelete.id);
      if (onDeleteItem) onDeleteItem(songToDelete.id);
      if (onRefresh) onRefresh();
      setSongToDelete(null);
    } catch(err) {
      alert("Failed to delete song: " + err.message);
      setSongToDelete(null);
    }
  };

  const handleDeleteSong = (e, song) => {
    e.stopPropagation();
    setSongToDelete(song);
  };

  const confirmDeleteGenericFile = async () => {
    if (!libraryHandle || !fileToDelete || !activeTab) return;
    try {
      const dir = await libraryHandle.getDirectoryHandle(activeTab);
      await dir.removeEntry(fileToDelete.name);
      if (onDeleteItem) onDeleteItem(fileToDelete.name);
      if (onRefresh) onRefresh();
      setFileToDelete(null);
    } catch(err) {
      alert("Failed to delete file: " + err.message);
      setFileToDelete(null);
    }
  };

  const handleDeleteGenericFile = (e, file) => {
    e.stopPropagation();
    setFileToDelete(file);
  };

  // 0. Settings View
  if (activeTab === 'Settings') {
    return <SettingsView roomId={roomId} churchName={churchName} setChurchName={setChurchName} />;
  }

  // 0b. Liturgy View
  if (activeTab === 'Liturgy') {
    const confirmDeleteLiturgy = async () => {
      if (!libraryHandle || !liturgyToDelete) return;
      try {
        const dir = await libraryHandle.getDirectoryHandle('Liturgy', { create: false });
        await dir.removeEntry(liturgyToDelete.name);
        if (onDeleteItem) onDeleteItem(liturgyToDelete.name);
        setLiturgyToDelete(null);
        setSelectedLiturgyFile(null);
        loadLiturgyFiles();
      } catch (err) {
        alert('Failed to delete: ' + err.message);
        setLiturgyToDelete(null);
      }
    };

    const handleLiturgySelect = async (file) => {
      try {
        const f = await file.handle.getFile();
        const text = await f.text();
        const parsed = parseLiturgyMarkdown(text, 4);
        onSelectItem({
          type: 'liturgy',
          id: file.name,
          filename: file.name,
          title: parsed.metadata.title || file.name.replace('.md', ''),
          slides: parsed.slides,
          rawText: text,
          fileHandle: file.handle,
        });
        setSelectedLiturgyFile(file.name);
      } catch (err) {
        console.error('Failed to load liturgy file', err);
      }
    };

    return (
      <div className="flex flex-col h-full w-full gap-4 pt-2">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={14} /> Liturgy Library
          </div>
          <button
            onClick={() => {
              onSelectItem({ type: 'new_liturgy', id: 'new_liturgy' });
              setSelectedLiturgyFile(null);
            }}
            className="text-[10px] bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/40 px-2 py-1 rounded font-bold uppercase tracking-wider transition"
          >
            + New
          </button>
        </div>

        <AddButton />

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 border-t border-neutral-800/50 pt-3 px-1">
          {liturgyFiles.length === 0 && (
            <div className="text-sm font-medium text-neutral-500 italic p-4 text-center bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed mt-4">
              No liturgy files yet.<br/>
              <span className="text-[10px]">Click "+ New" to create one.</span>
            </div>
          )}
          {liturgyFiles
            .filter(f => f.name.toLowerCase().includes(localQuery.toLowerCase()))
            .map(file => {
              const isInService = checkInService(file.name);
              const isSelected = selectedLiturgyFile === file.name;
              return (
                <div
                  key={file.name}
                  onClick={() => handleLiturgySelect(file)}
                  className={`p-3 rounded-xl cursor-pointer border transition flex justify-between items-center ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/30'
                      : isInService
                        ? 'bg-green-950/20 border-green-500/30'
                        : 'bg-neutral-800/40 border-transparent hover:border-neutral-600 hover:bg-neutral-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate flex-1">
                    <BookOpen size={14} className={isSelected ? 'text-amber-400' : 'text-neutral-500'} />
                    <div className="font-semibold text-xs text-neutral-300 truncate">
                      {file.name.replace('.md', '')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInService && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                    <div
                      onClick={(e) => { e.stopPropagation(); setLiturgyToDelete(file); }}
                      className="p-1.5 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete Liturgy File"
                    >
                      <Trash2 size={14} />
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>

        <ConfirmModal
          isOpen={!!liturgyToDelete}
          title="Delete Liturgy File?"
          message={`Are you sure you want to permanently delete "${liturgyToDelete?.name?.replace('.md', '')}"?`}
          onConfirm={confirmDeleteLiturgy}
          onCancel={() => setLiturgyToDelete(null)}
          confirmText="Delete File"
        />
      </div>
    );
  }

  // 1. Service View
  if (activeTab === 'Service') {
    return (
      <div className="flex flex-col h-full w-full">
        <ServiceFlow 
          items={serviceItems} 
          onReorder={onServiceReorder} 
          onSelect={onSelectItem}           
          onRemove={onRemoveServiceItem}
          onUpdate={onUpdateServiceItem}
          onSave={onSaveService}
           onLoad={onLoadService}
           onClear={onClearService}
           liveItemId={liveItemId}
           playedItems={playedItems}
           onResetPlayed={onResetPlayed}
           onResetItemPlayed={onResetItemPlayed}
         />
      </div>
    );
  }

  // 2. Bible View
  if (activeTab === 'Bible') {
    return (
      <div className="flex flex-col h-full w-full gap-4 pt-2">
        <BibleModule libraryHandle={libraryHandle} systemTrigger={systemTrigger} onSelectDocument={(data) => onSelectItem({...data, type: 'bible'})} />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 border-t border-neutral-800/50 pt-3">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-1">Saved Offline Verses</div>
          {folderFiles.length === 0 && <div className="text-xs text-neutral-600 px-1 italic">No offline verses cached yet.</div>}
          <div className="space-y-2 px-1">
            {folderFiles.map(file => {
               const isInService = checkInService(file.name);
               return (
                 <div 
                   key={file.name} 
                   onClick={() => handleGenericFileClick(file)}
                   className={`p-3 bg-neutral-800/50 hover:bg-neutral-700/80 rounded-xl cursor-pointer transition border flex justify-between items-center ${isInService ? 'border-green-500/30' : 'border-transparent hover:border-neutral-600'}`}
                 >
                   <div className="flex-1 min-w-0">
                     <div className="text-xs font-bold text-white truncate">{file.name.replace('.json', '').toUpperCase()}</div>
                     <div className="text-[10px] text-neutral-400 font-medium">OFFLINE CACHE</div>
                   </div>
                   <div className="flex items-center gap-2">
                     {isInService && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                     <div 
                        onClick={(e) => handleDeleteBibleFile(e, file)}
                        className="p-1.5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove from Cache"
                     >
                        <Trash2 size={14} />
                     </div>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>
                <AddButton />

        <ConfirmModal 
           isOpen={!!bibleToDelete}
           title="Remove from Cache?"
           message={`Are you sure you want to remove "${bibleToDelete?.name?.replace('.json', '').toUpperCase()}" from your offline Bible cache?`}
           onConfirm={confirmDeleteBible}
           onCancel={() => setBibleToDelete(null)}
           confirmText="Remove Verse"
        />
      </div>
    );
  }

  // 3. Songs View
  if (activeTab === 'Songs') {
    return (
        <div className="flex flex-col h-full gap-4 pt-2 w-full">
            <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                    <Music size={14} /> Songs Library
                </div>
                <button onClick={onNewSong} className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 px-2 py-1 rounded font-bold uppercase tracking-wider transition">
                    + New
                </button>
            </div>
            
            {/* MULTI-SOURCE TOGGLE */}
            <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800/80 mb-0">
                <button 
                  onClick={() => { setSearchMode('local'); setSsResults([]); setWebResults([]); }}
                  className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${searchMode === 'local' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-400'}`}
                >
                    Local
                </button>
                <button 
                  onClick={() => { setSearchMode('songselect'); performSSSearch(localQuery); }}
                  className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${searchMode === 'songselect' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-400'}`}
                >
                    CCLI
                </button>
                <button 
                  onClick={() => { setSearchMode('web'); performUniversalSearch(localQuery); }}
                  className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${searchMode === 'web' ? 'bg-orange-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-400'}`}
                >
                    Web
                </button>
                <button 
                  onClick={() => { setSearchMode('lyrics-ovh'); performQuickLyricsSearch(localQuery); }}
                  className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${searchMode === 'lyrics-ovh' ? 'bg-green-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-400'}`}
                >
                    Quick
                </button>
            </div>

            <div className="relative">
                <input 
                  type="text" 
                  placeholder={
                    searchMode === 'local' ? "Search Library..." :
                    searchMode === 'songselect' ? "Search CCLI SongSelect..." :
                    searchMode === 'web' ? "Search Global Web..." :
                    "Artist - Title (Exact Match)"
                  } 
                  value={localQuery} 
                  onChange={handleSearch} 
                  className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl text-sm font-medium text-white pl-10 pr-3 py-3 outline-none focus:border-blue-500 transition shadow-inner" 
                />
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-neutral-400'}`} />
            </div>

            <AddButton />

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mt-1 border-t border-neutral-800/50 pt-4 px-1">
                {searchMode === 'local' && (
                   (localQuery.trim() ? searchState.results : (searchState.allItems || [])).map(res => {
                       const isInService = checkInService(res.id) || checkInService(res.title);
                       return (
                           <div 
                                key={res.id} 
                                onClick={() => onSelectItem({ type: 'song', ...res, slides: res.slides })} 
                                className={`p-3 hover:bg-neutral-700/80 rounded-xl cursor-pointer border transition flex justify-between items-start ${
                                   isInService ? 'bg-green-950/20 border-green-500/30' : 'bg-neutral-800/40 border-transparent hover:border-neutral-600'
                                }`}
                           >
                               <div className="truncate pr-2 flex-1">
                                   <div className="font-semibold text-sm text-neutral-200 truncate">{res.title}</div>
                                   {res.artist && <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1 truncate">{res.artist}</div>}
                               </div>
                               <div className="flex items-center gap-2">
                                   {isInService && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                                   <div 
                                       onClick={(e) => handleDeleteSong(e, res)}
                                       className="p-1.5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-colors"
                                       title="Delete Song"
                                   >
                                       <Trash2 size={14} />
                                   </div>
                               </div>
                           </div>
                       )
                   })
                )}

                {searchMode === 'songselect' && ssResults.map(res => (
                   <div 
                        key={res.id} 
                        onClick={() => handleOpenExternalLyrics(res)}
                        className="p-3 bg-blue-900/10 hover:bg-blue-900/20 rounded-xl cursor-pointer border border-blue-500/10 hover:border-blue-500/40 transition group"
                   >
                       <div className="flex justify-between items-start mb-1">
                           <div className="font-semibold text-sm text-neutral-200 truncate pr-2">{res.title}</div>
                           <Sparkles size={12} className="text-blue-500 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                       </div>
                       <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider truncate">{res.artist}</div>
                   </div>
                ))}

                {(searchMode === 'web' || searchMode === 'lyrics-ovh') && webResults.map(res => (
                   <div 
                        key={res.id} 
                        onClick={() => handleOpenExternalLyrics(res)}
                        className={`p-3 rounded-xl cursor-pointer border transition group ${searchMode === 'web' ? 'bg-orange-900/10 border-orange-500/10 hover:border-orange-500/40 hover:bg-orange-900/20' : 'bg-green-900/10 border-green-500/10 hover:border-green-500/40 hover:bg-green-900/20'}`}
                   >
                       <div className="flex justify-between items-start mb-1">
                           <div className="font-semibold text-[11px] text-neutral-200 truncate pr-2">{res.title}</div>
                           <Search size={12} className={searchMode === 'web' ? 'text-orange-500' : 'text-green-500'} />
                       </div>
                       <div className="text-[9px] text-neutral-400 leading-tight line-clamp-2">{res.snippet}</div>
                   </div>
                ))}

                {searchMode !== 'local' && ssResults.length === 0 && webResults.length === 0 && !isSearching && (
                   <div className="text-center py-8 opacity-40">
                       <Search size={32} className="mx-auto mb-2 text-neutral-600" />
                       <div className="text-[10px] font-black uppercase tracking-widest">No Matches Found</div>
                   </div>
                )}
            </div>

            <ConfirmModal 
                isOpen={!!songToDelete}
                title="Delete Song?"
                message={`Are you sure you want to permanently delete "${songToDelete?.title}" from your library?`}
                onConfirm={confirmDeleteSong}
                onCancel={() => setSongToDelete(null)}
                confirmText="Delete Song"
            />
        </div>
    );
  }

  // 4. Generic Folder View (Documents, Videos, Images, Music)
  const IconProps = { size: 14, className: "text-neutral-400" };
  const getIcon = () => {
      switch(activeTab) {
          case 'Videos': return <Video {...IconProps} />;
          case 'Images': return <ImgIcon {...IconProps} />;
          case 'Music': return <Headphones {...IconProps} />;
          default: return <File {...IconProps} />;
      }
  };

  return (
    <div className="flex flex-col h-full gap-4 pt-2 w-full">
      <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
         {getIcon()} {activeTab} Library
      </div>
      
      <div className="relative">
        <input 
          type="text" 
          placeholder={`Filter ${activeTab}...`}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl text-sm font-medium text-white pl-10 pr-3 py-3 outline-none focus:border-blue-500 transition shadow-inner"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      </div>

      {activeTab === 'Videos' && (
        <form onSubmit={handleAddExternalVideo} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
           <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex justify-between">
              <span>Add Video URL</span>
              {isFetchingTitle && <span className="animate-pulse text-blue-400">Fetching Info...</span>}
           </div>
           <div className="flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Paste URL (YouTube, Vimeo...)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white outline-none focus:border-blue-500 transition"
              />
              <input 
                type="text" 
                placeholder="Video Title (Optional)"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white outline-none focus:border-blue-500 transition"
              />
              <div className="text-[9px] text-neutral-500 px-1 mt-1 leading-relaxed">
                 <span className="text-blue-500 font-bold uppercase tracking-tight mr-1">Tip:</span> 
                 Some sites (like Pixabay) block embedding. Try to find a "Direct Link" or "Embed" URL if it fails to load.
              </div>
           <div className="flex gap-2 mt-1">
              <button 
                type="submit"
                disabled={!videoUrl.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg transition shadow-lg border border-blue-400/20"
              >
                PREVIEW VIDEO
              </button>
              <button 
                type="button"
                onClick={() => { setVideoUrl(''); setVideoTitle(''); }}
                title="Clear URL Form"
                className="px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-500 hover:text-red-400 rounded-lg border border-neutral-700/50 transition flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
           </div>
          </div>
        </form>
      )}

      <AddButton />

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mt-2 border-t border-neutral-800/50 pt-4 px-1">
          {folderFiles
            .filter(f => f.name.toLowerCase().includes(localQuery.toLowerCase()))
            .map(file => {
               const isInService = checkInService(file.name);
               return (
                 <div 
                   key={file.name} 
                   onClick={() => handleGenericFileClick(file)}
                   className={`p-3 hover:bg-neutral-700/80 rounded-xl cursor-pointer border transition flex items-center justify-between gap-3 ${
                      isInService ? 'bg-green-950/20 border-green-500/30' : 'bg-neutral-800/40 border-transparent hover:border-neutral-600'
                   }`}
                 >
                   <div className="flex items-center gap-3 truncate">
                      {file.isDirectory ? <Layers size={16} className="text-blue-400 flex-shrink-0" /> : <FileText size={16} className="text-neutral-500 flex-shrink-0" />}
                      <div className="font-semibold text-xs text-neutral-300 truncate">{file.name}</div>
                   </div>
                   <div className="flex items-center gap-2">
                       {isInService && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                       <div 
                          onClick={(e) => handleDeleteGenericFile(e, file)}
                          className="p-1.5 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded-lg transition-colors"
                          title={`Delete ${activeTab.slice(0, -1)}`}
                       >
                          <Trash2 size={14} />
                       </div>
                    </div>
                 </div>
               )
          })}

          {folderFiles.length === 0 && (
             <div className="text-sm font-medium text-neutral-500 italic p-4 text-center bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed mt-4">
                 No files found.
             </div>
          )}
      </div>

      <ConfirmModal 
          isOpen={!!fileToDelete}
          title={`Delete ${activeTab.slice(0, -1)}?`}
          message={`Are you sure you want to permanently delete "${fileToDelete?.name}" from your ${activeTab} library?`}
          onConfirm={confirmDeleteGenericFile}
          onCancel={() => setFileToDelete(null)}
          confirmText="Delete File"
      />
    </div>
  );
}
