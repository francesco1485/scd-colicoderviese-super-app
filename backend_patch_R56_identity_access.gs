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

  return {matched:false,matchMethod:'NO_STRONG_MATCH',confidence:0,status:'NEW_OR_PENDING'};
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
    identityState:identity.status
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
