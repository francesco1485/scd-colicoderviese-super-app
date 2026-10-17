/**
 * Public face of the r115 register: Club House hours, price list and group menus (on /impianti), convenzioni and the
 * card additions (on /card and /card/$tipo). Only PUBLISHED rows inside their validity reach these components; when
 * nothing is entered, or the register is not active, the pages say "da confermare". Nothing is invented: no price,
 * partner or hour that the club did not enter. No personal data.
 */
import { Coffee, ExternalLink, Handshake, Sparkles } from "lucide-react";

import {
  CARD_LABEL,
  CATEGORY_LABEL,
  SITE_LABEL,
  TO_CONFIRM,
  cardAdditions,
  clubHousePublic,
  convenzioniFor,
  priceText,
  validityText,
  type CatalogEntry,
} from "@/lib/club-catalog";
import type { ClubCardId } from "@/lib/club-cards";

const H2 = "m-0 flex items-center gap-2 text-[19px] font-bold text-[#0b2a5b]";
const SOFT = "text-[14.5px] leading-snug text-[#3e5272]";

function ToConfirm({ children }: { children: string }) {
  return <p className={`m-0 rounded-xl border border-dashed border-[#b9d5ef] bg-[#f7fbff] px-3.5 py-3 ${SOFT}`}>{children}</p>;
}

/** Club House of Colico and Dervio: hours per site, price list by category, group menus. */
export function ClubHousePublicCard({ entries }: { entries: readonly CatalogEntry[] }) {
  const v = clubHousePublic(entries);
  return (
    <section aria-labelledby="clubhouse-pub-t" className="scd-card grid gap-4 p-4 sm:p-5" data-testid="clubhouse-public">
      <h2 id="clubhouse-pub-t" className={H2}>
        <Coffee className="size-5 text-[#1556c4]" aria-hidden="true" />
        Club House
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["COLICO", "DERVIO"] as const).map((site) => (
          <div key={site} className="grid content-start gap-1.5 rounded-xl bg-[#e9f2fb] p-3.5" data-testid={`clubhouse-hours-${site.toLowerCase()}`}>
            <b className="text-[16px] text-[#0b1e3a]">Orari · {SITE_LABEL[site]}</b>
            {v.hours[site].length === 0 ? (
              <span className={SOFT}>Orari {TO_CONFIRM}.</span>
            ) : (
              <ul className="m-0 grid list-none gap-1 p-0">
                {v.hours[site].map((h) => (
                  <li key={h.id} className={SOFT}>
                    <b className="text-[#0b1e3a]">{h.days}</b> {h.opens}–{h.closes}
                    {h.title && <span className="text-[#5d6f8c]"> · {h.title}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <h3 className="m-0 text-[16px] font-bold text-[#0b1e3a]">Listino</h3>
        {v.listino.length === 0 ? (
          <ToConfirm>{`Listino ${TO_CONFIRM}: i prezzi compariranno quando la Club House li avrà inseriti.`}</ToConfirm>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {v.listino.map((g) => (
              <div key={g.category} className="grid content-start gap-1">
                <b className="text-[14px] uppercase tracking-[0.04em] text-[#1556c4]">{g.label}</b>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {g.items.map((i) => (
                    <li key={i.id} className={`flex items-baseline justify-between gap-3 border-b border-[#edf1f7] pb-1 ${SOFT}`}>
                      <span className="min-w-0">
                        {i.title}
                        {i.site && <span className="text-[#5d6f8c]"> · {SITE_LABEL[i.site]}</span>}
                      </span>
                      <span className={i.priceCents === null ? "text-[13px] text-[#5d6f8c]" : "font-bold text-[#0b1e3a]"}>{priceText(i.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <h3 className="m-0 text-[16px] font-bold text-[#0b1e3a]">Menu per gruppi e squadre</h3>
        {v.menus.length === 0 ? (
          <ToConfirm>{`Menu per gruppi ${TO_CONFIRM}.`}</ToConfirm>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {v.menus.map((m) => (
              <li key={m.id} className="grid gap-1 rounded-xl border border-[#dbe3ee] p-3">
                <b className="text-[15.5px] text-[#0b1e3a]">{m.title}</b>
                {m.body && <span className={SOFT}>{m.body}</span>}
                <span className="text-[14px] font-semibold text-[#0b2a5b]">
                  {m.site ? `${SITE_LABEL[m.site]} · ` : ""}
                  {priceText(m.priceCents)}
                  {m.priceCents !== null && " a persona"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Convenzioni with the partners (optionally only those a card gives access to). */
export function ConvenzioniPublicCard({ entries, card }: { entries: readonly CatalogEntry[]; card?: ClubCardId }) {
  const list = convenzioniFor(entries, card);
  return (
    <section aria-labelledby="convenzioni-pub-t" className="scd-card grid gap-3 p-4 sm:p-5" data-testid="convenzioni-public">
      <h2 id="convenzioni-pub-t" className={H2}>
        <Handshake className="size-5 text-[#1556c4]" aria-hidden="true" />
        Convenzioni{card ? ` con la card ${CARD_LABEL[card]}` : ""}
      </h2>
      {list.length === 0 ? (
        <ToConfirm>{`Convenzioni ${TO_CONFIRM}: compariranno qui quando i partner le avranno confermate.`}</ToConfirm>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {list.map((c) => (
            <li key={c.id} className="grid content-start gap-1.5 rounded-xl border border-[#dbe3ee] p-3.5">
              <span className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#1556c4]">{CATEGORY_LABEL[c.category ?? ""] ?? "Convenzione"}</span>
              <b className="text-[16px] leading-tight text-[#0b1e3a]">{c.title}</b>
              {c.body && <span className={SOFT}>{c.body}</span>}
              {c.howTo && (
                <span className={SOFT}>
                  <b className="text-[#0b1e3a]">Come usarla.</b> {c.howTo}
                </span>
              )}
              <span className="text-[13.5px] text-[#5d6f8c]">
                {c.cards.length ? `Con la card ${c.cards.map((x) => CARD_LABEL[x]).join(", ")}` : "Per tutti"} · {validityText(c)}
              </span>
              {c.linkUrl && (
                <a href={c.linkUrl} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex min-h-11 w-fit items-center gap-1.5 text-[15px] font-semibold text-[#1556c4] underline">
                  Sito del partner
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Benefits, rules and other card types entered by Direzione and Segreteria; nothing renders when nothing is entered. */
export function CardAdditionsCard({ entries, card }: { entries: readonly CatalogEntry[]; card?: ClubCardId }) {
  const a = cardAdditions(entries, card);
  if (a.benefits.length + a.rules.length + a.types.length === 0) return null;
  return (
    <section aria-labelledby="card-add-t" className="scd-card grid gap-3 p-4 sm:p-5" data-testid="card-additions">
      <h2 id="card-add-t" className={H2}>
        <Sparkles className="size-5 text-[#1556c4]" aria-hidden="true" />
        {card ? "Altri vantaggi e regole" : "Novità delle card"}
      </h2>
      {a.benefits.length > 0 && (
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {a.benefits.map((b) => (
            <li key={b.id} className={SOFT}>
              <b className="text-[#0b1e3a]">{b.title}</b>
              {b.body && <> — {b.body}</>}
              {!card && <span className="text-[#5d6f8c]"> · card {b.cards.map((x) => CARD_LABEL[x]).join(", ")}</span>}
            </li>
          ))}
        </ul>
      )}
      {a.rules.length > 0 && (
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {a.rules.map((r) => (
            <li key={r.id} className={SOFT}>
              <b className="text-[#0b1e3a]">{r.title}.</b> {r.body}
            </li>
          ))}
        </ul>
      )}
      {a.types.length > 0 && (
        <div className="grid gap-2">
          <h3 className="m-0 text-[16px] font-bold text-[#0b1e3a]">Altre tessere del club</h3>
          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
            {a.types.map((t) => (
              <li key={t.id} className="grid gap-1 rounded-xl border border-[#dbe3ee] p-3">
                <b className="text-[15.5px] text-[#0b1e3a]">{t.title}</b>
                {t.body && <span className={SOFT}>Per chi: {t.body}</span>}
                {t.howTo && <span className={SOFT}>Come si ottiene: {t.howTo}</span>}
                <span className="text-[13.5px] text-[#5d6f8c]">{t.priceCents === null ? `Costo ${TO_CONFIRM}` : `Costo ${priceText(t.priceCents)}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
