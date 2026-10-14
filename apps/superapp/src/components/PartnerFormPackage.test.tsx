import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormsPausedNotice } from "@/components/scd/FormsPausedNotice";
import { OFFICIAL_CHANNELS, PAUSED_COPY, mailtoFor } from "@/lib/public-forms";
import { packageRequestNote } from "@/lib/sponsor-packages";

describe("mailtoFor with a chosen package", () => {
  it("appends the package to the partner subject and prefills the body", () => {
    const href = mailtoFor("partner", { topic: "Pacchetto Tornei", body: packageRequestNote("tornei") });
    expect(href.startsWith(`mailto:${OFFICIAL_CHANNELS.email}?subject=`)).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get("subject")).toBe("Partnership · Pacchetto Tornei");
    expect(url.searchParams.get("body")).toBe("Mi interessa il pacchetto «Tornei».");
  });

  it("without extras keeps the published subject and no body", () => {
    expect(mailtoFor("partner")).toBe(`mailto:${OFFICIAL_CHANNELS.email}?subject=${encodeURIComponent(PAUSED_COPY.partner.subject)}`);
  });

  it("never changes the safeguarding subject", () => {
    expect(mailtoFor("safeguarding", { topic: "X", body: "Y" })).toBe(mailtoFor("safeguarding"));
  });
});

describe("FormsPausedNotice (SSR)", () => {
  it("shows the chosen package and links the e-mail with it", () => {
    const html = renderToStaticMarkup(<FormsPausedNotice kind="partner" topic="Pacchetto LED wall" body={packageRequestNote("ledwall")} />);
    expect(html).toContain('data-testid="forms-paused-topic"');
    expect(html).toContain("Pacchetto LED wall");
    expect(html).toContain(encodeURIComponent("Partnership · Pacchetto LED wall"));
  });

  it("ignores a topic on the safeguarding notice", () => {
    const html = renderToStaticMarkup(<FormsPausedNotice kind="safeguarding" topic="Pacchetto LED wall" />);
    expect(html).not.toContain("forms-paused-topic");
    expect(html).not.toContain("LED wall");
  });
});
