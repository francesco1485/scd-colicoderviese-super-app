import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { visionData, visionScreens } from './screens.ts';
describe('SCD Vision 2026 staging invariants',()=>{
 it('no private data',()=>{ for(const key of ['fixtures','athletes','families','payments','documents','metrics','news','sponsors'] as const)assert.equal(visionData[key],null); });
 it('Sky disconnected',()=>assert.equal(visionData.assistantConnected,false));
 it('six screens',()=>assert.deepEqual(visionScreens.map(s=>s.id),['home','calendar','athlete','family','staff','communications']));
});
