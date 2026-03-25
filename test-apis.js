const https = require('https');

function testEndpoint(name, url, headers = {}) {
  const req = https.get(url, { headers }, (res) => {
    console.log(`[${name}] Status:`, res.statusCode);
    if (res.headers.location) {
        console.log(`[${name}] Location Redirect:`, res.headers.location);
    }
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log(`[${name}] Body Length:`, body.length));
  });
  req.on('error', err => console.error(`[${name}] Error:`, err.message));
  req.setTimeout(5000, () => {
     console.error(`[${name}] TIMEOUT!`);
     req.destroy();
  });
}

testEndpoint('CCLI', 'https://songselect.ccli.com/search/results?searchterm=amazing%20grace');
testEndpoint('DuckDuckGo lite', 'https://duckduckgo.com/lite/?q=amazing%20grace');
testEndpoint('DuckDuckGo html', 'https://html.duckduckgo.com/html/?q=amazing%20grace');
testEndpoint('LyricsOVH', 'https://api.lyrics.ovh/v1/hillsong/oceans');
