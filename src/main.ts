// main.js - Using ES Modules
// This is possible because a bundler (like Vite or Webpack) 
// will handle this 'import' process.
import * as THREE from 'three'; 

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

// 2. Add an Object to the Scene (e.g., a simple cube)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Add lighting (important for models!)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Position the camera so it can see the cube
camera.position.z = 5;

// Variable to hold the loaded model
let loadedModel: THREE.Group | null = null;

const loader = new GLTFLoader();
const modelPath = './models/warehouse.glb'; 

loader.load(
  modelPath,
  function (gltf) {
    // Successfully loaded the model
    loadedModel = gltf.scene;

    // Scale, position, or rotate the model as needed
    // Example: Make the model a bit smaller and center it
    loadedModel.scale.set(0.01, 0.01, 0.01);
    loadedModel.position.set(0, 0, 0);

    scene.add(loadedModel);
    console.log('Model loaded successfully!');
  },
  // Optional: Function to track loading progress
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  // Optional: Function to handle errors
  function (error) {
    console.error('An error occurred while loading the model', error);
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
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

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