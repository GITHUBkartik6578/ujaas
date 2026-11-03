// Launch clean-up check (T-CLN-01): looks for development content, placeholders and mockup leftovers.
//   node scripts/launch-check.mjs --source          templates and source (must be clean before launch)
//   node scripts/launch-check.mjs --db <mongo uri>  stored data: DEV DATA records and the same strings
// Exit code 0 only when nothing is found. Seed files, tests and this folder are not scanned: they are development-only
// by design (the seed refuses to run in production).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const FORBIDDEN = [
  ['DEV DATA', /DEV DATA/],
  ['DEV wordmark or label', /className="dev-flag"|DEV_LEAD|DEV COVER/],
  ['lorem', /lorem ipsum/i],
  ['example.com / example.org', /example\.(com|org)/],
  ['mockup email', /info@ujaas(sahitya)?\.in/],
  ['mockup phone', /98765\s?43210/],
  ['mockup city line', /नई दिल्ली, भारत/],
  ['mockup statistics', /50K\+|1000\+ रचनाएँ|500\+ रचनाकार/],
  ['mockup year', /© ?2024/],
  ['placeholder zero count', /00 रचनाएँ/],
  ['TODO / FIXME', /\b(TODO|FIXME)\b/],
  ['dead link', /href="#"/],
  ['mockup typos', /ई-प्रत्रिका|अपती बात|व्वरित/],
];
const WELL_KNOWN = ['ग़ालिब', 'फ़ैज़', 'जौन एलिया', 'बच्चन', 'महादेवी वर्मा', 'कुमार विश्वास', 'गीतांजलि श्री', 'उदय प्रकाश', 'ममता कालिया', 'अशोक वाजपेयी'];

const mode = process.argv[2];
const hits = [];

if (mode === '--source') {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' }).split('\n').filter(Boolean)
    .filter((f) => /\.(tsx?|jsx?|css|mjs|json|md|html|svg)$/.test(f))
    .filter((f) => !/^(designs|docs|\.agents|\.github|scripts)\//.test(f) && !/^app_build\/backend\/scripts\//.test(f) && !/^[A-Za-z_.-]+\.md$/.test(f) && !/(^|\/)(tests|__tests__|e2e)\//.test(f) && !/src\/seed\//.test(f) && !/package(-lock)?\.json$/.test(f) && !/README\.md$/.test(f) && !/\.env\.example$/.test(f));
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      for (const [name, re] of FORBIDDEN) if (re.test(line) && !/launch-check-ignore/.test(line)) hits.push(`${f}:${i + 1}  ${name}`);
      for (const w of WELL_KNOWN) if (line.includes(w)) hits.push(`${f}:${i + 1}  well-known writer name "${w}"`);
    });
  }
  console.log(`Scanned ${files.length} source file(s).`);
} else if (mode === '--db') {
  const uri = process.argv[3];
  if (!uri) throw new Error('Usage: --db <mongo uri including the database name>');
  const { MongoClient } = createRequire(new URL('../app_build/backend/package.json', import.meta.url))('mongodb');
  const client = await MongoClient.connect(uri);
  const db = client.db();
  for (const c of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (c.name === 'sessions' || c.name === 'audit_logs') continue;
    const dev = await db.collection(c.name).countDocuments({ dev_data: true });
    if (dev > 0) hits.push(`${c.name}: ${dev} record(s) marked dev_data`);
    for (const doc of await db.collection(c.name).find({}).limit(5000).toArray()) {
      const text = JSON.stringify(doc);
      for (const [name, re] of FORBIDDEN) if (re.test(text)) hits.push(`${c.name}/${doc._id}  ${name}`);
      for (const w of WELL_KNOWN) if (text.includes(w)) hits.push(`${c.name}/${doc._id}  well-known writer name "${w}"`);
    }
  }
  await client.close();
} else {
  console.error('Usage: node scripts/launch-check.mjs --source | --db <mongo uri>');
  process.exit(2);
}

const unique = [...new Set(hits)];
for (const h of unique.slice(0, 80)) console.log(`HIT  ${h}`);
if (unique.length > 80) console.log(`... and ${unique.length - 80} more`);
console.log(unique.length === 0 ? 'Clean: no development content found.' : `${unique.length} hit(s). Not ready to launch.`);
process.exit(unique.length === 0 ? 0 : 1);
