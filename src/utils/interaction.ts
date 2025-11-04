import * as THREE from 'three';
import { setHighlight } from './visual';

// Bounding boxes used for intersection calculations
const meshBoundingBox = new THREE.Box3();
const worldSelectionSphere = new THREE.Sphere();

// Global Raycaster Instance
const raycaster = new THREE.Raycaster();
// Array of initial ray directions (X+, X-, Y+, Y-, Z+, Z-)
// These are unit vectors used to define the starting directions for the six rays.
const rayDirections = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
];

export class InteractionManager {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private controllerGrip0: THREE.XRTargetRaySpace;
    /**
     * A list of all meshes in the scene that can be interacted with.
     * This will be populated by the GLTFLoader.
     */
    private grabbableMeshes: THREE.Mesh[];
    /**
     * The object currently "selected" by the 'select' (trigger) button.
     * It is not yet grabbed.
     */
    private selectedObject: THREE.Object3D | null;
    /**
     * The object currently "grabbed" by the 'squeeze' (grip) button.
     * This object is attached to the controller.
     */
    private grabbedObject: THREE.Object3D | null;
    

    /**
     * @param scene The main Three.js scene.
     * @param renderer The WebGLRenderer.
     * @param camera The camera.
     * @param controller0 The primary VR controller (for interaction listening).
     */
constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controllerGrip0: THREE.XRTargetRaySpace) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.controllerGrip0 = controllerGrip0;
        this.grabbableMeshes = [];
        this.selectedObject = null;
        this.grabbedObject = null;
    }

    public select(obj: THREE.Object3D){
        if(this.selectedObject)
            this.deselect();
        this.selectedObject = obj;
        setHighlight(this.selectedObject, true);
        console.log("Object selected:", this.selectedObject.name || "Unnamed Object", "Type:", this.selectedObject instanceof THREE.Mesh ? "Mesh" : "Group/Parent");
    }

    public deselect(){
        if(this.selectedObject){
            setHighlight(this.selectedObject, false);
            console.log(`Deselected object ${this.selectedObject.name}`);
            this.selectedObject = null;
        }
    }

    public trySelect(selectionSphere:THREE.Mesh){
        // Check for intersections using the imported helper
        const intersectingMesh = this.checkIntersection(selectionSphere);
        
        if (!intersectingMesh) {
            this.deselect();
        }else{
            let root:THREE.Object3D = this.findModelRoot(intersectingMesh);
            if (!this.selectedObject){
                this.select(root);
                return;
            }else{
                let currentAncestor: THREE.Object3D | null = intersectingMesh;
                while(currentAncestor && currentAncestor.parent) {
                    if(currentAncestor === this.selectedObject){
                        return;
                    }
                    if (currentAncestor.parent === this.selectedObject) {
                        this.select(currentAncestor);
                        return;
                    }
                    currentAncestor = currentAncestor.parent;
                }
                let nextObject: THREE.Object3D;
                nextObject = this.findModelRoot(intersectingMesh);
                this.select(nextObject);
                return;
            }
        }
    }

    public setGrabbable(mesh:THREE.Mesh){
        this.grabbableMeshes.push(mesh);
        this.storeOriginalState(mesh);
    }

    public grab(obj: THREE.Mesh){
        if(!this.selectedObject)
            return;

        // Set the 'grabbedObject'
        this.grabbedObject = this.selectedObject;

        // Attach the object to the CONTROLLER GRIP
        // This makes the object move with the controller
        this.controllerGrip0.attach(this.grabbedObject);
        console.log("Grabbed object:", this.grabbedObject.name);
    }

    public release(){
        // Check if we are currently holding an object
        if (this.grabbedObject) {

            // Attach the object back to the main SCENE
            // This makes it independent of the controller again
            this.scene.attach(this.grabbedObject);

            const reattached = this.checkAndReattach(this.grabbedObject, 0.05); //TODO: First check reattach, then IN CASE re-attach to scene
    
            if(reattached){
                this.deselect();
                //setHighlight(this.grabbedObject, false);
                //thisselectedObject = null;
            }
            
            console.log("Released object:", this.grabbedObject.name);
            // Clear the grabbed and selected states
            this.grabbedObject = null;
        }
    }

    public tryGrab(sphere: THREE.Mesh){
        // Check if we have an object selected AND we aren't already holding something
        if (this.selectedObject && !this.grabbedObject) {
            // Gather all mesh descendants of the selected object for intersection check
            let meshesToCheck: THREE.Mesh[] = [];
            this.selectedObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    meshesToCheck.push(child);
                }
            });
            // Perform the intersection check on only the meshes belonging to the selected object
            const intersectingMesh = this.checkIntersection(sphere, meshesToCheck);
    
            if (intersectingMesh) {
                this.grab(intersectingMesh);
            } else {
                console.log("Squeeze attempted, but selection sphere is not intersecting the selected object.");
            }
        }
    }

    /*--- PRIVATE METHODS ---*/

    /**
    * Helper function to find the root of the GLTF model
    **/
    findModelRoot(mesh: THREE.Object3D): THREE.Object3D {
        let root: THREE.Object3D = mesh;
        while (root.parent && root.parent !== this.scene) {
            root = root.parent;
        }
        return root;
    }

    /**
     * Checks for intersection by casting 6 rays from the sphere center and validating the hit
     * against the mesh's Bounding Box (AABB).
     * * @param selectionSphere The controller's selection sphere.
     * @param meshes A list of meshes to test against.
     * @returns The closest intersecting mesh that also passes the AABB check, or null.
     */
    checkIntersection(sphere: THREE.Mesh, meshes: THREE.Mesh[]=this.grabbableMeshes): THREE.Mesh | null {
        // Get the world position of the sphere center (our ray origin)
        sphere.updateWorldMatrix(true, false);
        const sphereOrigin = new THREE.Vector3();
        sphere.getWorldPosition(sphereOrigin);

        // Get the radius of the sphere (FIXED: accessing sphere.radius is invalid)
        const sphereRadius = sphere.userData.radius; //getSphereRadius(sphere);
        worldSelectionSphere.set(sphereOrigin, sphereRadius);

        let closestHit: THREE.Intersection | null = null;
        let closestMesh: THREE.Mesh | null = null;
        let minDistance = Infinity;
        
        // We want to return the mesh that is both AABB intersecting AND has the closest ray hit.
        
        // Iterate through all grabbable meshes to find candidates
        for (const mesh of meshes) {
            mesh.updateWorldMatrix(true, false);
            
            // Does the sphere's center fall within the mesh's bounding box?
            meshBoundingBox.setFromObject(mesh);
            
            if (meshBoundingBox.intersectsSphere(worldSelectionSphere)) {
                // This mesh is a candidate. Now, cast rays to find the closest point of entry/exit.
                
                // 3. Raycast in 6 directions from the sphere center
                for (const directionVector of rayDirections) {
                    // Set raycaster origin and direction
                    raycaster.set(sphereOrigin, directionVector);
                    
                    // Only check the current candidate mesh, not all meshes
                    const intersects = raycaster.intersectObject(mesh, false);

                    if (intersects.length > 0) {
                        if (intersects.length % 2 !== 0) { // If number of hits is odd (starting inside)
                            const hit = intersects[0];
                            // Find the closest raycast hit distance among all rays for this mesh
                            if (hit.distance < minDistance) {
                                minDistance = hit.distance;
                                closestHit = hit;
                                closestMesh = mesh;
                            }
                        } else { // If number of hits is even (starting outside)
                            const hit = intersects[0];
                            if (hit.distance < minDistance && hit.distance < sphereRadius) {
                                minDistance = hit.distance;
                                closestHit = hit;
                                closestMesh = mesh;
                            }
                        }
                    }
                }
            }
        }

        // Return the closest mesh found that passed the AABB check
        return closestMesh;
    }

    /**
     * Salva il parent originale, la posizione locale e **la rotazione locale** di un oggetto.
     * Questa funzione dovrebbe essere chiamata una sola volta al momento del caricamento del modello.
     * @param object L'oggetto da cui salvare lo stato (Mesh o Gruppo).
     */
    storeOriginalState(object: THREE.Object3D) {
        if (object.parent) {
            // Salva il parent (che sarà la scena o un gruppo)
            object.userData.originalParent = object.parent;
            // Salva la posizione locale attuale
            object.userData.originalLocalPosition = object.position.clone();
            // === NUOVO: Salva la rotazione locale attuale (Quaternion) ===
            object.userData.originalLocalRotation = object.quaternion.clone();
        } else {
            // Se non ha un parent (es. è la scena stessa o la radice assoluta), non salvare
            console.warn(`Object ${object.name} has no parent. Unable to store initial state.`);
        }
    }

    /**
     * Controlla se l'oggetto è stato posizionato entro la tolleranza e lo ri-attacca
     * al suo parent originale nella sua posizione locale e **rotazione locale** originale.
     * @param object L'oggetto rilasciato (normalmente il 'grabbedObject').
     * @param scene La THREE.Scene, necessaria perché l'oggetto viene ri-attaccato a essa se non soddisfa la condizione.
     * @param tolerance Il raggio di tolleranza per il ri-attacco (es. 0.01 per 1cm).
     * @returns True se l'oggetto è stato ri-attaccato, False altrimenti.
     */
    checkAndReattach(object: THREE.Object3D, tolerance: number = 0.01): boolean {
        const originalParent = object.userData.originalParent as THREE.Object3D | undefined;
        const originalLocalPosition = object.userData.originalLocalPosition as THREE.Vector3 | undefined;
        const originalLocalRotation = object.userData.originalLocalRotation as THREE.Quaternion | undefined;

        // Se non abbiamo i dati originali, non possiamo ri-attaccare.
        if (!originalParent || !originalLocalPosition || !originalLocalRotation) {
            return false;
        }
        
        // 1. Calcola la posizione 'Target' (posizione mondiale che l'oggetto dovrebbe avere)
        const targetParentMatrix = originalParent.matrixWorld.clone();
        const targetWorldPosition = originalLocalPosition.clone().applyMatrix4(targetParentMatrix);

        // 2. Calcola la posizione 'Current' (posizione mondiale attuale dell'oggetto)
        object.updateWorldMatrix(true, false);
        const currentWorldPosition = new THREE.Vector3();
        object.getWorldPosition(currentWorldPosition);

        // 3. Verifica la distanza tra le due posizioni mondiali
        // === CORREZIONE PER L'ERRORE DI TIPO ===
        // Calcola la distanza al quadrato manualmente per evitare la chiamata a 'distanceToSq'
        const dx = currentWorldPosition.x - targetWorldPosition.x;
        const dy = currentWorldPosition.y - targetWorldPosition.y;
        const dz = currentWorldPosition.z - targetWorldPosition.z;
        const distanceSq = dx * dx + dy * dy + dz * dz;

        const toleranceSq = tolerance * tolerance;

        if (distanceSq <= toleranceSq) {
            // La condizione è soddisfatta: ri-attacca l'oggetto!
            
            // Prima, rimuoviamo l'oggetto dalla SCENA (dove è stato rilasciato)
            this.scene.remove(object); 
            
            // Ora, ri-attacchiamolo al parent originale
            originalParent.add(object);
            
            // Imposta la posizione locale alla posizione originale salvata
            object.position.copy(originalLocalPosition);
            
            // Ripristina la rotazione locale salvata
            object.quaternion.copy(originalLocalRotation);
            
            console.log(`Ri-attaccato ${object.name} al parent originale: ${originalParent.name}. Distanza²: ${distanceSq.toFixed(5)}`);
            return true;
        }
        
        // Non ri-attaccato: rimarrà attaccato alla SCENA
        return false;
    }
}

/**
 * Factory function to initialize the InteractionManager.
 * This is the new API entry point.
 * @param scene The main Three.js scene.
 * @param renderer The WebGLRenderer.
 * @param camera The camera.
 * @returns The initialized InteractionManager instance.
 */
export function initInteraction(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controllerRefs: any): InteractionManager {
    // Assuming controllerRefs.controller0 is the primary controller (THREE.Group)
    return new InteractionManager(scene, renderer, camera, controllerRefs);
}