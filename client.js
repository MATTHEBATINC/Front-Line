'use strict';
// ===== Front Line Online client: controls + networking. Rendering lives in render.js =====
const MATCH_LEN = 600, BLUE = 0;
let ws = null, myId = 0, myTm = 0, sq = 0, inMatch = 0, run = 0, waitSp = 0, spReq = 0, meAlive = 0, deadAt = 0, lobby = null, mySkip = 0, skipInfo = [0, 1], ping = 0, scr = 'name', boardOn = 0, boardT = 0, ended = 0;
const ents = new Map(); let snaps = [], off = null;
let lw = 0, pr = 0, eq = 0;
const P = { x: 0, y: 0, z: 0, vy: 0, hp: 100, a: 0, r: 0, cd: 0 };
let yaw = 0, pitch = 0, F = 0, ads = 0, ak = 0, kick = 0, ft = 0, hm = 0, dm = 0, rt = 0, jx = 0, jy = 0, jmp = 0, nolock = 0, Rb = 0, sk2 = 0, rt0 = 0, lnd = 0, spr = 0, kT = 0, kH = 0, msT = 0, hdT = 0, HX = 0, HZ = 0, kfT = 0, tossCd = 0, radT = 0, curGun = null;
let ks = 0, uav = 0, jug = 0, dd = 0, spd = 0, shd = 0, inv = 0, gc = 0, ARM = 0, tl = MATCH_LEN, TS = [0, 0], KF = [];
let dsh = 0, dsc = 0, fsT = 0, fsa = 1, hbT = 0, lpx = 0, lpz = 0, drw = 0, lyw = 0, lpt = 0, swx = 0, swy = 0, WN2 = null;
const STK = { 2: 'Adrenaline', 3: 'UAV', 4: 'Body armor', 5: 'Airstrike', 6: 'Sentry', 7: 'Care package', 8: 'Resupply', 9: 'Juggernaut', 10: 'Helicopter', 11: 'Mortar', 12: 'Nuke', 14: 'Last stand' }, STL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14];
const GRM = [], MNM = new Map(), PUM = new Map();
const K = {}, hpE = $('hp'), wvE = $('wv'), amE = $('am'), hmE = $('hm'), dmE = $('dmg'), msE = $('msg'), kfE = $('kf'), scE = $('sc'), crE = $('cr'), hdE = $('hd'), fwE = $('fw'), netE = $('net'), armE = $('arb'), ksE = $('ksb'), rc2 = $('rd').getContext('2d');
const st = (el, s) => { if (el._v !== s) { el.textContent = s; el._v = s; } };
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const r2 = v => Math.round(v * 100) / 100, tmv = new T.Vector3(), tmv2 = new T.Vector3();
function msg(s, t) { st(msE, s); msT = t; }

// ---------- audio ----------
let AC, NB;
function au() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); NB = AC.createBuffer(1, AC.sampleRate * .15, AC.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); } catch (e) { } } }
function sh(v, f) { if (!AC || v <= .01) return; const s = AC.createBufferSource(), g = AC.createGain(), l = AC.createBiquadFilter(); s.buffer = NB; l.frequency.value = f; g.gain.value = v; s.connect(l); l.connect(g); g.connect(AC.destination); s.start(); }
function bp(f, v) { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime; o.frequency.value = f; g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + .1); o.connect(g); g.connect(AC.destination); o.start(); o.stop(n + .1); }
const distTo = (x, z) => Math.hypot(x - P.x, z - P.z);

// ---------- screens ----------
const SCR = ['s_name', 's_lobby', 's_load', 's_end', 's_pause'];
function showScr(id, title, sub) { scr = id; SCR.forEach(s => $(s).classList.toggle('on', s === id)); $('menu').style.display = 'flex'; if (title) $('ti').textContent = title; $('sub').textContent = sub || ''; }
function hideMenu() { scr = ''; $('menu').style.display = 'none'; }
function skipText() { const a = skipInfo; return (inMatch && !ended ? 'Skip match time' : 'Start now') + ' (' + a[0] + '/' + a[1] + ')'; }
function skipUI() { for (const id of ['lskip', 'mskip', 'pskip', 'skh']) { const e = $(id); st(e, skipText()); e.classList.toggle('on', !!mySkip); } $('skh').style.display = (M && inMatch && !ended && !scr) ? 'block' : 'none'; $('tbb').style.display = (M && inMatch && !ended && !scr) ? 'block' : 'none'; }
function toggleSkip() { send({ t: 'skip' }); mySkip = mySkip ? 0 : 1; skipUI(); if (inMatch) msg(mySkip ? 'Voted to skip match time' : 'Skip vote removed', 1.4); }
['lskip', 'mskip', 'pskip', 'skh'].forEach(id => $(id).onclick = toggleSkip);

function votesUI(el) {
  if (!el._b) { el._b = SH.MP.map((m, i) => { const b = document.createElement('button'); b.onclick = () => send({ t: 'vote', m: i }); el.appendChild(b); return b; }); }
  const v = lobby ? lobby.v : [], mx = Math.max(0, ...v);
  el._b.forEach((b, i) => { const n = v[i] || 0, t = SH.MP[i].n + '|' + n + '|' + (mx > 0 && n === mx ? 1 : 0); if (b._t !== t) { b._t = t; b.innerHTML = SH.MP[i].n + '<small>' + n + ' vote' + (n == 1 ? '' : 's') + (mx > 0 && n === mx ? ' - leading' : '') + '</small>'; } b.className = lobby && lobby.my === i ? 'on' : ''; });
}
function lobbyUI() {
  if (!lobby) return; const c = lobby.cd, s = Math.floor(c / 60) + ':' + ('0' + (c % 60)).slice(-2);
  if (scr === 's_lobby') { st($('lcd'), s); st($('lcount'), lobby.n + ' / ' + lobby.max + ' players. Empty slots become bots when the timer ends.'); st($('lnames'), lobby.names.join(', ')); votesUI($('mv')); }
  if (scr === 's_end') { st($('endcd'), 'Back to lobby in ' + c + 's'); votesUI($('mv2')); }
  skipUI();
}
// graphics buttons
{ const gf = $('gf'); [['low', 'Low'], ['med', 'Medium'], ['high', 'High']].forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.className = k === GFX ? 'on' : ''; b.onclick = () => { if (k === GFX) return; try { localStorage.setItem('fl_gfx', k); } catch (e) { } location.reload(); }; gf.appendChild(b); }); }
// loadout buttons
{
  const mkRow = (el, names, get, set) => names.forEach((n, i) => { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { set(i); [...el.children].forEach((c, j) => c.className = j == i ? 'on' : ''); }; el.appendChild(b); });
  mkRow($('lo'), W.map(w => w.n), 0, i => lw = i); mkRow($('pk'), ['Armor: less damage', 'Marathon: faster', 'Scavenger: more ammo and frags', 'Deadeye: stronger aim lock', 'Vampire: heal on kills', 'Blast Shield: less explosion damage'], 0, i => pr = i); mkRow($('eq'), ['Frag grenades', 'Smoke grenades', 'Proximity mines'], 0, i => eq = i);
  ['lo', 'pk', 'eq'].forEach(id => $(id).children[0].className = 'on');
}
$('ctl').textContent = M ? 'Left thumb moves, right thumb aims. Fire, Reload, Aim and Jump are on the right, Frag and Knife on the left. Landscape works best.' : 'WASD move, mouse aim, click fire, right-click aim, R reload, G equipment, V knife, Space jump, Shift sprint, Q dash, hold Tab for the scoreboard, K to vote to skip the match time.';
$('nm').value = (() => { try { return localStorage.getItem('fl_name') || ''; } catch (e) { return ''; } })();

// ---------- networking ----------
function connect() {
  au(); const name = ($('nm').value.trim() || 'Player').slice(0, 14); try { localStorage.setItem('fl_name', name); } catch (e) { }
  $('play').disabled = true; $('cs').textContent = 'Connecting... a sleeping free server can take about a minute to wake up.';
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => send({ t: 'join', name });
  ws.onmessage = e => { try { onNet(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  ws.onclose = () => { run = 0; inMatch = 0; if (document.exitPointerLock) document.exitPointerLock(); resetWorldState(); $('play').disabled = false; $('cs').textContent = 'Disconnected from the server. Press Play to reconnect.'; showScr('s_name', 'Front Line', 'Online 10 vs 10'); };
}
$('play').onclick = connect;
setInterval(() => { if (ws && ws.readyState === 1) send({ t: 'p', c: performance.now() }); }, 2000);
setInterval(() => { if (inMatch && meAlive && !ended && ws && ws.readyState === 1) send({ t: 'in', q: sq, p: [r2(P.x), r2(P.y), r2(P.z), r2(yaw), r2(pitch), lw, ads || F ? 1 : 0] }); }, 50);

function resetWorldState() {
  ents.forEach(dropE); ents.clear(); snaps = []; off = null; GRM.forEach(g => S.remove(g.m)); GRM.length = 0; MNM.forEach(m => S.remove(m)); MNM.clear(); PUM.forEach(p => S.remove(p.m)); PUM.clear(); clearTemp(); clearAir();
  inMatch = 0; run = 0; meAlive = 0; ended = 0; waitSp = 0; mySkip = 0; ks = uav = jug = dd = spd = shd = ARM = 0; gn.visible = false; kg.visible = false; scE.style.opacity = 0;
}
function onNet(m) {
  switch (m.t) {
    case 'joined': myId = m.id; $('cs').textContent = ''; if (!inMatch) showScr('s_lobby', 'Lobby', 'Waiting for players'); break;
    case 'busy': $('cs').textContent = 'All game rooms are full right now. Try again in a minute.'; $('play').disabled = false; break;
    case 'lobby': lobby = m; skipInfo = m.sk; mySkip = m.sk[2]; if (m.ph === 'lobby' && scr !== 's_lobby' && !inMatch) showScr('s_lobby', 'Lobby', 'Waiting for players'); lobbyUI(); break;
    case 'tolobby': resetWorldState(); if (document.exitPointerLock) document.exitPointerLock(); showScr('s_lobby', 'Lobby', 'Waiting for players'); lobbyUI(); break;
    case 'start': onStart(m); break;
    case 'ros': (m.rm || []).forEach(id => { const e = ents.get(id); if (e) { dropE(e); ents.delete(id); } }); (m.add || []).forEach(r => addEnt(r)); break;
    case 's': onSnap(m); break;
    case 'sp': P.x = m.x; P.z = m.z; P.y = m.y; P.vy = 0; sq = m.sq; P.hp = 100; startLife(); break;
    case 'tp': P.x = m.x; P.z = m.z; sq = m.sq; break;
    case 'dead': die(m); break;
    case 'hu': HX = m.x; HZ = m.z; hdT = 1.2; break;
    case 'm': msg(m.s, m.d); if (m.c) { bp(660, .12); setTimeout(() => bp(880, .12), 90); setTimeout(() => bp(1320, .14), 180); } break;
    case 'ammo': P.r = m.full ? W[lw].r : Math.min(W[lw].r, P.r + Math.ceil(W[lw].r / 3)); bp(900, .2); break;
    case 'board': renderBoard(m.rows, m.TS); break;
    case 'q': ping = Math.round(performance.now() - m.c); break;
    case 'end': onEnd(m); break;
  }
}
function addEnt(r) { const [id, tm2, name, bot, wp, hv] = r; if (id === myId || ents.has(id)) return; const e = mkE(id, tm2, name, wp, tm2 === myTm, hv); ents.set(id, e); }
function onStart(m) {
  resetWorldState(); myId = m.you.id; myTm = m.you.tm; buildWorld(m.map); m.roster.forEach(addEnt); TS = m.TS; tl = m.tl; inMatch = 1; ended = 0; sq = 0;
  P.x = 0; P.z = myTm ? -50 : 50; P.y = SH.hY(world, P.x, P.z); P.vy = 0; yaw = myTm ? Math.PI : 0; pitch = 0; rt0 = 0;
  showScr('s_load', 'Map: ' + world.m.n, 'You are on the ' + (myTm ? 'RED' : 'BLUE') + ' team. Pick a loadout and perk, then deploy. Streaks: 2 adrenaline, 3 UAV, 4 armor, 5 airstrike, 6 sentry, 7 care package, 8 resupply, 9 juggernaut, 10 helicopter, 11 mortar, 12 nuke, 14 last stand.'); $('go').textContent = 'Deploy'; $('go').disabled = false; skipUI();
}
function onEnd(m) {
  ended = 1; run = 0; meAlive = 0; F = 0; ads = 0; gn.visible = false; if (document.exitPointerLock) document.exitPointerLock(); TS = m.TS; boardOn = 0; $('board').style.display = 'none';
  const w = TS[0] === TS[1] ? 'Draw' : (TS[0] > TS[1]) === (myTm === 0) ? 'Victory' : 'Defeat';
  showScr('s_end', w, 'Blue ' + TS[0] + ' - Red ' + TS[1]); const eb = $('endboard'); eb.innerHTML = ''; boardTables(eb, m.board, TS); skipUI();
}
function startLife() {
  waitSp = 0; meAlive = 1; run = 1; const w = W[lw]; P.a = w.m; P.r = (w.r * (pr == 2 ? 1.5 : 1)) | 0; if (curGun) curGun.visible = false; curGun = gunFor(lw); curGun.visible = true; fl.position.z = w.fz;
  rt = 0; ft = 0; kick = 0; ads = 0; P.cd = 0; drw = .6; $('gb').textContent = ['Frag', 'Smoke', 'Mine'][eq]; gn.visible = true; hideMenu(); skipUI(); msg('Deployed', 1);
}
function die(m) {
  if (!meAlive) return; meAlive = 0; run = 0; F = 0; ads = 0; deadAt = performance.now(); gn.visible = false; scE.style.opacity = 0; if (document.exitPointerLock) document.exitPointerLock();
  showScr('s_load', 'You were eliminated', 'Killed by ' + m.by + (m.w ? ' (' + m.w + ')' : '') + '. Blue ' + TS[0] + ' - Red ' + TS[1] + '. Choose your next loadout.'); $('go').textContent = 'Respawn'; $('go').disabled = true; setTimeout(() => { if (scr === 's_load') $('go').disabled = false; }, 1600); skipUI();
}

// ---------- snapshots ----------
function onSnap(m) {
  const now = performance.now(), o = now - m.ts; off = off === null ? o : off + (o - off) * .1;
  const mp = new Map(); for (const a of m.e) mp.set(a[0], a); snaps.push({ t: m.ts, m: mp }); if (snaps.length > 10) snaps.shift();
  TS = m.s; tl = m.tl; skipInfo = m.sk; const me = m.me;
  if (meAlive) { if (me[0] < P.hp - .5) { dm = .7; sh(.4, 500); } P.hp = me[0]; }
  ks = me[1]; uav = me[2]; jug = me[3]; dd = me[4]; spd = me[5]; shd = me[6]; inv = me[7]; gc = me[8]; mySkip = me[9]; ARM = me[10] || 0; skipUI();
  for (const v of m.v) onEv(v);
}
function onEv(v) {
  switch (v[0]) {
    case 'sh': { if (v[1] === myId) break; const e = ents.get(v[1]); if (!e) break; e.mt = .06; e.rc = 1; e.lf = tm; const d = distTo(e.x, e.z); sh(.3 * Math.max(0, 1 - d / 90), 2200);
      if (v.length > 2 && d < 90) { tmv.set(e.x - Math.sin(e.yw) * .6, e.y + 1.45, e.z - Math.cos(e.yw) * .6); tmv2.set(v[2], v[3], v[4]); tracer(tmv, tmv2); } break; }
    case 'bm': { tmv.set(v[1], v[2], v[3]); boomFx(tmv.clone(), v[4]); const d = Math.hypot(P.x - v[1], P.z - v[3]); sh(Math.max(.2, 1 - d / 70), 500); shk = Math.max(shk, Math.min(1.2, (v[4] * 3 - d) / (v[4] * 3))); break; }
    case 'sm': smokeAt(v[1], v[2]); sh(.3, 700); break;
    case 'gr': { const m = new T.Mesh(sg, v[9] ? dk : dk); m.scale.setScalar(3); m.position.set(v[2], v[3], v[4]); S.add(m); GRM.push({ m, v: new T.Vector3(v[5], v[6], v[7]), t: v[8] }); break; }
    case 'mn': { const m = new T.Mesh(new T.CylinderGeometry(.5, .55, .12, 10), L(0x3a3f44)), l = new T.Mesh(sg, rm); l.position.y = .1; l.scale.setScalar(1.6); m.add(l); m.position.set(v[2], SH.hY(world, v[2], v[3]) + .07, v[3]); S.add(m); MNM.set(v[1], m); break; }
    case 'mx': { const m = MNM.get(v[1]); if (m) { S.remove(m); MNM.delete(v[1]); } break; }
    case 'pu': { const pw = v[2] > 1 && v[2] < 5, m = new T.Mesh(pw ? pg : DG, pm[v[2]]); m.scale.setScalar(pw ? 1.8 : 1); m.position.set(v[3], .5, v[4]); S.add(m); PUM.set(v[1], { m, k: v[2], x: v[3], z: v[4] }); break; }
    case 'px': { const p = PUM.get(v[1]); if (p) { S.remove(p.m); PUM.delete(v[1]); bp(1000, .06); } break; }
    case 'xb': killBarrel(v[1]); break;
    case 'k': { KF.unshift(v[1] ? v[1] + (v[5] ? ' [' + v[5] + ']' : '') + ' > ' + v[2] : v[2] + ' died'); KF.length = Math.min(KF.length, 4); kfE.innerHTML = KF.join('<br>'); kfT = 6; break; }
    case 'air': addPlane(v[1], v[2], v[3], 42, 75, SH.ZN * 1.4); sh(.4, 250); break;
    case 'care': callCareVis(v[1], v[2], v[3]); break;
    case 'heli': startHeli(v[1]); sh(.4, 150); break;
    case 'hf': tmv.set(v[1], v[2], v[3]); tmv2.set(v[4], v[5], v[6]); tracer(tmv, tmv2); spark(tmv2, 1); break;
    case 'nuke': startNuke(); sh(.8, 120); break;
    case 'nukeHit': nukeHit(); sh(1, 60); sh(1, 180); break;
    case 'sn': sentryAt(v[1], v[2], v[3], v[4], v[5]); break;
    case 'sx': sentryDel(v[1]); break;
    case 'sf': { const q = SENT.get(v[1]); if (q) { sentryAim(v[1], v[2], v[4]); tmv.set(q.g.position.x, q.g.position.y + .55, q.g.position.z); tmv2.set(v[2], v[3], v[4]); tracer(tmv, tmv2); sh(.15 * Math.max(0, 1 - distTo(q.g.position.x, q.g.position.z) / 80), 2500); } break; }
    case 'mw': if (QP.fx > .5) puff(new T.Vector3(v[1], .3 + SH.hY(world, v[1], v[2]), v[2]), 0xff4a3a, 14, .8); sh(.25, 300); break;
    case 'msg': msg(v[1], v[2]); break;
  }
}

// ---------- soldiers: interpolate snapshots + pose ----------
function syncEnts(dt) {
  if (!snaps.length || off === null) return;
  const rtm = performance.now() - off - 100; let a = snaps[0], b = snaps[0];
  if (rtm >= snaps[snaps.length - 1].t) a = b = snaps[snaps.length - 1]; else if (rtm > snaps[0].t) for (let i = snaps.length - 2; i >= 0; i--) if (snaps[i].t <= rtm) { a = snaps[i]; b = snaps[i + 1]; break; }
  const u = b.t > a.t ? Math.max(0, Math.min(1, (rtm - a.t) / (b.t - a.t))) : 1, cx = C.position.x, cz = C.position.z, far = S.fog.far + 6;
  for (const e of ents.values()) {
    let B = b.m.get(e.id), A = a.m.get(e.id); if (!B && !A) continue; if (!B) B = A; if (!A) A = B;
    const x = A[1] + (B[1] - A[1]) * u, z = A[2] + (B[2] - A[2]) * u, y = A[3] + (B[3] - A[3]) * u; let dy = B[4] - A[4]; dy -= Math.round(dy / 6.2832) * 6.2832; const yw = A[4] + dy * u, isDead = B[5] & 1;
    if (e.fresh) { e.fresh = 0; e.x = x; e.z = z; if (isDead) e.dead = 2; e.hp = B[6]; }
    const mvs = Math.hypot(x - e.x, z - e.z) / Math.max(dt, .001); e.mvv += (Math.min(1, mvs / 4.5) - e.mvv) * Math.min(1, dt * 8);
    e.x = x; e.z = z; e.y = y; e.yw = yw; e.aimT = (B[5] & 2) ? 1 : 0; setWp(e, B[7]);
    if (B[6] < e.hp) e.fk = .3; e.hp = B[6];
    if (isDead && !e.dead) e.dead = .001;
    else if (!isDead && e.dead) { e.dead = 0; e.age = 0; e.g.rotation.x = 0; e.a1.rotation.z = e.a2.rotation.z = e.l1.rotation.z = e.l2.rotation.z = 0; spawnFx(x, z, e.tm); }
    const d = Math.hypot(x - cx, z - cz);
    if (d > far && !e.dead) { e.g.visible = false; continue; }
    poseE(e, dt, d);
  }
}
function poseE(e, dt, d) {
  const g = e.g;
  if (e.dead) {
    e.dead += dt; if (e.dead > 1.5) { g.visible = false; return; } g.visible = true;
    const k = Math.min(1, e.dead * 3.2); g.rotation.x = k * 1.5; g.rotation.y = e.yw; g.position.set(e.x, Math.sin(Math.min(1, e.dead * 2.2) * Math.PI) * .3 + e.y, e.z);
    e.a1.rotation.z = k * 1.3; e.a2.rotation.z = -k * 1.3; e.l1.rotation.z = k * .3; e.l2.rotation.z = -k * .3; return;
  }
  g.visible = true; g.position.set(e.x, e.y, e.z); g.rotation.y = e.yw;
  if (e.age < .5) { e.age += dt; g.scale.setScalar(Math.min(1, .05 + e.age * 2)); } else if (g.scale.x !== 1) g.scale.setScalar(1);
  if (QP.lod) { const lite = d > QP.lod; if (e.isLite !== lite) { e.isLite = lite; e.hip.visible = !lite; e.lite.visible = lite; } if (lite) return; }
  if (QP.hq) { const far = d > 35; if (e.farF !== far) { e.farF = far; for (const m of e.small) m.visible = !far; } }
  const mv = e.mvv, B = e.aim += (e.aimT - e.aim) * Math.min(1, dt * 8); e.wk += dt * mv * 9.8;
  const w = Math.sin(e.wk) * mv; e.mt -= dt; e.rc = Math.max(0, e.rc - dt * 6); e.fk = Math.max(0, e.fk - dt * 3);
  e.l1.rotation.x = w * .9; e.l2.rotation.x = -w * .9; e.k1.rotation.x = -Math.max(0, -Math.sin(e.wk - .6)) * mv * 1.2; e.k2.rotation.x = -Math.max(0, Math.sin(e.wk - .6)) * mv * 1.2;
  e.hip.position.y = .95 + Math.abs(Math.cos(e.wk)) * .04 * mv + Math.sin(tm * 2 + e.ph) * .005;
  e.tr.rotation.x = -.1 * mv + e.fk * 1.2 - e.rc * .4; e.tr.rotation.y = -.15 * B + Math.sin(e.wk) * .1 * mv;
  e.a1.rotation.x = .8 + .55 * B - w * .15; e.a1.rotation.z = .5 * B; e.e1.rotation.x = .9 - .5 * B;
  e.a2.rotation.x = .9 + .45 * B + w * .15; e.a2.rotation.z = -.25 * B; e.e2.rotation.x = .9 - .4 * B;
  e.rf.position.z = -.3 + e.rc * .35; e.mf.visible = e.mt > 0; e.hd.rotation.x = -.05 + e.fk * .8;
}

// ---------- shooting (client finds hits, server verifies) ----------
function rayEnt(e, ox, oy, oz, dx, dy, dz, mx) {
  let best = mx, head = 0;
  const px = e.x - ox, py = e.y + 1.58 - oy, pz = e.z - oz, t = px * dx + py * dy + pz * dz;
  if (t > 0) { const q = px * px + py * py + pz * pz - t * t; if (q < .0576) { const tt = t - Math.sqrt(.0576 - q); if (tt < best) { best = Math.max(0, tt); head = 1; } } }
  const ax = ox - e.x, az = oz - e.z, A = dx * dx + dz * dz;
  if (A > 1e-6) { const Bq = ax * dx + az * dz, Cc = ax * ax + az * az - .2025, disc = Bq * Bq - A * Cc; if (disc >= 0) { const sq2 = Math.sqrt(disc); let tt = (-Bq - sq2) / A; if (tt < 0) tt = (-Bq + sq2) / A; if (tt > 0 && tt < best) { const yy = oy + dy * tt; if (yy >= e.y && yy <= e.y + 1.5) { best = tt; head = 0; } } } }
  return best < mx ? { t: best, head } : null;
}
function shoot(mv) {
  const w = W[lw]; P.a--; P.cd = w.cd; kick = 1; ft = .05; sh(w.v, w.f); casing(); mlt.intensity = 2.4; fl.rotation.z = Math.random() * 6; fl.scale.setScalar(.8 + Math.random() * .8);
  if (w.cd > .2 && QP.fx > .5) puff(gn.localToWorld(new T.Vector3(.1, -.04, w.fz)), 0xd0d0d0, 1.4, .55);
  const sp = (w.s + (mv ? w.s + .006 : 0) + (M ? .004 : 0)) * (ads ? .3 : 1), tf = Math.tan(C.fov * Math.PI / 360), o = C.position, hits = new Map(), br = []; let ex = null, tp = null, ht = 0;
  fl.getWorldPosition(tmv2); const mz = tmv2.clone(), dir = new T.Vector3();
  for (let q = 0; q < (w.p || 1); q++) {
    dir.set((Math.random() - .5) * sp * 2 * tf * C.aspect, (Math.random() - .5) * sp * 2 * tf, -1).normalize().applyQuaternion(C.quaternion);
    const wh = SH.rayBoxes(world, o.x, o.y, o.z, dir.x, dir.y, dir.z, 300); let bt = wh ? wh.t : 300, be = null;
    for (const e of ents.values()) { if (e.tm === myTm || e.dead || e.fresh) continue; const r = rayEnt(e, o.x, o.y, o.z, dir.x, dir.y, dir.z, bt); if (r && r.t < bt) { bt = r.t; be = { e, head: r.head }; } }
    if (!be && !wh) continue;
    const px = o.x + dir.x * bt, py = o.y + dir.y * bt, pz = o.z + dir.z * bt; tmv.set(px, py, pz);
    if (q < 3) tracer(mz, tmv); if (!tp) tp = [r2(px), r2(py), r2(pz)];
    if (w.x) { ex = [r2(px), r2(py), r2(pz)]; ht = 1; continue; }
    if (be) { const k = be.e.id + (be.head ? 'h' : 'b'); const h = hits.get(k) || [be.e.id, be.head, 0]; h[2]++; hits.set(k, h); ht = Math.max(ht, be.head ? 2 : 1); if (q < 2) popNum(tmv, Math.round((be.head ? w.h : w.d) * (dd > 0 ? 2 : 1)), be.head); spark(tmv, 1); }
    else { if (wh.b.br != null && br.indexOf(wh.b.br) < 0) br.push(wh.b.br); if (q < 2) decal(tmv, wh.ax, wh.sg); spark(tmv, 0); }
  }
  send({ t: 'f', w: lw, h: [...hits.values()].map(h => [h[0], h[1] ? 1 : 0, h[2]]), br, x: ex, tp });
  if (ht) { hm = .15; bp(ht > 1 ? 1400 : 900, .15); }
  pitch = Math.min(1.4, pitch + w.k * .005 * (ads ? .6 : 1) + Math.random() * .003); yaw += (Math.random() - .5) * .004 * w.k;
}
function rl() { const w = W[lw]; if (run && rt <= 0 && P.a < w.m && P.r > 0) { rt = w.rl; sh(.2, 800); } }
function toss() {
  if (!run || gc < 1 || tossCd > 0) return; tossCd = .4; gc--;
  if (eq == 2) { send({ t: 'g', k: 2 }); return; }
  const f = new T.Vector3(0, 0, -1).applyQuaternion(C.quaternion), p = C.position.clone().addScaledVector(f, .6), v = f.multiplyScalar(15).add(new T.Vector3(0, 4, 0));
  send({ t: 'g', k: eq, o: [r2(p.x), r2(p.y), r2(p.z)], v: [r2(v.x), r2(v.y), r2(v.z)] });
}
function stab() { if (!run || P.cd > 0 || kT > 0) return; P.cd = .55; kT = .45; kH = 1; ads = 0; sh(.12, 3500); }
function kHit() {
  kH = 0; kick = 1.2; const fw = -Math.sin(yaw), fz = -Math.cos(yaw), ids = [];
  for (const e of ents.values()) if (!e.dead && !e.fresh && e.tm !== myTm) { const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1; if (d < 2.8 && (dx * fw + dz * fz) / d > .25) { ids.push(e.id); puff(new T.Vector3(e.x, 1.2 + e.y, e.z), 0x8a1a1a, 5, .5); } }
  if (ids.length) send({ t: 'kn', i: ids }); sh(ids.length ? .6 : .15, ids.length ? 900 : 3000);
}

// ---------- local player ----------
function camStep(dt, mv, g0) {
  C.position.set(P.x, P.y + 1.7 - lnd + (mv && P.y <= g0 + .05 ? Math.sin(tm * 11) * .035 : 0), P.z); lnd = Math.max(0, lnd - dt * .9);
  C.rotation.set(pitch + (Math.random() - .5) * shk * .05, yaw + (Math.random() - .5) * shk * .05, (Math.random() - .5) * shk * .04);
  dome.position.copy(C.position); sunM.position.copy(C.position).addScaledVector(sn.position, 2.4); C.updateMatrixWorld();
}
function up(dt) {
  if (ads) { let bd = .15, ba = 0, bq = 0; for (const e of ents.values()) if (!e.dead && !e.fresh && e.tm !== myTm) { const dx = e.x - P.x, dz = e.z - P.z, ya = Math.atan2(-dx, -dz) - yaw, a = Math.atan2(Math.sin(ya), Math.cos(ya)), p = Math.atan2(-.35, Math.hypot(dx, dz)) - pitch, d = Math.hypot(a, p); if (d < bd) { bd = d; ba = a; bq = p; } } yaw += ba * dt * (pr == 3 ? 10 : 5); pitch += bq * dt * (pr == 3 ? 10 : 5); }
  let mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + jx, mz = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) - jy; const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  const mv = l > .05, sp = (K.ShiftLeft ? 8.5 : 5.5) * (pr == 1 ? 1.25 : 1) * (spd > 0 ? 1.35 : 1), s = Math.sin(yaw), c = Math.cos(yaw);
  P.x += (c * mx - s * mz) * sp * dt; P.z += (-s * mx - c * mz) * sp * dt; SH.col(world, P, .6);
  const g0 = Math.max(SH.gy(world, P), SH.hY(world, P.x, P.z)); if ((K.Space || jmp) && P.y <= g0 + .05) P.vy = 8; P.vy -= 22 * dt; P.y += P.vy * dt;
  if (P.y <= g0) { if (P.vy < -6) { lnd = Math.min(.25, -P.vy * .012); if (QP.fx > .5) puff(new T.Vector3(P.x, P.y + .1, P.z), 0xb5a58a, 5, .6); } P.y = g0; P.vy = 0; } else if (P.vy <= 0 && P.y - g0 < .15) { P.y = g0; P.vy = 0; }
  for (const o of PADS) if (Math.hypot(P.x - o.x, P.z - o.z) < 1.5 && P.y < g0 + .4 && P.vy <= 0) { P.vy = 15; sh(.3, 900); puff(new T.Vector3(o.x, .3, o.z), 0x6fe3ff, 40, .6); }
  camStep(dt, mv, g0);
  P.cd -= dt; tossCd -= dt;
  dsc -= dt; if (K.KeyQ && dsc <= 0 && !ads && P.hp > 0) { dsh = .18; dsc = 3.5; if (QP.fx > .5) puff(new T.Vector3(P.x, P.y + .2, P.z), 0xcfd6dc, 4, .35); }
  if (dsh > 0) { dsh -= dt; P.x -= Math.sin(yaw) * 22 * dt; P.z -= Math.cos(yaw) * 22 * dt; }
  if (spr > .5 && QP.fx > .5 && (fsT -= dt) <= 0) { fsT = .24; puff(new T.Vector3(P.x, SH.hY(world, P.x, P.z) + .1, P.z), 0xb5a58a, 2, .4); }
  { const sp2 = Math.hypot(P.x - lpx, P.z - lpz) / Math.max(dt, .001); lpx = P.x; lpz = P.z; if (sp2 > 2 && sp2 < 14 && P.y < SH.hY(world, P.x, P.z) + .2 && (fsa -= dt * sp2 * .4) <= 0) { fsa = 1; sh(.045 + (spr > .5 ? .02 : 0), 420 + Math.random() * 260); } }
  if (P.hp < 30 && P.hp > 0 && (hbT -= dt) <= 0) { hbT = .95; bp(52, .3); setTimeout(() => bp(46, .22), 160); }
  if (AC && !WN2) { try { const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s2 = AC.createBufferSource(), g2 = AC.createGain(), l2 = AC.createBiquadFilter(); s2.buffer = nb; s2.loop = true; l2.frequency.value = 380; g2.gain.value = 0; s2.connect(l2); l2.connect(g2); g2.connect(AC.destination); s2.start(); WN2 = { g: g2, l: l2 }; } catch (e) { WN2 = { g: { gain: {} } }; } }
  if (rt > 0) { rt -= dt; if (rt <= 0) { const n = Math.min(W[lw].m - P.a, P.r); P.a += n; P.r -= n; } }
  if ((F || (nolock && (K.Space || K.KeyF))) && P.cd <= 0 && rt <= 0) { if (P.a > 0) shoot(mv); else rl(); }
  kick = Math.max(0, kick - dt * 9); ft -= dt; fl.visible = ft > 0; mlt.intensity *= Math.max(0, 1 - dt * 28); const w = W[lw]; if (w.sp) w.sp.rotation.z += dt * (ft > 0 ? 38 : 4);
  const rp = rt > 0 ? Math.sin((1 - rt / w.rl) * Math.PI) : 0; ak += ((ads ? 1 : 0) - ak) * Math.min(1, dt * 14); spr += ((K.ShiftLeft && mv && !ads ? 1 : 0) - spr) * Math.min(1, dt * 8);
  C.fov = 75 + (w.z - 75) * ak + spr * 7; C.updateProjectionMatrix();
  const scp = ak > .9 && w.z < 30; scE.style.opacity = scp ? 1 : 0; if (curGun) curGun.visible = !scp && kT <= 0;
  gn.position.set(.22 * (1 - ak) + (mv ? Math.cos(tm * 5.5) * .006 : 0), -.24 + .08 * ak - rp * .2 - spr * .07 + (mv ? Math.sin(tm * 11) * .005 : 0), -.5 + kick * .05); gn.rotation.set(kick * .06 + spr * .35 + Math.sin(tm * 1.7) * .004, -spr * .5 + Math.sin(tm * 1.1) * .004, rp * .5);
  if (kT > 0) drw = .45; gn.position.y -= drw * drw * .8; gn.rotation.x -= drw * .9; drw = Math.max(0, drw - dt * 2.6);
  { const dy = Math.max(-.2, Math.min(.2, yaw - lyw)), dp = Math.max(-.2, Math.min(.2, pitch - lpt)), k2 = Math.min(1, dt * 9); lyw = yaw; lpt = pitch; swx += (-dy * 1.2 - swx) * k2; swy += (-dp * 1.2 - swy) * k2; gn.rotation.y += swx; gn.rotation.x += swy; gn.position.x += swx * .05; }
  if (kT > 0) { kT -= dt; const u = Math.min(1, 1 - kT / .45), wu = Math.min(1, u / .25), sw = Math.max(0, Math.min(1, (u - .25) / .4)), k = 1 - Math.max(0, Math.min(1, (u - .7) / .3)), e1 = wu * wu * (3 - 2 * wu), e2 = sw * sw * (3 - 2 * sw); kg.position.set(.26 + k * (.12 * e1 - .64 * e2), -.26 + k * (.14 * e1 - .12 * e2), -.45 + k * (.03 * e1 - .17 * e2)); kg.rotation.set(.15 + k * (.4 * e1 - .7 * e2), .15 + k * (-.45 * e1 + 1.1 * e2), .2 + k * (.5 * e1 - 1.5 * e2)); if (kH && kT < .27) kHit(); }
  kg.visible = kT > 0;
}

// ---------- world effects driven by server events ----------
function worldStep(dt) {
  fxStep(dt); smkStep(dt); airStep(dt);
  for (let i = GRM.length - 1; i >= 0; i--) { const o = GRM[i]; o.v.y -= 18 * dt; o.m.position.addScaledVector(o.v, dt); const g = SH.hY(world, o.m.position.x, o.m.position.z) + .2; if (o.m.position.y < g) { o.m.position.y = g; o.v.y *= -.4; o.v.x *= .7; o.v.z *= .7; } if ((o.t -= dt) <= 0) { S.remove(o.m); GRM.splice(i, 1); } }
  let i = 0; for (const p of PUM.values()) { p.m.rotation.y += dt * 2; p.m.position.y = .5 + SH.hY(world, p.x, p.z) + Math.sin(tm * 3 + i++) * .1; }
  PADS.forEach((o, k) => { const ph = (tm * 1.5 + k) % 1; o.m.material.color.setHSL(.55, 1, .45 + .15 * Math.sin(tm * 6 + k)); o.r.scale.setScalar(1 + ph * 1.2); o.r.material.opacity = .6 * (1 - ph); });
  sunAt(C.position.x, C.position.z, Math.max(0, Math.min(1, (MATCH_LEN - tl) / MATCH_LEN))); wxu(dt); flameStep();
  SGL.visible = sn.position.y > 5; tmv.copy(sn.position).sub(sn.target.position).normalize(); SGL.position.copy(C.position).addScaledVector(tmv, 95);
  if (WN2 && WN2.g.gain) WN2.g.gain.value = run ? .018 + .012 * Math.sin(tm * .35) + (curWx == 2 ? .03 : curWx == 3 ? .025 : curWx == 1 ? .01 : 0) : 0;
  inv = Math.max(0, inv - dt); tl = Math.max(0, tl - dt);
}

// ---------- HUD ----------
function fxs() { return (inv > 0 ? '  PROTECTED' : '') + (uav > 0 ? '  UAV' : '') + (jug > 0 ? '  ARMOR' : '') + (dd > 0 ? '  2X DAMAGE' : '') + (spd > 0 ? '  SPEED' : '') + (shd > 0 ? '  SHIELD' : ''); }
function radar() {
  const c = rc2, s = Math.sin(yaw), k = Math.cos(yaw); c.clearRect(0, 0, 110, 110);
  const dot = (x, z, cl, r) => { let a = (x - P.x) * k - (z - P.z) * s, b = -(x - P.x) * s - (z - P.z) * k; const d = Math.hypot(a, b); if (d > 50) { a *= 50 / d; b *= 50 / d; } c.fillStyle = cl; c.beginPath(); c.arc(55 + a * 1.08, 55 - b * 1.08, r, 0, 7); c.fill(); };
  for (const e of ents.values()) if (!e.dead && !e.fresh && (e.tm === myTm || uav > 0 || tm - e.lf < 2.5)) dot(e.x, e.z, e.tm === myTm ? '#4ab0ff' : '#ff4a3a', 3);
  const pc = ['#4be38a', '#d8b04a', '#b86bff', '#4ae0ff', '#ff9a3a']; for (const p of PUM.values()) dot(p.x, p.z, pc[p.k], 2.5); dot(P.x, P.z, '#fff', 3);
}
function hud(dt) {
  hpE.style.width = Math.max(0, P.hp) + '%'; hpE.style.background = P.hp < 35 ? '#d9473a' : '#d8b04a'; armE.style.width = Math.min(100, ARM) + '%';
  { const nx = STL.find(k => k > ks); st(ksE, 'STREAK ' + ks + (nx ? '   NEXT ' + nx + ': ' + STK[nx] : '   MAX')); }
  const t = Math.ceil(tl); st(wvE, 'Blue ' + TS[0] + '  -  Red ' + TS[1] + '   ' + (t / 60 | 0) + ':' + ('0' + (t % 60)).slice(-2) + (ks > 1 ? '   Streak ' + ks : '') + fxs());
  st(amE, W[lw].n + '  ' + (rt > 0 ? 'Reloading' : P.a + ' / ' + P.r) + '  G' + gc);
  crE.style.transform = 'scale(' + (1 + kick * .5 + .1) + ')'; hm = Math.max(0, hm - dt); hmE.style.opacity = hm > 0 ? 1 : 0; dm = Math.max(0, dm - dt * 1.5);
  dmE.style.opacity = Math.min(1, dm + (100 - P.hp) / 160 + (P.hp < 35 && meAlive ? .12 * (1 + Math.sin(tm * 7)) : 0));
  msT -= dt; msE.style.opacity = msT > 0 ? 1 : 0; if ((kfT -= dt) <= 0 && KF.length) { KF.length = 0; kfE.innerHTML = ''; }
  if (hdT > 0) { hdT -= dt; const a = HX - P.x, b = HZ - P.z; hdE.style.transform = 'rotate(' + Math.atan2(a * Math.cos(yaw) - b * Math.sin(yaw), -a * Math.sin(yaw) - b * Math.cos(yaw)) + 'rad)'; hdE.style.opacity = Math.min(1, hdT * 1.5); } else hdE.style.opacity = 0;
  fwE.style.opacity = Math.min(1, nfl);
  if ((radT -= dt) <= 0) { radT = .08; radar(); }
}
// scoreboard
function boardTables(el, rows, ts) {
  for (const tmi of [0, 1]) {
    const t = document.createElement('table'), rs = rows.filter(r => r[1] === tmi); let h = '<tr><th>' + (tmi ? 'Red ' : 'Blue ') + ts[tmi] + '</th><th>K</th><th>D</th></tr>';
    rs.forEach(r => { h += '<tr class="' + (r[0] === myId ? 'me' : '') + '"><td>' + r[2].replace(/[<>&]/g, '') + (r[5] ? ' <span class="bt">bot</span>' : '') + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>'; }); t.innerHTML = h; el.appendChild(t);
  }
}
function renderBoard(rows, ts) { const b = $('board'); b.innerHTML = ''; boardTables(b, rows, ts); b.style.display = boardOn ? 'flex' : 'none'; }
function setBoard(on) { boardOn = on; $('board').style.display = on ? 'flex' : 'none'; if (on) { send({ t: 'bd' }); boardT = 1; } }

// ---------- main loop with automatic resolution scaling ----------
const ck = new T.Clock(); let pfT = 0, pfN = 0;
function perf(dt) {
  pfT += dt; pfN++; if (pfT < 2) return; const fps = pfN / pfT; pfT = pfN = 0;
  if (fps < 38 && rScale > .55) { rScale = Math.max(.55, rScale - .1); rsz(); } else if (fps > 58 && rScale < 1) { rScale = Math.min(1, rScale + .05); rsz(); }
  st(netE, Math.round(fps) + ' fps  ' + ping + ' ms  res ' + Math.round(rScale * 100) + '%  ' + GFX);
}
(function frame() {
  requestAnimationFrame(frame); const dt = Math.min(ck.getDelta(), .05);
  if (!inMatch || !world) return;
  tm += dt; perf(dt);
  try { if (run) up(dt * (nfl > 1.2 ? .3 : 1)); else camStep(dt, 0, 0); } catch (er) { if (!window._ue) { window._ue = 1; console.error(er); } }
  try { syncEnts(dt); worldStep(dt); hud(dt); } catch (er) { if (!window._ue2) { window._ue2 = 1; console.error(er); } }
  if (waitSp && performance.now() - spReq > 1800) { spReq = performance.now(); send({ t: 'spawn', lo: lw, pr, eq }); }
  if (boardOn && (boardT -= dt) <= 0) { boardT = 1; send({ t: 'bd' }); }
  R.render(S, C);
})();

// ---------- input ----------
function requestLock() { if (!M) cv.requestPointerLock(); else try { document.documentElement.requestFullscreen().then(() => screen.orientation.lock('landscape')).catch(() => { }); } catch (e) { } }
$('go').onclick = () => { au(); if (!inMatch || meAlive) return; send({ t: 'spawn', lo: lw, pr, eq }); waitSp = 1; spReq = performance.now(); hideMenu(); requestLock(); };
$('resume').onclick = () => { au(); run = 1; hideMenu(); requestLock(); skipUI(); };
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && run && !M) { run = 0; F = 0; showScr('s_pause', 'Paused', 'Blue ' + TS[0] + ' - Red ' + TS[1]); skipUI(); } });
document.addEventListener('pointerlockerror', () => { nolock = 1; });
addEventListener('keydown', e => {
  K[e.code] = 1; if (e.code == 'Tab') { e.preventDefault(); if (inMatch && !boardOn) setBoard(1); } if (!run) return;
  if (e.code == 'KeyR') rl(); if (e.code == 'KeyZ') ads = 1; if (e.code == 'KeyG') toss(); if (e.code == 'KeyV') stab(); if (e.code == 'KeyK' && !e.repeat) toggleSkip();
});
addEventListener('keyup', e => { K[e.code] = 0; if (e.code == 'KeyZ') ads = 0; if (e.code == 'Tab') setBoard(0); });
cv.addEventListener('mousedown', e => { if (!run) return; if (!document.pointerLockElement && !nolock) { cv.requestPointerLock(); return; } if (e.button == 2) { Rb = 1; if (ads) { ads = 0; sk2 = 1; } else { ads = 1; rt0 = performance.now(); } } else F = 1; });
addEventListener('mouseup', e => { if (e.button == 2) { Rb = 0; if (!sk2 && performance.now() - rt0 > 250) ads = 0; sk2 = 0; } else F = 0; });
addEventListener('mousemove', e => { if (run && (document.pointerLockElement || (nolock && Rb))) { const k = C.fov / 75; yaw -= e.movementX * .0022 * k; pitch = Math.max(-1.4, Math.min(1.4, pitch - e.movementY * .0022 * k)); } });
addEventListener('contextmenu', e => { if (e.target === cv) e.preventDefault(); }); addEventListener('blur', () => { F = 0; });
$('tbb').addEventListener('touchstart', e => { e.preventDefault(); setBoard(boardOn ? 0 : 1); }, { passive: false });
$('skh').addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
let ji = null, jo, li = null, lx, ly; const lz = $('lz'), rz = $('rz'), jb = $('jb'), jk = $('jk'), np = { passive: false };
lz.addEventListener('touchstart', e => { e.preventDefault(); if (ji !== null) return; const t = e.changedTouches[0]; ji = t.identifier; jo = [t.clientX, t.clientY]; jb.style.cssText = 'display:block;left:' + (t.clientX - 50) + 'px;top:' + (t.clientY - 50) + 'px'; }, np);
lz.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === ji) { let dx = t.clientX - jo[0], dy = t.clientY - jo[1]; const l = Math.hypot(dx, dy), k = l > 50 ? 50 / l : 1; dx *= k; dy *= k; jk.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; jx = dx / 50; jy = dy / 50; } }, np);
const le = e => { for (const t of e.changedTouches) if (t.identifier === ji) { ji = null; jx = jy = 0; jb.style.display = 'none'; jk.style.transform = ''; } };
lz.addEventListener('touchend', le); lz.addEventListener('touchcancel', le);
rz.addEventListener('touchstart', e => { e.preventDefault(); if (li !== null) return; const t = e.changedTouches[0]; li = t.identifier; lx = t.clientX; ly = t.clientY; }, np);
rz.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === li) { const k = C.fov / 75; yaw -= (t.clientX - lx) * .006 * k; pitch = Math.max(-1.4, Math.min(1.4, pitch - (t.clientY - ly) * .006 * k)); lx = t.clientX; ly = t.clientY; } }, np);
const re2 = e => { for (const t of e.changedTouches) if (t.identifier === li) li = null; }; rz.addEventListener('touchend', re2); rz.addEventListener('touchcancel', re2);
const bt = (id, on, offf) => { const el = $(id); el.addEventListener('touchstart', e => { e.preventDefault(); on(); }, np);['touchend', 'touchcancel'].forEach(n => el.addEventListener(n, e => { e.preventDefault(); offf(); }, np)); };
bt('f1', () => { F = 1; }, () => { F = 0; }); bt('f2', () => { F = 1; }, () => { F = 0; }); bt('rb', rl, () => { }); bt('gb', toss, () => { }); bt('kb', stab, () => { }); bt('jp', () => { jmp = 1; }, () => { jmp = 0; }); bt('ab', () => { ads = !ads; }, () => { });
rsz(); showScr('s_name', 'Front Line', 'Online 10 vs 10. Join a lobby, vote on the map, and bots fill any empty slots.');
