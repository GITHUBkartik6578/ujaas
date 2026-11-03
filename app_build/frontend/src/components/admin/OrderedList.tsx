'use client';

export interface OrderedItem { id: string; title: string; warning?: string | null }

/**
 * Reordering with up and down buttons (keyboard and screen-reader friendly; dragging is not required).
 * Used for collection members and homepage picks.
 */
export function OrderedList({ items, onChange, disabled }: { items: OrderedItem[]; onChange: (next: OrderedItem[]) => void; disabled?: boolean }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  if (items.length === 0) return <p className="muted">अभी कोई रचना नहीं चुनी गई।</p>;
  return (
    <ol className="ordered">
      {items.map((it, i) => (
        <li key={it.id}>
          <span className="ordered-title">{it.title}{it.warning && <span className="sub"> · प्रकाशित नहीं है</span>}</span>
          <span className="ordered-actions">
            <button type="button" className="btn" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`${it.title} ऊपर करें`}>ऊपर</button>
            <button type="button" className="btn" disabled={disabled || i === items.length - 1} onClick={() => move(i, 1)} aria-label={`${it.title} नीचे करें`}>नीचे</button>
            <button type="button" className="btn" disabled={disabled} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`${it.title} हटाएँ`}>हटाएँ</button>
          </span>
        </li>
      ))}
    </ol>
  );
}
