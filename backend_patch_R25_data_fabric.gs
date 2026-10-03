/**
 * SCD R25 DATA FABRIC BRIDGE
 * Drive + Gmail come back-office operativo continuo della Super App.
 *
 * PRINCIPI
 * - preserva i master esistenti: non crea un secondo gestionale;
 * - ingestione incrementale per Gmail ID e Drive file ID;
 * - nessuna modifica critica automatica a ruoli, pagamenti, tesseramenti o safeguarding;
 * - variazioni critiche entrano in coda e richiedono revisione umana;
 * - APP EVENT KERNEL riceve gli eventi tecnici del Data Fabric.
 *
 * Installazione:
 * 1) aggiungere questo file al progetto Apps Script R20;
 * 2) aggiungere i case R25 al doPost R21.6;
 * 3) ridistribuire la Web App;
 * 4) facoltativo: eseguire una volta r25InstallDataFabricTriggers() dall'editor Apps Script.
 */

var R25_DATA = {
  RELEASE: 'R25.0',
  MAIL_OPS_ID: '1wx3ZXwmdZuAr8AM_h08GzOvephm5o5iHMvTLQpRmbJE',
  TESSERATI_ID: '1mcOVkFRK7igxk87jGE-VqI49PHjNa6OmMu7xd0QYUl8',
  CORE_ID: '1p78Kgla_cCjYxCPjksS8lHxmlFQxuvpd1aBXv6-1H1s',
  MAIL_ARCHIVE: '01_EMAIL_ARCHIVE',
  MAIL_CLASSIFIER: '17_SMART_CLASSIFIER',
  ACTION_QUEUE: '18_ACTION_QUEUE',
  DRIVE_CATALOG: 'DRIVE AGGIORNAMENTI',
  SOURCE_REGISTRY: 'REGISTRO FONTI V2',
  EVENT_KERNEL: 'APP EVENT KERNEL'
};

function r25Clean_(value, max) {
  var s = String(value == null ? '' : value).replace(/\u0000/g, '').trim();
  return max && s.length > max ? s.slice(0, max) : s;
}

function r25HexDigest_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    var n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function r25BookSheet_(bookId, sheetName) {
  var ss = SpreadsheetApp.openById(bookId);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Foglio R25 mancante: ' + sheetName);
  return sh;
}

function r25HeaderRow_(sh, key) {
  var rows = Math.min(10, Math.max(1, sh.getLastRow()));
  var cols = Math.min(60, Math.max(1, sh.getLastColumn()));
  var values = sh.getRange(1, 1, rows, cols).getDisplayValues();
  var wanted = String(key || '').trim().toUpperCase();
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (String(values[r][c] || '').trim().toUpperCase() === wanted) return r + 1;
    }
  }
  throw new Error('Intestazione ' + key + ' non trovata in ' + sh.getName());
}

function r25AppendByHeader_(bookId, sheetName, headerKey, data) {
  var sh = r25BookSheet_(bookId, sheetName);
  var headerRow = r25HeaderRow_(sh, headerKey);
  var headers = sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var row = headers.map(function(h) {
    var key = String(h || '').trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : '';
  });
  sh.appendRow(row);
}

function r25ExistingValues_(bookId, sheetName, headerKey, columnName) {
  var sh = r25BookSheet_(bookId, sheetName);
  var headerRow = r25HeaderRow_(sh, headerKey);
  var headers = sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var wanted = String(columnName || '').trim().toUpperCase();
  var idx = headers.map(function(x) { return String(x || '').trim().toUpperCase(); }).indexOf(wanted);
  if (idx < 0) throw new Error('Colonna ' + columnName + ' non trovata in ' + sheetName);
  var count = sh.getLastRow() - headerRow;
  if (count <= 0) return {};
  var values = sh.getRange(headerRow + 1, idx + 1, count, 1).getDisplayValues();
  var out = {};
  values.forEach(function(row) {
    var v = String(row[0] || '').trim();
    if (v) out[v] = true;
  });
  return out;
}

function r25RequireDirection_(token) {
  if (!token) throw new Error('Sessione Direzione mancante');
  if (typeof getAppData !== 'function') throw new Error('R20 getAppData non disponibile');
  var data = getAppData(token) || {};
  var user = data.user || {};
  var permissions = data.permissions || {};
  var role = String(user.role || user.coreRole || user.type || '').toUpperCase();
  var allowed = permissions.direction === true || role === 'DIREZIONE' || role === 'ADMIN';
  if (!allowed) throw new Error('Funzione riservata alla Direzione');
  return user;
}

function r25ParseMailbox_(raw) {
  var s = String(raw || '').trim();
  var m = s.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return {name:r25Clean_(m[1].replace(/^"|"$/g, ''), 160), email:r25Clean_(m[2], 200).toLowerCase()};
  if (/^[^@\s]+@[^@\s]+$/.test(s)) return {name:'', email:s.toLowerCase()};
  return {name:r25Clean_(s, 160), email:''};
}

function r25ClassifyMail_(subject, body, from) {
  var text = [subject, body, from].join(' ').toLowerCase();
  var area = 'ALTRO';
  if (/figc|lnd|cr lombardia|crl|settore giovanile|sgs|tesserament|svincol|federaz/.test(text)) area = 'FIGC/LND';
  else if (/pulmino|pullmino|trasporto|autista|corsa|fermata/.test(text)) area = 'SERVIZIO PULMINI';
  else if (/sponsor|partnership|partner|convenzion|barter|ledwall|ospitalit/.test(text)) area = 'SPONSOR E CONVENZIONI';
  else if (/fattur|bonifico|pagament|ricevut|saldo|scadenza|iban|quota/.test(text)) area = 'AMMINISTRAZIONE';
  else if (/torneo|manifestazione|open day|camp|evento/.test(text)) area = 'TORNEI ED EVENTI';
  else if (/club house|ristoraz|panin|bar|horeca/.test(text)) area = 'CLUB HOUSE';
  else if (/magazzino|kit|divisa|materiale|fornitore/.test(text)) area = 'MAGAZZINO';
  else if (/allenament|mister|dirigente|staff|convocaz|presenz/.test(text)) area = 'SPORTIVO / STAFF';
  else if (/iscrizion|genitore|famiglia|atleta|certificato medico|documento identit/.test(text)) area = 'SEGRETERIA SPORTIVA E ISCRIZIONI';
  else if (/delivery status|mailer-daemon|mail delivery|undeliver|not delivered|consegna non/.test(text)) area = 'SISTEMA';

  var priority = 'MEDIA';
  if (/urgent|urgente|annull|rinvi|variazione gara|scadenza oggi|entro oggi|sospension/.test(text)) priority = 'ALTA';
  if (/safeguarding|abuso|minaccia|violenza/.test(text)) priority = 'CRITICA';
  if (area === 'SISTEMA' && priority === 'MEDIA') priority = 'BASSA';

  var action = '';
  if (/variazione gara|rinvi|annull/.test(text)) action = 'Verificare EVENT_ID e proporre aggiornamento calendario; conferma umana obbligatoria.';
  else if (/tesserament|certificato medico|svincol/.test(text)) action = 'Collegare atleta/pratica e sottoporre a Segreteria-Tesseramenti.';
  else if (/fattur|bonifico|pagament|saldo/.test(text)) action = 'Collegare documento amministrativo e sottoporre a verifica contabile.';
  else if (/delivery status|mailer-daemon|undeliver|consegna non/.test(text)) action = 'Verificare recapito e aggiornare anagrafica contatto.';
  else if (priority === 'ALTA' || priority === 'CRITICA') action = 'Revisione prioritaria Direzione.';
  else action = 'Classificare e collegare alle entità pertinenti.';

  return {area:area, priority:priority, action:action};
}

function r25EmitEvent_(eventType, entityType, entityId, source, status, notes, payloadHash) {
  try {
    r25AppendByHeader_(R25_DATA.CORE_ID, R25_DATA.EVENT_KERNEL, 'EVENT_ID', {
      EVENT_ID: 'EVT-' + Utilities.getUuid().slice(0, 12).toUpperCase(),
      CREATED_AT: new Date(),
      UPDATED_AT: new Date(),
      SOURCE: source || 'R25_DATA_FABRIC',
      DESTINATION: 'SCD_DATA_FABRIC',
      EVENT_TYPE: eventType,
      ENTITY_TYPE: entityType,
      ENTITY_ID: entityId,
      SCOPE: 'DIRECTION',
      CONSENT_BASIS: 'LEGITIMATE_OPERATIONAL_PURPOSE',
      IDEMPOTENCY_KEY: eventType + ':' + entityId,
      PAYLOAD_HASH: payloadHash || '',
      STATUS: status || 'RECORDED',
      ATTEMPTS: 0,
      CORRELATION_ID: Utilities.getUuid(),
      RELEASE: R25_DATA.RELEASE,
      NOTES: r25Clean_(notes || '', 1000)
    });
  } catch (err) {
    console.error('R25 event kernel', err);
  }
}

function r25IngestGmail_(options) {
  options = options || {};
  var days = Math.max(1, Math.min(30, Number(options.days || 7)));
  var limit = Math.max(1, Math.min(100, Number(options.limit || 40)));
  var query = 'newer_than:' + days + 'd -in:spam -in:trash -category:promotions';
  var existing = r25ExistingValues_(R25_DATA.MAIL_OPS_ID, R25_DATA.MAIL_ARCHIVE, 'UID', 'UID');
  var threads = GmailApp.search(query, 0, limit);
  var inserted = 0, skipped = 0, queued = 0, errors = [];

  outer:
  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var mi = 0; mi < messages.length; mi++) {
      if (inserted >= limit) break outer;
      try {
        var msg = messages[mi];
        var uid = String(msg.getId() || '');
        if (!uid || existing[uid]) { skipped++; continue; }

        var subject = r25Clean_(msg.getSubject(), 500);
        var body = r25Clean_(msg.getPlainBody(), 12000);
        var snippet = r25Clean_(body.replace(/\s+/g, ' '), 600);
        var sender = r25ParseMailbox_(msg.getFrom());
        var attachments = msg.getAttachments({includeInlineImages:false, includeAttachments:true}) || [];
        var attachmentNames = attachments.map(function(a) { return r25Clean_(a.getName(), 240); }).filter(Boolean);
        var cls = r25ClassifyMail_(subject, body, msg.getFrom());
        var gmailUrl = 'https://mail.google.com/mail/u/?authuser=sportclubcolico%40gmail.com#all/' + uid;
        var labels = [];
        try { labels = msg.getThread().getLabels().map(function(l) { return l.getName(); }); } catch (_) {}
        var payloadHash = r25HexDigest_([uid,subject,snippet,attachmentNames.join('|')].join('|'));

        // Safeguarding non entra nel normale archivio intelligente.
        if (cls.priority === 'CRITICA' && /safeguarding|abuso|minaccia|violenza/i.test(subject + ' ' + body)) {
          r25EmitEvent_('SAFEGUARDING_SIGNAL_ISOLATED','EMAIL',uid,'SCD_GMAIL','ISOLATED',
            'Messaggio escluso dal normale Data Fabric. Usare il canale safeguarding separato.',payloadHash);
          existing[uid] = true;
          skipped++;
          continue;
        }

        r25AppendByHeader_(R25_DATA.MAIL_OPS_ID, R25_DATA.MAIL_ARCHIVE, 'UID', {
          UID:uid,
          DATA_ORA:msg.getDate(),
          MITTENTE_NOME:sender.name,
          MITTENTE_EMAIL:sender.email,
          DESTINATARI:r25Clean_(msg.getTo(), 1000),
          CC:r25Clean_(msg.getCc(), 1000),
          OGGETTO:subject,
          SNIPPET:snippet,
          CORPO_MAIL:body,
          ALLEGATI:attachmentNames.join('; '),
          CATEGORIA_PRIMARIA:cls.area,
          PRIORITA:cls.priority,
          STATO:'NUOVA',
          AZIONE_RICHIESTA:cls.action,
          THREAD_ID:String(msg.getThread().getId() || ''),
          GMAIL_URL:gmailUrl,
          LABELS:labels.join('; '),
          NOTE_ANALISI:'R25 ingestione incrementale; revisione umana per modifiche critiche.',
          DATA_IMPORTAZIONE:new Date(),
          MITTENTE_REALE_NOME:sender.name,
          MITTENTE_REALE_EMAIL:sender.email,
          AREA_CANONICA:cls.area,
          STATO_SEMANTICO:'DA VERIFICARE',
          PRIORITA_SEMANTICA:cls.priority,
          AZIONE_OPERATIVA:cls.action,
          CONFIDENZA:'RULES_V1',
          CATEGORIA_EFFETTIVA:cls.area
        });

        r25AppendByHeader_(R25_DATA.MAIL_OPS_ID, R25_DATA.MAIL_CLASSIFIER, 'UID', {
          UID:uid,
          DATA_ORA:msg.getDate(),
          OGGETTO:subject,
          SNIPPET:snippet,
          TAG_PULITI:cls.area + ';',
          AREA_PRIMARIA:cls.area,
          PRIORITA_PULITA:cls.priority,
          STATO_ORIGINALE:'NUOVA',
          AZIONE_RICHIESTA:cls.action,
          GMAIL_URL:gmailUrl,
          MITTENTE_EMAIL:sender.email,
          ALLEGATI:attachmentNames.join('; ')
        });

        if (cls.priority === 'ALTA' || cls.priority === 'CRITICA' || cls.action) {
          r25AppendByHeader_(R25_DATA.MAIL_OPS_ID, R25_DATA.ACTION_QUEUE, 'PRIORITA', {
            PRIORITA:cls.priority,
            AREA:cls.area,
            DATA:msg.getDate(),
            OGGETTO:subject,
            AZIONE:cls.action,
            STATO:'NUOVA',
            GMAIL:gmailUrl,
            UID:uid
          });
          queued++;
        }

        r25EmitEvent_('EMAIL_INGESTED','EMAIL',uid,'SCD_GMAIL','RECORDED',cls.area + ' · ' + cls.priority,payloadHash);
        existing[uid] = true;
        inserted++;
      } catch (err) {
        errors.push(String(err && err.message ? err.message : err));
      }
    }
  }

  return {
    ok:true,
    query:query,
    threadsScanned:threads.length,
    inserted:inserted,
    skipped:skipped,
    queued:queued,
    errors:errors.slice(0,10),
    scannedAt:new Date().toISOString()
  };
}

function r25RefreshDriveCatalog_(options) {
  options = options || {};
  var limit = Math.max(1, Math.min(250, Number(options.limit || 100)));
  var sh = r25BookSheet_(R25_DATA.TESSERATI_ID, R25_DATA.DRIVE_CATALOG);
  var headerRow = r25HeaderRow_(sh, 'ULTIMA MODIFICA');
  var headers = sh.getRange(headerRow,1,1,sh.getLastColumn()).getDisplayValues()[0];
  var map = {};
  headers.forEach(function(h,i){ map[String(h || '').trim().toUpperCase()] = i; });
  var needed = ['ULTIMA MODIFICA','TIPO','NOME','ID DRIVE','STATO CONTROLLO','LINK','DATA ULTIMO CONTROLLO'];
  needed.forEach(function(k){ if (map[k] == null) throw new Error('Colonna Drive mancante: ' + k); });

  var count = Math.min(limit, Math.max(0, sh.getLastRow() - headerRow));
  if (!count) return {ok:true,checked:0,changed:0,missing:0,scannedAt:new Date().toISOString()};
  var range = sh.getRange(headerRow + 1, 1, count, sh.getLastColumn());
  var values = range.getValues();
  var changed = 0, missing = 0, checked = 0;

  values.forEach(function(row) {
    var id = String(row[map['ID DRIVE']] || '').trim();
    if (!id) return;
    checked++;
    var type = String(row[map['TIPO']] || '').toUpperCase();
    var previous = row[map['ULTIMA MODIFICA']];
    try {
      var obj = type.indexOf('CARTELLA') >= 0 ? DriveApp.getFolderById(id) : DriveApp.getFileById(id);
      var lastUpdated = typeof obj.getLastUpdated === 'function' ? obj.getLastUpdated() : previous;
      var previousMs = previous instanceof Date ? previous.getTime() : Date.parse(String(previous || ''));
      var currentMs = lastUpdated instanceof Date ? lastUpdated.getTime() : Date.parse(String(lastUpdated || ''));
      var isChanged = currentMs && (!previousMs || Math.abs(currentMs - previousMs) > 1000);

      row[map['NOME']] = obj.getName();
      if (lastUpdated) row[map['ULTIMA MODIFICA']] = lastUpdated;
      row[map['STATO CONTROLLO']] = isChanged ? 'MODIFICATO - DA VERIFICARE' : 'PRESENTE';
      row[map['LINK']] = obj.getUrl();
      row[map['DATA ULTIMO CONTROLLO']] = new Date();

      if (isChanged) {
        changed++;
        r25EmitEvent_('DRIVE_SOURCE_CHANGED', type.indexOf('CARTELLA') >= 0 ? 'DRIVE_FOLDER' : 'DRIVE_FILE',
          id,'SCD_DRIVE','REVIEW_REQUIRED',obj.getName(),r25HexDigest_([id,obj.getName(),currentMs].join('|')));
      }
    } catch (err) {
      missing++;
      row[map['STATO CONTROLLO']] = 'NON RAGGIUNGIBILE - VERIFICARE';
      row[map['DATA ULTIMO CONTROLLO']] = new Date();
      r25EmitEvent_('DRIVE_SOURCE_UNREACHABLE','DRIVE_ITEM',id,'SCD_DRIVE','REVIEW_REQUIRED',
        String(err && err.message ? err.message : err),r25HexDigest_(id));
    }
  });

  range.setValues(values);
  return {ok:true,checked:checked,changed:changed,missing:missing,scannedAt:new Date().toISOString()};
}

function r25SheetCount_(bookId, sheetName, headerKey) {
  var sh = r25BookSheet_(bookId, sheetName);
  var headerRow = r25HeaderRow_(sh, headerKey);
  return Math.max(0, sh.getLastRow() - headerRow);
}

function r25ObsRead_(name) {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('R25_OBS_' + String(name || '').toUpperCase());
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

function r25ObsWrite_(name, status, result, error) {
  var old = r25ObsRead_(name);
  var now = new Date().toISOString();
  var next = {
    status:status,
    lastSync:now,
    lastSuccess:status === 'OK' ? now : (old.lastSuccess || ''),
    lastError:status === 'ERROR' ? r25Clean_(error || 'Errore non specificato', 500) : '',
    lastResult:status === 'OK' ? result : (old.lastResult || null)
  };
  PropertiesService.getScriptProperties().setProperty('R25_OBS_' + String(name || '').toUpperCase(), JSON.stringify(next));
  return next;
}

function r25RunObserved_(name, fn) {
  try {
    var result = fn();
    r25ObsWrite_(name, 'OK', result, '');
    return result;
  } catch (err) {
    r25ObsWrite_(name, 'ERROR', null, String(err && err.message ? err.message : err));
    throw err;
  }
}

function r25DataFabricStatus_(token) {
  var actor = r25RequireDirection_(token);
  return {
    ok:true,
    release:R25_DATA.RELEASE,
    actor:r25Clean_(actor.email || actor.name || '', 200),
    sources:{
      gmail:'sportclubcolico@gmail.com',
      drive:'sportclubcolico@gmail.com'
    },
    counts:{
      emailArchive:r25SheetCount_(R25_DATA.MAIL_OPS_ID,R25_DATA.MAIL_ARCHIVE,'UID'),
      classifier:r25SheetCount_(R25_DATA.MAIL_OPS_ID,R25_DATA.MAIL_CLASSIFIER,'UID'),
      actionQueue:r25SheetCount_(R25_DATA.MAIL_OPS_ID,R25_DATA.ACTION_QUEUE,'PRIORITA'),
      driveCatalog:r25SheetCount_(R25_DATA.TESSERATI_ID,R25_DATA.DRIVE_CATALOG,'ULTIMA MODIFICA'),
      sourceRegistry:r25SheetCount_(R25_DATA.TESSERATI_ID,R25_DATA.SOURCE_REGISTRY,'ID FONTE'),
      eventKernel:r25SheetCount_(R25_DATA.CORE_ID,R25_DATA.EVENT_KERNEL,'EVENT_ID')
    },
    policy:{
      criticalChanges:'HUMAN_CONFIRMATION_REQUIRED',
      destructiveAutoWrite:false,
      safeguarding:'ISOLATED'
    },
    observability:{
      gmail:r25ObsRead_('gmail'),
      drive:r25ObsRead_('drive')
    },
    provenance:{
      gmail:{source:'SCD_GMAIL',table:'01_EMAIL_ARCHIVE / 17_SMART_CLASSIFIER / 18_ACTION_QUEUE',field:'UID',api:'direction.datafabric.scan.gmail',fallback:'NO_WRITE',refresh:'15m'},
      drive:{source:'SCD_DRIVE',table:'DRIVE AGGIORNAMENTI / REGISTRO FONTI V2',field:'ID DRIVE',api:'direction.datafabric.scan.drive',fallback:'NO_WRITE',refresh:'1h'}
    },
    checkedAt:new Date().toISOString()
  };
}

function r57DataFabricActions_(token, limit) {
  r25RequireDirection_(token);
  var sh = r25BookSheet_(R25_DATA.MAIL_OPS_ID, R25_DATA.ACTION_QUEUE);
  var headerRow = r25HeaderRow_(sh, 'PRIORITA');
  var headers = sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var map = {};
  headers.forEach(function(h, i) { map[String(h || '').trim().toUpperCase()] = i; });

  ['PRIORITA','AREA','DATA','OGGETTO','AZIONE','STATO','GMAIL','UID'].forEach(function(key) {
    if (map[key] == null) throw new Error('Colonna action queue mancante: ' + key);
  });

  var count = Math.max(0, sh.getLastRow() - headerRow);
  if (!count) return {
    ok:true,
    source:'MAIL_OPERATIONS_SHEET',
    table:R25_DATA.ACTION_QUEUE,
    rows:[],
    count:0,
    checkedAt:new Date().toISOString()
  };

  var values = sh.getRange(headerRow + 1, 1, count, sh.getLastColumn()).getDisplayValues();
  var rows = values.map(function(row) {
    var uid = r25Clean_(row[map.UID], 120);
    var status = r25Clean_(row[map.STATO], 80);
    if (!uid || /CHIUS|DONE|ARCHIVIAT|ANNULLAT/i.test(status)) return null;
    return {
      id:uid,
      priority:r25Clean_(row[map.PRIORITA], 40),
      area:r25Clean_(row[map.AREA], 120),
      date:r25Clean_(row[map.DATA], 80),
      title:r25Clean_(row[map.OGGETTO], 500),
      nextAction:r25Clean_(row[map.AZIONE], 1200),
      status:status || 'DA VERIFICARE',
      gmailUrl:r25Clean_(row[map.GMAIL], 1000),
      source:'MAIL_OPERATIONS_SHEET/18_ACTION_QUEUE',
      sourceRecordId:uid
    };
  }).filter(Boolean);

  rows.sort(function(a,b) {
    var rank = {CRITICA:5,URGENTE:4,ALTA:3,MEDIA:2,BASSA:1};
    var pa = rank[String(a.priority || '').toUpperCase()] || 0;
    var pb = rank[String(b.priority || '').toUpperCase()] || 0;
    if (pa !== pb) return pb - pa;
    var da = Date.parse(a.date || '') || 0;
    var db = Date.parse(b.date || '') || 0;
    return db - da;
  });

  var max = Math.max(1, Math.min(100, Number(limit || 60)));
  rows = rows.slice(0, max);

  return {
    ok:true,
    source:'MAIL_OPERATIONS_SHEET',
    table:R25_DATA.ACTION_QUEUE,
    rows:rows,
    count:rows.length,
    checkedAt:new Date().toISOString()
  };
}

function r25ScanGmail_(token, payload) {
  r25RequireDirection_(token);
  return r25WithLock_(function(){ return r25RunObserved_('gmail', function(){ return r25IngestGmail_(payload || {}); }); });
}

function r25ScanDrive_(token, payload) {
  r25RequireDirection_(token);
  return r25WithLock_(function(){ return r25RunObserved_('drive', function(){ return r25RefreshDriveCatalog_(payload || {}); }); });
}

function r25WithLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Data Fabric già in esecuzione');
  try { return fn(); } finally { lock.releaseLock(); }
}

function r25GmailIngestScheduled_() {
  return r25WithLock_(function(){ return r25RunObserved_('gmail', function(){ return r25IngestGmail_({days:7,limit:60}); }); });
}

function r25DriveCatalogScheduled_() {
  return r25WithLock_(function(){ return r25RunObserved_('drive', function(){ return r25RefreshDriveCatalog_({limit:200}); }); });
}

function r25InstallDataFabricTriggers() {
  var handlers = {
    r25GmailIngestScheduled_:true,
    r25DriveCatalogScheduled_:true
  };
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (handlers[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('r25GmailIngestScheduled_').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('r25DriveCatalogScheduled_').timeBased().everyHours(1).create();
  return {
    ok:true,
    gmailEveryMinutes:15,
    driveEveryHours:1,
    installedAt:new Date().toISOString()
  };
}


/* R29 — safe public runtime contract probe.
 * Espone soltanto schema/versione, mai contenuti Gmail/Drive o dati personali.
 */
function r29DataFabricContract_() {
  return {
    ok:true,
    release:'R29',
    contractVersion:'1.0.0',
    capability:'CAP-DATAFABRIC-OBSERVABILITY',
    featureFlag:'FF-DATAFABRIC-OBSERVABILITY',
    sources:['SCD_GMAIL','SCD_DRIVE','R20'],
    observabilityFields:['status','lastSync','lastSuccess','lastError','lastResult'],
    provenanceFields:['SOURCE','TABLE','FIELD','API','FALLBACK','REFRESH'],
    privateStatusAction:'direction.datafabric.status',
    destructiveAutoWrite:false,
    safeguarding:'ISOLATED',
    checkedAt:new Date().toISOString()
  };
}
