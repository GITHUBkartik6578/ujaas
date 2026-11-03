/**
 * DEV DATA. Sample records so the public site can be seen and tested at density (content_safety skill).
 * Every record carries dev_data: true. Nothing here is real UJAAS content. Local and staging only:
 * scripts/seed-dev.ts refuses to run in production. The text is neutral stand-in material written for
 * testing Hindi search (nukta, chandrabindu, anusvara, punctuation variants).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { buildContentSearchFields } from '../lib/content.js';
import { Author, Category, Collection, CollectionItem, ConsentText, Content, MediaAsset } from '../models/index.js';

type Cat = { _id: unknown; name: string };
type Auth = { _id: unknown; name: string };
type Media = { _id: unknown };

export interface DevSeedResult {
  slugs: Record<string, string>;
  mediaIds: { withAlt: string; noAlt: string };
}

export async function seedDevData(now: Date = new Date()): Promise<DevSeedResult> {
  const past = new Date(now.getTime() - 86_400_000);
  const older = new Date(now.getTime() - 3 * 86_400_000);
  const future = new Date(now.getTime() + 7 * 86_400_000);

  const [kavita, kahani, ghazal, vichar] = (await Category.create([
    { name: 'कविता', slug: 'kavita', sort_order: 1, dev_data: true },
    { name: 'कहानी', slug: 'kahani', sort_order: 2, dev_data: true },
    { name: 'ग़ज़ल', slug: 'ghazal', sort_order: 3, dev_data: true },
    { name: 'विचार', slug: 'vichar', sort_order: 4, dev_data: true },
  ])) as unknown as [Cat, Cat, Cat, Cat];
  const [ek, do_, teen, niji] = (await Author.create([
    { name: 'रचनाकार एक', slug: 'rachnakar-ek', bio: 'DEV DATA: नमूना परिचय।', is_public: true, dev_data: true },
    { name: 'रचनाकार दो', slug: 'rachnakar-do', is_public: true, dev_data: true },
    { name: 'रचनाकार तीन', slug: 'rachnakar-teen', is_public: true, dev_data: true },
    { name: 'रचनाकार निजी', slug: 'rachnakar-niji', is_public: false, dev_data: true }, // not public: no profile
  ])) as unknown as [Auth, Auth, Auth, Auth];
  const [withAlt, noAlt] = (await MediaAsset.create([
    { storage_key: 'dev-cover-with-alt.png', mime: 'image/png', width: 800, height: 600, bytes: 1000, alt_text: 'DEV DATA: नमूना आवरण', credit: 'DEV DATA', is_public: true, dev_data: true },
    { storage_key: 'dev-cover-no-alt.png', mime: 'image/png', width: 800, height: 600, bytes: 1000, alt_text: '', is_public: true, dev_data: true },
  ])) as unknown as [Media, Media];

  interface Seed {
    key: string; slug: string; title: string; type: 'kavita' | 'ghazal' | 'geet' | 'kahani' | 'vichar'; format: 'verse' | 'prose';
    excerpt: string; body: string; cat: Cat; authors: Auth[];
    status: 'published' | 'unpublished' | 'draft' | 'archived' | 'approved'; at?: Date;
    featured?: boolean; cover?: Media; rights?: string;
  }
  const base = (c: Seed) => ({
    title: c.title, slug: c.slug, content_type: c.type, body: c.body, body_format: c.format, excerpt: c.excerpt,
    category_id: c.cat._id, credits: c.authors.map((a) => ({ author_id: a._id, role: 'author' as const })),
    status: c.status, published_at: c.at, featured: c.featured ?? false, feature_order: c.featured ? 1 : undefined,
    cover_media_id: c.cover?._id, rights_note: c.rights ?? 'DEV DATA: अनुमति नोट (निजी)', lang_checked: true, proof_checked: true,
    final_approved: true, dev_data: true,
    ...buildContentSearchFields({
      title: c.title, excerpt: c.excerpt, body: c.body, authorNames: c.authors.map((a) => a.name), categoryName: c.cat.name,
    }),
  });

  const seeds: Seed[] = [
    { key: 'aangan', slug: 'aangan-ki-dhoop', title: 'नमूना कविता: आँगन की धूप', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'आँगन में उतरी धूप का नमूना।', body: 'आँगन में उतरी धूप\nहँसी की तरह\nसुबह का उजास', status: 'published', at: past, featured: true, cover: withAlt },
    { key: 'zindagi', slug: 'zindagi', title: 'नमूना ग़ज़ल: ज़िंदगी', type: 'ghazal', format: 'verse', cat: ghazal, authors: [teen],
      excerpt: 'ज़िंदगी पर नमूना शेर।', body: 'ज़िंदगी का हर सफ़र\nख़ामोशी में बात है', status: 'published', at: older },
    { key: 'barish', slug: 'barish-ki-raat', title: 'नमूना कहानी: बारिश की रात', type: 'kahani', format: 'prose', cat: kahani, authors: [do_],
      excerpt: 'बारिश की रात का नमूना।', body: 'बारिश की उस रात गाँव का रास्ता बंद हो गया। दीपक की लौ काँपती रही।', status: 'published', at: new Date(now.getTime() - 2 * 86_400_000) },
    { key: 'bhasha', slug: 'bhasha-aur-samaj', title: 'नमूना विचार: भाषा और समाज', type: 'vichar', format: 'prose', cat: vichar, authors: [niji],
      excerpt: 'भाषा और समाज पर नमूना विचार।', body: 'भाषा समाज का आईना है। शब्द बदलते हैं तो सोच बदलती है।', status: 'published', at: new Date(now.getTime() - 4 * 86_400_000) },
    { key: 'chandni', slug: 'chandni', title: 'नमूना गीत: चाँदनी', type: 'geet', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'चाँदनी पर नमूना गीत।', body: 'चाँदनी रात में, मन गुनगुनाए', status: 'published', at: new Date(now.getTime() - 5 * 86_400_000) },
    { key: 'pahad', slug: 'pahad-aur-nadi', title: 'नमूना कविता: पहाड़ और नदी', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'पहाड़ और नदी का नमूना।', body: 'पहाड़ की चोटी पर\nनदी का गीत\nबादल का घर', status: 'published', at: new Date(now.getTime() - 6 * 86_400_000), featured: true, cover: noAlt },
    // Never public:
    { key: 'hidden', slug: 'chhipi-rachna', title: 'नमूना: छिपी रचना गुप्तशब्द', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'अप्रकाशित।', body: 'गुप्तशब्द', status: 'unpublished', at: past },
    { key: 'draft', slug: 'masauda', title: 'नमूना: मसौदा मसौदाशब्द', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'मसौदा।', body: 'मसौदाशब्द', status: 'draft' },
    { key: 'future', slug: 'bhavishya', title: 'नमूना: भविष्य भविष्यशब्द', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'भविष्य।', body: 'भविष्यशब्द', status: 'published', at: future },
    { key: 'archived', slug: 'puralekh', title: 'नमूना: पुरालेख पुरालेखशब्द', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'पुरालेख।', body: 'पुरालेखशब्द', status: 'archived', at: past },
    { key: 'approved', slug: 'anumodit', title: 'नमूना: अनुमोदित अनुमोदितशब्द', type: 'kavita', format: 'verse', cat: kavita, authors: [ek],
      excerpt: 'अनुमोदित।', body: 'अनुमोदितशब्द', status: 'approved' },
  ];
  const docs = (await Content.create(seeds.map(base) as never)) as unknown as Array<{ _id: unknown }>;
  const id = (key: string) => docs[seeds.findIndex((s) => s.key === key)]!._id;

  const col = await Collection.create({
    title: 'नमूना संग्रह', slug: 'namuna-sangrah', description: 'DEV DATA: नमूना संग्रह का परिचय।',
    status: 'published', published_at: past, dev_data: true,
  });
  await CollectionItem.create(([
    { collection_id: col._id, content_id: id('barish'), position: 1 },
    { collection_id: col._id, content_id: id('aangan'), position: 2 },
    { collection_id: col._id, content_id: id('hidden'), position: 3 }, // unpublished member: must not show
    { collection_id: col._id, content_id: id('chandni'), position: 4 },
  ]) as never);

  // DEV consent text so the form can be tried locally. It is NOT legal wording and is ignored in production (D-03).
  await ConsentText.create({
    version: 'dev-1', dev_data: true, approved_at: now,
    text_original: 'DEV DATA: मूल रचना की घोषणा का नमूना (कानूनी पाठ नहीं)।',
    text_publication: 'DEV DATA: समीक्षा के बाद प्रकाशन की अनुमति का नमूना (कानूनी पाठ नहीं)।',
    text_privacy: 'DEV DATA: गोपनीयता की स्वीकृति का नमूना (कानूनी पाठ नहीं)।',
  });

  return {
    slugs: Object.fromEntries(seeds.map((s) => [s.key, s.slug])),
    mediaIds: { withAlt: String(withAlt._id), noAlt: String(noAlt._id) },
  };
}

/** Writes the two DEV cover images the seed refers to (flat colour fields, no text, no people). */
export async function writeDevMedia(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const [name, colour] of [['dev-cover-with-alt.png', '#f4e2d1'], ['dev-cover-no-alt.png', '#ceb194']] as const) {
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: colour } }).png().toBuffer();
    await writeFile(path.join(dir, name), png);
  }
}
