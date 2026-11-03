'use client';

import { useState } from 'react';
import { DESIGN_REVIEW } from '@/lib/routes';
import { SafeLink } from './SafeLink';

/**
 * The idea: "अपना मंच" (our stage) becomes the fixed half-screen stage.
 * Desktop: the stage stays in view while the reading column scrolls, and shows the piece the reader is
 * pointing at. Without script, or on a phone, each entry shows its own opening lines inline, so nothing
 * depends on the stage.
 */
export interface StagePick { slug: string; title: string; type: string; author: string; lines: string[] }

export function StageHome({
  picks, lead, heading, devLead, submitOpen,
}: { picks: StagePick[]; lead: string; heading: string; devLead?: boolean; submitOpen?: boolean }) {
  const [active, setActive] = useState(0);
  const current = picks[active] ?? picks[0];

  return (
    <div className="stage-layout">
      <aside className="stage" aria-label="चयनित रचना">
        <p className="stage-word" aria-hidden="true">मंच</p>
        <div className="stage-inner" key={current?.slug ?? 'none'}>
          {current ? (
            <>
              <p className="stage-title">{current.title}</p>
              <p className="stage-lines">
                {current.lines.map((l, i) => (
                  <span key={i}>
                    {l}
                    <br />
                  </span>
                ))}
              </p>
              <p className="stage-by">{current.type} · {current.author}</p>
              <p><SafeLink className="stage-read" href={`/rachna/${current.slug}`}>पूरी रचना पढ़ें</SafeLink></p>
            </>
          ) : null}
        </div>
      </aside>

      <div className="sheet">
        <section className="sheet-hero" aria-labelledby="h1">
          <h1 id="h1">अपनी बात — अपना मंच</h1>
          <p className="lead">{lead}</p>
          {(submitOpen || DESIGN_REVIEW) && (
            <p>
              <SafeLink className="button" href="/rachna-bhejein">अपनी रचना भेजें</SafeLink>
            </p>
          )}
          {devLead && <p className="dev-note" lang="en">DEV DATA — sample sentence for the owner to confirm</p>}
        </section>

        <section className="picks" aria-labelledby="picks-h">
          <h2 id="picks-h">{heading}</h2>
          <ol className="pick-list">
            {picks.map((p, i) => (
              <li
                key={p.slug}
                className="pick"
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
              >
                <h3 className="pick-title">
                  <button
                    type="button"
                    aria-pressed={i === active}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                  >
                    {p.title}
                  </button>
                </h3>
                <p className="pick-meta">
                  {p.type} · {p.author}
                </p>
                <p className="pick-lines">{p.lines.join(' / ')}</p>
                <p className="pick-more"><SafeLink href={`/rachna/${p.slug}`}>पूरी रचना पढ़ें</SafeLink></p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
