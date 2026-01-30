/**
 * graph.ts
 * Manages Scene Graph synchronization via WebSocket.
 */
import * as THREE from 'three';
import { SocketManager } from "./sockett";

// Interface for the data structure sent to Backend
export interface SanitizedNode {
    uid: string;
    name: string;
    type: string;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    color?: string;
    children: SanitizedNode[];
}

export class GraphManager {
    private socketManager: SocketManager;

    constructor(socketManager: SocketManager) {
        this.socketManager = socketManager;
    }

    /**
     * Pushes a Three.js model to the Neo4j Knowledge Graph.
     * Call this manually after a model is loaded.
     */
    public push(root: THREE.Object3D) {
        console.log(`%c[Graph] Pushing model: ${root.name || 'Scene'}`, 'color: #bada55');
        
        // 1. Sanitize (Flatten logic)
        const cleanRoot = this.sanitizeGraph(root);

        // 2. Send via WebSocket
        this.socketManager.send({
            type: "add_to_graph",
            sceneRoot: cleanRoot
        });
    }

    public query(cypher: string) {
        this.socketManager.send({ type: "query_graph", query: cypher });
    }

    /**
     * Recursive helper to clean Three.js objects for JSON transport
     */
    private sanitizeGraph(obj: THREE.Object3D, parentPath: string = ""): SanitizedNode {
        const safeName = (obj.name || "Unnamed").replace(/\//g, "-");
        // Ensure path doesn't start with slash if parentPath is empty
        const uniquePath = parentPath ? `${parentPath}/${safeName}` : safeName;
    
        const node: SanitizedNode = {
            uid: uniquePath,
            name: safeName,
            type: obj.type,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            children: obj.children.map((c) => this.sanitizeGraph(c, uniquePath))
        };
    
        if (obj instanceof THREE.Mesh) {
            const mat = obj.material;
            if (mat && (mat as any).color) {
                node.color = `#${(mat as any).color.getHexString()}`;
            } else if (Array.isArray(mat) && mat.length > 0 && (mat[0] as any).color) {
                 node.color = `#${(mat[0] as any).color.getHexString()}`;
            }
        }
        return node;
    }
}

export function initGraphManager(socketManager: SocketManager): GraphManager {
    return new GraphManager(socketManager);
}