// main.ts

import * as THREE from 'three'; 

import { initUI, UIManager } from './utils/ui.ts';
import { initInteraction, InteractionManager } from './utils/interaction.ts';
import { initEventManager, EventManager } from './utils/events.ts';
import { initLoaderManager, LoaderManager } from './utils/model.ts';
import { initControllers, ControllerManager } from './utils/controller.ts';
import { ButtonEvent } from './utils/controller.ts';

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

let eventManager: EventManager = initEventManager('*');

import { menuCallback } from './utils/ui.ts';
eventManager.registerAction('menu', menuCallback);

const controllerManager:ControllerManager = initControllers(scene, renderer);
const interactionManager:InteractionManager = initInteraction(scene, renderer, camera, controllerManager);
const loaderManager:LoaderManager = initLoaderManager(scene, interactionManager);

controllerManager.rightController.tip.addEventListener('selectstart', onSelectStart);
controllerManager.rightController.tip.addEventListener('selectend', onSelectEnd);
controllerManager.rightController.tip.addEventListener('squeezestart', onSqueezeStart);
controllerManager.rightController.tip.addEventListener('squeezeend', onSqueezeEnd);
controllerManager.rightController.tip.addEventListener('firstpressed' as any, onAPressed);
controllerManager.rightController.tip.addEventListener('firstreleased' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('secondpressed' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('secondreleased' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('thumbstickpressed' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('thumbstickreleased' as any, onGenericButtonPressed);
//controllerManager.rightController.tip.addEventListener('thumbstickmoved' as any, onGenericButtonPressed);

controllerManager.leftController.tip.addEventListener('selectstart', onSelectStart);
controllerManager.leftController.tip.addEventListener('selectend', onSelectEnd);
controllerManager.leftController.tip.addEventListener('squeezestart', onSqueezeStart);
controllerManager.leftController.tip.addEventListener('squeezeend', onSqueezeEnd);
controllerManager.leftController.tip.addEventListener('firstpressed' as any, onXPressed);
controllerManager.leftController.tip.addEventListener('firstreleased' as any, onGenericButtonPressed);
controllerManager.leftController.tip.addEventListener('secondpressed' as any, onGenericButtonPressed);
controllerManager.leftController.tip.addEventListener('secondreleased' as any, onGenericButtonPressed);
controllerManager.leftController.tip.addEventListener('thumbstickpressed' as any, onGenericButtonPressed);
controllerManager.leftController.tip.addEventListener('thumbstickreleased' as any, onGenericButtonPressed);
//controllerManager.rightController.tip.addEventListener('thumbstickmoved' as any, onGenericButtonPressed);


function onSelectStart(event: THREE.Event) {
    const controllerTip = event.target;
    const selectionSphere = (controllerTip as any).selectionSphere;
    // Visual feedback: Make the selection sphere green
    (selectionSphere.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00); 
    interactionManager.trySelect(selectionSphere);    
}
function onSelectEnd(event: THREE.Event) {
    const controllerTip = event.target;
    const selectionSphere = (controllerTip as any).selectionSphere;
    // Reset sphere color to white (default)
    (selectionSphere.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
}
function onSqueezeStart(event: THREE.Event) {
    const controllerTip = event.target; 
    
    interactionManager.tryGrab(controllerTip as THREE.XRTargetRaySpace);
}
function onSqueezeEnd(event: THREE.Event) {
    interactionManager.release();
}
function onAPressed(event: THREE.Event){
    const controllerTip = event.target;
    
    console.log("A button pressed!");
}
function onXPressed(event: THREE.Event){
    const controllerTip = event.target;
    
    console.log("X button pressed!");
}
function onGenericButtonPressed(event:any){
    console.log(event)
}

const environmentPath = './models/environment.glb';
loaderManager.create(environmentPath, false);

const modelPath = './models/v12.glb'; 
loaderManager.create(modelPath);

/*const uiManager: UIManager = initUI(scene, renderer, camera, controllerRefs);
uiManager.create(
    './menus/menu.html',
    new THREE.Vector3(0, 1.5, -1), // Position: center, 1.5m high, 1m in front
    new THREE.Euler(0, 0, 0),      // Rotation: no rotation
    1,                             // Scale: 0.005
    'Main VR Menu'                 // Name
);*/


// Called by index.html when the 'Start VR' button is clicked.
export async function startVRSession(session: XRSession): Promise<void> {
    console.log("Starting VR Session...");
    await renderer.xr.setSession(session);
    renderer.setClearColor(0x000000);
}

// Called by index.html when the XRSession 'end' event is fired.
export function endVRSession(): void {
    console.log("Ending VR Session cleanup...");
    renderer.setClearColor(0x000000);
}

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function animate(time?: number) {
    renderer.render(scene, camera);
    controllerManager.update();
}
renderer.setAnimationLoop(animate);