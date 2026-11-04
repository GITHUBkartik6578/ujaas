import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const cache = new Map<string, { viewBox: string; inner: string }>();

/** Reads a trusted artwork file from public/art once (the files are exported from the approved canvas design). */
function load(file: string) {
  let art = cache.get(file);
  if (!art) {
    const source = readFileSync(path.join(process.cwd(), 'public', 'art', file), 'utf8');
    const m = source.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>\s*$/);
    if (!m) throw new Error(`public/art/${file} is not an SVG`);
    art = { viewBox: m[1]!, inner: m[2]! };
    cache.set(file, art);
  }
  return art;
}

/**
 * Inlines a decorative SVG from public/art so the page stylesheet can animate its parts (flame, birds, petals,
 * leaves) and the global reduced-motion rule stops them. Hex colours stay in the art files, never in src.
 * `scope` suffixes every id, so the same file can appear more than once on a page. `vars` fills `{{name}}` text slots
 * (the writer's initial in the profile portrait) and is escaped; an unfilled slot is left empty.
 */
export function ArtSvg({ file, scope, className, slice = false, vars = {} }: { file: string; scope: string; className?: string; slice?: boolean; vars?: Record<string, string> }) {
  const { viewBox, inner } = load(file);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = inner.replace(/\{\{([\w.]+)\}\}/g, (_, k: string) => esc(vars[k] ?? '')).replace(/id="([^"]+)"/g, `id="$1-${scope}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${scope})`);
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio={slice ? 'xMidYMid slice' : undefined}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
