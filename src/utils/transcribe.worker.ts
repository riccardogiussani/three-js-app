import { pipeline } from '@xenova/transformers';

let transcriber: any = null;

self.onmessage = async (event) => {
    const { type, audio } = event.data;

    try {
        if (type === 'init') {
            // Usa 'Xenova/whisper-tiny' per velocità o 'Xenova/whisper-base' per qualità migliore.
            // Il modello viene scaricato e cachato automaticamente.
            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                quantized: true, // Riduce ulteriormente la dimensione
            });
            self.postMessage({ type: 'ready' });
        } 
        else if (type === 'transcribe') {
            if (!transcriber) throw new Error("Whisper non è ancora pronto.");

            // Esegue la trascrizione
            const result = await transcriber(audio, {
                language: 'english', // O 'english', o rimuovi per auto-detect
                task: 'transcribe'
            });

            self.postMessage({ type: 'result', text: result.text });
        }
    } catch (error: any) {
        self.postMessage({ type: 'error', message: error.message });
    }
};