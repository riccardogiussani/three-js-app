/**
 * voice.ts
 * * Manages Text-to-Speech (TTS) using Kokoro-82M directly in the browser.
 * * Manages Speech-to-Text (STT) using whisper-tiny directly in the browser.
 * * Handles loading models, generating audio, and playback.
 */

export class VoiceManager {
    private worker: Worker;
    private voiceId: string;
    private audioContext: AudioContext;
    private isReady: boolean = false;

    private sttWorker: Worker;
    private isSttReady: boolean = false;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    constructor(voiceId: string = "af_heart") {
        this.voiceId = voiceId;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Initialize the worker
        this.worker = new Worker(new URL('./speak.worker.ts', import.meta.url), {
            type: 'module'
        });

        this.sttWorker = new Worker(new URL('./transcribe.worker.ts', import.meta.url), {
            type: 'module'
        });

        this.sttWorker.onmessage = (e) => {
            const { type, text, message } = e.data;
            if (type === 'ready') {
                this.isSttReady = true;
                console.log('%c[Whisper] Ready.', 'color: #00ff00');
            } else if (type === 'result') {
                console.log(`%c[Whisper] Heard: "${text}"`, 'color: yellow');
                // Qui puoi chiamare la tua funzione chat/agent
                // es: (window as any).chat(text); 
            } else if (type === 'error') {
                console.error('[Whisper] Error:', message);
            }
        };

        this.sttWorker.postMessage({ type: 'init' });

        this.setupWorkerListeners();
        
        // Start initialization in the worker
        console.log(`%c[Voice] Spawning worker...`, 'color: #888');
        this.worker.postMessage({ type: 'init' });

        (window as any).voice = this;
    }

    private setupWorkerListeners() {
        this.worker.onmessage = (event) => {
            const { type, audio, sampling_rate, message } = event.data;

            if (type === 'ready') {
                this.isReady = true;
                console.log(`%c[Voice] Worker Ready.`, 'color: #00ff00');
            } 
            else if (type === 'audio') {
                this.playAudio(audio, sampling_rate);
            } 
            else if (type === 'error') {
                console.error('[Voice] Worker Error:', message);
            }
        };
    }

    /**
     * Sends text to the worker. Returns immediately (non-blocking).
     */
    speak(text: string) {
        if (!this.isReady) {
            console.warn('[Voice] Model still loading...');
            return;
        }

        console.log(`%c[Voice] Queuing: "${text}"`, 'color: cyan');
        this.worker.postMessage({
            type: 'speak',
            payload: { text, voiceId: this.voiceId }
        });
    }

    private async playAudio(float32Array: Float32Array, sampleRate: number) {
        // If context is suspended (browser policy), this might fail silently
        // or wait until the user interacts with the page elsewhere.
        if (this.audioContext.state === 'suspended') {
             await this.audioContext.resume();
        }

        const buffer = this.audioContext.createBuffer(1, float32Array.length, sampleRate);
        buffer.getChannelData(0).set(float32Array);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
    }
    
    /**
     * Inizia ad ascoltare dal microfono
     */
    public async startListening() {
        if (!this.isSttReady) {
            console.warn('[Whisper] Model loading...');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                // Converti l'audio registrato per Whisper
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioData = await this.convertBlobToFloat32(audioBlob);
                
                // Invia al worker
                console.log('[Whisper] Transcribing...');
                this.sttWorker.postMessage({ type: 'transcribe', audio: audioData });
            };

            this.mediaRecorder.start();
            console.log('%c[Voice] Listening...', 'color: red');

        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }

    /**
     * Ferma la registrazione e avvia la trascrizione
     */
    public stopListening() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            console.log('%c[Voice] Processing...', 'color: orange');
        }
    }

    // Per compatibilità con la tua interfaccia precedente
    async transcribe() {
        // Logica toggle: se sta registrando ferma, altrimenti inizia
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    /**
     * Helper: Whisper vuole un Float32Array a 16000Hz
     */
    private async convertBlobToFloat32(blob: Blob): Promise<Float32Array> {
        const arrayBuffer = await blob.arrayBuffer();
        const audioCtx = new AudioContext({ sampleRate: 16000 }); // Whisper vuole 16kHz
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        return audioBuffer.getChannelData(0); // Prendi solo il canale mono
    }
}

export function initVoice(voiceId?: string): VoiceManager {
    return new VoiceManager(voiceId);
}