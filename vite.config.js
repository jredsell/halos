import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Simple in-memory broadcast hub for local network sync
const halosBroadcastPlugin = () => {
  let currentLiveState = null;
  let currentMedia = null;
  let currentMediaType = 'image/png';
  
  return {
    name: 'halos-broadcast',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];
        
        // State Endpoint
        if (url === '/api/live') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                currentLiveState = JSON.parse(body);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
            return;
          } else if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(currentLiveState || {}));
            return;
          }
        }

        // Media Proxy Endpoint (for Blobs)
        if (url === '/api/media') {
           if (req.method === 'POST') {
             const chunks = [];
             req.on('data', chunk => chunks.push(chunk));
             req.on('end', () => {
               currentMedia = Buffer.concat(chunks);
               currentMediaType = req.headers['content-type'] || 'image/png';
               res.end(JSON.stringify({ success: true }));
             });
             return;
           } else if (req.method === 'GET') {
             if (currentMedia) {
               const range = req.headers.range;
               if (range) {
                 const parts = range.replace(/bytes=/, "").split("-");
                 const partialstart = parts[0];
                 const partialend = parts[1];
                 
                 const start = parseInt(partialstart, 10);
                 const end = partialend ? parseInt(partialend, 10) : currentMedia.length - 1;
                 const chunksize = (end - start) + 1;
                 
                 res.writeHead(206, {
                   'Content-Range': `bytes ${start}-${end}/${currentMedia.length}`,
                   'Accept-Ranges': 'bytes',
                   'Content-Length': chunksize,
                   'Content-Type': currentMediaType,
                 });
                 res.end(currentMedia.slice(start, end + 1));
               } else {
                 res.writeHead(200, {
                   'Content-Length': currentMedia.length,
                   'Content-Type': currentMediaType,
                 });
                 res.end(currentMedia);
               }
             } else {
               res.statusCode = 404;
               res.end();
             }
             return;
           }
        }
        // SongSelect Search Proxy
        if (url === '/api/songselect-search') {
           const urlObj = new URL(req.url, `http://${req.headers.host}`);
           const query = urlObj.searchParams.get('q');
           
           if (!query) {
             res.end(JSON.stringify({ error: 'Missing query' }));
             return;
           }

           const searchUrl = `https://songselect.ccli.com/search/results?searchterm=${encodeURIComponent(query)}`;
           
           try {
             // Spoof standard browser headers to bypass CCLI Cloudflare walls
             const result = await fetch(searchUrl, {
               headers: {
                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                 'Accept-Language': 'en-US,en;q=0.5'
               }
             });
             const body = await result.text();
             res.setHeader('Content-Type', 'text/html');
             res.end(body);
           } catch (e) {
             res.statusCode = 500;
             res.end(JSON.stringify({ error: e.message }));
           }
           return;
        }

        // NEW: Lyrics.ovh Proxy
        if (url === '/api/lyrics-ovh') {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const artist = urlObj.searchParams.get('artist');
          const title = urlObj.searchParams.get('title');
          if (!artist || !title) {
            res.end(JSON.stringify({ error: 'Missing artist or title' }));
            return;
          }
          const targetUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
          
          try {
            const result = await fetch(targetUrl);
            const body = await result.text();
            res.setHeader('Content-Type', 'application/json');
            res.end(body);
          } catch(e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // NEW: Universal Web Search Proxy (DuckDuckGo Lite)
        if (url === '/api/universal-search') {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const query = urlObj.searchParams.get('q');
          if (!query) {
            res.end(JSON.stringify({ error: 'Missing query' }));
            return;
          }
          
          // Use Lite API, fetch will natively follow the 302 redirects that https.get failed on
          const targetUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query + ' lyrics')}`;
          
          try {
            const result = await fetch(targetUrl, {
               headers: {
                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                 'Accept': 'text/html,application/xhtml+xml'
               }
            });
            const body = await result.text();
            res.setHeader('Content-Type', 'text/html');
            res.end(body);
          } catch(e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        next();
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  base: '/Halos/',
  server: {
    host: true, // Expose to local network automatically
  },
  plugins: [
    halosBroadcastPlugin(),
    tailwindcss(),
    react(),
  ],
})
