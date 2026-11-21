'use strict';
// ===== Rendering: scene, merged map geometry, weapons, soldiers, effects. Tuned for weak GPUs. =====
const { W, AR, MP, ZN, GN, TW, TN2 } = SH;
const T = THREE, $ = id => document.getElementById(id), M = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (M) document.body.classList.add('m');
let GFX = ''; try { GFX = localStorage.getItem('fl_gfx') || ''; } catch (e) { }
if (!/^(low|med|high)$/.test(GFX)) GFX = (M || /CrOS/i.test(navigator.userAgent)) ? 'low' : 'med';
const QP = {
  low: { pr: 1, aa: 0, sh: 0, tx: 128, bump: 0, grass: 300, rocks: 36, bush: 16, wx: 240, cl: 5, hq: 0, ter: 2, fx: .5, smk: 6 },
  med: { pr: 1.25, aa: 0, sh: 1024, tx: 256, bump: 0, grass: 800, rocks: 56, bush: 28, wx: 420, cl: 8, hq: 0, ter: 2, fx: .8, smk: 9 },
  high: { pr: 2, aa: 1, sh: 2048, tx: 512, bump: 1, grass: 1600, rocks: 70, bush: 36, wx: 700, cl: 12, hq: 1, ter: 1, fx: 1, smk: 14 }
}[GFX];

const R = new T.WebGLRenderer({ antialias: !!QP.aa, powerPreference: 'high-performance', precision: QP.aa ? 'highp' : 'mediump' });
document.body.prepend(R.domElement);
R.shadowMap.enabled = !!QP.sh; R.shadowMap.type = T.PCFShadowMap;
const cv = R.domElement, S = new T.Scene(), C = new T.PerspectiveCamera(75, 1, .1, 200);
let rScale = 1;
function rsz() { R.setPixelRatio(Math.min(window.devicePixelRatio || 1, QP.pr) * rScale); R.setSize(innerWidth, innerHeight); C.aspect = innerWidth / innerHeight; C.updateProjectionMatrix(); }
addEventListener('resize', rsz);
S.background = new T.Color(0x9db3c7); S.fog = new T.Fog(0x9db3c7, 12, 75); C.rotation.order = 'YXZ'; S.add(C);
const L = c => QP.hq ? new T.MeshStandardMaterial({ color: c, roughness: .85, metalness: .05 }) : new T.MeshLambertMaterial({ color: c });

// ---- sky, sun, weather, clouds ----
const dome = new T.Mesh(new T.SphereGeometry(100, 12, 8), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: new T.Color() }, b: { value: new T.Color() } }, vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 a,b;varying float h;void main(){gl_FragColor=vec4(mix(b,a,smoothstep(0.,.55,h)),1.);}' })); dome.renderOrder = -1; S.add(dome);
const sunM = new T.Mesh(new T.SphereGeometry(5, 10, 6), new T.MeshBasicMaterial({ color: 0xfff4d0, fog: false, depthWrite: false })); sunM.renderOrder = -.5; S.add(sunM);
const WN = QP.wx, wxA = new Float32Array(WN * 3), wxG = new T.BufferGeometry(); for (let i = 0; i < WN; i++) { wxA[i * 3] = (Math.random() - .5) * 44; wxA[i * 3 + 1] = Math.random() * 20; wxA[i * 3 + 2] = (Math.random() - .5) * 44; }
wxG.setAttribute('position', new T.BufferAttribute(wxA, 3)); const wxM = new T.PointsMaterial({ size: .15, transparent: true, opacity: .85, depthWrite: false, fog: false }), wxP = new T.Points(wxG, wxM); wxP.frustumCulled = false; wxP.visible = false; S.add(wxP); let curWx = 0;
const CL = [], cgM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, fog: false, depthWrite: false }), cgG = new T.SphereGeometry(1, 8, 5);
for (let i = 0; i < QP.cl; i++) { const m = new T.Mesh(cgG, cgM); m.scale.set(22 + Math.random() * 16, 3, 12 + Math.random() * 10); m.position.set((Math.random() - .5) * 370, 76 + Math.random() * 22, (Math.random() - .5) * 370); S.add(m); CL.push(m); }
function wxu(dt) { if (!curWx) return; const v = curWx == 2 ? 24 : curWx == 3 ? .4 : 3.5; for (let i = 0; i < WN; i++) { const j = i * 3; wxA[j + 1] -= dt * v; wxA[j] += dt * (curWx == 3 ? 1.6 : curWx == 1 ? .7 : -2); if (wxA[j + 1] < 0) wxA[j + 1] += 20; if (wxA[j] > 22) wxA[j] -= 44; if (wxA[j] < -22) wxA[j] += 44; } wxG.attributes.position.needsUpdate = true; wxP.position.set(C.position.x, 0, C.position.z); }

const hl = new T.HemisphereLight(0xffffff, 0x4a5560, 1); S.add(hl);
const sn = new T.DirectionalLight(0xfff0dd, .7); sn.position.set(20, 30, 10); S.add(sn); S.add(sn.target);
if (QP.sh) { sn.castShadow = true; sn.shadow.mapSize.set(QP.sh, QP.sh); sn.shadow.bias = -.0006; const sk = sn.shadow.camera; sk.left = sk.bottom = -46; sk.right = sk.top = 46; sk.far = 160; sk.updateProjectionMatrix(); }
function sunAt(px, pz, f) { const sa = .9 + f * 1.3; sn.target.position.set(px, 0, pz); sn.position.set(px + Math.cos(sa) * 36, Math.sin(sa) * 30 + 8, pz + 10); }

// ---- procedural textures (small on purpose) ----
const NZ = n => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), d = x.createImageData(n, n), a = d.data; for (let i = 0; i < a.length; i += 4) { a[i] = a[i + 1] = a[i + 2] = Math.random() * 255; a[i + 3] = 255; } x.putImageData(d, 0, 0); return c; };
function brick(g, sz) { g.strokeStyle = 'rgba(0,0,0,.26)'; g.lineWidth = Math.max(1, sz / 280); const h = sz / 8; for (let r = 0; r < 8; r++) { g.beginPath(); g.moveTo(0, r * h); g.lineTo(sz, r * h); for (let c = r % 2 * sz / 8; c < sz; c += sz / 4) { g.moveTo(c, r * h); g.lineTo(c, r * h + h); } g.stroke(); } for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * .1 + ')'; g.fillRect(Math.random() * sz, Math.random() * sz, sz * (.02 + Math.random() * .07), sz * .015); } }
function blot(g, sz) { for (let i = 0; i < 90; i++) { const x = Math.random() * sz, y = Math.random() * sz, r = sz * (.03 + Math.random() * .09), l = Math.random() < .5 ? 0 : 255, q = g.createRadialGradient(x, y, 0, x, y, r), c = 'rgba(' + l + ',' + l + ',' + l + ','; q.addColorStop(0, c + (.08 + Math.random() * .12) + ')'); q.addColorStop(1, c + '0)'); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); } }
function mkT(sz, base, lv, edge, bl) {
  const c = document.createElement('canvas'); c.width = c.height = sz; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, sz, sz); g.globalCompositeOperation = 'overlay';
  [[sz / 8, .25], [sz / 2, .4], [sz, .55]].forEach(a => { g.globalAlpha = Math.min(1, a[1] * lv); g.drawImage(NZ(Math.max(2, a[0] | 0)), 0, 0, sz, sz); }); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (edge) { const q = g.createLinearGradient(0, 0, 0, sz); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = q; g.fillRect(0, 0, sz, sz); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = sz / 170; g.strokeRect(0, 0, sz, sz); brick(g, sz); }
  if (bl) blot(g, sz); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = QP.hq ? 8 : 1; return t;
}
const TX = QP.tx, tB = mkT(TX, '#d4d4d4', 1, 1), tG = mkT(TX, '#d0d0d0', 1.3, 0, 1), bB = QP.bump ? mkT(TX, '#808080', 1.4, 0) : null, bG = QP.bump ? mkT(TX, '#808080', 1.8, 0) : null;
tG.repeat.set(45, 45); if (bG) bG.repeat.set(45, 45);
const cc = document.createElement('canvas'); cc.width = cc.height = 128; const cg = cc.getContext('2d'); cg.fillStyle = '#d2d2d2'; cg.fillRect(0, 0, 128, 128); for (let i = 0; i < 36; i++) { cg.fillStyle = 'hsla(0,0%,' + (35 + Math.random() * 45) + '%,.85)'; cg.beginPath(); cg.ellipse(Math.random() * 128, Math.random() * 128, 5 + Math.random() * 14, 4 + Math.random() * 9, Math.random() * 3, 0, 7); cg.fill(); }
const camoT = new T.CanvasTexture(cc); camoT.wrapS = camoT.wrapT = T.RepeatWrapping;

// ---- world (one merged mesh for every wall/crate/roof = 1 draw call) ----
let world = null, WO = []; const BRM = [], PADS = [];
const bgeo = new T.CylinderGeometry(.45, .45, 1.15, 8), bmt = L(0xb02a20), trg = new T.ConeGeometry(1.7, 5.5, 7);
function disposeWorld() { for (const o of WO) { S.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); } WO.length = 0; BRM.length = 0; PADS.length = 0; }
function add(o) { S.add(o); WO.push(o); return o; }
function mkMerged(wd) {
  const bs = wd.boxes, n = bs.length, P3 = new Float32Array(n * 72), N3 = new Float32Array(n * 72), U2 = new Float32Array(n * 48), C3 = new Float32Array(n * 72), IX = new Uint16Array(n * 36), cc2 = new T.Color(); let vo = 0, io = 0;
  for (const b of bs) {
    const g = new T.BoxGeometry(b.w, b.h, b.d), pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv.array, ia = g.index.array, s = [[b.d, b.h], [b.d, b.h], [b.w, b.d], [b.w, b.d], [b.w, b.h], [b.w, b.h]], cy = b.y + b.h / 2; cc2.set(b.c);
    for (let k = 0; k < 24; k++) { const v = vo + k; P3[v * 3] = pa[k * 3] + b.x; P3[v * 3 + 1] = pa[k * 3 + 1] + cy; P3[v * 3 + 2] = pa[k * 3 + 2] + b.z; N3[v * 3] = na[k * 3]; N3[v * 3 + 1] = na[k * 3 + 1]; N3[v * 3 + 2] = na[k * 3 + 2]; U2[v * 2] = ua[k * 2] * s[k >> 2][0] / 3; U2[v * 2 + 1] = ua[k * 2 + 1] * s[k >> 2][1] / 3; C3[v * 3] = cc2.r; C3[v * 3 + 1] = cc2.g; C3[v * 3 + 2] = cc2.b; }
    for (let k = 0; k < 36; k++) IX[io + k] = ia[k] + vo; vo += 24; io += 36; g.dispose();
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P3, 3)); geo.setAttribute('normal', new T.BufferAttribute(N3, 3)); geo.setAttribute('uv', new T.BufferAttribute(U2, 2)); geo.setAttribute('color', new T.BufferAttribute(C3, 3)); geo.setIndex(new T.BufferAttribute(IX, 1));
  const mt = L(0xffffff); mt.vertexColors = true; mt.map = tB; if (bB && mt.bumpScale !== undefined) { mt.bumpMap = bB; mt.bumpScale = 1; }
  const m = new T.Mesh(geo, mt); m.castShadow = m.receiveShadow = !!QP.sh; return add(m);
}
function mkTerrain(wd, m) {
  const st = QP.ter, n = TN2 / st + 1, w = TN2 + 1, HT = wd.HT, pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), cl = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), idx = new Uint16Array((n - 1) * (n - 1) * 6);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gi = i * st, gj = j * st, k = gj * w + gi, v = j * n + i, h = HT[k];
    pos[v * 3] = gi - TW; pos[v * 3 + 1] = h; pos[v * 3 + 2] = gj - TW;
    const hx = (HT[gj * w + Math.min(w - 1, gi + 1)] - HT[gj * w + Math.max(0, gi - 1)]) / 2, hz = (HT[Math.min(w - 1, gj + 1) * w + gi] - HT[Math.max(0, gj - 1) * w + gi]) / 2, l = Math.hypot(hx, 1, hz);
    nor[v * 3] = -hx / l; nor[v * 3 + 1] = 1 / l; nor[v * 3 + 2] = -hz / l;
    const s = Math.min(1, Math.max(0, (.96 - nor[v * 3 + 1]) * 10)), c = .88 + .1 * Math.sin(gi * .31 + gj * .17) * Math.cos(gj * .23 - gi * .09) + .08 * Math.abs((Math.sin(k * 12.9898) * 43758.5453) % 1) + h * .05;
    cl[v * 3] = c * (1 - .3 * s); cl[v * 3 + 1] = c * (1 - .28 * s); cl[v * 3 + 2] = c * (1 - .22 * s); uv[v * 2] = i / (n - 1); uv[v * 2 + 1] = 1 - j / (n - 1);
  }
  let q = 0; for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(cl, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(new T.BufferAttribute(idx, 1));
  const mt = L(m.g); mt.vertexColors = true; mt.map = tG; if (bG && mt.bumpScale !== undefined) { mt.bumpMap = bG; mt.bumpScale = 1.2; }
  const me = new T.Mesh(geo, mt); me.receiveShadow = !!QP.sh; return add(me);
}
function mkDecor(wd, m, i) {
  let s2 = 101 + i * 7; const r = () => (s2 = s2 * 16807 % 2147483647) / 2147483647, fr = m.n == 'Frostbite', du = m.n == 'Dust', nm = m.city || m.ct, o = new T.Object3D();
  const inst = (geo, mat, n, f) => { const im = new T.InstancedMesh(geo, mat, n); let c = 0; for (let t = 0; t < n * 3 && c < n; t++) { const x = (r() - .5) * ZN * 1.85, z = (r() - .5) * ZN * 1.85; if (wd.BX.some(b => Math.abs(x - b.x) < b.w + .7 && Math.abs(z - b.z) < b.d + .7)) continue; f(x, z); o.updateMatrix(); im.setMatrixAt(c++, o.matrix); } im.count = c; im.frustumCulled = false; add(im); };
  if (!nm) inst(new T.ConeGeometry(.13, .55, 4).translate(0, .27, 0), L(new T.Color(m.g).multiplyScalar(fr ? .9 : .62).getHex()), du ? Math.min(QP.grass, 250) : QP.grass, (x, z) => { o.position.set(x, SH.hY(wd, x, z), z); o.rotation.set((r() - .5) * .4, r() * 6, (r() - .5) * .4); o.scale.set(1, .5 + r() * 1.1, 1); });
  inst(new T.DodecahedronGeometry(.4, 0), L(fr ? 0xa6b2bd : du ? 0x8a7358 : 0x78766f), nm ? Math.min(30, QP.rocks) : QP.rocks, (x, z) => { const s = .4 + r() * 1.1; o.position.set(x, SH.hY(wd, x, z) + .08, z); o.rotation.set(r() * 3, r() * 3, r() * 3); o.scale.set(s, s * .6, s); });
  if (!nm && !du) inst(new T.SphereGeometry(.6, 6, 4).translate(0, .3, 0), L(fr ? 0xdfe9f2 : 0x3c5e34), QP.bush, (x, z) => { o.position.set(x, SH.hY(wd, x, z), z); o.rotation.set(0, r() * 6, 0); o.scale.set(1 + r() * .6, .7 + r() * .5, 1 + r() * .6); });
}
function buildWorld(i) {
  disposeWorld(); world = SH.makeWorld(i); const m = world.m, wd = world;
  S.background.set(m.sky); dome.material.uniforms.b.value.set(m.sky); dome.material.uniforms.a.value.set(m.zn); sunM.material.color.set(0xffffff).lerp(new T.Color(m.sky), .3);
  curWx = m.wx | 0; wxP.visible = !!curWx; wxM.color.set([0, 0xffffff, 0x9fb8ff, 0xd8b98a][curWx]); wxM.size = [.1, .16, .07, .1][curWx];
  cgM.color.set(0xffffff).lerp(new T.Color(m.sky), .45); cgM.opacity = m.zn == 0x02040c ? .3 : .8;
  S.fog.color.set(m.sky); S.fog.near = m.nf[0]; S.fog.far = m.nf[1]; C.far = Math.max(115, m.nf[1] + 30); C.updateProjectionMatrix(); hl.intensity = m.li; sn.intensity = .7 * m.li;
  mkMerged(wd); mkTerrain(wd, m);
  if (wd.trees.length) { const im = new T.InstancedMesh(trg, L(m.tr[1]), wd.trees.length), o = new T.Object3D(); wd.trees.forEach((t, k) => { o.position.set(t.x, 5.75 * t.s, t.z); o.scale.setScalar(t.s); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }); im.frustumCulled = false; im.castShadow = !!QP.sh; add(im); }
  wd.barrels.forEach((b, k) => { const me = new T.Mesh(bgeo, bmt); me.position.set(b.x, .58 + SH.hY(wd, b.x, b.z) * 0, b.z); me.castShadow = !!QP.sh; S.add(me); WO.push(me); BRM[k] = me; });
  wd.pads.forEach(p => { const a = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, .12, 16), new T.MeshBasicMaterial({ color: 0x3ad0ff })), r = new T.Mesh(new T.RingGeometry(.9, 1, 20), new T.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: .6, side: T.DoubleSide, depthWrite: false })); a.position.set(p.x, .08, p.z); r.rotation.x = -Math.PI / 2; r.position.set(p.x, .14, p.z); add(a); add(r); PADS.push({ m: a, r, x: p.x, z: p.z }); });
  mkDecor(wd, m, i);
}
function killBarrel(i) { if (BRM[i]) BRM[i].visible = false; if (world) { const b = world.barrels[i]; if (b && b.al) { b.al = 0; const k = world.BX.indexOf(b.bx); if (k >= 0) world.BX.splice(k, 1); } } }

// ---- first person weapons (built lazily, only the one you pick) ----
const gn = new T.Group(); C.add(gn);
const GL=L(0x15171a),SL=L(0x3d5a80),HG=L(0x1a1a1c),LS=new T.MeshBasicMaterial({color:0x4a8aff}),AC2=new T.MeshStandardMaterial({color:0x58c8ff,emissive:0x2a9aff,emissiveIntensity:1.2}),RW=L(0xa83020);GL.metalness=.7;GL.roughness=.35;
const B3=(a,b,c)=>new T.BoxGeometry(a,b,c),CZ=(r,l,s)=>new T.CylinderGeometry(r,r,l,s||10).rotateX(Math.PI/2);
function arm(g,x,y,z,ph,th,ln){const d=[Math.cos(th)*Math.sin(ph),-Math.sin(th),Math.cos(th)*Math.cos(ph)],s=new T.Mesh(B3(.075,.075,ln),SL),f=new T.Mesh(B3(.07,.07,.11),HG),q=ln/2+.05;s.rotation.order=f.rotation.order='YXZ';s.rotation.set(th,ph,0);f.rotation.set(th,ph,0);s.position.set(x+d[0]*q,y+d[1]*q,z+d[2]*q);f.position.set(x,y,z);g.add(s,f)}
function buildGun(i){const w=W[i];const g=new T.Group(),nm=w.n,sg2=nm.includes('hotgun'),mt=L(w.c),fu=L(sg2?0x6b4425:w.c),p=w.pt,a=p[0];mt.metalness=.55;mt.roughness=.38;if(!sg2)fu.color.multiplyScalar(.55);
const A=(geo,m,x,y,z,rx)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;g.add(o);return o},top=a[4]+a[1]/2;
if(p.length>3){const b=p[1],q=p[2],s=p[3],r=Math.max(b[0],b[1])/2,bz=b[5]-b[2]/2;
A(B3(a[0],a[1],a[2]),mt,a[3],a[4],a[5]);A(B3(a[0]*.5,.014,a[2]*.92),GL,0,top+.007,a[5]);A(B3(.006,a[1]*.4,a[2]*.3),GL,a[0]/2+.002,a[4]+a[1]*.1,a[5]-a[2]*.1);
A(CZ(r,b[2]),GL,b[3],b[4],b[5]);A(CZ(r*1.7,.05),mt,b[3],b[4],bz+.025);A(B3(.007,.035,.007),GL,b[3],b[4]+r+.017,bz+.05);A(B3(.03,.016,.012),GL,0,top+.02,a[5]+a[2]*.4);
if(q[4]>0){}else if(q[2]>q[1]*1.5)A(CZ(Math.max(q[0],q[1])/2+.006,q[2]),fu,q[3],q[4],q[5]);else{A(B3(q[0],q[1],q[2]),GL,q[3],q[4],q[5],.12);A(B3(q[0]*1.15,.012,q[2]*1.2),mt,q[3],q[4]-q[1]/2,q[5]+.015,.12);A(CZ(r*2.3,b[2]*.5,8),fu,b[3],b[4],b[5]+b[2]*.2)}
A(B3(s[0],s[1],s[2]),fu,s[3],s[4],s[5]);A(B3(s[0]*1.1,s[1]*1.1,.018),GL,s[3],s[4],s[5]+s[2]/2);A(B3(.04,.1,.05),fu,0,a[4]-a[1]/2-.045,a[5]+a[2]*.28,.3);A(B3(.008,.03,.06),GL,0,a[4]-a[1]/2-.014,a[5]+a[2]*.05);
if(w.z<35){const y=top+.045;A(CZ(.02,.3,12),GL,0,y,a[5]-.02);A(CZ(.03,.07,12),GL,0,y,a[5]-.19);A(CZ(.026,.05,12),GL,0,y,a[5]+.15);A(B3(.018,.04,.02),GL,0,top+.02,a[5]-.08);A(B3(.018,.04,.02),GL,0,top+.02,a[5]+.08);A(new T.CircleGeometry(.027,12).rotateY(Math.PI),LS,0,y,a[5]-.226)}
if(nm=='Laser'||nm=='Railgun')for(let k=0;k<3;k++)A(CZ(r*2,.018,12),AC2,b[3],b[4],b[5]+.08*(k-1));
arm(g,0,a[4]-a[1]/2-.075,a[5]+a[2]*.28,.2,.35,.5);arm(g,0,b[4]-.04,b[5]+b[2]*.25,-.45,.5,.6)}
else if(p.length==2){const k=p[1];A(B3(a[0],a[1],a[2]),mt,a[3],a[4],a[5]);A(B3(a[0]*.8,.035,a[2]*.92),GL,0,a[4]-a[1]/2-.012,a[5]);A(CZ(.012,.05),GL,0,a[4],a[5]-a[2]/2-.02);for(let c=0;c<3;c++)A(B3(a[0]+.004,a[1]*.7,.004),GL,0,a[4]+.005,a[5]+a[2]*.3+c*.012);A(B3(.006,.012,.008),GL,0,top+.006,a[5]-a[2]/2+.01);A(B3(.014,.012,.008),GL,0,top+.006,a[5]+a[2]/2-.01);A(B3(k[0],k[1],k[2]),fu,k[3],k[4],k[5],.15);A(B3(.006,.03,.05),GL,0,a[4]-a[1]/2-.035,a[5]-.02);arm(g,0,k[4]-.03,k[5],.15,.45,.5)}
else if(nm=='Magnum'){const b=p[1],k=p[2];A(B3(a[0],a[1],a[2]),mt,a[3],a[4],a[5]);A(CZ(.04,.07,12),GL,0,a[4]+.005,a[5]-.01);A(CZ(.016,b[2]),GL,b[3],b[4],b[5]);A(B3(.012,.012,b[2]),GL,0,b[4]+.024,b[5]);A(B3(.01,.025,.02),GL,0,top+.008,a[5]+a[2]/2);A(B3(.007,.025,.007),GL,0,b[4]+.025,b[5]-b[2]/2);A(B3(k[0],k[1],k[2]),fu,k[3],k[4],k[5],.18);arm(g,0,k[4]-.04,k[5],.15,.45,.5)}
else if(nm=='Rocket'){const k=p[2];A(CZ(.065,.7,14),mt,a[3],a[4],a[5]);A(CZ(.082,.09,14),GL,a[3],a[4],a[5]+.34);A(CZ(.075,.06,14),GL,a[3],a[4],a[5]-.34);A(new T.ConeGeometry(.07,.2,12).rotateX(-Math.PI/2),RW,0,a[4],a[5]-.47);A(B3(.02,.04,.1),GL,0,top+.02,a[5]-.1);A(B3(k[0],k[1],k[2]),fu,k[3],k[4],k[5],.2);A(B3(.03,.1,.04),fu,0,a[4]-.09,a[5]-.18);arm(g,0,k[4]-.03,k[5]+.02,.2,.4,.5);arm(g,0,a[4]-.14,a[5]-.18,-.45,.5,.6)}
else{const b=p[1],k=p[2],bq=new T.Group();bq.position.set(b[3],b[4],b[5]);for(let c=0;c<6;c++){const an=c*Math.PI/3,o=new T.Mesh(CZ(.014,.5,8),GL);o.position.set(Math.cos(an)*.035,Math.sin(an)*.035,0);bq.add(o)}for(const zz of[-.22,.02,.24]){const o=new T.Mesh(CZ(.052,.02,12),mt);o.position.z=zz;bq.add(o)}g.add(bq);w.sp=bq;A(B3(a[0],a[1],a[2]),mt,a[3],a[4],a[5]);A(B3(.05,.05,.3),GL,0,top+.02,0);A(B3(k[0],k[1],k[2]),fu,k[3],k[4],k[5],.15);arm(g,0,k[4]-.03,k[5],.2,.35,.5);arm(g,0,a[4]-.08,a[5]-.1,-.45,.5,.6)}
g.visible=false;w.g=g;gn.add(g);return g}
const gunCache = []; function gunFor(i) { return gunCache[i] || (gunCache[i] = buildGun(i)); }
const mlt = QP.hq ? new T.PointLight(0xffc060, 0, 10) : { intensity: 0 }; if (QP.hq) { mlt.position.set(.2, -.1, -.9); C.add(mlt); }
const kg=new T.Group(),KM=L(0xdde3e8),KH=L(0x1c1e21),bsh=new T.Shape();KM.metalness=.6;KM.roughness=.25;KM.emissive.set(0x2c3238);
bsh.moveTo(0,.02);bsh.lineTo(.17,.02);bsh.quadraticCurveTo(.235,.018,.275,-.014);bsh.quadraticCurveTo(.15,-.03,0,-.022);bsh.lineTo(0,.02);
kg.add(new T.Mesh(new T.ExtrudeGeometry(bsh,{depth:.006,bevelEnabled:false}).translate(0,0,-.003).rotateY(Math.PI/2),KM));
{const kA=(geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);kg.add(o)};kA(B3(.0066,.006,.17),GL,0,.006,-.1);kA(B3(.012,.045,.012),GL,0,0,.004);kA(CZ(.017,.11,10),KH,0,0,.06);kA(new T.SphereGeometry(.02,8,6),GL,0,0,.12);for(let c=0;c<4;c++)kA(CZ(.019,.008,10),GL,0,0,.025+c*.026)}
arm(kg,0,-.005,.07,.12,.3,.55);kg.visible=false;C.add(kg);
const sg = new T.SphereGeometry(.06, 6, 6), sm = new T.MeshBasicMaterial({ color: 0xffcc66 }), fl = new T.Mesh(new T.BoxGeometry(.12, .12, .03), new T.MeshBasicMaterial({ color: 0xffd060 })); fl.position.set(0, .02, -.53); fl.visible = false; gn.add(fl);
const dk = L(0x22262b);

// ---- soldiers ----
const MT = { h: L(0xe0b48c), l: L(0x2c2f36), g: L(0x111111), t: L(0x2a3328) };
const UMT = [[0x3d5a80, 0x4a7a9a], [0x8a3b32, 0x6a2f2a]].map(a => a.map(c => { const m = L(c); m.map = camoT; return m; })), mkb = new T.MeshBasicMaterial({ color: 0x4ab0ff });
const Q = { pel: new T.BoxGeometry(.34, .2, .22), ch: new T.CylinderGeometry(.19, .17, .5, 8).scale(1, 1, .65), vt: new T.BoxGeometry(.4, .32, .27), pk: new T.BoxGeometry(.28, .34, .14), hd: new T.SphereGeometry(.125, 10, 8), hm: new T.SphereGeometry(.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * .55), vz: new T.BoxGeometry(.2, .06, .05), th: new T.CylinderGeometry(.085, .07, .46, 6).translate(0, -.23, 0), sk: new T.CylinderGeometry(.065, .055, .44, 6).translate(0, -.22, 0), bt: new T.BoxGeometry(.12, .1, .27), ua: new T.CylinderGeometry(.055, .048, .3, 6).translate(0, -.15, 0), fa: new T.CylinderGeometry(.045, .04, .27, 6).translate(0, -.135, 0), rf: new T.BoxGeometry(.06, .09, .62), ba: new T.BoxGeometry(.025, .025, .3), mg: new T.BoxGeometry(.04, .14, .07) };
function mkE(id, tm, name, wp, mine) {
  const g = new T.Group(), e = { id, tm, nm: name, wp, g, x: 0, z: 0, y: 0, yw: 0, dead: 0, age: 1, bs: 1, wk: 0, mt: 0, rc: 0, fk: 0, aim: 0, mvv: 0, lf: -9, hp: 100, ph: Math.random() * 6, small: [], fresh: 1 }, um = UMT[tm & 1][id & 1];
  g.rotation.order = 'YXZ';
  const mm = (o, mt, px, py, pz, p, lod) => { const m = new T.Mesh(o, mt); m.position.set(px, py, pz); m.castShadow = !!QP.sh; p.add(m); if (lod) e.small.push(m); return m; }, jt = (p, px, py, pz) => { const o = new T.Group(); o.position.set(px, py, pz); p.add(o); return o; };
  const hip = jt(g, 0, .95, 0), tr = jt(hip, 0, .1, 0), hd = jt(tr, 0, .68, 0), rf = jt(tr, .1, .33, -.3);
  mm(Q.pel, MT.l, 0, 0, 0, hip); mm(Q.ch, um, 0, .27, 0, tr);
  if (QP.hq) { mm(Q.vt, MT.l, 0, .3, 0, tr, 1); mm(Q.pk, MT.l, 0, .28, .2, tr, 1); mm(Q.vz, MT.g, 0, .02, -.115, hd, 1); mm(Q.ba, MT.g, 0, .02, -.45, rf, 1); mm(Q.mg, MT.g, 0, -.1, -.05, rf, 1); }
  mm(Q.hd, MT.h, 0, 0, 0, hd); mm(Q.hm, MT.t, 0, .02, 0, hd); mm(Q.rf, MT.g, 0, 0, 0, rf);
  [-1, 1].forEach((s, i) => {
    const a = jt(tr, s * .26, .5, 0), el = jt(a, 0, -.3, 0), l = jt(hip, s * .1, -.08, 0), kn = jt(l, 0, -.46, 0);
    mm(Q.ua, um, 0, 0, 0, a); mm(Q.fa, um, 0, 0, 0, el); mm(Q.th, um, 0, 0, 0, l); mm(Q.sk, MT.l, 0, 0, 0, kn); if (QP.hq) mm(Q.bt, MT.l, 0, -.46, -.04, kn, 1);
    e['a' + (i + 1)] = a; e['e' + (i + 1)] = el; e['l' + (i + 1)] = l; e['k' + (i + 1)] = kn;
  });
  const f = new T.Mesh(sg, sm); f.position.set(0, .02, -.65); f.scale.setScalar(2.5); f.visible = false; rf.add(f);
  Object.assign(e, { hip, tr, hd, rf, mf: f }); rf.scale.z = Math.abs(W[wp].fz) / .53;
  if (mine) { const k = new T.Mesh(sg, mkb); k.position.set(0, .4, 0); k.scale.setScalar(1.8); hd.add(k); }
  g.visible = false; S.add(g); return e;
}
function setWp(e, wp) { if (e.wp !== wp) { e.wp = wp; e.rf.scale.z = Math.abs(W[wp].fz) / .53; } }
function dropE(e) { S.remove(e.g); }

// ---- effects ----
let fx = [], tm = 0, shk = 0;
const lm = new T.LineBasicMaterial({ color: 0xffe08a }), TRP = []; let trI = 0;
for (let i = 0; i < 12; i++) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3)); const l = new T.Line(g, lm); l.visible = false; l.frustumCulled = false; S.add(l); TRP.push({ l, t: 0 }); }
function tracer(a, b) { const o = TRP[trI++ % TRP.length], p = o.l.geometry.attributes.position.array; p[0] = a.x; p[1] = a.y; p[2] = a.z; p[3] = b.x; p[4] = b.y; p[5] = b.z; o.l.geometry.attributes.position.needsUpdate = true; o.l.visible = true; o.t = .07; }
const rm = new T.MeshBasicMaterial({ color: 0xcc2222 }), bm = new T.MeshBasicMaterial({ color: 0xff8a2a });
const pg = new T.BoxGeometry(.4, .4, .4), pm = [0x4be38a, 0xd8b04a, 0xb86bff, 0x4ae0ff, 0xff9a3a].map(c => new T.MeshBasicMaterial({ color: c }));
const dgm = new T.CircleGeometry(.09, 6), dmt = new T.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: .8, depthWrite: false });
function decal(p, ax, sg2) { if (fx.length > 100) return; const m = new T.Mesh(dgm, dmt); m.position.set(p.x, p.y, p.z); const n = [0, 0, 0]; n[ax] = sg2; m.position.x += n[0] * .03; m.position.y += n[1] * .03; m.position.z += n[2] * .03; m.lookAt(p.x + n[0], p.y + n[1], p.z + n[2]); S.add(m); fx.push({ m, t: 7 }); }
function popNum(p, v, hs) { const q = p.clone().project(C); if (q.z > 1) return; const d = document.createElement('div'); d.className = 'dn' + (hs ? ' hs' : ''); d.textContent = v; d.style.left = ((q.x + 1) / 2 * innerWidth) + 'px'; d.style.top = ((1 - q.y) / 2 * innerHeight) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 800); }
function spark(p, r) { for (let i = 0; i < Math.max(1, Math.round((r ? 4 : 3) * QP.fx)); i++) { const m = new T.Mesh(sg, r ? rm : sm); m.position.copy(p); S.add(m); fx.push({ m, t: .35 + Math.random() * .3, v: new T.Vector3((Math.random() - .5) * 4, Math.random() * 3 + 1, (Math.random() - .5) * 4) }); } }
function puff(p, c, k, t) { const m = new T.Mesh(sg, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .55 })); m.position.copy(p); S.add(m); fx.push({ m, t, t0: t, k, s0: .3, fd: 1, o: .55, dm: 1 }); }
const cgeo = new T.BoxGeometry(.03, .03, .09);
function casing() { if (QP.fx < .8 || fx.length > 120) return; const m = new T.Mesh(cgeo, pm[1]); m.position.copy(gn.localToWorld(new T.Vector3(.1, .03, -.05))); S.add(m); fx.push({ m, t: 1.1, v: new T.Vector3(1, 0, 0).applyQuaternion(C.quaternion).multiplyScalar(2 + Math.random()).add(new T.Vector3(0, 2 + Math.random() * 1.5, 0)), rt: 12 }); }
function spawnFx(x, z, t) { const m = new T.Mesh(new T.CylinderGeometry(.7, .7, 36, 8), new T.MeshBasicMaterial({ color: t ? 0xff5a4a : 0x4ab0ff, transparent: true, opacity: .5 })); m.position.set(x, 18, z); S.add(m); fx.push({ m, t: .9, t0: .9, k: 1, s0: 1, fd: 1, o: .5, d: 1, dm: 1 }); }
function boomFx(p, r) {
  const mb = c => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .9 });
  let m = new T.Mesh(sg, mb(0xffa030)); m.position.copy(p); S.add(m); fx.push({ m, t: .45, t0: .45, k: r * 14, s0: .2, fd: 1, o: .9, dm: 1 });
  m = new T.Mesh(new T.RingGeometry(.85, 1, 20), mb(0xffe6b0)); m.material.side = T.DoubleSide; m.rotation.x = -Math.PI / 2; m.position.set(p.x, .12, p.z); S.add(m); fx.push({ m, t: .55, t0: .55, k: r * 1.8, s0: .1, fd: 1, o: .9, d: 1, dm: 1 });
  for (let i = 0; i < Math.round(8 * QP.fx); i++) { const s = new T.Mesh(sg, i % 2 ? sm : bm); s.position.copy(p); S.add(s); fx.push({ m: s, t: .8 + Math.random() * .5, v: new T.Vector3((Math.random() - .5) * 14, 6 + Math.random() * 10, (Math.random() - .5) * 14) }); }
  m = new T.Mesh(sg, mb(0x333333)); m.position.set(p.x, p.y + 1, p.z); S.add(m); fx.push({ m, t: 1.6, t0: 1.6, k: r * 14, s0: .3, fd: 1, o: .9, dm: 1, rs: 2.5 });
}
function fxStep(dt) {
  for (const o of TRP) if (o.t > 0 && (o.t -= dt) <= 0) o.l.visible = false;
  fx = fx.filter(f => {
    f.t -= dt;
    if (f.t > 0) {
      if (f.t0) { const u = 1 - f.t / f.t0; if (f.k) { const s = f.s0 + u * (1 - f.s0); f.m.scale.set(f.k * s, f.k * (f.ky || 1) * s, f.k * s); } if (f.fd) f.m.material.opacity = f.o * (1 - u); if (f.rs) f.m.position.y += f.rs * dt; }
      if (f.v) { f.v.y -= 18 * dt; f.m.position.addScaledVector(f.v, dt); if (f.m.position.y < .05) { f.m.position.y = .05; f.v.multiplyScalar(.4); } if (f.rt) { f.m.rotation.x += f.rt * dt; f.m.rotation.z += f.rt * dt; } }
      return true;
    }
    S.remove(f.m); if (f.d) f.m.geometry.dispose(); if (f.dm) f.m.material.dispose(); return false;
  });
}

// smoke clouds
const SMK = [];
function smokeAt(x, z) { for (let i = 0; i < QP.smk; i++) { const m = new T.Mesh(sg, new T.MeshBasicMaterial({ color: 0xcfd3d6, transparent: true, opacity: 0, depthWrite: false })); m.position.set(x + (Math.random() - .5) * 7, .8 + Math.random() * 3, z + (Math.random() - .5) * 7); m.scale.setScalar(5); S.add(m); SMK.push({ m, k: 60 + Math.random() * 30, t: 15, t0: 15 }); } }
function smkStep(dt) { for (let i = SMK.length - 1; i >= 0; i--) { const s = SMK[i], u = Math.min(1, (s.t0 - s.t) / 1.4); s.t -= dt; s.m.scale.setScalar(s.k * (.15 + .85 * u)); s.m.material.opacity = .82 * u * Math.min(1, s.t / 3); if (s.t <= 0) { S.remove(s.m); s.m.material.dispose(); SMK.splice(i, 1); } } }
function clearTemp() { fx.forEach(f => S.remove(f.m)); fx = []; SMK.forEach(s => { S.remove(s.m); s.m.material.dispose(); }); SMK.length = 0; TRP.forEach(o => { o.l.visible = false; o.t = 0; }); }

// aircraft / care package / helicopter / nuke (visual only: the server does the damage)
const PL_M = L(0x6a7078), PL_D = L(0x2c3036), PLN = [], CPK = [], HEL = [null, null]; let MIS = null, MIS_T = 0, nfl = 0;
function mkPlane() { const g = new T.Group(); const a = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); g.add(o); }; a(new T.CylinderGeometry(.6, .35, 9, 6).rotateX(Math.PI / 2), PL_M, 0, 0, 0); a(new T.BoxGeometry(11, .18, 2), PL_M, 0, 0, .4); a(new T.BoxGeometry(3.6, .14, 1.2), PL_M, 0, .1, 3.8); a(new T.BoxGeometry(.14, 1.6, 1.4), PL_M, 0, .8, 3.8); a(new T.ConeGeometry(.6, 1.6, 6).rotateX(-Math.PI / 2), PL_D, 0, 0, -5.2); g.scale.setScalar(1.6); return g; }
function addPlane(cx, cz, a, y, v, L0) { const dx = Math.sin(a), dz = Math.cos(a), g = mkPlane(); g.rotation.y = Math.atan2(-dx, -dz); g.position.set(cx - dx * L0, y, cz - dz * L0); S.add(g); PLN.push({ g, dx, dz, cx, cz, t: 0, v, L: L0 }); }
function flyby() { addPlane(0, 0, Math.random() * 6.28, 64, 95, ZN * 2); }
function callCareVis(x, z, tf) {
  const g = new T.Group(), c = new T.Mesh(new T.BoxGeometry(1.5, 1.2, 1.5), L(0x7a5a32)), pmt = L(0xe07a2a); pmt.side = T.DoubleSide; const pc = new T.Mesh(new T.SphereGeometry(2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), pmt); pc.position.y = 4; g.add(c); g.add(pc);
  g.position.set(x, 55, z); S.add(g); CPK.push({ g, t: 0, tf, x, z });
}
function startHeli(tm2) {
  if (HEL[tm2]) { HEL[tm2].t = 22; return; }
  const g = new T.Group(), rot = new T.Group(), mt = L(0x3a4a3a); const a = (geo, m, x, y, z, p) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); (p || g).add(o); };
  a(new T.BoxGeometry(2.2, 1.9, 5), mt, 0, 0, 0); a(new T.BoxGeometry(.5, .5, 5), mt, 0, .4, 4.6); a(new T.BoxGeometry(1.8, .14, .6), PL_D, 0, .9, 7); a(new T.BoxGeometry(.14, 1.2, .6), PL_D, 0, .9, 7);
  rot.position.y = 1.4; g.add(rot); a(new T.BoxGeometry(15, .07, .55), PL_D, 0, 0, 0, rot); a(new T.BoxGeometry(.55, .07, 15), PL_D, 0, 0, 0, rot); g.scale.setScalar(1.3); g.position.set(70, 24, 0); S.add(g); HEL[tm2] = { g, rot, t: 22, a: tm2 * Math.PI };
}
function startNuke() {
  const g = new T.Group(), mt = L(0xb8bcc2), rd = L(0xc03020); const a = (geo, m, y) => { const o = new T.Mesh(geo, m); o.position.y = y; g.add(o); };
  a(new T.CylinderGeometry(1.1, 1.1, 9, 10), mt, 0); a(new T.ConeGeometry(1.1, 3.2, 10), rd, 6.1);
  for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.BoxGeometry(.2, 2.4, 2.2), rd); f.position.set(Math.sin(i * 1.571) * 1.4, -3.3, Math.cos(i * 1.571) * 1.4); f.rotation.y = i * 1.571; g.add(f); }
  g.rotation.x = Math.PI; g.scale.setScalar(1.4); g.position.set(0, 170, 0); S.add(g); MIS = g; MIS_T = 4.2;
}
function nukeHit() {
  if (MIS) { S.remove(MIS); MIS = null; } nfl = 1.8; shk = 2.2;
  const mb = (geo, c, o) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: T.DoubleSide })); S.add(m); return m; };
  let m = mb(sg, 0xfff2c0, 1); m.position.set(0, 3, 0); fx.push({ m, t: 3.2, t0: 3.2, k: 900, s0: .03, fd: 1, o: 1, dm: 1 });
  m = mb(new T.RingGeometry(.9, 1, 32), 0xffffff, .8); m.rotation.x = -Math.PI / 2; m.position.set(0, .3, 0); fx.push({ m, t: 3.2, t0: 3.2, k: ZN * 3, s0: .03, fd: 1, o: .8, d: 1, dm: 1 });
  m = mb(new T.CylinderGeometry(.6, 1.2, 1, 10), 0xc8742a, .85); m.position.set(0, .5, 0); fx.push({ m, t: 8, t0: 8, k: 13, ky: 6, s0: .05, fd: 1, o: .85, d: 1, dm: 1, rs: 4.5 });
  m = mb(sg, 0xd9822f, .85); m.position.set(0, 8, 0); fx.push({ m, t: 8, t0: 8, k: 560, ky: .65, s0: .05, fd: 1, o: .85, dm: 1, rs: 8.5 });
}
function airStep(dt) {
  for (let i = PLN.length - 1; i >= 0; i--) { const p = PLN[i], g = p.g; p.t += dt; g.position.x += p.dx * p.v * dt; g.position.z += p.dz * p.v * dt; g.rotation.z = Math.sin(p.t * 3) * .06; const al = (g.position.x - p.cx) * p.dx + (g.position.z - p.cz) * p.dz; if (al > p.L + 25 || p.t > 10) { S.remove(g); PLN.splice(i, 1); } }
  for (let i = CPK.length - 1; i >= 0; i--) { const c = CPK[i], g = c.g; c.t += dt; const u = Math.min(1, c.t / c.tf); g.position.y = 55 - (55 - .7) * u; g.rotation.y += dt * .5; if (u >= 1) { puff(new T.Vector3(c.x, .8, c.z), 0xb09a7a, 50, 1.2); S.remove(g); CPK.splice(i, 1); } }
  if (MIS) { MIS_T -= dt; MIS.position.y = Math.max(3, 170 * Math.pow(Math.max(0, MIS_T) / 4.2, 1.5)); MIS.rotation.y += dt * 3; if (Math.random() < .5) puff(new T.Vector3(MIS.position.x, MIS.position.y + 7, MIS.position.z), 0xcccccc, 70, 1.6); }
  for (let k = 0; k < 2; k++) { const H = HEL[k]; if (!H) continue; H.t -= dt; H.a += dt * .35; const t = H.t, R0 = t > 20 ? 30 + (t - 20) * 20 : t < 2 ? 30 + (2 - t) * 30 : 30, y = 24 + (t < 2 ? (2 - t) * 20 : 0); H.g.position.set(Math.cos(H.a) * R0, y, Math.sin(H.a) * R0); H.g.rotation.y = Math.PI - H.a; H.g.rotation.z = .18; H.rot.rotation.y += dt * 32; if (H.t <= 0) { S.remove(H.g); HEL[k] = null; } }
  CL.forEach(m => { m.position.x += dt * 3; if (m.position.x > 190) m.position.x -= 380; });
  nfl = Math.max(0, nfl - dt * .6); shk = Math.max(0, shk - dt * 1.8);
}
function clearAir() { PLN.concat(CPK).forEach(o => S.remove(o.g)); PLN.length = CPK.length = 0; HEL.forEach((h, i) => { if (h) { S.remove(h.g); HEL[i] = null; } }); if (MIS) { S.remove(MIS); MIS = null; } nfl = 0; shk = 0; }
