import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Phone, PhoneOff, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { consentLabel, groupStaff, telHref, type StaffDirectory, type StaffEntry, type StaffMe } from "@/lib/staff-directory";
import { getStaffDirectory, setMyPhoneShare, type DirectoryStatus } from "@/lib/staff-directory.functions";

/**
 * Rubrica staff (UD-167): one list for the gestionale page and the family card, from scd_staff_directory (r141).
 * The page renders only what the database returned: a number appears only when the person shared it and the caller
 * may see it. No names live in this file.
 */

export function DirectoryStatusNote({ status }: { status: DirectoryStatus }) {
  if (status === "not-applied") {
    return (
      <EmptyState title="Rubrica non ancora attiva">
        La attiva la Direzione con l'aggiornamento del database r141. Intanto i contatti si chiedono alla Segreteria.
      </EmptyState>
    );
  }
  if (status === "signed-out") {
    return (
      <EmptyState title="Serve l'accesso" action={<Link to="/accedi" className="scd-focus font-semibold text-[var(--in-info)] underline-offset-4 hover:underline">Entra</Link>}>
        La rubrica dello staff si vede solo con l'account della società.
      </EmptyState>
    );
  }
  return <EmptyState title="Rubrica non disponibile">Lettura non riuscita dal database del club: riprova più tardi.</EmptyState>;
}

function PhoneCell({ entry }: { entry: StaffEntry }) {
  const href = telHref(entry.phone);
  if (entry.phone && href) {
    return (
      <a
        href={href}
        className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--in-line)] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-info)]"
        data-staff-phone="shared"
      >
        <Phone className="size-4" aria-hidden="true" />
        {entry.phone}
      </a>
    );
  }
  return (
    <Chip tone="mute">
      <PhoneOff className="size-3.5" aria-hidden="true" />
      {entry.phoneState === "NO_NUMBER" ? "numero non registrato" : "numero non condiviso"}
    </Chip>
  );
}

export function StaffDirectoryList({ directory, emptyText }: { directory: StaffDirectory; emptyText: string }) {
  const groups = groupStaff(directory.people);
  if (groups.length === 0) return <EmptyState title="Nessun contatto da mostrare">{emptyText}</EmptyState>;
  const someHidden = directory.people.some((p) => !p.phone);
  return (
    <div className="flex flex-col gap-3" data-testid="staff-directory">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.title} className="rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)]">
          <h3 className="m-0 border-b border-[var(--in-line)] px-4 py-2.5 text-[16px] font-bold sm:px-[18px]">{g.title}</h3>
          <ul className="m-0 list-none p-0">
            {g.rows.map(({ entry, roles }) => (
              <li key={entry.personId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--in-line)] px-4 py-3 first:border-t-0 sm:px-[18px]">
                <span className="flex min-w-0 flex-1 basis-[200px] items-start gap-2.5">
                  <UserRound className="mt-0.5 size-[18px] flex-none text-[var(--in-sub)]" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0">
                    <b className="block text-[15.5px] leading-tight">{entry.name}</b>
                    {roles.map((r) => (
                      <span key={`${r.label}-${r.teamCode ?? r.area ?? ""}`} className="block text-[14px] leading-snug text-[var(--in-sub)]">
                        {r.label}
                        {r.needsReview && <Chip tone="warn" className="ml-1.5 align-middle">da confermare</Chip>}
                      </span>
                    ))}
                  </span>
                </span>
                <PhoneCell entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {someHidden && (
        <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">
          Chi non ha condiviso il numero si raggiunge tramite la Segreteria, che inoltra il messaggio:{" "}
          <Link to="/contatti" className="scd-focus font-semibold text-[var(--in-info)] underline-offset-4 hover:underline">
            scrivi alla Segreteria
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/** The staff member's own answer (rule 3): two plain buttons, default "no" until answered. */
function PhoneShareControls({ me }: { me: StaffMe }) {
  const save = useServerFn(setMyPhoneShare);
  const [consent, setConsent] = useState<boolean | null>(me.consent);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const choose = async (share: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({ data: { share } });
      if (r.ok) setConsent(share);
      setMsg(r.message);
    } catch {
      setMsg("Salvataggio non riuscito, riprova.");
    } finally {
      setBusy(false);
    }
  };
  const btn = (active: boolean) =>
    `scd-focus inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-[15px] font-semibold disabled:opacity-60 ${
      active ? "border-[#1e7fd8] bg-[#1e7fd8] text-white" : "border-[#c9dbef] bg-white text-[#0b1e3a]"
    }`;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[14.5px] leading-snug text-[#0b1e3a]" data-testid="phone-share-state">
        {consentLabel({ ...me, consent })}
      </p>
      {!me.hasPhone && (
        <p className="m-0 text-[14px] leading-snug text-[#3e5272]">Il tuo numero non è ancora nella tua scheda: per aggiungerlo scrivi alla Segreteria.</p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Condividi il mio numero">
        <button type="button" className={btn(consent === true)} aria-pressed={consent === true} disabled={busy} onClick={() => void choose(true)}>
          Sì, condividi
        </button>
        <button type="button" className={btn(consent !== true)} aria-pressed={consent !== true} disabled={busy} onClick={() => void choose(false)}>
          No, passa dalla Segreteria
        </button>
      </div>
      {msg && (
        <p role="status" className="m-0 text-[14px] font-semibold leading-snug text-[#0b1e3a]">
          {msg}
        </p>
      )}
      <p className="m-0 text-[13px] leading-snug text-[#3e5272]">Puoi cambiare idea quando vuoi: ogni scelta resta registrata con data e ora.</p>
    </div>
  );
}

const SHARE_SUB = "Vuoi che le famiglie e lo staff delle tue squadre vedano il tuo numero nella Rubrica e da Iride?";

/** Gestionale version (Rubrica staff page). */
export function PhoneShareCard({ me }: { me: StaffMe }) {
  return (
    <Card id="rubrica-mio-numero" title="Il mio numero" sub={SHARE_SUB}>
      <div className="px-4 pb-4 sm:px-[18px]">
        <PhoneShareControls me={me} />
      </div>
    </Card>
  );
}

/** La mia SCD version: loads itself after the page; hidden for anybody who is not an adult staff member. */
export function MyNumberCard() {
  const load = useServerFn(getStaffDirectory);
  const [me, setMe] = useState<StaffMe | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((v) => {
        if (alive) setMe(v.status === "live" ? (v.directory?.me ?? null) : null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [load]);
  if (!me) return null;
  return (
    <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]" data-testid="my-number" aria-labelledby="my-number-title">
      <h2 id="my-number-title" className="mb-1 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
        IL MIO NUMERO NELLA RUBRICA STAFF
      </h2>
      <p className="mb-3 mt-0 text-[14.5px] leading-snug text-[#3e5272]">{SHARE_SUB}</p>
      <PhoneShareControls me={me} />
    </section>
  );
}

/** Compact line used by Iride's tips and the family card header. */
export function staffSummary(d: StaffDirectory): string {
  const n = d.people.length;
  const shared = d.people.filter((p) => p.phone).length;
  return `${n} ${n === 1 ? "persona" : "persone"}, ${shared} con il numero condiviso`;
}

