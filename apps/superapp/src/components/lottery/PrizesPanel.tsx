import { Link } from "@tanstack/react-router";
import { Gift, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  checkPrize,
  formatEuro,
  PRIZE_CATEGORY_LABEL,
  PRIZE_ORIGIN_LABEL,
  prizeTotals,
  prizeVerdict,
  sortPrizes,
  TOMBOLA_PRIZES_CAP_CENTS,
  WITHHOLDING_RATE_PERCENT,
  type LotteryKind,
  type Prize,
  type PrizeCategory,
  type PrizeOrigin,
} from "@/lib/lottery";
import { SPONSORS, sponsorLabel } from "@/lib/sponsors";

import type { LotteryActions } from "./store";
import {
  btnGhostDanger,
  btnPrimary,
  btnSecondary,
  IntField,
  IssueList,
  MoneyField,
  ResultLine,
  SelectField,
  TextField,
  useAction,
} from "./ui";

const blankPrize = (rank: number): Prize => ({
  id: "",
  rank,
  description: "",
  category: "BENE",
  origin: "DONATO",
  sponsorSlug: null,
  donorText: "",
  declaredValueCents: null,
});

/** Only current sponsors with a certain name can be linked (their logo is in the asset registry). */
const LINKABLE = SPONSORS.filter((s) => s.name && s.nameVerified);

export function sponsorName(slug: string | null): string | null {
  if (!slug) return null;
  const s = SPONSORS.find((x) => x.slug === slug);
  return s ? sponsorLabel(s) : null;
}

export function PrizesPanel({
  prizes,
  kind,
  locked,
  actions,
  canWrite,
  hasLottery,
}: {
  prizes: Prize[];
  kind: LotteryKind;
  locked: boolean;
  actions: LotteryActions;
  canWrite: boolean;
  hasLottery: boolean;
}) {
  const [editing, setEditing] = useState<{
    prize: Prize;
    isNew: boolean;
  } | null>(null);
  const totals = prizeTotals(prizes, kind);
  const sorted = sortPrizes(prizes);
  const remove = useAction();
  const disabled = locked || !canWrite || !hasLottery;
  const nextRank = sorted.length
    ? Math.max(...sorted.map((p) => p.rank)) + 1
    : 1;

  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-prizes"
        title="4 · Premi"
        sub="Solo beni e servizi: niente denaro, metalli preziosi in barre, titoli, carte di credito o strumenti bancari. Valore dichiarato per la ritenuta."
        aside={
          <button
            type="button"
            className={btnPrimary}
            disabled={disabled}
            onClick={() =>
              setEditing({ prize: blankPrize(nextRank), isNew: true })
            }
            data-testid="lot-prize-add"
          >
            <Plus className="size-4" aria-hidden="true" /> Aggiungi premio
          </button>
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
          {!hasLottery && (
            <EmptyState title="Prima l'impostazione">
              Salva l'impostazione dell'iniziativa per aggiungere i premi.
            </EmptyState>
          )}
          {editing && (
            <PrizeForm
              key={editing.prize.id || "new"}
              initial={editing.prize}
              isNew={editing.isNew}
              others={prizes}
              actions={actions}
              onClose={() => setEditing(null)}
            />
          )}
          {hasLottery && sorted.length === 0 && !editing && (
            <EmptyState title="Nessun premio inserito">
              I premi arrivano dai partner o vengono acquistati: inseriscili man
              mano che la Direzione li conferma.
            </EmptyState>
          )}
          {sorted.length > 0 && (
            <ul className="m-0 list-none p-0" data-testid="lot-prize-list">
              {sorted.map((p) => {
                const v = prizeVerdict(p.description);
                const sponsor = sponsorName(p.sponsorSlug);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-start gap-3 border-t border-[var(--in-line)] py-3 first:border-t-0"
                  >
                    <span
                      className="flex size-10 flex-none items-center justify-center rounded-full bg-[var(--in-info-bg)] font-title text-[17px] font-black text-[var(--in-info)]"
                      aria-label={`${p.rank}° premio`}
                    >
                      {p.rank}°
                    </span>
                    <div className="min-w-0 flex-1 basis-[220px]">
                      <p className="m-0 text-[16px] font-bold leading-snug">
                        {p.description}
                      </p>
                      <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-[var(--in-sub)]">
                        <span>
                          {PRIZE_CATEGORY_LABEL[p.category]} ·{" "}
                          {PRIZE_ORIGIN_LABEL[p.origin]}
                        </span>
                        {sponsor ? (
                          <Link
                            to="/crm/partner/$partnerId"
                            params={{ partnerId: p.sponsorSlug! }}
                            className="font-semibold text-[var(--in-info)] underline-offset-2 hover:underline"
                          >
                            {sponsor}
                          </Link>
                        ) : p.donorText ? (
                          <span>Da: {p.donorText}</span>
                        ) : null}
                        <span>
                          Valore:{" "}
                          {p.declaredValueCents === null
                            ? "da dichiarare"
                            : formatEuro(p.declaredValueCents)}
                        </span>
                      </p>
                      {v && (
                        <Chip
                          tone={v.level === "forbidden" ? "crit" : "warn"}
                          className="mt-1.5 whitespace-normal py-1"
                        >
                          {v.reason}
                        </Chip>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={disabled}
                        onClick={() => setEditing({ prize: p, isNew: false })}
                        aria-label={`Modifica ${p.rank}° premio`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={btnGhostDanger}
                        disabled={disabled || remove.busy}
                        onClick={() =>
                          void remove.run(() => actions.removePrize(p.id))
                        }
                        aria-label={`Togli ${p.rank}° premio`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <ResultLine result={remove.result} />
        </div>
      </Card>

      <Card
        id="lot-prize-totals"
        title="Valore dei premi e ritenuta"
        sub={`Ritenuta del ${WITHHOLDING_RATE_PERCENT}% sul valore totale dei premi, acquistati o donati, con F24 entro il 16 del mese dopo l'estrazione. Da verificare con il commercialista.`}
      >
        <dl
          className="m-0 grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4 sm:px-[18px]"
          data-testid="lot-prize-totals"
        >
          <Stat label="Premi" value={String(totals.count)} />
          <Stat
            label="Valore dichiarato"
            value={formatEuro(totals.totalCents)}
            note={
              totals.withoutValue
                ? `${totals.withoutValue} senza valore: totale parziale`
                : undefined
            }
          />
          <Stat
            label={`Ritenuta ${WITHHOLDING_RATE_PERCENT}% (stima)`}
            value={formatEuro(totals.withholdingCents)}
            note={
              totals.complete ? undefined : "si completa con tutti i valori"
            }
          />
          <Stat
            label="Da controllare"
            value={String(totals.forbidden + totals.duplicateRanks.length)}
            note={
              totals.forbidden
                ? "premi non ammessi"
                : totals.duplicateRanks.length
                  ? "posizioni ripetute"
                  : "nessun problema"
            }
          />
        </dl>
        {totals.overTombolaCap && (
          <p
            role="alert"
            className="mx-4 mb-4 rounded-xl bg-[var(--in-crit-bg)] px-4 py-3 text-[14.5px] font-semibold text-[var(--in-crit)] sm:mx-[18px]"
          >
            Tombola: i premi superano il limite di{" "}
            {formatEuro(TOMBOLA_PRIZES_CAP_CENTS)}.
          </p>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | undefined;
}) {
  return (
    <div className="rounded-xl bg-[#f4f8fd] px-3 py-2.5">
      <dt className="text-[13px] font-semibold uppercase tracking-wide text-[var(--in-sub)]">
        {label}
      </dt>
      <dd className="m-0 font-title text-[22px] font-black tabular-nums text-[var(--in-ink)]">
        {value}
      </dd>
      {note && (
        <dd className="m-0 text-[12.5px] text-[var(--in-sub)]">{note}</dd>
      )}
    </div>
  );
}

function PrizeForm({
  initial,
  isNew,
  others,
  actions,
  onClose,
}: {
  initial: Prize;
  isNew: boolean;
  others: Prize[];
  actions: LotteryActions;
  onClose: () => void;
}) {
  const [p, setP] = useState<Prize>(initial);
  const save = useAction();
  const issues = checkPrize(p);
  const dup = others.some((o) => o.rank === p.rank && o.id !== p.id);
  const errors = dup
    ? [
        ...issues,
        { field: "rank", message: `C'è già un premio in posizione ${p.rank}.` },
      ]
    : issues;
  const verdict = prizeVerdict(p.description);
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-[var(--in-info)] bg-[#f7fbff] p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run(() => actions.savePrize(p, isNew));
        if (r.ok) onClose();
      }}
      data-testid="lot-prize-form"
    >
      <p className="m-0 flex items-center gap-2 text-[16px] font-bold">
        <Gift className="size-4 text-[var(--in-info)]" aria-hidden="true" />{" "}
        {isNew ? "Nuovo premio" : `Modifica ${initial.rank}° premio`}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
        <IntField
          label="Posizione"
          value={p.rank}
          onChange={(v) => setP({ ...p, rank: v ?? 0 })}
        />
        <TextField
          label="Descrizione del premio"
          value={p.description}
          onChange={(v) => setP({ ...p, description: v })}
          maxLength={300}
          error={verdict?.level === "forbidden" ? verdict.reason : undefined}
          hint={
            verdict?.level === "check"
              ? verdict.reason
              : "Es. un bene o un servizio offerto da un partner."
          }
          testId="lot-prize-desc"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField<PrizeCategory>
          label="Natura"
          value={p.category}
          options={(["BENE", "SERVIZIO"] as const).map((c) => ({
            value: c,
            label: PRIZE_CATEGORY_LABEL[c],
          }))}
          onChange={(v) =>
            setP({ ...p, category: (v || "BENE") as PrizeCategory })
          }
        />
        <SelectField<PrizeOrigin>
          label="Provenienza"
          value={p.origin}
          options={(["DONATO", "ACQUISTATO"] as const).map((c) => ({
            value: c,
            label: PRIZE_ORIGIN_LABEL[c],
          }))}
          onChange={(v) =>
            setP({ ...p, origin: (v || "DONATO") as PrizeOrigin })
          }
        />
        <SelectField<string>
          label="Partner (sponsor attuali)"
          value={p.sponsorSlug ?? ""}
          options={[
            { value: "", label: "Nessuno / altro donatore" },
            ...LINKABLE.map((s) => ({ value: s.slug, label: s.name! })),
          ]}
          onChange={(v) => setP({ ...p, sponsorSlug: v || null })}
          hint="Il logo compare sulla pagina pubblica solo per gli sponsor già registrati."
        />
        <MoneyField
          label="Valore dichiarato"
          cents={p.declaredValueCents}
          onChange={(v) => setP({ ...p, declaredValueCents: v })}
          hint="Serve per la ritenuta."
        />
      </div>
      {!p.sponsorSlug && (
        <TextField
          label="Altro donatore (facoltativo)"
          value={p.donorText}
          onChange={(v) => setP({ ...p, donorText: v })}
          maxLength={120}
          hint="Solo nomi di aziende o adulti che hanno dato il consenso. Nessun logo."
        />
      )}
      <IssueList
        errors={
          p.description.trim()
            ? errors
            : errors.filter((e) => e.field !== "description")
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={btnPrimary}
          disabled={save.busy || errors.length > 0}
          data-testid="lot-prize-save"
        >
          <Save className="size-4" aria-hidden="true" /> Salva premio
        </button>
        <button type="button" className={btnSecondary} onClick={onClose}>
          <X className="size-4" aria-hidden="true" /> Annulla
        </button>
        <ResultLine result={save.result} />
      </div>
    </form>
  );
}
