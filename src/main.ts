// main.js - Using ES Modules
// This is possible because a bundler (like Vite or Webpack) 
// will handle this 'import' process.
import * as THREE from 'three'; 

// Import GLTFLoader from three-stdlib (or three/examples/jsm/loaders/GLTFLoader)
// For simplicity and common practice, we'll use the standard import path here which works well with Vite.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
//import { USDZLoader } from 'three/addons/loaders/USDZLoader.js';


// 1. Setup the Scene, Camera, and Renderer
const scene = new THREE.Scene();

// Camera (PerspectiveCamera: field of view, aspect ratio, near, far clipping plane)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
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
    loadedModel.scale.set(1, 1, 1);
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

// 3. Create the Animate/Render Loop
function animate() {
    requestAnimationFrame(animate);

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
animate();
