
/**
 * main.ts
 * 
 * This is the main entry point of the three.js VR application.
 * It sets up the scene, camera, renderer, lighting, and initializes all managers
 * for UI, interaction, events, controllers, and model loading.
 * 
 * It also configures VR controller event listeners and handles the animation loop.
 * 
 * The module exports functions to start and end the VR session.
 */

import * as THREE from 'three';

import { initUI, UIManager } from './utils/ui.ts';
import { initInteraction, InteractionManager } from './utils/interaction.ts';
import { initEventManager, EventManager } from './utils/events.ts';
import { initLoaderManager, LoaderManager } from './utils/model.ts';
import { initControllers, ControllerManager } from './utils/controller.ts';
//import { ButtonEvent } from './utils/controller.ts';
import { initAgentManager, AgentManager } from './utils/agent.ts';
import { initVoice, VoiceManager } from './utils/voice.ts';

const BFF_URL = 'http://localhost:3000';

// Setup the Scene, Camera, and Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

camera.position.z = 5;


import Stats from 'stats-gl';
const stats = new Stats({ horizontal: false, trackGPU: true });
stats.init(renderer);
document.body.appendChild(stats.dom);


// Add Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Setup scene Managers
const agentManager: AgentManager = initAgentManager(scene, BFF_URL);
const voiceManager: VoiceManager = initVoice(BFF_URL);
const eventManager: EventManager = initEventManager('*'); // * for development purposes, set to ip address for
const controllerManager:ControllerManager = initControllers(scene, renderer);
const interactionManager:InteractionManager = initInteraction(scene, renderer, camera, controllerManager);
const loaderManager:LoaderManager = initLoaderManager(scene, interactionManager);
const uiManager: UIManager = initUI(scene, renderer, camera, controllerManager);

const environmentPath = './models/environment.glb';
loaderManager.create(environmentPath, false);

const modelPath = './models/v12_LOW.glb'; 
loaderManager.create(modelPath);

uiManager.create(
    './menus/menu.html',
    new THREE.Vector3(0, 1.5, -1),
    new THREE.Euler(0, 0, 0),
    1,
    'Main VR Menu'
);

// #endregion

// #region ui events
import { menuCallback } from './utils/ui.ts';
import { Voice } from '@cartesia/cartesia-js/api/index';
eventManager.registerAction('menu', menuCallback);
// #endregion

// #region right controller events
controllerManager.rightController.tip.addEventListener('selectstart', onSelectStart);
controllerManager.rightController.tip.addEventListener('selectend', onSelectEnd);
controllerManager.rightController.tip.addEventListener('squeezestart', onSqueezeStart);
controllerManager.rightController.tip.addEventListener('squeezeend', onSqueezeEnd);
controllerManager.rightController.tip.addEventListener('firstpressed' as any, onAPressed);
controllerManager.rightController.tip.addEventListener('firstreleased' as any, onAReleased);
controllerManager.rightController.tip.addEventListener('secondpressed' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('secondreleased' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('thumbstickpressed' as any, onGenericButtonPressed);
controllerManager.rightController.tip.addEventListener('thumbstickreleased' as any, onGenericButtonPressed);
//controllerManager.rightController.tip.addEventListener('thumbstickmoved' as any, onGenericButtonPressed);
// #endregion

// #region left controller events
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
// #endregion

// #region controllers callbacks
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
    
    console.log("A button pressed - Listening...");
    // Visual feedback (optional): vibrate controller
    //const controller = event.target as any; 
    //if(controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators[0]) {
    //    controller.gamepad.hapticActuators[0].pulse(1.0, 100);
    //}

    voiceManager.startRecording();
}
function onAReleased(event: THREE.Event){
    const controllerTip = event.target;
    
    console.log("A button released!");
    voiceManager.stopRecording();
}
function onXPressed(event: THREE.Event){
    const controllerTip = event.target;
    
    console.log("X button pressed!");
}
function onGenericButtonPressed(event:any){
    console.log(event)
}
// #endregion

// #region misc
// Called by index.html when the 'Start VR' button is clicked.
export async function startVRSession(session: XRSession): Promise<void> {
    console.log("Starting VR Session...");
    await renderer.xr.setSession(session);
    await voiceManager.initVoice();
    renderer.setClearColor(0x000000);
}

// Called by index.html when the XRSession 'end' event is fired.
export function endVRSession(): void {
    console.log("Ending VR Session cleanup...");
    renderer.setClearColor(0x000000);
}

function onWindowResize(){
    if (renderer.xr.isPresenting) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);
// #endregion

function animate(time?: number) {
    renderer.render(scene, camera);
    controllerManager.update();

    stats.update();
}
renderer.setAnimationLoop(animate);
