import { describe, expect, it } from "vitest";

import { STORY_SPOTS, homeStories } from "./home-stories";
import { SPONSOR_SPOTS, spotsForHome } from "./sponsor-spots";
import type { ClubEvent } from "./stories";

const cup: ClubEvent = {
  id: "cup",
  title: "Christmas Lario Cup",
  when: "8 dicembre",
  date: "2026-12-08",
  text: "Torneo.",
  href: "/eventi/christmas-lario-cup",
  image: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
};

describe("homeStories", () => {
  it("orders events, partner spots of the day, centre and club", () => {
    const s = homeStories("2026-10-15", [cup]);
    expect(s[0]?.id).toBe("evento-cup");
    expect(s[0]?.label).toBe("Lario Cup");
    const spots = s.filter((x) => x.id.startsWith("spot-"));
    expect(spots.length).toBe(Math.min(STORY_SPOTS, spotsForHome().length));
    expect(s.at(-2)?.id).toBe("centro");
    expect(s.at(-1)?.id).toBe("lago");
  });

  it("drops events already past and is the same for everyone on the same day", () => {
    expect(homeStories("2026-12-09", [cup]).some((x) => x.id === "evento-cup")).toBe(false);
    expect(homeStories("2026-10-15", [cup]).map((x) => x.id)).toEqual(homeStories("2026-10-15", [cup]).map((x) => x.id));
  });

  it("shows only showable partner spots, as video when a preview exists", () => {
    const allowed = new Set(spotsForHome().map((x) => x.slug));
    for (const st of homeStories("2026-10-20", [])) {
      if (!st.id.startsWith("spot-")) continue;
      const slug = st.id.slice(5);
      expect(allowed.has(slug)).toBe(true);
      const spot = SPONSOR_SPOTS.find((x) => x.slug === slug);
      expect(st.media.kind).toBe(spot?.preview ? "video" : "image");
      expect(st.href).toBe(`/spot/${slug}`);
    }
  });
});
