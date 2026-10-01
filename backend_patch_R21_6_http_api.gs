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
      case 'private.crm.summary':
        data = r216CrmSummary_(token, payload);
        break;
      case 'private.crm.detail':
        data = r216CrmDetail_(token, payload);
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


/* R40.1 CRM RELAZIONALE SCD
 * Un solo stakeholder canonico; touchpoint, task e opportunita restano nei rispettivi master.
 * Nessuna azione esterna viene eseguita da queste funzioni.
 */
function r216CrmActor_(token) {
  if (!token) throw new Error('Sessione mancante');
  var actor = sessionActor_(token);
  if (!actor || !actor.email) throw new Error('Sessione non valida');
  return actor;
}
function r216CrmTable_(name) {
  var t = table_(sheet_(SCD.CORE_ID, name));
  return t && t.rows ? t.rows : [];
}
function r216CrmDateMs_(value) {
  if (!value) return 0;
  var d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
function r216CrmSummary_(token, payload) {
  r216CrmActor_(token);
  payload = payload || {};
  var limit = Math.max(1, Math.min(500, Number(payload.limit || 250)));
  var stakeholders = r216CrmTable_('STAKEHOLDERS_MASTER');
  var touchpoints = r216CrmTable_('TOUCHPOINTS_MASTER');
  var opportunities = r216CrmTable_('COMMERCIALE_OPPORTUNITA');
  var tasks = r216CrmTable_('TASKS_MASTER');

  var tpBy = {}, taskBy = {}, oppByName = {};
  touchpoints.forEach(function(r) {
    var id = String(r.STAKEHOLDER_ID || '');
    if (!id) return;
    (tpBy[id] = tpBy[id] || []).push(r);
  });
  tasks.forEach(function(r) {
    var id = String(r['ID ENTITA'] || r['ID ENTITÀ'] || '');
    if (!id) return;
    (taskBy[id] = taskBy[id] || []).push(r);
  });
  opportunities.forEach(function(r) {
    var name = String(r.PARTNER || '').trim().toLowerCase();
    if (!name) return;
    (oppByName[name] = oppByName[name] || []).push(r);
  });

  var rows = stakeholders.filter(function(r) {
    return String(r.STAKEHOLDER_ID || '').trim() && String(r.NOME || '').trim();
  }).map(function(r) {
    var id = String(r.STAKEHOLDER_ID || '');
    var tps = tpBy[id] || [];
    tps.sort(function(a,b){return r216CrmDateMs_(b.TIMESTAMP)-r216CrmDateMs_(a.TIMESTAMP)});
    var ownTasks = (taskBy[id] || []).filter(function(t){return String(t.STATO || '').toUpperCase() !== 'FATTO'});
    var opps = oppByName[String(r.NOME || '').trim().toLowerCase()] || [];
    return {
      id:id,
      type:String(r.TIPO || ''),
      name:String(r.NOME || ''),
      category:String(r.CATEGORIA || ''),
      area:String(r.AREA || ''),
      relationshipStatus:String(r.STATO_RELAZIONE || ''),
      owner:String(r.OWNER || ''),
      email:String(r.EMAIL || ''),
      phone:String(r.TELEFONO || ''),
      location:String(r.LOCALITA || ''),
      relationshipValue:String(r.VALORE_REL || ''),
      lastContact:String(r.ULTIMO_CONTATTO || ''),
      nextAction:String(r.PROSSIMA_AZIONE || ''),
      nextDeadline:String(r.PROSSIMA_SCADENZA || ''),
      preferredChannel:String(r.PREFERRED_CHANNEL || ''),
      contactPolicy:String(r.CONTACT_POLICY || ''),
      tags:String(r.CRM_TAGS || ''),
      profileUpdatedAt:String(r.PROFILE_UPDATED_AT || ''),
      touchpoints:tps.length,
      openTasks:ownTasks.length,
      opportunities:opps.length,
      lastTouchpoint:tps.length ? {
        timestamp:String(tps[0].TIMESTAMP || ''),
        channel:String(tps[0].CANALE || ''),
        subject:String(tps[0].OGGETTO || ''),
        outcome:String(tps[0].ESITO || '')
      } : null
    };
  });
  rows.sort(function(a,b) {
    var ad=r216CrmDateMs_(a.nextDeadline), bd=r216CrmDateMs_(b.nextDeadline);
    if (ad && bd && ad !== bd) return ad-bd;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.name.localeCompare(b.name);
  });
  var suspended = rows.filter(function(x){return /SOSPESO|NO_CONTACT/.test(String(x.contactPolicy||''))}).length;
  return {
    generatedAt:new Date(),
    rows:rows.slice(0,limit),
    kpi:{
      total:rows.length,
      active:rows.filter(function(x){return !/CHIUSA|NEGATIVA|PERSO/.test(String(x.relationshipStatus||'').toUpperCase())}).length,
      suspended:suspended,
      due:rows.filter(function(x){return !!x.nextDeadline}).length
    },
    policy:'READ_ONLY_RELATIONSHIP_VIEW'
  };
}
function r216CrmDetail_(token, payload) {
  r216CrmActor_(token);
  payload = payload || {};
  var id = String(payload.id || payload.stakeholderId || '').trim();
  if (!id) throw new Error('Stakeholder mancante');
  var stakeholder = r216CrmTable_('STAKEHOLDERS_MASTER').filter(function(r){return String(r.STAKEHOLDER_ID||'')===id})[0];
  if (!stakeholder) throw new Error('Stakeholder non trovato');

  var touchpoints = r216CrmTable_('TOUCHPOINTS_MASTER').filter(function(r){return String(r.STAKEHOLDER_ID||'')===id});
  touchpoints.sort(function(a,b){return r216CrmDateMs_(b.TIMESTAMP)-r216CrmDateMs_(a.TIMESTAMP)});
  var tasks = r216CrmTable_('TASKS_MASTER').filter(function(r){
    return String(r['ID ENTITA'] || r['ID ENTITÀ'] || '')===id;
  });
  var opportunities = r216CrmTable_('COMMERCIALE_OPPORTUNITA').filter(function(r){
    return String(r.PARTNER||'').trim().toLowerCase()===String(stakeholder.NOME||'').trim().toLowerCase();
  });
  var relations = r216CrmTable_('RELAZIONI_MASTER').filter(function(r){
    return String(r.DA_ID||'')===id || String(r.A_ID||'')===id;
  });

  return {
    stakeholder:stakeholder,
    touchpoints:touchpoints.slice(0,100),
    tasks:tasks.slice(0,100),
    opportunities:opportunities.slice(0,50),
    relations:relations.slice(0,100),
    safety:{
      contactPolicy:String(stakeholder.CONTACT_POLICY || ''),
      externalContactBlocked:/SOSPESO|NO_CONTACT/.test(String(stakeholder.CONTACT_POLICY || ''))
    }
  };
}
