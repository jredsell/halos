export async function verifyPermission(fileHandle, readWrite = true) {
  const options = { mode: readWrite ? 'readwrite' : 'read' }
  if ((await fileHandle.queryPermission(options)) === 'granted') return true
  if ((await fileHandle.requestPermission(options)) === 'granted') return true
  return false
}

export async function reResolveMedia(items, library) {
  if (!library || !items) return items;
  const newItems = [...items];
  for (let i = 0; i < newItems.length; i++) {
    const item = newItems[i];
    if (!item.folder || !item.filename) continue;
    
    try {
      const dirHandle = await library.getDirectoryHandle(item.folder);
      if (item.type === 'slide_deck') {
         const subDir = await dirHandle.getDirectoryHandle(item.filename);
         const imgArray = [];
         for await (const entry of subDir.values()) {
            if (entry.kind === 'file' && entry.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
               const file = await entry.getFile();
               imgArray.push({ name: entry.name, url: URL.createObjectURL(file) });
            }
         }
         imgArray.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
         newItems[i] = { ...item, images: imgArray.map(img => ({ url: img.url })) };
      } else if (item.folder !== 'Bible' && !item.isExternal) {
         const fileHandle = await dirHandle.getFileHandle(item.filename);
         const file = await fileHandle.getFile();
         const url = URL.createObjectURL(file);
         newItems[i] = { ...item, url, images: item.type === 'image' ? [{ url }] : undefined };
      }
    } catch (err) {
      console.warn(`Failed to re-resolve media: ${item.filename}`, err);
    }
  }
  return newItems;
}

export function getYoutubeEmbedUrl(url) {
  if (!url) return '';
  const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|\/embed\/))([^?&]+)/)?.[1];
  if (!videoId) return url;
  
  const origin = window.location.origin.replace(/\/$/, ""); // Clean origin
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    controls: '0',
    origin: origin,
    widget_referrer: origin,
    autoplay: '0'
  });
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function formatVerseRanges(numbers) {
  if (numbers.length === 0) return "";
  numbers.sort((a, b) => a - b);
  const ranges = [];
  let start = numbers[0];
  let end = numbers[0];
  for (let i = 1; i <= numbers.length; i++) {
    if (i < numbers.length && numbers[i] === end + 1) {
      end = numbers[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      if (i < numbers.length) {
        start = numbers[i];
        end = numbers[i];
      }
    }
  }
  return ranges.join(', ');
}
