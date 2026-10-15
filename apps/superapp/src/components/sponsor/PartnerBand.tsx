/**
 * Partner band: the live LED spot, the partner of the month and partner news. Off the public home since UD-134
 * (Francesco 15/10/2026 09:18: "non è una cosa che interessa a molti, va messa in una scala di priorità su una
 * pagina"): it lives on /sponsor. The home keeps only the fixed scrolling sponsor bar (SponsorBand).
 */
import { SponsorSpotsHome } from "@/components/SponsorSpots";
import { LogoTile, SponsorLogo } from "@/components/scd/Logos";
import { partnerNewsOn } from "@/lib/partner-news";
import { partnerOfTheMonth } from "@/lib/public-home";
import { sponsorLabel } from "@/lib/sponsors";

const WRAP = "mx-auto w-full max-w-6xl px-4";

const monthName = (day: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "long" }).format(
    new Date(`${day.slice(0, 7)}-15T12:00:00Z`),
  );

/**
 * The live LED spot with every partner in rotation (UD-107), the partner of the month, partner news only when a
 * partner has sent one; the spot card carries the one "Diventa partner". Logos always in colour (UD-110).
 */
export function PartnerBand({ day }: { day: string }) {
  const showcase = partnerOfTheMonth(day);
  const news = partnerNewsOn(day);
  return (
    <section
      aria-labelledby="partner-t"
      className={`${WRAP} mt-10`}
      data-testid="partner-band"
    >
      <div className="flex items-end justify-between gap-3 pb-3">
        <h2
          id="partner-t"
          className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          In onda ora e notizie dai partner
        </h2>
      </div>
      <div className="grid gap-4 rounded-[16px] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:p-5">
        <div data-testid="sponsor-ledwall-live" className="min-w-0">
          <SponsorSpotsHome day={day} compact />
        </div>
        <div className="grid content-start gap-3">
          {showcase && (
            <div
              className="flex items-center gap-3.5 rounded-[12px] bg-[#eef3f9] p-3"
              data-testid="partner-of-month"
            >
              <LogoTile className="h-[60px] w-[96px] shrink-0">
                <SponsorLogo
                  sponsor={showcase}
                  box={{ w: 80, h: 44 }}
                  decorative
                />
              </LogoTile>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">
                  Partner del mese · {monthName(day)}
                </span>
                <b className="text-[16px] leading-tight text-[#0b1e3a]">
                  {sponsorLabel(showcase)}
                </b>
              </span>
            </div>
          )}
          {news.length > 0 && (
            <ul
              className="m-0 grid list-none gap-0 divide-y divide-[#e6edf6] p-0"
              data-testid="partner-news"
            >
              {news.slice(0, 2).map((n) => (
                <li key={n.id} className="py-2">
                  {n.url ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="scd-focus grid gap-0.5 hover:underline"
                    >
                      <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
                        {n.label}
                      </span>
                      <b className="text-[15px] leading-snug text-[#0b1e3a]">
                        {n.title}
                      </b>
                      <span className="sr-only">
                        (apre il sito del partner)
                      </span>
                    </a>
                  ) : (
                    <span className="grid gap-0.5">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
                        {n.label}
                      </span>
                      <b className="text-[15px] leading-snug text-[#0b1e3a]">
                        {n.title}
                      </b>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

