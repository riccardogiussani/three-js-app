/**
 * sockett.ts
 * Centralized WebSocket Manager with Auto-Connect and Offline Queueing.
 */

export class SocketManager {
    private socket: WebSocket | null = null;
    readonly baseUrl: string; 
    
    // Queue for messages sent before connection is open
    private messageQueue: any[] = [];

    // --- Subscribers ---
    public onAudioChunk: ((data: string) => void) | null = null;
    public onFullTranscription: ((text: string) => void) | null = null;
    public onPartialTranscription: ((text: string) => void) | null = null;
    public onAgentResponse: ((text: string) => void) | null = null;
    public onAgentAction: ((command: any, toolCallId: string) => void) | null = null;
    public onGraphQueryResponse: ((data: any) => void) | null = null;

    private currentContextId: string | null = null;

    constructor(baseUrl: string = 'ws://localhost:3000') {
        this.baseUrl = baseUrl.replace('http', 'ws'); 
        (window as any).sockett = this;
        
        // ✅ Auto-connect immediately upon creation
        this.connect();
    }

    public setContextId(id: string | null) {
        this.currentContextId = id;
    }

    /**
     * Sends data if connected, otherwise queues it.
     */
    public send(data: any) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log(`[WS] Queuing message (${this.messageQueue.length + 1})...`);
            this.messageQueue.push(data);
            return;
        }
        this.sendInternal(data);
    }

    private sendInternal(data: any) {
        try {
            if (data instanceof ArrayBuffer || data instanceof Float32Array || data instanceof Int16Array) {
                this.socket!.send(data);
            } else {
                this.socket!.send(JSON.stringify(data));
            }
        } catch (e) {
            console.error("[WS] Send failed", e);
        }
    }

    /**
     * Internal connection logic
     */
    private connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;

        console.log(`%c[WS] Connecting to ${this.baseUrl}...`, 'color: #888');
        this.socket = new WebSocket(this.baseUrl);
        this.socket.binaryType = 'arraybuffer'; 

        this.socket.addEventListener("open", () => {
            console.log('%c[WS] Connected', 'color: #00ff00');
            this.flushQueue();
        });

        this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
        
        this.socket.addEventListener("close", () => {
            console.warn('[WS] Disconnected. Retrying in 3s...');
            setTimeout(() => this.connect(), 3000); // Optional: Auto-reconnect
        });

        this.socket.addEventListener("error", (err) => console.error('[WS] Error:', err));
    }

    private flushQueue() {
        if (this.messageQueue.length === 0) return;
        console.log(`%c[WS] Flushing ${this.messageQueue.length} messages...`, 'color: orange');
        while (this.messageQueue.length > 0) {
            this.sendInternal(this.messageQueue.shift());
        }
    }

    private handleMessage(message: any) {
        // ... (Keep existing parsing logic) ...
        const isBuffer = (message instanceof ArrayBuffer) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(message));
        let isJson = false;
        let parsed = null;

        if (isBuffer) {
            try {
                const str = new TextDecoder().decode(message);
                if (str.trim().startsWith('{')) {
                    parsed = JSON.parse(str);
                    isJson = true;
                }
            } catch (e) { isJson = false; }
        }

        if (isBuffer && !isJson) return; 

        try {
            const data = parsed || (typeof message === 'string' ? JSON.parse(message) : null);
            if (!data) return;

            if (data.type === 'chunk' && data.data) {
                if (data.context_id && data.context_id !== this.currentContextId) return;
                if (this.onAudioChunk) this.onAudioChunk(data.data);
            }
            else if (data.transcript) {
                if (data.end_of_turn) {
                    if (this.onFullTranscription) this.onFullTranscription(data.utterance || data.transcript);
                } else {
                    if (this.onPartialTranscription) this.onPartialTranscription(data.transcript);
                }
            }
            else if (data.status === 'ACTION_REQUIRED' && data.command) {
                if (this.onAgentAction) this.onAgentAction(data.command, data.toolCallId);
            }
            else if (data.text || (data.status === 'DONE' && data.text)) {
                 if (this.onAgentResponse) this.onAgentResponse(data.text);
            }
            else if (data.type === 'query_result' || data.type === 'build_status') {
                if (this.onGraphQueryResponse) this.onGraphQueryResponse(data);
            }
        } catch (e) {
            console.error("[WS] Parse error", e);
        }
    }
}

// Singleton Factory
let instance: SocketManager | null = null;
export function initSocketManager(baseUrl?: string): SocketManager {
    if (!instance) {
        instance = new SocketManager(baseUrl);
    }
    return instance;
}