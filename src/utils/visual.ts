/**
 * visual.ts
 * 
 * This module manages visual effects and post-processing for the three.js scene.
 * It provides functions and classes for highlighting objects and managing visual effects
 * such as outlines and anti-aliasing using EffectComposer and related passes.
 * 
 * The module exports the setHighlight function and the VFXManager class,
 * as well as a singleton getter for the VFXManager instance.
 */

import * as THREE from 'three';

// A distinct material for highlighting selected objects
export const highlightMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff, // Cyan highlight
    transparent: true,
    opacity: 0.7 
});

/**
 * Applies or restores the visual highlight of an object (mesh or parent group) by using
 * the highlightMaterial and storing the original material in the mesh's userData.
 * @param object The Object3D to highlight or unhighlight.
 * @param enable True to apply highlight, false to restore original material.
 */
export function setHighlight(object: THREE.Object3D | null, enable: boolean) {
    if (!object) return;

    // 1. Apply Highlight
    if (enable) {
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mesh = child;
                // Store the original material on the mesh itself if not already stored
                if (!mesh.userData.highlightOriginalMaterial) {
                    mesh.userData.highlightOriginalMaterial = mesh.material;
                }
                // Apply the highlight material
                mesh.material = highlightMaterial;
            }
        });
    }
    
    // 2. Restore/Remove Highlight
    else { // if (!enable)
        object.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.highlightOriginalMaterial) {
                const mesh = child;
                // Restore the original material from userData
                mesh.material = mesh.userData.highlightOriginalMaterial;
                delete mesh.userData.highlightOriginalMaterial; // Clean up
            }
        });
    }
}

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Manages the post-processing pipeline and visual effects like object outlining.
 */
export class VFXManager {
    private composer: EffectComposer | null = null;
    private outlinePass: OutlinePass | null = null;
    private effectFXAA: ShaderPass | null = null;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
    }

    /**
     * Initializes the EffectComposer and necessary passes (Render, Outline, Output, FXAA).
     */
    public initVFX() {
        const width = this.renderer.domElement.width;
        const height = this.renderer.domElement.height;

        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(window.devicePixelRatio);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Initialize OutlinePass
        this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), this.scene, this.camera);
        this.outlinePass.visibleEdgeColor.set('#ffffff'); // White outline
        this.outlinePass.hiddenEdgeColor.set('#190a05'); // Dark hidden edges (optional)
        this.outlinePass.edgeStrength = 3.0;
        this.outlinePass.edgeGlow = 0.0;
        this.outlinePass.edgeThickness = 1.0;
        this.composer.addPass(this.outlinePass);

        // OutputPass for proper color management
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        // FXAA for anti-aliasing
        this.effectFXAA = new ShaderPass(FXAAShader);
        this.effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
        this.composer.addPass(this.effectFXAA);

        console.log("VFXManager initialized with EffectComposer and OutlinePass.");
    }

    /**
     * Renders the scene using the EffectComposer.
     */
    public render() {
        if (this.composer) {
            this.composer.render();
        } else {
            // Fallback if composer isn't initialized, though initVFX should be called first
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Toggles the outline effect for a specific object.
     * @param object The Object3D to outline.
     * @param enable True to enable the outline, false to disable.
     */
    public setOutline(object: THREE.Object3D | null, enable: boolean) {
        if (!this.outlinePass) {
            console.warn('VFXManager not initialized. Call initVFX() first.');
            return;
        }

        if (enable && object) {
            // Set the object as the one to be outlined
            this.outlinePass.selectedObjects = [object];
        } else {
            // Clear the outline
            this.outlinePass.selectedObjects = [];
        }
    }

    /**
     * Handles window resize events to update the Composer and FXAA shader resolution.
     * @param width The new window width.
     * @param height The new window height.
     */
    public onWindowResize(width: number, height: number) {
        if (this.composer && this.effectFXAA) {
            this.composer.setSize(width, height);
            this.effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
        }
    }
}

// Global instance variable (or module export)
let vfxManagerInstance: VFXManager | null = null;

/**
 * Initializes and returns the singleton instance of the VFXManager.
 * @param renderer The WebGLRenderer.
 * @param scene The THREE.Scene.
 * @param camera The THREE.PerspectiveCamera.
 * @returns The VFXManager instance.
 */
export function getVFXManager(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): VFXManager {
    if (!vfxManagerInstance) {
        vfxManagerInstance = new VFXManager(renderer, scene, camera);
        vfxManagerInstance.initVFX(); // Initialize the composer right away
    }
    return vfxManagerInstance;
}
