import { StageHome } from '@/components/StageHome';
import { AuthorsRow, IssueShowcase, SubmitCta } from '@/components/HomeSections';
import { api, type HomeBlocks } from '@/lib/api';
import { typeLabel } from '@/lib/format';
import { DESIGN_REVIEW } from '@/lib/routes';
import { getSubmissionConfig } from '@/lib/submission';

// DEV copy: the tagline is fixed by the brief; this sentence is a stand-in for the owner to confirm.
const DEV_LEAD = 'हिंदी साहित्य का मंच: पढ़िए, लिखिए और भेजिए।';

/**
 * Every block comes from GET /api/v1/home and is hidden when it has no data.
 * The issue block returns with the e-magazine phase.
 */
export default async function HomePage() {
  const [{ blocks }, submit] = await Promise.all([api<{ blocks: HomeBlocks }>('/home'), getSubmissionConfig()]);
  const list = blocks.picks ?? blocks.latest ?? [];
  const picks = list.map((c) => ({
    slug: c.slug, title: c.title, type: typeLabel(c.type), author: c.authors.map((a) => a.name).join(', '), lines: c.lines,
  }));
  return (
    <>
      <StageHome picks={picks} lead={DEV_LEAD} heading={blocks.picks ? 'विशेष रचनाएँ' : 'नवीनतम रचनाएँ'} devLead={DESIGN_REVIEW} submitOpen={submit.open} />
      {blocks.issue && <IssueShowcase issue={blocks.issue} />}
      {blocks.authors && blocks.authors.length > 0 && <AuthorsRow authors={blocks.authors} />}
      <SubmitCta />
    </>
  );
}
