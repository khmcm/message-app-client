import {sha256} from 'hash-wasm'
import nacl from 'tweetnacl'
import auth from 'tweetnacl-auth'
nacl.auth = auth;

export default async (rootKey) => {

    const secondRootKey = Buffer.from(await sha256(Buffer.from(rootKey)),       'hex'),
          thirdRootKey  = Buffer.from(await sha256(Buffer.from(secondRootKey)), 'hex'),
          fourthRootKey = Buffer.from(await sha256(Buffer.from(thirdRootKey)),  'hex'),
          fifthRootKey  = Buffer.from(await sha256(Buffer.from(fourthRootKey)), 'hex');
    
    const firstKey  = Buffer.from(nacl.auth(Buffer.from(rootKey), rootKey)),
          secondKey = Buffer.from(nacl.auth(secondRootKey,        rootKey)),
          thirdKey  = Buffer.from(nacl.auth(thirdRootKey,         rootKey)),
          fourthKey = Buffer.from(nacl.auth(fourthRootKey,        rootKey)),
          fifthKey  = Buffer.from(nacl.auth(fifthRootKey,         rootKey));

    //Derive a signing keypair from the first root key, by using it as a seed.
    const signingKeyPair = nacl.sign.keyPair.fromSeed(firstKey);

    //Derive an asymmetric encryption key pair from the first root key.
    const asymmetricEncryptionKeyPair = nacl.box.keyPair.fromSecretKey(secondKey);

    //Derive an encryption key from the second root key.
    const symmetricEncryptionKey = thirdKey;

    //Derive a hmac key from the third root key.
    const secretId = fourthKey;

    const hmacKey = fifthKey;

    return {
        signingKeyPair,
        asymmetricEncryptionKeyPair,
        symmetricEncryptionKey,
        secretId,
        hmacKey
    }
}