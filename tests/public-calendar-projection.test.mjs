import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {projectPublicCalendar}=require('../lib/scd-public-calendar-projection.js');

const fixture={eventId:'EV-2026-01',title:'Allenamento Under 16',date:'2026-10-08',time:'18:00',team:'Under 16',venue:'Colico',source:'R20_MANAGER',sourceUpdatedAt:'2026-10-07T17:00:00Z'};

test('public calendar maps a real identified record and retains provenance',()=>{
 const events=projectPublicCalendar([{...fixture,internalNotes:'SEGRETO',responsibleIds:['PERSON-1'],medicalFlag:true}]);
 assert.equal(events.length,1);
 assert.deepEqual(events[0],{id:'EV-2026-01',title:'Allenamento Under 16',date:'2026-10-08',time:'18:00',endTime:'',team:'Under 16',category:'',opponent:'',competition:'',venue:'Colico',kind:'TRAINING',source:'R20_MANAGER',sourceUpdatedAt:'2026-10-07T17:00:00Z',verifiedAt:null});
 assert.equal('internalNotes' in events[0],false);
 assert.equal('medicalFlag' in events[0],false);
});

test('public calendar refuses private, team-only and safeguarding events',()=>{
 const privateRows=[{...fixture,eventId:'E1',visibility:'PRIVATE'},{...fixture,eventId:'E2',visibility:'STAFF'},{...fixture,eventId:'E3',visibility:'SAFEGUARDING'},{...fixture,eventId:'E4',isPublic:false},{...fixture,eventId:'E5',private:true}];
 assert.deepEqual(projectPublicCalendar(privateRows),[]);
});

test('public calendar never generates an ID, title or date',()=>{
 const bad=[{...fixture,eventId:''},{...fixture,title:''},{...fixture,date:''},{...fixture,date:'2026-02-30'},{...fixture,date:'2026-13-08'}];
 assert.deepEqual(projectPublicCalendar(bad),[]);
});

test('public calendar deduplicates canonical event IDs without guessing identity',()=>{
 const events=projectPublicCalendar([fixture,{...fixture,title:'Errore duplicato'}]);
 assert.equal(events.length,1);
 assert.equal(events[0].title,fixture.title);
});

test('public calendar normalizes Italian dates and classifies match events',()=>{
 const [row]=projectPublicCalendar([{...fixture,eventId:'EV-2',date:'11/10/2026',type:'PARTITA',title:'SCD - Avversario',visibility:'PUBLIC',verifiedAt:'2026-10-07T17:00:00Z'}]);
 assert.equal(row.date,'2026-10-11');
 assert.equal(row.kind,'MATCH');
 assert.equal(row.verifiedAt,'2026-10-07T17:00:00Z');
});

test('public calendar fails closed on malformed response or array elements',()=>{
 assert.deepEqual(projectPublicCalendar(null),[]);
 assert.deepEqual(projectPublicCalendar({rows:[fixture]}),[]);
 assert.deepEqual(projectPublicCalendar([null,123,'text',{}]),[]);
});
