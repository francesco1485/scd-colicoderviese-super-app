import { Eye, EyeOff, Globe } from "lucide-react";

import { Card, Chip } from "@/components/scd/interior-ui";
import {
  publicWindow,
  shortDay,
  toPublic,
  type LotteryState,
} from "@/lib/lottery";

import { PublicLotteryView } from "./PublicLotteryView";
import type { LotteryActions } from "./store";
import { btnAction, btnSecondary, ResultLine, useAction } from "./ui";

export const PUBLIC_PATH = "/eventi/lotteria-dello-sport";

export function PublishPanel({
  state,
  today,
  actions,
  isDirezione,
  mode,
}: {
  state: LotteryState;
  today: string;
  actions: LotteryActions;
  isDirezione: boolean;
  mode: "simulation" | "live";
}) {
  const act = useAction();
  const published = !!state.publishedOn;
  const win = publicWindow(state.setup, state.publishedOn);
  // Preview of what the public would see (as if published today).
  const preview = toPublic({
    ...state,
    publishedOn: state.publishedOn ?? today,
  });
  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-publish"
        title="8 · Pagina pubblica"
        sub={`Pronta ma non collegata dalla home: compare su ${PUBLIC_PATH} e in Eventi solo dopo che la Direzione la pubblica. Nessuna vendita online, nessun pagamento in app.`}
        aside={
          published ? (
            <Chip tone="ok">Pubblica dal {shortDay(state.publishedOn)}</Chip>
          ) : (
            <Chip tone="mute">Non pubblicata</Chip>
          )
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
          {win && (
            <p className="m-0 text-[14.5px] text-[var(--in-sub)]">
              Visibile dal {shortDay(win.showFrom)} al {shortDay(win.showUntil)}{" "}
              (fine del ritiro premi o giornata dello sport).
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {published ? (
              <button
                type="button"
                className={btnSecondary}
                disabled={!isDirezione || act.busy}
                onClick={() =>
                  void act.run(() => actions.setPublished(false, today))
                }
                data-testid="lot-unpublish"
              >
                <EyeOff className="size-4" aria-hidden="true" /> Ritira la
                pagina
              </button>
            ) : (
              <button
                type="button"
                className={btnAction}
                disabled={!isDirezione || act.busy || !state.id}
                onClick={() =>
                  void act.run(() => actions.setPublished(true, today))
                }
                data-testid="lot-publish"
              >
                <Globe className="size-4" aria-hidden="true" /> Pubblica la
                pagina
              </button>
            )}
            {!isDirezione && (
              <span className="text-[14px] text-[var(--in-sub)]">
                Solo la Direzione pubblica.
              </span>
            )}
            {mode === "simulation" && (
              <Chip tone="warn">Simulazione: la pagina vera resta spenta</Chip>
            )}
            <ResultLine result={act.result} />
          </div>
        </div>
      </Card>
      <Card
        id="lot-preview"
        title="Anteprima"
        aside={
          <Chip tone="info">
            <Eye className="size-3.5" aria-hidden="true" />
            Come la vedrà il pubblico
          </Chip>
        }
      >
        <div
          className="bg-[#f3f6fb] px-3 py-4 sm:px-5"
          data-testid="lot-public-preview"
        >
          {preview && (
            <PublicLotteryView lottery={preview} today={today} preview />
          )}
        </div>
      </Card>
    </div>
  );
}
