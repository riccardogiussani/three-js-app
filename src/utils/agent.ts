/**
 * agent.ts
 * * Manages AI interaction handling network requests to the backend
 * and executing scene commands (move, color, etc.).
 */

import * as THREE from 'three';

export class AgentManager {
    private scene: THREE.Scene;
    private baseUrl: string;

    constructor(scene: THREE.Scene, baseUrl: string = 'http://localhost:3000') {
        this.scene = scene;
        this.baseUrl = baseUrl;

        // Expose chat function globally for debugging/console usage
        (window as any).chat = this.sendMessage.bind(this);
        console.log(`%c[Agent] Initialized. Usage: chat("Move the cube")`, 'color: cyan');
    }

    /**
     * Main entry point to send a message to the AI
     */
    async sendMessage(text: string) {
        console.log(`%c[Agent] Requesting: "${text}"...`, 'color: #888');
        try {
            const response = await fetch(`${this.baseUrl}/chat/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();

            if (data.status === 'ACTION_REQUIRED') {
                console.log('%c[Agent] AI wants to execute command:', 'color: orange', data.command);
                try {
                    // Execute the command locally using internal logic
                    const resultDetails = await this.handleCommand(data.command.payload);
                    await this.sendFeedback(data.toolCallId, true, resultDetails);
                } catch (execError: any) {
                    console.warn('[Agent] Client execution failed:', execError);
                    await this.sendFeedback(data.toolCallId, false, execError.message || "Unknown client error");
                }
            } else {
                console.log('%c[Agent] AI Response:', 'color: #00ff00', data.text);
            }
        } catch (err) {
            console.error('[Agent] Request failed:', err);
        }
    }

    /**
     * Internal handler for scene manipulation commands
     */
    private async handleCommand(payload: any): Promise<string> {
        const { target, action, value } = payload;

        // Find object within the managed scene
        const obj = this.scene.getObjectByName(target);
        if (!obj) throw new Error(`Object '${target}' not found in scene`);

        // Perform Action
        if (action === 'move') {
            const [x, y, z] = value.split(',').map(Number);
            
            // Example using Promise (can be replaced with GSAP/Tween)
            return new Promise((resolve) => {
                obj.position.set(x, y, z);
                // Optional: Force matrix update if autoUpdate is false
                obj.updateMatrix(); 
                resolve(`Moved ${target} to ${x},${y},${z}`);
            });
        }

        if (action === 'color') {
            if ((obj as any).material) {
                // Handle array of materials or single material
                const material = (obj as any).material;
                if (Array.isArray(material)) {
                    material.forEach(m => m.color.set(value));
                } else {
                    material.color.set(value);
                }
                return `Changed ${target} color to ${value}`;
            } else {
                throw new Error(`${target} has no material to color`);
            }
        }

        throw new Error(`Unknown action: ${action}`);
    }

    /**
     * Sends the feedback loop back to the LLM/Backend
     */
    private async sendFeedback(toolCallId: string, success: boolean, details: string) {
        console.log(`%c[Agent] Sending Feedback (Success: ${success})...`, 'color: #888');
        try {
            const response = await fetch(`${this.baseUrl}/chat/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolCallId, success, details })
            });
            const data = await response.json();
            console.log('%c[Agent] Final AI Response:', 'color: #00ff00', data.text);
        } catch (err) {
            console.error('[Agent] Feedback failed:', err);
        }
    }
}

/**
 * Factory function to initialize the AgentManager.
 */
export function initAgentManager(scene: THREE.Scene, baseUrl?: string): AgentManager {
    return new AgentManager(scene, baseUrl);
}