import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SEGRETERIA_WHATSAPP } from "./install-link";
import { installMode, isIosSafari } from "./install-prompt";

const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IOS_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1";
const IOS_WHATSAPP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.24";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

describe("installMode", () => {
  it("installed app wins over everything", () => {
    expect(installMode({ userAgent: ANDROID_CHROME, standalone: true, hasPrompt: true })).toBe("installed");
  });
  it("one tap when the browser gave its install dialog", () => {
    expect(installMode({ userAgent: ANDROID_CHROME, standalone: false, hasPrompt: true })).toBe("one-tap");
  });
  it("menu steps on Android without the dialog", () => {
    expect(installMode({ userAgent: ANDROID_CHROME, standalone: false, hasPrompt: false })).toBe("menu-steps");
  });
  it("Safari steps on iPhone", () => {
    expect(installMode({ userAgent: IOS_SAFARI, standalone: false, hasPrompt: false })).toBe("ios-steps");
  });
  it("iPad Safari in desktop mode gets the Safari steps, a Mac does not", () => {
    const IPAD_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    expect(installMode({ userAgent: IPAD_DESKTOP, standalone: false, hasPrompt: false, maxTouchPoints: 5 })).toBe("ios-steps");
    expect(installMode({ userAgent: IPAD_DESKTOP, standalone: false, hasPrompt: false, maxTouchPoints: 0 })).toBe("menu-steps");
  });
  it("other iPhone browsers and in-app browsers are sent to Safari", () => {
    expect(installMode({ userAgent: IOS_CHROME, standalone: false, hasPrompt: false })).toBe("ios-open-safari");
    expect(installMode({ userAgent: IOS_WHATSAPP, standalone: false, hasPrompt: false })).toBe("ios-open-safari");
    expect(isIosSafari(IOS_SAFARI)).toBe(true);
  });
});

describe("Iride contact card", () => {
  it("public vCard carries only the club's public contacts", () => {
    const vcf = readFileSync(fileURLToPath(new URL("../../public/iride.vcf", import.meta.url)), "utf8");
    expect(vcf).toMatch(/^BEGIN:VCARD/);
    expect(vcf).toContain(`waid=${SEGRETERIA_WHATSAPP.e164}:${SEGRETERIA_WHATSAPP.display}`);
    expect(SEGRETERIA_WHATSAPP.chatUrl).toBe(`https://wa.me/${SEGRETERIA_WHATSAPP.e164}`);
    expect(vcf).toContain("sportclubcolico@gmail.com");
    expect(vcf.trim().endsWith("END:VCARD")).toBe(true);
  });
});
