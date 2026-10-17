import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { PeoplePins } from "@/components/scd/PeoplePins";
import type { StaffPerson } from "@/lib/staff-roster";
import { FLEET_2026_27, TRANSPORT_OFFICE, TRANSPORT_OFFICE_BACKUP, crewMismatch, transportCrew, type TransportBoard } from "@/lib/transport";

/**
 * «Chi fa il servizio» on /pulmini (start-up 2026/27). The office and the volunteer drivers come from the organigram
 * roster (SCD_STAFF_ROSTER_JSON, the same list behind the "omini" elsewhere): no second list of drivers. When the
 * Master Flotta copy is readable, names on only one side are listed so the office fixes the source.
 * Adults only; no phone, no minor. Engine TEMPO; measure: confirmed seats decided by the office within 48 hours.
 */
export function TransportCrewCard({ people, emails, board, ackLive }: { people: readonly StaffPerson[]; emails: Readonly<Record<string, string>>; board: TransportBoard | null; ackLive: boolean }) {
  const { office, drivers } = transportCrew(people);
  const mismatch = board ? crewMismatch(drivers, board.drivers) : null;
  const expected = FLEET_2026_27.drivers;
  return (
    <Card
      id="pul-chi"
      title="Chi fa il servizio"
      sub={`Decide il ${TRANSPORT_OFFICE}; in sua assenza ${TRANSPORT_OFFICE_BACKUP}. Gli autisti sono tutti volontari.`}
      aside={<Chip tone={drivers.length >= expected ? "ok" : "warn"}>{drivers.length} di {expected} autisti in elenco</Chip>}
    >
      <div className="grid gap-3 px-4 pb-3 sm:px-[18px]" data-testid="transport-crew">
        {office.length > 0 ? (
          <PeoplePins people={office} emails={emails} label={TRANSPORT_OFFICE} />
        ) : (
          <p className="m-0 text-[14px] text-[var(--in-sub)]" data-testid="crew-office-missing">
            <Chip tone="warn" className="mr-1.5">da collegare</Chip>Il {TRANSPORT_OFFICE} non è ancora nell'elenco ruoli con l'area «pulmini».
          </p>
        )}
        {drivers.length > 0 ? (
          <PeoplePins people={drivers} emails={emails} label="Autisti volontari" />
        ) : (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">
            <Chip tone="warn" className="mr-1.5">da collegare</Chip>Nessun autista nell'elenco ruoli: la Direzione ne ha indicati {expected}.
          </p>
        )}
        {mismatch && (mismatch.onlyRoster.length > 0 || mismatch.onlyMaster.length > 0) && (
          <div className="rounded-xl bg-[var(--in-warn-bg)] px-3 py-2 text-[14px] leading-snug text-[var(--in-warn)]" data-testid="crew-mismatch">
            {mismatch.onlyRoster.length > 0 && <p className="m-0">Nell'elenco ruoli ma non nel Master (scheda 05 AUTISTI): {mismatch.onlyRoster.join(", ")}.</p>}
            {mismatch.onlyMaster.length > 0 && <p className="m-0">Nel Master ma non nell'elenco ruoli: {mismatch.onlyMaster.join(", ")}.</p>}
          </div>
        )}
      </div>
      <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
        <p className="m-0 mb-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Come funziona una richiesta</p>
        <ol className="m-0 grid list-decimal gap-1 pl-5 text-[14px] leading-snug" data-testid="transport-flow">
          <li>La famiglia chiede il posto dalla sua area; il mister o il dirigente lo segnala al {TRANSPORT_OFFICE}.</li>
          <li>Il {TRANSPORT_OFFICE} conferma o risponde «non possibile» con il motivo.</li>
          <li>Il posto si assegna sulla corsa, con pulmino e autista.</li>
          <li>
            La famiglia prende visione del posto confermato.
            {!ackLive && <Chip tone="mute" className="ml-1.5">in attivazione</Chip>}
          </li>
        </ol>
      </div>
      <SourceLine>
        Persone dall'elenco ruoli del club (lo stesso dell'organigramma); flotta e autisti indicati dalla Direzione il 17/10/2026: {FLEET_2026_27.clubVans} {FLEET_2026_27.model} del club, {FLEET_2026_27.partnerVans} dell'{FLEET_2026_27.partnerOwner} all'occorrenza, {expected} autisti volontari. Nessun telefono nell'app.
      </SourceLine>
    </Card>
  );
}
