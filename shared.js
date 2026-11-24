'use strict';
// Shared by server (require) and browser (<script>). Pure data + math, no THREE.
(function (X) {
  const ZN = 62, GN = ZN * 2, TW = ZN + 6, TN2 = TW * 2;

  // wx: 0 none, 1 snow, 2 rain, 3 dust. br:1 = Battle Royale mode (one life, shrinking storm, loot)
  const MP=[
{n:'Depot',sky:0x9db3c7,zn:0x4a86c8,nf:[15,115],g:0x59664f,gl:0x3d4a38,w:0x6b7078,li:1,p:[0x8a6a43,0x4f6b7a,0x7a5a5a,0x6a7a4f],k:40,a:[2,3,1.4,2.6],tr:[36,0x2f5a34],bl:[[-40,-34,20,14,9,0x7a7468,7],[38,-40,16,16,8,0x6e6a63,13],[-44,24,16,18,9,0x8a7d6a,11],[2,-26,14,12,8,0x777a80,7],[30,24,18,14,9,0x80786c,14],[-16,8,12,12,7,0x6f7378,15]]},
{n:'Dust',sky:0xe3b97e,zn:0x7aa0c8,nf:[30,150],g:0xc9a36a,gl:0xb08d57,w:0x9a7a4d,li:1,p:[0xa8794a,0x8f6a43,0xb58a55],k:26,a:[3,4,3,4],lw:1,tr:[16,0x8a7a45],wx:3,bl:[[-44,-38,18,16,8,0xb08d57,7],[44,-12,18,14,8,0xa8794a,13],[-40,34,16,14,7,0x9a7a4d,14],[14,-40,14,14,7,0xb59a62,11],[26,34,16,12,7,0xa88b58,7]]},
{n:'Midnight',sky:0x0b1020,zn:0x02040c,nf:[8,75],g:0x3a3f4a,gl:0x4a5262,w:0x4a5060,li:.85,p:[0x56688a,0x6a5880,0x3f6b6b],k:24,a:[1.5,2,1,1.2],wx:2,city:1},
{n:'Frostbite',sky:0xcfe0ee,zn:0x8fb4d6,nf:[12,85],g:0xeef3f7,gl:0xbfd0de,w:0x8fa3b5,li:.95,p:[0x7e93a8,0x5d7186,0x9db0c2,0x6d8b9a],k:56,a:[1.5,1.5,3,3],tr:[44,0xdfe9f2],wx:1,bl:[[-36,-40,16,16,7,0x9db0c2,7],[38,30,16,14,7,0x8fa3b5,14],[-40,20,14,14,7,0x9ab0c4,11],[10,-36,14,14,7,0x8da4b8,13],[-6,26,12,12,7,0xa3b6c8,7]]},
{n:'Harbor',sky:0x9ec4d4,zn:0x4a7fa8,nf:[18,130],g:0x74787c,gl:0x5c6064,w:0x555c64,li:1,p:[0xc04030,0x3060a0,0xd0a030,0x308050],k:30,a:[1.4,1.2,1.2,1],ct:26,bl:[[-40,-36,20,14,8,0x6a737a,7],[40,34,18,14,8,0x73706a,13],[-36,30,16,14,7,0x6a6f75,11],[34,-30,14,14,7,0x707880,14]]},
{n:'Ridge',sky:0x9fb4a8,zn:0x5f86a6,nf:[14,95],g:0x66784f,gl:0x4f5f3e,w:0x6c6a60,li:.95,p:[0x7a6a55,0x5a6a5a,0x86765e],k:26,a:[2,3,1.6,2.6],tr:[70,0x2a4a2c],wx:2,bl:[[-38,-34,18,14,8,0x7a7468,7],[36,30,16,14,8,0x6e6a63,13],[-8,-30,14,12,7,0x777a80,11]]},
{n:'Mesa',sky:0xf2a96e,zn:0x6d8ab8,nf:[26,135],g:0xb87a50,gl:0xa06840,w:0x8a5a3c,li:1,p:[0x9a6a48,0x80563a,0xb07850],k:30,a:[3,4,2,3.4],lw:1,tr:[10,0x8a7a45],wx:3,bl:[[-42,-36,18,16,8,0xa06840,7],[42,-10,18,14,8,0x9a6a48,13],[-38,34,16,14,7,0x8a5a3c,14],[16,-38,14,14,7,0xb07850,11]]},
{n:'Marsh',sky:0x8fa593,zn:0x5f7f6c,nf:[7,68],g:0x4b5c3b,gl:0x3b4a2f,w:0x5c5c4a,li:.85,p:[0x6a6a50,0x55604a,0x7a735a],k:34,a:[1.6,2.4,1.4,2.2],tr:[48,0x24402a],wx:2,bl:[[-40,32,16,14,7,0x6a6a58,7],[34,-36,16,14,7,0x626250,14],[2,30,12,12,7,0x70705c,11]]},
{n:'Quarry',sky:0xb9c2c9,zn:0x7f93a6,nf:[18,110],g:0x8a8a84,gl:0x70706a,w:0x6a6a66,li:.95,p:[0x7d7d78,0x66665f,0x8f8c84],k:36,a:[2.4,3,1.6,3],lw:1,tr:[8,0x4a5a3a],wx:0,bl:[[-40,-34,18,14,8,0x77776f,7],[40,28,16,14,8,0x6e6e68,13],[0,36,14,12,7,0x82827a,11]]},
{n:'Meadow',sky:0xa8d4f0,zn:0x5fa0e0,nf:[30,150],g:0x6d9a4a,gl:0x5a8a3c,w:0x9a8f7a,li:1.05,p:[0x9a8a6a,0x8a9a7a,0xa89a82],k:22,a:[1.8,2.4,1.2,2],tr:[50,0x3a7a38],wx:0,bl:[[-38,-34,18,14,7,0x9a8f7a,7],[36,30,16,14,7,0x8f8a7a,13]]},
{n:'Twilight',sky:0x4a3a6a,zn:0x1a1f3a,nf:[10,80],g:0x3e4a3a,gl:0x2e3a2e,w:0x4a4a52,li:.75,p:[0x4a4a58,0x3e4652,0x55505e],k:30,a:[2,3,1.6,2.6],tr:[56,0x1a3a2a],wx:0,bl:[[-40,-34,18,14,8,0x4a4a58,7],[38,30,16,14,8,0x3e4652,13],[-6,32,14,12,7,0x55505e,11]]},
{n:'Ashfall',sky:0x5a3a30,zn:0x2a1a1a,nf:[14,100],g:0x3a3430,gl:0x2a2420,w:0x4a3a34,li:.85,p:[0x5a4038,0x4a342e,0x6a4a3c],k:34,a:[2.4,3,1.6,3],lw:1,tr:[6,0x2a2420],wx:3,bl:[[-42,-36,18,16,8,0x4a3a34,7],[42,-12,18,14,8,0x5a4038,13],[-36,34,16,14,7,0x4a342e,14],[14,-40,14,14,7,0x6a4a3c,11]]},
{n:'Glacier',sky:0x9fc4e8,zn:0x4a78b0,nf:[10,80],g:0xdfeaf4,gl:0xb0c8de,w:0x7f97ae,li:.9,p:[0x6f88a2,0x8aa4bd,0x5d7691],k:44,a:[1.6,2.4,2.4,3],tr:[30,0xdfe9f2],wx:1,bl:[[-38,-34,16,14,7,0x8aa4bd,7],[36,30,16,14,7,0x7f97ae,13],[4,-38,14,12,7,0x6f88a2,11]]},
{n:'Battle Royale',sky:0xa8c8e0,zn:0x5f8fd0,nf:[26,140],g:0x5f8a46,gl:0x4e7a38,w:0x8a7f6c,li:1,p:[0x8a7a62,0x7a8a6a,0x9a8a72],k:30,a:[2,3,1.4,2.4],tr:[44,0x2f6a34],wx:0,br:1,bl:[[-42,-36,18,14,8,0x8a7a62,7],[44,-30,16,14,8,0x7a8a6a,13],[-40,30,16,14,7,0x9a8a72,11],[38,34,18,14,7,0x8a7f6c,14],[0,-8,14,12,7,0x7a7a72,7],[-8,40,12,12,7,0x85796a,13]]},
{ n: 'Jungle', sky: 0x7fa88a, zn: 0x3f7a58, nf: [10, 70], g: 0x3f5a34, gl: 0x2d4328, w: 0x3b4a36, li: .8, p: [0x5a4a38, 0x46603f, 0x6a5a45], k: 22, a: [2, 2.5, 1.4, 2], tr: [90, 0x2a5a2e], wx: 2, hl: 1.3, bl: [[-38, -34, 16, 14, 8, 0x5a5448, 7], [36, 30, 16, 14, 8, 0x55503f, 13], [-30, 30, 14, 14, 7, 0x4f4a3c, 11]] }
];

  // m mag, r reserve, cd fire delay, d dmg, h headshot dmg, s spread, p pellets, x explosion radius
  const W=[
{n:'Rifle',m:30,r:120,cd:.095,d:34,h:100,s:.009,rl:1.5,z:55,k:1,v:.55,f:2600,fz:-.53,c:0x22262b,pt:[[.07,.1,.45,0,0,0],[.03,.03,.3,0,.02,-.35],[.05,.14,.07,0,-.1,.05],[.06,.1,.18,0,-.02,.3]]},
{n:'SMG',m:40,r:200,cd:.06,d:20,h:50,s:.016,rl:1.3,z:60,k:.7,v:.4,f:3200,fz:-.34,c:0x2d3140,pt:[[.07,.1,.3,0,0,0],[.03,.03,.14,0,.02,-.22],[.04,.2,.05,0,-.13,.02],[.05,.08,.12,0,-.02,.2]]},
{n:'Shotgun',m:8,r:32,cd:.75,d:16,h:40,s:.05,p:8,rl:2.2,z:65,k:5,v:.9,f:1200,fz:-.7,c:0x4a3322,pt:[[.08,.09,.35,0,0,0],[.035,.035,.55,0,.03,-.4],[.05,.06,.3,0,-.04,-.2],[.06,.1,.3,0,-.03,.3]]},
{n:'Sniper',m:5,r:25,cd:1.1,d:150,h:300,s:.002,rl:2.4,z:16,k:8,v:.8,f:1800,fz:-.9,c:0x1f2e25,pt:[[.06,.09,.55,0,0,0],[.025,.025,.6,0,.02,-.55],[.04,.05,.18,0,.09,-.05],[.06,.1,.25,0,-.03,.35]]},
{n:'Pistol',m:12,r:96,cd:.17,d:28,h:80,s:.007,rl:1,z:70,k:1.5,v:.35,f:3000,fz:-.2,c:0x30343b,pt:[[.05,.07,.24,0,.02,0],[.04,.11,.06,0,-.07,.07]]},
{n:'LMG',m:100,r:200,cd:.075,d:26,h:65,s:.02,rl:3.2,z:62,k:.8,v:.6,f:2200,fz:-.7,c:0x2f3a2c,pt:[[.09,.12,.5,0,0,0],[.035,.035,.4,0,.03,-.45],[.12,.12,.14,0,-.11,0],[.06,.1,.2,0,-.02,.35]]},
{n:'Magnum',m:6,r:36,cd:.5,d:85,h:200,s:.004,rl:2,z:50,k:5,v:.7,f:1600,fz:-.42,c:0x6b6f75,pt:[[.05,.08,.2,0,.01,0],[.03,.03,.3,0,.02,-.22],[.045,.12,.07,0,-.08,.1]]},
{n:'Rocket',m:1,r:8,cd:1.3,d:130,h:130,s:.004,x:5,rl:2.4,z:60,k:6,v:1,f:700,fz:-.55,c:0x3b4a2f,pt:[[.1,.1,.7,0,.02,0],[.14,.14,.12,0,.02,-.4],[.04,.12,.06,0,-.08,.05]]},
{n:'Minigun',m:200,r:400,cd:.04,d:15,h:40,s:.03,rl:4.5,z:65,k:.5,v:.4,f:2400,fz:-.62,c:0x3a3f44,pt:[[.1,.12,.5,0,0,0],[.1,.1,.3,0,.01,-.4],[.04,.12,.06,0,-.1,.1]]},
{n:'DMR',m:15,r:75,cd:.28,d:55,h:150,s:.004,rl:1.8,z:30,k:2.5,v:.6,f:2000,fz:-.62,c:0x2a3326,pt:[[.06,.09,.5,0,0,0],[.025,.025,.4,0,.02,-.45],[.04,.05,.2,0,.08,-.05],[.06,.1,.2,0,-.02,.33]]},
{n:'Laser',m:40,r:160,cd:.12,d:24,h:70,s:.002,rl:2.2,z:55,k:.2,v:.3,f:6500,fz:-.5,c:0x2e5a8a,pt:[[.07,.1,.4,0,0,0],[.03,.03,.25,0,.02,-.32],[.05,.13,.06,0,-.1,.04],[.06,.1,.16,0,-.02,.26]]},
{n:'Auto-shotgun',m:12,r:60,cd:.25,d:10,h:25,s:.05,p:6,rl:2.6,z:65,k:2,v:.8,f:1300,fz:-.6,c:0x5a3a2a,pt:[[.08,.1,.45,0,0,0],[.04,.04,.4,0,.03,-.4],[.05,.14,.1,0,-.1,.02],[.06,.1,.25,0,-.03,.32]]},
{n:'Carbine',m:25,r:100,cd:.075,d:28,h:85,s:.01,rl:1.3,z:58,k:.8,v:.5,f:2800,fz:-.47,c:0x3b4a3a,pt:[[.065,.1,.38,0,0,0],[.028,.028,.28,0,.02,-.32],[.05,.14,.07,0,-.1,.04],[.06,.1,.16,0,-.02,.27]]},
{n:'Railgun',m:3,r:15,cd:1.4,d:220,h:400,s:.001,rl:2.8,z:30,k:7,v:.9,f:800,fz:-.82,c:0x24344f,pt:[[.07,.11,.5,0,0,0],[.035,.035,.55,0,.025,-.5],[.04,.05,.2,0,.09,-.06],[.06,.1,.2,0,-.02,.35]]},
{n:'Machine Pistol',m:20,r:120,cd:.07,d:14,h:35,s:.02,rl:1.2,z:70,k:.6,v:.35,f:3200,fz:-.22,c:0x2a2c31,pt:[[.05,.07,.26,0,.02,0],[.04,.11,.06,0,-.07,.07]]},
{n:'Battle Rifle',m:20,r:80,cd:.14,d:46,h:130,s:.006,rl:1.7,z:50,k:1.3,v:.6,f:2300,fz:-.58,c:0x4a3f2c,pt:[[.07,.11,.5,0,0,0],[.032,.032,.34,0,.02,-.4],[.05,.15,.075,0,-.1,.04],[.065,.11,.22,0,-.02,.33]]},
{n:'PDW',m:40,r:160,cd:.06,d:18,h:50,s:.016,rl:1.2,z:62,k:.5,v:.4,f:3000,fz:-.4,c:0x39414a,pt:[[.06,.09,.3,0,0,0],[.026,.026,.2,0,.015,-.25],[.045,.15,.06,0,-.1,.02],[.05,.09,.12,0,-.02,.2]]},
{n:'Heavy Pistol',m:7,r:56,cd:.35,d:60,h:160,s:.004,rl:1.3,z:65,k:3,v:.6,f:2000,fz:-.24,c:0x3a3d44,pt:[[.055,.08,.28,0,.02,0],[.045,.12,.065,0,-.07,.08]]},
{n:'Bullpup',m:30,r:120,cd:.085,d:30,h:90,s:.008,rl:1.4,z:56,k:.8,v:.5,f:2700,fz:-.42,c:0x3d4a56,pt:[[.07,.11,.4,0,0,.05],[.028,.028,.22,0,.02,-.28],[.05,.14,.07,0,-.1,.12],[.06,.11,.15,0,-.02,.3]]},
{n:'Marksman',m:12,r:60,cd:.28,d:80,h:200,s:.003,rl:2,z:34,k:2.5,v:.7,f:2100,fz:-.7,c:0x2c3a2a,pt:[[.065,.1,.5,0,0,0],[.028,.028,.45,0,.02,-.45],[.04,.05,.18,0,.09,-.05],[.06,.1,.22,0,-.02,.33]]},
{n:'Sawed-off',m:2,r:30,cd:.45,d:14,h:25,s:.07,p:8,rl:1.8,z:70,k:3,v:.9,f:1100,fz:-.42,c:0x5a3a22,pt:[[.07,.09,.3,0,0,0],[.045,.045,.28,0,.02,-.28],[.05,.06,.18,0,-.04,-.1],[.06,.1,.14,0,-.03,.22]]},
{n:'Tactical Shotgun',m:8,r:48,cd:.55,d:12,h:30,s:.045,p:7,rl:2.4,z:68,k:2.4,v:.85,f:1300,fz:-.62,c:0x2e3138,pt:[[.075,.1,.42,0,0,0],[.04,.04,.38,0,.03,-.38],[.05,.06,.26,0,-.04,-.22],[.06,.1,.24,0,-.03,.32]]},
{n:'Squad Gun',m:60,r:240,cd:.075,d:26,h:70,s:.014,rl:3,z:60,k:.7,v:.6,f:2400,fz:-.6,c:0x3a3f2a,pt:[[.09,.12,.5,0,0,0],[.035,.035,.4,0,.02,-.45],[.12,.12,.14,0,-.11,0],[.07,.12,.25,0,-.02,.37]]},
{n:'Gauss Rifle',m:5,r:30,cd:.9,d:170,h:340,s:.001,rl:2.6,z:28,k:6,v:.9,f:900,fz:-.86,c:0x3a2a5a,pt:[[.07,.1,.55,0,0,0],[.03,.03,.6,0,.02,-.56],[.04,.05,.2,0,.09,-.06],[.06,.1,.22,0,-.02,.36]]},
{n:'Burst Pistol',m:15,r:90,cd:.12,d:22,h:55,s:.012,rl:1.1,z:70,k:.9,v:.35,f:3100,fz:-.22,c:0x3c3030,pt:[[.05,.075,.25,0,.02,0],[.04,.11,.06,0,-.07,.07]]},
{n:'Warhawk',m:30,r:120,cd:.105,d:38,h:105,s:.011,rl:1.6,z:55,k:1.2,v:.58,f:2400,fz:-.56,c:0x3a3a30,pt:[[.07,.1,.46,0,0,0],[.03,.03,.34,0,.02,-.38],[.05,.15,.075,0,-.1,.05],[.06,.1,.2,0,-.02,.32]]},
{n:'Hunter',m:6,r:30,cd:1,d:140,h:280,s:.002,rl:2.5,z:18,k:7,v:.8,f:1700,fz:-.88,c:0x4a3a28,pt:[[.06,.09,.55,0,0,0],[.025,.025,.6,0,.02,-.55],[.04,.05,.18,0,.09,-.05],[.06,.1,.25,0,-.03,.35]]},
{n:'Viper SMG',m:32,r:160,cd:.055,d:15,h:42,s:.02,rl:1.1,z:68,k:.5,v:.38,f:3200,fz:-.36,c:0x2a3a30,pt:[[.06,.09,.28,0,0,0],[.024,.024,.2,0,.015,-.24],[.045,.15,.06,0,-.1,.02],[.05,.09,.12,0,-.02,.2]]},
{n:'Tempest',m:80,r:320,cd:.07,d:24,h:65,s:.016,rl:3.2,z:62,k:.65,v:.6,f:2300,fz:-.62,c:0x30343a,pt:[[.09,.12,.5,0,0,0],[.035,.035,.42,0,.02,-.46],[.12,.12,.14,0,-.11,0],[.07,.12,.25,0,-.02,.37]]},
{n:'Longbow',m:8,r:40,cd:.55,d:95,h:230,s:.002,rl:2.2,z:22,k:3.5,v:.75,f:1900,fz:-.8,c:0x2a3a30,pt:[[.06,.09,.52,0,0,0],[.025,.025,.5,0,.02,-.5],[.04,.05,.18,0,.09,-.05],[.06,.1,.24,0,-.03,.34]]},
{n:'Breacher',m:6,r:36,cd:.7,d:16,h:40,s:.04,p:9,rl:2.6,z:66,k:3,v:.9,f:1200,fz:-.58,c:0x2c2c30,pt:[[.075,.1,.4,0,0,0],[.045,.045,.36,0,.03,-.36],[.05,.06,.26,0,-.04,-.2],[.06,.1,.22,0,-.03,.3]]},
{n:'Stinger',m:18,r:108,cd:.09,d:16,h:38,s:.016,rl:1.1,z:70,k:.6,v:.35,f:3200,fz:-.22,c:0x3a2a44,pt:[[.05,.07,.24,0,.02,0],[.04,.11,.06,0,-.07,.07]]}];
  const AR = [16,8,6,30,9,18,14,14,14,24,22,6,16,26,8,20,9,12,16,26,6,6,18,28,9,16,30,8,18,28,6,9];
  const NMS = ['Ghost', 'Viper', 'Raven', 'Bishop', 'Nova', 'Hawk', 'Rook', 'Echo', 'Titan', 'Blaze', 'Frost', 'Jinx', 'Cobra', 'Dagger', 'Onyx', 'Pike'];

  function genMap(i) {
    const m = MP[i]; let sd = 7 + i * 13; const rn = () => (sd = sd * 16807 % 2147483647) / 2147483647;
    const boxes = [], BX = [], barrels = [], trees = [], pads = [];
    const mk = (x, z, w, h, d, c, y0) => { boxes.push({ x, z, w, h, d, c, y: y0 || 0 }); if (y0 == null) BX.push({ x, z, w: w / 2, d: d / 2, h }); };
    const tree = (x, z, s, c) => { mk(x, z, .7 * s, 3 * s, .7 * s, 0x5a3d26); trees.push({ x, z, s, c }); };
    const wl = (x, z, l, t, h, c, gap, v) => { const f = (a, b, s) => v ? mk(a, b, t, h, s, c) : mk(a, b, s, h, t, c); if (!gap) return f(x, z, l); const s = (l - 3) / 2, o = l / 4 + .75; v ? (f(x, z - o, s), f(x, z + o, s)) : (f(x - o, z, s), f(x + o, z, s)); };
    const bld = (x, z, w, d, h, c, g) => { wl(x, z - d / 2, w, .5, h, c, g & 1); wl(x, z + d / 2, w, .5, h, c, g & 2); wl(x - w / 2, z, d, .5, h, c, g & 4, 1); wl(x + w / 2, z, d, .5, h, c, g & 8, 1); if (w >= 11) { wl(x, z, w - 1, .5, h, c, 1); mk(x - w * .28, z + d * .25, 1.6, 1.2, 1.6, 0x6a5a4a); mk(x + w * .28, z - d * .25, 1.6, 1.2, 1.6, 0x5a4a3a); } mk(x, z, w + .8, .4, d + .8, c, h); mk(x, z, w - .6, .06, d - .6, 0x4a4d52, 0); };
    const nearBl = (x, z, k) => m.bl && m.bl.some(b => Math.abs(x - b[0]) < b[2] / 2 + k && Math.abs(z - b[1]) < b[3] / 2 + k);
    mk(0, -ZN - 1, ZN * 2 + 2, 8, 2, m.w); mk(0, ZN + 1, ZN * 2 + 2, 8, 2, m.w); mk(-ZN - 1, 0, 2, 8, ZN * 2 + 2, m.w); mk(ZN + 1, 0, 2, 8, ZN * 2 + 2, m.w);
    if (m.city) for (const s of [-30, 0, 30]) { mk(s, 0, 10, .05, ZN * 2, 0x23252a, 0); mk(0, s, ZN * 2, .05, 10, 0x23252a, 0); }
    if (m.city) for (const x of [-45, -15, 15, 45]) for (const z of [-45, -15, 15, 45]) bld(x, z, 15, 15, 9 + rn() * 7, m.p[Math.floor(rn() * 3)], 3 | (4 << (rn() * 2 | 0)));
    if (m.lw) { mk(-14, -8, 16, 2.2, 1.2, m.w); mk(14, 12, 16, 2.2, 1.2, m.w); mk(0, -24, 1.2, 2.2, 14, m.w); }
    for (let j = 0; j < m.k; j++) { const x = m.city ? (rn() * 3 | 0) * 30 - 30 + (rn() - .5) * 5 : (rn() - .5) * ZN * 1.9, z = (rn() - .5) * ZN * 1.9, w = m.a[0] + rn() * m.a[1], h = m.a[2] + rn() * m.a[3], d = m.a[0] + rn() * m.a[1]; if (Math.hypot(x, z - 10) < 8 || nearBl(x, z, 2)) continue; mk(x, z, w, h, d, m.p[j % m.p.length]); }
    if (m.tr) for (let j = 0; j < m.tr[0]; j++) { const x = (rn() - .5) * ZN * 1.9, z = (rn() - .5) * ZN * 1.9, s = 1 + rn() * .9; if (Math.abs(z) > ZN - 14 || nearBl(x, z, 3)) continue; tree(x, z, s, m.tr[1]); }
    if (m.ct) for (let j = 0; j < m.ct; j++) { const x = (rn() - .5) * ZN * 1.8, z = (rn() - .5) * ZN * 1.8, hz = rn() < .5, st = rn() < .35; if (Math.abs(z) > ZN - 14 || nearBl(x, z, 3)) continue; mk(x, z, hz ? 12 : 2.6, 2.6, hz ? 2.6 : 12, m.p[j % 4]); if (st) mk(x, z, hz ? 12 : 2.6, 2.6, hz ? 2.6 : 12, m.p[(j + 1) % 4], 2.6); }
    if (m.bl) m.bl.forEach(b => bld(...b));
    for (let j = 0; j < 12; j++) { const x = m.city ? (rn() * 3 | 0) * 30 - 30 + (rn() - .5) * 6 : (rn() - .5) * ZN * 1.8, z = (rn() - .5) * ZN * 1.8; if (Math.abs(z) > ZN - 14 || nearBl(x, z, 2)) continue; const bx = { x, z, w: .45, d: .45, h: 1.15 }; const b = { x, z, bx, al: 1 }; bx.br = barrels.length; barrels.push(b); BX.push(bx); }
    if (!m.city) for (let j = 0; j < 7; j++) { const x = (rn() - .5) * ZN * 1.5, z = (rn() - .5) * ZN * 1.5, hz = rn() < .5; if (Math.abs(z) > ZN - 16 || Math.hypot(x, z - 10) < 9 || nearBl(x, z, 3)) continue; const c = m.n === 'Frostbite' ? 0xb8c4cc : 0xa89868; for (let s = 0; s < 3; s++) mk(hz ? x + s * 2.1 : x, hz ? z : z + s * 2.1, hz ? 2.2 : .9, .7 + (s == 1 ? .25 : 0), hz ? .9 : 2.2, c); }
    if (!(m.city || m.ct)) for (let j = 0; j < 7; j++) { const x = (rn() - .5) * ZN * 1.6, z = (rn() - .5) * ZN * 1.6, hz = rn() < .5, l = 3 + rn() * 3; if (Math.hypot(x, z) < 14 || Math.abs(z) > ZN - 16 || (m.bl && m.bl.some(b => Math.abs(x - b[0]) < b[2] / 2 + 4 && Math.abs(z - b[1]) < b[3] / 2 + 4))) continue; mk(x, z, hz ? l : .6, 1.2 + rn() * 1.6, hz ? .6 : l, m.w); mk(hz ? x + l / 2 + .9 : x, hz ? z : z + l / 2 + .9, hz ? 1.4 : .6, .7 + rn() * .5, hz ? .6 : 1.4, m.w); }
    const NG = new Uint8Array(GN * GN);
    for (let i2 = 0; i2 < GN; i2++) for (let j = 0; j < GN; j++) { const x = i2 - ZN + .5, z = j - ZN + .5; let hit = 0; for (const b of BX) if (Math.abs(x - b.x) < b.w + .55 && Math.abs(z - b.z) < b.d + .55) { hit = 1; break; } NG[j * GN + i2] = hit; }
    for (let j = 0; j < 3; j++) { const a = j * 2.09 + rn(), x = Math.cos(a) * (14 + rn() * 6), z = Math.sin(a) * (14 + rn() * 6); if (!NG[Math.floor(z + ZN) * GN + Math.floor(x + ZN)]) pads.push({ x, z }); }
    return { i, m, boxes, BX, barrels, trees, pads, NG, HT: genHT(m, BX) };
  }

  function genHT(m, BX) {
    const hl = m.hl != null ? m.hl : (m.city || m.ct ? 0 : ({ Dust: 1.5, Frostbite: 1.25, Ridge: 1.7, Mesa: 1.9, Marsh: .8, Quarry: 1.6, Meadow: 1.3, Twilight: 1.4, Ashfall: 1.8, Glacier: 1.5, 'Battle Royale': 1.3 }[m.n] || 1)), w = TN2 + 1, HT = new Float32Array(w * w);
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
      const x = i - TW, z = j - TW; let h = Math.max(0, (Math.sin(x * .11 + 1) * Math.cos(z * .09) + .7 * Math.sin(x * .06 + z * .13 + 1.7) + .3 * Math.sin(x * .21 - z * .17)) * .75 + .2) * hl;
      if (h > 0) {
        const e = Math.max(Math.abs(x), Math.abs(z)); let k = Math.min(1, Math.max(0, (Math.hypot(x, z) - 24) / 12)) * Math.min(1, Math.max(0, (46 - e) / 8));
        for (const b of BX) { if (k <= 0) break; const dx = Math.max(0, Math.abs(x - b.x) - b.w), dz = Math.max(0, Math.abs(z - b.z) - b.d); k = Math.min(k, Math.max(0, (Math.sqrt(dx * dx + dz * dz) - 1.5) / 5)); }
        h *= k;
      }
      HT[j * w + i] = h;
    }
    return HT;
  }

  function hY(w, x, z) { const HT = w.HT, u = Math.max(0, Math.min(TN2 - .001, x + TW)), v = Math.max(0, Math.min(TN2 - .001, z + TW)), i = u | 0, j = v | 0, a = u - i, b = v - j, n = TN2 + 1, k = j * n + i; return (HT[k] * (1 - a) + HT[k + 1] * a) * (1 - b) + (HT[k + n] * (1 - a) + HT[k + n + 1] * a) * b; }
  // ny=true: ignore height test (used for bots, which walk on the ground)
  function col(w, p, r, ny) { for (const b of w.BX) { if (!ny && p.y >= (b.h || 99) - .05) continue; const dx = p.x - b.x, dz = p.z - b.z, ox = b.w + r - Math.abs(dx), oz = b.d + r - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) p.x += dx > 0 ? ox : -ox; else p.z += dz > 0 ? oz : -oz; } } }
  function gy(w, p) { let g = 0; for (const b of w.BX) if (b.h && b.h <= p.y + .45 && b.h > g && Math.abs(p.x - b.x) < b.w + .3 && Math.abs(p.z - b.z) < b.d + .3) g = b.h; return g; }

  // Ray (unit dir) vs solid boxes. Returns {t,b,ax,sg} or null.
  function rayBoxes(w, ox, oy, oz, dx, dy, dz, mx) {
    let bt = mx, hit = null, bn = 0, bs = 0;
    for (const b of w.BX) {
      let t0 = 0, t1 = bt, ax = -1, sg = 0, a, c, s;
      if (dx > 1e-9 || dx < -1e-9) { a = (b.x - b.w - ox) / dx; c = (b.x + b.w - ox) / dx; s = -1; if (a > c) { const q = a; a = c; c = q; s = 1; } if (a > t0) { t0 = a; ax = 0; sg = s; } if (c < t1) t1 = c; if (t0 > t1) continue; } else if (ox < b.x - b.w || ox > b.x + b.w) continue;
      if (dy > 1e-9 || dy < -1e-9) { a = (0 - oy) / dy; c = (b.h - oy) / dy; s = -1; if (a > c) { const q = a; a = c; c = q; s = 1; } if (a > t0) { t0 = a; ax = 1; sg = s; } if (c < t1) t1 = c; if (t0 > t1) continue; } else if (oy < 0 || oy > b.h) continue;
      if (dz > 1e-9 || dz < -1e-9) { a = (b.z - b.d - oz) / dz; c = (b.z + b.d - oz) / dz; s = -1; if (a > c) { const q = a; a = c; c = q; s = 1; } if (a > t0) { t0 = a; ax = 2; sg = s; } if (c < t1) t1 = c; if (t0 > t1) continue; } else if (oz < b.z - b.d || oz > b.z + b.d) continue;
      if (ax >= 0 && t0 < bt) { bt = t0; hit = b; bn = ax; bs = sg; }
    }
    return hit ? { t: bt, b: hit, ax: bn, sg: bs } : null;
  }

  function spt(w, tm) { let x, z, k = 0; do { x = (Math.random() - .5) * ZN * 1.2; z = (tm ? -1 : 1) * (ZN - 11 + Math.random() * 8); } while (w.NG[Math.floor(z + ZN) * GN + Math.floor(x + ZN)] && k++ < 60); return [x, z]; }

  X.ZN = ZN; X.GN = GN; X.TW = TW; X.TN2 = TN2; X.MP = MP; X.W = W; X.AR = AR; X.NMS = NMS;
  X.makeWorld = genMap; X.hY = hY; X.col = col; X.gy = gy; X.rayBoxes = rayBoxes; X.spt = spt;
})(typeof module !== 'undefined' && module.exports ? module.exports : (this.SH = {}));
