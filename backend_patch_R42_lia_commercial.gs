/**
 * SCD R42 LIA COMMERCIAL OPERATIONS
 * Comandi Drive e mapping territoriale riservati a Direzione/Admin.
 * Da installare nel progetto Apps Script R20 prima di abilitare le scritture Lia.
 */

var R42_LIA = {
  RELEASE:'R42.0',
  COMMERCIAL_ROOT_ID:'18SiudaLO9k1JnDeBoTKgy-nkjv_DgGyp',
  COMMERCIAL_ROOT_NAME:'02 SPONSOR E PARTNER',
  MAPPING_ROOT_ID:'1SN8wWjFni0haVda3ZMRFiRbJgTEvCU9d',
  MAPPING_FOLDER:'01 MAPPING TERRITORIALE',
  HANDOFF_ROOT_ID:'1HYg6ORHFDeZX2lfcH-_ZjBthCFOxEhbv',
  SPONSOR_MASTER_ID:'1-5-MUnrrAltflJSATe6bKkjm_3SItO0gvadi_PXPoAQ',
  CRM_SHEET:'CRM SPONSOR',
  PORTFOLIO_SHEET:'SPONSOR ATTIVI & ASSET',
  BRAND_SHEET:'LOGHI E BRAND',
  LED_SHEET:'LED CONTROL ROOM',
  SEASONS_SHEET:'SPONSOR STAGIONI',
  ACTIVATIONS_SHEET:'SPONSOR ATTIVAZIONI',
  CONTACTS_SHEET:'SPONSOR CONTATTI'
};

function r42RequireDirection_(token) {
  if (typeof r25RequireDirection_ === 'function') return r25RequireDirection_(token);
  if (!token) throw new Error('Sessione Direzione mancante');
  if (typeof getAppData !== 'function') throw new Error('R20 getAppData non disponibile');
  var data = getAppData(token) || {};
  var user = data.user || {};
  var permissions = data.permissions || {};
  var role = String(user.role || user.coreRole || user.type || '').toUpperCase();
  if (!(permissions.direction === true || role === 'DIREZIONE' || role === 'ADMIN')) {
    throw new Error('Funzione riservata alla Direzione');
  }
  return user;
}

function r42SafeName_(value, fallback) {
  var s = String(value == null ? '' : value)
    .replace(/[\\/:*?"<>|]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  if (!s) s = fallback || 'SENZA NOME';
  if (s.length > 120) s = s.slice(0,120);
  return s;
}

function r42GetOrCreateFolder_(parent, name) {
  var safe = r42SafeName_(name,'CARTELLA');
  var it = parent.getFoldersByName(safe);
  return it.hasNext() ? it.next() : parent.createFolder(safe);
}

function r42CommercialRoot_() {
  var folder = DriveApp.getFolderById(R42_LIA.COMMERCIAL_ROOT_ID);
  if (!folder) throw new Error('Radice commerciale SCD non disponibile');
  return folder;
}

function r42Audit_(actor, eventType, entityId, notes) {
  try {
    if (typeof r25EmitEvent_ === 'function') {
      r25EmitEvent_(
        eventType,
        'LIA_OPERATION',
        entityId || Utilities.getUuid(),
        'LIA_R42',
        'RECORDED',
        notes || '',
        typeof r25HexDigest_ === 'function' ? r25HexDigest_([eventType,entityId,notes].join('|')) : ''
      );
      return;
    }
  } catch (_) {}
  console.log(JSON.stringify({
    release:R42_LIA.RELEASE,
    eventType:eventType,
    actor:actor && (actor.email || actor.name || ''),
    entityId:entityId || '',
    notes:notes || '',
    at:new Date().toISOString()
  }));
}

function r42CreateDriveFolder_(token, payload) {
  var actor = r42RequireDirection_(token);
  payload = payload || {};
  var path = Array.isArray(payload.path) ? payload.path : [];
  if (!path.length || path.length > 8) throw new Error('Percorso cartella non valido');

  var folder = r42CommercialRoot_();
  var createdPath = [R42_LIA.COMMERCIAL_ROOT_NAME];
  path.forEach(function(part) {
    var safe = r42SafeName_(part,'CARTELLA');
    folder = r42GetOrCreateFolder_(folder, safe);
    createdPath.push(safe);
  });

  r42Audit_(actor,'LIA_DRIVE_FOLDER_READY',folder.getId(),createdPath.join(' / '));
  return {
    ok:true,
    release:R42_LIA.RELEASE,
    folderId:folder.getId(),
    folderName:folder.getName(),
    path:createdPath,
    url:folder.getUrl(),
    purpose:String(payload.purpose || '').slice(0,500)
  };
}

function r42MappingHeaders_() {
  return [
    'SOURCE','SOURCE_ID','NOME','CATEGORIA','SITO','TELEFONO','EMAIL',
    'INDIRIZZO','LAT','LON','STATO_RICERCA','FIT_COMMERCIALE','NEXT_ACTION','NOTE'
  ];
}

function r42SaveCommercialMapping_(token, payload) {
  var actor = r42RequireDirection_(token);
  payload = payload || {};
  var municipality = r42SafeName_(payload.municipality,'COMUNE');
  var items = Array.isArray(payload.items) ? payload.items.slice(0,500) : [];
  if (!items.length) throw new Error('Nessuna riga di mapping da salvare');

  var root = r42CommercialRoot_();
  var mappingRoot = DriveApp.getFolderById(R42_LIA.MAPPING_ROOT_ID);
  if (!mappingRoot) mappingRoot = r42GetOrCreateFolder_(root,R42_LIA.MAPPING_FOLDER);
  var municipalityFolder = r42GetOrCreateFolder_(mappingRoot,municipality);

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Rome', 'yyyyMMdd_HHmmss');
  var fileName = 'MAPPING AZIENDALE - ' + municipality + ' - ' + stamp;
  var ss = SpreadsheetApp.create(fileName);
  var file = DriveApp.getFileById(ss.getId());
  file.moveTo(municipalityFolder);

  var sh = ss.getSheets()[0];
  sh.setName('AZIENDE E ATTIVITA');
  var headers = r42MappingHeaders_();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);

  var rows = items.map(function(x) {
    return [
      String(x.source || ''),
      String(x.sourceId || ''),
      String(x.name || ''),
      String(x.category || ''),
      String(x.website || ''),
      String(x.phone || ''),
      String(x.email || ''),
      String(x.address || ''),
      x.lat == null ? '' : x.lat,
      x.lon == null ? '' : x.lon,
      'DA QUALIFICARE',
      '',
      'Verificare sito/referente e coerenza con asset SCD prima di contatto',
      ''
    ];
  });
  sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  sh.autoResizeColumns(1,headers.length);

  var info = ss.insertSheet('PROVENIENZA');
  info.getRange(1,1,9,2).setValues([
    ['CAMPO','VALORE'],
    ['COMUNE',municipality],
    ['GENERATO_IL',String(payload.generatedAt || new Date().toISOString())],
    ['FONTE',String(payload.source || 'OPENSTREETMAP_OVERPASS')],
    ['ATTRIBUZIONE',String(payload.attribution || '© OpenStreetMap contributors · ODbL')],
    ['COPERTURA',String(payload.coverage || 'PARTIAL_NOT_EXHAUSTIVE')],
    ['RIGHE',rows.length],
    ['REGOLA','La presenza in elenco non implica interesse commerciale o disponibilita a sponsorizzare.'],
    ['OPERATORE',String(actor.email || actor.name || 'DIREZIONE')]
  ]);
  info.autoResizeColumns(1,2);

  var rawName = 'mapping_' + municipality.replace(/[^a-zA-Z0-9_-]/g,'_') + '_' + stamp + '.json';
  municipalityFolder.createFile(rawName, JSON.stringify({
    municipality:municipality,
    generatedAt:payload.generatedAt || new Date().toISOString(),
    source:payload.source || 'OPENSTREETMAP_OVERPASS',
    attribution:payload.attribution || '© OpenStreetMap contributors · ODbL',
    coverage:payload.coverage || 'PARTIAL_NOT_EXHAUSTIVE',
    items:items
  },null,2), MimeType.PLAIN_TEXT);

  r42Audit_(actor,'LIA_COMMERCIAL_MAPPING_SAVED',ss.getId(),municipality + ' · ' + rows.length + ' righe');
  return {
    ok:true,
    release:R42_LIA.RELEASE,
    municipality:municipality,
    count:rows.length,
    folderId:municipalityFolder.getId(),
    folderUrl:municipalityFolder.getUrl(),
    spreadsheetId:ss.getId(),
    spreadsheetUrl:ss.getUrl(),
    fileName:fileName,
    source:String(payload.source || 'OPENSTREETMAP_OVERPASS'),
    coverage:String(payload.coverage || 'PARTIAL_NOT_EXHAUSTIVE')
  };
}


function r42RequireInternal_(token) {
  if (!token) throw new Error('Sessione SCD mancante');
  if (typeof sessionActor_ !== 'function') throw new Error('R20 sessionActor non disponibile');
  var actor = sessionActor_(token);
  var role = String((actor && (actor.role || actor.coreRole || actor.type)) || '').toUpperCase();
  var internalRoles = ['MISTER','STAFF','MANAGER','DIRIGENTE','SEGRETERIA','SECRETARIAT','TESSERAMENTI','REGISTRATION','TORNEI','TOURNAMENTS','DIREZIONE','ADMIN','DG'];
  var ok = !!(actor && (actor.staff || (actor.permissions && actor.permissions.direction) || internalRoles.indexOf(role) >= 0));
  if (!ok) throw new Error('Handoff Lia disponibile solo agli utenti interni autorizzati');
  return actor;
}

function r42SafeHandoffRef_(ref) {
  ref = ref || {};
  return {
    name: clean_(ref.name || '', 180),
    type: clean_(ref.type || '', 80),
    id: clean_(ref.id || ref.fileId || '', 180),
    url: clean_(ref.url || '', 700)
  };
}

function r42SaveLiaHandoff_(token, payload) {
  var actor = r42RequireInternal_(token);
  payload = payload || {};
  var command = clean_(payload.command || '', 5000);
  if (!command) throw new Error('Comando Lia mancante');

  var refs = Array.isArray(payload.refs) ? payload.refs.slice(0, 20).map(r42SafeHandoffRef_) : [];
  var packet = {
    schema: 'SCD_LIA_HANDOFF_V1',
    createdAt: new Date().toISOString(),
    status: 'PENDING_REMOTE_SUPPORT',
    assistant: 'LIA',
    destination: 'CHATGPT_REMOTE_SUPPORT',
    actor: {
      email: email_(actor.email || ''),
      role: clean_(actor.role || actor.coreRole || actor.type || '', 80),
      area: clean_(actor.area || '', 120)
    },
    command: command,
    context: {
      module: clean_(payload.module || 'LIA', 80),
      entityType: clean_(payload.entityType || '', 80),
      entityId: clean_(payload.entityId || '', 160),
      currentState: clean_(payload.currentState || '', 1000),
      requestedOutput: clean_(payload.requestedOutput || '', 1000)
    },
    refs: refs,
    rules: [
      'NO_PASSWORD_PIN_TOKEN_SECRET',
      'NO_SAFEGUARDING_IN_ORDINARY_HANDOFF',
      'USE_REFERENCED_SOURCES_OR_REQUEST_EXPLICIT_RESEARCH',
      'RETURN_TRACEABLE_OUTPUT'
    ]
  };

  var folder = DriveApp.getFolderById(R42_LIA.HANDOFF_ROOT_ID);
  if (!folder) throw new Error('Cartella Lia Remote Handoff non disponibile');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Rome', 'yyyyMMdd_HHmmss');
  var shortRole = r42SafeName_(packet.actor.role || 'INTERNAL','INTERNAL').replace(/\s+/g,'_');
  var fileName = 'LIA_HANDOFF_' + stamp + '_' + shortRole + '.json';
  var file = folder.createFile(fileName, JSON.stringify(packet, null, 2), MimeType.PLAIN_TEXT);

  r42Audit_(actor,'LIA_REMOTE_HANDOFF_CREATED',file.getId(),clean_(command,500));
  return {
    ok:true,
    handoffId:file.getId(),
    fileName:fileName,
    url:file.getUrl(),
    status:packet.status,
    createdAt:packet.createdAt
  };
}


/* =========================
 * R42 SPONSOR DOMAIN
 * ========================= */

function r42SponsorSheet_(name) {
  var ss = SpreadsheetApp.openById(R42_LIA.SPONSOR_MASTER_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Foglio Sponsor Master mancante: ' + name);
  return sh;
}

function r42RowsByHeader_(sheetName) {
  var sh = r42SponsorSheet_(sheetName);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  var values = sh.getRange(1,1,lastRow,lastCol).getDisplayValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = {};
    var hasValue = false;
    for (var col = 0; col < headers.length; col++) {
      var key = headers[col];
      if (!key) continue;
      var val = values[r][col];
      if (String(val || '').trim()) hasValue = true;
      row[key] = val;
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}

function r42AppendSponsorRow_(sheetName, data) {
  var sh = r42SponsorSheet_(sheetName);
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1,1,1,lastCol).getDisplayValues()[0];
  var row = headers.map(function(h){
    var key = String(h || '').trim();
    return Object.prototype.hasOwnProperty.call(data,key) ? data[key] : '';
  });
  sh.appendRow(row);
}

function r42IsDirection_(token) {
  var data = getAppData(token) || {};
  var user = data.user || {};
  var permissions = data.permissions || {};
  var role = String(user.role || user.coreRole || user.type || '').toUpperCase();
  return permissions.direction === true || role === 'DIREZIONE' || role === 'ADMIN' || role === 'DG';
}

function r42NormCompany_(value) {
  return String(value || '').toLowerCase()
    .replace(/[^a-z0-9à-ÿ]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function r42Num_(value) {
  if (value == null || value === '') return '';
  var n = Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));
  return isFinite(n) ? n : '';
}

function r42CommercialSnapshot_(token, payload) {
  var actor = r42RequireInternal_(token);
  var direction = r42IsDirection_(token);
  payload = payload || {};
  var maxRows = Math.max(1, Math.min(1000, Number(payload.limit || 500)));

  var crm = r42RowsByHeader_(R42_LIA.CRM_SHEET).slice(0,maxRows).map(function(r){
    return {
      id:r.ID || '',
      name:r.Azienda || '',
      sector:r.Settore || '',
      contact:r.Referente || '',
      email:r.Email || '',
      phone:r.Telefono || '',
      territory:r.Territorio || '',
      status:r['Stato trattativa'] || '',
      potentialValue:direction ? (r['Valore potenziale €'] || '') : '',
      assetProposed:r['Asset proposto'] || '',
      lastContact:r['Ultimo contatto'] || '',
      nextAction:r['Prossima azione'] || '',
      deadline:r.Scadenza || '',
      source:r.Fonte || '',
      notes:r.Note || ''
    };
  });

  var seasons = r42RowsByHeader_(R42_LIA.SEASONS_SHEET).slice(0,maxRows).map(function(r){
    return {
      id:r.SPONSOR_SEASON_ID || '',
      sponsorId:r.SPONSOR_ID || '',
      sponsorName:r.SPONSOR_NOME || '',
      season:r.STAGIONE || '',
      status:r.STATO_SPONSOR || '',
      start:r.DATA_INIZIO || '',
      end:r.DATA_FINE || '',
      renewal:r.RINNOVO_STATO || '',
      cash:direction ? (r.IMPORTO_CASH || '') : '',
      barter:direction ? (r.VALORE_BARTER || '') : '',
      total:direction ? (r.VALORE_TOTALE || '') : '',
      invoiced:direction ? (r.FATTURATO || '') : '',
      paid:direction ? (r.PAGATO || '') : '',
      residual:direction ? (r.RESIDUO || '') : '',
      contractId:r.CONTRATTO_ID || '',
      contractLink:r.CONTRATTO_LINK || '',
      owner:r.OWNER || '',
      notes:r.NOTE || ''
    };
  });

  var activations = r42RowsByHeader_(R42_LIA.ACTIVATIONS_SHEET).slice(0,maxRows).map(function(r){
    return {
      id:r.ACTIVATION_ID || '',
      sponsorId:r.SPONSOR_ID || '',
      sponsorName:r.SPONSOR_NOME || '',
      season:r.STAGIONE || '',
      type:r.TIPO_SPONSORIZZAZIONE || '',
      manualType:r.TIPO_MANUALE || '',
      assetId:r.ASSET_ID || '',
      description:r.ASSET_DESCRIZIONE || '',
      target:r.SQUADRA_EVENTO_STRUTTURA || '',
      start:r.DATA_INIZIO || '',
      end:r.DATA_FINE || '',
      status:r.STATO || '',
      cash:direction ? (r.IMPORTO_CASH || '') : '',
      barter:direction ? (r.VALORE_BARTER || '') : '',
      total:direction ? (r.VALORE_TOTALE || '') : '',
      directionOnly:String(r.RISERVATO_DIREZIONE || '').toUpperCase() === 'TRUE',
      contractLink:r.CONTRATTO_LINK || '',
      materialsLink:r.MATERIALI_LINK || '',
      ledStatus:r.LED_STATUS || '',
      proof:r.PROVA_ATTIVAZIONE || '',
      notes:r.NOTE || ''
    };
  }).filter(function(r){ return direction || !r.directionOnly; });

  var contacts = r42RowsByHeader_(R42_LIA.CONTACTS_SHEET).slice(0,maxRows).map(function(r){
    return {
      id:r.CONTACT_ID || '',
      sponsorId:r.SPONSOR_ID || '',
      sponsorName:r.SPONSOR_NOME || '',
      firstName:r.NOME || '',
      lastName:r.COGNOME || '',
      role:r.RUOLO || '',
      email:r.EMAIL || '',
      phone:r.TELEFONO || '',
      preferredChannel:r.CANALE_PREFERITO || '',
      primary:String(r.REFERENTE_PRINCIPALE || '').toUpperCase() === 'TRUE',
      firstContact:r.DATA_PRIMO_CONTATTO || '',
      lastContact:r.DATA_ULTIMO_CONTATTO || '',
      status:r.STATO_RELAZIONE || '',
      notes:r.NOTE || ''
    };
  });

  var portfolio = r42RowsByHeader_(R42_LIA.PORTFOLIO_SHEET).slice(0,maxRows).map(function(r){
    return {
      sponsorName:r['Sponsor / Partner'] || '',
      certainty:r['Stato di certezza'] || '',
      verifiedValue:direction ? (r['Valore verificato'] || '') : '',
      verifiedAsset:r['Asset / prestazione verificata'] || '',
      period:r['Periodo / durata'] || '',
      evidence:r.Evidenza || '',
      category:r['Categoria occupata'] || '',
      missing:r['Cosa manca'] || '',
      strategicAction:r['Azione strategica'] || '',
      portfolioClass:r['Classe portafoglio'] || '',
      renewalWindow:r['Finestra rinnovo'] || '',
      nextStep:r['Prossimo passo operativo'] || '',
      priority:r.Priorità || '',
      owner:r.Owner || ''
    };
  });

  var led = r42RowsByHeader_(R42_LIA.LED_SHEET).slice(0,maxRows).map(function(r){
    return {
      order:r.Ordine || '',
      sponsorName:r.Sponsor || '',
      category:r.Categoria || '',
      status:r['Stato operativo'] || '',
      priority:r.Priorita || '',
      driveFolder:r['Cartella Drive'] || '',
      logoState:r['Logo originale'] || '',
      contactsState:r['Contatti verificati'] || '',
      intelligence:r.Intelligence || '',
      masterMp4:r['Master MP4'] || '',
      preview:r['Preview campo'] || '',
      qc:r.QC || '',
      proposal:r['Proposta commerciale'] || '',
      approval:r['Approvazione sponsor'] || '',
      hardware:r['Mapping hardware'] || '',
      playlist:r.Playlist || '',
      blocker:r['Blocco attuale'] || ''
    };
  });

  var brands = r42RowsByHeader_(R42_LIA.BRAND_SHEET).slice(0,maxRows).map(function(r){
    return {
      sponsorName:r['Brand/Azienda'] || '',
      fileType:r['Tipo file'] || '',
      format:r.Formato || '',
      link:r['Link Drive/Gmail'] || '',
      source:r.Fonte || '',
      authorization:r['Utilizzo autorizzato da verificare'] || '',
      notes:r.Note || ''
    };
  });

  r42Audit_(actor,'COMMERCIAL_SNAPSHOT_READ','SPONSOR_MASTER','sponsors=' + crm.length + ' led=' + led.length);
  return {
    ok:true,
    release:R42_LIA.RELEASE,
    generatedAt:new Date().toISOString(),
    direction:direction,
    sponsors:crm,
    seasons:seasons,
    activations:activations,
    contacts:contacts,
    portfolio:portfolio,
    led:led,
    brands:brands
  };
}

function r42SponsorCreate_(token, payload) {
  var actor = r42RequireDirection_(token);
  payload = payload || {};
  var company = r42SafeName_(payload.company || payload.name,'');
  if (!company) throw new Error('Nome sponsor obbligatorio');

  var norm = r42NormCompany_(company);
  var rows = r42RowsByHeader_(R42_LIA.CRM_SHEET);
  for (var i=0;i<rows.length;i++) {
    if (r42NormCompany_(rows[i].Azienda) === norm) {
      throw new Error('Sponsor già presente nel Master: ' + company);
    }
  }

  var sponsorId = 'SP-WEB-' + Utilities.getUuid().slice(0,8).toUpperCase();
  var now = new Date();
  var types = Array.isArray(payload.types) ? payload.types.slice(0,20) : [];
  var manualType = r42SafeName_(payload.manualType || '','');
  var assetText = types.join(' + ');
  if (manualType) assetText += (assetText ? ' + ' : '') + manualType;

  r42AppendSponsorRow_(R42_LIA.CRM_SHEET,{
    ID:sponsorId,
    Azienda:company,
    Settore:r42SafeName_(payload.sector || 'DA CLASSIFICARE','DA CLASSIFICARE'),
    Referente:r42SafeName_(payload.contactName || '',''),
    Email:String(payload.email || '').trim().toLowerCase(),
    Telefono:r42SafeName_(payload.phone || '',''),
    Territorio:r42SafeName_(payload.territory || '',''),
    'Stato trattativa':payload.currentSponsor === true ? 'SPONSOR ATTIVO - DA COMPLETARE' : 'NUOVO - DA QUALIFICARE',
    'Valore potenziale €':r42Num_(payload.potentialValue),
    'Asset proposto':assetText,
    'Ultimo contatto':payload.contactName || payload.email || payload.phone ? now : '',
    'Prossima azione':'Completare scheda sponsor, verificare contratto/materiali e attivazioni.',
    Scadenza:'',
    Fonte:'SCD WEB APP',
    Note:r42SafeName_(payload.notes || '','')
  });

  if (payload.season) {
    r42AppendSponsorRow_(R42_LIA.SEASONS_SHEET,{
      SPONSOR_SEASON_ID:'SEASON-' + Utilities.getUuid().slice(0,8).toUpperCase(),
      SPONSOR_ID:sponsorId,
      SPONSOR_NOME:company,
      STAGIONE:String(payload.season || ''),
      STATO_SPONSOR:payload.currentSponsor === true ? 'ATTIVO' : 'PROSPECT',
      DATA_INIZIO:payload.startDate || '',
      DATA_FINE:payload.endDate || '',
      RINNOVO_STATO:'NON APERTO',
      IMPORTO_CASH:r42Num_(payload.cashValue),
      VALORE_BARTER:r42Num_(payload.barterValue),
      VALORE_TOTALE:r42Num_(payload.totalValue),
      FATTURATO:'',
      PAGATO:'',
      RESIDUO:'',
      CONTRATTO_ID:'',
      CONTRATTO_LINK:'',
      OWNER:r42SafeName_(actor.email || actor.name || 'DIREZIONE','DIREZIONE'),
      NOTE:r42SafeName_(payload.seasonNotes || '',''),
      SOURCE_TYPE:'WEB_APP',
      SOURCE_ID:sponsorId,
      UPDATED_AT:now,
      UPDATED_BY:String(actor.email || actor.name || 'DIREZIONE')
    });
  }

  if (payload.contactName || payload.email || payload.phone) {
    var parts = String(payload.contactName || '').trim().split(/\s+/);
    var first = parts.shift() || '';
    var last = parts.join(' ');
    r42AppendSponsorRow_(R42_LIA.CONTACTS_SHEET,{
      CONTACT_ID:'CONTACT-' + Utilities.getUuid().slice(0,8).toUpperCase(),
      SPONSOR_ID:sponsorId,
      SPONSOR_NOME:company,
      NOME:first,
      COGNOME:last,
      RUOLO:r42SafeName_(payload.contactRole || '',''),
      EMAIL:String(payload.email || '').trim().toLowerCase(),
      TELEFONO:r42SafeName_(payload.phone || '',''),
      CANALE_PREFERITO:r42SafeName_(payload.preferredChannel || 'EMAIL','EMAIL'),
      REFERENTE_PRINCIPALE:true,
      DATA_PRIMO_CONTATTO:now,
      DATA_ULTIMO_CONTATTO:now,
      STATO_RELAZIONE:'ATTIVO',
      NOTE:'',
      SOURCE_TYPE:'WEB_APP',
      SOURCE_ID:sponsorId,
      UPDATED_AT:now,
      UPDATED_BY:String(actor.email || actor.name || 'DIREZIONE')
    });
  }

  types.forEach(function(type){
    r42AppendSponsorRow_(R42_LIA.ACTIVATIONS_SHEET,{
      ACTIVATION_ID:'ACT-' + Utilities.getUuid().slice(0,8).toUpperCase(),
      SPONSOR_ID:sponsorId,
      SPONSOR_NOME:company,
      STAGIONE:String(payload.season || '2026/27'),
      TIPO_SPONSORIZZAZIONE:r42SafeName_(type,'ALTRO'),
      TIPO_MANUALE:type === 'ALTRO' ? manualType : '',
      ASSET_ID:'',
      ASSET_DESCRIZIONE:'',
      SQUADRA_EVENTO_STRUTTURA:'',
      DATA_INIZIO:payload.startDate || '',
      DATA_FINE:payload.endDate || '',
      STATO:payload.currentSponsor === true ? 'DA ATTIVARE' : 'PROPOSTA',
      IMPORTO_CASH:'',
      VALORE_BARTER:'',
      VALORE_TOTALE:'',
      RISERVATO_DIREZIONE:false,
      CONTRATTO_LINK:'',
      MATERIALI_LINK:'',
      LED_STATUS:type === 'LED WALL' ? 'DA CREARE' : 'NON PREVISTO',
      PROVA_ATTIVAZIONE:'',
      NOTE:'',
      SOURCE_ID:sponsorId,
      UPDATED_AT:now,
      UPDATED_BY:String(actor.email || actor.name || 'DIREZIONE')
    });
  });

  r42Audit_(actor,'SPONSOR_CREATED',sponsorId,company + ' · ' + assetText);
  return {ok:true,sponsorId:sponsorId,name:company,createdAt:now.toISOString()};
}

function r42SponsorActivationCreate_(token, payload) {
  var actor = r42RequireDirection_(token);
  payload = payload || {};
  var sponsorId = r42SafeName_(payload.sponsorId || '','');
  var sponsorName = r42SafeName_(payload.sponsorName || '','');
  var type = r42SafeName_(payload.type || '','');
  if (!sponsorId || !sponsorName || !type) throw new Error('Sponsor, ID e tipo attivazione obbligatori');
  var now = new Date();
  var id = 'ACT-' + Utilities.getUuid().slice(0,8).toUpperCase();
  r42AppendSponsorRow_(R42_LIA.ACTIVATIONS_SHEET,{
    ACTIVATION_ID:id,
    SPONSOR_ID:sponsorId,
    SPONSOR_NOME:sponsorName,
    STAGIONE:String(payload.season || '2026/27'),
    TIPO_SPONSORIZZAZIONE:type,
    TIPO_MANUALE:r42SafeName_(payload.manualType || '',''),
    ASSET_ID:r42SafeName_(payload.assetId || '',''),
    ASSET_DESCRIZIONE:r42SafeName_(payload.description || '',''),
    SQUADRA_EVENTO_STRUTTURA:r42SafeName_(payload.target || '',''),
    DATA_INIZIO:payload.startDate || '',
    DATA_FINE:payload.endDate || '',
    STATO:r42SafeName_(payload.status || 'PROPOSTA','PROPOSTA'),
    IMPORTO_CASH:r42Num_(payload.cashValue),
    VALORE_BARTER:r42Num_(payload.barterValue),
    VALORE_TOTALE:r42Num_(payload.totalValue),
    RISERVATO_DIREZIONE:payload.directionOnly === true,
    CONTRATTO_LINK:String(payload.contractLink || ''),
    MATERIALI_LINK:String(payload.materialsLink || ''),
    LED_STATUS:type === 'LED WALL' ? r42SafeName_(payload.ledStatus || 'DA CREARE','DA CREARE') : 'NON PREVISTO',
    PROVA_ATTIVAZIONE:String(payload.proof || ''),
    NOTE:r42SafeName_(payload.notes || '',''),
    SOURCE_ID:sponsorId,
    UPDATED_AT:now,
    UPDATED_BY:String(actor.email || actor.name || 'DIREZIONE')
  });
  r42Audit_(actor,'SPONSOR_ACTIVATION_CREATED',id,sponsorName + ' · ' + type);
  return {ok:true,activationId:id};
}
