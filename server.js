'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { WebSocketServer } = require('ws');
const { Room, MAXH } = require('./game.js');

const PORT = process.env.PORT || 3000, MAX_ROOMS = +process.env.MAX_ROOMS || 2;

// Only these files are public (everything lives in the repo root, no folders).
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/shared.js': 'shared.js', '/render.js': 'render.js', '/client.js': 'client.js' };
const TYPES = { html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8' };
const cache = {};
for (const f of new Set(Object.values(FILES))) {
  const buf = fs.readFileSync(path.join(__dirname, f));
  cache[f] = { raw: buf, gz: zlib.gzipSync(buf, { level: 9 }), type: TYPES[f.split('.').pop()] };
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const f = FILES[url];
  if (!f) { res.writeHead(404); return res.end('Not found'); }
  const c = cache[f], gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, { 'Content-Type': c.type, 'Cache-Control': 'no-cache', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
  res.end(gz ? c.gz : c.raw);
});

const wss = new WebSocketServer({ server, maxPayload: 8192, perMessageDeflate: false });
const rooms = [];
let roomId = 1;

function pickRoom() {
  // 1) a lobby that is still waiting, 2) a running match with a free slot (human replaces a bot), 3) a new room
  let r = rooms.find(r => r.phase === 'lobby' && r.humans.length < MAXH && r.humans.length > 0)
    || rooms.find(r => r.phase !== 'lobby' && r.humans.length < MAXH)
    || rooms.find(r => r.phase === 'lobby' && r.humans.length < MAXH);
  if (!r && rooms.length < MAX_ROOMS) { r = new Room(roomId++); rooms.push(r); }
  return r;
}

wss.on('connection', ws => {
  let room = null, me = null, count = 0, alive = true;
  const send = (o, drop) => {
    if (ws.readyState !== 1) return;
    if (drop && ws.bufferedAmount > 150000) return; // slow client: skip snapshots instead of lagging more
    ws.send(typeof o === 'string' ? o : JSON.stringify(o));
  };
  const rl = setInterval(() => { count = 0; }, 1000);
  ws.on('pong', () => { alive = true; });
  ws.on('message', data => {
    if (++count > 150) return;
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (!me) {
      if (m.t !== 'join') return;
      room = pickRoom();
      if (!room) { send({ t: 'busy' }); ws.close(); return; }
      me = room.addHuman(send, m.name);
      if (!me) { send({ t: 'busy' }); ws.close(); return; }
      send({ t: 'joined', id: me.id, room: room.id });
      if (room.phase !== 'match') room.sendLobby();
      return;
    }
    try { room.onMsg(me, m); } catch (e) { console.error('msg error', e); }
  });
  ws.on('close', () => { clearInterval(rl); if (room && me) room.removeHuman(me); me = null; });
  ws.on('error', () => { });
  ws._hb = setInterval(() => { if (!alive) return ws.terminate(); alive = false; try { ws.ping(); } catch (e) { } }, 25000);
  ws.on('close', () => clearInterval(ws._hb));
});

// Fixed 20 Hz simulation. Rooms with nobody in them do no work and are dropped.
let last = process.hrtime.bigint();
setInterval(() => {
  const now = process.hrtime.bigint(), dt = Math.min(.1, Number(now - last) / 1e9); last = now;
  for (let i = rooms.length - 1; i >= 0; i--) {
    const r = rooms[i];
    try { r.tick(dt); } catch (e) { console.error('tick error', e); }
    if (!r.humans.length && r.phase === 'lobby' && rooms.length > 1) rooms.splice(i, 1);
  }
}, 50);

server.listen(PORT, () => console.log('Front Line listening on', PORT));
