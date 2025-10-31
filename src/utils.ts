import * as THREE from 'three';

// Bounding boxes used for intersection calculations
const meshBoundingBox = new THREE.Box3();

// A distinct material for highlighting selected objects
export const highlightMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff, // Cyan highlight
    transparent: true,
    opacity: 0.7 
});

// Global Raycaster Instance
const raycaster = new THREE.Raycaster();
// Array of initial ray directions (X+, X-, Y+, Y-, Z+, Z-)
// These are unit vectors used to define the starting directions for the six rays.
const rayDirections = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
];
/**
 * Checks for intersection by casting 6 rays from the sphere center and validating the hit
 * against the mesh's Bounding Box (AABB).
 * * @param selectionSphere The controller's selection sphere.
 * @param meshes A list of meshes to test against.
 * @returns The closest intersecting mesh that also passes the AABB check, or null.
 */
export function checkIntersection(sphere: THREE.Mesh, meshes: THREE.Mesh[]): THREE.Mesh | null {
    // 1. Get the world position of the sphere center (our ray origin)
    sphere.updateWorldMatrix(true, false);
    const sphereOrigin = new THREE.Vector3();
    sphere.getWorldPosition(sphereOrigin);

    let closestHit: THREE.Intersection | null = null;
    let closestMesh: THREE.Mesh | null = null;
    let minDistance = Infinity;
    
    // We want to return the mesh that is both AABB intersecting AND has the closest ray hit.
    
    // 2. Iterate through all grabbable meshes to find candidates
    for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, false);
        
        // --- AABB Check ---
        // Does the sphere's center fall within the mesh's AABB?
        meshBoundingBox.setFromObject(mesh);
        
        if (meshBoundingBox.containsPoint(sphereOrigin)) {
            // AABB Check Passed: This mesh is a candidate. Now, cast rays to find the closest point of entry/exit.
            
            // 3. Raycast in 6 directions from the sphere center
            for (const directionVector of rayDirections) {
                // Set raycaster origin and direction
                raycaster.set(sphereOrigin, directionVector);
                
                // Only check the current candidate mesh, not all meshes
                const intersects = raycaster.intersectObject(mesh, false);

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    // 4. Find the closest raycast hit distance among all rays for this mesh
                    if (hit.distance < minDistance) {
                        minDistance = hit.distance;
                        closestHit = hit;
                        closestMesh = mesh;
                    }
                }
            }
        }
    }

    // Return the closest mesh found that passed the AABB check
    return closestMesh;
}

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

/**
 * Implements the iterative parent selection logic, cycling from Root -> Child -> Mesh.
 * @param intersectedMesh The mesh hit by the controller sphere.
 * @param selectedObject The currently selected object state (to determine the next step in the hierarchy).
 * @param scene The THREE.Scene object (needed to determine the root parent).
 * @returns The next object to be selected.
 */
export function iterativeSelectParent(
    intersectedMesh: THREE.Mesh, 
    selectedObject: THREE.Object3D | null,
    scene: THREE.Scene
): THREE.Object3D {
    // Helper function to find the root of the GLTF model
    function findModelRoot(mesh: THREE.Object3D): THREE.Object3D {
        let root: THREE.Object3D = mesh;
        while (root.parent && root.parent !== scene) {
            root = root.parent;
        }
        return root;
    }

    // 1. If nothing is selected, select the entire model (the root).
    if (!selectedObject) {
        return findModelRoot(intersectedMesh);
    }
    
    // 2. If the current selected object is the intersected mesh, cycle back to the root.
    if (selectedObject === intersectedMesh) {
        return findModelRoot(intersectedMesh);
    }

    // 3. Otherwise, we move one level deeper (downstream) towards the intersected mesh.
    
    // Find the path from the root to the intersected mesh
    let current: THREE.Object3D = intersectedMesh;
    const path: THREE.Object3D[] = [intersectedMesh];
    while (current.parent && current.parent !== scene) {
        path.unshift(current.parent); // Add parents to the start of the array
        current = current.parent;
    }
    
    // Path now looks like: [Root, Parent1, Parent2, ..., IntersectedMesh]
    
    // Find where the current selectedObject is in this path
    const currentIndex = path.findIndex(obj => obj === selectedObject);
    
    if (currentIndex === -1) {
        // As a fallback, restart at the root.
        return findModelRoot(intersectedMesh);
    }
    
    // The next object is the one immediately after the current one in the path.
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < path.length) {
        // Select the next child in the hierarchy path
        return path[nextIndex];
    } else {
        // We reached the end (the intersected mesh) in the last step, so cycle back to the root
        return findModelRoot(intersectedMesh);
    }
}
