import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { InstancedMesh } from 'three';
import { InteractionManager } from './interaction';

export class LoaderManager {
    private scene: THREE.Scene;
    private interactionManager:InteractionManager;
    private dracoLoader = new DRACOLoader();
    private loader = new GLTFLoader();

    constructor(scene: THREE.Scene, interactionManager:InteractionManager) {
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
            function (gltf) {
                scene.add(gltf.scene);

                gltf.scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        // Compute BVH once — persistent spatial structure
                        //child.geometry.computeBoundsTree();
                        const mesh = child;

                        if (isGrabbable) {
                            interactionManager.setGrabbable(child);
                    }
                }
                });
            },
            // Progress callback
            function ( xhr ) {
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // Error callback
            function ( error ) {
                console.error( 'Loading error:', error );
            }
        );
    }
}

/**
 * Factory function to initialize the ModelLoader.
 * This is the new API entry point.
 * @param scene The main Three.js scene.
 * @param renderer The WebGLRenderer.
 * @param camera The camera.
 * @returns The initialized ModelLoader instance.
 */
export function initLoaderManager(scene: THREE.Scene, interactionManager:InteractionManager): LoaderManager {
    return new LoaderManager(scene, interactionManager);
}