import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchBiblePassage, fetchLocalBiblePassage } from '../services/bibleService';
import { Book, Search, Loader2, ChevronRight, ChevronLeft, X } from 'lucide-react';

// Complete Bible book data with chapter counts
const BIBLE_BOOKS = [
  // Old Testament
  { name: 'Genesis', abbr: 'Gen', chapters: 50, testament: 'OT' },
  { name: 'Exodus', abbr: 'Exod', chapters: 40, testament: 'OT' },
  { name: 'Leviticus', abbr: 'Lev', chapters: 27, testament: 'OT' },
  { name: 'Numbers', abbr: 'Num', chapters: 36, testament: 'OT' },
  { name: 'Deuteronomy', abbr: 'Deut', chapters: 34, testament: 'OT' },
  { name: 'Joshua', abbr: 'Josh', chapters: 24, testament: 'OT' },
  { name: 'Judges', abbr: 'Judg', chapters: 21, testament: 'OT' },
  { name: 'Ruth', abbr: 'Ruth', chapters: 4, testament: 'OT' },
  { name: '1 Samuel', abbr: '1Sam', chapters: 31, testament: 'OT' },
  { name: '2 Samuel', abbr: '2Sam', chapters: 24, testament: 'OT' },
  { name: '1 Kings', abbr: '1Kgs', chapters: 22, testament: 'OT' },
  { name: '2 Kings', abbr: '2Kgs', chapters: 25, testament: 'OT' },
  { name: '1 Chronicles', abbr: '1Chr', chapters: 29, testament: 'OT' },
  { name: '2 Chronicles', abbr: '2Chr', chapters: 36, testament: 'OT' },
  { name: 'Ezra', abbr: 'Ezra', chapters: 10, testament: 'OT' },
  { name: 'Nehemiah', abbr: 'Neh', chapters: 13, testament: 'OT' },
  { name: 'Esther', abbr: 'Esth', chapters: 10, testament: 'OT' },
  { name: 'Job', abbr: 'Job', chapters: 42, testament: 'OT' },
  { name: 'Psalms', abbr: 'Ps', chapters: 150, testament: 'OT' },
  { name: 'Proverbs', abbr: 'Prov', chapters: 31, testament: 'OT' },
  { name: 'Ecclesiastes', abbr: 'Eccl', chapters: 12, testament: 'OT' },
  { name: 'Song of Solomon', abbr: 'Song', chapters: 8, testament: 'OT' },
  { name: 'Isaiah', abbr: 'Isa', chapters: 66, testament: 'OT' },
  { name: 'Jeremiah', abbr: 'Jer', chapters: 52, testament: 'OT' },
  { name: 'Lamentations', abbr: 'Lam', chapters: 5, testament: 'OT' },
  { name: 'Ezekiel', abbr: 'Ezek', chapters: 48, testament: 'OT' },
  { name: 'Daniel', abbr: 'Dan', chapters: 12, testament: 'OT' },
  { name: 'Hosea', abbr: 'Hos', chapters: 14, testament: 'OT' },
  { name: 'Joel', abbr: 'Joel', chapters: 3, testament: 'OT' },
  { name: 'Amos', abbr: 'Amos', chapters: 9, testament: 'OT' },
  { name: 'Obadiah', abbr: 'Obad', chapters: 1, testament: 'OT' },
  { name: 'Jonah', abbr: 'Jonah', chapters: 4, testament: 'OT' },
  { name: 'Micah', abbr: 'Mic', chapters: 7, testament: 'OT' },
  { name: 'Nahum', abbr: 'Nah', chapters: 3, testament: 'OT' },
  { name: 'Habakkuk', abbr: 'Hab', chapters: 3, testament: 'OT' },
  { name: 'Zephaniah', abbr: 'Zeph', chapters: 3, testament: 'OT' },
  { name: 'Haggai', abbr: 'Hag', chapters: 2, testament: 'OT' },
  { name: 'Zechariah', abbr: 'Zech', chapters: 14, testament: 'OT' },
  { name: 'Malachi', abbr: 'Mal', chapters: 4, testament: 'OT' },
  // New Testament
  { name: 'Matthew', abbr: 'Matt', chapters: 28, testament: 'NT' },
  { name: 'Mark', abbr: 'Mark', chapters: 16, testament: 'NT' },
  { name: 'Luke', abbr: 'Luke', chapters: 24, testament: 'NT' },
  { name: 'John', abbr: 'John', chapters: 21, testament: 'NT' },
  { name: 'Acts', abbr: 'Acts', chapters: 28, testament: 'NT' },
  { name: 'Romans', abbr: 'Rom', chapters: 16, testament: 'NT' },
  { name: '1 Corinthians', abbr: '1Cor', chapters: 16, testament: 'NT' },
  { name: '2 Corinthians', abbr: '2Cor', chapters: 13, testament: 'NT' },
  { name: 'Galatians', abbr: 'Gal', chapters: 6, testament: 'NT' },
  { name: 'Ephesians', abbr: 'Eph', chapters: 6, testament: 'NT' },
  { name: 'Philippians', abbr: 'Phil', chapters: 4, testament: 'NT' },
  { name: 'Colossians', abbr: 'Col', chapters: 4, testament: 'NT' },
  { name: '1 Thessalonians', abbr: '1Thess', chapters: 5, testament: 'NT' },
  { name: '2 Thessalonians', abbr: '2Thess', chapters: 3, testament: 'NT' },
  { name: '1 Timothy', abbr: '1Tim', chapters: 6, testament: 'NT' },
  { name: '2 Timothy', abbr: '2Tim', chapters: 4, testament: 'NT' },
  { name: 'Titus', abbr: 'Titus', chapters: 3, testament: 'NT' },
  { name: 'Philemon', abbr: 'Phlm', chapters: 1, testament: 'NT' },
  { name: 'Hebrews', abbr: 'Heb', chapters: 13, testament: 'NT' },
  { name: 'James', abbr: 'Jas', chapters: 5, testament: 'NT' },
  { name: '1 Peter', abbr: '1Pet', chapters: 5, testament: 'NT' },
  { name: '2 Peter', abbr: '2Pet', chapters: 3, testament: 'NT' },
  { name: '1 John', abbr: '1John', chapters: 5, testament: 'NT' },
  { name: '2 John', abbr: '2John', chapters: 1, testament: 'NT' },
  { name: '3 John', abbr: '3John', chapters: 1, testament: 'NT' },
  { name: 'Jude', abbr: 'Jude', chapters: 1, testament: 'NT' },
  { name: 'Revelation', abbr: 'Rev', chapters: 22, testament: 'NT' },
];

export default function BibleModule({ libraryHandle, systemTrigger, onSelectDocument }) {
  const [reference, setReference] = useState('');
  const [translation, setTranslation] = useState('kjv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localTranslations, setLocalTranslations] = useState([]);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Browser state
  const [browseBook, setBrowseBook] = useState(null); // selected book object or null
  const [showBrowser, setShowBrowser] = useState(false);
  const browserRef = useRef(null);

  useEffect(() => {
    const scanLocalBibles = async () => {
      if (!libraryHandle) return;
      try {
        const bibleFolder = await libraryHandle.getDirectoryHandle('Bible', { create: true });
        const list = [];
        for await (const entry of bibleFolder.values()) {
          if (entry.kind === 'directory') {
            list.push(entry.name);
          }
        }
        setLocalTranslations(list);
      } catch (err) {
        console.error("Failed to scan local bibles", err);
      }
    };
    scanLocalBibles();
  }, [libraryHandle, systemTrigger]);

  // Close suggestions and browser when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (browserRef.current && !browserRef.current.contains(e.target)) {
        setShowBrowser(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    const q = reference.trim().toLowerCase();
    if (!q) return [];
    return BIBLE_BOOKS.filter(b =>
      b.name.toLowerCase().startsWith(q) ||
      b.abbr.toLowerCase().startsWith(q)
    ).slice(0, 8);
  }, [reference]);

  const handleSearch = async (refOverride) => {
    const ref = refOverride || reference.trim();
    if (!ref || !libraryHandle) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      let data;
      const isLocal = localTranslations.includes(translation);
      
      if (isLocal) {
         data = await fetchLocalBiblePassage(libraryHandle, translation, ref);
      } else {
         data = await fetchBiblePassage(libraryHandle, ref, translation);
      }

      if (onSelectDocument) {
         onSelectDocument({ ...data, title: data.reference, id: data.reference });
      }
    } catch (err) {
      setError(err.message || 'Passage not found or network offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (book) => {
    setReference(book.name + ' ');
    setShowSuggestions(false);
    setHighlightIdx(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && suggestions[highlightIdx]) {
        handleSuggestionClick(suggestions[highlightIdx]);
      } else {
        handleSearch();
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBrowseChapter = (chapter) => {
    const ref = `${browseBook.name} ${chapter}`;
    setReference(ref);
    handleSearch(ref);
    setShowBrowser(false);
  };

  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'NT');

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
        <Book size={14} className="text-blue-400" />
        Bible Quick-Search
      </div>
      
      {/* Translation Picker */}
      <select 
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner appearance-none cursor-pointer"
      >
        <option value="kjv">KJV - King James Version</option>
        <option value="web">WEB - World English Bible</option>
        <option value="bbe">BBE - Bible in Basic English</option>
        {localTranslations.map(lt => (
          <option key={lt} value={lt}>{lt.toUpperCase()} (Local Library)</option>
        ))}
      </select>
      
      {/* Search Input with Autocomplete */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input 
            ref={inputRef}
            type="text" 
            placeholder="e.g. Psalm 23, John 3:16, Genesis 1-2"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setShowSuggestions(true);
              setHighlightIdx(-1);
            }}
            onFocus={() => { if (reference.trim()) setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-medium text-white pl-10 pr-4 py-3 outline-none focus:border-blue-500 transition shadow-inner"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          
          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {suggestions.map((book, i) => (
                <button
                  key={book.name}
                  onClick={() => handleSuggestionClick(book)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center justify-between transition-colors ${
                    i === highlightIdx 
                      ? 'bg-blue-600/30 text-white' 
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span>{book.name}</span>
                  <span className="text-[10px] text-neutral-500 font-bold">{book.chapters} ch</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button 
          type="button"
          onClick={() => handleSearch()}
          disabled={loading || !reference.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl font-extrabold transition flex items-center justify-center shadow-lg"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'FIND'}
        </button>
      </div>

      {error && <div className="text-red-400 font-medium text-xs text-center mt-1 bg-red-950/50 p-3 rounded-lg border border-red-900/50">{error}</div>}

      {/* ─── Browse-Style Picker ─── */}
      <div className="mt-1 relative" ref={browserRef}>
        <button 
          onClick={() => setShowBrowser(!showBrowser)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all shadow-inner ${showBrowser ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest flex-1 text-left line-clamp-1">
            <Book size={14} className={showBrowser ? "text-blue-400" : "text-emerald-400"} />
            {browseBook ? browseBook.name : "Browse Books"}
          </span>
          {browseBook && showBrowser ? (
            <div 
              onClick={(e) => { e.stopPropagation(); setBrowseBook(null); }}
              className="text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded transition flex items-center gap-1"
            >
              <ChevronLeft size={12} /> Back
            </div>
          ) : (
            <ChevronRight size={14} className={`transition-transform duration-200 ${showBrowser ? 'rotate-90 text-blue-400' : ''}`} />
          )}
        </button>

        {showBrowser && (
          <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {!browseBook ? (
              /* ── Book List ── */
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {/* Old Testament */}
                <div className="px-3 py-2 text-[9px] font-extrabold text-neutral-600 uppercase tracking-[0.2em] border-b border-neutral-800/50 bg-neutral-900/80 sticky top-0 z-10">
                  Old Testament
                </div>
                <div className="grid grid-cols-2 gap-px p-1">
                  {otBooks.map(book => (
                    <button
                      key={book.name}
                      onClick={() => setBrowseBook(book)}
                      className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-neutral-300 hover:bg-blue-600/20 hover:text-white transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{book.name}</span>
                      <ChevronRight size={12} className="text-neutral-700 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>

                {/* New Testament */}
                <div className="px-3 py-2 text-[9px] font-extrabold text-neutral-600 uppercase tracking-[0.2em] border-b border-t border-neutral-800/50 bg-neutral-900/80 sticky top-0 z-10">
                  New Testament
                </div>
                <div className="grid grid-cols-2 gap-px p-1">
                  {ntBooks.map(book => (
                    <button
                      key={book.name}
                      onClick={() => setBrowseBook(book)}
                      className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-neutral-300 hover:bg-blue-600/20 hover:text-white transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{book.name}</span>
                      <ChevronRight size={12} className="text-neutral-700 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Chapter Grid ── */
              <div className="flex flex-col max-h-[320px]">
                <div className="px-3 py-2.5 text-sm font-extrabold text-white border-b border-neutral-800/50 bg-neutral-900/80 flex items-center gap-2">
                  <Book size={14} className="text-blue-400" />
                  {browseBook.name}
                  <span className="text-[10px] text-neutral-500 font-bold ml-auto">{browseBook.chapters} chapters</span>
                </div>
                <div className="p-2 grid grid-cols-5 gap-1.5 overflow-y-auto custom-scrollbar">
                  {Array.from({ length: browseBook.chapters }, (_, i) => i + 1).map(ch => (
                    <button
                      key={ch}
                      onClick={() => handleBrowseChapter(ch)}
                      disabled={loading}
                      className="aspect-square flex items-center justify-center rounded-lg text-sm font-bold text-neutral-300 bg-neutral-800/50 hover:bg-blue-600 hover:text-white active:scale-95 transition-all duration-150 shadow-sm disabled:opacity-50"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
