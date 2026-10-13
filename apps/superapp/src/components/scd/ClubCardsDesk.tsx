/**
 * Club House · Card SQUBY desk (Direzione 13/10/2026): the three card web links with copy and printable QR codes, the
 * SQUBY back office, the cash-desk procedure and the licence check. Staff only (rendered inside the Club House work
 * area). SQUBY stays the wallet authority: nothing here moves money or stores personal data.
 */
import { Check, Copy, ExternalLink, Printer, QrCode, ShieldAlert } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Card } from "@/components/scd/interior-ui";
import { INTERIM_ADDRESS } from "@/lib/install-link";
import { CLUB_CARDS, clubCardUrl, codeRangeText, itDate, licenseView, validateClubCards, type ClubCardId } from "@/lib/club-cards";

const FALLBACK_ORIGIN = `https://${INTERIM_ADDRESS}`;

function useOrigin(): string {
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  return origin;
}

function useQrSvg(text: string): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#062a52", light: "#ffffff" } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [text]);
  return svg;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        } catch {
          setDone(false);
        }
      }}
      className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold text-[#0b2a5b] hover:bg-[#f4f7fb]"
      aria-label={`${label}: copia il link`}
    >
      {done ? <Check className="size-4 text-[#1a7f45]" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {done ? "Copiato" : "Copia"}
    </button>
  );
}

function CardLinkRow({ id, origin }: { id: ClubCardId; origin: string }) {
  const tier = CLUB_CARDS.tiers.find((t) => t.id === id)!;
  const url = clubCardUrl(origin, id);
  const svg = useQrSvg(url);
  const range = codeRangeText(tier);
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-t border-[var(--in-line)] py-3 first:border-t-0" data-testid={`desk-card-${id}`}>
      <div className="size-[88px] overflow-hidden rounded-[10px] border border-[var(--in-line)] bg-white p-1" aria-label={`Codice QR della card ${tier.label}`} role="img">
        {svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <QrCode className="m-auto mt-6 size-8 text-[#8aa0bf]" aria-hidden="true" />}
      </div>
      <div className="grid min-w-0 gap-1.5">
        <b className="text-[16px] text-[#0b1e3a]">Card {tier.label}</b>
        <a href={url} target="_blank" rel="noreferrer" className="scd-focus truncate text-[14px] font-semibold text-[#1556c4] underline-offset-2 hover:underline">
          {url.replace(/^https?:\/\//, "")}
        </a>
        <span className="text-[13px] text-[var(--in-sub)]">
          {range ? `Codici card: ${range}` : tier.codeRule ?? "Codice assegnato dalla segreteria"} · gruppo SQUBY «CARD - {tier.label.toUpperCase()}»
        </span>
        <span className="flex flex-wrap gap-2">
          <CopyButton text={url} label={`Card ${tier.label}`} />
        </span>
      </div>
    </li>
  );
}

export function ClubCardsDesk() {
  const origin = useOrigin();
  const lic = licenseView();
  const problems = validateClubCards();
  const sq = CLUB_CARDS.squby;
  return (
    <Card
      id="ch-card-squby"
      title="Card 2026/27 · SQUBY"
      sub="Un link per ogni card da condividere o stampare. Attivazione, ricariche e saldo si gestiscono in SQUBY, qui alla Club House."
      aside={
        <button
          type="button"
          onClick={() => window.print()}
          className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold text-[#0b2a5b]"
        >
          <Printer className="size-4" aria-hidden="true" />
          Stampa QR
        </button>
      }
    >
      <div className="grid gap-4 px-4 pb-4 sm:px-[18px]" data-testid="club-cards-desk">
        <ul className="m-0 list-none p-0">
          {CLUB_CARDS.tiers.map((t) => (
            <CardLinkRow key={t.id} id={t.id} origin={origin} />
          ))}
        </ul>

        <div className="grid gap-2 rounded-[12px] bg-[#f4f7fb] p-3">
          <b className="text-[15px] text-[#0b1e3a]">SQUBY · {sq.entity}</b>
          <span className="text-[13.5px] leading-snug text-[var(--in-sub)]">{sq.badge}.</span>
          <span className="flex flex-wrap gap-2">
            <a
              href={sq.adminUrl}
              target="_blank"
              rel="noreferrer"
              className="scd-action scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-[14px] font-bold"
            >
              Apri SQUBY
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            {!sq.enrollmentPublic && <CopyButton text={sq.enrollmentUrl} label="Modulo di iscrizione SQUBY" />}
          </span>
          {!sq.enrollmentPublic && (
            <span className="text-[13px] leading-snug text-[var(--in-sub)]">
              Il modulo di iscrizione SQUBY si dà solo di persona, a chi attiva la card: non è pubblicato sulle pagine delle card.
            </span>
          )}
          <span
            className={`flex gap-2 rounded-[10px] px-3 py-2 text-[13.5px] leading-snug ${lic.free < 50 ? "bg-[#fff1f3] text-[#7a0f22]" : "bg-white text-[#24364f]"}`}
            data-testid="squby-license"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Licenze partecipanti: {lic.used} usate su {lic.max}, scadenza {itDate(lic.expires)}.{" "}
            {lic.pilotFits ? "Bastano per il pilot (2 + 2 + 2)." : "Non bastano nemmeno per il pilot."} Per tutti i tesserati servono più licenze: da verificare prima
            dell'import.
          </span>
        </div>

        <div className="grid gap-2">
          <b className="text-[15px] text-[#0b1e3a]">Procedura di cassa</b>
          <ol className="m-0 grid gap-1.5 pl-5 text-[14px] leading-snug text-[#24364f]">
            {CLUB_CARDS.clubHouseProcedure.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <ul className="m-0 grid list-none gap-1 p-0 text-[13px] leading-snug text-[var(--in-sub)]">
            {CLUB_CARDS.privacy.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>

        {problems.length > 0 && (
          <p className="m-0 rounded-[10px] bg-[#fff1f3] px-3 py-2 text-[13px] text-[#7a0f22]" role="alert">
            Configurazione card da correggere: {problems.join("; ")}.
          </p>
        )}
      </div>
    </Card>
  );
}
