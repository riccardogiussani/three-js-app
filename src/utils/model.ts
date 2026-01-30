/**
 * model.ts
 * Manages loading 3D models. Returns Promises for async control.
 */
import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { InteractionManager } from './interaction';

export class LoaderManager {
    private scene: THREE.Scene;
    private interactionManager?: InteractionManager;
    private dracoLoader = new DRACOLoader();
    private loader = new GLTFLoader();

    constructor(scene: THREE.Scene, interactionManager?: InteractionManager) {
        this.scene = scene;
        this.interactionManager = interactionManager;
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'); 
        this.loader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * Loads a GLB/GLTF model and adds it to the scene.
     * Returns a Promise that resolves with the loaded model group.
     */
    public create(modelPath: string, isGrabbable: boolean = true): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            this.loader.load( 
                modelPath, 
                // Success callback
                (gltf) => {
                    console.log(`📦 Loaded: ${modelPath}`);
                    
                    // 1. Add visual model to scene
                    this.scene.add(gltf.scene);

                    // 2. Setup Physics/Interaction
                    gltf.scene.traverse((child) => {
                        if (child instanceof THREE.Mesh && isGrabbable) {
                            this.interactionManager?.setGrabbable(child);
                        }
                    });

                    // 3. Resolve the Promise with the model
                    resolve(gltf.scene);
                },
                // Progress callback (optional)
                undefined,
                // Error callback
                (error) => {
                    console.error('Loading error:', error);
                    reject(error);
                }
            );
        });
    }
}

export function initLoaderManager(scene: THREE.Scene, interactionManager?: InteractionManager): LoaderManager {
    return new LoaderManager(scene, interactionManager);
}