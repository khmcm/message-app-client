<template>
    <van-nav-bar title="Profiles" :left-text="(window.history.length > 1)?'Back':''" @click-left="navigateBack()"></van-nav-bar>
    <div class="container">
        <van-list>
            <van-cell v-bind:key="keyfile.id" v-for="(keyfile, index) in keyfiles" :title="keyfile.label" :clickable="true" @click="loadKeyfile(index)"></van-cell>
        </van-list>
    </div>
    <van-popup v-model:show="isPopupVisible" position="bottom" style="background: rgb(244, 244, 244); height: 60%;" round>
        <div class="popup-container">
            <div class="popup-text">Enter a password to unlock this account.</div>
            <div class="vspacer-8px"></div>
            <van-field v-model="password" type="password" class="popup-password-input" label="password"/>
            <div class="vspacer-16px"></div>
            <van-button round type="primary" @click="unlockKeyfile(currentKeyfile)">Unlock</van-button>
            <div class="vspacer-16px"></div>
            <div class="link is-danger" @click="deleteKeyfile(currentKeyfileIndex)">Delete profile</div>
        </div>
    </van-popup>
    <van-tabbar v-if="$store.state.rootKey" v-model="currentRouteNavIndex">
        <van-tabbar-item icon="user-o" to="/">Profiles</van-tabbar-item>
        <van-tabbar-item icon="friends-o" to="/contacts">Contacts</van-tabbar-item>
        <van-tabbar-item icon="setting-o" to="/settings">Settings</van-tabbar-item>
    </van-tabbar>
</template>

<script>
    import {ref} from 'vue'
    import config from '@/config.js'
    import extractKeyfileData from '@/helpers/extract-keyfile-data.js'
    import {argon2id} from 'hash-wasm'
    import {Notify} from 'vant'
    import nacl from 'tweetnacl'
    import keysFromRootKey from '@/helpers/keys-from-root-key.js'
    import getCurrentRouteNavIndex from '@/helpers/get-current-route-nav-index.js'

    function navigateBack() {
        this.$router.go(-1);
    }

    function loadKeyfile(index) {
        this.currentKeyfile = this.keyfiles[index];
        this.currentKeyfileIndex = index;
        this.isPopupVisible = true;
    }

    /**
     * @description Begins a procedure for deleting a keyfile from the keyfiles
     *              JSON
     * @param {number} index
     * @returns {void}
     */
    function deleteKeyfile(index) {
        const keyfiles = JSON.parse(window.localStorage.getItem('msgApp.keyFiles'));
        const keyfile = keyfiles[index];
        const shouldDeleteKeyfile = confirm(`Are you sure you want to delete the keyfile, '${keyfile.label}'?`);
        if(!shouldDeleteKeyfile) { return; }
        const keyfileLabelConfirmation = prompt(`Type the label of the keyfile, '${keyfile.label}', to confirm the deletion`, '');
        if(keyfileLabelConfirmation !== keyfile.label) {
            alert(`The label supplied does not match the keyfile's. It will not be deleted.`);
            return;
        }

        Notify({message: `Deleted profile, '${keyfile.label}'`, type: 'primary'});
        keyfiles.splice(index, 1);
        this.keyfiles.splice(index, 1);
        window.localStorage.setItem('msgApp.keyFiles', JSON.stringify(keyfiles));
    }

    async function unlockKeyfile(keyfile) {
        const derivedPasswordKey = await argon2id({
            password: Buffer.from(new TextEncoder().encode(this.password.normalize('NFKC'))),
            iterations: keyfile.iterations,
            memorySize: keyfile.memorySize,
            parallelism: keyfile.parallelism,
            hashLength: 32,
            salt: new Uint8Array(keyfile.argon2Salt),
            outputType: 'binary'
        });

        //Attempt to decrypt the keyfile encryptedBytes
        const decryptedRootKeyBytes = nacl.secretbox.open(new Uint8Array(keyfile.encryptedBytes), new Uint8Array(keyfile.secretboxSalt), new Uint8Array(Array.from(derivedPasswordKey)));

        if(!decryptedRootKeyBytes) {
            alert('Failed to decrypt.');
            return;
        }

        //Derive the keys from the root key.
        const {
            signingKeyPair,
            asymmetricEncryptionKeyPair,
            symmetricEncryptionKey,
            secretId,
            hmacKey
        } = await keysFromRootKey(decryptedRootKeyBytes);

        this.$store.commit('setRootKey', Array.from(decryptedRootKeyBytes));
        this.$store.commit('setPublicAsymmetricEncryptionKey', Array.from(asymmetricEncryptionKeyPair.publicKey));
        this.$store.commit('setPrivateAsymmetricEncryptionKey', Array.from(asymmetricEncryptionKeyPair.secretKey));
        this.$store.commit('setPublicSigningKey', Array.from(signingKeyPair.publicKey));
        this.$store.commit('setPrivateSigningKey', Array.from(signingKeyPair.secretKey));
        this.$store.commit('setSymmetricEncryptionKey', symmetricEncryptionKey);
        this.$store.commit('setSecretId', Array.from(secretId));
        this.$store.commit('setHmacKey', Array.from(hmacKey));


        this.$router.push('/contacts');
    }
    

    export default {
        mounted() {
            let keyfiles;
            (async () => {
                if(window.localStorage.getItem('msgApp.keyFiles')) {
                    keyfiles = JSON.parse(window.localStorage.getItem('msgApp.keyFiles'));
                    for(let i in keyfiles) {
                        keyfiles[i] = await extractKeyfileData(keyfiles[i].data);
                    }
                    this.keyfiles = keyfiles;
                }

                if(this.keyfiles.length === 0) {
                    this.$router.push('/signup');
                }
            })();
        },
        setup() {
            let keyfiles = ref([]);

            const isPopupVisible = ref(false),
                  currentKeyfile = ref(null),
                  currentKeyfileIndex = ref(null);
            const password = ref('');
            return {
                keyfiles,
                currentKeyfile,
                currentKeyfileIndex,
                config,
                isPopupVisible,
                password,
                window
            }
        },
        computed: {
            currentRouteNavIndex: getCurrentRouteNavIndex
        },
        methods: {
            navigateBack,
            loadKeyfile,
            extractKeyfileData,
            unlockKeyfile,
            deleteKeyfile
        }
    }
</script>

<style lang="scss" scoped>
    @import '@/styles/_colors.scss';
    @import '@/styles/_fonts.scss';
    @import '@/styles/_sizes.scss';

    .header {
        text-align: center;
        font-size: $size-header-primary;
        font-weight: bold;
        font-family: $font-header-primary;
        color: white;
    }
    .header-secondary {
        text-align: center;
        font-size: $size-header-secondary;
        font-weight: bold;
        font-family: $font-header-primary;
        color: white;
    }

    .keyFile-container {
        background: white;
        position: relative;
        width: 90vw;
        max-width: 500px;
        height: 75px;
        border-radius: 6px;
        left: 50%;
        transform: translateX(-50%);
        cursor: pointer;
    }
    .keyFile-label {
        position: relative;
        color: $color-signup-green;
        font-weight: bold;
        font-size: 20px;
        text-align: center;
        top: 50%;
        transform: translateY(-50%);
    }
    .container {
        position: relative;
        height: fit-content;
        width: 100vw;
        min-height: 100vh;
    }

    .popup {
        background: rgb(244, 244, 244);
        height: 60%;
    }
    .popup-text {
        width: 80%;
        margin-top: 16px;
        text-align: center;
    }
    .popup-container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .popup-button {
        max-width: 450px;
        margin-top: 16px;
    }

    .vspacer-8px {
        margin-top: 8px;
    }
    .vspacer-16px {
        margin-top: 16px;
    }

    .link {
        color: blue;
        text-decoration: underline;
        cursor: pointer;
        &:hover {
            text-decoration: none;
        }
        &.is-danger {
            color: red;
        }
    }
</style>
