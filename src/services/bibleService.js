import { balanceLines } from '../utils/songParser';

/**
 * Fetches Bible passage from bible-api.com, caches the JSON payload 
 * locally in the `/Bible` directory, and parses the text into balanced slides.
 */
export async function fetchBiblePassage(libraryHandle, reference, translation = 'kjv') {
  const bibleFolder = await libraryHandle.getDirectoryHandle('Bible', { create: true });
  
  // Create a safe, normalized filename for the local cache
  const safeRef = reference.replace(/[^a-zA-Z0-9\s:]/g, '').replace(/[:\s]/g, '-').toLowerCase();
  const filename = `${translation}-${safeRef}.json`;

  try {
    // 1. Check local cache first (Offline capability)
    const fileHandle = await bibleFolder.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    console.log(`Loaded ${reference} from local /Bible cache!`);
    return processBibleJson(JSON.parse(text));
  } catch (err) {
    // File doesn't exist locally, we must fetch it from the API
  }

  try {
    // 2. Fetch from External Provider
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`);
    if (!res.ok) throw new Error("Passage not found");
    const data = await res.json();
    
    // 3. Save JSON cache to local File System
    const fileHandle = await bibleFolder.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();

    return processBibleJson(data);
  } catch (err) {
    console.error("Bible fetch failed", err);
    throw err;
  }
}

/**
 * Parses a local book-based JSON structure (e.g. Genesis.json in /Bible/NIV/)
 */
export async function fetchLocalBiblePassage(libraryHandle, folderName, reference) {
  const bibleFolder = await libraryHandle.getDirectoryHandle('Bible');
  const transFolder = await bibleFolder.getDirectoryHandle(folderName);

  // Parse the reference into components. Supported formats:
  //   "Genesis 1"           → whole chapter
  //   "Genesis 1-3"         → chapter range
  //   "Genesis 1:5"         → single verse
  //   "Genesis 1:5-10"      → verse range (same chapter)
  //   "Genesis 1:13-2:10"   → cross-chapter verse range
  const parsed = parseReference(reference);
  if (!parsed) throw new Error("Invalid reference format. Try: Genesis 1, Genesis 1-2, Genesis 1:5-10, or Genesis 1:13-2:10");

  const { bookName } = parsed;

  // Find matching book file in the local translation folder
  let fileHandle;
  for await (const entry of transFolder.values()) {
    if (entry.kind === 'file' && entry.name.toLowerCase().includes(bookName.toLowerCase())) {
      fileHandle = entry;
      break;
    }
  }

  if (!fileHandle) throw new Error(`Book "${bookName}" not found in local ${folderName} folder`);

  const file = await fileHandle.getFile();
  const data = JSON.parse(await file.text());

  let allVerses = [];

  if (parsed.type === 'whole_chapter') {
    // e.g. "Genesis 1"
    const chapter = data.chapters.find(c => c.chapter.toString() === parsed.startChapter.toString());
    if (!chapter) throw new Error(`Chapter ${parsed.startChapter} not found in ${bookName}`);
    allVerses = chapter.verses;

  } else if (parsed.type === 'chapter_range') {
    // e.g. "Genesis 1-3"
    const startCh = parseInt(parsed.startChapter);
    const endCh = parseInt(parsed.endChapter);
    for (let ch = startCh; ch <= endCh; ch++) {
      const chapter = data.chapters.find(c => parseInt(c.chapter) === ch);
      if (chapter) allVerses.push(...chapter.verses);
    }

  } else if (parsed.type === 'verse_range_same') {
    // e.g. "Genesis 1:5" or "Genesis 1:5-10"
    const chapter = data.chapters.find(c => c.chapter.toString() === parsed.startChapter.toString());
    if (!chapter) throw new Error(`Chapter ${parsed.startChapter} not found in ${bookName}`);
    const start = parseInt(parsed.startVerse);
    const end = parsed.endVerse ? parseInt(parsed.endVerse) : start;
    allVerses = chapter.verses.filter(v => {
      const vn = parseInt(v.verse);
      return vn >= start && vn <= end;
    });

  } else if (parsed.type === 'cross_chapter') {
    // e.g. "Genesis 1:13-2:10"
    const startCh = parseInt(parsed.startChapter);
    const endCh = parseInt(parsed.endChapter);
    const startV = parseInt(parsed.startVerse);
    const endV = parseInt(parsed.endVerse);

    for (let ch = startCh; ch <= endCh; ch++) {
      const chapter = data.chapters.find(c => parseInt(c.chapter) === ch);
      if (!chapter) continue;
      
      let verses = chapter.verses;
      if (ch === startCh) {
        verses = verses.filter(v => parseInt(v.verse) >= startV);
      } else if (ch === endCh) {
        verses = verses.filter(v => parseInt(v.verse) <= endV);
      }
      allVerses.push(...verses);
    }
  }

  if (allVerses.length === 0) throw new Error("No verses found for this range");

  return processBibleJson({
    reference: reference,
    translation_id: folderName.toUpperCase(),
    verses: allVerses
  });
}

/**
 * Parses a Bible reference string into structured components.
 * Returns null if the format is not recognized.
 */
function parseReference(ref) {
  ref = ref.trim();

  // Cross-chapter verse range: "Genesis 1:13-2:10"
  let m = ref.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)$/);
  if (m) return { bookName: m[1], type: 'cross_chapter', startChapter: m[2], startVerse: m[3], endChapter: m[4], endVerse: m[5] };

  // Verse range same chapter: "Genesis 1:5-10"
  m = ref.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+)$/);
  if (m) return { bookName: m[1], type: 'verse_range_same', startChapter: m[2], startVerse: m[3], endVerse: m[4] };

  // Single verse: "Genesis 1:5"
  m = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (m) return { bookName: m[1], type: 'verse_range_same', startChapter: m[2], startVerse: m[3], endVerse: null };

  // Chapter range: "Genesis 1-2"
  m = ref.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)$/);
  if (m) return { bookName: m[1], type: 'chapter_range', startChapter: m[2], endChapter: m[3] };

  // Whole chapter: "Genesis 1"
  m = ref.match(/^(.+?)\s+(\d+)$/);
  if (m) return { bookName: m[1], type: 'whole_chapter', startChapter: m[2] };

  return null;
}

export function processBibleJson(data) {
  // data format: { reference: 'John 3:16', translation_id: 'kjv', verses: [{ verse: 16, text: "..." }] }
  const slides = [];
  let slideIndex = 1;

  for (const v of data.verses) {
    // To ensure maximum 4 lines per slide, we must split the paragraph if it's too long
    // A heuristic: split sentences by punctuation + space.
    const rawLines = v.text
      .replace(/([.?!;")])\s+(?=[A-Z"'])/g, "$1\n")
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '');
    
    // Fallback if the sentence itself is massive and didn't split (very rare in english bibles)
    // we just let CSS handle word-wrap, but balanceLines ensures the ARRAY length is balanced.
    
    const chunks = balanceLines(rawLines);
    chunks.forEach(chunk => {
      slides.push({
        type: `Verse ${v.verse}`,
        content: chunk,
        index: slideIndex++
      });
    });
  }

  return {
    reference: data.reference,
    translation: data.translation_id || 'KJV',
    slides
  };
}
