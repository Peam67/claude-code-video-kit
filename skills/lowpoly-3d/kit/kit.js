// lowpoly-kit: the approved look — flat-shaded faceted low-poly 3D, soft shadows, cinematic DOF + bloom, film grain.
// Everything is a pure function of time t (seek-safe), so render.js can grab any frame.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { THREE };

export const PI = Math.PI;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- math / timing
let seed = 11;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const reseed = s => { seed = s; };
export const R = (a, b) => a + (b - a) * rnd();
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const io = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export function K(t, keys, e = sm) { // keyframes [[t, v], ...]
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t < t1) return v0 + (v1 - v0) * e((t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
export const blink = (t, phase = 0) => ((t + phase) % 3.7) < .12 ? .12 : 1;

// ---------------------------------------------------------------- materials + primitives (always flatShading)
export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, flatShading: true, ...o });
export const GLOW = (color, i = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(i), toneMapped: false });
export function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
const shade = m => { m.castShadow = m.receiveShadow = true; return m; };
export function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); if (parent) parent.add(m); return m;
}
export function jitter(geo, a) { // same offset for every copy of a vertex, so faceted meshes never crack open
  const p = geo.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e4)).join(',');
    if (!seen.has(k)) seen.set(k, [R(-a, a), R(-a, a), R(-a, a)]);
    const o = seen.get(k); p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
  }
  geo.computeVertexNormals(); return geo;
}
export const ico = (r, mat, detail = 1, j = 0) => shade(new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(r, detail), j), mat));
export function cyl(rTop, rBot, len, mat, seg = 6) { // hangs down from its pivot along -y
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg); g.translate(0, -len / 2, 0); return shade(new THREE.Mesh(g, mat));
}

// ---------------------------------------------------------------- stage: renderer, scene, camera, post
export function stage({ W = 1080, H = 1920, exposure = 1.1, fog = [0xf2c38a, 18, 140] } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('gl').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); if (fog) scene.fog = new THREE.Fog(...fog);
  const camera = new THREE.PerspectiveCamera(32, W / H, .05, 600);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: .003, maxblur: .012 }); composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .5, .7, .9));
  composer.addPass(new OutputPass());
  return { renderer, scene, camera, composer, bokeh, W, H };
}

// sky dome + sun + fill lights. presets: golden | sunset | day | night | overcast
export const LIGHTS = {
  golden: { sun: [-.12, .09, -1], sky: [[.36, .5, .82], [.98, .78, .6], [1, .82, .52], [.9, .66, .4]], sunCol: 0xffc27a, sunI: 3.4, hemi: [0xd6e4ff, 0xa58a4a, 1.15], fog: 0xf2c38a, glow: [1, .8, .5] },
  sunset: { sun: [-.28, .07, -1], sky: [[.2, .16, .42], [.93, .45, .55], [1, .66, .36], [.55, .3, .42]], sunCol: 0xffa565, sunI: 3.2, hemi: [0xffb3a6, 0x30384a, .9], fog: 0xd98a86, glow: [1, .62, .38] },
  day: { sun: [.4, .8, -.5], sky: [[.25, .5, .95], [.6, .78, 1], [.85, .92, 1], [.7, .78, .85]], sunCol: 0xfff3e0, sunI: 3, hemi: [0xcfe3ff, 0x6a7a4a, 1.1], fog: 0xcfe0f5, glow: [1, .95, .85] },
  night: { sun: [.35, .55, -1], sky: [[.015, .02, .07], [.07, .07, .2], [.32, .2, .36], [.08, .06, .14]], sunCol: 0x9db4ff, sunI: 1.1, hemi: [0x5266b8, 0x141626, .75], fog: 0x1c1a38, glow: [.55, .65, 1] },
  overcast: { sun: [.2, .9, -.3], sky: [[.62, .66, .72], [.78, .8, .84], [.86, .87, .88], [.6, .62, .64]], sunCol: 0xe8ecf2, sunI: 1.4, hemi: [0xdfe6ee, 0x5a5e58, 1.4], fog: 0xb9bec6, glow: [1, 1, 1] },
};
export function lighting(scene, preset = 'golden', { sunFrom = 'front' } = {}) { // front = sun behind the camera, faces lit; back = backlit rim/flare look
  const P = LIGHTS[preset], dir = V(P.sun[0], P.sun[1], sunFrom === 'front' ? -P.sun[2] : P.sun[2]).normalize();
  const v3 = a => `vec3(${a.map(x => x.toFixed(3)).join(',')})`;
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: dir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 sun; void main(){ float h = vD.y;
      vec3 top=${v3(P.sky[0])}, mid=${v3(P.sky[1])}, hor=${v3(P.sky[2])}, low=${v3(P.sky[3])};
      vec3 c = h > 0. ? mix(hor, mid, smoothstep(0.,.12,h)) : low; c = mix(c, top, smoothstep(.12,.7,h));
      float s = max(dot(vD, sun), 0.); c += ${v3(P.glow)}*pow(s, 8.)*.4 + vec3(1.,.95,.85)*smoothstep(.9975,.999,s)*.9;
      gl_FragColor = vec4(c,1.); }`,
  })));
  if (scene.fog) scene.fog.color.set(P.fog);
  scene.add(new THREE.HemisphereLight(...P.hemi));
  const sun = new THREE.DirectionalLight(P.sunCol, P.sunI);
  sun.position.copy(dir).multiplyScalar(30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 70 }); sun.shadow.bias = -.0012; sun.shadow.normalBias = .045;
  scene.add(sun, sun.target);
  const front = new THREE.DirectionalLight(0xffe2c0, .8); front.position.set(-2, 3, sunFrom === 'front' ? -6 : 6); scene.add(front); // key on faces facing +z
  return { sun, dir, sunPos: dir.clone().multiplyScalar(250) };
}

// ---------------------------------------------------------------- props
export function ground(scene, color = 0xd8b860, heightFn = () => 0, size = 320) {
  const g = new THREE.PlaneGeometry(size, size, 120, 120).rotateX(-PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightFn(p.getX(i), p.getZ(i)) + R(-.03, .03));
  g.computeVertexNormals(); const m = new THREE.Mesh(g, M(color)); m.receiveShadow = true; scene.add(m); return m;
}
export function tree(parent, x, z, s = 1, leaf = [0x5e7a36, 0x6f8a3a, 0x4c6a33, 0x8a9a42], y = 0) {
  const g = grp(parent, x, y, z), bark = M(0x5b3f2c);
  const tr = shade(new THREE.Mesh(new THREE.CylinderGeometry(.14 * s, .26 * s, 2.6 * s, 7), bark)); tr.position.y = 1.3 * s; g.add(tr);
  const mats = leaf.map(c => M(c));
  for (let i = 0; i < 18; i++) { const a = R(0, PI * 2), r = R(0, 1.6 * s), m = ico(R(.45, .85) * s, mats[i % mats.length], 0, .06 * s); m.position.set(Math.cos(a) * r, R(2.5, 3.7) * s - r * .25, Math.sin(a) * r); g.add(m); }
  return g;
}
export function rock(parent, x, z, s = .4, color = 0x8a8590) { const m = ico(s, M(color), 0, s * .25); m.scale.y = .6; m.position.set(x, s * .25, z); parent.add(m); return m; }
export function grass(scene, { n = 20000, rMin = 0, rMax = 10, hMin = .3, hMax = .7, palette = [0xf4d06a, 0xe9bd55, 0xf8e08f, 0xdcae4a], y = () => 0, avoid = () => false } = {}) {
  const wind = { value: 0 }, geo = new THREE.ConeGeometry(.011, 1, 3); geo.translate(0, .5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: .8, flatShading: true });
  mat.onBeforeCompile = sh => { sh.uniforms.uWind = wind; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec4 w0 = instanceMatrix * vec4(0.,0.,0.,1.); float b = position.y * position.y;
    transformed.x += sin(uWind*1.7 + w0.x*.35 + w0.z*.2)*.16*b; transformed.z += cos(uWind*1.3 + w0.x*.2)*.08*b;`); };
  const im = new THREE.InstancedMesh(geo, mat, n), d = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x, z; do { const r = Math.sqrt(R(rMin * rMin, rMax * rMax)), a = R(0, PI * 2); x = Math.cos(a) * r; z = Math.sin(a) * r; } while (avoid(x, z));
    d.position.set(x, y(x, z) - .02, z); d.rotation.set(R(-.15, .15), R(0, 6.3), R(-.15, .15)); d.scale.set(R(.8, 1.4), R(hMin, hMax), R(.8, 1.4)); d.updateMatrix();
    im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.set(palette[i % palette.length]).multiplyScalar(R(.85, 1.1)));
  }
  im.receiveShadow = true; scene.add(im); return { mesh: im, wind };
}
export function motes(scene, { n = 120, color = 0xfff0c8, area = [-5, 5, .2, 3, -6, 4], size = .012 } = {}) { // pollen / fireflies / dust
  const list = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(size, 5, 4), GLOW(color, 2.4)); scene.add(m); return { m, x: R(area[0], area[1]), y: R(area[2], area[3]), z: R(area[4], area[5]), a: R(0, 6.3), s: R(.15, .45) }; });
  return (t, cam) => list.forEach(p => { p.m.position.set(p.x + Math.sin(t * p.s + p.a) * .5, p.y + Math.sin(t * p.s * 1.4 + p.a) * .2, p.z + Math.cos(t * p.s + p.a) * .4); if (cam) p.m.visible = p.m.position.distanceTo(cam.position) > 1.8; });
}

// ---------------------------------------------------------------- characters
export class Limb { // two-bone IK with a pole point; solve(target, pole) in world space, so hands/feet land exactly
  constructor(parent, pos, a, b, ra, rb, matA, matB = matA) {
    this.a = a; this.b = b;
    this.root = grp(parent, ...pos); this.root.add(cyl(ra, ra * .85, a, matA));
    this.lower = grp(this.root, 0, -a, 0); this.lower.add(cyl(rb, rb * .8, b, matB));
    const knee = ico(ra * .95, matA, 0); this.root.add(knee); knee.position.y = -a;
    this.end = grp(this.lower, 0, -b, 0);
  }
  solve(targetW, poleW) {
    const P = this.root.parent; P.updateWorldMatrix(true, false);
    const S = this.root.position.clone(), T = P.worldToLocal(targetW.clone()), Q = P.worldToLocal(poleW.clone());
    const d = T.clone().sub(S), len = d.length(), dist = Math.min(Math.max(len, 1e-3), (this.a + this.b) * .999), dir = d.divideScalar(len);
    const cosA = Math.min(1, Math.max(-1, (this.a ** 2 + dist ** 2 - this.b ** 2) / (2 * this.a * dist))), sinA = Math.sqrt(1 - cosA * cosA);
    const n = Q.sub(S); n.addScaledVector(dir, -n.dot(dir)); if (n.lengthSq() < 1e-8) n.set(0, 0, 1); n.normalize();
    const E = S.clone().addScaledVector(dir, this.a * cosA).addScaledVector(n, this.a * sinA), T2 = S.clone().addScaledVector(dir, dist);
    const tmpM = new THREE.Matrix4();
    const basis = yA => { const z = n.clone().addScaledVector(yA, -n.dot(yA)).normalize(), x = new THREE.Vector3().crossVectors(yA, z); return new THREE.Quaternion().setFromRotationMatrix(tmpM.makeBasis(x, yA, z)); };
    const qU = basis(S.clone().sub(E).normalize()), qL = basis(E.clone().sub(T2).normalize());
    this.root.quaternion.copy(qU); this.lower.quaternion.copy(qU.clone().invert().multiply(qL));
  }
}
const INK = M(0x16131b, { roughness: .35 }), WHITE = M(0xffffff);
export function roundHead(parent, r, skin) { // faceted round head: icosahedron detail 1, a bit long, narrower chin
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = y < 0 ? 1 + (y / r) * .22 : 1; p.setXYZ(i, x * k, y * 1.1, z * k * (z > 0 ? 1.03 : 1)); }
  g.computeVertexNormals(); const m = shade(new THREE.Mesh(g, skin)); parent.add(m); return m;
}
export function faceParts(head, r, { skin, skinD, brow = 0x2a2026, lip = 0x8e3f45, glasses = false } = {}) {
  const surf = (x, y) => Math.sqrt(Math.max(0, r * r - x * x - (y / 1.1) ** 2)) * 1.03, ex = r * .38, ey = r * .12;
  const eyes = [-1, 1].map(s => { // black dot eyes with a white highlight
    const e = new THREE.Mesh(new THREE.SphereGeometry(r * .12, 8, 6), INK); e.scale.set(1, 1.15, .55); e.position.set(s * ex, ey, surf(ex, ey) - .004); head.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * .035, 5, 4), WHITE); hl.position.set(.3, .35, .8); e.add(hl); return e;
  });
  const brows = [-1, 1].map(s => { const b = box(r * .42, r * .075, r * .08, M(brow), s * (ex + r * .02), ey + r * .38, surf(ex, ey + r * .38), head); b.rotation.x = -.35; return b; });
  const nose = shade(new THREE.Mesh(new THREE.ConeGeometry(r * .15, r * .36, 4), skinD)); nose.rotation.set(PI / 2, PI / 4, 0); nose.position.set(0, -r * .12, surf(0, -r * .12) + r * .1); head.add(nose);
  const my = -r * .48, mouth = box(r * .34, r * .055, r * .05, M(lip), 0, my, surf(0, my) - .002, head);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(r * .17, r * .045, 4, 10, PI), M(lip)); smile.rotation.z = PI; smile.position.set(0, my + r * .1, surf(0, my) - .004); head.add(smile); smile.visible = false;
  [-1, 1].forEach(s => { const e = ico(r * .24, skin, 0); e.scale.set(.45, 1, .8); e.position.set(s * r * .98, 0, -r * .05); head.add(e); });
  if (glasses) [-1, 1].forEach(s => { const g = new THREE.Mesh(new THREE.TorusGeometry(r * .2, r * .03, 4, 10), M(0x2a2a2a)); g.position.set(s * ex, ey, surf(ex, ey) + r * .04); head.add(g); });
  return { eyes, brows, mouth, smile, setSmile(k) { smile.scale.setScalar(Math.max(.001, k)); smile.visible = k > .02; mouth.visible = k < .5; }, setSad(k) { brows[0].rotation.z = -k; brows[1].rotation.z = k; } };
}
const HAIR = {
  messy(H, mat) {
    const cap = ico(.2, mat, 1, .006); cap.scale.set(1.06, .78, 1.05); cap.position.set(0, .09, -.035); H.add(cap);
    [[-.11, .13, .15, .5, -.5], [-.04, .15, .17, .2, -.2], [.04, .15, .17, -.2, .25], [.11, .13, .15, -.5, .55], [0, .2, .1, 0, -.9], [-.15, .1, .08, .9, -.3], [.15, .1, .08, -.9, -.3], [-.08, .22, -.04, .4, -1.6], [.08, .22, -.04, -.4, -1.6], [0, .17, -.15, 0, -2.3]]
      .forEach(([x, y, z, rz, rx]) => { const sp = shade(new THREE.Mesh(new THREE.ConeGeometry(.055, .16, 4), mat)); sp.position.set(x, y, z); sp.rotation.set(rx + PI, 0, rz); H.add(sp); });
    [-1, 1].forEach(s => { const sb = ico(.07, mat, 0); sb.scale.set(.5, 1.3, 1); sb.position.set(s * .185, .02, -.02); H.add(sb); });
  },
  short(H, mat) { const cap = ico(.2, mat, 1, .004); cap.scale.set(1.05, .7, 1.05); cap.position.set(0, .1, -.03); H.add(cap); },
  bun(H, mat) { HAIR.short(H, mat); const b = ico(.09, mat, 0, .01); b.position.set(0, .2, -.12); H.add(b); },
  long(H, mat) { HAIR.short(H, mat); const back = ico(.2, mat, 1, .01); back.scale.set(1.05, 1.5, .7); back.position.set(0, -.06, -.1); H.add(back); },
  bald() {},
};
// person: built facing +z, pelvis is the group origin (put it at y≈.9 to stand, at seat height to sit).
export function person(parent, { skin = 0xe9b392, skinD = 0xd69a78, top = 0x34437a, topD = 0x283462, pants = 0x34425e, shoes = 0xf2efe8, hair = 0x2e2228, hairStyle = 'messy', strings = 0xe2a93b, glasses = false, scale = 1, dress = false } = {}) {
  const P = { group: grp(parent) }, g = P.group; g.scale.setScalar(scale);
  const sk = M(skin), skD = M(skinD), tp = M(top), tpD = M(topD), pn = M(pants), sh = M(shoes);
  box(.36, .16, .28, dress ? tp : pn, 0, 0, 0, g);
  if (dress) { const sk2 = shade(new THREE.Mesh(new THREE.CylinderGeometry(.2, .32, .55, 7), tp)); sk2.position.y = -.25; g.add(sk2); }
  P.legs = [-1, 1].map(s => { const L = new Limb(g, [s * .1, -.02, .02], .42, .42, .078, .064, dress ? sk : pn); box(.13, .09, .25, sh, 0, -.02, .06, L.end); return L; });
  P.torso = grp(g, 0, .06, 0);
  const t = shade(new THREE.Mesh(new THREE.CylinderGeometry(.215, .18, .5, 6), tp)); t.scale.z = .72; t.position.y = .26; P.torso.add(t);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.13, .055, 4, 8), tpD); collar.rotation.x = PI / 2; collar.position.y = .52; collar.scale.y = .8; P.torso.add(collar);
  if (strings) [-1, 1].forEach(s => box(.014, .15, .014, M(strings), s * .045, .41, .15, P.torso));
  P.arms = [-1, 1].map(s => { const L = new Limb(P.torso, [s * .25, .45, 0], .29, .27, .062, .052, tp); const h = ico(.05, sk, 0); h.position.y = -.03; L.end.add(h); return L; });
  const neck = cyl(.055, .06, .1, sk); neck.position.y = .6; P.torso.add(neck);
  P.head = grp(P.torso, 0, .56, 0); const H0 = grp(P.head, 0, .2, 0);
  roundHead(H0, .19, sk); Object.assign(P, faceParts(H0, .19, { skin: sk, skinD: skD, glasses }));
  HAIR[hairStyle](H0, M(hair));
  return P;
}
const L2W = (o, x, y, z) => o.localToWorld(V(x, y, z));
// poses (call every frame after moving the group). breath = small idle motion.
export function poseStand(P, t = 0, { armSwing = 0 } = {}) {
  P.group.updateMatrixWorld(true);
  P.torso.rotation.x = Math.sin(t * 1.6) * .01;
  P.legs.forEach((L, i) => { const s = i ? 1 : -1; L.solve(L2W(P.group, s * .11, -.86, .03), L2W(P.group, s * .11, -.4, 1)); });
  P.arms.forEach((L, i) => { const s = i ? 1 : -1, w = Math.sin(t * 2 + i * PI) * armSwing; L.solve(L2W(P.torso, s * .3, -.08, .02 + w), L2W(P.torso, s * .3, .2, -.6)); });
}
export function poseSitBench(P, t = 0) { // pelvis on a seat ~.45 high, feet on the floor in front
  P.group.updateMatrixWorld(true); P.torso.rotation.x = .14 + Math.sin(t * 1.6) * .012;
  P.legs.forEach((L, i) => { const s = i ? 1 : -1; L.solve(L2W(P.group, s * .12, -.5, .52), L2W(P.group, s * .12, .4, 1.4)); });
  P.arms.forEach((L, i) => { const s = i ? 1 : -1; L.solve(L2W(P.group, s * .15, .07, .3), L2W(P.group, s * .7, .1, -.4)); });
}
export function poseSitGround(P, t = 0) { // knees up, hugging them (pelvis at y≈.1)
  P.group.updateMatrixWorld(true); P.torso.rotation.x = .22 + Math.sin(t * 1.6) * .012;
  P.legs.forEach((L, i) => { const s = i ? 1 : -1; L.solve(L2W(P.group, s * .13, -.06, .5), L2W(P.group, s * .12, .9, .9)); });
  P.arms.forEach((L, i) => { const s = i ? 1 : -1; L.solve(L2W(P.group, s * .1, .36, .38), L2W(P.group, s * .7, .2, -.3)); });
}
// Claude: orange box with slit eyes, side nubs and four little legs. origin = bottom of the body.
export function claudeBot(parent, { color = 0xd97757, scale = 1 } = {}) {
  const C = { group: grp(parent) }; C.group.scale.setScalar(scale);
  const body = M(color, { roughness: .7 });
  C.body = grp(C.group); box(.56, .5, .46, body, 0, .25, 0, C.body);
  C.eyes = [-1, 1].map(s => box(.06, .12, .02, INK, s * .12, .3, .232, C.body));
  C.nubs = [-1, 1].map(s => { const g = grp(C.body, s * .28, .22, .02); box(.1, .11, .14, body, s * .05, 0, 0, g); return g; });
  C.legs = [-.19, -.065, .065, .19].map(x => { const g = grp(C.group, x, .02, .19); box(.08, .17, .08, body, 0, -.085, 0, g); return g; });
  C.talk = k => C.body.scale.set(1 + k * .03, 1 - k * .05, 1 + k * .03);
  C.walk = t => C.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 9 + i * PI / 2) * .5);
  return C;
}
export function dog(parent, { color = 0xd9884a, belly = 0xf3ece2 } = {}) { // shiba-ish, faceted
  const D = { group: grp(parent) }, c = M(color), w = M(belly), g = D.group;
  const body = ico(.24, c, 1, .01); body.scale.set(.85, .8, 1.5); body.position.y = .42; g.add(body);
  const chest = ico(.17, w, 1, .01); chest.position.set(0, .4, .24); g.add(chest);
  D.head = grp(g, 0, .62, .38); const hd = ico(.17, c, 1, .01); D.head.add(hd);
  const snout = ico(.08, w, 0); snout.scale.set(1, .8, 1.3); snout.position.set(0, -.04, .15); D.head.add(snout);
  const nose = ico(.03, INK, 0); nose.position.set(0, -.01, .25); D.head.add(nose);
  [-1, 1].forEach(s => { const e = shade(new THREE.Mesh(new THREE.ConeGeometry(.06, .12, 4), c)); e.position.set(s * .1, .15, -.01); e.rotation.z = -s * .25; D.head.add(e);
    const ey = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 4), INK); ey.position.set(s * .07, .03, .14); D.head.add(ey); });
  D.legs = [[-.12, .22], [.12, .22], [-.12, -.22], [.12, -.22]].map(([x, z]) => { const l = grp(g, x, .32, z); l.add(cyl(.045, .04, .32, w)); return l; });
  D.tail = grp(g, 0, .5, -.34); const tl = ico(.07, c, 0); tl.scale.set(1, 1, 1.6); tl.position.set(0, .06, -.05); D.tail.add(tl);
  D.wag = t => { D.tail.rotation.y = Math.sin(t * 14) * .5; };
  return D;
}

// ---------------------------------------------------------------- camera
// shot = { pos, look, focus, ap, fov }. close-up on a head: fov 32, ~2.5–3 m away. portrait two-shot: ~5 m.
export function applyShot(S, c, t = 0) {
  S.camera.fov = c.fov ?? 32; S.camera.updateProjectionMatrix();
  S.camera.position.copy(c.pos); S.camera.position.x += Math.sin(t * .9) * .008; S.camera.position.y += Math.sin(t * 1.3 + 1) * .006; // handheld breathing
  S.camera.lookAt(c.look); S.camera.updateMatrixWorld();
  S.bokeh.uniforms.focus.value = S.camera.position.distanceTo(c.focus ?? c.look);
  S.bokeh.uniforms.aperture.value = c.ap ?? .003; S.bokeh.uniforms.maxblur.value = c.maxblur ?? .012;
}
export function cutList(shots, end) { // [[start, u => shot], ...] -> t => shot (hard cuts, u = 0..1 inside each)
  return t => { let i = 0; for (let k = 0; k < shots.length; k++) if (t >= shots[k][0]) i = k; const t0 = shots[i][0], t1 = shots[i + 1] ? shots[i + 1][0] : end; return shots[i][1]((t - t0) / (t1 - t0), t); };
}
export const lerpV = (a, b, u) => a.clone().lerp(b, u);
