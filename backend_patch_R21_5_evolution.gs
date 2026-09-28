/**
 * R21.5 Evolution Engine telemetry bridge
 * Privacy-first aggregate metrics only.
 * Add to Apps Script R20/R21 and expose as action: public.telemetry
 */
const R21_ALLOWED_LISTENING = {
  page_view:1, cta_click:1, form_start:1, form_complete:1, form_abandon:1,
  api_error:1, client_error:1, slow_load:1, search_use:1, pwa_install:1,
  share:1, return_visit:1, notification_interaction:1, feature_use:1, feedback_submit:1
};

function r21Telemetry_(payload) {
  payload = payload || {};
  var metrics = payload.metrics || {};
  var counts = metrics.counts || {};
  var sections = metrics.sections || {};
  var ss = SpreadsheetApp.openById(SCD.CORE_ID);
  var sh = ss.getSheetByName('APP TELEMETRIA');
  if (!sh) throw new Error('APP TELEMETRIA non disponibile');

  var now = new Date();
  Object.keys(counts).forEach(function(action) {
    if (!R21_ALLOWED_LISTENING[action]) return;
    var count = Math.max(0, Math.min(10000, Number(counts[action]) || 0));
    if (!count) return;
    sh.appendRow([
      now,
      'EVT-R21-' + Utilities.getUuid().slice(0,12).toUpperCase(),
      '', '', 'PUBBLICO',
      'LISTENING_MATRIX',
      String(action).toUpperCase(),
      'OK',
      0, 0,
      '',
      '',
      String(payload.version || 'R21.5'),
      'INFO',
      '',
      JSON.stringify({count:count, sections:sections}),
      'CLIENT_AGGREGATE',
      'STANDARD_30D'
    ]);
  });
  return {ok:true, accepted:true};
}

/*
NEL doPost R20/R21:
case 'public.telemetry':
  data = r21Telemetry_(payload);
  break;

NOTA:
- Non inviare email, PIN, form contents, safeguarding o PII.
- Il frontend R21.5 invia soltanto contatori aggregati.
*/
