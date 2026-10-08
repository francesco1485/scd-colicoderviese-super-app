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
      case 'public.identity.resolve':
        if (typeof r56PublicIdentityResolve_ !== 'function') throw new Error('Modulo identita R56 non installato');
        data = r56PublicIdentityResolve_(payload);
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
      case 'auth.identity.resolve':
        if (typeof r56ResolveMyIdentity_ !== 'function') throw new Error('Modulo identita R56 non installato');
        data = r56ResolveMyIdentity_(token || payload.token, payload);
        break;
      case 'auth.access.log':
        if (typeof r56RecordAccess_ !== 'function') throw new Error('Modulo accessi R56 non installato');
        data = r56RecordAccess_(token || payload.token, payload);
        break;
      case 'dashboard.summary':
      case 'private.dashboard':
        data = getAppData(token);
        break;
      case 'account.requests':
        data = r216MyRequests_(token);
        break;
      case 'private.user.workspace':
        data = r216UserWorkspace_(token);
        break;
      case 'private.crm.leadInbox':
        data = r216SponsorLeadInbox_(token, payload);
        break;
      case 'private.crm.proposalDraft.create':
        if (typeof r60CreateSponsorProposalDraft_ !== 'function') throw new Error('Modulo proposte R60 non installato');
        data = r60CreateSponsorProposalDraft_(token, payload);
        break;
      case 'private.crm.summary':
        data = r216CrmSummary_(token, payload);
        break;
      case 'private.crm.detail':
        data = r216CrmDetail_(token, payload);
        break;
      case 'private.community.summary':
        data = r216CommunitySummary_(token, payload);
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
      case 'private.communication.health':
        data = r216CommunicationHealth_(token);
        break;
      case 'private.agenda.summary':
        data = r216AgendaSummary_(token, payload);
        break;
      case 'private.agenda.create':
        data = r216AgendaCreate_(token, payload);
        break;
      case 'private.development.summary':
        data = r216DevelopmentSummary_(token, payload);
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
      case 'direction.access.invite':
        if (typeof r56InviteAccess_ !== 'function') throw new Error('Modulo inviti R56 non installato');
        data = r56InviteAccess_(token, payload);
        break;
      case 'direction.access.metrics':
        if (typeof r56AccessMetrics_ !== 'function') throw new Error('Modulo metriche R56 non installato');
        data = r56AccessMetrics_(token, payload);
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

/* Workbook authority verified against SCD_SYSTEM_MANIFEST source_registry.
 * Requests and APP AUDIT belong to R20 Core; relational/commercial masters
 * belong to SCD Operativo Pilota. Do not use the same-named request tab in Pilota.
 */
function r216CanonicalWorkbookId_(sheetName) {
  var name = String(sheetName || '').trim().toUpperCase();
  var operationalTabs = [
    'UTENTI','UTENTI_AREE','STAKEHOLDERS_MASTER','TOUCHPOINTS_MASTER','TASKS_MASTER',
    'COMMERCIALE_OPPORTUNITA','SPONSOR_CONTRATTI','INIZIATIVE_COMMERCIALI',
    'FORNITORI_SPONSOR_RADAR','EMAIL_TEMPLATE','FIRME_RUOLI','MAIL_ARCHIVIO',
    'DATA_LINEAGE','SOCIETA_PROFILE'
  ];
  if (operationalTabs.indexOf(name) >= 0) {
    var configured = '';
    if(typeof PropertiesService !== 'undefined' && typeof PropertiesService.getScriptProperties === 'function'){
      configured = String(PropertiesService.getScriptProperties().getProperty('SCD_OPERATIVO_PILOTA_ID') || '').trim();
    }
    return configured || '1jb5Jt1ZYzJA-3oQd85AmwVhAoFQpBPfcsy4HupBzDFA';
  }
  var coreId = SCD && SCD.CORE_ID ? String(SCD.CORE_ID).trim() : '';
  if (!coreId) throw new Error('R20 Core workbook non configurato.');
  return coreId;
}

function r216AppendByHeader_(sheetName, data) {
  var ss = SpreadsheetApp.openById(r216CanonicalWorkbookId_(sheetName));
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
  var notificationSent = false;
  var notificationError = '';
  try {
    MailApp.sendEmail('sportclubcolico@gmail.com','[SCD APP] '+(type || 'CONTATTO')+' · '+id,
      'ID: '+id+'\nTipo: '+(type || 'CONTATTO')+'\nNome: '+name+'\nEmail: '+email+'\nTelefono: '+phone+'\nOggetto: '+(payload.topic || '')+'\n\n'+(payload.message || ''));
    notificationSent = true;
  } catch (mailErr) {
    notificationError = String(mailErr && mailErr.message ? mailErr.message : mailErr);
    console.error('R21 request notify',notificationError);
  }
  return {
    requestId:id,status:'NUOVA',type:type || 'CONTATTO',stored:true,
    notificationSent:notificationSent,
    notificationError:notificationError,
    mailQuotaRemaining:MailApp.getRemainingDailyQuota()
  };
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
  var t = table_(sheet_(r216CanonicalWorkbookId_(name), name));
  return t && t.rows ? t.rows : [];
}
function r216CrmDateMs_(value) {
  if (!value) return 0;
  var d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
/* SCD GROW: read only bridge to canonical sponsor requests and stakeholders. */
function r216SponsorLeadInbox_(token,payload){
  var actor=r216CrmActor_(token);
  var mail=email_(actor.email||'');
  var user=r216UserRow_(actor);
  var role=r216Upper_([user.RUOLO||'',user['AREE PREVISTE']||'',user.DEFAULT_MODULES||'',actor.role||''].join(' '));
  var active=r216Upper_(user.STATO||user.STATUS||'');
  if(mail!=='sportclubcolico@gmail.com'&&(!user.EMAIL||active!=='ATTIVO'||!/DIREZIONE|ADMIN|COMMERCIALE|SPONSOR|MARKETING/.test(role)))throw new Error('SPONSOR_SCOPE_REQUIRED');
  payload=payload||{};
  var limit=Math.max(1,Math.min(250,Number(payload.limit||100)));
  var requests=r216CrmTable_('APP PUBLIC REQUESTS').filter(function(r){
    return r216Upper_(r.TYPE||'')==='SPONSOR';
  }).slice(-limit).map(function(r){
    return {
      REQUEST_ID:r.REQUEST_ID,TYPE:r.TYPE,STATUS:r.STATUS,CREATED_AT:r.CREATED_AT,
      NOME:r.NOME,EMAIL:r.EMAIL,TELEFONO:r.TELEFONO,OGGETTO:r.OGGETTO,CATEGORIA:r.CATEGORIA
    };
  });
  var stakeholders=r216CrmTable_('STAKEHOLDERS_MASTER').map(function(r){
    return {STAKEHOLDER_ID:r.STAKEHOLDER_ID,EMAIL:r.EMAIL,CONTACT_POLICY:r.CONTACT_POLICY};
  });
  return {requests:requests,stakeholders:stakeholders,readOnly:true,source:'R20',generatedAt:new Date()};
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

function r216DevelopmentSummary_(token, payload) {
  r216CrmActor_(token);
  payload = payload || {};
  var initiatives = r216CrmTable_('INIZIATIVE_COMMERCIALI');
  var suppliers = r216CrmTable_('FORNITORI_SPONSOR_RADAR');
  var stakeholders = r216CrmTable_('STAKEHOLDERS_MASTER');
  function developmentAlias_(value){
    return String(value||'').toUpperCase()
      .replace(/\b(S\.?R\.?L\.?|S\.?P\.?A\.?|SAS|SNC|ITALIA)\b/g,' ')
      .replace(/[^A-Z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  var supplierByAlias = {};
  suppliers.forEach(function(r){
    var key=developmentAlias_(r.AZIENDA||'');
    if(key && key.length>=4) supplierByAlias[key]=r;
  });
  var stakeholderByAlias = {};
  stakeholders.forEach(function(r){
    var key=developmentAlias_(r.NOME||'');
    if(key && key.length>=4) stakeholderByAlias[key]=r;
  });
  function supplierRefByAlias_(key){
    var s=supplierByAlias[key]||null;
    var st=stakeholderByAlias[key]||null;
    if(!s && !st) return null;
    return {
      supplierId:s ? String(s.SUPPLIER_ID||'') : '',
      stakeholderId:st ? String(st.STAKEHOLDER_ID||'') : '',
      name:String((s&&s.AZIENDA)||(st&&st.NOME)||key||''),
      relationshipStatus:String((s&&s.STATO_RAPPORTO)||(st&&st.STATO_RELAZIONE)||''),
      email:String((s&&s.EMAIL)||(st&&st.EMAIL)||''),
      contact:String((s&&s.CONTATTO)||''),
      commercialPosition:String((s&&s.POSIZIONE_COMMERCIALE)||''),
      sponsorPotential:String((s&&s.POTENZIALE_SPONSOR)||'')
    };
  }
  function collectRelatedSuppliers_(text){
    var hay=developmentAlias_(text);
    var out=[];
    var seen={};
    Object.keys(supplierByAlias).forEach(function(key){
      if(!key || !hay || hay.indexOf(key)<0 || seen[key]) return;
      var ref=supplierRefByAlias_(key);
      if(ref){out.push(ref);seen[key]=true;}
    });
    return out;
  }
  var rows = initiatives.filter(function(r){
    var id=String(r.INIT_ID||'').trim();
    return /^INIT-(CENTRO|FUTURE)-/.test(id) || id==='INIT-FONDO-SOLIDALE';
  }).map(function(r){
    var id=String(r.INIT_ID||'').trim();
    var status=String(r.STATO||'').trim();
    var docs=String(r.DOCUMENTI||'').trim();
    var partners=String(r.PARTNER_COLLEGABILI||'').trim();
    var related=collectRelatedSuppliers_([r.NOME,r.OBIETTIVO,partners,docs].join(' '));
    return {
      id:id,
      name:String(r.NOME||''),
      type:String(r.TIPO||''),
      target:String(r.TARGET||''),
      status:status,
      objective:String(r.OBIETTIVO||''),
      audience:String(r.PLATEA_TARGET||''),
      units:String(r.UNITA_ATTIVE||''),
      unitPrice:String(r.PREZZO_UNITARIO||''),
      expectedRevenue:String(r.RICAVO_ATTESO||''),
      realRevenue:String(r.RICAVO_REALE||''),
      partners:partners,
      channel:String(r.CANALE||''),
      startDate:String(r.DATA_INIZIO||''),
      endDate:String(r.DATA_FINE||''),
      owner:String(r.OWNER||''),
      documents:docs,
      isDrawer:/CASSETTO|ROADMAP FUTURA/i.test(status),
      quoteStatus:/PREVENTIVI RICEVUTI/i.test(status)?'RECEIVED_TO_RECONCILE':'',
      hasVerifiedCost:!!String(r.PREZZO_UNITARIO||r.RICAVO_ATTESO||r.RICAVO_REALE||'').trim(),
      requiresReconciliation:/DA RICONDURRE|DA VALUTARE|DA CONFERMARE|PREVENTIVI RICEVUTI/i.test([status,docs].join(' ')),
      relatedSuppliers:related
    };
  });
  rows.sort(function(a,b){
    if(a.isDrawer!==b.isDrawer) return a.isDrawer?1:-1;
    return a.name.localeCompare(b.name);
  });
  return {
    generatedAt:new Date(),
    sourceMode:'LIVE_MASTER',
    sourceTable:'INIZIATIVE_COMMERCIALI',
    supplierTable:'FORNITORI_SPONSOR_RADAR',
    rows:rows,
    kpi:{
      total:rows.length,
      drawer:rows.filter(function(x){return x.isDrawer}).length,
      quotesToReview:rows.filter(function(x){return x.quoteStatus==='RECEIVED_TO_RECONCILE'}).length,
      inTechnicalReview:rows.filter(function(x){return /CONFRONTO TECNICO/i.test(x.status)}).length,
      activeOrContracted:rows.filter(function(x){return /ATTIVO|CONTRATTUALIZZATO|ESECUZIONE|COMPLETATO/i.test(x.status)}).length
    },
    policy:{
      noInventedCosts:true,
      noInferredPartnership:true,
      futureDrawerIsNotImminent:true
    }
  };
}

function r216CommunitySummary_(token, payload) {
  r216CrmActor_(token);
  payload = payload || {};
  var rows = r216CrmTable_('CONVENZIONI_MASTER').filter(function(r) {
    return String(r.CONV_ID || '').trim() && String(r.AZIENDA || '').trim();
  }).map(function(r) {
    return {
      id:String(r.CONV_ID || ''),
      name:String(r.AZIENDA || ''),
      category:String(r.CATEGORIA || ''),
      status:String(r.STATO || ''),
      benefit:String(r.BENEFIT || ''),
      conditions:String(r.CONDIZIONI || ''),
      audience:String(r.DESTINATARI || ''),
      recognition:String(r.MODALITA_RICONOSCIMENTO || ''),
      territory:String(r.PUNTI_VENDITA_TERRITORIO || ''),
      startDate:String(r.DATA_INIZIO || ''),
      endDate:String(r.DATA_FINE || ''),
      contactName:String(r.REFERENTE || ''),
      contactEmail:String(r.EMAIL || ''),
      contactPhone:String(r.TELEFONO || ''),
      agreementDocument:String(r.DOCUMENTO_ACCORDO || ''),
      source:String(r.FONTE || ''),
      lastActivity:String(r.ULTIMA_ATTIVITA || ''),
      nextAction:String(r.PROSSIMA_AZIONE || ''),
      usageKpi:String(r.KPI_UTILIZZO || ''),
      linkedCard:String(r.CARD_COLLEGATA || ''),
      owner:String(r.OWNER || ''),
      flowId:String(r.FLOW_ID || ''),
      notes:String(r.NOTE || ''),
      updatedAt:String(r.UPDATED_AT || '')
    };
  });
  rows.sort(function(a,b){return a.name.localeCompare(b.name)});
  return {
    generatedAt:new Date(),
    sourceTable:'CONVENZIONI_MASTER',
    sourceMode:'LIVE_MASTER',
    rows:rows,
    kpi:{
      total:rows.length,
      formalized:rows.filter(function(x){return /ATTIVA|FORMALIZZATA|FIRMATA/.test(String(x.status||'').toUpperCase())}).length,
      pending:rows.filter(function(x){return /ATTIVAZIONE|FORMALIZZAZIONE|DA RICEVERE|DA FIRMARE/.test(String(x.status||'').toUpperCase())}).length,
      linkedToCard:rows.filter(function(x){return /^SI\b/i.test(String(x.linkedCard||''))}).length
    },
    policy:'NO_PUBLICATION_BEFORE_FORMALIZATION'
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
  var agreements = r216CrmTable_('SPONSOR_CONTRATTI').filter(function(r){
    return String(r['SPONSOR ID']||'')===id ||
      String(r.PARTNER||'').trim().toLowerCase()===String(stakeholder.NOME||'').trim().toLowerCase();
  });
  var relations = r216CrmTable_('RELAZIONI_MASTER').filter(function(r){
    return String(r.DA_ID||'')===id || String(r.A_ID||'')===id;
  });

  return {
    stakeholder:stakeholder,
    touchpoints:touchpoints.slice(0,100),
    tasks:tasks.slice(0,100),
    opportunities:opportunities.slice(0,50),
    agreements:agreements.slice(0,50),
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
  } else if(r216Upper_(sig.SIGN_MODE)==='ROLE'){
    var sigAccount=email_(sig.ACCOUNT_EMAIL||'');
    var actorAccount=email_(actor && actor.email || '');
    if(sigAccount && sigAccount!==actorAccount){
      throw new Error('Firma di ruolo non autorizzata per l account autenticato.');
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
    sender:String(c.profile.DEFAULT_FROM_EMAIL || 'sportclubcolico@gmail.com'),
    internalCopyTo:(email_(c.actor.email||'') && email_(c.actor.email||'') !== email_(c.profile.DEFAULT_FROM_EMAIL || 'sportclubcolico@gmail.com')) ? email_(c.actor.email||'') : ''
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
function r216CommunicationHealth_(token){
  var actor = r216CrmActor_(token);
  var profile = r216ProfileMap_();
  var configured = email_(profile.DEFAULT_FROM_EMAIL || 'sportclubcolico@gmail.com');
  var effective = email_(Session.getEffectiveUser().getEmail() || '');
  var archive = r216CrmTable_('MAIL_ARCHIVIO');
  var last = archive.length ? archive[archive.length-1] : {};
  return {
    ready:!!effective && effective===configured,
    configuredSender:configured,
    effectiveSender:effective,
    senderMatches:!!effective && effective===configured,
    remainingDailyQuota:MailApp.getRemainingDailyQuota(),
    lastMail:{
      id:String(last.MAIL_ID||''),
      status:String(last.STATUS||''),
      sentAt:String(last.SENT_AT||last.CREATED_AT||''),
      to:String(last.TO||''),
      subject:String(last.SUBJECT||''),
      error:String(last.ERROR||'')
    },
    actor:email_(actor && actor.email || ''),
    checkedAt:new Date()
  };
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
  var actorCopy = email_(c.actor && c.actor.email || '');
  if(actorCopy && actorCopy !== expected && actorCopy !== c.to) options.bcc = actorCopy;
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
  return {sent:true,mailId:mailId,to:c.to,subject:c.subject,signatureId:c.signature.SIGNATURE_ID,correlationId:corr,internalCopyTo:(options.bcc||'')};
}



/* R50.4 AGENDA SCD
 * Un solo calendario operativo Google, account autorizzati dal master UTENTI,
 * riepilogo obbligatorio alla casella istituzionale e audit di ogni creazione.
 */
function r216AgendaEligibleUsers_(actor){
  var actorEmail = email_(actor && actor.email || '');
  var rows = r216CrmTable_('UTENTI');
  return rows.filter(function(r){
    var mail = email_(r.EMAIL || '');
    if(!mail || r216Upper_(r.STATO || '') !== 'ATTIVO') return false;
    var scope = r216Upper_([
      r['AREE PREVISTE'] || '',
      r.DEFAULT_MODULES || '',
      r.DATA_SCOPE || '',
      r.RUOLO || ''
    ].join(' '));
    return mail === 'sportclubcolico@gmail.com' || mail === actorEmail || scope.indexOf('CALENDARIO') >= 0 || scope.indexOf('DIREZIONE') >= 0;
  }).map(function(r){
    return {
      email:email_(r.EMAIL || ''),
      name:String(r['NOME / ACCOUNT'] || r.EMAIL || ''),
      role:String(r.RUOLO || ''),
      calendarAuthorized:true
    };
  });
}
function r216AgendaProfile_(){
  var profile = r216ProfileMap_();
  var calendarId = String(profile.GOOGLE_CALENDAR_ID || '').trim();
  if(!calendarId) throw new Error('Calendario operativo SCD non configurato.');
  var cal = CalendarApp.getCalendarById(calendarId);
  if(!cal) throw new Error('Calendario operativo SCD non accessibile dal runtime.');
  return {
    profile:profile,
    calendar:cal,
    calendarId:calendarId,
    calendarName:String(profile.GOOGLE_CALENDAR_NAME || cal.getName() || 'Agenda SCD'),
    summaryEmail:email_(profile.AGENDA_SUMMARY_EMAIL || profile.DEFAULT_FROM_EMAIL || 'sportclubcolico@gmail.com')
  };
}
function r216AgendaSummary_(token,payload){
  var actor = r216CrmActor_(token);
  var ctx = r216AgendaProfile_();
  var now = new Date();
  var end = new Date(now.getTime() + 120*24*60*60*1000);
  var events = ctx.calendar.getEvents(now,end).slice(0,80).map(function(ev){
    var guests = [];
    try{ guests = ev.getGuestList().map(function(g){return email_(g.getEmail()||'');}).filter(Boolean); }catch(e){}
    return {
      id:String(ev.getId() || ''),
      title:String(ev.getTitle() || ''),
      startAt:ev.getStartTime(),
      endAt:ev.getEndTime(),
      location:String(ev.getLocation() || ''),
      description:clean_(ev.getDescription() || '',2000),
      guests:guests
    };
  });
  return {
    calendarId:ctx.calendarId,
    calendarName:ctx.calendarName,
    owner:'sportclubcolico@gmail.com',
    summaryRecipient:ctx.summaryEmail,
    inviteePolicy:String(ctx.profile.AGENDA_INVITEE_POLICY || 'UTENTI_ATTIVI_SCOPE_CALENDARIO'),
    eligibleUsers:r216AgendaEligibleUsers_(actor),
    upcoming:events,
    generatedAt:now
  };
}
function r216AgendaCreate_(token,payload){
  payload = payload || {};
  if(payload.confirm !== true) throw new Error('Conferma umana obbligatoria prima di creare l evento.');
  var actor = r216CrmActor_(token);
  var ctx = r216AgendaProfile_();
  var title = clean_(payload.title || '',140);
  var type = r216Upper_(payload.type || 'MEETING');
  var allowedTypes = ['MEETING','COMMERCIAL_INITIATIVE','CLUB_EVENT','DEADLINE'];
  if(allowedTypes.indexOf(type) < 0) throw new Error('Tipologia agenda non consentita.');
  var start = new Date(payload.startAt || '');
  var end = new Date(payload.endAt || '');
  if(!title || isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()){
    throw new Error('Titolo, inizio e fine validi sono obbligatori.');
  }
  var eligible = r216AgendaEligibleUsers_(actor);
  var allowed = {};
  eligible.forEach(function(u){allowed[email_(u.email)] = u;});
  var requested = Array.isArray(payload.invitees) ? payload.invitees.map(email_).filter(Boolean) : [];
  var mode = r216Upper_(payload.audienceMode || 'SELECTED');
  var guests = mode === 'ALL_AUTHORIZED'
    ? Object.keys(allowed)
    : requested.filter(function(mail){return !!allowed[mail];});
  var actorEmail = email_(actor.email || '');
  if(actorEmail && actorEmail !== 'sportclubcolico@gmail.com' && allowed[actorEmail] && guests.indexOf(actorEmail)<0) guests.push(actorEmail);
  guests = guests.filter(function(mail){return mail !== 'sportclubcolico@gmail.com';}).filter(function(mail,i,a){return a.indexOf(mail)===i;});
  var corr = clean_(payload.correlationId || ('FLOW-AGENDA-' + Utilities.getUuid().slice(0,8).toUpperCase()),120);
  var project = clean_(payload.project || '',250);
  var location = clean_(payload.location || '',300);
  var actionRequired = clean_(payload.actionRequired || '',1600);
  var description = clean_(payload.description || '',3000);
  var stakeholderId = clean_(payload.stakeholderId || '',120);
  var eventDescription = [
    'AGENDA SCD',
    'Tipo: '+type,
    'Progetto / sponsor: '+project,
    'Creato da: '+actorEmail,
    'Cosa preparare: '+actionRequired,
    '',
    description,
    '',
    'Correlation ID: '+corr
  ].join('\n');
  var event = ctx.calendar.createEvent(title,start,end,{
    description:eventDescription,
    location:location,
    guests:guests.join(','),
    sendInvites:guests.length>0
  });
  var summaryBody = [
    'Nuovo appuntamento / iniziativa SCD',
    '',
    'Titolo: '+title,
    'Tipo: '+type,
    'Inizio: '+start,
    'Fine: '+end,
    'Luogo: '+location,
    'Progetto / sponsor: '+project,
    'Creato da: '+actorEmail,
    'Invitati: '+(guests.join(', ') || 'nessun invito aggiuntivo'),
    'Cosa preparare: '+actionRequired,
    '',
    'Note:',
    description,
    '',
    'Event ID: '+String(event.getId()||''),
    'Correlation ID: '+corr
  ].join('\n');
  try{
    MailApp.sendEmail(ctx.summaryEmail,'[AGENDA SCD] '+title,summaryBody);
  }catch(mailErr){
    try{event.deleteEvent();}catch(deleteErr){}
    throw new Error('Evento non confermato: riepilogo istituzionale non inviato. '+String(mailErr && mailErr.message ? mailErr.message : mailErr));
  }
  r216AppendByHeader_('DATA_LINEAGE',{
    LINEAGE_ID:'DL-AGENDA-' + Utilities.getUuid().slice(0,8).toUpperCase(),
    TIMESTAMP:new Date(),FLOW:'AGENDA_SCD',SOURCE:'GOOGLE_CALENDAR',SOURCE_ID:String(event.getId()||''),
    PROCESSOR:'CRM AGENDA R50.4',TRANSFORMATION:'Evento operativo + inviti autorizzati + riepilogo istituzionale',
    DESTINATION:'SCD_GOOGLE_CALENDAR',ENTITY_TYPE:'EVENT',ENTITY_ID:String(event.getId()||''),
    KPI_IMPACT:'COORDINAMENTO',ACTOR:actorEmail,STATUS:'SYNCED',CORRELATION_ID:corr,
    NOTES:'Calendario canonico '+ctx.calendarId
  });
  if(stakeholderId){
    r216AppendByHeader_('TOUCHPOINTS_MASTER',{
      TOUCHPOINT_ID:'TP-' + Utilities.getUuid().slice(0,8).toUpperCase(),
      TIMESTAMP:new Date(),STAKEHOLDER_ID:stakeholderId,CANALE:'INCONTRO',DIREZIONE:'INTERNA',
      OGGETTO:title,SINTESI:clean_(project+' · '+description,1200),SENTIMENT:'',ESITO:'PROGRAMMATO',
      PROSSIMA_AZIONE:actionRequired,SCADENZA:start,OWNER:actorEmail,FONTE:'GOOGLE_CALENDAR',
      ID_FONTE:String(event.getId()||''),CORRELATION_ID:corr,NOTE:'Agenda SCD R50.4'
    });
  }
  return {
    created:true,
    eventId:String(event.getId()||''),
    calendarId:ctx.calendarId,
    calendarName:ctx.calendarName,
    invited:guests,
    summarySent:true,
    summaryRecipient:ctx.summaryEmail,
    actor:actorEmail,
    correlationId:corr
  };
}


/* R40.5 USER WORKSPACE
 * Adatta il Private Desk leggendo UTENTI e UTENTI_AREE dal Source of Truth.
 */
function r216List_(value) {
  return String(value || '').split(/[;,]/).map(function(x){ return String(x || '').trim(); }).filter(Boolean);
}
function r216UserWorkspace_(token) {
  var actor = r216CrmActor_(token);
  var mail = email_(actor && actor.email || '');
  if (!mail) throw new Error('Utente non autenticato');

  var user = r216CrmTable_('UTENTI').filter(function(r){
    return email_(r.EMAIL || '') === mail && r216Upper_(r.STATO || 'ATTIVO') === 'ATTIVO';
  })[0];
  if (!user) throw new Error('Profilo utente non configurato');

  var areas = r216CrmTable_('UTENTI_AREE').filter(function(r){
    return email_(r.EMAIL || '') === mail && r216Bool_(r.ATTIVO);
  }).map(function(r){
    return {
      area:String(r.AREA || ''),
      canView:r216Bool_(r['PUÒ VEDERE']),
      canCreate:r216Bool_(r['PUÒ CREARE']),
      canEdit:r216Bool_(r['PUÒ MODIFICARE']),
      canApprove:r216Bool_(r['PUÒ APPROVARE']),
      canExport:r216Bool_(r['PUÒ ESPORTARE']),
      canAdmin:r216Bool_(r['PUÒ AMMINISTRARE']),
      expiresAt:String(r['SCADENZA ACCESSO'] || ''),
      note:String(r.NOTE || '')
    };
  });

  return {
    email:mail,
    name:String(user['NOME / ACCOUNT'] || ''),
    role:String(user.RUOLO || ''),
    status:String(user.STATO || ''),
    crmProfile:String(user.CRM_PROFILE || 'STANDARD'),
    homeView:String(user.HOME_VIEW || 'dashboard'),
    adaptiveUi:r216Bool_(user.ADAPTIVE_UI),
    personId:String(user.PERSON_ID || ''),
    signatureId:String(user.SIGNATURE_ID || ''),
    identityMode:String(user.IDENTITY_MODE || ''),
    privateDeskProfile:String(user.PRIVATE_DESK_PROFILE || 'STANDARD'),
    defaultModules:r216List_(user.DEFAULT_MODULES),
    communicationScope:r216List_(user.COMMUNICATION_SCOPE),
    dataScope:r216List_(user.DATA_SCOPE),
    areas:areas
  };
}
