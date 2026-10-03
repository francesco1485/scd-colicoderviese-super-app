import '../lib/scd-one-router.js';

const Router=globalThis.SCDOneRouter;
function ok(condition,message){if(!condition)throw new Error(message)}

ok(Router&&typeof Router.parseHash==='function','SCD ONE router missing');
ok(Router.canonicalRoute('pulse')==='home','legacy pulse route must canonicalize to home');
ok(Router.canonicalRoute('twin')==='profile','legacy twin route must canonicalize to profile');
ok(Router.parseHash('#profile').view==='twin','profile route must resolve to Twin view');
ok(Router.parseHash('#teams?team=U16%20%C3%89lite').params.team==='U16 Élite','team deep-link parameter decode failed');
ok(Router.teamHash('U16 Élite')==='#teams?team=U16%20%C3%89lite','team deep-link build mismatch');
ok(Router.buildHash('calendar',{team:'Juniores Élite'})==='#calendar?team=Juniores%20%C3%89lite','canonical calendar hash mismatch');
ok(Router.parseHash('#unknown').route==='home','unknown route must fail closed to home');
ok(Router.parseHash('#pulse?team=A').route==='home','legacy route must preserve canonical meaning');
ok(Router.parseHash('#pulse?team=A').params.team==='A','legacy route query must be preserved');

console.log('SCD ONE ROUTER CONTRACT PASS');
