/**
 * voice.ts
 * Gestisce la registrazione audio e la comunicazione WebSocket
 * basandosi sulla logica dello script fornito.
 */

export class VoiceManager {
    private socket: WebSocket | null = null;

    private audioContext: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private input: MediaStreamAudioSourceNode | null = null;
    private globalStream: MediaStream | null = null;

    private nextStartTime: number = 0;
    private isPlaying: boolean = false;

    public isRecording: boolean = false;
    private baseUrl: string;
    
    // Callback opzionali per UI e debugging
    public onStatusChange: ((status: string) => void) | null = null;
    public onMessage: ((data: any) => void) | null = null;
    public onFullTranscription: ((text: string) => void) | null = null;
    public onPartialTranscription: ((text: string) => void) | null = null;

    constructor(baseUrl: string = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        (window as any).voice = this;
    }

    public initVoice() {
        this.connectSocket();
    }

    private connectSocket() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN)) return;

        this.socket = new WebSocket(this.baseUrl);
        this.socket.binaryType = 'arraybuffer'; // Setup for binary audio if needed

        this.socket.onopen = () => {
            console.log('%c[WS] Connected', 'color: #00ff00');
            //this.onStatusChange?.("Connected");
        };

        this.socket.onmessage = async (event) => {
            try {
                let data;
                if (typeof event.data === 'string') {
                    data = JSON.parse(event.data);
                    
                    if (data.type === 'chunk' && data.data) {
                        await this.scheduleAudioChunk(data.data);
                        return;
                    }
                    
                    if(data.transcript){
                        if(data.end_of_turn){
                            const finalText = data.utterance || data.transcript;
                            if(this.onFullTranscription) this.onFullTranscription(finalText);
                        }else{
                            if(this.onPartialTranscription) this.onPartialTranscription(data.transcript);
                        }
                    }else{
                        if (this.onMessage) this.onMessage(data);
                    }
                } else {
                    // Handle raw binary if backend sends it (unlikely with current setup, but good practice)
                    return; 
                }
            } catch (e) {
                console.error("[WS] Parse error", e);
            }
        };

        this.socket.onclose = () => {
            console.warn('[WS] Disconnected');
            //this.onStatusChange?.("Disconnected");
        };

        this.socket.onerror = (err) => console.error('[WS] Error:', err);
    }

    /**
     * Sends a request to the Backend to speak text via Cartesia
     */
    public speak(text: string) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("Cannot speak: Socket not connected");
            return;
        }

        // Reset timing for a new sentence to avoid long delays
        if (this.audioContext) {
            this.nextStartTime = this.audioContext.currentTime + 0.1; 
        }

        console.log(`%c[Voice] Requesting TTS: "${text}"`, 'color: #ff00ff');
        
        this.socket.send(JSON.stringify({
            type: "speak",
            text: text,
            contextId: `ctx_${Date.now()}` // Helps Cartesia group chunks
        }));
    }

    /**
     * Avvia e arresta la registrazione alternativamente
     */
    public async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    public async startRecording() {
        if (this.isRecording) return;

        try {
            // 1. Setup AudioContext (sample rate nativo del sistema)
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const nativeSampleRate = this.audioContext.sampleRate;
            const targetSampleRate = 16000; // Standard per molti servizi STT (es. AssemblyAI)

            // 2. Acquisizione microfono
            this.globalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.input = this.audioContext.createMediaStreamSource(this.globalStream);

            // 3. Setup Processor (Buffer 4096)
            // Nota: ScriptProcessor è deprecato ma richiesto dalla logica dello script fornito
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.input.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.processor.onaudioprocess = (e) => {
                if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // A. Downsampling (es. 48k -> 16k)
                const downsampledData = this.downsampleBuffer(inputData, nativeSampleRate, targetSampleRate);

                // B. Conversione Float32 -> Int16 PCM
                const pcmData = this.floatTo16BitPCM(downsampledData);

                // C. Invio dati
                this.socket.send(pcmData.buffer);
            };

            this.isRecording = true;
            this.onStatusChange?.("Recording");
            console.log("%c[Voice] Started Recording", "color: cyan");

        } catch (err) {
            console.error("[Voice] Start Error:", err);
            this.stopRecording();
        }
    }

    public stopRecording() {
        if (!this.isRecording) return;

        if (this.globalStream) {
            this.globalStream.getTracks().forEach(track => track.stop());
            this.globalStream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.input) {
            this.input.disconnect();
            this.input = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.isRecording = false;
        this.onStatusChange?.("Idle");
        console.log("%c[Voice] Stopped Recording", "color: orange");
    }

    // --- Helper Functions ---

    /**
     * Converte Float32Array in Int16Array
     */
    private floatTo16BitPCM(input: Float32Array): Int16Array {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    /**
     * Riduce il sample rate (es. da 44100/48000 a 16000)
     */
    private downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
        if (outputSampleRate === inputSampleRate) return buffer;

        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        let offsetResult = 0;
        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            
            // Media semplice per downsampling (rudimentale ma veloce)
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }

            result[offsetResult] = count > 0 ? accum / count : 0;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }

        return result;
    }

    /**
     * Decodes Base64 audio from Cartesia and schedules it seamlessly
     */
    private async scheduleAudioChunk(base64Data: string) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        try {
            // A. Base64 -> Float32Array
            const raw = window.atob(base64Data);
            const len = raw.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = raw.charCodeAt(i);
            }
            const floatData = new Float32Array(bytes.buffer);

            // B. Create AudioBuffer
            const buffer = this.audioContext.createBuffer(1, floatData.length, 44100);
            buffer.getChannelData(0).set(floatData);

            // C. Schedule Playback
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);

            // Ensure smooth playback without gaps
            if (this.nextStartTime < this.audioContext.currentTime) {
                this.nextStartTime = this.audioContext.currentTime;
            }

            source.start(this.nextStartTime);
            this.nextStartTime += buffer.duration;

        } catch (e) {
            console.error("Error decoding audio chunk", e);
        }
    }
}

export function initVoice(baseUrl?: string): VoiceManager {
    return new VoiceManager(baseUrl);
}