/**
 * R56 — IDENTITY & ACCESS BRIDGE
 * Production bridge for R20. Uses existing account/access engines.
 * No plaintext permanent passwords are created or emailed.
 */

function r56RequireDirection_(token) {
  if (typeof r25RequireDirection_ === 'function') return r25RequireDirection_(token);
  if (!token) throw new Error('Sessione Direzione mancante');
  if (typeof sessionActor_ !== 'function') throw new Error('R20 sessionActor non disponibile');
  var actor = sessionActor_(token);
  if (!actor || !actor.email) throw new Error('Sessione non valida');
  var role = String(actor.role || actor.coreRole || actor.type || '').toUpperCase();
  if (role !== 'DIREZIONE' && role !== 'ADMIN') throw new Error('Funzione riservata alla Direzione');
  return actor;
}

function r56NormalizePhone_(value) {
  return String(value || '').replace(/[^0-9+]/g, '').replace(/^00/, '+');
}

function r56CanonicalPeopleSheet_() {
  try {
    if (typeof R25_DATA === 'undefined' || !R25_DATA.TESSERATI_ID) return null;
    var ss = SpreadsheetApp.openById(String(R25_DATA.TESSERATI_ID));
    return ss.getSheetByName('02 DB PERSONE V2');
  } catch (e) {
    console.warn('[R56 CANONICAL PEOPLE]', String(e && e.message ? e.message : e));
    return null;
  }
}

function r56CanonicalBirthKey_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Europe/Rome', 'yyyy-MM-dd');
  }
  var s = String(value || '').trim();
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var it = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (it) return it[3] + '-' + ('0' + it[2]).slice(-2) + '-' + ('0' + it[1]).slice(-2);
  return s;
}

function r56CanonicalPersonFromRow_(row) {
  row = row || [];
  return {
    personId:String(row[0] || '').trim(),
    personType:String(row[1] || '').trim(),
    lastName:String(row[2] || '').trim(),
    firstName:String(row[3] || '').trim(),
    fiscalCode:String(row[4] || '').trim(),
    birthDate:r56CanonicalBirthKey_(row[5]),
    email:email_(row[6] || ''),
    phone:r56NormalizePhone_(row[7] || ''),
    status:String(row[8] || '').trim(),
    group:String(row[9] || '').trim(),
    role:String(row[10] || '').trim(),
    source:String(row[11] || 'TESSERATI_SHEET').trim()
  };
}

function r56CanonicalPeopleByEmail_(mail) {
  var sh = r56CanonicalPeopleSheet_();
  if (!sh || !mail) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, 12).getValues();
  return values.map(r56CanonicalPersonFromRow_).filter(function(p){
    return p.personId && p.email === mail && String(p.status || 'ATTIVO').toUpperCase() !== 'INATTIVO';
  });
}

function r56CanonicalPeopleByPhoneBirth_(phone, birth) {
  var sh = r56CanonicalPeopleSheet_();
  if (!sh || !phone || !birth) return [];
  var birthKey = r56CanonicalBirthKey_(birth);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, 12).getValues();
  return values.map(r56CanonicalPersonFromRow_).filter(function(p){
    return p.personId && p.phone === phone && p.birthDate === birthKey && String(p.status || 'ATTIVO').toUpperCase() !== 'INATTIVO';
  });
}

function r56IdentityRows_() {
  if (typeof r216CrmTable_ !== 'function') return [];
  try { return r216CrmTable_('UTENTI') || []; } catch (e) { return []; }
}

function r56ResolveIdentity_(payload) {
  payload = payload || {};
  var mail = email_(payload.email || '');
  var phone = r56NormalizePhone_(payload.phone || '');
  var birth = String(payload.birthDate || payload.birth_date || '').trim();
  if (!mail && !(phone && birth)) throw new Error('Email oppure telefono + data di nascita richiesti.');

  var rows = r56IdentityRows_();
  var exactMail = mail ? rows.filter(function(r){ return email_(r.EMAIL || r.email || '') === mail; }) : [];
  if (exactMail.length === 1) {
    var row = exactMail[0];
    return {
      matched:true,
      matchMethod:'EMAIL_EXACT',
      confidence:100,
      status:'EXISTING_ACCOUNT',
      email:mail,
      role:String(row.RUOLO || row.ROLE || row.TIPO || row.TYPE || 'UTENTE REGISTRATO'),
      active:String(row.ATTIVO || row.ACTIVE || row.STATUS || '').toUpperCase() !== 'NO'
    };
  }
  if (exactMail.length > 1) {
    return {matched:false,matchMethod:'EMAIL_DUPLICATE',confidence:0,status:'PENDING_REVIEW'};
  }

  if (mail) {
    var canonicalMail = r56CanonicalPeopleByEmail_(mail);
    if (canonicalMail.length === 1) {
      var cp = canonicalMail[0];
      return {
        matched:true,
        matchMethod:'CANONICAL_EMAIL_EXACT',
        confidence:100,
        status:'EXISTING_PERSON_NO_ACCOUNT',
        email:mail,
        personId:cp.personId,
        personType:cp.personType,
        role:cp.role,
        group:cp.group,
        birthDate:cp.birthDate,
        active:true,
        requiresAccountProvision:true
      };
    }
    if (canonicalMail.length > 1) {
      return {matched:false,matchMethod:'CANONICAL_EMAIL_DUPLICATE',confidence:0,status:'PENDING_REVIEW'};
    }
  }

  if (phone && birth) {
    var exactPhoneBirth = rows.filter(function(r){
      var rp = r56NormalizePhone_(r.TELEFONO || r.PHONE || '');
      var rb = String(r.DATA_NASCITA || r.BIRTH_DATE || r.NASCITA || '').trim();
      return rp === phone && rb === birth;
    });
    if (exactPhoneBirth.length === 1) {
      var p = exactPhoneBirth[0];
      return {
        matched:true,
        matchMethod:'PHONE_BIRTHDATE',
        confidence:95,
        status:'EXISTING_PERSON_REVIEW_EMAIL',
        email:email_(p.EMAIL || p.email || ''),
        role:String(p.RUOLO || p.ROLE || p.TIPO || p.TYPE || 'UTENTE REGISTRATO'),
        active:String(p.ATTIVO || p.ACTIVE || p.STATUS || '').toUpperCase() !== 'NO'
      };
    }
    if (exactPhoneBirth.length > 1) return {matched:false,matchMethod:'PHONE_BIRTHDATE_DUPLICATE',confidence:0,status:'PENDING_REVIEW'};
  }

  if (phone && birth) {
    var canonicalPhoneBirth = r56CanonicalPeopleByPhoneBirth_(phone, birth);
    if (canonicalPhoneBirth.length === 1) {
      var cb = canonicalPhoneBirth[0];
      return {
        matched:true,
        matchMethod:'CANONICAL_PHONE_BIRTHDATE',
        confidence:95,
        status:'EXISTING_PERSON_REVIEW_EMAIL',
        email:cb.email,
        personId:cb.personId,
        personType:cb.personType,
        role:cb.role,
        group:cb.group,
        birthDate:cb.birthDate,
        active:true,
        requiresAccountProvision:true
      };
    }
    if (canonicalPhoneBirth.length > 1) {
      return {matched:false,matchMethod:'CANONICAL_PHONE_BIRTHDATE_DUPLICATE',confidence:0,status:'PENDING_REVIEW'};
    }
  }

  return {matched:false,matchMethod:'NO_STRONG_MATCH',confidence:0,status:'NEW_OR_PENDING'};
}


function r56PublicIdentityResolve_(payload) {
  payload = payload || {};
  var mail = email_(payload.email || '');
  if (!validEmail_(mail)) throw new Error('Email non valida.');
  try {
    var resolved = r56ResolveIdentity_({email:mail,phone:payload.phone,birthDate:payload.birthDate});
    if (resolved.matched === true && resolved.matchMethod === 'EMAIL_EXACT' && resolved.active !== false && typeof requestOtp === 'function') {
      requestOtp(mail);
    }
  } catch (e) {
    console.warn('[R56 PUBLIC IDENTITY PREFLIGHT]', String(e && e.message ? e.message : e));
  }
  return {
    accepted:true,
    status:'CHECK_EMAIL_OR_CONTINUE',
    nextStep:'GENERIC_ONBOARDING',
    matched:null,
    role:null
  };
}

function r56ResolveMyIdentity_(token, payload) {
  if (!token) throw new Error('Sessione mancante');
  if (typeof sessionActor_ !== 'function') throw new Error('R20 sessionActor non disponibile');
  var actor = sessionActor_(token);
  if (!actor || !actor.email) throw new Error('Sessione non valida');
  var resolved = r56ResolveIdentity_({
    email:actor.email,
    phone:payload && payload.phone,
    birthDate:payload && payload.birthDate
  });
  return {
    matched:resolved.matched === true,
    matchMethod:resolved.matchMethod || 'UNVERIFIED',
    confidence:Number(resolved.confidence || 0),
    status:String(resolved.status || 'PENDING_REVIEW'),
    role:String(resolved.role || ''),
    personId:String(resolved.personId || ''),
    personType:String(resolved.personType || ''),
    group:String(resolved.group || ''),
    active:resolved.active !== false
  };
}

function r56RecordAccess_(token, payload) {
  if (!token) throw new Error('Sessione mancante');
  if (typeof sessionActor_ !== 'function') throw new Error('R20 sessionActor non disponibile');
  var actor = sessionActor_(token);
  if (!actor || !actor.email) throw new Error('Sessione non valida');
  payload = payload || {};
  var allowedEvents = ['LOGIN_SUCCESS','PRIVATE_DESK_OPEN','SESSION_RESUME','LOGOUT'];
  var eventType = String(payload.eventType || '').toUpperCase();
  if (allowedEvents.indexOf(eventType) < 0) throw new Error('Evento accesso non ammesso');
  var clientKind = String(payload.clientKind || 'WEB').toUpperCase();
  if (['WEB','PWA','ANDROID','IOS','UNKNOWN'].indexOf(clientKind) < 0) clientKind = 'UNKNOWN';
  try {
    if (typeof r216AppendByHeader_ === 'function') {
      r216AppendByHeader_('APP AUDIT', {
        TIMESTAMP:new Date(),
        ACTION:'ACCESS_' + eventType,
        ACTOR_EMAIL:String(actor.email || ''),
        RESULT:'RECORDED',
        SOURCE:'R56',
        CLIENT:clientKind
      });
    }
  } catch (auditErr) {
    console.error('[R56 ACCESS AUDIT]', auditErr);
  }
  return {stored:true,eventType:eventType,clientKind:clientKind};
}

function r56InviteAccess_(token, payload) {
  var actor = r56RequireDirection_(token);
  payload = payload || {};
  var mail = email_(payload.email || '');
  if (!validEmail_(mail)) throw new Error('Email non valida.');

  var allowedRoles = ['USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION'];
  var role = String(payload.role || 'USER_BASE').toUpperCase();
  if (allowedRoles.indexOf(role) < 0) throw new Error('Ruolo non ammesso.');

  var identity = r56ResolveIdentity_({email:mail,phone:payload.phone,birthDate:payload.birthDate});
  var accessPayload = {
    email:mail,
    role:role,
    scope:payload.scope || {},
    active:true,
    source:'R56_INVITE',
    identityState:identity.status,
    personId:String(identity.personId || ''),
    identityMode:String(identity.matchMethod || 'DIRECTION_INVITE'),
    mustChangePin:true
  };

  if (typeof setActorAccess !== 'function') throw new Error('Motore accessi R20 non disponibile');
  setActorAccess(token, accessPayload);

  var otpResult = null;
  if (typeof requestOtp !== 'function') throw new Error('Motore codice temporaneo R20 non disponibile');
  otpResult = requestOtp(mail);

  try {
    var subject = 'SCD ColicoDerviese — accesso alla Super App';
    var body = [
      'Ciao,',
      '',
      'la SCD ColicoDerviese ha abilitato il tuo account alla Super App.',
      'Email di accesso: ' + mail,
      'Profilo assegnato: ' + role,
      '',
      'Per entrare usa il codice temporaneo inviato dal sistema. Dopo l accesso imposta il tuo PIN personale dall area riservata.',
      '',
      'I permessi non sono selezionabili dall utente: vengono assegnati dalla Societa in base al ruolo autorizzato.',
      '',
      'SCD ColicoDerviese',
      'sportclubcolico@gmail.com'
    ].join('\n');
    MailApp.sendEmail(mail, subject, body);
  } catch (mailErr) {
    console.error('[R56 INVITE MAIL]', mailErr);
  }

  try {
    if (typeof r216AppendByHeader_ === 'function') {
      r216AppendByHeader_('APP AUDIT', {
        TIMESTAMP:new Date(),
        ACTION:'ACCESS_INVITE',
        ACTOR_EMAIL:String(actor.email || ''),
        TARGET_EMAIL:mail,
        ROLE:role,
        RESULT:'SENT',
        SOURCE:'R56'
      });
    }
  } catch (auditErr) {
    console.error('[R56 INVITE AUDIT]', auditErr);
  }

  return {
    ok:true,
    email:mail,
    role:role,
    identity:identity,
    temporaryCodeSent:true,
    permanentPasswordEmailed:false,
    nextStep:'FIRST_ACCESS_SET_PERSONAL_PIN'
  };
}
