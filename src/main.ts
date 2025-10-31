// main.ts (Refactored)

import * as THREE from 'three'; 
import { createControllers } from './controller.ts';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
    checkIntersection, 
    setHighlight, 
    iterativeSelectParent
} from './utils.ts';

// 1. Setup the Scene, Camera, and Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

camera.position.z = 5;

/**
 * A list of all meshes in the scene that can be interacted with.
 * This will be populated by the GLTFLoader.
 */
const grabbableMeshes: THREE.Mesh[] = [];

/**
 * The object currently "selected" by the 'select' (trigger) button.
 * It is not yet grabbed.
 */
let selectedObject: THREE.Object3D | null = null; // Changed type to Object3D to handle parent groups

/**
 * The object currently "grabbed" by the 'squeeze' (grip) button.
 * This object is attached to the controller.
 */
let grabbedObject: THREE.Object3D | null = null; // Changed type to Object3D


// Get all controller references, including the new grips and spheres
const controllerRefs = createControllers(renderer, scene);
const { 
    controller0, 
    rayLine0, 
    controllerGrip0, 
    selectionSphere0,
    // You can use these for the second controller
    // controller1, rayLine1, controllerGrip1, selectionSphere1
} = controllerRefs;

// --- Register Event Listeners for Controller 0 ---
controller0.addEventListener('selectstart', onSelectStart0);
controller0.addEventListener('selectend', onSelectEnd0);
controller0.addEventListener('squeezestart', onSqueezeStart0);
controller0.addEventListener('squeezeend', onSqueezeEnd0);

// Bounding box constants and highlightMaterial are now in utils.ts

/**
 * Fired on 'select' (trigger) press.
 * Selects an object if the sphere is intersecting, implementing iterative selection.
 */
function onSelectStart0(event: THREE.Event) {
    // Check for intersections using the imported helper
    const intersectingMesh = checkIntersection(selectionSphere0, grabbableMeshes);
    
    // Clear previous highlight using the imported helper
    setHighlight(selectedObject, false);

    if (intersectingMesh) {
        let nextObject: THREE.Object3D;
        
        // --- Logic to reset selection if pointing at a new object/model ---
        let pointingAtNewObject = true;
        
        // Check if the currently selected object is an ancestor of the new intersecting mesh
        if (selectedObject) {
            let currentAncestor: THREE.Object3D | null = intersectingMesh;
            while(currentAncestor) {
                if (currentAncestor === selectedObject) {
                    pointingAtNewObject = false;
                    break;
                }
                currentAncestor = currentAncestor.parent;
                // Stop traversing when we hit the scene
                if (currentAncestor === scene) break; 
            }
        }

        // If we are pointing at a completely new object (not a child of the current selection), reset
        if (selectedObject && pointingAtNewObject) {
             selectedObject = null;
        }

        // Object is found! Determine the next object in the selection cycle using the imported helper.
        // NOTE: selectedObject and scene are passed to the helper function.
        nextObject = iterativeSelectParent(intersectingMesh, selectedObject, scene);
        
        // Update selection state
        selectedObject = nextObject;
        
        // Apply highlight to the newly selected object using the imported helper
        setHighlight(selectedObject, true);

        // Visual feedback: Make the selection sphere green
        (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00); 
        // Use instanceof check here for accurate logging
        console.log("Object selected:", selectedObject.name || "Unnamed Object", "Type:", selectedObject instanceof THREE.Mesh ? "Mesh" : "Group/Parent");
    } else {
        // No object found, clear selection and reset sphere color
        selectedObject = null;
        (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0xffffff); // Reset to default color
        console.log("No object selected.");
    }
}

/**
 * Fired on 'select' (trigger) release.
 * Resets the selection sphere color.
 */
function onSelectEnd0(event: THREE.Event) {
    // Reset sphere color to white (default)
    (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
}

/**
 * Fired on 'squeeze' (grip) press.
 * Grabs the 'selectedObject' if one exists.
 */
function onSqueezeStart0(event: THREE.Event) {
    // Check if we have an object selected AND we aren't already holding something
    if (selectedObject && !grabbedObject) {
        console.log("Grabbing object:", selectedObject.name);
        
        // Clear highlight before grabbing
        setHighlight(selectedObject, false);
        
        // Set the 'grabbedObject'
        grabbedObject = selectedObject;

        // Attach the object to the CONTROLLER GRIP
        // This makes the object move with the controller
        controllerGrip0.attach(grabbedObject);
    }
}

/**
 * Fired on 'squeeze' (grip) release.
 * Releases the 'grabbedObject'.
 */
function onSqueezeEnd0(event: THREE.Event) {
    // Check if we are currently holding an object
    if (grabbedObject) {
        console.log("Releasing object:", grabbedObject.name);
        
        // Attach the object back to the main SCENE
        // This makes it independent of the controller again
        scene.attach(grabbedObject);

        // Clear the grabbed and selected states
        grabbedObject = null;
        selectedObject = null;
    }
}


// --- GLTF MODEL LOADING ---
const loader = new GLTFLoader();

const environmentPath = './models/environment.glb';
loader.load(
	environmentPath,
	function ( gltf ) {
		scene.add( gltf.scene );
	},
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) {
		console.log( 'An error happened', error );
	}
);

const modelPath = './models/v12.glb'; 

loader.load(
	modelPath,
	function ( gltf ) {
		scene.add( gltf.scene );

        gltf.scene.traverse((child) => {
            // We only want to interact with Meshes
            if (child instanceof THREE.Mesh) {
                const mesh = child;
                grabbableMeshes.push(mesh);
                console.log('Found grabbable mesh:', mesh.name);
            }
        });
	},
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) {
		console.log( 'An error happened', error );
	}
);

/*
 Called by index.html when the 'Start VR' button is clicked.
*/
export async function startVRSession(session: XRSession): Promise<void> {
    console.log("Starting VR Session...");
    await renderer.xr.setSession(session);
    renderer.setClearColor(0x000000);
}

/*
 Called by index.html when the XRSession 'end' event is fired.
*/
export function endVRSession(): void {
    console.log("Ending VR Session cleanup...");
    renderer.setClearColor(0x000000);
}

// 3. Create the Animate/Render Loop
function animate(time?: number) {
    // Render the scene
    renderer.render(scene, camera);
}

// 4. Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop
renderer.setAnimationLoop(animate);