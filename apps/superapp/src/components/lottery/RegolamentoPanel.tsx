import { Card, Chip } from "@/components/scd/interior-ui";
import {
  buildRegolamento,
  regolamentoMissing,
  type LotteryState,
} from "@/lib/lottery";

import { DraftDocument } from "./DraftDocument";

export function RegolamentoPanel({
  state,
  today,
}: {
  state: LotteryState;
  today: string;
}) {
  const missing = regolamentoMissing(state.setup, state.series, state.prizes);
  const md = buildRegolamento(state.setup, state.series, state.prizes, today);
  return (
    <Card
      id="lot-regolamento"
      title="3 · Regolamento (bozza)"
      sub="Compilato dai dati dell'impostazione e dei premi (art. 14). Per la revisione della Direzione: l'app non lo invia a nessuno."
      aside={
        missing.length ? (
          <Chip tone="warn">{missing.length} campi da completare</Chip>
        ) : (
          <Chip tone="ok">Campi art. 14 compilati</Chip>
        )
      }
    >
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
        {missing.length > 0 && (
          <p
            className="m-0 text-[14.5px] leading-snug text-[var(--in-sub)]"
            data-testid="lot-reg-missing"
          >
            <b className="text-[var(--in-ink)]">Mancano:</b>{" "}
            {missing.join(", ")}. Nel testo restano evidenziati come «da
            completare»; sede legale, codice fiscale e legale rappresentante si
            scrivono a mano.
          </p>
        )}
        <DraftDocument
          markdown={md}
          fileName="regolamento-lotteria-bozza.md"
          title="Regolamento — bozza"
          testId="lot-regolamento-doc"
        />
      </div>
    </Card>
  );
}
