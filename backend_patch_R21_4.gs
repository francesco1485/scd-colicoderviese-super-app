/**
 * SCD OPERATIONS R21.4
 * Account unico + archivio registrazioni + notifica Direzione
 *
 * Da aggiungere al progetto Apps Script R20.
 * Non crea ruoli separati: ogni registrazione nasce UTENTE BASE.
 */

const R21_REG_SHEET = 'APP PUBLIC REQUESTS';
const R21_REG_NOTIFY = 'sportclubcolico@gmail.com';
const R21_ROOT_FOLDER = 'SCD SUPER APP';
const R21_REG_FOLDER = 'REGISTRAZIONI';

function r21GetOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function r21AppendByHeader_(sheetName, data) {
  const ss = SpreadsheetApp.openById(SCD.CORE_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Foglio mancante: ' + sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(String);
  const row = headers.map(h => {
    const k = String(h || '').trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : '';
  });
  sh.appendRow(row);
}

function r21ArchiveRegistration_(payload, requestId) {
  const now = new Date();
  const root = r21GetOrCreateFolder_(DriveApp.getRootFolder(), R21_ROOT_FOLDER);
  const regs = r21GetOrCreateFolder_(root, R21_REG_FOLDER);
  const year = r21GetOrCreateFolder_(regs, Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy'));
  const month = r21GetOrCreateFolder_(year, Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM'));
  const safeEmail = String(payload.email || '').replace(/[^a-zA-Z0-9@._-]/g, '_');
  const fileName = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + safeEmail + '.json';
  const body = {
    requestId: requestId,
    createdAt: now.toISOString(),
    accountType: 'UTENTE BASE',
    firstName: payload.firstName || '',
    lastName: payload.lastName || '',
    name: payload.name || '',
    email: payload.email || '',
    phone: payload.phone || '',
    privacy: payload.privacy === true,
    source: 'SCD SUPER APP'
  };
  month.createFile(fileName, JSON.stringify(body, null, 2), MimeType.PLAIN_TEXT);
  return fileName;
}

function r21NotifyRegistration_(payload, requestId) {
  const subject = 'NUOVA REGISTRAZIONE SUPER APP SCD - ' + (payload.email || '');
  const text = [
    'NUOVA REGISTRAZIONE SUPER APP S.D.C. COLICODERVIESE',
    '',
    'Stato: UTENTE BASE',
    'ID: ' + requestId,
    'Nome: ' + (payload.firstName || ''),
    'Cognome: ' + (payload.lastName || ''),
    'Email: ' + (payload.email || ''),
    'Telefono: ' + (payload.phone || ''),
    'Privacy: ' + (payload.privacy === true ? 'SI' : 'NO'),
    '',
    'La Direzione potra cercare l account per email e assegnare successivamente le autorizzazioni necessarie sullo stesso account.'
  ].join('\n');
  MailApp.sendEmail(R21_REG_NOTIFY, subject, text);
}

function r21RegisterBaseUser_(payload) {
  payload = payload || {};
  const firstName = clean_(payload.firstName || '', 80);
  const lastName = clean_(payload.lastName || '', 80);
  const name = clean_(payload.name || [firstName, lastName].filter(Boolean).join(' '), 160);
  const email = email_(payload.email || '');
  const phone = clean_(payload.phone || '', 80);

  if (!name || !validEmail_(email) || !phone) {
    throw new Error('Nome, cognome, email e telefono sono obbligatori.');
  }
  if (payload.privacy !== true) {
    throw new Error('Devi accettare l informativa privacy per creare l account.');
  }

  // Usa il motore account gia presente in R20.
  // UTENTE REGISTRATO = profilo base senza privilegi staff/direzione.
  const account = registerAccount({
    name: name,
    email: email,
    type: 'UTENTE REGISTRATO'
  });

  const requestId = 'REG-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const now = new Date();

  r21AppendByHeader_(R21_REG_SHEET, {
    REQUEST_ID: requestId,
    CREATED_AT: now,
    TYPE: 'REGISTRAZIONE',
    STATUS: 'UTENTE BASE',
    NOME: firstName || name,
    COGNOME: lastName,
    EMAIL: email,
    TELEFONO: phone,
    OGGETTO: 'Registrazione Super App',
    DETTAGLI: 'Account unico - Utente Base',
    CONSENSO_PRIVACY: 'SI',
    SOURCE: 'SCD SUPER APP',
    UPDATED_AT: now,
    UPDATED_BY: email,
    NOTE: 'Eventuali accessi qualificati assegnati successivamente dalla Direzione.'
  });

  try { r21ArchiveRegistration_({firstName,lastName,name,email,phone,privacy:true}, requestId); } catch (e) { console.error('Archive registration', e); }
  try { r21NotifyRegistration_({firstName,lastName,name,email,phone,privacy:true}, requestId); } catch (e) { console.error('Notify registration', e); }

  return {
    ok: true,
    requestId: requestId,
    accountType: 'UTENTE BASE',
    accountStatus: account && account.status ? account.status : 'ATTIVO',
    message: 'Account creato. Entri come Utente Base; la Direzione potra aggiungere eventuali funzioni dedicate sullo stesso account.'
  };
}

/*
NELLO SWITCH DEL doPost(e) R20 aggiungere:

case 'public.register':
  data = r21RegisterBaseUser_(payload);
  break;

Il frontend R21.4 usa gia action = "public.register".
*/