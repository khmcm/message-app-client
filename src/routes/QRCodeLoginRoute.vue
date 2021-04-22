<template>
    <div style="display: none;" ref="qrCodeStream"></div>
    <canvas style="filter: brightness(0.7);" ref="qrCodeCanvas" :width="screenWidth" :height="screenHeight"></canvas>
    <div class="overlay-gradient"></div>
    <div class="overlay-text">Scan a keyfile QR code to log in</div>
    <div class="back-button" @click="navigateBack()">Back</div>
</template>

<style lang="scss" scoped>
    @import '@/styles/_colors.scss';
    @import '@/styles/_fonts.scss';
    @import '@/styles/_sizes.scss';

    .overlay-text {
        bottom: 90px;
        color: white;
        font-family: 'Poppins';
        font-size: 30px;
        font-weight: bold;
        left: 50%;
        position: absolute;
        text-align: center;
        transform: translateX(-50%);
        width: 80%;
    }

    .overlay-gradient {
        position: absolute;
        top: 0;
        left: 0;
        height: 100vh;
        width: 100vw;
        background: linear-gradient(transparent 0%, transparent 60%, rgb(0, 0, 0, 0.0) 60%, rgb(0, 0, 0, 0.9));
    }

    .back-button {
        position: absolute;
        bottom: 32px;
        font-family: $font-content-primary;
        color: white;
        border-radius: 25px;
        border: 3px solid white;
        font-weight: bold;
        font-size: 20px;
        width: fit-content;
        padding: 5px 20px;
        left: 50%;
        transform: translateX(-50%);
        cursor: pointer;
        &:hover {
            background: white;
            color: black;
            border-color: transparent;
        }
    }
</style>

<script>
    import jsQR from 'jsqr'
    import {ref} from 'vue'

    function handleDecode() {

    }

    function navigateBack() {
        this.$router.go(-1);
    }

    const FRAMES_PER_SECOND = 30;

    async function readQrCode({imageData, imageWidth, imageHeight}) {
        const code = jsQR(imageData, imageWidth, imageHeight, {inversionAttempts: 'attemptBoth'});

        return code?code:null;
    }
    
    async function mounted() {
        if(!this.qrCodeCanvasCtx) {
            this.qrCodeCanvasCtx = this.$refs.qrCodeCanvas.getContext('2d');
        }
        try {
            window.navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}});
            if('mediaDevices' in window.navigator && 'getUserMedia' in window.navigator.mediaDevices) {
                
                const cameraStream = await window.navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
                const vid = document.createElement('video');

                vid.srcObject = cameraStream;

                vid.setAttribute('playsinline', true);
                vid.setAttribute('autoplay', true);

                this.$refs.qrCodeStream.appendChild(vid);

                setInterval(() => {
                    if(!this.qrCodeCanvasCtx) {
                        return;
                    }
                    this.$refs.qrCodeCanvas.getContext('2d').drawImage(vid, 0, 0, window.innerWidth, window.innerHeight);
                    this.scanCounter += FRAMES_PER_SECOND;
                    if(this.scanCounter > 500) {
                        const imageData = this.qrCodeCanvasCtx.getImageData(0, 0, this.screenWidth, this.screenHeight);
                        this.scanCounter = 0;
                        
                        readQrCode({
                            imageData: imageData.data,
                            imageWidth: this.screenWidth,
                            imageHeight: this.screenHeight,
                        }).then(code => {
                            //Do something with the QR code
                            code;
                        }).catch(e => {
                            throw new Error(e);
                        });
                    }
                }, Math.round(1000/FRAMES_PER_SECOND));
            }
        } catch(e) {
            alert(e.message);
        }
    }

    export default {
        setup() {
            const cameraStream    = ref(null),
                  displayInterval = ref(null),
                  scanCounter     = ref(0),
                  qrCodeCanvasCtx = ref(null);
            return {
                cameraStream,
                displayInterval,
                scanCounter,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                qrCodeCanvasCtx
            }
        },
        methods: {
            handleDecode,
            navigateBack
        },
        components: {},
        mounted
    }
</script>