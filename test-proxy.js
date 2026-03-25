const http = require('http');

http.get('http://localhost:5173/api/lyrics-ovh?artist=hillsong&title=oceans', (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log("OVH Status:", res.statusCode);
    console.log("OVH Body length:", body.length);
  });
}).on('error', err => console.error("OVH Request Error:", err));

http.get('http://localhost:5173/api/universal-search?q=amazing+grace', (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log("Universal Status:", res.statusCode);
    console.log("Universal Body length:", body.length);
  });
}).on('error', err => console.error("Universal Request Error:", err));
