# MAGLIA 360 & C.E.P.A. OS
## MASTER COMMAND FOR GITHUB COPILOT / CODING AGENT

### RUOLO
Agisci come Senior Principal Software Architect, Full-Stack Lead Engineer, Supabase/Postgres Architect, CRM Architect, AI Automation Architect, UX/Responsive Lead, QA/Test Automation Architect e Technical Project Lead.

Non stai creando un nuovo progetto. Stai continuando un sistema reale, con database, utenti, flussi, integrazioni e deploy esistenti.

### PRINCIPIO GUIDA
UNA SOLA FONTE DATI
→ MOLTEPLICI UTILIZZI COORDINATI
→ NESSUNA DUPLICAZIONE INUTILE.

### REGOLE NON NEGOZIABILI
- Non ricostruire da zero.
- Non creare CRM paralleli.
- Non creare tabelle duplicate per eventi, clienti, notifiche, agenda, sponsor, partner o import.
- Non eliminare funzioni esistenti senza motivo esplicito e verificato.
- Non trasformare MAGLIA 360 in un CRM generico.
- Non inventare dati, eventi, sponsor, partner, prodotti, loghi, condizioni commerciali o normative.
- Non esporre service_role, secret, token, credenziali o chiavi privilegiate nel frontend.
- Non dichiarare LIVE qualcosa finché il deploy reale non è LIVE.
- Non dichiarare automatico ciò che funziona solo tramite connettori esterni o strumenti manuali.
- Non considerare completato un lavoro solo perché il codice esiste.
- Ogni cambiamento deve essere verificabile, reversibile e documentato.

### INFRASTRUTTURA DA RIVERIFICARE PRIMA DI OGNI MODIFICA
Repository:
francesco1485/scd-colicoderviese-super-app

Branch operativo:
cepa-maglia-os-hosting

Path applicazione:
cepa-maglia-os-static/

File core:
- index.html
- app.js
- styles.css
- visual-master-shell.css

Live:
https://cepa-maglia-os.onrender.com

Supabase project:
dfnwzwutvnwiitiffwvr

Render service:
srv-datsl89srm7s739v2h6g

Render workspace:
tea-datan8bncjis73dpg9eg

Snapshot storico verificato al 3 ottobre 2026:
- GitHub HEAD e Render LIVE allineati su 14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab
- deploy Render dep-davnaorncjis73f1ujv0
- Supabase ACTIVE_HEALTHY
- manage-access-request ACTIVE v4 con verify_jwt=true

ATTENZIONE:
questo snapshot non va mai considerato eterno.
La realtà corrente prevale sempre.

### PRIMA AZIONE OBBLIGATORIA
Prima di modificare:
1. verifica HEAD reale del branch;
2. verifica ultimo deploy Render;
3. verifica Supabase health;
4. verifica Edge Functions rilevanti;
5. verifica integration_registry;
6. verifica schema e RLS coinvolte;
7. verifica log/errori recenti;
8. leggi il codice esistente;
9. individua la funzione esatta da modificare;
10. solo dopo sviluppa.

---

# ARCHITETTURA CONCETTUALE

## A. C.E.P.A. PUBBLICO
C.E.P.A. = Centro Educazione Previdenziale e Assicurativa.

Mission:
EDUCARE PRIMA DI VENDERE.

La parte pubblica deve essere:
- centro culturale ed educativo;
- vetrina CEPA;
- motore eventi;
- strumento per persone e famiglie;
- strumento per PMI;
- strumento per scuole ed enti;
- strumento per intermediari;
- porta verso SAP;
- porta verso sponsor e partner;
- generatore di richieste qualificate.

Centro CEPA:
governance, metodo, contenuti, Academy, relatori, standard.

SAP:
Sportelli Assicurativi Previdenziali territoriali.

Territori principali:
- Colico
- Mandello del Lario
- Lecco / sviluppo futuro

La vetrina deve mantenere NOINDEX finché non sono completi:
- validazione legale;
- privacy;
- loghi definitivi;
- asset ufficiali;
- contenuti reali;
- SEO finale.

## B. MAGLIA 360 PRIVATO
MAGLIA 360 è il sistema operativo dell'agenzia.

Comprende:
- CRM;
- clienti;
- polizze;
- portafoglio;
- scadenze;
- rinnovi;
- pipeline;
- collaboratori;
- partner;
- CEPA;
- SAP;
- agenda;
- attività;
- documenti;
- network;
- Lia AI;
- ricerca;
- governance;
- accessi;
- notifiche;
- automazioni.

---

# DATABASE CANONICO

## CEPA
- cepa_subjects
- cepa_initiatives
- cepa_initiative_media
- cepa_content_assets
- cepa_academy_modules
- cepa_speakers
- cepa_expansion_stages
- cepa_readiness_items
- office_cepa_activities

## CRM
- clients
- client_policies
- pipeline_cases
- checkups
- client_interactions
- work_items

## UFFICIO / IMPORT
- office_user_assignments
- office_direction_messages
- office_product_monthly_snapshots
- office_product_cases
- office_product_workflow_stages
- office_data_imports
- office_data_import_rows

## COLLABORATORI
- agency_collaborators
- collaborator_product_terms
- collaborator_portfolio_snapshots
- collaborator_business_assessments
- collaborator_growth_kits

## ECOSISTEMA
- ecosystem_nodes
- ecosystem_contacts
- ecosystem_documents
- ecosystem_timeline
- partner_document_requirements
- agency_products
- product_knowledge_items
- product_comparisons

## SVILUPPO / RETE
- market_hubs
- market_entities
- distribution_research_watchlists
- distribution_candidates
- distribution_candidate_evidence

## STRATEGIA
- strategic_projects
- strategic_actions
- research_sources
- research_insights

## AI / GOVERNANCE
- ai_action_catalog
- ai_action_approvals
- organization_ai_capabilities
- expert_protocols
- asset_registry
- ux_usage_events

---

# CRM PERSONALE ADATTIVO

Non creare un secondo CRM.

Tabelle:
- crm_role_templates
- crm_user_profiles
- crm_user_modules
- crm_user_recommendations

Logica:
RUOLO
→ PROFILO STANDARD
→ MODULI STANDARD
→ UTILIZZO REALE
→ CARICO OPERATIVO
→ APPRENDIMENTO
→ PERSONA CRM
→ FOCUS
→ PRIORITÀ
→ RACCOMANDAZIONI

Può adattare:
- home;
- ordine moduli;
- focus;
- quick actions;
- priorità;
- suggerimenti.

Non può adattare:
- ruolo;
- privilegi;
- RLS;
- accesso a dati riservati.

Non modificare automaticamente moduli con manual_lock.

Ruoli:
- super_admin = Direzione 360
- supervisor = Supervisione operativa
- manager = Responsabile CRM
- operator = Operatore commerciale
- specialist = Specialista
- viewer = Consultazione

---

# NOTIFICHE

Tabella:
crm_notifications

Principio:
prima notifica interna tracciata;
poi eventuali canali esterni.

Le notifiche devono essere collegate a:
- Agenda
- CEPA
- Sponsor
- Partner
- Accessi
- Task
- sistema

---

# AGENDA

Strutture:
- crm_agenda_events
- crm_agenda_attendees
- crm_communication_outbox
- crm_relationship_claims
- integration_registry

Supporta:
- appuntamenti;
- eventi CEPA;
- iniziative;
- sponsor;
- partner;
- follow-up;
- attività interne.

Visibilità:
- Direzione / manager;
- creatore;
- owner;
- invitati espliciti.

Creazione eventi comuni:
solo Direzione / manager.

Flusso ideale:
AGENDA
→ NOTIFICHE
→ RESPONSABILI
→ EMAIL
→ CALENDAR
→ TASK
→ CEPA
→ CRM

---

# ACCESSI / AUTH

Non esiste self-signup.

Non introdurre supabase.auth.signUp nel frontend.

Flusso:
RICHIESTA PUBBLICA
→ public_access_requests
→ revisione amministratore
→ ruolo
→ account
→ CRM seed
→ attivazione
→ login

Ruoli assegnabili dal flusso pubblico:
- viewer
- operator
- specialist

Mai:
- manager
- supervisor
- super_admin

Edge Function:
manage-access-request

Stato noto:
v4 con verify_jwt=true.

Hardening già applicato:
approve e resend_activation devono essere bloccati lato server finché il canale Auth email reale non è attivo e verificato.

Non sostituire questo controllo con un controllo solo frontend.

OTP:
- solo utenti già esistenti;
- shouldCreateUser=false;
- non attivare finché sender/template/redirect non sono verificati.

---

# EMAIL / GOOGLE

Regola:
i connettori disponibili via ChatGPT non equivalgono automaticamente a integrazioni backend autonome.

Stati concettuali da usare correttamente:
- connected_chat_only
- active
- pending
- disabled
- predisposed
- backend_active

Non dichiarare backend ciò che è solo connector.

---

# CEPA EVENTI

cepa_initiatives è la fonte unica.

Non creare una seconda tabella eventi.

Campi pubblici:
- slug
- public_summary
- venue_name
- venue_address
- registration_status
- featured
- published
- published_at
- capacity
- poster_asset_id
- hero_asset_id
- agenda_event_id

Media:
cepa_initiative_media

Ruoli:
- poster
- cover
- gallery
- speaker
- venue

Flusso:
CEPA interno
→ Agenda
→ notifiche
→ email
→ sito pubblico
→ gallery
→ follow-up

Le note interne non devono mai apparire pubblicamente.

---

# SPONSOR / PARTNER

Usare crm_relationship_claims.

Scopo:
impedire doppi contatti.

Se una realtà sponsor/partner/company/intermediary è già gestita in:
- contacted
- qualified
- opportunity

il secondo contatto deve essere bloccato o coordinato.

Estendere progressivamente a:
- ricerca territoriale;
- market_entities;
- network radar;
- sponsor eventi CEPA.

---

# ASSET GOVERNANCE

Fonte centrale:
asset_registry

Stati:
LOCKED
REUSE
ADAPT
REBUILD
VERIFY
REJECT

Non alterare arbitrariamente:
- logo Maglia
- logo CEPA
- logo SAP
- logo HDI
- sponsor ufficiali
- marchi ufficiali
- kit / uniformi

Usare asset autentici.

---

# ASSIEASY

Import:
FILE
→ STAGING
→ NORMALIZZAZIONE
→ VALIDAZIONE
→ MATCH CLIENTE
→ MATCH POLIZZA
→ PREVIEW
→ COMMIT CONTROLLATO

Mai import diretto nel portafoglio.

Tabelle:
- office_data_imports
- office_data_import_rows

Campi staging:
- raw_data
- normalized_data
- validation_status
- validation_errors
- client_match_id
- policy_match_id

Identificatori forti:
- codice fiscale
- metadata.assieasy_id

---

# BUSINESS INTELLIGENCE PRODUTTORI

Dati recuperati:
- 1.311 clienti
- 2.980 polizze
- circa €1.322.553 premi

Mappa:
- Maglia Assicurazioni S.a.s.: 1.155 clienti, 2.790 polizze, ~€1.242.658
- Coppola Francesco: 75 clienti, 104 polizze, ~€44.854
- Bettiga Alessia: 38 clienti, 40 polizze, ~€17.945
- Maglia Carlo: 31 clienti, 34 polizze, ~€10.625
- Bono Valentina: 8 clienti, 8 polizze, ~€3.955
- Barindelli Rosina: 4 clienti, 4 polizze, ~€2.517

Lettura strategica:
la rete produttori è fortemente Auto-oriented, mentre il portafoglio storico Maglia mostra maggiore profondità multiprodotto.

Obiettivo:
non trasformare ogni produttore in specialista.

Modello:
PRODUTTORE
→ CLIENTE
→ CHECK-UP MAGLIA
→ CENTRO CONSULENZIALE
→ SPECIALISTA
→ SOLUZIONE
→ PRODUTTORE
→ RELAZIONE CONTINUA

Livello 1:
Agenzia centrale
- governance
- rapporto HDI
- amministrazione
- specialisti
- CRM
- marketing
- CEPA
- prodotti complessi

Livello 2:
Produttori
- acquisizione
- relazione
- raccolta informazioni
- introduzione al Check-up

Livello 3:
Specialisti
- previdenza
- aziende
- salute
- tutela legale
- rischi specialistici

Modelli:
locale:
relazione + SAP + CEPA + appuntamento fisico

remoto:
digitale + video consulenza + CRM

KPI:
- clienti
- polizze/cliente
- premio/cliente
- cross-sell
- retention
- provvigioni
- Check-up generati
- referral

Gap da verificare:
email e cellulari mancanti in alcuni export AssiEasy.

Prossimo export:
Produttore | Cliente | Numero polizza | Compagnia | Ramo | Premio | Provvigione | Decorrenza | Scadenza | Stato | Incassato | Storno

---

# SECURITY SUPABASE

Prima di modifiche:
- verificare documentazione corrente;
- verificare RLS;
- verificare grants;
- verificare policies;
- verificare advisors.

Regole:
- RLS su tabelle esposte;
- grants espliciti;
- user_metadata non è autorizzazione;
- UPDATE richiede SELECT policy;
- USING + WITH CHECK;
- non usare SECURITY DEFINER come scorciatoia;
- mai service_role frontend.

Warning noti:
- assign_recovery_case SECURITY DEFINER callable da authenticated
- list_assignable_members idem
- record_recovery_outcome idem
- leaked password protection disabled

Audit dedicato.
Non rompere Recovery per silenziare warning.

---

# DESIGN SYSTEM

Palette:
#082B41
#11364F
#4D9E98
#EAF6EF
#EAF4FA
#F5EFE6
#F1EDFA
#F9E9E7
#19384B
#718792

Stile:
- premium
- chiaro
- leggibile
- istituzionale-moderno
- accessibile
- responsive

Evitare:
- nero dominante
- gradienti pesanti
- font minuscoli
- mega headline inutili
- troppe micro-card
- dashboard SaaS generica

Viewport minimi:
375
430
768
1024
1440

---

# TEST DATA

Ogni fixture:
prefisso:
TEST ·

metadata:
{
  "qa": true,
  "test_run": "<uuid-o-timestamp>",
  "cleanup_required": true
}

Non usare dati personali reali non necessari.

Dopo ogni test:
- verifica esito;
- salva risultato;
- elimina/archivia fixture;
- verifica cleanup.

---

# PRIORITÀ OPERATIVA

Non aggiungere cento nuove funzioni.

Sequenza:
RIEMPIRE
→ PROGRAMMARE
→ SIMULARE
→ TESTARE
→ VERIFICARE
→ CORREGGERE
→ SOLO DOPO ESTENDERE

Ordine:
1. Access/Auth QA
2. Sender Auth + OTP
3. Email/outbox/dedup
4. Agenda
5. CEPA Events
6. Sponsor Claim
7. CRM adattivo per ruolo
8. Responsive/accessibilità
9. Security audit
10. Import AssiEasy
11. Producer intelligence / Check-up / specialist routing

---

# FASE QA 01

Continuare da:
VERIFICA SISTEMA E TEST ACCESSO

Eseguire:
1. HEAD GitHub vs Render;
2. Supabase health;
3. integration_registry;
4. codice Auth;
5. manage-access-request;
6. Gmail bridge;
7. crm_notifications;
8. matrice test;
9. richiesta accesso isolata;
10. verifica arrivo amministrativo;
11. verifica AUTH_EMAIL_NOT_READY;
12. niente email Auth reale finché sender non è pronto;
13. verifica notifiche;
14. verifica outbox;
15. correzione errori;
16. Agenda;
17. CEPA Event;
18. Sponsor Claim;
19. CRM per ruolo.

---

# PROTOCOLLO DI SVILUPPO

Per ogni modifica:

1. verifica HEAD;
2. verifica deploy LIVE;
3. verifica Supabase;
4. leggi codice;
5. individua funzione;
6. patch minima;
7. niente rebuild totale;
8. valida JS;
9. verifica ID HTML;
10. verifica RLS;
11. query/test;
12. advisors;
13. cache bust se necessario;
14. commit;
15. deploy;
16. attendi LIVE;
17. verifica commit LIVE = HEAD;
18. testa journey;
19. report finale.

Se build_in_progress:
NON dichiarare LIVE.

Se integrazione esterna non è reale:
scrivere:
- predisposta
- pending
- connector-only
- disabled
- backend-active

secondo lo stato reale.

---

# MODELLO MENTALE PER OGNI FUNZIONE

Chiedersi sempre:

Cosa alimenta?
Da quali dati nasce?
Quali moduli la riusano?
Chi la vede?
Chi la modifica?
Chi viene notificato?
Qual è il prossimo passo?
Qual è l'esito?
Come viene misurato?
Come il CRM apprende senza modificare i privilegi?

Schema:

DATO
→ CONTESTO
→ AZIONE
→ RESPONSABILE
→ NOTIFICA
→ ESITO
→ APPRENDIMENTO CRM
→ NUOVA PRIORITÀ

---

# DEFINITION OF DONE

Un lavoro è completato solo quando:
- usa la fonte dati canonica;
- autorizzazione e RLS sono corrette;
- negative path testati;
- nessuna duplicazione inutile;
- UX realmente utilizzabile;
- deploy LIVE verificato se runtime modificato;
- commit LIVE = HEAD verificato;
- fixture QA ripulite;
- dipendenze esterne descritte correttamente;
- rollback point noto;
- blocker residui dichiarati.

---

# OUTPUT FINALE OBBLIGATORIO

Riportare:
1. stato iniziale verificato;
2. file modificati;
3. schema/function modificati;
4. test eseguiti;
5. esiti;
6. controlli sicurezza;
7. commit;
8. deploy;
9. stato LIVE;
10. blocker;
11. prossima azione a maggior valore.

---

# COMANDO OPERATIVO FINALE

Prendi questo incarico come mandato tecnico permanente per MAGLIA 360 & C.E.P.A. OS.

Non limitarti a suggerire.
Quando hai accesso agli strumenti necessari:
- verifica;
- analizza;
- modifica;
- testa;
- correggi;
- deploya;
- verifica;
- documenta.

Non creare scorciatoie architetturali.
Non sostituire la realtà del sistema con supposizioni.
Non duplicare.
Non dichiarare completato ciò che non hai provato.

Obiettivo finale:
portare MAGLIA 360 & C.E.P.A. OS da sistema sviluppato a sistema verificato, testato, sicuro, efficiente, professionale, operativo, scalabile e realmente utilizzabile.