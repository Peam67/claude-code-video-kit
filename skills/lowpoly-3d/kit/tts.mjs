// Thai voice lines with ElevenLabs eleven_v3, one request per line -> vo/<id>.mp3 + vo/durations.json
//   node tts.mjs --key-file "C:\path\key.txt"            (first sk_... in the file)
//   node tts.mjs --key-env ELEVENLABS_API_KEY            (an environment variable)
//   node tts.mjs --key-file ... l03 l07                  (remake only these ids)
// lines.json: [[id, voice, text, stability?], ...]   voice = liam | brian | sarah | any voice_id; empty/null = liam (default)
// Lines already in vo/ are skipped. The key is never printed.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';

const MODEL = 'eleven_v3';   // the only ElevenLabs model that speaks Thai without a foreign accent; do not change for Thai
const VOICES = {
  liam: ['TX3LPaxmHKxFdv7VOQHJ', .5],    // young man
  brian: ['nPczCjzI2devNBz1zQrb', 1.0],  // deep, calm, warm (narrator)
  sarah: ['EXAVITQu4vr4xnSDxMaL', .5],   // woman
};
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const keyFile = opt('--key-file'), keyEnv = opt('--key-env'), only = new Set(args);
let KEY = keyEnv ? process.env[keyEnv] : null;
if (keyFile) KEY = (fs.readFileSync(keyFile, 'utf8').match(/sk_[A-Za-z0-9]+/) || [])[0];
if (!KEY) { console.error('No key: pass --key-file <file with sk_...> or --key-env <VAR>'); process.exit(2); }

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const vo = path.join(ROOT, 'vo'); fs.mkdirSync(vo, { recursive: true });
for (const [id, voice, text, stab] of JSON.parse(fs.readFileSync(path.join(ROOT, 'lines.json'), 'utf8'))) {
  const out = path.join(vo, `${id}.mp3`);
  if (only.size ? !only.has(id) : fs.existsSync(out)) continue;
  const [vid, defStab] = VOICES[(voice || 'liam').toLowerCase()] || [voice, .5];
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: stab ?? defStab, similarity_boost: .75 } }),
  });
  if (!r.ok) { console.error(`ElevenLabs ${r.status} on ${id}:`, (await r.text()).slice(0, 300)); process.exit(3); }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log(id, voice, text);
}
const dur = {};
for (const f of fs.readdirSync(vo).filter(f => f.endsWith('.mp3')))
  dur[f.slice(0, -4)] = +(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(vo, f)]).toString()).toFixed(2);
fs.writeFileSync(path.join(vo, 'durations.json'), JSON.stringify(dur, null, 1));
console.log('durations', dur);
