import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Download, MessageCircle, Share2, Smartphone, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { InstallButton } from "@/components/scd/InstallButton";
import { OFFICIAL_ADDRESS, displayAddress, installUrl } from "@/lib/install-link";

/**
 * "Installa l'app": the one page to share everywhere (posters, WhatsApp groups, e-mails) until the
 * store apps exist (UD-071). Public, no personal data. The QR code points back to this page.
 */
export const Route = createFileRoute("/installa")({
  head: () => ({
    meta: [
      { title: "Installa l'app | S.C.D. ColicoDerviese" },
      { name: "description", content: "Come mettere l'app ufficiale della S.C.D. ColicoDerviese sul telefono, su iPhone e Android, in meno di un minuto." },
    ],
  }),
  component: Installa,
});

function Installa() {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toString(installUrl(), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#062a52", light: "#ffffff" } })
      .then(setQrSvg)
      .catch(() => setQrSvg(null));
  }, []);

  const address = displayAddress();
  const link = installUrl();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10" data-testid="installa">
      <header>
        <h1 className="m-0 text-[34px] font-bold leading-tight">Installa l'app</h1>
        <p className="mt-2 text-[16px] leading-relaxed">
          Un minuto e l'app della società è sul tuo telefono, con lo stemma, senza passare dagli store.
        </p>
        <div className="mt-4">
          <InstallButton />
        </div>
      </header>

      <section aria-labelledby="iride-t" className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center sm:p-6" data-testid="install-iride">
        <img src="/media/cast/iride/iride-avatar-256.webp" alt="Iride, l'assistente AI della segreteria" width={96} height={96} className="size-24 rounded-full object-cover" loading="lazy" />
        <div className="min-w-0">
          <h2 id="iride-t" className="m-0 text-[22px] font-bold">Salva Iride, la segreteria 24/7</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
            Iride è l'assistente AI della segreteria: su WhatsApp risponde a ogni ora su gare, iscrizioni e richieste. Numero <b className="select-all text-foreground">+39 334 196 1321</b>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/iride.vcf" download="Iride-Segreteria-ColicoDerviese.vcf" className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white" data-testid="iride-vcard">
              <UserPlus className="size-4" aria-hidden="true" /> Salva il contatto
            </a>
            <a href="https://wa.me/393341961321?text=Ciao%20Iride!" target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-[15px] font-semibold" data-testid="iride-whatsapp">
              <MessageCircle className="size-4" aria-hidden="true" /> Scrivi su WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="link-t" className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center sm:p-6">
        <div className="min-w-0">
          <h2 id="link-t" className="m-0 text-[15px] font-semibold text-muted-foreground">L'indirizzo dell'app</h2>
          <p className="mt-1 break-all text-[26px] font-bold leading-tight text-[var(--scd-blue)] select-all" data-testid="install-address">{address}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--scd-yellow)] px-4 text-[15px] font-semibold text-[#062a52]">
              <Share2 className="size-4" aria-hidden="true" /> Condividi
            </button>
            <button type="button" onClick={copy} className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-[15px] font-semibold">
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Copiato" : "Copia il link"}
            </button>
          </div>
          <p className="mt-3 text-[13.5px] text-muted-foreground" aria-live="polite">
            Inquadra il codice con la fotocamera per aprire questa pagina dal telefono. Stampalo su locandine e bacheche.
          </p>
        </div>
        <figure className="m-0 justify-self-center">
          <div className="grid size-[200px] place-items-center rounded-xl border border-border bg-white p-2" role="img" aria-label={`Codice QR per aprire ${link}`}>
            {qrSvg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <span className="text-[13px] text-muted-foreground">Codice QR…</span>}
          </div>
        </figure>
      </section>

      <section aria-labelledby="ios-t" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="ios-t" className="m-0 flex items-center gap-2 text-[22px] font-bold"><Smartphone className="size-5" aria-hidden="true" /> iPhone e iPad</h2>
        <ol className="m-0 mt-3 grid list-decimal gap-2 pl-5 text-[15.5px] leading-relaxed marker:font-bold marker:text-[var(--scd-blue)]">
          <li>Apri l'indirizzo con <b>Safari</b>.</li>
          <li>Tocca il pulsante <b>Condividi</b> (il quadrato con la freccia verso l'alto).</li>
          <li>Scegli <b>Aggiungi alla schermata Home</b>, poi <b>Aggiungi</b>.</li>
          <li>Apri l'app dall'icona con lo stemma: da lì puoi attivare le notifiche delle convocazioni.</li>
        </ol>
      </section>

      <section aria-labelledby="android-t" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="android-t" className="m-0 flex items-center gap-2 text-[22px] font-bold"><Download className="size-5" aria-hidden="true" /> Android</h2>
        <ol className="m-0 mt-3 grid list-decimal gap-2 pl-5 text-[15.5px] leading-relaxed marker:font-bold marker:text-[var(--scd-blue)]">
          <li>Apri l'indirizzo con <b>Chrome</b>.</li>
          <li>Tocca <b>Installa app</b> nel messaggio in basso, oppure il menu ⋮ e poi <b>Installa app</b>.</li>
          <li>Conferma: l'icona con lo stemma compare tra le tue app.</li>
        </ol>
      </section>

      <p className="m-0 text-[14.5px] text-muted-foreground">
        Presto anche su Play Store e App Store, allo stesso indirizzo di sempre ({OFFICIAL_ADDRESS}). Cosa fare dopo: <Link to="/guida" className="underline">come funziona l'app</Link>.
      </p>
    </main>
  );
}
