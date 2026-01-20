import { KokoroTTS } from "kokoro-js";

let tts: KokoroTTS | null = null;

// Listen for messages from the main thread
self.onmessage = async (event) => {
    const { type, payload } = event.data;

    try {
        if (type === 'init') {
            tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
                dtype: "q8"
            });
            self.postMessage({ type: 'ready' });
        } 
        else if (type === 'speak') {
            if (!tts) throw new Error("Model not initialized");
            
            const { text, voiceId } = payload;
            const result = await tts.generate(text, { voice: voiceId });

            // Send audio data back to main thread
            // We use the second argument to 'transfer' the buffer (zero-copy)
            const audioBuffer = result.audio.buffer;
            self.postMessage(
                { 
                    type: 'audio', 
                    audio: result.audio, 
                    sampling_rate: result.sampling_rate 
                }, 
                [audioBuffer] as any
            );
        }
    } catch (error: any) {
        self.postMessage({ type: 'error', message: error.message });
    }
};