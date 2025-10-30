// main.js - Using ES Modules
// This is possible because a bundler (like Vite or Webpack) 
// will handle this 'import' process.
import * as THREE from 'three'; 

import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Import GLTFLoader from three-stdlib (or three/examples/jsm/loaders/GLTFLoader)
// For simplicity and common practice, we'll use the standard import path here which works well with Vite.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. Setup the Scene, Camera, and Renderer
const scene = new THREE.Scene();

// Camera (PerspectiveCamera: field of view, aspect ratio, near, far clipping plane)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

/*
// 2. Add an Object to the Scene (e.g., a simple cube)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
*/
// Add lighting (important for models!)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Position the camera so it can see the cube
camera.position.z = 5;

const controllerLoader = new GLTFLoader();
const controllerModelFactory = new XRControllerModelFactory(controllerLoader);

/*
 Definition of controller 0
 - Controller 0 (corresponds to targetRaySpace)
 - Controller Grip 0 (corresponds to gripSpace)
*/
const controller0 = renderer.xr.getController(0);
scene.add(controller0);
const controllerGrip0 = renderer.xr.getControllerGrip(0);
const model0 = controllerModelFactory.createControllerModel(controllerGrip0);
controllerGrip0.add(model0); 
scene.add(controllerGrip0);

// Helpers to construct rayLine object
const rayGeometry0 = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),      
    new THREE.Vector3(0, 0, -1)     
]);
const rayMaterial0 = new THREE.LineBasicMaterial({ color: 0xffffff });

const rayLine0 = new THREE.Line(rayGeometry0, rayMaterial0);
rayLine0.scale.z = 20; // Make it a long ray
controller0.add(rayLine0);

controller0.addEventListener('selectstart', onSelectStart0);
controller0.addEventListener('selectend', onSelectEnd0);
controller0.addEventListener('squeezestart', onSqueezeStart0);
controller0.addEventListener('squeezeend', onSqueezeEnd0);

function onSelectStart0(event: THREE.Event) {
    console.log(`Controller 0 (Target Ray) - Select Button Pressed! ${event}`);
    // Example: Make the ray line red on press
    rayLine0.material.color.setHex(0xff0000); 
}

function onSelectEnd0(event: THREE.Event) {
    console.log(`Controller 0 (Target Ray) - Select Button Released! ${event}`);
    // Example: Revert the ray line color
    rayLine0.material.color.setHex(0xffffff);
}

function onSqueezeStart0(event: THREE.Event) {
    console.log(`Controller 0 (Target Ray) - Squeeze/Grip Button Pressed! ${event}`);
    // Add logic for grabbing or other actions
    //cube.material.color.setHex(0x0000ff); // Change cube color on grip
}

function onSqueezeEnd0(event: THREE.Event) {
    console.log(`Controller 0 (Target Ray) - Squeeze/Grip Button Released! ${event}`);
    //cube.material.color.setHex(0x00ff00); // Revert cube color
}

/*
 Definition of controller 1
 - Controller 1 (corresponds to targetRaySpace)
 - Controller Grip 1 (corresponds to gripSpace)
*/
const controller1 = renderer.xr.getController(1);
scene.add(controller1); 
const controllerGrip1 = renderer.xr.getControllerGrip(1);
const model1 = controllerModelFactory.createControllerModel(controllerGrip1);
controllerGrip1.add(model1);
scene.add(controllerGrip1);

// Helpers to construct rayLine object
const rayGeometry1 = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),      
    new THREE.Vector3(0, 0, -1)     
]);
const rayMaterial1 = new THREE.LineBasicMaterial({ color: 0xffffff });

const rayLine1 = new THREE.Line(rayGeometry1, rayMaterial1);
rayLine1.scale.z = 20; // Make it a long ray
controller1.add(rayLine1);

// Variable to hold the loaded model
//let loadedModel: THREE.Group | null = null;

const loader = new GLTFLoader();
const modelPath = './models/warehouse.glb'; 

let meshes;

// Load a glTF resource
loader.load(
	// resource URL
	modelPath,
	// called when the resource is loaded
	function ( gltf ) {

		scene.add( gltf.scene );

		//console.log(gltf.animations); // Array<THREE.AnimationClip>
		//console.log(gltf.scene); // THREE.Group
		//console.log(gltf.scenes); // Array<THREE.Group>
		//console.log(gltf.cameras); // Array<THREE.Camera>
		//console.log(gltf.asset); // Object

        meshes = scene.getObjectsByProperty('isMesh', true);
        console.log('Meshes: ');
        console.log(meshes);
	},
	// called while loading is progressing
	function ( xhr ) {

		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

	},
	// called when loading has errors
	function ( error ) {

		console.log( 'An error happened' );

	}
);

/*
 Called by index.html when the 'Start VR' button is clicked.
 It initiates the WebXR immersive-vr session.
 @param session The XRSession object received from navigator.xr.requestSession.
*/
export async function startVRSession(session: XRSession): Promise<void> {
    console.log("Starting VR Session...");
    // 1. Inform the Three.js XR manager about the new session
    await renderer.xr.setSession(session);
    // 2. Set background color to black for VR mode
    renderer.setClearColor(0x000000);
}

/*
 Called by index.html when the XRSession 'end' event is fired.
 It handles cleanup specific to exiting the XR experience.
*/
export function endVRSession(): void {
    console.log("Ending VR Session cleanup...");
    // Revert background color for inline mode
    renderer.setClearColor(0x000000); // Reverting to black, or any default background color
}

// 3. Create the Animate/Render Loop
//function animate() {
    //requestAnimationFrame(animate);
function animate(time?: number) { // time is automatically passed in when using setAnimationLoop
    // Animation logic
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;

    // Render the scene from the camera's perspective
    renderer.render(scene, camera);
}

// 4. Handle window resizing (makes the scene responsive)
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop
//animate();
renderer.setAnimationLoop(animate);