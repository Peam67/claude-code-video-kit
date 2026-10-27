# Thai voice with ElevenLabs (read this before making any Thai voice)

**Always use model `eleven_v3` for Thai.** `eleven_multilingual_v2`, `eleven_turbo_*` and `eleven_flash_*` speak Thai
like a foreigner and are hard to understand. v3 reads Thai script by itself: no language setting, just send Thai text.

## Voices that work on every plan (premade)

| Use for | Name | voice_id | stability |
|---|---|---|---|
| Young man | Liam | `TX3LPaxmHKxFdv7VOQHJ` | 0.5 (natural) |
| Narrator / Claude (deep, calm, warm) | Brian | `nPczCjzI2devNBz1zQrb` | 1.0 (steady, no wobble) |
| Woman / grandmother | Sarah | `EXAVITQu4vr4xnSDxMaL` | 0.5 |

`stability` in v3: 0 = most emotion but may go off, 0.5 = natural, 1.0 = steadiest and clearest.
Use the voice the user asks for; this table is the starting point when they only describe the character.
Voice Library voices need a paid plan through the API (`paid_plan_required` / `voice_not_found` on a free key).

## The call

`POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id>?output_format=mp3_44100_128`
headers `xi-api-key: <key>`, `Content-Type: application/json`, body:
```json
{ "text": "[sad] ถ้าฉันมีเหตุผลเป็นร้อยข้อ... ที่จะร้องไห้ล่ะ", "model_id": "eleven_v3",
  "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 } }
```
The response is the mp3 itself. In the lowpoly kit use `node tts.mjs --key-file <file>` (or `--key-env <VAR>`) with
`lines.json` = `[[id, voice, text, stability?], ...]`; it writes `vo/<id>.mp3` and `vo/durations.json`.
The key comes from where the user said it is; never print it.

## Getting good Thai
- **One sentence per request**: steadier voice, and easy to place on the timeline.
- **`...`** where a breath/pause should be: it really pauses.
- **Emotion tags in English, in square brackets, before the sentence**: `[sad]` `[quietly]` `[softly]` `[whispers]` `[laughs]`.
- **Write English names the way they are read in Thai**: "Claude" → "คลอด", otherwise it is mispronounced.
- **Slower speech** without changing the pitch: `ffmpeg -i in.mp3 -af atempo=0.9 out.mp3` (10% slower).
- **Quota** counts every character sent, tags and spaces included; a line is about 30–60 characters.
- Check each line: transcribe it back with whisper (`-l th`) and compare with the script; remake lines that score low.
