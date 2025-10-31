// main.ts (Modified)

import * as THREE from 'three'; 
import { createControllers } from './controller.ts';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
let selectedObject: THREE.Mesh | null = null;

/**
 * The object currently "grabbed" by the 'squeeze' (grip) button.
 * This object is attached to the controller.
 */
let grabbedObject: THREE.Mesh | null = null;


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

// Bounding box for calculations
const sphereBoundingBox = new THREE.Box3();
const meshBoundingBox = new THREE.Box3();

/**
 * Checks if the selectionSphere is intersecting with any grabbable mesh.
 * @param sphere The controller's selection sphere.
 * @param meshes A list of meshes to test against.
 * @returns The first intersecting mesh, or null.
 */
function checkIntersection(sphere: THREE.Mesh, meshes: THREE.Mesh[]): THREE.Mesh | null {
    // IMPORTANT: Update the world matrix of the sphere
    sphere.updateWorldMatrix(true, false);
    // Get the sphere's world-space bounding box
    sphereBoundingBox.setFromObject(sphere);

    for (const mesh of meshes) {
        // IMPORTANT: Update the world matrix of the mesh
        mesh.updateWorldMatrix(true, false);
        // Get the mesh's world-space bounding box
        meshBoundingBox.setFromObject(mesh);

        // Check for intersection
        if (sphereBoundingBox.intersectsBox(meshBoundingBox)) {
            return mesh;
        }
    }
    return null;
}


/**
 * Fired on 'select' (trigger) press.
 * Selects an object if the sphere is intersecting.
 */
function onSelectStart0(event: THREE.Event) {
    // Check for intersections
    const intersectingMesh = checkIntersection(selectionSphere0, grabbableMeshes);
    
    if (intersectingMesh) {
        // Object is found! Store it as 'selectedObject'
        selectedObject = intersectingMesh;
        
        // Visual feedback: Make the selection sphere green
        (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00); 
        console.log("Object selected:", selectedObject.name);
    } else {
        // No object found, clear selection
        selectedObject = null;
        console.log("No object selected.");
    }
}

/**
 * Fired on 'select' (trigger) release.
 * Resets the selection sphere color.
 */
function onSelectEnd0(event: THREE.Event) {
    // Reset sphere color to red
    (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    
    // Note: 'selectedObject' is kept, as per your logic, 
    // until 'grab' is pressed.
}

/**
 * Fired on 'squeeze' (grip) press.
 * Grabs the 'selectedObject' if one exists.
 */
function onSqueezeStart0(event: THREE.Event) {
    // Check if we have an object selected AND we aren't already holding something
    if (selectedObject && !grabbedObject) {
        console.log("Grabbing object:", selectedObject.name);
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
        console.log(gltf.scene);
        console.log(scene.getObjectByName('v12_engine_assembly_1001'));
        gltf.scene.traverse((child) => { 
            // We only want to interact with Meshes
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
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