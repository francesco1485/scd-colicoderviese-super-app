import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import {
  DELETED_ITEMS,
  DELETION_DAYS,
  DELETION_MESSAGE,
  DELETION_PATH,
  KEPT_ITEMS,
  deletionMailto,
  isDelivered,
  type DeletionOutcome,
} from "@/lib/account-deletion";
import { requestMyAccountDeletion } from "@/lib/account-deletion.functions";

/**
 * "Elimina account" in La mia SCD (Google Play / Apple 5.1.1(v)). Two steps: the button opens a confirmation that says
 * what is deleted and what the club keeps; confirming files a request tied to the signed-in user in the Secretariat
 * queue (r96). Nothing is deleted from the client.
 */
export function DeleteAccountCard({ email }: { email: string }) {
  const send = useServerFn(requestMyAccountDeletion);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<DeletionOutcome | null>(null);
  const close = useCallback(() => setOpen(false), []);

  async function confirm() {
    setBusy(true);
    try {
      const r = await send({ data: {} });
      setOutcome(r.outcome);
      if (isDelivered(r.outcome)) setOpen(false);
    } catch {
      setOutcome("ERROR");
    } finally {
      setBusy(false);
    }
  }

  const delivered = outcome !== null && isDelivered(outcome);
  return (
    <section
      aria-labelledby="account-t"
      className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
      data-testid="account-card"
    >
      <h2
        id="account-t"
        className="mb-1 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]"
      >
        IL MIO ACCOUNT
      </h2>
      <p className="m-0 break-all text-[15px] font-semibold">{email}</p>
      {delivered ? (
        <p
          role="status"
          className="mb-0 mt-2.5 flex items-start gap-2 rounded-[12px] bg-[#ecf8f0] p-3 text-[14px] text-[#145a32]"
          data-testid="account-delete-done"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {DELETION_MESSAGE[outcome]}
        </p>
      ) : (
        <>
          <p className="mb-2.5 mt-1 text-[14px] text-[#5a6b85]">
            Puoi chiedere di eliminare l'account e i tuoi dati. Lo fa la
            segreteria entro {DELETION_DAYS} giorni.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="scd-focus inline-flex h-11 items-center gap-2 rounded-[12px] border-2 border-[#b42318] px-4 text-[15px] font-bold text-[#b42318]"
            data-testid="account-delete-button"
          >
            <Trash2 className="size-5" aria-hidden="true" /> Elimina account
          </button>
        </>
      )}
      {open && (
        <Dialog
          title="Eliminare il tuo account?"
          onClose={close}
          testId="account-delete-dialog"
        >
          <p className="mb-2 mt-3 text-[15px]">
            La segreteria controlla la richiesta ed elimina:
          </p>
          <ul className="m-0 list-disc space-y-0.5 pl-5 text-[14px]">
            {DELETED_ITEMS.map((i) => (
              <li key={i.title}>
                <b>{i.title}</b>
              </li>
            ))}
          </ul>
          <p className="mb-1 mt-3 text-[14px] text-[#5a6b85]">
            Per legge restano solo:{" "}
            {KEPT_ITEMS.map((i) => i.title.toLowerCase()).join(", ")}.{" "}
            <a
              href={DELETION_PATH}
              className="font-semibold text-[#1e7fd8] underline"
            >
              Dettagli
            </a>
          </p>
          {outcome && !isDelivered(outcome) && (
            <p
              role="alert"
              className="mb-0 mt-3 rounded-[12px] bg-[#fff8ec] p-3 text-[14px]"
            >
              {DELETION_MESSAGE[outcome]}{" "}
              {outcome === "ERROR" && (
                <a
                  href={deletionMailto({ email })}
                  className="font-semibold text-[#1e7fd8] underline"
                >
                  Scrivi l'e-mail già pronta
                </a>
              )}
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={close}
              className="scd-focus inline-flex h-12 items-center justify-center rounded-[12px] border-2 border-[#0b2a5b] font-bold text-[#0b2a5b]"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#b42318] font-bold text-white disabled:opacity-60"
              data-testid="account-delete-confirm"
            >
              <Trash2 className="size-5" aria-hidden="true" />
              {busy ? "Invio…" : "Sì, chiedi l'eliminazione"}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
