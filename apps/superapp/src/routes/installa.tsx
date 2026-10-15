import { createFileRoute } from "@tanstack/react-router";
import { Bell, CalendarDays, Check, Copy, MessageCircle, Share2, Shield, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { InstallButton } from "@/components/scd/InstallButton";
import { SEGRETERIA_WHATSAPP, displayAddress, installUrl } from "@/lib/install-link";

/**
 * "Installa l'app": the one page to share everywhere (posters, WhatsApp groups, e-mails) until the store apps exist
 * (UD-071). Public, no personal data. Layout from the board "installa-v2" approved by Francesco 15/10/2026 18:52
 * ("va bene procedi"): night-blue lake hero with the official crest, one action card (install), "Cosa trovi",
 * Iride (the AI Segreteria on WhatsApp, UD-155) and the QR code, which comes first on a computer (people scan it with
 * the phone) and last on a phone.
 */
export const Route = createFileRoute("/installa")({
  head: () => ({
    meta: [
      { title: "Installa l'app | S.C.D. ColicoDerviese" },
      { name: "description", content: "L'app ufficiale della S.C.D. ColicoDerviese sul tuo telefono in 30 secondi, su iPhone e Android, senza store." },
    ],
  }),
  component: Installa,
});

function Installa() {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  useEffect(() => {
    QRCode.toString(installUrl(), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#071d44", light: "#ffffff" } })
      .then(setQrSvg)
      .catch(() => setQrSvg(null));
  }, []);

  const address = displayAddress();
  const link = installUrl();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "App S.C.D. ColicoDerviese", text: "L'app ufficiale della S.C.D. ColicoDerviese", url: link });
      } catch {
        /* the person closed the share sheet */
      }
    } else {
      await copy();
    }
  }

  return (
    <main className="bg-[#071d44] text-white lg:grid lg:min-h-[calc(100vh-64px)] lg:grid-cols-[1.15fr_0.85fr]" data-testid="installa">
      <header
        className="relative overflow-hidden px-5 pb-[120px] pt-10 lg:flex lg:items-center lg:px-16 lg:py-16"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(7,29,68,0.55) 0%, rgba(7,29,68,0.82) 55%, #071d44 100%), url(/media/scd/hero-colico.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-[620px] text-center lg:mx-0 lg:text-left">
          <img
            src="/media/brand/logo-scd.webp"
            alt="Stemma S.C.D. ColicoDerviese"
            width={480}
            height={628}
            className="mx-auto mb-3.5 h-auto w-[118px] drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] lg:mx-0 lg:mb-6 lg:w-[132px]"
          />
          <h1 className="m-0 font-[family-name:var(--font-brand)] text-[52px] font-normal uppercase leading-[0.95] tracking-[0.01em] [text-wrap:balance] lg:text-[96px]">
            L'app del <span className="text-[var(--scd-yellow)]">club</span>
            <br />
            sul tuo telefono
          </h1>
          <p className="m-0 mt-3.5 font-[family-name:var(--font-uv-script)] text-[24px] lg:text-[30px]">Uniti si cresce sempre!</p>
          <p className="mx-auto mt-3 max-w-[460px] text-[16px] leading-relaxed text-[#dbe6f6] lg:mx-0 lg:text-[19px]">
            Gare, squadre e convocazioni in tasca. E la segreteria che risponde a ogni ora.
          </p>
        </div>
      </header>

      <div className="relative -mt-24 flex flex-col gap-7 px-4 pb-10 lg:mt-0 lg:justify-center lg:gap-6 lg:bg-[linear-gradient(180deg,#0a2552,#071d44)] lg:px-14 lg:py-16">
        <InstallButton />

        <section aria-labelledby="trovi-t">
          <h2 id="trovi-t" className="m-0 mb-3.5 font-[family-name:var(--font-display)] text-[24px] font-extrabold uppercase tracking-[0.02em]">
            Cosa <span className="text-[var(--scd-yellow)]">trovi</span>
          </h2>
          <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
            <Feat icon={<CalendarDays className="size-[26px]" aria-hidden="true" />} text="Calendario gare" />
            <Feat icon={<Shield className="size-[26px]" aria-hidden="true" />} text="Squadre" />
            <Feat icon={<Bell className="size-[26px]" aria-hidden="true" />} text="Avvisi e convocazioni" />
            <Feat icon={<MessageCircle className="size-[26px]" aria-hidden="true" />} text="Segreteria 24/7" />
          </ul>
        </section>

        <section
          aria-labelledby="iride-t"
          className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3.5 rounded-[22px] border border-white/10 bg-[linear-gradient(120deg,#0e3a7a,#0b2a5b)] p-4"
          data-testid="install-iride"
        >
          {/* Iride's avatar file belongs to the cloud chat (personaggi, UD-139): the official crest stands in until that file
              is on staging, then this image switches to /media/cast/iride/ in the same change that registers it. */}
          <img
            src="/media/brand/logo-scd.webp"
            alt="Stemma S.C.D. ColicoDerviese"
            width={480}
            height={628}
            loading="lazy"
            className="size-[76px] rounded-full border-[3px] border-[var(--scd-yellow)] bg-white object-contain p-2"
          />
          <div className="min-w-0">
            <span className="font-[family-name:var(--font-display)] text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--scd-yellow)]">
              Segreteria AI · WhatsApp
            </span>
            <h2 id="iride-t" className="m-0 mb-1 mt-0.5 font-[family-name:var(--font-display)] text-[22px] font-extrabold uppercase leading-none">
              Iride risponde 24/7
            </h2>
            <p className="m-0 text-[13.5px] leading-snug text-[#dbe6f6]">
              Gare, iscrizioni, richieste. <span className="whitespace-nowrap select-all">{SEGRETERIA_WHATSAPP.display}</span>
            </p>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <a
              href="/iride.vcf"
              download="Iride-Segreteria-ColicoDerviese.vcf"
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[var(--scd-yellow)] text-[15px] font-bold text-[#0b2a5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              data-testid="iride-vcard"
            >
              <UserPlus className="size-[18px]" aria-hidden="true" /> Salva il contatto
            </a>
            <a
              href={SEGRETERIA_WHATSAPP.chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-2 border-white/35 text-[15px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              data-testid="iride-whatsapp"
            >
              <MessageCircle className="size-[18px]" aria-hidden="true" /> Scrivi
            </a>
          </div>
        </section>

        <section
          aria-labelledby="qr-t"
          className="flex items-center gap-3.5 rounded-[22px] bg-white p-3.5 text-[#0b2a5b] lg:order-first lg:p-5"
          data-testid="install-qr"
        >
          <div className="size-24 shrink-0 lg:size-[150px]" role="img" aria-label={`Codice QR per aprire ${link}`}>
            {qrSvg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
          </div>
          <div className="min-w-0">
            <h2 id="qr-t" className="m-0 font-[family-name:var(--font-display)] text-[20px] font-extrabold uppercase leading-none lg:text-[26px]">
              Inquadra con il telefono
            </h2>
            <p className="m-0 mt-1 text-[13.5px] text-[#4a5d7e]">Apri la fotocamera e punta il codice: l'app si installa da lì.</p>
            <p className="m-0 mt-1 break-all text-[15px] font-bold text-[#1556c4] select-all" data-testid="install-address">
              {address}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-[#eef3f9] px-3 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2">
                <Share2 className="size-4" aria-hidden="true" /> Condividi
              </button>
              <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-[#eef3f9] px-3 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2">
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? "Copiato" : "Copia"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feat({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="text-center">
      <span className="mx-auto mb-2 grid size-[58px] place-items-center rounded-full border-2 border-[var(--scd-yellow)] bg-[rgba(255,214,0,0.12)] text-[var(--scd-yellow)]">
        {icon}
      </span>
      <span className="block text-[13px] font-semibold leading-tight text-[#dbe6f6]">{text}</span>
    </li>
  );
}
