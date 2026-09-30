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
      case 'public.registration':
        data = r216PublicRequest_(payload, 'TESSERAMENTO');
        break;
      case 'public.partnerLead':
        data = r216PublicRequest_(payload, String(payload.kind || '').toLowerCase() === 'product' ? 'FORNITORE' : 'SPONSOR');
        break;
      case 'public.communitySubmit':
        data = r216PublicRequest_(payload, 'COMMUNITY');
        break;
      case 'public.ticketSubmit':
        data = r216PublicRequest_(payload, r216TypeFromKind_(payload.kind));
        break;
      case 'public.telemetry':
        if (typeof r21RecordTelemetry_ !== 'function') return r21Json_({ok:true,data:{stored:false}});
        data = r21RecordTelemetry_(payload);
        break;
      case 'public.datafabric.contract':
        if (typeof r29DataFabricContract_ !== 'function') throw new Error('Modulo R29 Data Fabric contract non installato');
        data = r29DataFabricContract_();
        break;
      case 'safeguarding.submit':
        data = {stored:false,isolated:true,channel:'PEC',pec:'calciocolicoderviese@pec.it',message:'Safeguarding separato dai flussi ordinari.'};
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
      case 'private.dashboard':
        data = getAppData(token);
        break;
      case 'account.requests':
        data = r216MyRequests_(token);
        break;
      case 'private.week':
        data = getWeekForUser(token, Number(payload.offset || 0));
        break;
      case 'private.request.submit':
        data = submitUserRequest(token, payload);
        break;
      case 'private.transport.request':
        data = saveTransportRequest(token, payload);
        break;
      case 'private.message.send':
        data = sendTeamMessage(token, payload);
        break;
      case 'private.convocation.create':
        data = createConvocation(token, payload);
        break;
      case 'private.convocation.reply':
        data = replyConvocation(token, payload.id || payload.convocationId, payload.player || payload.playerCode, payload.response);
        break;
      case 'private.attendance.get':
        data = getAttendanceRegister(token, payload.teamKey || '', payload.date || '');
        break;
      case 'private.attendance.save':
        data = saveAttendanceBatch(token, payload);
        break;
      case 'auth.pin.change':
        data = changeMyPin(token, payload.oldPin || '', payload.newPin || '');
        break;
      case 'direction.diagnostics':
        data = getSystemDiagnostics(token);
        break;
      case 'direction.evolution':
        data = getEvolutionQueue(token, Number(payload.limit || 30));
        break;
      case 'direction.datafabric.status':
        if (typeof r25DataFabricStatus_ !== 'function') throw new Error('Modulo R25 Data Fabric non installato');
        data = r25DataFabricStatus_(token);
        break;
      case 'direction.datafabric.scan.gmail':
        if (typeof r25ScanGmail_ !== 'function') throw new Error('Modulo R25 Data Fabric non installato');
        data = r25ScanGmail_(token, payload);
        break;
      case 'direction.datafabric.scan.drive':
        if (typeof r25ScanDrive_ !== 'function') throw new Error('Modulo R25 Data Fabric non installato');
        data = r25ScanDrive_(token, payload);
        break;
      case 'direction.drive.folder.create':
        if (typeof r42CreateDriveFolder_ !== 'function') throw new Error('Modulo R42 Lia non installato');
        data = r42CreateDriveFolder_(token, payload);
        break;
      case 'direction.commercial.mapping.save':
        if (typeof r42SaveCommercialMapping_ !== 'function') throw new Error('Modulo R42 Lia non installato');
        data = r42SaveCommercialMapping_(token, payload);
        break;
      case 'direction.access.set':
        data = setActorAccess(token, payload);
        break;
      case 'direction.pin.set':
        data = directionSetUserPin(token, payload.email || '', payload.pin || '');
        break;
      case 'direction.player.approve':
        data = approvePlayerAuthorization(token, payload.authId || payload.id || '', payload.code || '', payload.note || 'Approvato da Super App SCD');
        break;
      case 'direction.player.reject':
        data = rejectPlayerAuthorization(token, payload.authId || payload.id || '', payload.note || 'Respinto da Super App SCD');
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


function r216TypeFromKind_(kind) {
  var k = String(kind || '').toLowerCase();
  var map = {
    rent:'AFFITTO_CAMPO',
    tournament:'TORNEO',
    tickets:'BIGLIETTO',
    cards:'CARD',
    initiatives:'IDEA_PROGETTO',
    idea:'IDEA_PROGETTO',
    contacts:'CONTATTO',
    story:'COMMUNITY',
    fan:'COMMUNITY',
    fantasy:'COMMUNITY'
  };
  return map[k] || 'CONTATTO';
}

function r216AppendByHeader_(sheetName, data) {
  var ss = SpreadsheetApp.openById(SCD.CORE_ID);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Foglio mancante: ' + sheetName);
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(String);
  sh.appendRow(headers.map(function(h) {
    var k = String(h || '').trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(data,k) ? data[k] : '';
  }));
}

function r216PublicRequest_(payload, type) {
  payload = payload || {};
  var name = clean_(payload.name || '', 180);
  var email = email_(payload.email || '');
  var phone = clean_(payload.phone || '', 80);
  if (!name || !validEmail_(email) || !phone) throw new Error('Nome, email e telefono sono obbligatori.');
  if (payload.privacy !== true) throw new Error('Devi accettare l informativa privacy.');

  var id = 'REQ-' + Utilities.getUuid().slice(0,8).toUpperCase();
  var now = new Date();
  r216AppendByHeader_('APP PUBLIC REQUESTS', {
    REQUEST_ID:id,
    CREATED_AT:now,
    TYPE:type || 'CONTATTO',
    STATUS:'NUOVA',
    NOME:name,
    EMAIL:email,
    TELEFONO:phone,
    OGGETTO:clean_(payload.topic || payload.subject || payload.kind || 'Richiesta Super App', 250),
    DETTAGLI:clean_(payload.message || payload.details || '', 4000),
    CATEGORIA:clean_(payload.category || '', 120),
    SQUADRA_ANNATA:clean_(payload.team || '', 120),
    DATA_RICHIESTA:clean_(payload.date || '', 80),
    FASCIA_ORARIA:clean_(payload.time || payload.timeRange || '', 80),
    NUM_PERSONE:payload.people || payload.passengers || '',
    EVENT_ID:clean_(payload.eventId || '', 120),
    CARD_TYPE:clean_(payload.cardType || '', 120),
    PACKAGE:clean_(payload.package || '', 120),
    CONSENSO_PRIVACY:'SI',
    SOURCE:'SCD SUPER APP',
    UPDATED_AT:now,
    UPDATED_BY:email,
    NOTE:'R21.7 · kind=' + clean_(payload.kind || '', 80)
  });
  try {
    MailApp.sendEmail('sportclubcolico@gmail.com','[SCD APP] '+(type || 'CONTATTO')+' · '+id,
      'ID: '+id+'\nTipo: '+(type || 'CONTATTO')+'\nNome: '+name+'\nEmail: '+email+'\nTelefono: '+phone+'\nOggetto: '+(payload.topic || '')+'\n\n'+(payload.message || ''));
  } catch (mailErr) { console.error('R21 request notify',mailErr); }
  return {requestId:id,status:'NUOVA',type:type || 'CONTATTO',stored:true};
}

function r216MyRequests_(token) {
  if (!token) throw new Error('Sessione mancante');
  var actor = sessionActor_(token);
  if (!actor || !actor.email) throw new Error('Sessione non valida');
  var t = table_(sheet_(SCD.CORE_ID,'APP PUBLIC REQUESTS'));
  return (t.rows || []).filter(function(r) {
    return email_(r.EMAIL) === email_(actor.email);
  }).slice(-50).reverse().map(function(r) {
    return {id:r.REQUEST_ID,createdAt:r.CREATED_AT,type:r.TYPE,status:r.STATUS,topic:r.OGGETTO,updatedAt:r.UPDATED_AT,note:r.NOTE};
  });
}
