/**
 * SCD COLICODERVIESE - GMAIL & DRIVE ROUTER R51
 * Produzione: usare Script Properties per gli ID cartella.
 * Nessun ID di cartella o segreto deve essere hardcoded nel repository.
 */

const SCD_ROUTER = Object.freeze({
  labelProcessed: 'SCD/ARCHIVIATO',
  propertyPrefix: 'SCD_MAIL_ROUTED_',
  folderProperties: {
    AMMINISTRAZIONE: 'SCD_DRIVE_01_AMMINISTRAZIONE_FISCO',
    SEGRETERIA: 'SCD_DRIVE_02_SEGRETERIA_SPORTIVA',
    LOGISTICA: 'SCD_DRIVE_03_LOGISTICA_CAMPI',
    MEDIA: 'SCD_DRIVE_04_MEDIA_GRAFICA',
    COMUNICAZIONE: 'SCD_DRIVE_05_COMUNICAZIONE_SOCIAL'
  }
});

function scdGetFolderId_(area) {
  const key = SCD_ROUTER.folderProperties[area];
  if (!key) throw new Error('Area Drive non registrata: ' + area);
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) throw new Error('Script Property mancante: ' + key);
  return value;
}

function scdClassifyMessage_(sender, subject) {
  const from = String(sender || '').toLowerCase();
  const s = String(subject || '').toUpperCase();

  if (
    from.includes('lnd.it') ||
    from.includes('figc.it') ||
    s.includes('COMUNICATO') ||
    s.includes('SQUALIFICA') ||
    s.includes('TESSERAMENTO') ||
    s.includes('SVINCOLO')
  ) return 'SEGRETERIA';

  if (
    s.includes('FATTURA') ||
    s.includes('CO.CO.CO') ||
    s.includes('RICEVUTA') ||
    s.includes('COMPENSO') ||
    s.includes('CONTRATTO')
  ) return 'AMMINISTRAZIONE';

  if (
    s.includes('CONVOCAZIONE') ||
    s.includes('ORARIO') ||
    s.includes('CAMPO') ||
    s.includes('TRASFERTA') ||
    s.includes('VARIAZIONE GARA')
  ) return 'LOGISTICA';

  if (
    s.includes('FOTO') ||
    s.includes('VOLANTINO') ||
    s.includes('GRAFICA') ||
    s.includes('LOGO') ||
    s.includes('VIDEO')
  ) return 'MEDIA';

  if (
    s.includes('SPONSOR') ||
    s.includes('PARTNER') ||
    s.includes('CONVENZIONE') ||
    s.includes('COMUNICAZIONE') ||
    s.includes('STAMPA')
  ) return 'COMUNICAZIONE';

  return '';
}

function scdSanitizeFileName_(value) {
  return String(value || 'allegato')
    .replace(/[\\/:*?"<>|#%{}]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

function scdProcessedLabel_() {
  return GmailApp.getUserLabelByName(SCD_ROUTER.labelProcessed)
    || GmailApp.createLabel(SCD_ROUTER.labelProcessed);
}

function smistaComunicazioniElettroniche() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    const query = [
      'is:unread',
      '-label:' + SCD_ROUTER.labelProcessed,
      '(from:lnd.it OR from:figc.it OR subject:Iscrizione OR subject:Fattura OR subject:Comunicazione OR subject:Sponsor OR subject:Campo OR subject:Convocazione)'
    ].join(' ');

    const threads = GmailApp.search(query, 0, 100);
    const processedLabel = scdProcessedLabel_();
    const props = PropertiesService.getScriptProperties();

    threads.forEach(thread => {
      let threadRouted = false;

      thread.getMessages().forEach(message => {
        const messageId = message.getId();
        const dedupeKey = SCD_ROUTER.propertyPrefix + messageId;
        if (props.getProperty(dedupeKey)) return;

        const area = scdClassifyMessage_(message.getFrom(), message.getSubject());
        if (!area) return;

        const attachments = message.getAttachments({
          includeInlineImages: false,
          includeAttachments: true
        });
        if (!attachments.length) return;

        const folder = DriveApp.getFolderById(scdGetFolderId_(area));
        const datePrefix = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone() || 'Europe/Rome', 'yyyy-MM-dd');
        const subject = scdSanitizeFileName_(message.getSubject());

        attachments.forEach((attachment, index) => {
          const original = scdSanitizeFileName_(attachment.getName() || ('allegato-' + (index + 1)));
          const fileName = datePrefix + ' - ' + subject + ' - ' + original;
          const blob = attachment.copyBlob().setName(fileName);
          const saved = folder.createFile(blob);
          Logger.log('[SCD ROUTER] ' + area + ' | ' + saved.getName() + ' | message=' + messageId);
        });

        props.setProperty(dedupeKey, new Date().toISOString());
        message.markRead();
        threadRouted = true;
      });

      if (threadRouted) thread.addLabel(processedLabel);
    });
  } finally {
    lock.releaseLock();
  }
}
