import * as THREE from 'three';
import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';

/**
 * UIManager class to handle the creation and management of HTML-based VR menus (HTMLMesh).
 */
export class UIManager {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private controller0: THREE.XRTargetRaySpace;
    private interactiveGroup: InteractiveGroup;

    /**
     * @param scene The main Three.js scene.
     * @param renderer The WebGLRenderer.
     * @param camera The camera.
     * @param controller0 The primary VR controller (for interaction listening).
     */
constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controller0: THREE.XRTargetRaySpace) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.controller0 = controller0;
        
        // Create a single InteractiveGroup to manage all UI meshes
        this.interactiveGroup = new InteractiveGroup();
        this.interactiveGroup.listenToPointerEvents( this.renderer, this.camera );
        this.interactiveGroup.listenToXRControllerEvents(this.controller0);
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
export function initUI(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controllerRefs: any): UIManager {
    // Assuming controllerRefs.controller0 is the primary controller (THREE.Group)
    return new UIManager(scene, renderer, camera, controllerRefs.controller0);
}