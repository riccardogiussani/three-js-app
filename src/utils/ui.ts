/**
 * ui.ts
 * 
 * This module manages the creation and management of HTML-based VR menus using HTMLMesh.
 * It provides the UIManager class which handles loading HTML menus as 3D meshes,
 * positioning them in the scene, and managing interaction via InteractiveGroup.
 * 
 * The module exports an initUI function to initialize the UIManager.
 */

import * as THREE from 'three';
import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { ControllerManager } from './controller';

// Interface to store attachment details
interface UIAttachment {
    mesh: THREE.Object3D;
    target: THREE.Object3D;
    localPos: THREE.Vector3;
    localRot: THREE.Quaternion;
    lookAt?: THREE.Object3D; // New optional property
}

/**
 * UIManager class to handle the creation and management of HTML-based VR menus (HTMLMesh).
 */
export class UIManager {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private controllers: ControllerManager['leftController'][];
    private interactiveGroup: InteractiveGroup;

    private attachments: UIAttachment[] = [];

    /**
     * @param scene The main Three.js scene.
     * @param renderer The WebGLRenderer.
     * @param camera The camera.
     * @param controller The VR controllers (for interaction listening).
     */
constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controllerManager: ControllerManager) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.controllers = [controllerManager.rightController, controllerManager.leftController];
        
        // Create a single InteractiveGroup to manage all UI meshes
        this.interactiveGroup = new InteractiveGroup();
        this.interactiveGroup.listenToPointerEvents( this.renderer, this.camera );
        for(const controller of this.controllers){
            this.interactiveGroup.listenToXRControllerEvents(controller.tip);
        }
        this.scene.add(this.interactiveGroup);
    }

    /**
     * Creates a new HTMLMesh from a specified HTML file and adds it to the scene.
     * * @param htmlPath The path to the HTML file (e.g., './menu.html').
     * @param position The world position of the menu (e.g., new THREE.Vector3(0, 1.5, -1)).
     * @param rotation The rotation of the menu (e.g., new THREE.Euler(0, 0, 0)).
     * @param scale The uniform scale of the menu (e.g., 0.005).
     * @param name Optional name for the mesh.
     * @returns A promise that resolves to the created HTMLMesh or null if creation failed.
     */
    public async create(
        htmlPath: string, 
        position: THREE.Vector3, 
        rotation: THREE.Euler, 
        scale: number, 
        name: string = 'VR UI Mesh'
    ): Promise<HTMLMesh | null> {
        try {
            // 1. Fetch the HTML content
            const response = await fetch(htmlPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${htmlPath}: ${response.statusText}`);
            }
            const htmlContent = await response.text();

            // 2. Parse and add the DOM element
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = htmlContent;
            
            if (!tempContainer.firstChild) {
                 throw new Error(`${htmlPath} loaded but is empty.`);
            }
            const domElement = tempContainer.firstElementChild as HTMLElement;            
            // Must be added to the DOM to be rendered by HTMLMesh
            document.body.appendChild(domElement); 
            
            // 3. Create the HTMLMesh
            const mesh = new HTMLMesh(domElement);

            mesh.userData.element = domElement;
            
            // 4. Apply transformations
            mesh.position.copy(position);
            mesh.rotation.copy(rotation);
            mesh.scale.setScalar(scale);
            mesh.name = name;
            
            // 5. Add to the Interactive Group
            this.interactiveGroup.add(mesh);

            console.log(`VR UI Mesh '${name}' successfully created and added to scene.`);
            return mesh;

        } catch (error) {
            console.error(`Error creating VR UI Mesh from ${htmlPath}:`, error);
            return null;
        }
    }

    /**
     * Soft-attaches a UI Mesh (or its loading promise) to a target object.
     * @param meshOrPromise The existing mesh OR the promise returned by create().
     * @param target The object to follow (e.g., controller.tip).
     * @param positionOffset Local position offset (x, y, z).
     * @param rotationOffset Local rotation offset (x, y, z) in radians.
     * @param lookAtTarget Optional: The object to face (usually the camera).
     */
    public attach(
        meshOrPromise: THREE.Object3D | Promise<HTMLMesh | null>, 
        target: THREE.Object3D, 
        positionOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
        rotationOffset: THREE.Euler = new THREE.Euler(0, 0, 0),
        lookAtTarget?: THREE.Object3D // New argument
    ) {
        const register = (mesh: THREE.Object3D) => {
            const qOffset = new THREE.Quaternion().setFromEuler(rotationOffset);
            this.attachments.push({
                mesh: mesh,
                target: target,
                localPos: positionOffset,
                localRot: qOffset,
                lookAt: lookAtTarget
            });
        };

        if (meshOrPromise instanceof Promise) {
            meshOrPromise.then((mesh) => { if (mesh) register(mesh); });
        } else if (meshOrPromise) {
            register(meshOrPromise);
        }
    }

    /**
     * Updates positions of all attached UI elements.
     * Call this in your animation loop.
     */
    public update() {
        const targetWorldPos = new THREE.Vector3();
        const targetWorldQuat = new THREE.Quaternion();
        const finalPos = new THREE.Vector3();

        for (const att of this.attachments) {
            // 1. Calculate World Position (Standard Soft Attach)
            att.target.getWorldPosition(targetWorldPos);
            att.target.getWorldQuaternion(targetWorldQuat);

            finalPos.copy(att.localPos).applyQuaternion(targetWorldQuat);
            att.mesh.position.copy(targetWorldPos).add(finalPos);

            // 2. Handle Rotation: Either LookAt OR Soft Attach Rotation
            if (att.lookAt) {
                // Constraint: Always face the specific target (e.g., Head)
                att.mesh.lookAt(att.lookAt.position);
            } else {
                // Standard: Follow the controller's rotation
                att.mesh.quaternion.copy(targetWorldQuat).multiply(att.localRot);
            }
        }
    }

    //TODO: Organize better chat-related UI functions, where should I refactor them?
    public handlePartialTranscription(mesh: HTMLMesh, text: string) {
        console.log("Entered handle partial transcription")
        if (typeof text !== 'string') return;
        console.log("Passed if not string")

        const container = mesh.userData.element as HTMLElement;
        
        // Retrieve the active line from userData (Persistent storage)
        let activeLine = mesh.userData.activeLine;
        console.log(activeLine)

        // If we don't have an active line, create one AND SAVE IT
        if (!activeLine) {
            activeLine = document.createElement('p');
            activeLine.style.margin = '0 0 5px 0';
            activeLine.style.color = '#A0A0A0'; 
            container.appendChild(activeLine);
            
            // --- FIX: SAVE REFERENCE ---
            mesh.userData.activeLine = activeLine;
        }

        if (text.length > 0) {
            activeLine.textContent = text;
        }

        container.scrollTop = container.scrollHeight;
    }

    public handleFullTranscription(mesh: HTMLMesh, text: string) {
        const container = mesh.userData.element as HTMLElement;
        
        // Retrieve the active line used during partial transcription
        let activeLine = mesh.userData.activeLine;
        
        // Fallback: If no partial line existed, create one now
        if (!activeLine) {
            activeLine = document.createElement('p');
            activeLine.style.margin = '0 0 5px 0';
            container.appendChild(activeLine);
        }

        if (text.length > 0) {
            activeLine.textContent = text;
        }

        activeLine.style.color = '#FFFFFF'; 

        // --- FIX: CLEAR REFERENCE SO NEXT MESSAGE STARTS FRESH ---
        mesh.userData.activeLine = null; 

        container.scrollTop = container.scrollHeight;
    }

    public handleSendMessage(mesh:HTMLMesh){
        if (!mesh || !mesh.userData.element) {
            console.warn("Chat mesh not ready");
            return;
        }

        // Get the last paragraph from the chat window
        const container = mesh.userData.element as HTMLElement;
        const lastParagraph = container.lastElementChild as HTMLElement;
        const rawText = lastParagraph?.textContent || "";
        const cleanedText = rawText.trim();
        
        if (cleanedText.length > 0) {
            console.log(`Sending to Agent: "${cleanedText}"`);
            // Optional: Visual feedback (e.g., change color to green)
            lastParagraph.style.color = '#00ff00'; 
            return cleanedText;
        }

        console.log("Nothing to send (empty or whitespace only).");
        return null;
    }
}

/**
 * Factory function to initialize the UIManager.
 * This is the new API entry point.
 * @param scene The main Three.js scene.
 * @param renderer The WebGLRenderer.
 * @param camera The camera.
 * @param controllerRefs The object containing controller references.
 * @returns The initialized UIManager instance.
 */
export function initUI(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controllerManager: ControllerManager): UIManager {
    // Assuming controllerRefs.controller0 is the primary controller (THREE.Group)
    return new UIManager(scene, renderer, camera, controllerManager);
}

// Example callback attached to menu
export function menuCallback(payload: any){
    console.log(`Action called from menu! ${payload.value}`);
}
