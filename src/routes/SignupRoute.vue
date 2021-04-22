<template>
    <van-popup v-model:show="isPopupVisible" style="background: rgb(244, 244, 244); height: 60%;" position="bottom" round>
        <div class="popup-container">
            <div class="vpsacer-16px"></div>
            <div class="popup-text">Enter a password and account label to finish your registration.</div>
            <div class="vpsacer-16px"></div>
            <van-field v-model="password" type="password" class="popup-password-input" label="password"/>
            <van-field v-model="accountLabel" type="text" @keydown="filterCharacters" class="popup-label-input" maxlength="64" label="label" placeholder="A description to recognize this keyfile"/>
            <van-button round type="primary" style="margin-top: 16px;" @click="completeRegistration()">Complete registration</van-button>
        </div>
    </van-popup>
    <van-overlay :show="isLoading">
        <van-row justify="center" align="center" class="overlay">
            <van-loading color="#ffffff" size="64px" text-size="20px" :vertical="true">{{loadingMessage}}</van-loading>
        </van-row>
    </van-overlay>
    <div class="container">
        <div class="header">Message App</div>
        <button class="create-button" @click="registerAccount()">Get started!</button>
        <br/>
        <div class="link"><router-link to="/">Already have an account</router-link></div>
        <br/>
        <div class="link"><router-link to="/qrcodelogin">Have a QR code?</router-link></div>
    </div>
</template>

<script>
    import nacl from 'tweetnacl'
    import {argon2id} from 'hash-wasm'
    import config from '@/config.js'
    import axios from 'axios'

    /* eslint-disable */
    import {Buffer} from 'buffer/'

    import {ref} from 'vue'
    import keysFromRootKey from '@/helpers/keys-from-root-key.js'

    /**
     * Navigates back in history by one.
     */
    function navigateBack() {
        this.$router.go(-1);
    }

    function filterCharacters(e) {
        if(e.key.match(/^[^a-zA-Z0-9\s]+$/)) { 
            e.preventDefault();
        }
    }

    /* eslint-disable */
    async function registerAccount() {
        const rootKey = nacl.randomBytes(32);

        const {
            asymmetricEncryptionKeyPair,
            signingKeyPair,
            symmetricEncryptionKey,
            secretId,
            hmacKey
        } = await keysFromRootKey(rootKey);

        this.$store.commit('setRootKey', Array.from(rootKey));
        this.$store.commit('setPublicAsymmetricEncryptionKey', Array.from(asymmetricEncryptionKeyPair.publicKey));
        this.$store.commit('setPrivateAsymmetricEncryptionKey', Array.from(asymmetricEncryptionKeyPair.secretKey));
        this.$store.commit('setPublicSigningKey', Array.from(signingKeyPair.publicKey));
        this.$store.commit('setPrivateSigningKey', Array.from(signingKeyPair.secretKey));
        this.$store.commit('setSymmetricEncryptionKey', Array.from(symmetricEncryptionKey));
        this.$store.commit('setSecretId', Array.from(secretId));
        this.$store.commit('setHmacKey', Array.from(hmacKey));

        this.isPopupVisible = true;
    }

    function stopLoading() {
        this.loadingMessage = '';
        this.isLoading = false;
    }

    async function completeRegistration() {
        /**
         * Prevent double-clicking that creates multiple
         * of the same profile
         **/
        if(this.isLoading) {
            return;
        }
        const keyfileSignatureBytes = Buffer.from(config.keyfileSignature, 'hex');

        //Hash the password

        //Detect parameters.
        const parallelism   = 4;
        const iterations    = 12;
        const memorySize    = 8192;
        const secretboxSalt = nacl.randomBytes(24);
        const argon2Salt    = nacl.randomBytes(32);

        this.loadingMessage = 'Generating keys ...';
        this.isLoading = true;
        this.isPopupVisible = false;
        const derivedPasswordKey = await argon2id({
            password: Buffer.from(new TextEncoder().encode(this.password.normalize('NFKC'))),
            iterations,
            memorySize,
            parallelism,
            hashLength: 32,
            salt: argon2Salt,
            outputType: 'binary'
        });

        //The bytes that will be encrypted
        const bytesToEncrypt = new Uint8Array(
            Array.from(this.$store.state.rootKey)
        );

        const encryptedBytes = nacl.secretbox(bytesToEncrypt, secretboxSalt, derivedPasswordKey);


        const iterationsBytes  = [iterations & 0xFF];
        const memorySizeBytes = [(memorySize >> 16) & 0xFF, (memorySize >> 8) & 0xFF, memorySize & 0xFF];
        const parallelismBytes = [parallelism & 0xFF];

        const idBytes = Array.from(nacl.randomBytes(32));

        const accountLabelBytes = Array.from(Buffer.from(new TextEncoder().encode(this.accountLabel.normalize('NFKC'))));
        const accountLabelLengthByte = [accountLabelBytes.length];

        const accountCreationDate = Date.now();
        const accountCreationDateBytes = [
            parseInt((BigInt(accountCreationDate) >> 56n) & 0xFFn),
            parseInt((BigInt(accountCreationDate) >> 48n) & 0xFFn),
            parseInt((BigInt(accountCreationDate) >> 40n) & 0xFFn),
            parseInt((BigInt(accountCreationDate) >> 32n) & 0xFFn),
            parseInt((BigInt(accountCreationDate) >> 24n) & 0xFFn),
            parseInt((BigInt(accountCreationDate) >> 16n) & 0xFFn),
            parseInt((BigInt(accountCreationDate) >> 8n)  & 0xFFn),
            parseInt( BigInt(accountCreationDate)         & 0xFFn)
        ];

        const keyfileBytes = Buffer.from([
            ...Array.from(keyfileSignatureBytes),
            ...Array.from(idBytes),
            ...Array.from(accountCreationDateBytes),
            ...accountLabelLengthByte,
            ...Array.from(accountLabelBytes),
            ...iterationsBytes,
            ...memorySizeBytes,
            ...parallelismBytes,
            ...Array.from(argon2Salt),
            ...Array.from(secretboxSalt),
            ...Array.from(encryptedBytes)
        ]);

        window.localStorage.setItem('msgApp.keyFiles', JSON.stringify(
            ((window.localStorage.getItem('msgApp.keyFiles') && JSON.parse(window.localStorage.getItem('msgApp.keyFiles'))) || [])
                .concat({
                    id: Buffer.from(nacl.randomBytes(32)).toString('hex'),
                    label: this.accountLabel,
                    data: Buffer.from(keyfileBytes).toString('base64')
                })
            )
        );

        //Request a challenge.
        const registrationResult = await axios.post(`${config.baseAPIUrl}/api/register_keys`, {
            publicAsymmetricEncryptionKey: Buffer.from(this.$store.state.publicAsymmetricEncryptionKey).toString('hex'),
            publicSigningKey: Buffer.from(this.$store.state.publicSigningKey).toString('hex')
        });


        this.stopLoading();
    }

    function uint8ArrayToHex(ab) {
        return Array.from(ab).map(byte => byte.toString(16)).join('');
    }

    export default {
        name: 'SignupRoute',
        setup() {
            const accountLabel        = ref(''),
                  isLoading           = ref(false),
                  isPopupVisible      = ref(false),
                  loadingMessage      = ref(''),
                  popupButtonCallback = ref(true),
                  password            = ref('');

            return {
                accountLabel,
                isLoading,
                isPopupVisible,
                loadingMessage,
                popupButtonCallback,
                password
            }
        },
        methods: {
            stopLoading,
            completeRegistration,
            registerAccount,
            uint8ArrayToHex,
            filterCharacters,
            navigateBack
        }
    }
</script>

<style lang="scss" scoped>
    @import '@/styles/_colors.scss';
    @import '@/styles/_sizes.scss';
    @import '@/styles/_fonts.scss';

    .popup {
        background: rgb(244, 244, 244) !important;
        height: 60% !important;
    }
    .popup-container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .popup-text {
        width: 80%;
        margin-top: 16px;
        text-align: center;
    }
    .popup-password-input {
        max-width: 450px;
        margin-top: 16px;
    }
    .popup-label-input {
        max-width: 450px;
        margin-top: 16px;
    }

    .overlay {
        height: 100vh;
        left: 0;
        position: absolute;
        top: 0;
        width: 100vw;
    }

    .link {
        a {
            color: white;
        }
        font-family: $font-content-primary;
        display: inline-block;
        left: 50%;
        position: relative;
        text-decoration: underline;
        text-align: center;
        top: 120px;
        transform: translateX(-50%);
    }

    .header {
        color: white;
        font-family: $font-header-primary;
        font-size: $size-header-primary;
        font-weight: bold;
        position: relative;
        text-align: center;
        top: 32px;
    }

    .container {
        background: $color-signup-green;
        height: 100vh;
        left: 0;
        position: absolute;
        top: 0;
        width: 100vw;
    }

    .create-button {
        border-radius: 20px;
        color: $color-signup-green;
        background: white;
        border: none;
        font-size: 20px;
        font-weight: bold;
        left: 50%;
        padding: 10px 20px 10px 20px;
        position: relative;
        top: 100px;
        transform: translateX(-50%);
        cursor: pointer;
    }

    .vspacer-16px {
        margin-top: 16px;
    }
</style>