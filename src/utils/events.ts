/**
 * Manages communication from embedded HTML UI (like an HTMLMesh) back to the main
 * Three.js application using the window.postMessage API.
 */
export class EventManager {
    private handlerMap: Map<string, ActionHandler>;
    private allowedOrigin: string; // Used for security in a real application
    
    /**
     * @param allowedOrigin The expected origin (URL) of the embedded content for security.
     * Use '*' for development, but specify a domain in production.
     */
    constructor(allowedOrigin: string = '*') {
        this.handlerMap = new Map();
        this.allowedOrigin = allowedOrigin;
        
        // Bind the handler method to the instance so 'this' works correctly
        this.handleMessage = this.handleMessage.bind(this);
    }

    /**
     * Registers a callback function for a specific action string.
     * @param action The unique string identifier sent by the HTML UI (e.g., 'Action1Clicked').
     * @param handler The function to execute when the action is received.
     */
    public registerAction(action: string, handler: ActionHandler): void {
        this.handlerMap.set(action, handler);
        console.log(`EventManager: Registered action handler for: ${action}`);
    }

    /**
     * Starts listening for 'message' events on the window.
     */
    public startListening(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage, false);
            console.log("EventManager: Started listening for window messages.");
        }
    }

    /**
     * Stops listening for 'message' events on the window (useful for cleanup).
     */
    public stopListening(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('message', this.handleMessage, false);
            console.log("EventManager: Stopped listening for window messages.");
        }
    }

    /**
     * The main listener function that processes incoming messages.
     */
    private handleMessage(event: MessageEvent): void {
        // 1. Security Check: Always verify the origin
        if (this.allowedOrigin !== '*' && event.origin !== this.allowedOrigin) {
            console.warn(`EventManager: Received message from unauthorized origin: ${event.origin}`);
            return;
        }
        console.warn(`EventManager: Received message from: ${event.origin}`);

        const data: Message = event.data;

        // 2. Data Structure Check
        if (!data || typeof data.action !== 'string') {
            return; // Ignore messages not meant for the VR UI manager
        }
        
        // 3. Dispatch Action
        const handler = this.handlerMap.get(data.action);
        
        if (handler) {
            console.log(`EventManager: Dispatching action: ${data.action}`);
            handler(data.payload);
        } else {
            console.warn(`EventManager: No handler registered for action: ${data.action}`);
        }
    }
}

/**
 * Global function to initialize and configure the EventManager.
 * @param allowedOrigin The expected origin for security.
 * @returns The initialized EventManager instance.
 */
export const initEventManager = (allowedOrigin: string = '*'): EventManager => {
    const manager = new EventManager(allowedOrigin);
    manager.startListening();
    return manager;
};

/**
 * Defines the type for the callback functions that handle specific actions.
 * The key is the 'action' string from the UIMessage.
 */
type ActionHandler = (payload: any) => void;

/**
 * Defines the structure for a message received from the embedded HTML UI.
 */
interface Message {
    action: string;
    payload: any;
}