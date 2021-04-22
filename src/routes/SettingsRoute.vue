<template>
    <van-nav-bar title="Settings" :left-text="(window.history.length > 1)?'Back':''" left-arrow @click-left="navigateBack()"></van-nav-bar>
    <div class="vspacer-16px">.</div>
    <div class="label">Volume ({{$store.state.volume}}%)</div>
    <van-slider @change="$store.dispatch('syncSettings', {})" class="volume-slider" min="0" max="100" v-model="$store.state.volume"></van-slider>
    <div class="vspacer-32px">.</div>
    <div class="checkbox"><van-checkbox @change="$store.dispatch('syncSettings', {})" class="centered" v-model="$store.state.isTypingNotificationEnabled">Show when I'm typing</van-checkbox></div>
    <div class="vspacer-16px">.</div>
    <van-checkbox @change="$store.dispatch('syncSettings', {})" class="centered" v-model="$store.state.isReadReceiptsEnabled">Show when I've read messages</van-checkbox>
    <div class="vspacer-16px">.</div>
    <van-field class="centered popup-input" label="Display name" v-model="displayName" @change="syncDisplayName(displayName)"></van-field>
    <van-field class="centered popup-input" label="Status" v-model="status" @change="syncStatus(status)"></van-field>
    <div class="public-key-label">Public signing key</div><div class="key">{{publicSigningKeyString}}</div>
    {{currentRouteNavIndex}}
    <van-tabbar v-if="$store.state.rootKey" v-model="currentRouteNavIndex">
        <van-tabbar-item icon="user-o" to="/">Profiles</van-tabbar-item>
        <van-tabbar-item icon="friends-o" to="/contacts">Contacts</van-tabbar-item>
        <van-tabbar-item icon="setting-o" to="/settings">Settings</van-tabbar-item>
    </van-tabbar>
</template>

<script>
    import config from '@/config.js'
    import getCurrentRouteNavIndex from '@/helpers/get-current-route-nav-index.js'
    import {ref} from 'vue'
    import nacl from 'tweetnacl'
    import {Notify} from 'vant'

    /**
     * Navigates back in history by one.
     */
    function navigateBack() {
        this.$router.go(-1);
    }

    /**
     * Sends a request to sync the display name
     */
    async function syncDisplayName(displayName) {
        const publicSigningKeyBuffer = Buffer.from(this.$store.state.publicSigningKey);
        const privateSigningKeyBuffer = Buffer.from(this.$store.state.privateSigningKey);

        const data = await (await window.fetch(`${config.baseAPIUrl}/api/update_display_name`, {
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                publicSigningKey: publicSigningKeyBuffer.toString('hex'),
                proof: Buffer.from(nacl.sign(new TextEncoder().encode(`msgApp:updateDisplayName:${Date.now()}`.normalize('NFKC')), privateSigningKeyBuffer)).toString('base64'),
                displayName: Buffer.from(nacl.sign(new TextEncoder().encode(displayName.normalize('NFKC')), privateSigningKeyBuffer)).toString('base64')
            }),
            method: 'POST',
            cache: 'no-cache'
        })).json();

        if(!data.ok) {
            Notify({message: data.message, type: 'danger'});
        } else {
            Notify({message: `Display name successfully updated`, type: 'success'});
        }

    }

    /**
     * Syncs the status with the server
     */
    async function syncStatus(status) {
        const publicSigningKeyBuffer = Buffer.from(this.$store.state.publicSigningKey);
        const privateSigningKeyBuffer = Buffer.from(this.$store.state.privateSigningKey);

        const data = await (await window.fetch(`${config.baseAPIUrl}/api/update_status`, {
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                publicSigningKey: publicSigningKeyBuffer.toString('hex'),
                proof: Buffer.from(nacl.sign(new TextEncoder().encode(`msgApp:updateStatus:${Date.now()}`.normalize('NFKC')), privateSigningKeyBuffer)).toString('base64'),
                status: Buffer.from(nacl.sign(new TextEncoder().encode(status.normalize('NFKC')), privateSigningKeyBuffer)).toString('base64')
            }),
            method: 'POST',
            cache: 'no-cache'
        })).json();

        if(!data.ok) { 
            Notify({message: data.message, type: 'danger'}); 
        } else {
            Notify({message: `Status successfully updated`, type: 'success'});
        }

    }

    export default {
        mounted() {
            if(!this.$store.state.rootKey) {
                this.$router.push('/');
                return;
            }

            this.$store.dispatch('retrieveSettings', {});

            const publicSigningKeyBuffer = Buffer.from(this.$store.state.publicSigningKey, 'hex');

            (async () => {
                let userInfo = await window.fetch(`${config.baseAPIUrl}/api/user_info?userId=${Buffer.from(this.$store.state.publicSigningKey).toString('hex')}`, {
                    method: 'GET',
                    cache: 'no-cache'
                });

                if(userInfo.status !== 200) {
                    Notify({message: `Error loading user information`, ok: false}); return;
                }

                userInfo = await userInfo.json();

                if(!userInfo.ok) {
                    Notify({message: `Error loading user information`, ok: false}); return;
                }

                userInfo = userInfo.data;

                if(userInfo.signedDisplayName) {
                    let displayName = nacl.sign.open(Buffer.from(userInfo.signedDisplayName, 'base64'), publicSigningKeyBuffer);

                    if(displayName) {
                        displayName = new TextDecoder().decode(displayName);
                        this.displayName = displayName;
                    }
                }

                if(userInfo.signedStatus) {
                    let status = nacl.sign.open(Buffer.from(userInfo.signedStatus, 'base64'), publicSigningKeyBuffer);

                    if(status) {
                        status = new TextDecoder().decode(status);

                        this.status = status;
                    }
                }

                this

            })();
        },
        setup() {
            const displayName = ref(''),
                  status      = ref('');

            return {
                config,
                window,
                displayName,
                status
            }
        },
        computed: {
            publicSigningKeyString() {
                return (this.$store.state.rootKey)?Buffer.from(this.$store.state.publicSigningKey).toString('hex'):'00';
            },
            currentRouteNavIndex: getCurrentRouteNavIndex
        },
        methods: {
            syncDisplayName,
            syncStatus,
            navigateBack
        }
    }
</script>

<style lang="scss" scoped>
    @import '@/styles/_colors.scss';
    
    .popup-input {
        max-width: 320px
    }

    .public-key-label {
        text-align: center;
        font-weight: bold;
        margin-top: 16px;
        margin-bottom: 16px;
    }

    .volume-slider {
        max-width: 600px;
        left: 50%;
        transform: translateX(-50%);
        width: 80vw;
    }

    .checkbox {
        display: flex;
        flex-direction: row;
    }

    .key {
        background: rgb(240, 240, 240);
        font-family: monospace;
        font-size: 15px;
        max-width: 320px;
        position: relative;
        display: inline-block;
        word-wrap: break-word;
        padding: 12px;
        border-radius: 3px;
        left: 50%;
        transform: translateX(-50%);
        color: rgb(40, 40, 40);
        font-weight: bold;
    }
    .centered {
        position: relative;
        max-width: 600px;
        left: 50%;
        transform: translateX(-50%);
        width: 80vw;
    }
    .label {
        font-size: 16px;
        padding-bottom: 16px;
        padding-left: 28px;
        color: $color-settings-label;
    }
    .vspacer-16px {
        visibility: hidden;
        padding-bottom: 16px;
    }
    .vspacer-32px {
        visibility: hidden;
        padding-bottom: 32px;
    }
</style>