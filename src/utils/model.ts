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
            function (gltf) {
                scene.add(gltf.scene);

                gltf.scene.traverse((child) => {
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
export function initLoaderManager(scene: THREE.Scene, interactionManager?:InteractionManager): LoaderManager {
    return new LoaderManager(scene, interactionManager);
}


// INSTANCED MESH
/*

import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { InstancedMesh } from 'three';
import { InteractionManager } from './interaction';

// Reusable objects for efficiency
const tempMatrix = new THREE.Matrix4(); 

// Interface to store all necessary data for instancing a group of meshes.
interface InstanceGroupData {
    templateMesh: THREE.Mesh;
    matrices: THREE.Matrix4[];
    originals: THREE.Object3D[];
}

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

    // Helper to strip numerical suffixes (e.g., 'piston001' -> 'piston')
    private getBaseName(name: string): string {
        // This regex captures the name part without trailing numbers (e.g., 'hex_flange_nut_..._N' from 'hex_flange_nut_..._N001')
        return name.replace(/(\.|\-|_)*(\d+$)/, '');
    }

    create(modelPath:string, isGrabbable:boolean=true){
        const interactionManager = this.interactionManager;
        const self = this; // Capture 'this' for use in the callback

        this.loader.load( 
            modelPath, 
            // Success callback
            function (gltf: { scene: THREE.Object3D<THREE.Object3DEventMap>; }) {
                // Map to store groups of meshes: BaseName -> InstanceGroupData
                const instancingCandidates = new Map<string, InstanceGroupData>();

                // --- PHASE 1: COLLECT AND GROUP MESHES ---
                gltf.scene.traverse((child: THREE.Object3D<THREE.Object3DEventMap>) => {
                    // Crucial: Update world matrices before reading their transforms
                    child.updateWorldMatrix(true, false); 
                    
                    if (child instanceof THREE.Mesh) {
                        const baseName = self.getBaseName(child.name);
                        
                        // Get the World Matrix (complete transform)
                        const worldMatrix = child.matrixWorld.clone();
                        
                        if (!instancingCandidates.has(baseName)) {
                            // First occurrence of this base name
                            instancingCandidates.set(baseName, {
                                templateMesh: child, // Use the first mesh as the template
                                matrices: [worldMatrix],
                                originals: [child]
                            });
                        } else {
                            // Subsequent occurrences
                            const group = instancingCandidates.get(baseName)!;
                            group.matrices.push(worldMatrix);
                            group.originals.push(child);
                        }
                    }
                    // For non-Mesh objects (Groups, Lights, etc.), they are handled naturally in the gltf.scene hierarchy
                });

                // --- PHASE 2: INSTANCE OR KEEP UNIQUE ---
                let instancedCount = 0;
                let uniqueCount = 0;
                
                console.groupCollapsed(`Instancing Analysis for GLTF Model`);

                for (const [name, group] of instancingCandidates.entries()) {
                    const count = group.matrices.length;
                    const templateName = group.templateMesh.name;
                    const isInstanced = count > 5;

                    if (isInstanced) {
                        // **A) INSTANCED MESHES (Optimization)**
                        
                        // 1. Create the InstancedMesh
                        const instancedMesh = new InstancedMesh(
                            group.templateMesh.geometry,
                            group.templateMesh.material,
                            count
                        );
                        
                        // --- REPLACEMENT FOR THE FAULTY COPY CALL ---
                        instancedMesh.name = `Instanced_${name}`;
                        instancedMesh.visible = group.templateMesh.visible;
                        // ---------------------------------------------
                        
                        // 2. Set the transform matrix for each instance
                        for(let i = 0; i < count; i++){
                            const originalObject = group.originals[i];

                            instancedMesh.setMatrixAt(i, group.matrices[i]);
                            
                            // 3. Remove the original mesh from its parent in the GLTF scene
                            originalObject.parent?.remove(originalObject);
                            
                            // 4. Dispose of the original geometry/material... (omesso per brevità, il tuo codice è corretto)
                            if (originalObject instanceof THREE.Mesh && i > 0) {
                                originalObject.geometry.dispose();
                            }
                        }
                        
                        instancedMesh.instanceMatrix.needsUpdate = true;
                        
                        // 5. Add the single InstancedMesh to the root of the GLTF scene
                        gltf.scene.add(instancedMesh);
                        
                        // 6. Register InstancedMesh for interaction (omesso per la tua disabilitazione)

                        // 🔔 DEBUG LOG: INSTANCED MESH
                        console.log(
                            `✅ INSTANCED: Base Mesh '${name}' (${templateName}) replaced by InstancedMesh with ${count} copies.`
                        );
                        instancedCount++;

                    } else {
                        // **B) NON-INSTANCED MESHES (Normal Import)**
                        
                        // Se la soglia è >= 2 ma <= 10, sono trattati come mesh uniche.
                        if (count > 1) {
                             console.warn(
                                `⚠️ UNIQUE (Low Count): Base Mesh '${name}' (${templateName}) kept as ${count} unique Meshes (Count <= 10).`
                            );
                        } else {
                             console.log(
                                `➡️ UNIQUE: Mesh '${name}' (${templateName}) kept as 1 unique Mesh.`
                            );
                        }
                        uniqueCount += count;
                        
                        // Il codice per impostare il grabbable è omesso (era disabilitato nel tuo script)
                    }
                }
                
                console.groupEnd();
                console.log(`\n**INSTANCING SUMMARY:**`);
                console.log(`- Instanced Groups: ${instancedCount}`);
                console.log(`- Total Unique Meshes Remaining (including low-count duplicates): ${uniqueCount}`);
                console.log(`- Total Meshes Processed: ${instancedCount + uniqueCount}`);
                
                // --- PHASE 3: FINAL ADDITION ---
                // Add the gltf.scene (which now contains a mix of InstancedMeshes and unique Meshes) to the main scene.
                self.scene.add(gltf.scene);

            }.bind(this), // Bind 'this' to the LoaderManager instance
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
}

// Factory function to initialize the ModelLoader.
// @param scene The main Three.js scene.
// @param interactionManager The InteractionManager instance.
// @returns The initialized ModelLoader instance.
export function initLoaderManager(scene: THREE.Scene, interactionManager?:InteractionManager): LoaderManager {
    return new LoaderManager(scene, interactionManager);
}

*/