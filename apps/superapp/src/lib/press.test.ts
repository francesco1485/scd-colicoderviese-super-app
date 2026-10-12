import { describe, expect, it } from "vitest";

import { aboutUs, decodeEntities, googleNewsRssUrl, parseRss } from "./press";

const XML = `<?xml version="1.0"?><rss><channel><title>x</title>
<item><title>ColicoDerviese, vittoria in Promozione - La Provincia di Lecco</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Sun, 11 Oct 2026 18:00:00 GMT</pubDate><source url="https://www.laprovinciadilecco.it">La Provincia di Lecco</source></item>
<item><title><![CDATA[Juniores &amp; U16: weekend a Colico - Lecco Today]]></title><link>https://example.org/a</link></item>
<item><title>Incidente a Colico, traffico in tilt - Il Giorno</title><link>https://example.org/b</link></item>
<item><title>Meteo Lecco - Il Giorno</title><link>https://example.org/c</link></item>
<item><title>Senza link</title></item>
<item><title>Juniores &amp; U16: weekend a Colico - Lecco Today</title><link>https://example.org/dup</link></item>
</channel></rss>`;

describe("press", () => {
  it("parses RSS items with source and date, skipping items without a link", () => {
    const items = parseRss(XML);
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({
      title: "ColicoDerviese, vittoria in Promozione",
      url: "https://news.google.com/rss/articles/abc",
      source: "La Provincia di Lecco",
      publishedAt: "2026-10-11T18:00:00.000Z",
    });
    expect(items[1]!.title).toBe("Juniores & U16: weekend a Colico");
    expect(items[1]!.source).toBe("Lecco Today");
    expect(items[1]!.publishedAt).toBeNull();
  });

  it("keeps only what is about the club or the towns, dropping crime, weather and duplicates", () => {
    const kept = aboutUs(parseRss(XML));
    expect(kept.map((i) => i.title)).toEqual([
      "ColicoDerviese, vittoria in Promozione",
      "Juniores & U16: weekend a Colico",
    ]);
  });

  it("decodes entities and builds the Google News url", () => {
    expect(decodeEntities("a &amp; b &#39;c&#39; &#x41;")).toBe("a & b 'c' A");
    expect(googleNewsRssUrl('"ColicoDerviese"')).toBe(
      "https://news.google.com/rss/search?q=%22ColicoDerviese%22&hl=it&gl=IT&ceid=IT:it",
    );
  });
});
