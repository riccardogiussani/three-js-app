/**
 * environment.ts
 */

import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// 1. Import the Splat Mesh
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

export class EnvironmentManager {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;

    private dracoLoader = new DRACOLoader();
    private gltfLoader = new GLTFLoader();
    
    private splatMeshes: any[] = [];
    
    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;

        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'); 
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    public create(path: string) {
        const extension = path.split('.').pop()?.toLowerCase();

        if (extension === 'glb' || extension === 'gltf') {
            this.loadGLTF(path);
        } else if (extension === 'splat' || extension === 'ply' || extension === 'ksplat') {
            this.loadSplat(path);
        } else {
            console.warn(`[Environment] Unsupported extension: .${extension}`);
        }
    }

    private loadGLTF(path: string) {
        this.gltfLoader.load( 
            path, 
            // Success callback
            (gltf) => {
                this.scene.add(gltf.scene);

                gltf.scene.traverse((child) => {
                    //console.log(child.name);
                    if (child instanceof THREE.Mesh) {
                        // Compute BVH once — persistent spatial structure
                        //child.geometry.computeBoundsTree();
                        const mesh = child;
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

    private loadSplat(path: string) {
        const viewer = new GaussianSplats3D.DropInViewer();
        
        viewer.addSplatScene(path, {
            'splatAlphaRemovalThreshold': 5,
            'showLoadingUI': false
        })
        .then(() => {
            console.log(`🎨 Loaded Splat: ${path}`);
            this.scene.add(viewer);
            this.splatMeshes.push(viewer);
        })
        .catch((error: unknown) => {
            console.error('Splat Loading error:', error);
        });
    }

    public update() {
        
    }
}

export function initEnvironmentManager(
    scene: THREE.Scene, 
    renderer: THREE.WebGLRenderer, 
    camera: THREE.PerspectiveCamera
): EnvironmentManager {
    return new EnvironmentManager(scene, renderer, camera);
}