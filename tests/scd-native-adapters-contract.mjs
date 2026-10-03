import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const adapters=require('../lib/scd-native-adapters.js');

assert.equal(typeof adapters.share,'function');
assert.equal(typeof adapters.deepLinks.navigate,'function');
assert.equal(typeof adapters.push.register,'function');
assert.equal(typeof adapters.media.capture,'function');
assert.equal(typeof adapters.secureStorage.get,'function');
assert.equal(typeof adapters.secureStorage.set,'function');
assert.equal(typeof adapters.secureStorage.remove,'function');
assert.equal(await adapters.share({title:'SCD ONE'}),false);
const originalRuntime=globalThis.SCDNextGen;
globalThis.SCDNextGen={setView:route=>route==='profile'};
assert.equal(adapters.deepLinks.navigate('profile'),true);
assert.equal(adapters.deepLinks.navigate('unknown'),false);
globalThis.SCDNextGen=originalRuntime;
await assert.rejects(adapters.push.register(),{message:'NATIVE_ADAPTER_UNAVAILABLE'});
await assert.rejects(adapters.media.capture(),{message:'NATIVE_ADAPTER_UNAVAILABLE'});
await assert.rejects(adapters.secureStorage.get('session'),{message:'NATIVE_ADAPTER_UNAVAILABLE'});
console.log('SCD NATIVE ADAPTERS CONTRACT OK');
