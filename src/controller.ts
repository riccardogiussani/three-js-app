// controller.ts

import * as THREE from 'three';
import { WebGLRenderer } from 'three'; // Import specific types for clarity
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Define the type for the return value for better type safety
interface ControllerRefs {
    controller0: THREE.XRTargetRaySpace;
    rayLine0: THREE.Line;
    controller1: THREE.XRTargetRaySpace;
    rayLine1: THREE.Line;
}

// Function to set up a single controller
function setupController(index: number, renderer: WebGLRenderer, scene: THREE.Scene, controllerModelFactory: XRControllerModelFactory): { controller: THREE.XRTargetRaySpace, rayLine: THREE.Line } {
    const controller:THREE.XRTargetRaySpace = renderer.xr.getController(index);
    scene.add(controller);

    const controllerGrip = renderer.xr.getControllerGrip(index);
    const model = controllerModelFactory.createControllerModel(controllerGrip);
    controllerGrip.add(model); 
    scene.add(controllerGrip);

    // Helpers to construct rayLine object (pointing line)
    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),      
        new THREE.Vector3(0, 0, -1)     
    ]);
    const rayMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    const rayLine = new THREE.Line(rayGeometry, rayMaterial);
    rayLine.scale.z = 20; // Make it a long ray
    controller.add(rayLine);

    // --- Controller Event Handlers (can be defined outside or inside) ---
    /*
    function onSelectStart(event: THREE.Event) {
        console.log(`Controller ${index} - Select Button Pressed!`);
        // Use the captured rayLine for visual feedback
        rayLine.material.color.setHex(0xff0000); 
    }

    function onSelectEnd(event: THREE.Event) {
        console.log(`Controller ${index} - Select Button Released!`);
        rayLine.material.color.setHex(0xffffff);
    }
    
    function onSqueezeStart(event: THREE.Event) {
        console.log(`Controller ${index} - Squeeze/Grip Button Pressed!`);
        // Add game logic here, e.g., grabbing objects
    }
    
    function onSqueezeEnd(event: THREE.Event) {
        console.log(`Controller ${index} - Squeeze/Grip Button Released!`);
    }
    */
    /*
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    controller.addEventListener('squeezestart', onSqueezeStart);
    controller.addEventListener('squeezeend', onSqueezeEnd);
    */
    return { controller, rayLine };
}

/**
 * Sets up all WebXR controllers (0 and 1) for the scene.
 * @param renderer The WebGLRenderer instance with XR enabled.
 * @param scene The THREE.Scene to add the controllers to.
 * @returns An object containing references to the created controller Groups and Ray Lines.
 */
export function createControllers(renderer: WebGLRenderer, scene: THREE.Scene): ControllerRefs {
    const controllerLoader = new GLTFLoader();
    const controllerModelFactory = new XRControllerModelFactory(controllerLoader);

    // Setup Controller 0
    const { controller: controller0, rayLine: rayLine0 } = setupController(0, renderer, scene, controllerModelFactory);

    // Setup Controller 1
    const { controller: controller1, rayLine: rayLine1 } = setupController(1, renderer, scene, controllerModelFactory);
    
    // Note: If you want controller 1 to have different handlers, 
    // you would either pass them in, or define a more advanced class/config.

    return { controller0, rayLine0, controller1, rayLine1 };
}