/* SCD R21.6 HTTP API BRIDGE
 * Da aggiungere al progetto Apps Script R20 e ridistribuire come Web App.
 * Non sostituisce il gestionale: espone in modo controllato le funzioni R20 alla Super App.
 */
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var req = JSON.parse(raw || '{}');
    var action = String(req.action || '').trim();
    var payload = req.payload || {};
    var token = String(req.sessionToken || '');
    var data;

    switch (action) {
      case 'public.feed':
        data = typeof getPublicFeed === 'function' ? getPublicFeed(payload.limit || 40) : getPublicBootstrap();
        break;
      case 'public.club':
        data = getClubPublic();
        break;
      case 'public.calendar':
        data = getPublicCalendar(payload.rangeKey || 'ALL', payload.offset || 0);
        break;
      case 'public.register':
        if (typeof r21RegisterBaseUser_ !== 'function') throw new Error('Modulo registrazione R21 non installato');
        data = r21RegisterBaseUser_(payload);
        break;
      case 'public.telemetry':
        if (typeof r21RecordTelemetry_ !== 'function') return r21Json_({ok:true,data:{stored:false}});
        data = r21RecordTelemetry_(payload);
        break;
      case 'auth.request':
        data = requestOtp(payload.email || payload);
        break;
      case 'auth.login':
        data = verifyOtp(payload.email, payload.pin || payload.code);
        break;
      case 'auth.validate':
        data = validateSession(token || payload.token);
        break;
      case 'dashboard.summary':
        data = getAppData(token);
        break;
      default:
        throw new Error('Azione API non consentita: ' + action);
    }
    return r21Json_({ok:true,data:data});
  } catch (err) {
    return r21Json_({ok:false,error:String(err && err.message ? err.message : err)});
  }
}
function r21Json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
