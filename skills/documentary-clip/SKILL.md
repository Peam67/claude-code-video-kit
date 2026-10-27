---
name: documentary-clip
description: Make a fast-cut, punchy edit - pictures that change on almost every important word, word-by-word captions, big hero words, counters, flashes and strobes, end card and CTA - with HyperFrames, stock footage and a narrator or the user's own voice. Use when the user asks for a documentary-style / "AI edited" / fast-cut / ภาพตัดรัวๆ / ตัดต่อเท่ๆ clip, a clip made from their talking-head footage or a script, or says ทำคลิปสไตล์สารคดี, ทำคลิปแบบนี้, ตัดต่อให้เหมือนต้นฉบับ.
---

# Documentary-style clip (HyperFrames)

You turn what the user gives you (talking-head footage, a script, a topic, a reference clip) into a clip whose pictures
change on almost every important word. Length, aspect ratio, voice, music and style come from the user and their
reference; without them, default to ~45-60 s at 30 fps and the aspect ratio of their footage (horizontal if none).
**The result is always an mp4 file**, never a web page, an Artifact or a published link. This skill is the *recipe and the traps*; the mechanics of writing and
rendering a HyperFrames project live in the HyperFrames skills (`/hyperframes`, `/hyperframes-cli`, `/media-use`,
`/hyperframes-registry`) - read them first, they own the composition contract.

The motion numbers (frames, sizes, easings, transitions) are in `references/motion-library.md`. Read it before building.

## 0. Before you start

1. Check that the tools are there (`node -v`, `ffmpeg -version`, `npx hyperframes --version`, whisper via
   `HYPERFRAMES_WHISPER_PATH`). Install only what is missing.
2. **Space while rendering:** a 1080p30 render writes ~0.02 GB of temporary frames per second of video (measured: 1.03 GB for
   a 50 s clip). Keep at least `max(5, 0.04 x seconds + 2)` GB free on the TEMP drive; if it is short, set `TEMP` and `TMP` to a
   roomier drive before `hyperframes render`.
3. **Keys:** use only the keys the user points you to (a file, an environment variable). Read them in code; **never print a
   key**, never copy one into the project, never search the disk for keys. If a step needs a key the user has not given,
   ask for where it is once.
4. Keep the project path **short** (e.g. `D:/clips/topic`). A very long working directory breaks the npm shims on Windows.
5. You cannot hear audio. Say so in the delivery note and report what you *measured* (loudness, levels, whisper round-trip)
   separately from what only a human can judge (voice taste, pronunciation of loanwords).

## 1. Workflow

1. **Inspect the raw clip.** `ffprobe`, a 1 fps contact sheet, and a transcript (`whisper-cli -l th -m ggml-medium.bin`).
   Thai comes back as long chunks without word times: split with `pythainlp` and spread each chunk's time over the words
   by syllable weight (English words ~0.55 x letters + 1).
2. **Tighten.** If the raw take has mistakes or repeated lines, cut it with the `talking-head-cut` skill first (best take per
   line, false starts out, pauses measured from a hand edit). For a clean take, `tools/tighten_silence.py in.mp4 out.mp4` removes silent gaps (it also re-encodes with a keyframe every
   second, which HyperFrames needs - otherwise it warns about "sparse keyframes" and seeks freeze).
3. **Write the narration** - one short line per beat, in the user's language, in a single file. Spell numbers as words and
   write English terms the way you want them spoken. Keep each line <= ~15 words.
4. **Voice-over** with the voice/engine the user names (their own recording, ElevenLabs, a local TTS...). Do not choose
   one for them; if the clip needs a narrator and they named nothing, ask once.
   - ElevenLabs: **read `references/thai-voice.md` first** (voices, settings, Thai tips). The model must be **`eleven_v3`**;
     every other ElevenLabs model speaks Thai with a foreign accent. Free accounts get **premade voices only**. With a key but
     no voice named, pick from that table by character instead of asking. `tools/eleven_tts_lines.py script.txt out_dir --voice <id> --key-file <file>` (or the env var the user
     named) generates N takes per line and keeps the one whisper hears most accurately.
   - Any other engine: make 2-3 takes per line and keep the one whisper hears most accurately.
   After generating, compare each line's real duration with the slot the picture plan gives it; if a line runs long,
   **stretch the picture** for that stretch (hold/zoom) instead of speeding the voice up by more than ~5%.
5. **Plan shots.** For every noun/verb that matters, pick a picture that literally shows it (say "eye" -> an eye).
   Use the rhythm in the motion library: 0.1-0.3 s shots in the hook, 0.3-1 s in the body, 2-3 frame strobes at the end.
   Mark 6-10 "hero words" that get big type. Write the plan as data (a Python/JSON list), then generate the HTML from it.
6. **Source pictures.**
   - Stock: Pixabay API (`https://pixabay.com/api/videos/?key=...&q=...`). **Send a browser `User-Agent` header or you get 403.**
   - Public-domain art/photos: Wikimedia Commons (`Special:FilePath/<name>?width=2400`).
   - Movie/TV scenes for personal, non-commercial clips: `yt-dlp -f "bv*[height<=720]" --download-sections "*0-60" "ytsearch1:<scene>"`.
     Tell the user the platform may mute/remove the upload.
   - Crop letterboxes with `ffmpeg -vf cropdetect`, zoom 1.3-1.4x to hide logos/watermarks, then scale-crop to 1920x1080 @30 fps.
   - **HDR sources (BT.2020/PQ) must be tone-mapped to SDR** (`zscale ... tonemap=hable ... bt709`) or HyperFrames switches
     the whole render to HDR and the colours go wrong. Render with `--sdr` as well.
7. **Build the project** (see the HyperFrames skills). Structure that worked: root + 5 sub-compositions: `hook`, `doc`,
   `outro`, `caps` (captions, one track), `fx` (flashes/leaks/tiles above everything). Generate them from the plan with a script
   so a timing change is one edit + re-run.
8. **Music.** Pick the loud/drop sections by measuring RMS every 0.5 s. Duck with a sidechain compressor keyed by the actual voice
   tracks, set the bed level with a fixed gain (not dynamic `loudnorm`), silence it completely in any black hold.
9. **Check, then render.** `npx hyperframes check`, `snapshot` of every hero word/transition, whisper round-trip of the
   narration, loudness (-14 LUFS, peak <= -1 dBTP; apply the final gain linearly *after* the render with a limiter).
10. **Review against the reference** with contact sheets (2 fps) of both clips side by side; fix the biggest gaps only.

## 2. Traps we already hit (save yourself the time)

| Symptom | Cause / fix |
|---|---|
| Invert / pixelate transitions render as a white oval | CSS `mix-blend-mode` does not cross sub-composition layers. **Bake** the pixelated / inverted frame into 1-2 still frames and place them as clips. |
| Flash looks oval, not full-frame | A vignette layer sits above it. Put flashes at a higher `z-index` than the vignette. |
| `Render failed ... Disk capture may need ~1 GB` | System drive nearly full. Set `TEMP`/`TMP` elsewhere (or `--workers 1`). |
| Video frames freeze / seek failures | Source has sparse keyframes: re-encode `-g 30 -keyint_min 30`. |
| Whole render turns HDR | An HDR source clip slipped in. Tone-map it; render with `--sdr`. |
| `The paging file is too small` loading a 2B TTS model | Not enough free commit memory. Load the weights tensor-by-tensor straight onto the GPU instead of memory-mapping the file. |
| Audio overlap warnings (`duplicate_audio_track`) | Give every sound-effect clip its own `data-track-index`. |
| Hero word hard to read on a bright picture | Heavy multi-layer text-shadow + a soft dark radial behind the word; never plain white on white. |
| Captions unreadable on a phone | 44-48 px Thai serif, weight 600, heavy shadow, <= 3 words / 20 characters per group, clear the group before a black hold. |
| Pixabay returns 403 | Missing `User-Agent` header. |
| ElevenLabs `paid_plan_required` / `voice_not_found` | Library voice on a free key: use a premade voice. |
| Narrator line a different loudness than the presenter | Measure both (LUFS) and trim to within ~0.5 LU; the hand-over must have < 0.1 s of dead air. |

## 3. Delivery note (always include)

What was built; the files; the measured numbers (duration, LUFS, peak, music-under-voice dB, black-hold level); what was *not*
verified (anything that needs ears); the weakest shot; and the licence caveat for movie clips / songs (personal use; platforms
may mute or remove).

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
