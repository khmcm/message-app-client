<template>
    <van-nav-bar :title="recipientDisplayName" :left-text="(history.length > 1)?'Back':''" @click-left="navigateBack()">
        <template #right>
            <van-icon name="wap-nav" style="transform: scale(1.7);" @click="isProfilePopupVisible = true"></van-icon>
        </template>
    </van-nav-bar>
    <van-popup v-model:show="isProfilePopupVisible" style="background: rgb(244, 244, 244); height: 60%;" position="top" class="popup">
        <div class="popup-container">
            <div class="vspacer-16px"></div>
            <div style="popup-recipient-info-container">
                <div class="popup-profile-icon"></div> <span class="is-visibility-hidden">...</span> <div class="popup-recipient-display-name">{{recipientDisplayName}}</div>
            </div>
            <br/>
            <div class="vspacer-16px"></div>
            <div class="chat-option-switch-centered"><van-switch v-model="isBlocked" @click="toggleIsBlocked()"></van-switch> <span style="visibility: hidden;">....</span> {{isBlocked?'Blocked':'Not blocked'}}</div>
            <div class="vspacer-16px"></div>
            <div class="chat-option-switch-centered"><van-switch v-model="isMuted" @click="toggleIsMuted()"></van-switch> <span style="visibility: hidden;">....</span> {{isMuted?'Muted':'Not muted'}}</div>
            <div class="vspacer-16px"></div>
            <div class="vspacer-16px"></div>
            <div class="link is-danger" @click="deleteContact()">Delete contact</div>
        </div>
    </van-popup>
    <div class="message-bubble-list" ref="messageBubbleListRef" @scroll="handleMessageBubbleListScroll">
        <div v-if="!mayHaveMoreMessages" class="chat-beginning-label">Beginning of chat</div>
        <message-bubble v-bind:key="message.content.authorId" v-for="message in messages" :sharedKey="sharedKey" :conversationId="conversationId" :isScrolling="isScrolling" :message="message"></message-bubble>
    </div>
    <div class="message-input-box-container" :style="{height: `${chatInputHeight * 0.8}px`, paddingBottom: `${Math.min(30, chatInputHeight/60)}px`}">
        <textarea v-model="messageText" :style="{height: `${chatInputHeight}px`, ...((messageText === '')?{transform: 'translateY(-75%)'}:{transform: `translateY(calc(-50% + ${700 / (chatInputHeight * 1.0)}px - 6px))`})}" @keypress="handleChatInputKeyPress" @keyup="handleChatInputKeyUp" @keydown="handleChatInputKeyDown"  @click="focusChatInput()" ref="chatInputRef" @blur="setIsChatInputFocused(false)" @input="handleChatInput" type="text" class="message-input-box" placeholder="Type a message ..."></textarea>
        <div class="message-input-box-send-button-container" v-if="messageText !== ''">
            <div class="message-input-box-send-button" @click="sendMessage()">
                <van-icon name="arrow-up"/>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .popup {
        background: rgb(247, 247, 247);
        height: 60%;
    }
    .popup-container {
        display: flex;
        flex-direction: column; align-items: center;
    }
    .popup-recipient-info-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        position: relative;
        height: 64px;
        width: 100vw;
        height: 64px; 
    }
    .popup-profile-icon {
        position: relative;
        border-radius: 32px;
        width: 42px;
        height: 42px;
        background: black;
    }
    .popup-recipient-display-name {
        font-size: 20px;
        font-weight: bold;
    }

    .message-bubble-list {
        position: absolute;
        width: 100vw;
        top: 46px;
        height: calc(100vh - 64px * 2 - 32px);
        overflow-y: auto;
    }

    .message-input-box-container {
        position: absolute;
        background: rgb(245, 245, 245);
        border-radius: 24px;
        width: 90vw;
        height: fit-content;
        max-height: 225px;
        min-height: 48px;
        word-break: break-word;
        max-width: 900px;
        bottom: 64px;
        left: 50vw;
        transform: translateX(-50%);
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .message-input-box {
        overflow-y: auto;
        position: relative;
        max-height: 85%;
        font-family: 'Open Sans';
        width: calc(100% - 80px);
        height: 24px;
        min-height: 24px;
        border: none;
        font-size: 17px;
        overflow-y: auto;
        left: 24px;
        background: none;
        line-height: 17px;
        color: rgb(70, 70, 70);
        display: flex;
        flex-direction: column;
        justify-content: center;
        word-break: break-word;
        top: 50%;
        transform: translateY(calc(-50% + 10px));
    }

    .message-input-box-send-button {
        $message-input-box-send-button-color: rgb(50, 100, 255);
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background: rgb(50, 100, 255);
        color: white;
        cursor: pointer;
        &:hover {
            background: lighten($message-input-box-send-button-color, 10%);
        }
    }

    .message-input-box-send-button-container {
        display: inline-block;
        width: 32px;
        height: 32px;
        right: 8px;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    .message-input-box-placeholder {
        font-weight: reset; //To eventually be replaced
    }

    .chat-option-switch-centered {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .vspacer-16px {
        margin-top: 16px;
    }

    .chat-beginning-label {
        font-weight: bold;
        text-align: center;
        color: rgb(200, 200, 200);
        padding-top: 32px;
        padding-bottom: 32px;
        font-size: 20px;
        font-family: 'Poppins';
    }

    .link {
        text-decoration: underline;
        cursor: pointer;
        
        &:hover {
            text-decoration: none;
        }

        &.is-danger {
            color: red;
        }
    }

    .is-visibility-hidden {
        visibility: hidden;
    }
</style>

<script>
    import {ref} from 'vue'
    import config from '@/config.js'
    import nacl from 'tweetnacl'
    import auth from 'tweetnacl-auth'
    import {sha256} from 'hash-wasm'
    import {Notify} from 'vant'
    import getIsMobileDevice from '@/helpers/is-mobile-device.js'

    import MessageBubbleComponent from '@/routes/ChatRoute/MessageBubble.vue'

    nacl.auth = auth;

    const MAX_CHAT_INPUT_COMPUTED_TEXT_WIDTH = 140 * (getIsMobileDevice()?window.innerWidth:(window.innerWidth * 0.7)) / 410;

    async function deleteContact() {
        const shouldDeleteContact = confirm(`Are you sure you want to remove ${this.recipientDisplayName} from your contacts?`);

        if(shouldDeleteContact) {
            const res = await window.fetch(`${config.baseAPIUrl}/api/add_contact`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                cache: 'no-cache',
                body: JSON.stringify({
                    combinedId: Buffer.from(nacl.auth(Buffer.from(this.recipientPublicSigningKey, 'hex'), Buffer.from(this.$store.state.hmacKey))).toString('hex'),
                    action: 'remove'
                })
            });

            if(res.status !== 200) { Notify({message: `Error deleting contact`, type: 'danger'}); return; }

            const json = await res.json();

            if(!json.ok) { Notify({message: `Error deleting contact`, type: 'danger'}); return; }

            Notify({message: `Deleted ${this.recipientDisplayName} from your contacts`, type: 'primary'});
            return;
        }
    }

    /**
     * Navigates back in history by one.
     */
    function navigateBack() {
        this.$router.go(-1);
    }

    /**
     * Handles key presses from the chat input box
     */
    function handleChatInputKeyPress(e) {
        /**
         * If the device is not a mobile device and the control
         * key is not pressed during the pressing of the enter
         * key, then send the message. We need this feature due
         * to the differences in mobile and desktop devices.
         * Mobile devices lack a "control" key, so mobile users
         * will instead be required to press the send button.
         **/
        if(!getIsMobileDevice()) {
            if(e.key === 'Enter') {
                if(!this.isControlKeyPressed && !e.shiftKey) {
                    this.sendMessage();
                    return false;
                }
            }
        }
    }

    /**
     * Handles the "keyup" events, specifically to set the
     * "isControlKeyPressed" variable to true or false.
     */
    function handleChatInputKeyUp(e) {
        if(e.key === 'Control') {
            this.isControlKeyPressed = false;
        }
    }

    function handleChatInputKeyDown(e) {
        if(e.key === 'Control') {
            this.isControlKeyPressed = true;
        }
    }

    /**
     * @description Loads messages of a specific quantity and offset
     * @param {Object} args
     * @param {number} args.before
     * @param {number} args.count
     */
    async function loadMessages({count}) {
        if(!this.mayHaveMoreMessages) {
            return;
        }
        let before;
        if(this.messages.length === 0) {
            before = 2 ** 32 - 1;
        } else {
            before = this.messages[0].sequenceNumber;
        }

        this.isLoadingMessages = true;

        const res = await window.fetch(`${config.baseAPIUrl}/api/list_messages?before=${before}&count=${(typeof count !== undefined)?count:50}&conversationId=${this.conversationId.toString('hex')}`, {
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache',
            method: 'GET'
        });

        if(res.status !== 200) {
            Notify({message: `Error loading message`, type: 'danger'}); return;
        }

        const json = await res.json();

        if(!json.ok) {
            Notify({message: `Error loading messages`, type: 'danger'}); return;
        }

        if(json.data.length === 0) {
            this.mayHaveMoreMessages = false;
            return;
        }

        json.data.reverse().forEach((message) => {
            const content = new TextDecoder().decode(nacl.secretbox.open(Buffer.from(message.content, 'base64'), Buffer.from(message.messageEncryptionSalt, 'hex'), this.sharedKey));
            const formattedMessage = {...message, ...JSON.parse(content)};
            const isScrolledToBottom = (this.messageBubbleListRef.scrollTop === (this.messageBubbleListRef.scrollHeight - this.messageBubbleListRef.offsetHeight));
            this.messages.splice(0, 0, formattedMessage);
            setTimeout(() => {
                if(isScrolledToBottom) {
                    this.messageBubbleListRef.scrollTop = this.messageBubbleListRef.scrollHeight;
                } else {
                    Notify({message: `There are more messages below`, type: 'primary'});
                }
            });
        });

        this.isLoadingMessages = false;
    }

    /**
     * Handles input events from the input box in
     * order to update the 'messageText' variable
     */
    /* eslint-disable */
    function handleChatInput(e) {
        const utilityCanvasCtx = this.utilityCanvas.getContext('2d');
        let textSliceOffset = 0;

        this.messageText = this.messageText.replace(/\r/g, '');

        for(let i = 0; i < this.messageText.length; i++) {
            const textWidth = utilityCanvasCtx.measureText(this.messageText.slice(textSliceOffset, i)).width;
            this.utilityCanvas.font = `17px Open Sans`;
            if(textWidth > MAX_CHAT_INPUT_COMPUTED_TEXT_WIDTH) {
                this.messageText = this.messageText.slice(0, i) + '\r' + this.messageText.slice(i, this.messageText.length);
                textSliceOffset = i;
            }
        }
    }

    /**
     * Updates the chat input box as focused or
     * not focused
     */
    function setIsChatInputFocused(x) {
        this.isChatInputFocused = x;
    }

    /**
     * Toggles whether or not the user is muted
     * by sending a request to the server and
     * checking the response to determine
     * whether to toggle the user's muted status
     * or not
     */
    async function toggleIsMuted() {
        const combinedId = Buffer.from(
            nacl.auth(
                Buffer.from(this.recipientPublicSigningKey, 'hex'),
                Buffer.from(this.$store.state.hmacKey)
            )
        ).toString('hex');

        const privateSigningKeyBuffer = Buffer.from(this.$store.state.privateSigningKey);

        const action   = this.isMuted?'mute':'unmute',
              secretId = Buffer.from(this.$store.state.secretId).toString('hex');

        const json = await (await window.fetch(`${config.baseAPIUrl}/api/mute_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache',
            body: JSON.stringify({
                combinedId,
                action,
                secretId
            })
        })).json();

        if(!json.ok) {
            this.isMuted = !this.isMuted;
        }
    }

    /**
     * Handles when the message bubble list is
     * scrolled.
     */
    function handleMessageBubbleListScroll(e) {
        if(this.messageBubbleListRef.scrollTop === 0) {
            this.loadMessages({count: 50});
        }

        /**
         * This will prevent messages from activating
         * the long-press function when scrolling
         */
        window.clearTimeout(this.scrollTimeout);
        this.isScrolling = true;
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 500);
    }

    /**
     * Toggles whether or not the user is blocked
     * by sending a request to the server and
     * checking the response to determine
     * whether to toggle the user's blocked status
     * or not
     */
    async function toggleIsBlocked() {
        const combinedId = Buffer.from(
            nacl.auth(
                Buffer.from(this.recipientPublicSigningKey, 'hex'),
                Buffer.from(this.$store.state.hmacKey)
            )
        ).toString('hex');

        const privateSigningKeyBuffer = Buffer.from(this.$store.state.privateSigningKey);

        const action   = this.isBlocked?'block':'unblock',
              secretId = Buffer.from(this.$store.state.secretId).toString('hex');


        const json = await (await window.fetch(`${config.baseAPIUrl}/api/block_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache',
            body: JSON.stringify({
                combinedId,
                action,
                secretId
            })
        })).json();

        if(!json.ok) {
            this.isBlocked = !this.isBlocked;
        }
    }

    /**
     * Sends a request to send a message to
     * the server. Notifies the user if there
     * was an error sending the message
     */
    async function sendMessage() {
        /** @type {{content: string, creationTimestamp: string, authorId: string}} */

        if(this.messageText === '') {
            return;
        }

        const messageContent = {
            content: {
                text: this.messageText.replace(/\r/g, ''),
                embeds: this.embeds
            },
            creationTimestamp: Date.now(),
            editTimestamp: 0,
            authorId: Buffer.from(this.$store.state.publicSigningKey).toString('hex')
        }

        const sharedKey = this.sharedKey;

        const conversationId = this.conversationId;

        const messageEncryptionSalt = Buffer.from(nacl.randomBytes(nacl.secretbox.nonceLength));

        const contentBase64 = Buffer.from(nacl.box.after(new TextEncoder().encode(JSON.stringify(messageContent).normalize('NFKC')), messageEncryptionSalt, sharedKey)).toString('base64');

        const messageId = Buffer.from(nacl.randomBytes(32));

        const combinedId = Buffer.from(nacl.auth(messageId, Buffer.from(this.$store.state.hmacKey)));

        //Send the message
        const response = await window.fetch(`${config.baseAPIUrl}/api/send_message`, {
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: contentBase64,
                conversationId: conversationId.toString('hex'),
                messageId: messageId.toString('hex'),
                combinedId: combinedId.toString('hex'),
                messageEncryptionSalt: messageEncryptionSalt.toString('hex'),
                action: 'send'
            }),
            cache: 'no-cache',
            method: 'POST'
        });

        if(response.status !== 200) {
            Notify({message: `There was an error sending your message`, type: 'danger'});
            return;
        }

        const data = await response.json();

        if(!data.ok) {
            Notify({message: `There was an error sending your message`, type: 'danger'});
            return;
        }

        this.clearChatInput();
        this.chatInputRef.focus();
    }

    /**
     * Clears the chat input
     */
    function clearChatInput() {
        this.messageText = '';
    }

    function focusChatInput() {
        if(!this.isChatInputFocused) {
            this.chatInputRef.focus();
            this.chatInputRef.setSelectionRange(this.chatInputRef.value.length, this.chatInputRef.value.length);
        }
        this.setIsChatInputFocused(true);
    }

    function mounted() {

        /**
         * Returns to the home route if there is no
         * root key defined in the store, meaning the
         * user is not signed in.
         * */
        if(!this.$store.state.rootKey) {
            this.$router.push('/');
        }

        (async () => {

            this.isLoadingMessages = true;

            //Retrieve the user's information
            let userInfo = await (await window.fetch(`${config.baseAPIUrl}/api/user_info?userId=${this.$route.params.publicSigningKey}`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'GET',
                cache: 'no-cache'
            })).json();

            if(!userInfo.ok) {
                return;
            }

            userInfo = userInfo.data;
            const publicSigningKeyBuffer = Buffer.from(userInfo.publicSigningKey, 'hex');

            //Attempt to read the recipient's display name.
            if(userInfo.signedDisplayName) {

                const openedDisplayName = nacl.sign.open(Buffer.from(userInfo.signedDisplayName, 'base64'), publicSigningKeyBuffer);
                if(!openedDisplayName) {
                    this.$router.push('/');
                    return;
                }
                this.recipientDisplayName = new TextDecoder().decode(openedDisplayName);
            } else {
                this.recipientDisplayName = userInfo.publicSigningKey;
            }

            //Load the public signing key of the recipient
            if(userInfo.publicSigningKey) {
                this.recipientPublicSigningKey = userInfo.publicSigningKey;
            }

            //Store the public asymmetric encryption key of
            //the recipient
            if(userInfo.publicAsymmetricEncryptionKey) {
                this.recipientPublicAsymmetricEncryptionKey = userInfo.publicAsymmetricEncryptionKey;
            }

            //Attempt to read the recipient's status.
            if(userInfo.signedStatus) {

                const openedStatus = nacl.sign.open(Buffer.from(userInfo.signedStatus, 'base64'), publicSigningKeyBuffer);
            
                if(!openedStatus) {
                    this.$router.push('/');
                    return;
                }
                this.recipientStatus = new TextDecoder().decode(openedStatus);
            }

            //Get the list of blocked users and set the user
            //to blocked in the settings if the combined
            //id is contained in the list.
            const blockedUsers = Array.from(
                await ( await window.fetch(`${config.baseAPIUrl}/api/list_blocked_users?secretId=${Buffer.from(this.$store.state.secretId).toString('hex')}`, {
                    method: 'GET',
                    cache: 'no-cache'
                })).json()
            );

            //Computed the combined ID of the blocked user
            const blockedUserCombinedId = Buffer.from(nacl.auth(Buffer.from(this.recipientPublicSigningKey, 'hex'), Buffer.from(this.$store.state.hmacKey))).toString('hex');

            if(blockedUsers.filter(blockedUser => blockedUser.combinedId === blockedUserCombinedId ).length > 0) {
                this.isBlocked = true;
            }

            //Get the list of muted users and set the user
            //to muted in the settings if the combined id
            //is contained in the list.
            const mutedUsers = Array.from(
                await ( await window.fetch(`${config.baseAPIUrl}/api/list_muted_users?secretId=${Buffer.from(this.$store.state.secretId).toString('hex')}`, {
                    method: 'GET',
                    cache: 'no-cache'
                })).json()
            );

            //Compute the combined ID of the muted user
            const mutedUserCombinedId = Buffer.from(nacl.auth(Buffer.from(this.recipientPublicSigningKey, 'hex'), Buffer.from(this.$store.state.hmacKey))).toString('hex');

            if(mutedUsers.filter(mutedUser => mutedUser.combinedId === mutedUserCombinedId ).length > 0) {
                this.isMuted = true;
            }

            const sharedKey = Buffer.from(nacl.box.before(Buffer.from(this.recipientPublicAsymmetricEncryptionKey, 'hex'), Buffer.from(this.$store.state.privateAsymmetricEncryptionKey)));

            const conversationId = Buffer.from(await sha256(sharedKey), 'hex');

            this.sharedKey = sharedKey;

            this.conversationId = conversationId;

            let eventSource;

            async function connectToMessageStream() {
                this.onEventSourceOpen = (e) => {
                    this.isReconnecting = false;
                    this.lastMessageStreamPing = Date.now();
                    if(this.isReconnecting && this.hadFirstConnection) { 
                        Notify({message: `Reconnected!`, type: 'success'});
                    } else {
                        this.hadFirstConnection = true;
                    }
                }

                this.onEventSourceMessage = (message) => {
                    const data = JSON.parse(String(message.data));
                    switch(data.type) {
                        case 'PING': {
                            this.lastMessageStreamPing = Date.now();
                        } break;
                        case 'SEND_MESSAGE': {
                            /**
                             * Don't process messages that are received if the user
                             * is blocked by the recipient
                             **/
                            if(this.isBlocked) {
                                return;
                            }
                            const message = data.payload;
                            const content = new TextDecoder().decode(nacl.secretbox.open(Buffer.from(data.payload.content, 'base64'), Buffer.from(data.payload.messageEncryptionSalt, 'hex'), sharedKey));
                            const formattedMessage = {...message, ...JSON.parse(content)};
                            const isScrolledToBottom = (this.messageBubbleListRef.scrollTop === (this.messageBubbleListRef.scrollHeight - this.messageBubbleListRef.offsetHeight));
                            this.messages.push(formattedMessage);
                            setTimeout(() => {
                                if(isScrolledToBottom) {
                                    this.messageBubbleListRef.scrollTop = this.messageBubbleListRef.scrollHeight;
                                } else {
                                    Notify({message: `There are more messages below`, type: 'primary'});
                                }
                            });
                        } break;
                        case 'DELETE_MESSAGE': {
                            const messageIndex = this.messages.findIndex((message) => message.messageId === data.payload.messageId);

                            if(!this.messages[messageIndex]) { return; }

                            this.messages.splice(messageIndex, 1);
                        } break;
                        case 'EDIT_MESSAGE': {
                            /**
                             * Don't process messages that are edited if the user is blocked
                             * by the user
                             */
                            if(this.isBlocked) {
                                return;
                            }
                            const message = data.payload;

                            const messageIndex = this.messages.findIndex((message) => {
                                return message.messageId === data.payload.messageId;
                            });

                            const decryptedContent = nacl.secretbox.open(Buffer.from(message.content, 'base64'), Buffer.from(data.payload.messageEncryptionSalt, 'hex'), sharedKey);
                            let content;
                            try {
                                content = JSON.parse(new TextDecoder().decode(decryptedContent));
                            } catch(e) {
                                return;
                            }

                            const formattedMessage = {...message, ...content};

                            this.messages.splice(messageIndex, 1);
                            this.messages.splice(messageIndex, 0, formattedMessage);
                        } break;
                            
                    }
                }

                this.onEventSourceError = (message) => {
                    connectToMessageStream.call(this);
                }

                //Subscribe to an event source for realtime
                //communication (messages, typing notifications, etc.)
                if(eventSource) {
                    eventSource.removeEventListener('open', this.onEventSourceOpen);
                    eventSource.removeEventListener('message', this.onEventSourceMessage);
                    eventSource.removeEventListener('error', this.onEventSourceError);
                    eventSource.close();
                    eventSource = null;
                    this.messageEventSource = null;
                }

                this.messageStreamSessionId = Buffer.from(nacl.randomBytes(32)).toString('hex');

                eventSource = new EventSource(`${config.baseAPIUrl}/api/message_stream?conversationId=${conversationId.toString('hex')}&sessionId=${this.messageStreamSessionId}`);
                this.messageEventSource = eventSource;
                eventSource.addEventListener('open', this.onEventSourceOpen);
                eventSource.addEventListener('message', this.onEventSourceMessage);
                eventSource.addEventListener('error', this.onEventSourceError);
            }

            this.checkForDisconnectInterval = connectToMessageStream.call(this);

            this.checkForDisconnectInterval = setInterval(() => {
                if(this.isReconnecting) { return; }
                if(eventSource.readyState === EventSource.CLOSED || Date.now() - this.lastMessageStreamPing > 10000) {
                    this.isReconnecting = true;
                    Notify({message: `Currently disconnected. Attempting to reconnect ...`, type: 'warning'});
                    connectToMessageStream.call(this);
                }
            }, 1000);

            this.heartbeatPingInterval = setInterval(() => {
                window.fetch(`${config.baseAPIUrl}/api/heartbeat_ping`, {
                    method: 'POST',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        conversationId: this.conversationId.toString('hex'),
                        sessionId: this.messageStreamSessionId
                    })
                });
            }, 5000);

            await this.loadMessages({before: 0, count: 50});
        })();
    }

    function beforeUnmount() {
        /**
         * Clears the interval that checks for disconnects
         * before unmount in order to prevent memory leaks.
         */
        if(this.checkForDisconnectInterval !== null) {
            clearInterval(this.checkForDisconnectInterval);
        }
        if(this.heartbeatPingInterval !== null) {
            clearInterval(this.heartbeatPingInterval);
        }
        if(this.messageEventSource) {
                this.messageEventSource.removeEventListener('open', this.onEventSourceOpen);
                this.messageEventSource.removeEventListener('message', this.onEventSourceMessage);
                this.messageEventSource.removeEventListener('error', this.onEventSourceError);
                this.messageEventSource.close();
                this.messageEventSource = null;
        }
    }

    export default {
        mounted,
        beforeUnmount,
        setup() {
            const userInfo                                = ref(null),
                  recipientDisplayName                    = ref(null),
                  recipientStatus                         = ref(null),
                  recipientPublicSigningKey               = ref(null),
                  sharedKey                               = ref(null),
                  chatInputRef                            = ref(null),
                  checkForDisconnectInterval              = ref(null),
                  conversationId                          = ref(null),
                  hadFirstMessageStreamConnection         = ref(false),
                  heartbeatPingInterval                   = ref(null),
                  isBlocked                               = ref(false),
                  isChatInputFocused                      = ref(false),
                  isControlKeyPressed                     = ref(false),
                  isInContacts                            = ref(false),
                  isLoadingMessages                       = ref(false),
                  isMuted                                 = ref(false),
                  isProfilePopupVisible                   = ref(false),
                  isReconnecting                          = ref(false),
                  isScrolling                             = ref(false),
                  mayHaveMoreMessages                     = ref(true),
                  lastMessageStreamPing                   = ref(0),
                  messageBubbleListRef                    = ref(null),
                  messageText                             = ref(''),
                  messageEmbeds                           = ref([]),
                  messageEventSource                      = ref(null),
                  messages                                = ref([]),
                  messageStreamSessionId                  = ref(null),
                  scrollingTimeout                        = ref(null),
                  onEventSourceOpen                       = ref(null),
                  onEventSourceMessage                    = ref(null),
                  onEventSourceError                      = ref(null);

            return {
                userInfo,
                window,
                recipientDisplayName,
                recipientStatus,
                recipientPublicSigningKey,
                chatInputRef,
                checkForDisconnectInterval,
                hadFirstMessageStreamConnection,
                heartbeatPingInterval,
                isProfilePopupVisible,
                isBlocked,
                isChatInputFocused,
                isControlKeyPressed,
                isMuted,
                isInContacts,
                isLoadingMessages,
                mayHaveMoreMessages,
                isReconnecting,
                isScrolling,
                messageBubbleListRef,
                messageText,
                messageEmbeds,
                messageEventSource,
                messages,
                messageStreamSessionId,
                sharedKey,
                conversationId,
                chatInputRef,
                lastMessageStreamPing,
                scrollingTimeout,
                onEventSourceOpen,
                onEventSourceMessage,
                onEventSourceError,
                utilityCanvas: document.createElement('canvas'),
                Math,
                history: window.history
            }
        },
        computed: {
            messageContent() {
                return {
                    text: this.messageText,
                    embeds: [] //Eventually will be used to contain embeds
                }
            },
            chatInputHeight() {
                if(!this.chatInputRef || !this.messageText) {
                    return 0;
                }
                
                const height = Math.max(24, 24 + this.messageText.split('\n').length * 24);
                return height;
            },
            formattedMessageText() {

            }
        },
        methods: {
            toggleIsMuted,
            toggleIsBlocked,
            handleChatInputKeyPress,
            handleChatInputKeyUp,
            handleChatInputKeyDown,
            handleChatInput,
            handleMessageBubbleListScroll,
            navigateBack,
            sendMessage,
            setIsChatInputFocused,
            clearChatInput,
            focusChatInput,
            getIsMobileDevice,
            loadMessages,
            deleteContact
        },
        components: {
            'message-bubble': MessageBubbleComponent
        }
    }
</script>