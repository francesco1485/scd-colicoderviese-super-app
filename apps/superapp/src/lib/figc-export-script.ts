/**
 * Export script ("bookmarklet") for the FIGC/LND portal, used by the Segreteria to feed
 * /segreteria/storia (r131). It runs ONLY when a person clicks it on a page of iscrizioni.lnd.it
 * where that person is already logged in with the club's own user: the app never receives the
 * portal credentials and never calls the portal itself.
 *
 * What it does, step by step:
 *  1. refuses to run outside iscrizioni.lnd.it;
 *  2. reads the "Tabulato" rows of the page the person is on (FIGC number, "COGNOME NOME",
 *     birth YEAR taken from the date cell, sector D/S), clicking the portal's own "#next-page"
 *     button to read every page; the fiscal-code cell is never read and the full birth date is
 *     never written (the script picks only the cells it needs and keeps only the year);
 *     the season is read from the page; when it cannot be read, the person is asked to confirm
 *     the current season (Annulla stops the script);
 *  3. for every FIGC number asks the portal's own page
 *     /InterrogazioneCalciatori/VisualizzaStorico?matricola=N (same origin, one request every
 *     250 ms) and keeps season, movement, club, status, date and the release note;
 *  4. keeps what it read in sessionStorage of the portal tab, so the person can open the
 *     Dilettanti tabulato, click, then the SGS tabulato (or a previous season) and click again;
 *  5. when the person confirms, downloads "scd-figc-storico-<date>.json" (format
 *     `exportFileSchema` of figc-history.ts) and clears sessionStorage.
 * No remote code is loaded, nothing is sent anywhere: the file is uploaded by hand in the app.
 *
 * Portal page structure: UNVERIFIED by the app (read from the portal on 2026-10-15). The reader
 * is tolerant (cells recognised by their format, not by position) and says so when it finds
 * nothing.
 */

/** Readable source of the script (shown in the page and wrapped in the bookmarklet below). */
export const FIGC_EXPORT_SOURCE = String.raw`(async function () {
  var HOST = "iscrizioni.lnd.it";
  var CLUB_CODE = "26020";
  var KEY = "scd-figc-export-v2";
  var VERSION = 2;
  var STORICO = "/InterrogazioneCalciatori/VisualizzaStorico?matricola=";
  if (location.hostname !== HOST) {
    alert("Apri prima il portale " + HOST + " con l'utente della società, poi clicca di nuovo.");
    return;
  }
  var SEASON_RE = /^(\d{4})\/(\d{4})$/;
  var DMY_RE = /^\d{2}\/\d{2}\/\d{4}$/;
  var MAT_RE = /^\d{5,8}$/;
  var CF_RE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
  function txt(el) { return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim(); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function seasonNow() {
    var d = new Date(); var y = d.getFullYear();
    return d.getMonth() >= 6 ? y + "/" + (y + 1) : (y - 1) + "/" + y;
  }
  function pageSeason() {
    var opts = document.querySelectorAll("select option:checked");
    for (var o = 0; o < opts.length; o++) {
      var s = txt(opts[o]).match(/(?:^|\D)(20\d{2})\s*\/\s*(20\d{2})(?!\d)/);
      if (s && Number(s[2]) === Number(s[1]) + 1) return s[1] + "/" + s[2];
    }
    var m = (document.body.innerText || document.body.textContent || "").match(/(?:^|\D)(20\d{2})\s*\/\s*(20\d{2})(?!\d)/);
    if (m && Number(m[2]) === Number(m[1]) + 1) return m[1] + "/" + m[2];
    return null;
  }
  function birthYear(dmy) {
    var y = Number(dmy.slice(6, 10));
    return y >= 1900 && y <= 2100 ? y : null;
  }
  var state = { kind: "scd-figc-export", version: VERSION, club_code: CLUB_CODE, season: seasonNow(), read_at: "", roster: [], career: [], done: [] };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (saved && saved.kind === "scd-figc-export" && saved.version === VERSION) state = saved; } catch (e) {}
  function pageSector() {
    var t = ((document.title || "") + " " + location.pathname + " " + txt(document.querySelector("h1, h2, h3, .page-title"))).toLowerCase();
    if (/sgs|giovanil/.test(t)) return "S";
    if (/dilettant/.test(t)) return "D";
    return null;
  }

  function readTabulato(season, fallbackSector) {
    var out = [];
    var rows = document.querySelectorAll("table tbody tr");
    for (var i = 0; i < rows.length; i++) {
      var cells = Array.prototype.map.call(rows[i].querySelectorAll("td"), txt);
      var mat = null, name = null, birth = null, sector = null;
      for (var j = 0; j < cells.length; j++) {
        var c = cells[j];
        if (!c || CF_RE.test(c)) continue;
        if (!mat && MAT_RE.test(c)) { mat = c; continue; }
        if (!birth && DMY_RE.test(c)) { birth = c; continue; }
        if (!sector && (c === "D" || c === "S")) { sector = c; continue; }
        if (!name && /^[A-ZÀ-ÖØ-Ý' .-]{3,}$/.test(c) && c.indexOf(" ") > 0) { name = c; continue; }
      }
      if (mat && name) out.push({ matricola: mat, name: name, birth_year: birth ? birthYear(birth) : null, sector: sector || fallbackSector, season: season });
    }
    return out;
  }
  function firstRowSignature() { return txt(document.querySelector("table tbody tr")); }
  async function nextPage() {
    var btn = document.querySelector("#next-page");
    if (!btn || btn.disabled || btn.getAttribute("aria-disabled") === "true" || /disabled/.test(btn.className) || (btn.parentElement && /disabled/.test(btn.parentElement.className))) return false;
    var before = firstRowSignature();
    btn.click();
    for (var k = 0; k < 40; k++) { await sleep(250); if (firstRowSignature() !== before) return true; }
    return false;
  }
  function readStorico(html, mat) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var out = [];
    var rows = doc.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++) {
      var cells = Array.prototype.map.call(rows[i].querySelectorAll("td"), txt);
      var season = null, movement = null, club = null, status = null, date = null, note = null;
      for (var j = 0; j < cells.length; j++) {
        var c = cells[j];
        if (!c || CF_RE.test(c)) continue;
        if (!season && SEASON_RE.test(c)) { season = c; continue; }
        if (!movement && /^[A-Z][A-Z0-9] [A-Z]/.test(c)) { movement = c; continue; }
        if (!club && /^\d{3,10} \S/.test(c)) { club = c; continue; }
        if (!status && /^\d{1,2} [A-Z]/.test(c)) { status = c; continue; }
        if (!date && DMY_RE.test(c)) { date = c; continue; }
        if (!note && /svincolo/i.test(c)) { note = c; continue; }
      }
      if (season && movement && club) out.push({ matricola: mat, season: season, movement: movement, club: club, status: status, date: date || "", note: note });
      else if (!season && out.length > 0) {
        var whole = cells.join(" ");
        if (/svincolo/i.test(whole) && !out[out.length - 1].note) out[out.length - 1].note = whole.slice(0, 300);
      }
    }
    return out;
  }
  function download() {
    var data = { kind: state.kind, version: VERSION, club_code: CLUB_CODE, season: state.season, read_at: new Date().toISOString(), roster: state.roster, career: state.career };
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scd-figc-storico-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    sessionStorage.removeItem(KEY);
  }

  var season = pageSeason();
  if (!season) {
    var fallback = seasonNow();
    if (!confirm("Non riesco a leggere la stagione da questa pagina.\nUso la stagione " + fallback + "?\n\nOK = sì, continua con " + fallback + ".\nAnnulla = fermati (apri il tabulato con la stagione visibile e riprova).")) return;
    season = fallback;
  }
  var sector = pageSector();
  var page = readTabulato(season, sector || "D");
  if (page.length === 0) {
    if (state.roster.length > 0 && confirm("Nessun tabulato in questa pagina. Scaricare il file con " + state.roster.length + " righe già raccolte?")) download();
    else if (state.roster.length === 0) alert("Non trovo righe del tabulato in questa pagina. Apri 'Tabulato calciatori' (Dilettanti o SGS) e clicca di nuovo.");
    return;
  }
  if (!sector && !confirm("Non riesco a capire se è il tabulato Dilettanti o SGS. OK = Dilettanti, Annulla = SGS.")) {
    page.forEach(function (r) { r.sector = "S"; });
  }
  var found = page.slice();
  while (await nextPage()) found = found.concat(readTabulato(season, found[0].sector));
  if (season > state.season) state.season = season;
  var seen = {};
  state.roster.forEach(function (r) { seen[r.season + "|" + r.matricola] = true; });
  found.forEach(function (r) { if (!seen[r.season + "|" + r.matricola]) { seen[r.season + "|" + r.matricola] = true; state.roster.push(r); } });

  var todo = found.map(function (r) { return r.matricola; }).filter(function (m, i, a) { return a.indexOf(m) === i && state.done.indexOf(m) < 0; });
  var failed = 0;
  for (var i = 0; i < todo.length; i++) {
    document.title = "SCD storico " + (i + 1) + "/" + todo.length;
    try {
      var res = await fetch(STORICO + encodeURIComponent(todo[i]), { credentials: "same-origin" });
      if (!res.ok) { failed++; } else { state.career = state.career.concat(readStorico(await res.text(), todo[i])); state.done.push(todo[i]); }
    } catch (e) { failed++; }
    await sleep(250);
  }
  sessionStorage.setItem(KEY, JSON.stringify(state));
  var msg = "Letti " + found.length + " atleti (" + season + ")" + (failed ? ", storico non letto per " + failed : "") + ".\nIn totale: " + state.roster.length + " righe di tabulato, " + state.career.length + " movimenti.\n\nOK = scarica il file adesso.\nAnnulla = continua su un altro tabulato (es. SGS) e poi clicca di nuovo.";
  if (confirm(msg)) download();
})();`;

/** The bookmarklet to drag to the bookmarks bar (or paste as the address of a new bookmark). */
export const FIGC_EXPORT_BOOKMARKLET = `javascript:${encodeURIComponent(FIGC_EXPORT_SOURCE)}`;

export const FIGC_PORTAL_HOST = "iscrizioni.lnd.it";
export const FIGC_STORICO_ENDPOINT = "/InterrogazioneCalciatori/VisualizzaStorico?matricola=";
