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
      case 'private.communication.templates':
        data = r216CommunicationTemplates_(token, payload);
        break;
      case 'private.communication.preview':
        data = r216CommunicationPreview_(token, payload);
        break;
      case 'private.communication.send':
        data = r216CommunicationSend_(token, payload);
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


/* R40.2 COMMUNICATION ENGINE
 * Mittente istituzionale unico, firma risolta dalla sessione, template canonici,
 * blocco CONTACT_POLICY e audit completo. Nessun invio senza confirm=true.
 */
function r216Upper_(v){ return String(v == null ? '' : v).trim().toUpperCase(); }
function r216Bool_(v){ return v === true || r216Upper_(v) === 'TRUE' || r216Upper_(v) === 'SI'; }
function r216Html_(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function r216ProfileMap_(){
  var out = {};
  r216CrmTable_('SOCIETA_PROFILE').forEach(function(r){
    var k = String(r.KEY || '').trim();
    if(k) out[k] = String(r.VALUE == null ? '' : r.VALUE);
  });
  return out;
}
function r216UserRow_(actor){
  var mail = email_(actor && actor.email || '');
  return r216CrmTable_('UTENTI').filter(function(r){ return email_(r.EMAIL || '') === mail; })[0] || {};
}
function r216TemplateById_(id){
  var key = String(id || '').trim();
  var row = r216CrmTable_('EMAIL_TEMPLATE').filter(function(r){
    return String(r.TEMPLATE_ID || '').trim() === key && r216Bool_(r.ACTIVE);
  })[0];
  if(!row) throw new Error('Template email non disponibile: ' + key);
  return row;
}
function r216SignatureForActor_(actor,userRow,template){
  var rows = r216CrmTable_('FIRME_RUOLI').filter(function(r){ return r216Bool_(r.ACTIVE); });
  var configured = String(userRow.SIGNATURE_ID || '').trim();
  var sig = configured ? rows.filter(function(r){return String(r.SIGNATURE_ID||'')===configured})[0] : null;
  if(!sig){
    var mail = email_(actor && actor.email || '');
    sig = rows.filter(function(r){ return email_(r.ACCOUNT_EMAIL || '') === mail; })[0] || null;
  }
  if(!sig && template && template.DEFAULT_SIGNATURE_ID){
    var fallbackId = String(template.DEFAULT_SIGNATURE_ID || '').trim();
    var candidate = rows.filter(function(r){return String(r.SIGNATURE_ID||'')===fallbackId})[0] || null;
    if(candidate && (!candidate.ACCOUNT_EMAIL || email_(candidate.ACCOUNT_EMAIL)===email_(actor.email||''))) sig=candidate;
  }
  if(!sig) throw new Error('Firma non configurata per l account autenticato.');
  if(r216Upper_(sig.SIGN_MODE)==='PERSON'){
    var userPerson=String(userRow.PERSON_ID||'').trim();
    var sigPerson=String(sig.PERSON_ID||'').trim();
    if(!userPerson || !sigPerson || userPerson!==sigPerson){
      throw new Error('Firma personale non autorizzata: identita account/persona non coincidente.');
    }
  }
  if(!r216Bool_(sig.CAN_EXTERNAL_SEND)) throw new Error('Il profilo firma non e autorizzato a comunicazioni esterne.');
  return sig;
}
function r216ActorAllowedForTemplate_(actor,userRow,template){
  var allowed = r216Upper_(template.ALLOWED_AREAS || 'TUTTE');
  if(!allowed || allowed.indexOf('TUTTE')>=0) return true;
  var hay = [
    userRow.RUOLO,userRow['AREE PREVISTE'],actor && actor.role,actor && actor.type
  ].map(r216Upper_).join(' | ');
  var tokens = allowed.split('|').map(function(x){return x.trim();}).filter(String);
  var ok = tokens.some(function(t){return hay.indexOf(t)>=0;});
  if(!ok) throw new Error('Il ruolo autenticato non e autorizzato per questo template.');
  return true;
}
function r216StakeholderForCommunication_(payload){
  var id = String(payload.stakeholderId || payload.id || '').trim();
  if(!id) return null;
  var row = r216CrmTable_('STAKEHOLDERS_MASTER').filter(function(r){return String(r.STAKEHOLDER_ID||'')===id})[0];
  if(!row) throw new Error('Stakeholder non trovato.');
  var policy = r216Upper_(row.CONTACT_POLICY || '');
  if(policy.indexOf('SOSPESO')>=0 || policy.indexOf('NO_CONTACT')>=0){
    throw new Error('Contatto esterno bloccato dalla policy CRM: ' + (row.CONTACT_POLICY || policy));
  }
  return row;
}
function r216Vars_(payload,stakeholder){
  var vars = {};
  var src = payload.variables || {};
  Object.keys(src).forEach(function(k){ vars[r216Upper_(k)] = String(src[k] == null ? '' : src[k]); });
  if(stakeholder){
    if(!vars.NOME_DESTINATARIO) vars.NOME_DESTINATARIO = String(stakeholder.NOME || '');
    if(!vars.PARTNER) vars.PARTNER = String(stakeholder.NOME || '');
    if(!vars.AZIENDA) vars.AZIENDA = String(stakeholder.NOME || '');
  }
  ['MESSAGGIO','PROGETTO','OGGETTO','PRATICA','ATLETA','EVENTO','ENTE','PARTNER','NOME_DESTINATARIO'].forEach(function(k){
    if(payload[k.toLowerCase()] != null && !vars[k]) vars[k] = String(payload[k.toLowerCase()]);
  });
  if(payload.message != null && !vars.MESSAGGIO) vars.MESSAGGIO = String(payload.message);
  if(payload.project != null && !vars.PROGETTO) vars.PROGETTO = String(payload.project);
  if(payload.subject != null && !vars.OGGETTO) vars.OGGETTO = String(payload.subject);
  return vars;
}
function r216Fill_(source,vars,html){
  return String(source || '').replace(/{{\s*([A-Z0-9_]+)\s*}}/gi,function(_,key){
    var v = String(vars[r216Upper_(key)] == null ? '' : vars[r216Upper_(key)]);
    if(!html) return v;
    return r216Html_(v).replace(/\n/g,'<br>');
  });
}
function r216LetterheadHtml_(profile,bodyHtml,signature){
  var legal = r216Html_(profile.LEGAL_FOOTER || '');
  var displayName = r216Html_(profile.LEGAL_NAME || profile.DISPLAY_NAME || 'S.D.C. Colicoderviese');
  var logo = profile.LOGO_DRIVE_ID ? '<img src="cid:scdLogo" alt="'+displayName+'" style="max-width:92px;height:auto;display:block">' : '';
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#16304d;max-width:760px;margin:0 auto">',
    '<div style="border-bottom:4px solid #0a2b54;padding:0 0 14px;margin-bottom:22px;display:flex;align-items:center;gap:16px">',
    logo,
    '<div><div style="font-size:20px;font-weight:700;color:#061b35">',displayName,'</div>',
    '<div style="font-size:12px;color:#52687d">Societa sportiva · persone · territorio · organizzazione</div></div></div>',
    '<div style="font-size:15px;line-height:1.65">',bodyHtml,'</div>',
    '<div style="margin-top:26px;padding-top:16px;border-top:1px solid #dfe7ef;font-size:14px;line-height:1.5">',String(signature.HTML_SIGNATURE || ''),'</div>',
    '<div style="margin-top:18px;padding:12px;background:#f4f7fa;border-radius:8px;font-size:10px;line-height:1.45;color:#607489">',legal,'</div>',
    '</div>'
  ].join('');
}
function r216CommunicationContext_(token,payload){
  var actor = r216CrmActor_(token);
  var userRow = r216UserRow_(actor);
  var template = r216TemplateById_(payload.templateId || payload.template || 'EML-GENERAL-REPLY');
  r216ActorAllowedForTemplate_(actor,userRow,template);
  var sig = r216SignatureForActor_(actor,userRow,template);
  var stakeholder = r216StakeholderForCommunication_(payload);
  var to = email_(payload.to || (stakeholder && stakeholder.EMAIL) || '');
  if(!to || !validEmail_(to)) throw new Error('Destinatario email mancante o non valido.');
  var vars = r216Vars_(payload,stakeholder);
  var subject = clean_(r216Fill_(template.SUBJECT_TEMPLATE || '',vars,false),250);
  var text = r216Fill_(template.BODY_TEXT_TEMPLATE || '',vars,false).trim();
  var body = r216Fill_(template.BODY_HTML_TEMPLATE || '',vars,true).trim();
  if(!subject) throw new Error('Oggetto email mancante.');
  if(!text && !body) throw new Error('Corpo email mancante.');
  var profile = r216ProfileMap_();
  var html = r216LetterheadHtml_(profile,body || r216Html_(text).replace(/\n/g,'<br>'),sig);
  var fullText = (text || String(body).replace(/<[^>]+>/g,' ')) + '\n\n' +
    String(sig.DISPLAY_NAME || '') + '\n' + String(sig.ROLE_LABEL || '') + '\n' + String(profile.LEGAL_NAME || profile.DISPLAY_NAME || 'S.D.C. Colicoderviese') + '\n' +
    String(profile.LEGAL_FOOTER || '');
  return {actor:actor,userRow:userRow,template:template,signature:sig,stakeholder:stakeholder,to:to,subject:subject,text:fullText,html:html,profile:profile};
}
function r216CommunicationTemplates_(token,payload){
  var actor = r216CrmActor_(token);
  var userRow = r216UserRow_(actor);
  var rows = r216CrmTable_('EMAIL_TEMPLATE').filter(function(r){return r216Bool_(r.ACTIVE);});
  return rows.filter(function(r){
    try{r216ActorAllowedForTemplate_(actor,userRow,r);return true;}catch(e){return false;}
  }).map(function(r){
    return {
      id:String(r.TEMPLATE_ID||''),category:String(r.CATEGORY||''),name:String(r.NAME||''),
      approvalMode:String(r.APPROVAL_MODE||''),allowedAreas:String(r.ALLOWED_AREAS||'')
    };
  });
}
function r216CommunicationPreview_(token,payload){
  payload = payload || {};
  var c = r216CommunicationContext_(token,payload);
  return {
    to:c.to,subject:c.subject,html:c.html,text:c.text,
    template:{id:c.template.TEMPLATE_ID,name:c.template.NAME,category:c.template.CATEGORY},
    signature:{id:c.signature.SIGNATURE_ID,name:c.signature.DISPLAY_NAME,role:c.signature.ROLE_LABEL},
    stakeholderId:c.stakeholder ? String(c.stakeholder.STAKEHOLDER_ID||'') : '',
    requiresHumanConfirmation:true,
    sender:String(c.profile.DEFAULT_FROM_EMAIL || 'sportclubcolico@gmail.com')
  };
}
function r216UpdateStakeholderAfterMail_(stakeholder,payload,now){
  if(!stakeholder) return;
  var sh = sheet_(SCD.CORE_ID,'STAKEHOLDERS_MASTER');
  var data = sh.getDataRange().getValues();
  if(!data.length) return;
  var headers = data[0].map(function(x){return r216Upper_(x)});
  var idCol = headers.indexOf('STAKEHOLDER_ID');
  var rowIndex = -1;
  for(var i=1;i<data.length;i++){
    if(String(data[i][idCol]||'')===String(stakeholder.STAKEHOLDER_ID||'')){rowIndex=i+1;break;}
  }
  if(rowIndex<2) return;
  function set(h,v){
    var col=headers.indexOf(h);
    if(col>=0 && v!==undefined) sh.getRange(rowIndex,col+1).setValue(v);
  }
  set('ULTIMO_CONTATTO',now);
  if(payload.nextAction) set('PROSSIMA_AZIONE',clean_(payload.nextAction,500));
  if(payload.nextDeadline) set('PROSSIMA_SCADENZA',clean_(payload.nextDeadline,80));
  set('PROFILE_UPDATED_AT',now);
}
function r216CommunicationSend_(token,payload){
  payload = payload || {};
  if(payload.confirm !== true) throw new Error('Conferma umana obbligatoria prima dell invio.');
  var c = r216CommunicationContext_(token,payload);
  var expected = email_(c.profile.DEFAULT_FROM_EMAIL || 'sportclubcolico@gmail.com');
  var effective = email_(Session.getEffectiveUser().getEmail() || '');
  if(!effective || effective !== expected){
    throw new Error('Runtime mittente non autorizzato. Atteso: ' + expected + '. Rilevato: ' + (effective || 'non disponibile'));
  }
  var options = {
    htmlBody:c.html,
    name:String(c.profile.DEFAULT_FROM_NAME || c.profile.DISPLAY_NAME || c.profile.LEGAL_NAME || 'S.D.C. Colicoderviese'),
    replyTo:String(c.signature.REPLY_TO || expected)
  };
  var cc = clean_(payload.cc || '',500);
  if(cc) options.cc = cc;
  var logoId = String(c.profile.LOGO_DRIVE_ID || '').trim();
  if(logoId){
    try{ options.inlineImages = {scdLogo:DriveApp.getFileById(logoId).getBlob()}; }catch(logoErr){ console.error('Logo email',logoErr); }
  }
  GmailApp.sendEmail(c.to,c.subject,c.text,options);

  var now = new Date();
  var mailId = 'MAIL-' + Utilities.getUuid().slice(0,8).toUpperCase();
  var corr = clean_(payload.correlationId || ('FLOW-' + mailId),120);
  r216AppendByHeader_('MAIL_ARCHIVIO',{
    MAIL_ID:mailId,CREATED_AT:now,DIRECTION:'OUTBOUND',FROM_ACCOUNT:expected,
    ACTOR_EMAIL:email_(c.actor.email||''),SIGNATURE_ID:String(c.signature.SIGNATURE_ID||''),
    ROLE:String(c.signature.ROLE_LABEL||''),TO:c.to,CC:cc,SUBJECT:c.subject,
    TEMPLATE_ID:String(c.template.TEMPLATE_ID||''),STAKEHOLDER_ID:c.stakeholder?String(c.stakeholder.STAKEHOLDER_ID||''):'',
    APPROVAL_STATUS:'CONFIRMED_BY_ACTOR',SENT_AT:now,GMAIL_MESSAGE_ID:'',STATUS:'SENT',ERROR:'',CORRELATION_ID:corr
  });
  if(c.stakeholder){
    r216AppendByHeader_('TOUCHPOINTS_MASTER',{
      TOUCHPOINT_ID:'TP-' + Utilities.getUuid().slice(0,8).toUpperCase(),
      TIMESTAMP:now,STAKEHOLDER_ID:String(c.stakeholder.STAKEHOLDER_ID||''),CANALE:'EMAIL',DIREZIONE:'OUTBOUND',
      OGGETTO:c.subject,SINTESI:clean_(c.text,1200),SENTIMENT:'',ESITO:'INVIATO',
      PROSSIMA_AZIONE:clean_(payload.nextAction||'',500),SCADENZA:clean_(payload.nextDeadline||'',80),
      OWNER:String(c.signature.DISPLAY_NAME||c.signature.ROLE_LABEL||''),FONTE:'CRM',ID_FONTE:mailId,
      CORRELATION_ID:corr,NOTE:'Invio confermato dall utente autenticato tramite Communication Engine R40.2.'
    });
    r216UpdateStakeholderAfterMail_(c.stakeholder,payload,now);
  }
  return {sent:true,mailId:mailId,to:c.to,subject:c.subject,signatureId:c.signature.SIGNATURE_ID,correlationId:corr};
}
