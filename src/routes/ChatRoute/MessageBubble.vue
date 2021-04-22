<template>
    <div @mouseover="setAreDetailsVisible(true)" @mouseout="setAreDetailsVisible(false)" :class="`message-bubble-container ${(message.authorId===Buffer.from($store.state.publicSigningKey).toString('hex'))?'from-self':'from-other'}`">
        <div @touchstart="beginLongPress()" @touchend="cancelLongPress()" @mousedown="beginLongPress()" @mouseup="cancelLongPress()" :class="`message-bubble ${(message.authorId===Buffer.from($store.state.publicSigningKey).toString('hex'))?'from-self':'from-other'}`">
            <div v-if="!isEditModeEnabled" v-html="formatMessageText(message.content.text)"></div>
            <div :style="{display: isEditModeEnabled?'block':'none'}" class="message-bubble-edit-input" contenteditable="true" ref="editMessageInputRef" @blur="editMessage()" @input="updateMessageEditText"></div>
        </div>
        <div class="message-bubble-more" :style="{visibility: areDetailsVisible?'visible':'hidden'}">
            <div class="message-bubble-date">
                <span>{{new Date(parseInt(message.creationTimestamp)).toLocaleString('en-US')}}</span> 
                <span v-if="message.editTimestamp !== 0"> &middot; Edited</span>
            </div>
        </div>
    </div>
    <van-action-sheet v-model:show="isActionSheetVisible" :actions="actionSheetOptions" @select="handleActionSheetSelect" cancel-text="Cancel" close-on-click-action></van-action-sheet>
</template>

<style lang="scss" scoped>
    .message-bubble-container {
        margin-top: 12px;
        user-select: none;

        &.from-other {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            padding-right: 8px;

            & > .message-bubble-more > .message-bubble-date {
                padding-right: 32px;
            }
        }
    }

    .message-bubble {
        font-size: 17px;
        padding: 10px 16px 10px 16px;
        border-radius: 24px;
        width: fit-content;
        max-width: 50%;
        cursor: pointer;
        user-select: none;
        word-break: break-word;

        &.from-self {
            background: rgb(245, 245, 245);
            color: rgb(35, 35, 35);
            margin-left: 8px;
            &:hover {
                background: rgb(238, 238, 238);
            }
        }
        &.from-other {
            background: rgb(50, 100, 255);
            color: white;
            &:hover {
                background: rgb(70, 120, 255);
            }
        }
    }

    .message-bubble-date {
        user-select: none;
        font-size: 12px;
        color: rgb(160, 160, 160);
        display: inline-block;
        position: relative;
        left: 16px;
        top: 4px;
    }

    .message-bubble-edit-input {
        user-select: text;
    }
</style>

<script>
    import xss from 'xss'
    import {ref} from 'vue'
    import config from '@/config'
    import {Notify} from 'vant'
    import nacl from 'tweetnacl'
    import auth from 'tweetnacl-auth'
    nacl.auth = auth;

    const md = require('markdown-it')();

    /** @type {number} */
    //How long a message needs to be pressed before a menu is brought up.
    const LONG_PRESS_TIMEOUT = 250;

    /**
     * Sends a request to the server to delete
     * the message
     */
    async function deleteMessage() {
        const combinedId = Buffer.from(nacl.auth(Buffer.from(this.message.messageId, 'hex'), Buffer.from(this.$store.state.hmacKey))).toString('hex');

        await window.fetch(`${config.baseAPIUrl}/api/send_message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache',
            body: JSON.stringify({
                combinedId,
                action: 'delete'
            })
        });
    }

    /**
     * Handles the updating of the message edit text
     */
    function updateMessageEditText() {
        this.messageEditText = this.editMessageInputRef.innerText;
    }

    /**
     * Sends a request to the server to edit
     * a message and displays an error notification
     * if it fails.
     */
    async function editMessage() {
        if(this.message.content.text === '') {
            this.messageEditText = '';
            this.isEditModeEnabled = false;

            return;
        }

        const combinedId = Buffer.from(nacl.auth(Buffer.from(this.message.messageId, 'hex'), Buffer.from(this.$store.state.hmacKey))).toString('hex');
        
        const messageEncryptionSalt = Buffer.from(nacl.randomBytes(24));
        
        const contentBase64 = Buffer.from(nacl.secretbox(new TextEncoder().encode(JSON.stringify({
            content: {
                text: this.messageEditText,
                embeds: this.message.content.embeds
            },
            creationTimestamp: this.message.creationTimestamp,
            editTimestamp: Date.now(),
            authorId: this.message.authorId
        })), messageEncryptionSalt, this.sharedKey)).toString('base64');
        
        const res = await window.fetch(`${config.baseAPIUrl}/api/send_message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache',
            body: JSON.stringify({
                combinedId,
                action: 'edit',
                messageEncryptionSalt: messageEncryptionSalt.toString('hex'),
                content: contentBase64,
                conversationId: this.conversationId.toString('hex'),
                messageId: this.message.messageId
            })
        });

        if(res.status !== 200) {
            Notify({message: `There was an error sending the message`, type: 'danger'});
            return;
        }

        const json = await res.json();

        if(!json.ok) {
            Notify({message: `There was an error editing the message`, type: 'danger'});
        }

        this.messageEditText = '';
        this.isEditModeEnabled = false;

    }

    const ACTION_SHEET_OPTION_DELETE = 0,
          ACTION_SHEET_OPTION_EDIT   = 1;

    /**
     * Handles various options selected from the action
     * sheet menu.
     */
    function handleActionSheetSelect(action) {
        switch(action.value) {
            case ACTION_SHEET_OPTION_DELETE:
                if(this.message.authorId !== Buffer.from(this.$store.state.publicSigningKey).toString('hex')) {
                    return;
                }
                this.deleteMessage();
                break;
            case ACTION_SHEET_OPTION_EDIT:
                if(this.message.authorId !== Buffer.from(this.$store.state.publicSigningKey).toString('hex')) {
                    return;
                }
                this.isEditModeEnabled = true;
                setTimeout(() => {
                    this.editMessageInputRef.innerText = this.message.content.text;
                    this.editMessageInputRef.focus();
                });
                break;
        }
    }

    function actionSheetOptions() {
        return [
            {name: 'Delete', value: 0, disabled: this.message.authorId !== Buffer.from(this.$store.state.publicSigningKey).toString('hex')},
            {name: 'Edit', value: 1, disabled: this.message.authorId !== Buffer.from(this.$store.state.publicSigningKey).toString('hex')}
        ]
    }

    /**
     * Formats the message, including replacing
     * newlines with breaks and filtering out
     * potential xss attacks.
     */
    function formatMessageText(text) {
        return md.renderInline(
            xss(
                text.replace(/\n/g, '<br>'),
                {br: []}
            )
        );
    }

    /**
     * @param {boolean} x
     * @returns {void}
     * @description Sets the details section of the message bubble
     *              to on or off.
     */
    function setAreDetailsVisible(x) {
        this.areDetailsVisible = x;
    }

    /**
     * @params {boolean} x
     * @returns {void}
     * @description Sets the action sheet as visible or not visible.
     */
    function setIsActionSheetVisible(x) {
        this.isActionSheetVisible = x;
    }

    /**
     * @returns {void}
     * @description Begins the process of a long press
     */
    function beginLongPress() {
        this.longPressTimeout = setTimeout(() => {
            if(this.isScrolling) {
                return;
            }
            this.setIsActionSheetVisible(true);
            this.cancelLongPress();
        }, LONG_PRESS_TIMEOUT);
    }

    /**
     * @returns {void}
     * @description Cancels the process of a long press
     */
    function cancelLongPress() {
        clearTimeout(this.longPressTimeout);
    }

    export default {
        setup() {
            const areDetailsVisible       = ref(false),
                  isActionSheetVisible    = ref(false),
                  isEditModeEnabled       = ref(false),
                  messageEditText         = ref(false),
                  longPressTimeout        = ref(null),
                  editMessageInputRef     = ref(null);

            return {
                Buffer,
                areDetailsVisible,
                isActionSheetVisible,
                isEditModeEnabled,
                longPressTimeout,
                messageEditText,
                editMessageInputRef,
                console
            }
        },
        methods: {
            setAreDetailsVisible,
            setIsActionSheetVisible,
            beginLongPress,
            cancelLongPress,
            handleActionSheetSelect,
            deleteMessage,
            editMessage,
            formatMessageText,
            updateMessageEditText
        },
        computed: {
            actionSheetOptions
        },
        props: ['conversationId', 'isScrolling', 'message', 'sharedKey'],
        mounted() {
            //Events on mount
        }
    }
</script>