import {sha256} from 'hash-wasm'

export default (() => {
    const memo = {};
    return async (keyfile) => {
        const BigInt = window.BigInt;
        let keyfileBytes;

        if(typeof keyfile === 'string') {
            keyfileBytes = Array.from(Buffer.from(keyfile, 'base64'));
        } else {
            keyfileBytes = Array.from(keyfile);
        }
        const memoHash = await sha256(Buffer.from(keyfileBytes));

        //If the keyfile data is memoized, return it.
        if(memo[memoHash]) {
            return memo[memoHash];
        }

        const signatureOffset    = {start: 0, length: 32},
            idOffset             = {start: signatureOffset.start + signatureOffset.length, length: 32},
            creationDateOffset   = {start: idOffset.start + idOffset.length, length: 8},
            labelLengthOffset    = {start: creationDateOffset.start + creationDateOffset.length, length: 1},
            labelOffset          = {start: labelLengthOffset.start + labelLengthOffset.length, length: keyfileBytes[labelLengthOffset.start]},
            iterationsOffset     = {start: labelOffset.start + labelOffset.length, length: 1},
            memorySizeOffset     = {start: iterationsOffset.start + iterationsOffset.length, length: 3},
            parallelismOffset    = {start: memorySizeOffset.start + memorySizeOffset.length, length: 1},
            argon2SaltOffset     = {start: parallelismOffset.start + parallelismOffset.length, length: 32},
            secretboxSaltOffset  = {start: argon2SaltOffset.start + argon2SaltOffset.length, length: 24},
            encryptedBytesOffset = {start: secretboxSaltOffset.start + secretboxSaltOffset.length, length: keyfileBytes.length - secretboxSaltOffset.start - secretboxSaltOffset.length};

        //Get the data as binary data.
        let signature,
            id,
            creationDate,
            labelLength,
            label,
            labelBytes,
            iterations,
            memorySize,
            parallelism,
            argon2Salt,
            secretboxSalt,
            encryptedBytes;

        signature = keyfileBytes.slice(signatureOffset.start, signatureOffset.start + signatureOffset.length);

        id = keyfileBytes.slice(idOffset.start, idOffset.start + idOffset.length);

        creationDate = keyfileBytes.slice(creationDateOffset.start, creationDateOffset.start + creationDateOffset.length);
        creationDate = BigInt(creationDate[0]) << 56n | BigInt(creationDate[1]) << 48n | BigInt(creationDate[2]) << 40n | BigInt(creationDate[3]) << 32n | BigInt(creationDate[4]) << 24n | BigInt(creationDate[5]) << 16n | BigInt(creationDate[6]) << 8n | BigInt(creationDate[7]);
        creationDate = parseInt(creationDate);

        //Extract the 
        labelLength = keyfileBytes.slice(labelLengthOffset.start, labelLengthOffset.start + labelLengthOffset.length)[0];
        
        labelBytes = keyfileBytes.slice(labelOffset.start, labelOffset.start + labelOffset.length);
        label = new window.TextDecoder().decode(new Uint8Array(labelBytes));

        iterations = keyfileBytes.slice(iterationsOffset.start, iterationsOffset.start + iterationsOffset.length)[0];

        memorySize = keyfileBytes.slice(memorySizeOffset.start, memorySizeOffset.start + memorySizeOffset.length);
        memorySize = memorySize[0] << 16 | memorySize[1] << 8 | memorySize[2];

        parallelism = keyfileBytes.slice(parallelismOffset.start, parallelismOffset.start + parallelismOffset.length)[0];

        argon2Salt = keyfileBytes.slice(argon2SaltOffset.start, argon2SaltOffset.start + argon2SaltOffset.length);

        secretboxSalt = keyfileBytes.slice(secretboxSaltOffset.start, secretboxSaltOffset.start + secretboxSaltOffset.length);

        encryptedBytes = keyfileBytes.slice(encryptedBytesOffset.start, encryptedBytesOffset.start + encryptedBytesOffset.length);

        const returnData = {
            signature,
            id,
            creationDate,
            labelLength,
            label,
            iterations,
            memorySize,
            parallelism,
            argon2Salt,
            secretboxSalt,
            encryptedBytes
        };

        memo[memoHash] = returnData;
        
        return returnData;
    }
})();