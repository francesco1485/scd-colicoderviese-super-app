import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildDirectionHome}=require('../lib/scd-dirigenza-home.js');

const now='2026-10-08T12:00:00Z';
const fixture={
  generatedAt:'2026-10-08T11:00:00Z',
  verifiedAt:'2026-10-08',
  calendarReconciledAt:'2026-10-08T10:45:00+02:00',
  sourceHealth:[
    {sourceId:'SOURCE_A',status:'OK'},
    {sourceId:'SOURCE_B',status:'ERROR',error:'HTTP_503'}
  ],
  verifiedItems:[
    {id:'OPEN_1',category:'OPPORTUNITIES',title:'Synthetic opportunity',authority:'Fixture authority',sourceUrl:'https://example.org/one',verification:'WEB_VERIFIED_PRIMARY_SOURCE',status:'OPEN',closesAt:'2026-10-16T12:00:00Z'},
    {id:'OLD_1',category:'OPPORTUNITIES',title:'Expired fixture',authority:'Fixture authority',sourceUrl:'https://example.org/old',verification:'WEB_VERIFIED_PRIMARY_SOURCE',status:'OPEN',closesAt:'2026-10-01T12:00:00Z'},
    {id:'UNVERIFIED_1',category:'OPPORTUNITIES',title:'Candidate fixture',sourceUrl:'https://example.org/candidate',verification:'DISCOVERED_NEEDS_REVIEW',status:'OPEN',closesAt:'2026-10-10T12:00:00Z'},
    {id:'EVENT_1',category:'TERRITORY',title:'Synthetic local event',authority:'Fixture organizer',territory:'COLICO',sourceUrl:'https://example.org/event',verification:'WEB_VERIFIED_OFFICIAL_TERRITORIAL',startsAt:'2026-10-11T12:00:00Z',calendarReconciliation:{signal:'SAME_DAY_LOCAL_OVERLAP_REVIEW',level:'HIGH',note:'Human review'}},
    {id:'EVENT_OLD',category:'TERRITORY',title:'Past fixture',territory:'DERVIO',sourceUrl:'https://example.org/old-event',verification:'WEB_VERIFIED_OFFICIAL_TERRITORIAL',startsAt:'2026-09-01T12:00:00Z'}
  ],
  candidates:[{id:'UNVERIFIED_1',verification:'DISCOVERED_NEEDS_REVIEW'}],
  territoryStatus:[{territory:'DERVIO',status:'NO_FUTURE_EVENT_VERIFIED_AT_CHECK'}]
};
const before=JSON.stringify(fixture);
const home=buildDirectionHome(fixture,now);
assert.equal(home.mode,'READ_ONLY');
assert.equal(home.visualState,'PENDING_VISUAL_APPROVAL');
assert.equal(home.source.state,'DEGRADED');
assert.equal(home.source.sourceErrors[0].sourceId,'SOURCE_B');
assert.equal(home.summary.verifiedOpportunities,1);
assert.equal(home.summary.deadlinesWithin14Days,1);
assert.equal(home.attention.opportunityDeadlines[0].eligibility,'REQUIRES_HUMAN_REVIEW');
assert.equal(home.summary.upcomingTerritoryEvents,1);
assert.equal(home.summary.territoryCoordinationSignals,1);
assert.equal(home.attention.territoryCoordination[0].id,'EVENT_1');
assert.equal(home.candidateReview.status,'DISCOVERED_NEEDS_REVIEW');
assert.equal(home.candidateReview.count,1);
assert.equal(home.territoryCoverage[0].territory,'DERVIO');
assert.equal(JSON.stringify(fixture),before,'read model must not mutate source snapshot');
const clean={...fixture,sourceHealth:[{sourceId:'SOURCE_A',status:'OK'}]};
assert.equal(buildDirectionHome(clean,now).source.state,'HEALTHY');
assert.equal(buildDirectionHome({...clean,generatedAt:'2026-10-05T11:00:00Z'},now).source.state,'STALE');
assert.equal(buildDirectionHome({...clean,sourceHealth:[]},now).source.state,'NOT_SCANNED');
assert.throws(()=>buildDirectionHome({},'bad-time'),/INVALID_REFERENCE_TIME/);
console.log('DIRECTION HOME READ MODEL PASS',{opportunities:home.summary.verifiedOpportunities,territory:home.summary.upcomingTerritoryEvents,review:home.candidateReview.count});
