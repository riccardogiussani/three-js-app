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
    private baseUrl: string;
    
    public isRecording: boolean = false;
    
    // Callback opzionali per UI e debugging
    public onStatusChange: ((status: string) => void) | null = null;
    public onMessage: ((data: any) => void) | null = null;

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

        this.socket.onopen = () => {
            console.log('%c[WS] Connected', 'color: #00ff00');
            this.onStatusChange?.("Connected");
        };

        this.socket.onmessage = (event) => {
            try {
                // Gestione base dei messaggi in arrivo (trascrizioni o comandi)
                const data = JSON.parse(event.data);
                console.log("[WS] Received:", data);
                
                if (this.onMessage) {
                    this.onMessage(data);
                }
            } catch (e) {
                console.error("[WS] Parse error", e);
            }
        };

        this.socket.onclose = () => {
            console.warn('[WS] Disconnected');
            this.onStatusChange?.("Disconnected");
        };

        this.socket.onerror = (err) => console.error('[WS] Error:', err);
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
}

export function initVoice(baseUrl?: string): VoiceManager {
    return new VoiceManager(baseUrl);
}