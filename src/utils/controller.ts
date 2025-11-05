// controller.ts

import * as THREE from 'three';
import { WebGLRenderer } from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface ButtonEvent extends Event {
    type: string;
    data: {
        value: number;
        handedness?: string;
    };
}

export interface AxisEvent extends Event {
    type: string;
    data: {
        value: {
            x: number,
            y: number
        }
    },
    handedness?: string
}

export class ControllerManager {
    private scene: THREE.Scene;
    public leftController:{
        tip : THREE.XRTargetRaySpace;
        grip: THREE.XRTargetRaySpace;
        gamepad?: Gamepad;
    };
    public rightController:{
        tip : THREE.XRTargetRaySpace;
        grip: THREE.XRTargetRaySpace;
        gamepad?: Gamepad;
    };
    private lastButtonStates: Map<XRHandedness, Map<number, boolean>> = new Map<XRHandedness, Map<number, boolean>>();

constructor(scene: THREE.Scene, renderer:THREE.WebGLRenderer) {
        this.scene = scene;

        const controllerModelFactory = new XRControllerModelFactory(new GLTFLoader());

        // left controller
        this.leftController = {
            tip: renderer.xr.getController(1) as THREE.XRTargetRaySpace,
            grip: renderer.xr.getControllerGrip(1) as THREE.XRGripSpace
        };
        (this.leftController.tip as any).handedness = "left";

        // left selection sphere
        const leftSphere = createSelectionSphere();
        this.leftController.tip.add(leftSphere);
        (this.leftController.tip as any).selectionSphere = leftSphere;
        
        // left ray
        const leftRay = createRayLine();
        this.leftController.tip.add(leftRay);
        (this.leftController.tip as any).rayLine = leftRay;

        // left model
        const leftModel = controllerModelFactory.createControllerModel(this.leftController.grip);
        this.leftController.grip.add(leftModel);

        // events
        this.setupControllerListeners(this.leftController);

        // input
        let lastLeftButtonStates = new Map<number, boolean>();
        this.lastButtonStates.set("left", lastLeftButtonStates);
        
        this.scene.add(this.leftController.tip);
        this.scene.add(this.leftController.grip);


        // right controller
        this.rightController = {
            tip: renderer.xr.getController(0) as THREE.XRTargetRaySpace,
            grip: renderer.xr.getControllerGrip(0) as THREE.XRGripSpace
        };
        (this.rightController.tip as any).handedness = "right";

        // right selection sphere
        const rightSphere = createSelectionSphere();
        this.rightController.tip.add(rightSphere);
        (this.rightController.tip as any).selectionSphere = rightSphere;
        
        // right ray
        const rightRay = createRayLine();
        this.rightController.tip.add(rightRay);
        (this.rightController.tip as any).rayLine = rightRay;

        // right model
        const rightModel = controllerModelFactory.createControllerModel(this.rightController.grip);
        this.rightController.grip.add(rightModel);

        // events
        this.setupControllerListeners(this.rightController);

        // input
        let lastRightButtonStates = new Map<number, boolean>();
        this.lastButtonStates.set("right",lastRightButtonStates);

        this.scene.add(this.rightController.tip);
        this.scene.add(this.rightController.grip);
    }

    // Sets up the 'connected' and 'disconnected' event listeners to manage gamepad data.
    private setupControllerListeners(controller: ControllerManager['leftController']): void {
        const tip = controller.tip;

        tip.addEventListener('connected', (event) => {            
            // The Gamepad object is within the event.data (XRInputSource)
            const inputSource = event.data;
            if (inputSource.gamepad) {
                // Assign the actual Gamepad instance to your controller object
                controller.gamepad = inputSource.gamepad;
            }
            console.log(`Controller ${inputSource.handedness} connected.`);
        });

        tip.addEventListener('disconnected', (event) => {
            const inputSource = event.data;
            console.log(`Controller ${inputSource.handedness} disconnected.`);
            // Clear the gamepad reference when disconnected
            controller.gamepad = undefined; 
        });
    }

    public update(): void {
        if(this.leftController.gamepad)
            this.poll(this.leftController);
        if(this.rightController.gamepad)
            this.poll(this.rightController);
    }

    private poll(controller: ControllerManager['leftController']){
        // define an action map {'buttonA': index, 'buttonB': index}
        // for each entry, check state
        // if state changed, invoke appropriate event ('buttonApressed' or 'buttonBreleased')

        // Iterate over the defined action map (e.g., 'trigger', 'squeeze', 'a', 'b')
        for (const [actionName, index] of Object.entries(ControllerManager.ACTION_MAP)) {
            // Check if the button index exists on the gamepad
            if (controller.gamepad && controller.tip && index < controller.gamepad.buttons.length) {
                const handedness = (controller.tip as any).handedness;
                const currentButton = controller.gamepad.buttons[index];
                const isPressed = currentButton.pressed;
                const wasPressed = this.lastButtonStates.get(handedness)?.get(index) ?? false;

                //console.log(`${currentButton} is ${isPressed}; was ${wasPressed}`);

                // Fire event if state has changed
                if (isPressed !== wasPressed) {
                    const eventName = isPressed 
                        ? `${actionName}pressed` //${controller.handedness} 
                        : `${actionName}released`; //${controller.handedness}
                    
                    // You would typically fire a custom event on the XRTargetRaySpace object
                    // or a global event manager here.
                    // For this example, we'll log the event.
                    
                    const event = { type: eventName, data: { value: currentButton.value, } };
                    controller.tip.dispatchEvent(event as any); 
                    
                    //console.log(`[${controller.gamepad.id}] Action: ${eventName}, Value: ${currentButton.value.toFixed(2)}`);

                    // Update the last known state
                    this.lastButtonStates.get(handedness)?.set(index, isPressed);
                }
                
                // You can also check for analog stick/trigger *values* here if needed
                // e.g., if (currentButton.value > 0.01 && currentButton.value < 0.99) ...
            }
        }
        
        // Polling for axes (analog stick/trackpad position)
        // Axes are typically at gamepad.axes[0] (x-axis) and gamepad.axes[1] (y-axis)
        if (controller.gamepad && controller.gamepad.axes.length >= 2) {
            const xAxis = controller.gamepad.axes[0];
            const yAxis = controller.gamepad.axes[1];

            // You would fire a custom event (e.g., 'thumbstickmoved') here
            // only if the values have changed significantly since the last frame.
            
            // For example, firing an event if the stick is moved off-center:
            if (Math.abs(xAxis) > 0.1 || Math.abs(yAxis) > 0.1) {
                const eventName = `thumbstickmoved`; //${controller.handedness}
                const event = { 
                    type: eventName, 
                    data: { 
                        x: xAxis, 
                        y: yAxis
                        }
                     };
                controller.tip.dispatchEvent(event as any); 
                console.log(`[${controller.gamepad.id}] Stick: X=${xAxis.toFixed(2)}, Y=${yAxis.toFixed(2)}`);
            }
        }
    }

    private static readonly ACTION_MAP = {
        // Primary button (A on Oculus/Quest, X on Index)
        'trigger': 0, // Trigger is often the first button
        'squeeze': 1, // Grip/Squeeze is often the second button
        'first': 4,       // A/X button on a face
        'second': 5,       // B/Y button on a face
        // Thumbstick/Trackpad press (separate from axes)
        'thumbstick': 3, 
    };
}

export function initControllers(scene:THREE.Scene, renderer:THREE.WebGLRenderer){
    return new ControllerManager(scene, renderer);
}

function createSelectionSphere(sphereRadius=0.01){
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 8);

    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff /*, wireframe: true*/ }); 
    const selectionSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    selectionSphere.userData.radius = sphereRadius;
    
    // Position it slightly forward from the grip origin
    selectionSphere.position.set(0, 0, -0.03); 
    
    return selectionSphere;
};

function createRayLine(length=20){
    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),      
        new THREE.Vector3(0, 0, -1)     
    ]);
    const rayMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    const rayLine = new THREE.Line(rayGeometry, rayMaterial);
    rayLine.scale.z = length;

    return rayLine;
}

