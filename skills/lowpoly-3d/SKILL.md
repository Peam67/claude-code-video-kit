---
name: lowpoly-3d
description: Make a clip in a flat-shaded, faceted low-poly 3D look (round faceted heads, dot eyes, small beak nose, soft shadows, depth of field, bloom, film grain), built in Three.js from the kit next to this file and rendered frame by frame to an mp4. Use when the user asks for a 3D / low-poly / animated story clip, a character scene, a "what if" or drama made with 3D characters, or says สไตล์ low-poly, ภาพ 3D แบบนี้, การ์ตูน 3D, /lowpoly-3d.
---

# Low-poly 3D clip

Reference image of the look: `look.jpg` next to this file. Open it before building.

**This skill is the look and the method, not the content.** Story, characters, place, shots, captions, voice, music,
length and aspect ratio come from the user each time. Do not assume any of them; when the user gave none, pick
sensible defaults (vertical 1080×1920, 30 fps) and go.

**The result is always an mp4 file.** Never make a web page, an Artifact or a published link as the deliverable.

## What the look is
- Real-time 3D, **flat-shaded, faceted low-poly** (icosahedron/cylinder/box shapes, `flatShading: true`, slightly
  jittered vertices). Not clay, not smooth/Pixar, not AI video.
- People: round faceted head (ico detail 1, slightly long, narrow chin), black dot eyes with a white highlight, tiny
  4-sided beak nose, thin box mouth (torus smile), box eyebrows, small ears; tapered cylinder torso; IK arms/legs with
  ball joints; chunky box shoes. Hair = faceted cap + cone spikes.
- Light: low warm sun with soft shadows, hemisphere fill, ACES tone mapping; sky = gradient dome with sun glow.
- Lens: depth of field (subject sharp, foreground/background melted); bloom on glowing things; vignette + film grain.
- Life: everything moves a little — camera breathing, idle breathing, blinking, wind, floating dust.
- A "2D" request can still be made here (orthographic camera, flat planes, HTML/CSS layers in `index.html`).

## The kit (`kit/` next to this file)
Copy it for every clip (node_modules included, so it runs at once) into the user's project folder; never edit it in place:
```
cp -r "<this skill>/kit" "<project folder>/<clip name>"
```
If `node_modules` is missing in the copy, run `npm install` there.
- `kit.js` — the library: `stage()`, `lighting(scene, 'golden'|'sunset'|'day'|'night'|'overcast', {sunFrom:'front'|'back'})`,
  `ground`, `tree`, `rock`, `grass` (wind), `motes`, `person({top, pants, hair, hairStyle:'messy'|'short'|'bun'|'long'|'bald', skin, glasses, dress, scale})`,
  `poseStand / poseSitBench / poseSitGround`, `claudeBot()` (`.talk(k)`, `.walk(t)`), `dog()` (`.wag(t)`), face helpers
  (`setSmile`, `setSad`, `eyes`), `Limb` IK for custom poses, `applyShot`, `cutList` (hard cuts, slow drift), `K`
  keyframes, `io/sm` easing, `blink`, seeded `rnd()/R()`. Building blocks `M()`, `GLOW()`, `box`, `ico`, `cyl`, `jitter`.
- `scene.js` — a demo of every piece; replace it with the clip. Must define `window.DURATION`, `window.seek(t)` (a pure
  function of t: no `Date.now`, no unseeded `Math.random`, no timers) and `window.ready`. Optional `window.CUES`
  (`[{t, id}]`) is written to `out/cues.json` for placing voice lines.
- `index.html` — canvas + vignette + grain + subtitle div `#line` (Kanit) + `#black` fade layer.
- `render.js` — `node render.js 2,5.5` → `out/still_<t>.png`; `node render.js` → `out/video_noaudio.mp4`
  (Chrome or Edge, found automatically). Then mix the sound and mux it with ffmpeg.
- `tts.mjs` — Thai voice lines with ElevenLabs `eleven_v3` from `lines.json` → `vo/<id>.mp3` + `vo/durations.json`.
- New props, animals, buildings, vehicles: build them in the same vocabulary and keep them in the clip's own files.

## What makes a good clip
- A clear story beat every few seconds; the picture shows what the words say.
- Shots vary (wide → medium → close-up), hard cuts on the beat, slow camera drift inside a shot.
- Sets feel full: no empty floors or bare horizons; fill streets, rooms and backgrounds with props and people.
- Subtitles readable on a phone and never over faces; big numbers or title cards when they help.
- Sound: voice (if the user wants one), music bed ducked under the voice, sound effects on visible actions,
  final level around −14 LUFS.

## Rules that keep it looking right
- Models face +z. `sunFrom:'back'` needs a fill light or faces go dark.
- Vertical frame: head close-up fov ~32 at 2.5–3 m; two people side by side ~5 m; wides fov 36–46.
- **Render stills and look at them before the full render**: faces visible, nothing clipping through props, feet on
  the ground, no giant white blobs (glowing things or motes at the lens), nothing floating, subtitles readable.
- Full render ≈ 15–25 min per minute of video; run it in the background. Final encode crf ~20.

## Voice, music and keys
- Use the voice / engine / music the user gives or names.
- **Thai voice with ElevenLabs: read `thai-voice.md` (next to this file) first and use `kit/tts.mjs`.** The model must be
  `eleven_v3`; any other ElevenLabs model speaks Thai with a foreign accent. If the user gave an ElevenLabs key but no
  voice, pick from the table in `thai-voice.md` by character (narrator → Brian, young man → Liam, woman → Sarah) — do
  not ask.
- API keys: use only where the user tells you the key is (a file, an environment variable). Read it in code, never
  print, log or copy it into the project, never search the disk for keys.
- Copyrighted music: mention once that platforms may mute or claim the clip.

## Delivery
Give the path of the final mp4, its length and loudness, and say what you could not check (you cannot hear audio).

### Credit report (after every finished clip, whenever a paid/metered API key was used)
Read the key in code from where the user said it is; never print it or log a URL that contains it (Pixabay keys sit in
the query string).
- **ElevenLabs:** `GET https://api.elevenlabs.io/v1/user/subscription` with header `xi-api-key` (free, no credit used).
  Read it **before** generating the voice and again when the clip is done. Report:
  remaining = `character_limit - character_count`; used by this clip = the difference between the two readings;
  clips left ≈ remaining ÷ used by this clip (round down); reset date = `next_character_count_reset_unix`; tier.
  If the call is refused (a key made without User/read permission), say so and report only the characters you sent.
- **Pixabay:** no credit counter — say it is free and only rate-limited.
- **Any other service:** use its balance/usage endpoint if it has one; if not, say usage cannot be measured.
  Never guess numbers.
Put the report in the user's language at the end of the delivery message, e.g.
`เครดิต ElevenLabs: เหลือ 8,120 / 10,000 ตัวอักษร · คลิปนี้ใช้ 864 · ทำได้อีกราว 9 คลิปแบบนี้ · รีเซ็ต 15 พ.ย.`
