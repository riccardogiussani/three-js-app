// controller.ts (Modified)

import * as THREE from 'three';
import { WebGLRenderer } from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Define the type for the return value for better type safety
interface ControllerRefs {
    controller0: THREE.XRTargetRaySpace;
    rayLine0: THREE.Line;
    controllerGrip0: THREE.XRTargetRaySpace;
    selectionSphere0: THREE.Mesh;

    controller1: THREE.XRTargetRaySpace;
    rayLine1: THREE.Line;
    controllerGrip1: THREE.XRTargetRaySpace;
    selectionSphere1: THREE.Mesh;
}

// Function to set up a single controller
function setupController(index: number, renderer: WebGLRenderer, scene: THREE.Scene, controllerModelFactory: XRControllerModelFactory): { 
    controller: THREE.XRTargetRaySpace, 
    rayLine: THREE.Line,
    controllerGrip: THREE.XRTargetRaySpace,
    selectionSphere: THREE.Mesh
} {
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

    // A small sphere used for intersection checks
    const sphereGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    // Red, wireframe material for visibility
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff /*, wireframe: true*/ }); 
    const selectionSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    // Position it slightly forward from the grip origin
    selectionSphere.position.set(0, 0, -0.03); 
    
    // Add the sphere to the GRIP, so it moves with the hand model
    controller.add(selectionSphere);

    return { controller, rayLine, controllerGrip, selectionSphere };
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
    const { 
        controller: controller0, 
        rayLine: rayLine0, 
        controllerGrip: controllerGrip0, 
        selectionSphere: selectionSphere0 
    } = setupController(0, renderer, scene, controllerModelFactory);

    // Setup Controller 1
    const { 
        controller: controller1, 
        rayLine: rayLine1, 
        controllerGrip: controllerGrip1, 
        selectionSphere: selectionSphere1 
    } = setupController(1, renderer, scene, controllerModelFactory);
    
    return { 
        controller0, rayLine0, controllerGrip0, selectionSphere0,
        controller1, rayLine1, controllerGrip1, selectionSphere1
    };
}