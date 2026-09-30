/**
 * SCD R42 LIA COMMERCIAL OPERATIONS
 * Comandi Drive e mapping territoriale riservati a Direzione/Admin.
 * Da installare nel progetto Apps Script R20 prima di abilitare le scritture Lia.
 */

var R42_LIA = {
  RELEASE:'R42.0',
  ROOT_FOLDER:'SCD COMMERCIAL DEVELOPMENT',
  MAPPING_FOLDER:'MAPPING TERRITORIALE'
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
  return r42GetOrCreateFolder_(DriveApp.getRootFolder(), R42_LIA.ROOT_FOLDER);
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
  var createdPath = [R42_LIA.ROOT_FOLDER];
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
  var mappingRoot = r42GetOrCreateFolder_(root,R42_LIA.MAPPING_FOLDER);
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
