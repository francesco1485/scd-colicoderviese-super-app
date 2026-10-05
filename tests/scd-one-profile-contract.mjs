import '../lib/scd-one-profile.js';

const Profile=globalThis.SCDOneProfile;
function ok(condition,message){if(!condition)throw new Error(message)}

ok(Profile&&typeof Profile.build==='function','SCD ONE profile model missing');

const model=Profile.build({
  twin:{name:'Fenix',role:'Tifoso',kit:'lake',tone:'t3',hair:'h3'},
  followedTeam:'U16 Élite',
  teamModel:{
    next:{id:'E1',date:'2026-10-04',time:'15:00',kind:'MATCH',opponent:'Avversaria',venue:'Colico',source:'SCD'}
  },
  calendarSourceState:'VERIFIED',
  appMode:'INSTALLABLE',
  privateVerified:false
});

ok(model.identity.name==='Fenix','local identity name mismatch');
ok(model.identity.completeness.percent===100,'profile completeness mismatch');
ok(model.team.name==='U16 Élite','followed team mismatch');
ok(model.team.next?.id==='E1','next verified team activity missing');
ok(model.team.sourceState==='VERIFIED','calendar source state mismatch');
ok(model.app.installable===true&&model.app.installed===false,'installable app state mismatch');
ok(model.access.state==='PUBLIC','public access state mismatch');

const empty=Profile.build({
  twin:{},
  followedTeam:'',
  teamModel:null,
  calendarSourceState:'UNVERIFIED',
  appMode:'WEB',
  privateVerified:true
});
ok(empty.team.next===null,'missing team must not invent next activity');
ok(empty.team.name==='Nessuna squadra seguita','empty followed-team label mismatch');
ok(empty.access.state==='VERIFIED','verified private access state mismatch');
ok(empty.identity.completeness.percent===0,'empty local profile completeness must be zero');

console.log('SCD ONE PROFILE CONTRACT PASS');
