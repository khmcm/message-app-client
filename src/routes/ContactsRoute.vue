<template>
    <van-overlay style="z-index: 100; position: absolute; width: 100vw; height: 100vh;" :show="isLoading">
        <van-row justify="center" align="center" class="overlay">
            <van-loading color="#ffffff" size="64px" text-size="20px" :vertical="true">{{loadingMessage}}</van-loading>
        </van-row>
    </van-overlay>
        <van-nav-bar title="Contacts" :left-text="(history.length > 1)?'Back':''" @click-left="navigateBack()">
        <template #right>
            <van-icon name="wap-nav" style="transform: scale(1.7);" @click="isAddContactPopupVisible = true"></van-icon>
        </template>
    </van-nav-bar>
    <van-popup v-model:show="isAddContactPopupVisible" style="background: rgb(244, 244, 244); height: 60%;" position="bottom" class="popup" round>
        <div style="popup-container">
            <div class="popup-description-text">Enter the public key or display name of a contact you wish to add</div>
            <div class="vspacer-8px"></div>
            <van-field v-model="addUserId" type="text" style="popup-text-input" label="ID" placeholder="Public key or display name"/>
            <div class="vspacer-16px"></div>
            <div class="centered"><van-button round type="primary" class="popup-button" @click="addContact()">Add</van-button></div>
        </div>
    </van-popup>
    <div class="contacts">
        <div v-bind:key="contact.userId" v-for="contact in contactInfo" class="contacts-entry" @click="openChat(contact.publicSigningKey)">
            <div class="contacts-entry-icon"></div>
            <div class="contacts-entry-text">
                <div class="contacts-entry-name">{{contact.displayName?contact.displayName:contact.publicSigningKey}}</div>
                <div style="contacts-entry-status">{{contact.status?contact.status:'...'}}</div>
            </div>
        </div>
    </div>
    <van-tabbar v-if="$store.state.rootKey" v-model="currentRouteNavIndex">
        <van-tabbar-item icon="user-o" to="/">Profiles</van-tabbar-item>
        <van-tabbar-item icon="friends-o" to="/contacts">Contacts</van-tabbar-item>
        <van-tabbar-item icon="setting-o" to="/settings">Settings</van-tabbar-item>
    </van-tabbar>
</template>

<script>
    import {ref} from 'vue'
    import {Notify} from 'vant'
    import nacl from 'tweetnacl'
    import auth from 'tweetnacl-auth'
    import config from '@/config'
    import getCurrentRouteNavIndex from '@/helpers/get-current-route-nav-index.js'

    nacl.auth = auth;

    /**
     * Navigates back in history by one.
     */
    function navigateBack() {
        this.$router.go(-1);
    }

    async function addContact() {

        this.isLoading = true;

        //Check if the user exists.
        let userInfo = await (await window.fetch(`${config.baseAPIUrl}/api/user_info?userId=${this.addUserId}`, {
            method: 'GET',
        })).json();

        if(!userInfo.ok) {
            this.isLoading = false;
            Notify({message: userInfo.message, type: 'danger'});
            return;
        }

        userInfo = userInfo.data;


        if(Array.from(this.contactInfo).filter(contact => contact.publicSigningKey === userInfo.publicSigningKey).length > 0) {
            Notify({message: `User is already added to contacts`, type: 'danger'});
            this.isLoading = false;
            return;
        }

        const combinedId = Buffer.from(
            nacl.auth(
                Buffer.from(userInfo.publicSigningKey, 'hex'),
                Buffer.from(this.$store.state.hmacKey)
            )
        ).toString('hex');

        /* eslint-disable */
        const privateSigningKeyBuffer = Buffer.from(this.$store.state.privateSigningKey),
              secretId                = Buffer.from(this.$store.state.secretId).toString('hex');

        const userIdSalt = Buffer.from(nacl.randomBytes(24));

        const addContactResponse = await (await window.fetch(`${config.baseAPIUrl}/api/add_contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId     : Buffer.from(nacl.secretbox(Buffer.from(userInfo.publicSigningKey, 'hex'), userIdSalt, Buffer.from(this.$store.state.symmetricEncryptionKey))).toString('base64'),
                userIdSalt : userIdSalt.toString('hex'),
                secretId,
                combinedId,
                action: 'add'
            }),
            cache: 'no-cache'
        })).json();

        if(!addContactResponse.ok) {
            this.isLoading = false;
            Notify({message: addContactResponse.message, type: 'danger'});
            return;
        }

        Notify({message: `Added user to contacts`, type: 'success'});

        this.isAddContactPopupVisible = false;

        await this.loadContacts();

        this.isLoading = false;
    }

    function openChat(userId) {
        this.$router.push(`/chat/${userId}`);
    }

    function mounted() {
        if(!this.$store.state.rootKey) {
            this.$router.push('/');
            return;
        }

        (async () => {
            await this.loadContacts();
        })();

    }

    async function loadContacts() {
        this.isLoading = true;
        this.loadingMessage = `Loading contacts ...`;

        let contacts = await (await window.fetch(`${config.baseAPIUrl}/api/list_contacts?secretId=${Buffer.from(this.$store.state.secretId).toString('hex')}`, {
            method: 'GET',
        })).json();

        if(!contacts.ok) {
            Notify({message: `Error retrieving contacts`, type: 'danger'});
            return;
        }

        this.$store.commit('setContacts', contacts.data);

        this.$store.state.contacts.forEach(async (contact) => {
            const decryptedPublicSigningKey = Buffer.from(nacl.secretbox.open(Buffer.from(contact.userId, 'base64'), Buffer.from(contact.userIdSalt, 'hex'), Buffer.from(this.$store.state.symmetricEncryptionKey))).toString('hex')
            let contactInfo = await (await window.fetch(`${config.baseAPIUrl}/api/user_info?userId=${decryptedPublicSigningKey}`)).json();
            
            if(!contactInfo.ok) {
                return;
            }

            contactInfo = contactInfo.data;

            this.contactInfo.push({
                ...contactInfo,
                ...contact
            });

            const currentContactInfoItem           = Array.from(this.contactInfo)[this.contactInfo.length - 1];

            if(currentContactInfoItem.signedDisplayName) {
                currentContactInfoItem.displayName = new TextDecoder().decode(nacl.sign.open(Buffer.from(currentContactInfoItem.signedDisplayName, 'base64'), Buffer.from(currentContactInfoItem.publicSigningKey, 'hex')));
            }

            if(currentContactInfoItem.signedStatus) {
                currentContactInfoItem.status      = new TextDecoder().decode(nacl.sign.open(Buffer.from(currentContactInfoItem.signedStatus, 'base64'), Buffer.from(currentContactInfoItem.publicSigningKey, 'hex')));
            }
        });

        this.isLoading = false;

        return;
    }

    export default {
        setup() {
            const isAddContactPopupVisible = ref(false),
                  isLoading                = ref(false),
                  addUserId                = ref(''),
                  loadingMessage           = ref(''),
                  contactInfo              = ref([]);

            return {
                isAddContactPopupVisible,
                isLoading,
                addUserId,
                loadingMessage,
                contactInfo,
                history: window.history
            }
        },
        methods: {
            navigateBack,
            loadContacts,
            addContact,
            openChat
        },
        computed: {
            currentRouteNavIndex: getCurrentRouteNavIndex
        },
        mounted
    }
</script>

<style lang="scss" scoped>
    .vspacer-16px {
        margin-top: 16px;
    }
    .vspacer-8px {
        margin-top: 8px;
    }
    .contacts-entry-icon {
        display: inline-block;
        position: relative;
        width: 42px;
        height: 42px;
        border-radius: 26px;
        background: black;
        top: 50%;
        transform: translateY(-50%);
        left: 16px;
    }
    .contacts-entry-text {
        display: inline-block;
        flex-direction: column;
        align-items: space-between;
        justify-content: center;
        position: relative;
        height: 100%;
        left: 32px;
        width: 200px;
    }
    .contacts-entry-name {
        font-weight: bold;
    }
    .contacts-entry-status {
        font-style: italic;
        color: rgb(150, 150, 150);
    }

    .contacts-entry-button {
        margin-top: 16px;
    }

    .popup {
        background: rgb(244, 244, 244);
        height: 60%;
    }
    .popup-container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .popup-text-input {
        max-width: 450px;
        margin-top: 16px;
    }

    .popup-description-text {
        position: relative;
        text-align: center;
        width: 80%;
        margin-top: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .contacts-entry {
        position: relative;
        width: 100vw;
        height: 64px;
        background: rgb(250, 250, 250);
        &:hover {
            background: rgb(240, 240, 240);
        }
        border-bottom: 1px solid rgb(240, 240, 240);
        cursor: pointer;
    }
    .centered {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .overlay {
        height: 100vh;
        z-index: 100000;
        left: 0;
        position: absolute;
        top: 0;
        width: 100vw;
    }
</style>
