import Link from 'next/link';
import { DESIGN_REVIEW, isBuilt } from '@/lib/routes';

interface Props {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A link only when its page exists. In production an unbuilt destination renders nothing at all
 * (never a dead link, never a decorative button). In design review it shows as disabled text.
 */
export function SafeLink({ href, className, children }: Props) {
  if (isBuilt(href)) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }
  if (!DESIGN_REVIEW) return null;
  return (
    <span className={[className, 'is-unbuilt'].filter(Boolean).join(' ')} aria-disabled="true" title="यह पृष्ठ अभी बना नहीं है (डिज़ाइन समीक्षा)">
      {children}
    </span>
  );
}
