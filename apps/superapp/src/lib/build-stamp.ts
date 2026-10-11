/** Build stamp shown in the footer of review builds; "dev" when not injected (tests, dev server). */
export const BUILD_STAMP: string = typeof __SCD_BUILD__ === "string" ? __SCD_BUILD__ : "dev";
