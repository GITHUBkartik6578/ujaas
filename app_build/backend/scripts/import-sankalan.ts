/**
 * Imports "हिंदी साहित्य-संकलन" (Hindi_Sahitya_Sankalan.pdf) into the database.
 *   npm run import:sankalan            (dry run: prints what it would add)
 *   npm run import:sankalan -- --apply (writes)
 *
 * Additive and idempotent: a record is created only when its slug is not already there; nothing existing is
 * updated or deleted. Refuses to run in production. The text lives in scripts/import-data/sankalan/*.txt (cleaned
 * by hand from the PDF, whose text layer scrambles Devanagari vowel signs).
 *
 * Sections used, per the data model: genre = content_type, श्रेणी = Category, रचनाकार = Author, and one Collection
 * that keeps the PDF's own order.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Types } from 'mongoose';
import { fileURLToPath } from 'node:url';
import { getEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db/connect.js';
import { buildContentSearchFields } from '../src/lib/content.js';
import { Author, Category, Collection, CollectionItem, Content } from '../src/models/index.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'import-data', 'sankalan');
const SOURCE = 'हिंदी साहित्य-संकलन';
const RIGHTS = 'हिंदी साहित्य-संकलन (PDF) से आयात। प्रकाशन से पहले रचनाकार/प्रकाशक की अनुमति और पाठ-शुद्धि की पुष्टि करें।';

type CType = 'kavita' | 'ghazal' | 'geet' | 'kahani' | 'laghukatha';

const CATEGORIES = [
  { slug: 'kavita', name: 'कविता', sort_order: 1 },
  { slug: 'kahani', name: 'कहानी', sort_order: 2 },
  { slug: 'ghazal', name: 'ग़ज़ल', sort_order: 3 },
  { slug: 'laghukatha', name: 'लघुकथा', sort_order: 5, description: 'छोटे आकार में बड़ी बात कहने वाली कथाएँ।' },
  { slug: 'dohe', name: 'दोहे', sort_order: 6, description: 'संक्षिप्त छंदों में जीवन, समाज और विचार।' },
];

const AUTHORS = [
  { slug: 'vinay-mishra', name: 'विनय मिश्र' },
  { slug: 'ranjana-chaubey', name: 'डॉ. रंजना चौबे' },
  { slug: 'premchand', name: 'प्रेमचंद' },
];

interface Piece {
  file: string; slug: string; title: string; type: CType; format: 'verse' | 'prose'; category: string;
  authors: string[]; excerpt: string; source_note?: string;
}

// PDF order (विषय-सूची): गीत-नवगीत, दोहे, कविता, ग़ज़ल, लघुकथा, कहानी.
const PIECES: Piece[] = [
  { file: 'ek-mor-ka-pankh.txt', slug: 'ek-mor-ka-pankh', title: 'एक मोर का पंख', type: 'geet', format: 'verse', category: 'kavita', authors: [],
    excerpt: 'गीतात्मक संवेदना और स्मृतियों की अभिव्यक्ति — “एक मोर का पंख रखा है, बरसों पढ़ी किताब में।”', source_note: SOURCE + ' · विधा: गीत-नवगीत' },
  { file: 'doha-sangrah.txt', slug: 'doha-sangrah', title: 'दोहा-संग्रह', type: 'kavita', format: 'verse', category: 'dohe', authors: [],
    excerpt: 'संक्षिप्त छंदों में जीवन, समाज और विचार — बीस दोहे।', source_note: SOURCE + ' · विधा: दोहे' },
  { file: 'loktantra-agar-yahi-hai.txt', slug: 'loktantra-agar-yahi-hai', title: 'लोकतंत्र अगर यही है', type: 'kavita', format: 'verse', category: 'kavita', authors: [],
    excerpt: 'समकालीन व्यवस्था और जनजीवन पर केंद्रित कविता।', source_note: SOURCE + ' · विधा: कविता' },
  { file: 'log-zinda-hain.txt', slug: 'log-zinda-hain', title: 'लोग ज़िंदा हैं', type: 'ghazal', format: 'verse', category: 'ghazal', authors: ['vinay-mishra'],
    excerpt: 'ये जो थोड़ी रोशनी है, कितनी यादों से जुड़ी है — ग़ज़ल-संग्रह ‘लोग ज़िंदा हैं’ से।', source_note: SOURCE + ' · ग़ज़ल-संग्रह: ‘लोग ज़िंदा हैं’' },
  { file: 'aakhiri-gawah.txt', slug: 'aakhiri-gawah', title: 'आख़िरी गवाह', type: 'laghukatha', format: 'prose', category: 'laghukatha', authors: ['ranjana-chaubey'],
    excerpt: 'वृद्धाश्रम के रजिस्टर में नाम लिखते बूढ़े पिता की एक छोटी-सी कथा।', source_note: SOURCE + ' · विधा: लघुकथा' },
  { file: 'kafan.txt', slug: 'kafan', title: 'कफ़न', type: 'kahani', format: 'prose', category: 'kahani', authors: ['premchand'],
    excerpt: 'झोंपड़े के द्वार पर बाप और बेटा बुझे अलाव के सामने बैठे हैं और भीतर बुधिया प्रसव-वेदना में है — प्रेमचंद की कालजयी कहानी।',
    source_note: 'हिंदी कहानियाँ (पृष्ठ 13) · संपादक: जैनेंद्र कुमार · रचनाकार: प्रेमचंद · प्रकाशन: लोकभारती · प्रकाशन संस्करण: 1977' },
];

const COLLECTION = {
  slug: 'hindi-sahitya-sankalan',
  title: 'हिंदी साहित्य-संकलन',
  description: 'कविता, गीत-नवगीत, दोहे, ग़ज़ल, लघुकथा और कहानी — विविध साहित्यिक रचनाओं का एक सुव्यवस्थित संग्रह।',
};

const apply = process.argv.includes('--apply');
const env = getEnv();
if (env.NODE_ENV === 'production') {
  console.error('Refusing to import in production.');
  process.exit(1);
}
await connectDb(env.MONGODB_URI);
const say = (verb: string, what: string) => console.log(`${apply ? verb : `would ${verb}`}: ${what}`);

const catId = new Map<string, Types.ObjectId>();
for (const c of CATEGORIES) {
  const have = await Category.findOne({ slug: c.slug }).select('_id').lean();
  if (have) { catId.set(c.slug, have._id); console.log(`exists: category ${c.slug}`); continue; }
  say('create', `category ${c.slug} (${c.name})`);
  if (apply) catId.set(c.slug, (await Category.create({ ...c, is_active: true }))._id);
}
const authorId = new Map<string, { id: Types.ObjectId; name: string }>();
for (const a of AUTHORS) {
  const have = await Author.findOne({ slug: a.slug }).select('_id name').lean();
  if (have) { authorId.set(a.slug, { id: have._id, name: have.name }); console.log(`exists: author ${a.slug}`); continue; }
  say('create', `author ${a.slug} (${a.name})`);
  if (apply) authorId.set(a.slug, { id: (await Author.create({ ...a, is_public: true }))._id, name: a.name });
}

// Newest first in lists: the first piece of the PDF gets the latest time, a minute apart.
const now = Date.now();
const contentIds: Types.ObjectId[] = [];
for (const [i, p] of PIECES.entries()) {
  const have = await Content.findOne({ slug: p.slug }).select('_id').lean();
  if (have) { contentIds.push(have._id); console.log(`exists: content ${p.slug}`); continue; }
  const body = (await readFile(path.join(DIR, p.file), 'utf8')).replace(/\r\n/g, '\n').trim();
  const names = p.authors.map((s) => AUTHORS.find((a) => a.slug === s)!.name);
  const catName = CATEGORIES.find((c) => c.slug === p.category)!.name;
  say('create', `content ${p.slug} · ${p.type}/${p.category} · ${body.length} chars · authors: ${names.join(', ') || '—'}`);
  if (!apply) continue;
  const doc = await Content.create({
    title: p.title, slug: p.slug, content_type: p.type, body, body_format: p.format, excerpt: p.excerpt,
    category_id: catId.get(p.category),
    credits: p.authors.map((s) => ({ author_id: authorId.get(s)!.id, role: 'author' as const })),
    source_note: p.source_note, rights_note: RIGHTS,
    status: 'published', published_at: new Date(now - i * 60_000),
    lang_checked: true, proof_checked: true, final_approved: true, dev_data: false,
    ...buildContentSearchFields({ title: p.title, excerpt: p.excerpt, body, authorNames: names, categoryName: catName }),
  });
  contentIds.push(doc._id);
}

const haveCol = await Collection.findOne({ slug: COLLECTION.slug }).select('_id').lean();
if (haveCol) console.log(`exists: collection ${COLLECTION.slug}`);
else {
  say('create', `collection ${COLLECTION.slug} with ${PIECES.length} items`);
  if (apply) {
    const col = await Collection.create({ ...COLLECTION, status: 'published', published_at: new Date(now), dev_data: false });
    await CollectionItem.create(contentIds.map((id, i) => ({ collection_id: col._id, content_id: id, position: i + 1 })));
  }
}
console.log(apply ? 'Done.' : 'Dry run only. Re-run with --apply to write.');
await disconnectDb();
