import { HomeHero } from '@/components/home/HomeHero';
import { LiteraryCategories } from '@/components/home/LiteraryCategories';
import { AuthorsRow, DiscourseBand, FeaturedWorks, IssueShowcase, SubmitCta } from '@/components/HomeSections';
import { api, type HomeBlocks } from '@/lib/api';
import { typeLabel } from '@/lib/format';
import { getSubmissionConfig } from '@/lib/submission';

/**
 * Homepage from the approved canvas design: hero with the live quill, the genre bar, then the API blocks.
 * Every block comes from GET /api/v1/home and is hidden when it has no data (no placeholder content).
 */
export default async function HomePage() {
  const [{ blocks }, submit] = await Promise.all([api<{ blocks: HomeBlocks }>('/home'), getSubmissionConfig()]);
  const list = blocks.picks ?? blocks.latest ?? [];
  const works = list.map((c) => ({
    slug: c.slug, title: c.title, type: typeLabel(c.type), author: c.authors.map((a) => a.name).join(', '), lines: c.lines,
  }));
  return (
    <>
      <HomeHero submitOpen={submit.open} />
      <LiteraryCategories />
      {blocks.issue && <IssueShowcase issue={blocks.issue} />}
      {works.length > 0 && <FeaturedWorks works={works} heading={blocks.picks ? 'चयनित रचनाएँ' : 'नवीनतम रचनाएँ'} />}
      {blocks.authors && blocks.authors.length > 0 && <AuthorsRow authors={blocks.authors} />}
      <DiscourseBand />
      <SubmitCta />
    </>
  );
}
