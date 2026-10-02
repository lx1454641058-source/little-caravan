// Local-only preview server; original implementation. SPDX-License-Identifier: MIT
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
// Only explicitly listed game assets can be served; no workspace browsing.
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/engine.js': ['engine.js', 'text/javascript'], '/art.js': ['art.js', 'text/javascript'], '/sound.js': ['sound.js', 'text/javascript'], '/app.js': ['app.js', 'text/javascript'] };
const port = Number(process.env.CARAVAN_PORT || 4173);
files['/treasure.js']=['treasure.js','text/javascript'];
files['/home.js']=['home.js','text/javascript'];
files['/storage.js'] = ['storage.js', 'text/javascript'];
files['/diagnostics.js'] = ['diagnostics.js', 'text/javascript'];
for (const name of ['caravan-town-023','caravan-harbor-023','caravan-harvest-023','caravan-atlas-023','cat-motion-025',...['goods','treasures','actors','decor','botanical','caravan','road','home','night','water','table','drive','clay'].map(name=>'paint-'+name+'-024')]) files['/assets/'+name+'.png'] = ['assets/'+name+'.png', 'image/png'];
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid CARAVAN_PORT');
http.createServer((req, res) => {
  const entry = files[new URL(req.url, 'http://127.0.0.1').pathname];
  if (!entry || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, entry[0]), (error, data) => { if (error) { res.writeHead(500); res.end('Unable to load game'); return; } res.writeHead(200, { 'Content-Type': entry[1] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(req.method === 'HEAD' ? undefined : data); });
}).listen(port, '127.0.0.1', () => console.log(`Caravan game: http://127.0.0.1:${port}`));
