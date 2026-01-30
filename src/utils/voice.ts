/**
 * voice.ts
 * Manages Audio Input (Mic) and Output (Speakers).
 * Uses SocketManager for transport.
 */
import { SocketManager } from "./sockett";

export class VoiceManager {
    private socketManager: SocketManager;
    
    // Audio Context
    private audioContext: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private input: MediaStreamAudioSourceNode | null = null;
    private globalStream: MediaStream | null = null;

    private nextStartTime: number = 0;
    private activeSources: AudioBufferSourceNode[] = [];
    public isRecording: boolean = false;

    // Callbacks for UI
    public onStatusChange: ((status: string) => void) | null = null;

    constructor(socketManager: SocketManager) {
        this.socketManager = socketManager;
        (window as any).voice = this;

        // Subscribe to Socket Events
        this.socketManager.onAudioChunk = (base64) => this.scheduleAudioChunk(base64);
        
        // We can re-emit transcription events for the UI if needed
        // or the UI can subscribe to SocketManager directly. 
        // For backward compatibility, we can proxy them here if the UI expects them on VoiceManager.
    }

    public speak(text: string) {
        // 1. Stop previous audio
        this.stopPlayback();
        this.ensureAudioContext();

        // 2. Generate Context ID
        const contextId = `ctx_${Date.now()}`;
        this.socketManager.setContextId(contextId);

        console.log(`%c[Voice] Requesting TTS: "${text}"`, 'color: #ff00ff');
        
        // 3. Send via SocketManager
        this.socketManager.send({
            type: "speak",
            text: text,
            contextId: contextId 
        });
    }

    public async toggleRecording() {
        if (this.isRecording) await this.stopRecording();
        else await this.startRecording();
    }

    public async startRecording() {
        if (this.isRecording) return;
        this.stopPlayback(); // Stop TTS so we don't record ourselves

        try {
            this.ensureAudioContext();
            const nativeSampleRate = this.audioContext!.sampleRate;
            const targetSampleRate = 16000; 

            this.globalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.input = this.audioContext!.createMediaStreamSource(this.globalStream);
            this.processor = this.audioContext!.createScriptProcessor(4096, 1, 1);

            this.input.connect(this.processor);
            this.processor.connect(this.audioContext!.destination);

            this.processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const downsampledData = this.downsampleBuffer(inputData, nativeSampleRate, targetSampleRate);
                const pcmData = this.floatTo16BitPCM(downsampledData);
                
                // Send Raw Binary via SocketManager
                this.socketManager.send(pcmData.buffer);
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
        
        // Cleanup Audio Nodes
        this.globalStream?.getTracks().forEach(track => track.stop());
        this.processor?.disconnect();
        this.input?.disconnect();
        
        this.globalStream = null;
        this.processor = null;
        this.input = null;

        this.isRecording = false;
        this.onStatusChange?.("Idle");
        console.log("%c[Voice] Stopped Recording", "color: orange");
    }

    private stopPlayback() {
        this.activeSources.forEach(s => { try { s.stop(); } catch(e){} });
        this.activeSources = [];
        if (this.audioContext) this.nextStartTime = this.audioContext.currentTime;
        
        // Clear context to ignore remaining incoming chunks
        this.socketManager.setContextId(null);
    }

    private ensureAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // --- Audio Utils (Same as before) ---

    private async scheduleAudioChunk(base64Data: string) {
        this.ensureAudioContext();
        try {
            const raw = window.atob(base64Data);
            const floatData = new Float32Array(new Uint8Array([...raw].map(c => c.charCodeAt(0))).buffer);
            
            const buffer = this.audioContext!.createBuffer(1, floatData.length, 44100); // Check Cartesia Sample Rate! (usually 44100 or 24000)
            buffer.getChannelData(0).set(floatData);

            const source = this.audioContext!.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext!.destination);

            this.activeSources.push(source);
            source.onended = () => {
                this.activeSources = this.activeSources.filter(s => s !== source);
            };

            if (this.nextStartTime < this.audioContext!.currentTime) {
                this.nextStartTime = this.audioContext!.currentTime;
            }
            source.start(this.nextStartTime);
            this.nextStartTime += buffer.duration;

        } catch (e) { console.error("Error decoding chunk", e); }
    }

    private floatTo16BitPCM(input: Float32Array): Int16Array {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    private downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
        if (outputRate === inputRate) return buffer;
        const ratio = inputRate / outputRate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i]; count++;
            }
            result[offsetResult] = count > 0 ? accum / count : 0;
            offsetResult++; offsetBuffer = nextOffsetBuffer;
        }
        return result;
    }
}

export function initVoice(socket: SocketManager): VoiceManager {
    return new VoiceManager(socket);
}