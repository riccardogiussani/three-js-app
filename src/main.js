// main.js - Using ES Modules
// This is possible because a bundler (like Vite or Webpack) 
// will handle this 'import' process.
import * as THREE from 'three'; 

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

// Position the camera so it can see the cube
camera.position.z = 5;

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
