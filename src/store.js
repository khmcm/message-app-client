import {createStore} from 'vuex'
import config from '@/config.js'
import nacl from 'tweetnacl'

export default createStore({
    state() {
        return {
            rootKey: null,
            publicAsymmetricEncryptionKey: null,
            privateAsymmetricEncryptionKey: null,
            publicSigningKey: null,
            privateSigningKey: null,
            symmetricEncryptionKey: null,
            publicId: null,
            secretId: null,
            hmacKey: null,
            messages: [],
            contacts: [],
            blockedUsers: [],
            volume: 50,
            theme: 'light',
            mutedUsers: [],
            isNotificationEnabled: true,
            isLockScreenEnabled: false,
            isTypingNotificationEnabled: true,
            isReadReceiptsEnabled: true,
            callDuration: 0,
            lockScreenTimeout: 0,
            timeSinceUnlocked: 0
        }
    },
    mutations: {
        setRootKey(state, payload) {
            state.rootKey = payload;
        },
        setPublicAsymmetricEncryptionKey(state, payload) {
            state.publicAsymmetricEncryptionKey = payload;
        },
        setPrivateAsymmetricEncryptionKey(state, payload) {
            state.privateAsymmetricEncryptionKey = payload;
        },
        setPublicSigningKey(state, payload) {
            state.publicSigningKey = payload;
        },
        setPrivateSigningKey(state, payload) {
            state.privateSigningKey = payload;
        },
        setSymmetricEncryptionKey(state, payload) {
            state.symmetricEncryptionKey = payload;
        },
        addMessage(state, payload) {
            state.messages.push(payload);
        },
        removeMessage(state, payload) {
            state.messages.state.messages.filter(message => message.id !== payload)
        },
        addContact(state, payload) {
            state.contacts.push(payload);
        },
        setContacts(state, payload) {
            state.contacts = payload;
        },
        addBlockedUser(state, payload) {
            state.blockedUsers.push(payload);
        },
        removeBlockedUser(state, payload) {
            state.blockedUsers = state.blockedUsers.filter(blockedUser => blockedUser.id !== payload)
        },
        setBlockedUsers(state, payload) {
            state.blockedUsers = payload;
        },
        setVolume(state, payload) {
            state.volume = payload;
        },
        setTheme(state, payload) {
            state.theme = payload;
        },
        setSecretId(state, payload) {
            state.secretId = payload;
        },
        setHmacKey(state, payload) {
            state.hmacKey = payload;
        },
        addMutedUser(state, payload) {
            state.mutedUsers = payload;
        },
        removeMutedUser(state, payload) {
            state.mutedUsers = state.mutedUser.filter(mutedUser => mutedUser.id !== payload)
        },
        setMutedUsers(state, payload) {
            state.mutedUsers = payload;
        },
        setIsNotificationEnabled(state, payload) {
            state.isNotificationEnabled = payload;
        },
        setIsLockScreenEnabled(state, payload) {
            state.isLockScreenEnabled = payload;
        },
        setIsTypingNotificationEnabled(state, payload) {
            state.isTypingNotificationEnabled = payload;
        },
        setCallDuration(state, payload) {
            state.callDuration = payload;
        },
        setLockScreenTimeout(state, payload) {
            state.lockScreenTimeout = payload;
        },
        setTimeSinceUnlocked(state, payload) {
            state.timeSinceUnlocked = payload;
        },
        setIsMessageEditModeEnabled(state, payload) {
            state.isMessageEditModeEnabled = payload;
        }
    },
    actions: {
        /* eslint-disable */
        async syncSettings({commit, getters, state, dispatch}, payload) {
            const proof = Buffer.from(nacl.sign(new TextEncoder().encode(`msgApp:syncSettings:${Date.now()}`), new Uint8Array(state.privateSigningKey))).toString('base64');
            const settingsSymmetricEncryptionNonce = nacl.randomBytes(24);
            window.fetch(config.baseAPIUrl + '/api/sync_settings', {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                cache: 'no-cache',
                body: JSON.stringify({
                    publicSigningKey: Buffer.from(state.publicSigningKey).toString('hex'),
                    proof,
                    settings: Buffer.from(
                        nacl.secretbox(
                            new TextEncoder().encode(JSON.stringify({
                                volume: state.volume,
                                theme: state.theme,
                                isNotificationEnabled: state.isNotificationEnabled,
                                isLockScreenEnabled: state.isLockScreenEnabled,
                                isTypingNotificationEnabled: state.isTypingNotificationEnabled,
                                isReadReceiptsEnabled: state.isReadReceptsEnabled,
                                lockScreenTimeout: state.lockScreenTimeout
                            }).normalize('NFKC')), settingsSymmetricEncryptionNonce, new Uint8Array(state.symmetricEncryptionKey))
                     ).toString('base64'),
                    settingsSymmetricEncryptionNonce: Buffer.from(settingsSymmetricEncryptionNonce).toString('hex')
                })
            });
        },
        async retrieveSettings({commit, getters, state, dispatch}, payload) {
            const proof = Buffer.from(nacl.sign(new TextEncoder().encode(`msgApp:retrieveSettings:${Date.now()}`.normalize('NFKC')), new Uint8Array(state.privateSigningKey))).toString('base64');
            const publicSigningKey = Buffer.from(state.publicSigningKey).toString('hex');
            const json = await (await window.fetch(config.baseAPIUrl + `/api/retrieve_settings?publicSigningKey=${encodeURIComponent(publicSigningKey)}&proof=${encodeURIComponent(proof)}`, {
                method: 'GET'
            })).json();

            if(!json.ok) {
                //Show error
                return;
            }

            if(!json.settings) {
                console.error(`No settings found.`);
                return;
            }

            const decryptedSettings = nacl.secretbox.open(Buffer.from(json.data.settings, 'base64'), Buffer.from(json.data.settingsSymmetricEncryptionNonce, 'hex'), new Uint8Array(state.symmetricEncryptionKey));
            
            if(!decryptedSettings) {
                //TODO: Throw an error
                return;
            }

            //Decrypt and apply the settings.
            const settings = JSON.parse(
                new TextDecoder().decode(
                    decryptedSettings
                )
            );

            //Merge the state with the settings.
            for(const settingsKey in settings) {
                switch(settingsKey) {
                    case 'volume':
                        commit('setVolume', settings[settingsKey]);
                        break;
                    case 'theme':
                        commit('setTheme', settings[settingsKey]);
                        break;
                    case 'isNotificationEnabled':
                        commit('setIsNotificationEnabled', settings[settingsKey]);
                        break;
                    case 'isLockScreenEnabled':
                        commit('setIsLockScreenEnabled', settings[settingsKey]);
                        break;
                    case 'isTypingNotificationEnabled':
                        commit('setIsTypingNotificationEnabled', settings[settingsKey]);
                        break;
                    case 'isReadReceiptsEnabled':
                        commit('setIsReadReceiptsEnabled', settings[settingsKey]);
                        break;
                    case 'lockScreenTimeout':
                        commit('setLockScreenTimeout', settings[settingsKey]);
                        break;
                }
            }
        }
    }
})