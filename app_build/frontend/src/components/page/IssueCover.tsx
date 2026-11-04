import { ArtSvg } from '../ArtSvg';
import { Picture } from '../parts';
import type { IssueCard } from '@/lib/api';
import { dev } from './Blocks';

/**
 * An issue's cover: the uploaded picture when there is one, otherwise the designed cover from the canvas
 * (wordmark, sun-and-book mark, title and number) in one of four tones.
 */
export function IssueCover({ i, tone = 0, large = false, priority = false }: { i: IssueCard; tone?: number; large?: boolean; priority?: boolean }) {
  if (i.cover) {
    return (
      <div className={`ip-cover ip-photo${large ? ' ip-large' : ''}`}>
        <Picture cover={i.cover} sizes={large ? '(min-width: 900px) 24rem, 90vw' : '(min-width: 900px) 18rem, 45vw'} priority={priority} />
      </div>
    );
  }
  return (
    <div className={`ip-cover ip-tone-${tone % 4}${large ? ' ip-large' : ''}`} aria-hidden="true">
      <span className="ip-word">उजास</span>
      <ArtSvg file="ujaas-mark-light.svg" scope={`ic-${i.slug}${large ? '-l' : ''}`} className="ip-mark" />
      <span className="ip-foot">
        {large && <span className="ip-title">{i.title}</span>}
        <span className="ip-num">अंक {dev(i.issue_number)}{large ? ` · ${i.period_label}` : ''}</span>
      </span>
    </div>
  );
}
