/**
 * model.ts
 * 
 * This module manages loading 3D models into the three.js scene using GLTFLoader and DRACOLoader.
 * It provides the LoaderManager class which handles loading models, adding them to the scene,
 * and optionally marking meshes as grabbable for interaction.
 * 
 * The module exports an initLoaderManager function to initialize the LoaderManager.
 */

import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { InteractionManager } from './interaction';

export class LoaderManager {
    private scene: THREE.Scene;
    private interactionManager?:InteractionManager;
    private dracoLoader = new DRACOLoader();
    private loader = new GLTFLoader();

    constructor(scene: THREE.Scene, interactionManager?:InteractionManager) {
        this.scene = scene;
        this.interactionManager = interactionManager;
        this.dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/' ); 
        this.loader.setDRACOLoader( this.dracoLoader );
    }

    create(modelPath:string, isGrabbable:boolean=true){
        let scene = this.scene;
        let interactionManager = this.interactionManager;
        this.loader.load( 
            modelPath, 
            // Success callback
            (gltf) => {
                console.groupCollapsed(`🏗️ Model Structure: ${modelPath}`);
                const structure = this.debugSceneGraph(gltf.scene);
                console.log(structure.join('\n'));
                console.groupEnd();

                const cleanRoot = sanitizeGraph(gltf.scene);
                fetch('http://localhost:3000/graph/build', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sceneRoot: cleanRoot })
                });

                scene.add(gltf.scene);

                gltf.scene.traverse((child) => {
                    //console.log(child.name);
                    if (child instanceof THREE.Mesh) {
                        // Compute BVH once — persistent spatial structure
                        //child.geometry.computeBoundsTree();
                        const mesh = child;

                        if (isGrabbable) {
                            interactionManager?.setGrabbable(child);
                    }
                }
                });
            },
            // Progress callback
            function ( xhr ) {
                //console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // Error callback
            function ( error ) {
                console.error( 'Loading error:', error );
            }
        );
    }

    /**
     * Recursively traverses the object and returns a formatted string map.
     */
    private debugSceneGraph(obj: THREE.Object3D, lines: string[] = [], depth: number = 0): string[] {
        const indent = '  '.repeat(depth);
        const icon = obj.children.length > 0 ? '📁' : '📦'; // Folder vs Object
        
        // Gather useful info
        const type = obj.type;
        const name = obj.name || '<no name>';
        // Check if it has specific user data (often used for logic)
        const userData = Object.keys(obj.userData).length > 0 ? ` Data: ${JSON.stringify(obj.userData)}` : '';
        
        lines.push(`${indent}${icon} ${name} (${type})${userData}`);

        for (const child of obj.children) {
            this.debugSceneGraph(child, lines, depth + 1);
        }
        return lines;
    }
}

interface SanitizedNode {
    uid: string;
    name: string;
    type: string;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    color?: string; // Optional, only for Meshes
    children: SanitizedNode[];
}

function sanitizeGraph(obj: THREE.Object3D, parentPath: string = ""): SanitizedNode {
    const safeName = (obj.name || "Unnamed").replace(/\//g, "-");
    const uniquePath = parentPath ? `${parentPath}/${safeName}` : safeName;

    const node: SanitizedNode = {
        uid: uniquePath,
        name: obj.name,
        type: obj.type,
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        children: obj.children.map((c) => sanitizeGraph(c, uniquePath))
    };

    // Extract color if the object is a Mesh with a standard material
    if (obj instanceof THREE.Mesh && obj.material && 'color' in obj.material) {
        node.color = `#${obj.material.color.getHexString()}`;
    }

    return node;
}

/**
 * Factory function to initialize the ModelLoader.
 * This is the new API entry point.
 * @param scene The main Three.js scene.
 * @param renderer The WebGLRenderer.
 * @param camera The camera.
 * @returns The initialized ModelLoader instance.
 */
export function initLoaderManager(scene: THREE.Scene, interactionManager?:InteractionManager): LoaderManager {
    return new LoaderManager(scene, interactionManager);
}
