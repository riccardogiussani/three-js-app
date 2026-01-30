/**
 * agent.ts
 * Manages Scene Logic and AI Commands.
 * Uses SocketManager for transport.
 */
import * as THREE from 'three';
import { SocketManager } from "./sockett";

export class AgentManager {
    private scene: THREE.Scene;
    private socketManager: SocketManager;
    
    // Callbacks
    public onResponse: ((text: string) => void) | null = null;

    constructor(scene: THREE.Scene, socketManager: SocketManager) {
        this.scene = scene;
        this.socketManager = socketManager;

        // Subscribe to Agent events
        this.socketManager.onAgentResponse = (text) => this.handleAgentResponse(text);
        this.socketManager.onAgentAction = (cmd, id) => this.handleAgentAction(cmd, id);

        (window as any).chat = this.sendMessage.bind(this);
    }

    /**
     * Sends a text query to the Agent via WebSocket
     */
    public sendMessage(text: string) {
        console.log(`%c[Agent] Sending: "${text}"`, 'color: #888');
        this.socketManager.send({
            type: 'agent_query',
            message: text
        });
    }

    private handleAgentResponse(text: string) {
        console.log('%c[Agent] Response:', 'color: #00ff00', text);
    }

    private async handleAgentAction(command: any, toolCallId: string) {
        const { payload } = command;
        console.log('%c[Agent] Executing Command:', 'color: orange', payload);

        try {
            const resultDetails = await this.executeSceneCommand(payload);
            
            // Send Success Feedback
            this.socketManager.send({
                type: 'agent_feedback', // Backend must handle this type!
                toolCallId: toolCallId,
                success: true,
                details: resultDetails
            });

        } catch (error: any) {
            console.warn('[Agent] Execution failed:', error);
            
            // Send Failure Feedback
            this.socketManager.send({
                type: 'agent_feedback',
                toolCallId: toolCallId,
                success: false,
                details: error.message || "Unknown error"
            });
        }
    }

    private async executeSceneCommand(payload: any): Promise<string> {
        const { target, action, value } = payload;
        const obj = this.scene.getObjectByName(target);
        
        if (!obj) throw new Error(`Object '${target}' not found`);

        if (action === 'move') {
            const [x, y, z] = value.split(',').map(Number);
            obj.position.set(x, y, z);
            obj.updateMatrix();
            return `Moved ${target} to ${x},${y},${z}`;
        }

        if (action === 'color') {
            if ((obj as any).material) {
                const mat = (obj as any).material;
                if (Array.isArray(mat)) mat.forEach(m => m.color.set(value));
                else mat.color.set(value);
                return `Colored ${target} to ${value}`;
            }
            throw new Error(`${target} has no material`);
        }

        throw new Error(`Unknown action: ${action}`);
    }
}

export function initAgentManager(scene: THREE.Scene, socket: SocketManager): AgentManager {
    return new AgentManager(scene, socket);
}