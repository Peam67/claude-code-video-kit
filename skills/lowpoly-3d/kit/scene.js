// DEMO / starting point: copy this file per clip. Shows every kit piece in one 10 s turntable.
import { THREE, PI, V, K, io, blink, stage, lighting, ground, tree, rock, grass, motes, person, poseStand, poseSitGround, claudeBot, dog, applyShot, cutList, lerpV } from './kit.js';

const END = 10;
const S = stage({ exposure: 1.2 });
const L = lighting(S.scene, new URLSearchParams(location.search).get('light') || 'golden');
ground(S.scene, 0xd8b860);
const G = grass(S.scene, { n: 30000, rMax: 14, hMin: .15, hMax: .45, avoid: (x, z) => Math.hypot(x, z) < 1.4 });
tree(S.scene, -1.8, -2.2, 1.1); rock(S.scene, 1.6, -1.2, .35);
const fly = motes(S.scene);

const boy = person(S.scene); boy.group.position.set(-.55, .9, 0);
const girl = person(S.scene, { top: 0xc95b6b, topD: 0xa94a59, pants: 0x3a3550, hair: 0x5a3422, hairStyle: 'long', strings: null, scale: .95 }); girl.group.position.set(.15, .1, -.4);
const cb = claudeBot(S.scene); cb.group.position.set(.75, .17, .1);
const pup = dog(S.scene); pup.group.position.set(1.5, 0, .6); pup.group.rotation.y = -.6;

const shot = cutList([
  [0, u => ({ pos: lerpV(V(0, 1.1, 4.8), V(0, 1.0, 4.2), io(u)), look: V(.2, .8, 0), focus: V(0, .9, 0), ap: .002, fov: 36 })],                 // wide
  [4, u => ({ pos: lerpV(V(-.5, 1.75, 2.6), V(-.5, 1.74, 2.4), u), look: V(-.55, 1.75, 0), ap: .0035 })],                                     // close-up
  [7, u => ({ pos: V(Math.sin(u * 1.2 - .6) * 5, .5, Math.cos(u * 1.2 - .6) * 5), look: V(0, .7, 0), focus: V(0, .7, 0), ap: .003, fov: 40 })], // low orbit
], END);

window.DURATION = END;
window.seek = t => {
  G.wind.value = t;
  poseStand(boy, t); boy.head.rotation.y = K(t, [[0, 0], [5, 0], [6, .3]]); boy.setSmile(K(t, [[0, 0], [5.5, 0], [6.2, 1]])); boy.eyes.forEach(e => e.scale.y = 1.15 * blink(t));
  poseSitGround(girl, t); girl.setSad(.3);
  cb.group.rotation.y = Math.sin(t * .8) * .3; cb.talk(Math.abs(Math.sin(t * 6)) * .5);
  pup.wag(t);
  applyShot(S, shot(t), t); fly(t, S.camera);
  S.composer.render();
};
window.ready = document.fonts.load('500 40px K', 'กขabc').then(() => { window.seek(0); return true; });
