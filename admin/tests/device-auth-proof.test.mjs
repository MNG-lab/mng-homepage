import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,constants} from 'node:crypto';
import {encryptChallenge,inspectAuth} from '../scripts/device-auth-proof.mjs';
test('device challenge is encrypted and credential inspection emits only booleans',()=>{
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const encoded=publicKey.export({type:'spki',format:'der'}).toString('base64');
 assert.equal(encryptChallenge('Waiting for device login',encoded),null);
 const encrypted=encryptChallenge('https://auth.openai.com/codex/device ABCD-12345',encoded);
 assert.ok(!encrypted.includes('ABCD-12345'));
 const decoded=JSON.parse(privateDecrypt({key:privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(encrypted,'base64')).toString());
 assert.equal(decoded.code,'ABCD-12345');
 const flags=inspectAuth(JSON.stringify({tokens:{access_token:'secret-a',refresh_token:'secret-r',id_token:'secret-i'}}));
 assert.deepEqual(flags,{valid_json:true,has_access_token:true,has_refresh_token:true,has_id_token:true});
 assert.ok(!JSON.stringify(flags).includes('secret'));
 assert.equal(inspectAuth('{}').has_access_token,false);
});
