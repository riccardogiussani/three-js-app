// main.ts (Refactored)

import * as THREE from 'three'; 

import { initUI, UIManager } from './utils/ui.ts';
import { initInteraction, InteractionManager } from './utils/interaction.ts';
import { initEventManager, EventManager } from './utils/events.ts';

import { createControllers } from './controller.ts';

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

const interactionManager:InteractionManager = initInteraction(scene, renderer, camera, controllerGrip0);

// --- Register Event Listeners for Controller 0 ---
controller0.addEventListener('selectstart', onSelectStart0);
controller0.addEventListener('selectend', onSelectEnd0);
controller0.addEventListener('squeezestart', onSqueezeStart0);
controller0.addEventListener('squeezeend', onSqueezeEnd0);

// Bounding box constants and highlightMaterial are now in utils.ts

function onSelectStart0(event: THREE.Event) {
    // Visual feedback: Make the selection sphere green
    (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00); 
    interactionManager.trySelect(selectionSphere0);    
}
function onSelectEnd0(event: THREE.Event) {
    // Reset sphere color to white (default)
    (selectionSphere0.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
}
function onSqueezeStart0(event: THREE.Event) {
    interactionManager.tryGrab(selectionSphere0);
}
function onSqueezeEnd0(event: THREE.Event) {
    interactionManager.release();
}

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/' ); 
const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );

const modelPath = './models/v12.glb'; 
loader.load( 
    modelPath, 
    // Success callback
    function ( gltf ) {
		scene.add( gltf.scene );

        gltf.scene.traverse((child) => {
            // We only want to interact with Meshes
            if (child instanceof THREE.Mesh) {
                const mesh = child;
                interactionManager.setGrabbable(mesh);
                //console.log('Found grabbable mesh:', mesh.name);
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

const uiManager: UIManager = initUI(scene, renderer, camera, controllerRefs);
uiManager.create(
    './menus/menu.html',
    new THREE.Vector3(0, 1.5, -1), // Position: center, 1.5m high, 1m in front
    new THREE.Euler(0, 0, 0),      // Rotation: no rotation
    1,                             // Scale: 0.005
    'Main VR Menu'                 // Name
);

import { menuCallback } from './utils/ui.ts';
let eventManager: EventManager = initEventManager('*');
eventManager.registerAction('menu', menuCallback);

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