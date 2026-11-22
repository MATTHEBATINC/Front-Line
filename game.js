'use strict';
const SH = require('./shared.js');
const { ZN, GN, W, AR, NMS, MP, makeWorld, hY, col, rayBoxes, spt } = SH;

const MAXH = 20, TEAM = 10, LOBBY_T = +process.env.LOBBY_SECONDS || 60, MATCH_T = +process.env.MATCH_SECONDS || 600, END_T = 14;
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
const r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;
const cl = v => Math.max(0, Math.min(GN - 1, v));
const ci = (v, a, b) => Math.max(a, Math.min(b, v | 0));
let NID = 1;

class Room {
  constructor(id) {
    this.id = id; this.humans = []; this.ents = []; this.by = new Map();
    this.phase = 'lobby'; this.lobbyT = LOBBY_T; this.endT = 0; this.lobbyAcc = 0;
    this.mapIdx = 0; this.lastMap = -1; this.world = null; this.TS = [0, 0]; this.tl = MATCH_T; this.time = 0; this.tn = 0;
    this.ev = []; this.gr = []; this.mines = []; this.smk = []; this.pus = []; this.sched = []; this.sen = []; this.heli = [null, null]; this.nuke = null; this.inCh = 0;
    this.pwT = 15; this.fT = 0; this.fb = 0;
    this.ND = [new Int16Array(GN * GN), new Int16Array(GN * GN)]; this.NQ = new Int16Array(GN * GN);
  }

  // ---------- membership ----------
  addHuman(send, name) {
    if (this.humans.length >= MAXH) return null;
    const h = {
      id: NID++, human: true, send, name: String(name || 'Player').replace(/[^\w \-.]/g, '').slice(0, 14) || 'Player', tm: 0, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, wp: 0, fl: 0,
      hp: 100, mh: 100, alive: false, k: 0, d: 0, ks: 0, arm: 0, fired: {}, pr: 0, eq: 0, gc: 0, inv: 0, uav: 0, jug: 0, dd: 0, spd: 0, shd: 0, hrt: 9, vote: -1, skip: 0,
      lf: {}, lkn: 0, lgr: 0, laf: 0, diedAt: 0, lastKiller: 0, mc: 0, lk: -9, lin: 0, sq: 0, ltp: 0, ping: 0
    };
    this.humans.push(h);
    if (this.phase === 'match') this.joinMatch(h); else this.sendLobby();
    return h;
  }

  removeHuman(h) {
    const i = this.humans.indexOf(h); if (i < 0) return; this.humans.splice(i, 1); h.alive = false;
    if (this.phase === 'match') {
      const j = this.ents.indexOf(h); if (j >= 0) this.ents.splice(j, 1); this.by.delete(h.id);
      if (this.humans.length) { const b = this.makeBot(h.tm); this.sendAll({ t: 'ros', rm: [h.id], add: [[b.id, b.tm, b.name, 1, b.wp, b.hv ? 1 : 0]] }); }
    } else this.sendLobby();
    if (!this.humans.length) this.toLobby();
  }

  joinMatch(h) {
    const hc = [0, 0]; for (const o of this.humans) if (o !== h && o.assigned) hc[o.tm]++;
    let tm = hc[0] < hc[1] ? 0 : hc[1] < hc[0] ? 1 : (this.TS[0] <= this.TS[1] ? 0 : 1);
    let bot = this.pickBot(tm); if (!bot) { tm ^= 1; bot = this.pickBot(tm); }
    h.tm = tm; h.assigned = 1; h.alive = false;
    const rm = [];
    if (bot) { bot.alive = false; this.ents.splice(this.ents.indexOf(bot), 1); this.by.delete(bot.id); rm.push(bot.id); }
    this.ents.push(h); this.by.set(h.id, h);
    this.sendAll({ t: 'ros', rm, add: [[h.id, h.tm, h.name, 0, 0]] }, h);
    this.sendStart(h);
  }
  pickBot(tm) { let b = null; for (const e of this.ents) if (e.bot && e.tm === tm && (!b || (!e.alive && b.alive))) b = e; return b; }

  sendStart(h) { h.send({ t: 'start', map: this.mapIdx, tl: Math.ceil(this.tl), you: { id: h.id, tm: h.tm }, roster: this.roster(), TS: this.TS }); }
  roster() { return this.ents.map(e => [e.id, e.tm, e.name, e.bot ? 1 : 0, e.wp, e.hv ? 1 : 0]); }
  sendAll(o, except) { for (const h of this.humans) if (h !== except) h.send(o); }

  // ---------- phases ----------
  startMatch() {
    const cnt = new Array(MP.length).fill(0); this.humans.forEach(h => { if (h.vote >= 0) cnt[h.vote]++; });
    const best = Math.max(...cnt); let c = []; cnt.forEach((v, i) => { if (v === best) c.push(i); });
    if (best === 0) c = c.filter(i => i !== this.lastMap);
    this.mapIdx = c[Math.random() * c.length | 0]; this.lastMap = this.mapIdx; this.world = makeWorld(this.mapIdx);
    this.ents = []; this.by.clear(); this.TS = [0, 0]; this.tl = MATCH_T; this.gr = []; this.mines = []; this.smk = []; this.pus = []; this.sched = []; this.sen = []; this.inCh = 0; this.heli = [null, null]; this.nuke = null; this.ev = []; this.pwT = 15; this.fT = 0; this.fb = 0;
    const hs = this.humans.slice().sort(() => Math.random() - .5), f = Math.random() < .5 ? 0 : 1;
    hs.forEach((h, i) => { Object.assign(h, { tm: (i + f) & 1, assigned: 1, alive: false, k: 0, d: 0, ks: 0, vote: -1, skip: 0, uav: 0, jug: 0, dd: 0, spd: 0, shd: 0, inv: 0, arm: 0, fired: {}, lastKiller: 0, diedAt: 0 }); this.ents.push(h); this.by.set(h.id, h); });
    for (const tm of [0, 1]) { const n = TEAM - hs.filter(h => h.tm === tm).length; for (let i = 0; i < n; i++) this.makeBot(tm); }
    this.phase = 'match'; this.humans.forEach(h => this.sendStart(h));
  }

  endMatch() {
    this.phase = 'end'; this.endT = END_T; this.humans.forEach(h => { h.skip = 0; h.alive = false; });
    this.sendAll({ t: 'end', TS: this.TS, board: this.board(), cd: END_T }); this.sendLobby();
  }

  toLobby() {
    this.phase = 'lobby'; this.lobbyT = LOBBY_T; this.ents = []; this.by.clear(); this.world = null; this.gr = []; this.mines = []; this.smk = []; this.pus = []; this.sched = []; this.sen = []; this.heli = [null, null]; this.nuke = null; this.ev = [];
    for (const h of this.humans) { h.alive = false; h.assigned = 0; h.skip = 0; }
    this.sendAll({ t: 'tolobby' }); this.sendLobby();
  }

  board() { return this.ents.map(e => [e.id, e.tm, e.name, e.k, e.d, e.bot ? 1 : 0]).sort((a, b) => b[3] - a[3] || a[4] - b[4]); }

  sendLobby() {
    const cnt = new Array(MP.length).fill(0); this.humans.forEach(h => { if (h.vote >= 0) cnt[h.vote]++; });
    const have = this.humans.filter(h => h.skip).length, names = this.humans.map(h => h.name), cd = Math.max(0, Math.ceil(this.phase === 'end' ? this.endT : this.lobbyT));
    for (const h of this.humans) h.send({ t: 'lobby', ph: this.phase, n: this.humans.length, max: MAXH, cd, v: cnt, my: h.vote, sk: [have, this.humans.length, h.skip], names });
  }

  // ---------- main tick ----------
  tick(dt) {
    this.time += dt * 1000;
    if (this.phase === 'lobby') {
      if (!this.humans.length) { this.lobbyT = LOBBY_T; return; }
      this.lobbyT -= dt;
      if (this.humans.length >= MAXH || this.lobbyT <= 0 || this.humans.every(h => h.skip)) { this.startMatch(); return; }
      this.lobbyAcc += dt; if (this.lobbyAcc >= 1) { this.lobbyAcc = 0; this.sendLobby(); }
      return;
    }
    if (this.phase === 'end') {
      this.endT -= dt; this.lobbyAcc += dt; if (this.lobbyAcc >= 1) { this.lobbyAcc = 0; this.sendLobby(); }
      if (this.endT <= 0) this.toLobby(); return;
    }
    if (!this.humans.length) { this.toLobby(); return; }
    this.sim(dt); this.snap();
    this.tl -= dt;
    if (this.tl <= 0 || this.humans.every(h => h.skip)) this.endMatch();
  }

  sim(dt) {
    const w = this.world;
    if ((this.fT -= dt) <= 0) { this.fT = .5; this.flow(0); this.flow(1); }
    for (const e of this.ents) if (e.bot) this.botAI(e, dt);
    for (const h of this.humans) {
      h.inv = Math.max(0, h.inv - dt); h.uav = Math.max(0, h.uav - dt); h.jug = Math.max(0, h.jug - dt); h.dd = Math.max(0, h.dd - dt); h.spd = Math.max(0, h.spd - dt); h.shd = Math.max(0, h.shd - dt);
      h.hrt += dt; if (h.alive && h.hrt > 4 && h.hp < 100) h.hp = Math.min(100, h.hp + 25 * dt);
    }
    // grenades
    for (let i = this.gr.length - 1; i >= 0; i--) {
      const o = this.gr[i]; o.vy -= 18 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      const g = hY(w, o.x, o.z) + .2; if (o.y < g) { o.y = g; o.vy *= -.4; o.vx *= .7; o.vz *= .7; }
      if ((o.t -= dt) <= 0) { this.gr.splice(i, 1); if (o.sm) this.smoke(o.x, o.z); else this.boom(o.x, o.y, o.z, 6, 140, o.tm, o.owner, 'Frag'); }
    }
    // mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const n = this.mines[i]; n.a -= dt;
      if (n.a <= 0 && this.ents.some(e => e.alive && e.tm !== n.tm && Math.hypot(e.x - n.x, e.z - n.z) < 2.8)) { this.mines.splice(i, 1); this.ev.push(['mx', n.id]); this.boom(n.x, .4, n.z, 5.5, 170, n.tm, n.owner, 'Mine'); }
    }
    // smoke expiry
    for (let i = this.smk.length - 1; i >= 0; i--) if ((this.smk[i].t -= dt) <= 0) this.smk.splice(i, 1);
    // pickups
    for (const h of this.humans) {
      if (!h.alive) continue;
      for (let i = this.pus.length - 1; i >= 0; i--) {
        const o = this.pus[i]; if (Math.hypot(o.x - h.x, o.z - h.z) > 1.4) continue;
        if (o.k === 1) h.send({ t: 'ammo' }); else if (o.k === 0) h.hp = Math.min(100, h.hp + 40);
        else if (o.k === 2) { h.dd = 15; h.send({ t: 'm', s: 'Double damage', d: 2 }); } else if (o.k === 3) { h.spd = 15; h.send({ t: 'm', s: 'Speed boost', d: 2 }); } else if (o.k === 5) { h.arm = Math.min(100, h.arm + 50); h.send({ t: 'm', s: 'Armor +50', d: 2 }); } else { h.shd = 15; h.send({ t: 'm', s: 'Shield', d: 2 }); }
        this.pus.splice(i, 1); this.ev.push(['px', o.id]);
      }
    }
    if ((this.pwT -= dt) <= 0) { this.pwT = 22 + Math.random() * 10; this.spawnPW(); }
    // scheduled things
    for (let i = this.sched.length - 1; i >= 0; i--) { const s = this.sched[i]; if ((s.t -= dt) <= 0) { this.sched.splice(i, 1); s.f(); } }
    // sentry turrets
    for (let i = this.sen.length - 1; i >= 0; i--) {
      const q = this.sen[i]; q.t -= dt; q.cd -= dt;
      if (q.t <= 0) { this.sen.splice(i, 1); this.ev.push(['sx', q.id]); continue; }
      if (q.cd > 0) continue;
      let bt = null, bd = 30; for (const e of this.ents) { if (!e.alive || e.tm === q.tm) continue; const d = Math.hypot(e.x - q.x, e.z - q.z); if (d < bd && this.los(q.x, q.y + .6, q.z, e.x, e.y + 1.2, e.z)) { bd = d; bt = e; } }
      if (bt) { q.cd = 1.2; this.ev.push(['sf', q.id, r1(bt.x), r1(bt.y + 1.2), r1(bt.z)]); if (Math.random() < .35) { if (bt.human) this.damage(bt, 45, q.owner, 'Sentry'); else this.kill(bt, q.owner, 'Sentry'); } }
    }
    // helicopters
    for (let tm = 0; tm < 2; tm++) {
      const H = this.heli[tm]; if (!H) continue; H.t -= dt; H.a += dt * .35;
      const t = H.t, R0 = t > 20 ? 30 + (t - 20) * 20 : t < 2 ? 30 + (2 - t) * 30 : 30, y = 24 + (t < 2 ? (2 - t) * 20 : 0), hx = Math.cos(H.a) * R0, hz = Math.sin(H.a) * R0;
      if ((H.f -= dt) <= 0) {
        H.f = .3; const es = this.ents.filter(e => e.alive && e.tm !== tm && Math.hypot(e.x - hx, e.z - hz) < 48);
        if (es.length) { const e = es[Math.random() * es.length | 0]; this.ev.push(['hf', r1(hx), r1(y), r1(hz), r1(e.x), r1(e.y + 1.2), r1(e.z)]); this.damage(e, 24, H.owner, 'Heli'); }
      }
      if (H.t <= 0) this.heli[tm] = null;
    }
    if (this.nuke && (this.nuke.t -= dt) <= 0) {
      const o = this.nuke.owner, tm = this.nuke.tm; this.nuke = null; this.ev.push(['nukeHit']);
      const w0 = this.inCh; this.inCh = 1; for (const e of this.ents.slice()) if (e.alive && e.tm !== tm) this.kill(e, o, 'Nuke'); this.inCh = w0; if (!w0) this.chain(o);
    }
  }

  // ---------- bots ----------
  makeBot(tm) {
    const e = { id: NID++, bot: true, tm, name: NMS[Math.random() * NMS.length | 0], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, wp: Math.random() * W.length | 0, fl: 0, hp: 100, mh: 100, lh: 100, alive: true, k: 0, d: 0, v: 3.6 * (.85 + Math.random() * .3), rl: Math.random() * 3 | 0, cd: 1 + Math.random() * 2, gc: 5 + Math.random() * 8, sd: Math.random() < .5 ? 1 : -1, ac: .2, lt: Math.random() * .2, see: 0, sa: 0, flee: 0, dx: 0, dz: 0, tg: null, rt: 0 };
    if (Math.random() < .14) { e.hv = 1; e.mh = 170; }
    this.placeBot(e); this.ents.push(e); this.by.set(e.id, e); return e;
  }
  placeBot(e) { const [x, z] = spt(this.world, e.tm); e.x = x; e.z = z; e.y = hY(this.world, x, z); e.hp = e.lh = e.mh; e.alive = true; e.dx = e.dz = 0; e.yaw = e.tm ? Math.PI : 0; e.see = 0; e.sa = 0; e.tg = null; e.flee = 0; e.cd = 1 + Math.random() * 2; }

  flow(t) {
    const D = this.ND[t], NG = this.world.NG, Q = this.NQ; D.fill(-1); let h = 0, q = 0;
    for (const o of this.ents) { if (!o.alive || o.tm === t) continue; const s = cl(Math.floor(o.z + ZN)) * GN + cl(Math.floor(o.x + ZN)); if (D[s] < 0) { D[s] = 0; Q[q++] = s; } }
    while (h < q) {
      const c = Q[h++], cx = c % GN, cy = (c / GN) | 0, d = D[c] + 1;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], ny = cy + DY[k]; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue;
        const n = ny * GN + nx; if (NG[n] || D[n] >= 0) continue; if (k > 3 && (NG[cy * GN + nx] || NG[ny * GN + cx])) continue; D[n] = d; Q[q++] = n;
      }
    }
  }
  stp(e, inv) {
    const NG = this.world.NG, D = this.ND[e.tm], i = cl(Math.floor(e.x + ZN)), j = cl(Math.floor(e.z + ZN)); let b = -1, bd = inv ? -1 : 1e9;
    for (let k = 0; k < 8; k++) {
      const nx = i + DX[k], ny = j + DY[k]; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue;
      const n = ny * GN + nx, v = D[n]; if (v < 0 || NG[n]) continue; if (k > 3 && (NG[j * GN + nx] || NG[ny * GN + i])) continue;
      if (inv ? v > bd : v < bd) { bd = v; b = k; }
    }
    if (b < 0) return [0, 0];
    const tx = i + DX[b] - ZN + .5 - e.x, tz = j + DY[b] - ZN + .5 - e.z, l = Math.hypot(tx, tz) || 1; return [tx / l, tz / l];
  }
  los(x, y, z, tx, ty, tz) {
    const dx = tx - x, dy = ty - y, dz = tz - z, d = Math.hypot(dx, dy, dz) || 1, ux = dx / d, uy = dy / d, uz = dz / d;
    const r = rayBoxes(this.world, x, y, z, ux, uy, uz, d); if (r && r.t < d - .6) return false;
    for (const s of this.smk) { // ray vs sphere
      const px = s.x - x, py = s.y - y, pz = s.z - z, t = px * ux + py * uy + pz * uz; if (t < 0 || t > d) continue;
      const qx = px - ux * t, qy = py - uy * t, qz = pz - uz * t; if (qx * qx + qy * qy + qz * qz < s.r * s.r) return false;
    }
    return true;
  }
  retarget(e) {
    const os = this.ents.filter(o => o.alive && o.tm !== e.tm).sort((a, b) => (a.x - e.x) ** 2 + (a.z - e.z) ** 2 - (b.x - e.x) ** 2 - (b.z - e.z) ** 2);
    e.tg = os[0] || null; e.see = 0;
    for (const o of os.slice(0, 3)) { const n = Math.hypot(o.x - e.x, o.z - e.z); if (n > AR[e.wp] * 2.6 + 10) break; if (this.los(e.x, e.y + 1.5, e.z, o.x, o.y + 1.2, o.z)) { e.tg = o; e.see = 1; break; } }
  }
  botAI(e, dt) {
    const w = this.world;
    if (!e.alive) { if ((e.rt -= dt) <= 0) this.placeBot(e); return; }
    if ((e.lt -= dt) <= 0) { e.lt = .15 + Math.random() * .1; this.retarget(e); }
    const tg = e.tg && e.tg.alive ? e.tg : null, T0 = tg || { x: e.x + 1, z: e.z }, dx = T0.x - e.x, dz = T0.z - e.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    if (e.hp < e.lh && e.hp < e.mh * .3 && e.flee <= 0 && Math.random() < .5) e.flee = 3; e.lh = e.hp;
    e.sa = e.see ? e.sa + dt : 0; e.ac = e.see ? Math.min(.8, .2 + e.sa * .18) : .2;
    const rg = AR[e.wp]; let mx, mz;
    if (e.flee > 0) { e.flee -= dt;[mx, mz] = this.stp(e, 1); }
    else if (e.see && d < rg * .6) { mx = -ux * .7; mz = -uz * .7; }
    else if (e.see && d < rg * 1.2) { mx = -uz * e.sd * .7; mz = ux * e.sd * .7; }
    else { [mx, mz] = this.stp(e, 0); if (!mx && !mz) { mx = ux; mz = uz; } }
    if (Math.random() < dt * .35) e.sd = -e.sd;
    const sp = e.v * (e.flee > 0 ? 1.2 : 1), k = Math.min(1, dt * 6); e.dx += (mx - e.dx) * k; e.dz += (mz - e.dz) * k; e.x += e.dx * sp * dt; e.z += e.dz * sp * dt;
    for (const o of this.ents) if (o !== e && o.alive && o.bot) { const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od < 1 && od > 0) { e.x += ox / od * dt * 2; e.z += oz / od * dt * 2; } }
    col(w, e, .45, true); e.y = hY(w, e.x, e.z);
    const fa = e.see || d < 6 ? Math.atan2(-dx, -dz) : Math.atan2(-e.dx, -e.dz); e.yaw += Math.atan2(Math.sin(fa - e.yaw), Math.cos(fa - e.yaw)) * Math.min(1, dt * 9);
    e.cd -= dt;
    if (e.see && tg && e.sa > .5 && e.cd <= 0) {
      const wp = W[e.wp]; e.cd = Math.max(.2, wp.cd * (1.5 + Math.random()));
      const ht = Math.random() < e.ac * Math.max(.25, 1 - d / (AR[e.wp] * 2 + 20));
      this.ev.push(['sh', e.id, r1(T0.x + (ht ? 0 : (Math.random() - .5) * 3)), r1(tg.y + 1.2), r1(T0.z + (ht ? 0 : (Math.random() - .5) * 3))]);
      if (ht) this.damage(tg, Math.min(wp.d, 100) * .2 * (wp.p ? 2.5 : 1), e, wp.n);
    }
    e.gc -= dt;
    if (e.rl === 1 && !e.see && tg && e.gc <= 0 && d > 8 && d < 30) { e.gc = 10 + Math.random() * 8; this.throwGr(e.tm, e, e.x, 1.4, e.z, dx / 1.25, 10.4, dz / 1.25, 1.7, 0); }
  }

  // ---------- combat ----------
  throwGr(tm, owner, x, y, z, vx, vy, vz, t, sm) {
    const o = { id: NID++, tm, owner, x, y, z, vx, vy, vz, t, sm }; this.gr.push(o);
    this.ev.push(['gr', o.id, r1(x), r1(y), r1(z), r1(vx), r1(vy), r1(vz), t, sm ? 1 : 0]);
  }
  smoke(x, z) {
    this.ev.push(['sm', r1(x), r1(z)]);
    for (let i = 0; i < 6; i++) this.smk.push({ x: x + (Math.random() - .5) * 6, y: 1.5 + Math.random() * 2, z: z + (Math.random() - .5) * 6, r: 4.5, t: 15 });
  }
  damage(o, amt, src, by) {
    if (!o.alive) return;
    if (o.human) {
      if (o.inv > 0) return;
      amt *= (o.pr === 0 ? .7 : 1) * (o.jug > 0 ? .3 : 1) * (o.shd > 0 ? .4 : 1); const ab = Math.min(o.arm, amt * .55); o.arm -= ab; amt -= ab; o.hp -= amt; o.hrt = 0;
      if (src && src !== o) o.send({ t: 'hu', x: r1(src.x), z: r1(src.z) });
    } else o.hp -= amt;
    if (o.hp <= 0) this.kill(o, src, by);
  }
  boom(x, y, z, r, q, tm, owner, by) {
    this.ev.push(['bm', r1(x), r1(y), r1(z), r]);
    for (const o of this.ents.slice()) {
      if (!o.alive) continue; const self = o === owner; if (!self && tm >= 0 && o.tm === tm) continue;
      const d = Math.hypot(o.x - x, o.y + 1 - y, o.z - z); if (d >= r) continue;
      let dm = q * (1 - d / r) * (self ? .35 : tm < 0 ? .6 : .8); if (o.human && o.pr === 5) dm *= .25;
      if (o.human && self) { const inv = o.inv; if (inv > 0) continue; }
      this.damage(o, dm, owner, by);
    }
    for (let i = 0; i < this.world.barrels.length; i++) { const b = this.world.barrels[i]; if (b.al && Math.hypot(b.x - x, b.z - z) < r) this.xb(i, owner); }
  }
  xb(i, owner) { const b = this.world.barrels[i]; if (!b || !b.al) return; b.al = 0; const k = this.world.BX.indexOf(b.bx); if (k >= 0) this.world.BX.splice(k, 1); this.ev.push(['xb', i]); this.boom(b.x, .6, b.z, 6, 140, -1, owner, 'Barrel'); }
  drop(x, z, k) { const p = { id: NID++, k: k == null ? (Math.random() < .5 ? 0 : 1) : k < 0 ? [0, 1, 5][Math.random() * 3 | 0] : k, x, z }; this.pus.push(p); this.ev.push(['pu', p.id, p.k, r1(x), r1(z)]); if (this.pus.length > 28) { const o = this.pus.shift(); this.ev.push(['px', o.id]); } }
  spawnPW() {
    if (this.pus.filter(o => o.k > 1 && o.k < 5).length > 2) return; let x, z, n = 0;
    do { x = (Math.random() - .5) * ZN * 1.7; z = (Math.random() - .5) * ZN * 1.7; } while (this.world.NG[Math.floor(z + ZN) * GN + Math.floor(x + ZN)] && n++ < 40);
    this.drop(x, z, 2 + (Math.random() * 3 | 0)); this.ev.push(['msg', 'Power-up spawned', 2]);
  }
  msgTo(h, s, d, c) { if (h && h.human) h.send({ t: 'm', s, d: d || 2, c: c ? 1 : 0 }); }

  kill(v, k, by) {
    if (!v.alive) return; v.alive = false; v.d++; this.TS[v.tm ^ 1]++;
    if (v.human) { v.ks = 0; v.arm = 0; v.fired = {}; v.uav = v.jug = v.dd = v.spd = v.shd = 0; v.diedAt = Date.now(); v.lastKiller = k ? k.id : 0; v.send({ t: 'dead', by: k ? k.name : by || 'World', id: k ? k.id : 0, w: by || '' }); }
    else v.rt = 3.5;
    this.ev.push(['k', k ? k.name : '', v.name, k ? k.id : 0, v.id, by || '']);
    if (!k || k === v) return;
    k.k++;
    if (!k.human) return;
    if (!this.fb) { this.fb = 1; this.msgTo(k, 'First blood!', 2); }
    if (k.lastKiller === v.id) { this.msgTo(k, 'Revenge!', 1.5); k.lastKiller = 0; }
    if (k.pr === 4) k.hp = Math.min(100, k.hp + 25);
    const now = this.time / 1000; k.mc = now - k.lk < 3 ? k.mc + 1 : 1; k.lk = now;
    if (k.mc === 2) this.msgTo(k, 'Double kill!', 1.5); if (k.mc === 3) this.msgTo(k, 'Triple kill!', 1.5); if (k.mc > 3) this.msgTo(k, 'Multi kill x' + k.mc, 1.5);
    if (v.hv || Math.random() < .22) this.drop(v.x, v.z, v.hv ? 5 : -1);
    k.ks++; this.chain(k);
  }
  // Every streak tier at or below the current streak that has not fired yet fires now (so nuke kills can't skip tiers).
  chain(h) {
    if (this.inCh || !h.human) return; this.inCh = 1;
    try { for (const t of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14]) if (t <= h.ks && !h.fired[t]) { h.fired[t] = 1; this.streak(h, t); } } finally { this.inCh = 0; }
  }
  streak(h, t) {
    switch (t) {
      case 2: h.spd = Math.max(h.spd, 10); this.msgTo(h, 'Adrenaline rush', 2.5, 1); break;
      case 3: h.uav = 20; this.msgTo(h, 'UAV online', 2.5, 1); break;
      case 4: h.arm = 100; this.msgTo(h, 'Body armor', 2.5, 1); break;
      case 5: this.callAir(h); this.msgTo(h, 'Airstrike inbound', 2.5, 1); break;
      case 6: this.callSentry(h); this.msgTo(h, 'Sentry turret deployed', 2.5, 1); break;
      case 7: this.callCare(h); this.msgTo(h, 'Care package inbound', 2.5, 1); break;
      case 8: h.arm = Math.max(h.arm, 60); h.hp = 100; h.send({ t: 'ammo', full: 1 }); this.msgTo(h, 'Resupply: ammo, health, armor', 2.5, 1); break;
      case 9: h.jug = 15; this.msgTo(h, 'Juggernaut armor', 2.5, 1); break;
      case 10: this.callHeli(h); this.msgTo(h, 'Attack helicopter on station', 2.5, 1); break;
      case 11: this.callMortar(h); this.msgTo(h, 'Mortar barrage', 2.5, 1); break;
      case 12: if (!this.nuke) { this.nuke = { t: 4.2, owner: h, tm: h.tm }; this.ev.push(['nuke']); this.ev.push(['msg', 'TACTICAL NUKE INBOUND', 3]); } break;
      case 14: this.callSentry(h); h.jug = 20; h.arm = 100; this.msgTo(h, 'Last stand: sentry, juggernaut, armor', 3, 1); break;
    }
  }
  callSentry(o) {
    this.sen = this.sen.filter(q => { if (q.owner === o) { this.ev.push(['sx', q.id]); return false; } return true; });
    const x = Math.max(-ZN + 2, Math.min(ZN - 2, o.x - Math.sin(o.yaw) * 2)), z = Math.max(-ZN + 2, Math.min(ZN - 2, o.z - Math.cos(o.yaw) * 2)), q = { id: NID++, owner: o, tm: o.tm, x, z, y: hY(this.world, x, z), t: 20, cd: 1 };
    this.sen.push(q); this.ev.push(['sn', q.id, q.tm, r1(x), r1(z), 20]);
  }
  callMortar(o) {
    const es = this.ents.filter(e => e.alive && e.tm !== o.tm && Math.hypot(e.x - o.x, e.z - o.z) > 8).sort(() => Math.random() - .5).slice(0, 3);
    es.forEach((e, i) => { const x = e.x, z = e.z; this.ev.push(['mw', r1(x), r1(z)]); this.sched.push({ t: .9 + i * .45, f: () => { if (this.phase === 'match') this.boom(x, .3 + hY(this.world, x, z), z, 4, 140, o.tm, o, 'Mortar'); } }); });
  }
  callAir(o) {
    const es = this.ents.filter(e => e.alive && e.tm !== o.tm); let cx = 0, cz = 0; es.forEach(e => { cx += e.x; cz += e.z; }); if (es.length) { cx /= es.length; cz /= es.length; }
    const a = Math.random() * Math.PI, dx = Math.sin(a), dz = Math.cos(a), L0 = ZN * 1.4, V = 75;
    this.ev.push(['air', r1(cx), r1(cz), r2(a)]);
    for (let s = -42; s <= 42; s += 6) {
      const px = cx + dx * s + (Math.random() - .5) * 10, pz = cz + dz * s + (Math.random() - .5) * 10;
      this.sched.push({ t: (L0 + s) / V, f: () => { if (this.phase === 'match') this.boom(px, .3, pz, 5.5, 130, o.tm, o, 'Airstrike'); } });
    }
  }
  callCare(o) {
    const x = o.x + (Math.random() - .5) * 12, z = o.z + (Math.random() - .5) * 12; this.ev.push(['care', r1(x), r1(z), 6.4]);
    this.sched.push({ t: 6.4, f: () => { if (this.phase === 'match') for (let i = 0; i < 4; i++) this.drop(x + (Math.random() - .5) * 4, z + (Math.random() - .5) * 4); } });
  }
  callHeli(o) { if (this.heli[o.tm]) { this.heli[o.tm].t = 22; this.heli[o.tm].owner = o; } else this.heli[o.tm] = { t: 22, a: 0, f: 0, owner: o }; this.ev.push(['heli', o.tm]); }

  // ---------- client messages ----------
  onMsg(h, m) {
    switch (m.t) {
      case 'in': {
        if (this.phase !== 'match' || !h.alive || m.q !== h.sq) break; const p = m.p; if (!Array.isArray(p) || p.length < 6) break;
        const now = Date.now(), dt = Math.min(.5, Math.max(.02, (now - h.lin) / 1000)); h.lin = now;
        let nx = +p[0], ny = +p[1], nz = +p[2]; if (!isFinite(nx + ny + nz + +p[3] + +p[4])) break;
        const lim = 24 * dt * 1.6 + 1, dd = Math.hypot(nx - h.x, nz - h.z);
        if (dd > lim) { const k = lim / dd; nx = h.x + (nx - h.x) * k; nz = h.z + (nz - h.z) * k; if (dd > lim + 6 && now - h.ltp > 700) { h.ltp = now; h.sq++; h.send({ t: 'tp', x: nx, z: nz, sq: h.sq }); } }
        h.x = Math.max(-ZN - .4, Math.min(ZN + .4, nx)); h.z = Math.max(-ZN - .4, Math.min(ZN + .4, nz)); h.y = Math.max(-1, Math.min(60, ny));
        h.yaw = +p[3]; h.pitch = Math.max(-1.5, Math.min(1.5, +p[4])); h.wp = ci(p[5], 0, W.length - 1); h.fl = p[6] | 0; break;
      }
      case 'f': this.onFire(h, m); break;
      case 'kn': {
        if (this.phase !== 'match' || !h.alive) break; const now = Date.now(); if (now - h.lkn < 450) break; h.lkn = now;
        for (const id of (Array.isArray(m.i) ? m.i : []).slice(0, 4)) { const t = this.by.get(id | 0); if (t && t.alive && t.tm !== h.tm && Math.hypot(t.x - h.x, t.z - h.z) < 3.6) this.kill(t, h, 'Knife'); } break;
      }
      case 'g': {
        if (this.phase !== 'match' || !h.alive) break; const now = Date.now(); if (now - h.lgr < 350 || h.gc < 1) break;
        if (h.eq === 2) { h.gc--; h.lgr = now; const n = { id: NID++, x: h.x, z: h.z, tm: h.tm, a: .9, owner: h }; this.mines.push(n); this.ev.push(['mn', n.id, r1(n.x), r1(n.z)]); if (this.mines.length > 16) { const o = this.mines.shift(); this.ev.push(['mx', o.id]); } this.msgTo(h, 'Mine armed', 1); break; }
        const o = m.o, v = m.v; if (!Array.isArray(o) || !Array.isArray(v) || !isFinite(+o[0] + +o[1] + +o[2] + +v[0] + +v[1] + +v[2])) break;
        if (Math.hypot(+v[0], +v[1], +v[2]) > 22 || Math.hypot(+o[0] - h.x, +o[2] - h.z) > 3) break;
        h.gc--; h.lgr = now; this.throwGr(h.tm, h, +o[0], +o[1], +o[2], +v[0], +v[1], +v[2], h.eq === 1 ? 1.2 : 1.7, h.eq === 1); break;
      }
      case 'spawn': {
        if (this.phase !== 'match' || h.alive || Date.now() - h.diedAt < 1500) break;
        h.pr = ci(m.pr, 0, 5); h.eq = ci(m.eq, 0, 2); h.wp = ci(m.lo, 0, W.length - 1);
        const [x, z] = spt(this.world, h.tm); h.x = x; h.z = z; h.y = hY(this.world, x, z); h.hp = 100; h.alive = true; h.inv = 2.5; h.ks = 0; h.arm = 0; h.fired = {}; h.uav = h.jug = h.dd = h.spd = h.shd = 0; h.gc = (h.eq === 2 ? 2 : 3) + (h.pr === 2 ? 2 : 0); h.hrt = 9; h.sq++; h.lin = Date.now();
        h.send({ t: 'sp', x, z, y: h.y, sq: h.sq }); break;
      }
      case 'vote': if (this.phase !== 'match') { const i = m.m | 0; if (i >= 0 && i < MP.length) { h.vote = h.vote === i ? -1 : i; this.sendLobby(); } } break;
      case 'skip': h.skip = h.skip ? 0 : 1; if (this.phase === 'lobby') this.sendLobby(); break;
      case 'bd': h.send({ t: 'board', rows: this.board(), TS: this.TS }); break;
      case 'p': h.send({ t: 'q', c: m.c }); break;
    }
  }

  clear(x, y, z, tx, ty, tz) { const dx = tx - x, dy = ty - y, dz = tz - z, d = Math.hypot(dx, dy, dz) || 1, r = rayBoxes(this.world, x, y, z, dx / d, dy / d, dz / d, d); return !r || r.t > d - 1.3; }

  onFire(h, m) {
    if (this.phase !== 'match' || !h.alive) return; const wi = m.w | 0, w = W[wi]; if (!w) return;
    const now = Date.now(); if (now - (h.lf[wi] || 0) < w.cd * 800) return; h.lf[wi] = now; h.laf = now;
    const ex = h.x, ey = h.y + 1.6, ez = h.z;
    if (Array.isArray(m.tp) && m.tp.length === 3 && isFinite(+m.tp[0] + +m.tp[1] + +m.tp[2])) this.ev.push(['sh', h.id, r1(+m.tp[0]), r1(+m.tp[1]), r1(+m.tp[2])]); else this.ev.push(['sh', h.id]);
    for (const q of (Array.isArray(m.h) ? m.h : []).slice(0, 8)) {
      const t = this.by.get(q[0] | 0); if (!t || !t.alive || t.tm === h.tm) continue;
      if (Math.hypot(t.x - h.x, t.z - h.z) > 150 || !this.clear(ex, ey, ez, t.x, t.y + 1.2, t.z)) continue;
      const n = Math.max(1, Math.min(w.p || 1, q[2] | 0 || 1)); this.damage(t, n * (q[1] ? w.h : w.d) * (h.dd > 0 ? 2 : 1), h, w.n);
    }
    if (w.x && Array.isArray(m.x)) {
      const x = +m.x[0], y = +m.x[1], z = +m.x[2];
      if (isFinite(x + y + z) && Math.hypot(x - ex, y - ey, z - ez) < 160 && this.clear(ex, ey, ez, x, y, z)) this.boom(x, y, z, w.x, w.d, h.tm, h, w.n);
    }
    for (const i of (Array.isArray(m.br) ? m.br : []).slice(0, 3)) { const b = this.world.barrels[i | 0]; if (b && b.al && Math.hypot(b.x - h.x, b.z - h.z) < 160) this.xb(i | 0, h); }
  }

  // ---------- snapshots ----------
  snap() {
    const E = []; for (const e of this.ents) {
      let fl = e.alive ? 0 : 1; if (e.alive) { if (e.bot ? e.see : ((e.fl & 1) || Date.now() - e.laf < 600)) fl |= 2; }
      E.push([e.id, r2(e.x), r2(e.z), r2(e.y), r2(e.yaw), fl, Math.max(0, Math.ceil(e.hp)), e.wp, r2(e.pitch)]);
    }
    const Es = JSON.stringify(E), Vs = JSON.stringify(this.ev); this.ev = [];
    const have = this.humans.filter(h => h.skip).length, head = '{"t":"s","n":' + (++this.tn) + ',"ts":' + Math.round(this.time) + ',"s":[' + this.TS + '],"tl":' + r1(this.tl) + ',"sk":[' + have + ',' + this.humans.length + '],"e":' + Es + ',"v":' + Vs + ',"me":';
    for (const h of this.humans) h.send(head + '[' + [Math.max(0, Math.ceil(h.hp)), h.ks, Math.ceil(h.uav), Math.ceil(h.jug), Math.ceil(h.dd), Math.ceil(h.spd), Math.ceil(h.shd), Math.ceil(h.inv), h.gc, h.skip, Math.ceil(h.arm)].join(',') + ']}', true);
  }
}

module.exports = { Room, MAXH };
