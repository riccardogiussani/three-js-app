# THREE-JS-APP: a minimal boilerplate for threejs with VR support

This repository serves as a modern template for setting up a 3D development environment using three.js, bundled by Vite, and written in TypeScript. It features VR support via WebXR, modular architecture with managers for UI, interaction, events, controllers, and model loading. The application loads 3D models and interactive menus, demonstrating advanced three.js scene setup, VR controller input handling, and performance monitoring.

Available at: https://riccardogiussani.github.io/three-js-app/

## Features

- Three.js scene with lighting and camera setup
- WebXR-enabled renderer for VR support
- Modular managers for UI, interaction, events, controllers, and model loading
- Loading of 3D models (.glb) and HTML-based VR menus
- VR controller input handling with event-driven callbacks
- Performance stats display using stats-gl
- Responsive window resizing and animation loop

## Project Creation: A Step-by-Step Guide

This section details every step required to initialize and configure this project from a blank slate.

### 1. Environment Setup

Before starting, ensure you have a stable development environment. We recommend using a Node Version Manager (NVM) to manage Node.js versions.

For Ubuntu/Linux users:

```bash
# Install Node Version Manager (NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM (if not automatically loaded)
source ~/.bashrc

# Install and use the Node.js Long Term Support (LTS) version
nvm install --lts
nvm use --lts
```

### 2. Initializing the Project with Vite

Vite is used for fast and efficient bundling and a quick development server.

```bash
# 1. Create a new Vite project
npm create vite@latest three-js-app

# During setup, select the following options:
# > Select a framework: Vanilla
# > Select a variant: TypeScript

# 2. Navigate into the new directory
cd three-js-app

# 3. Install core dependencies
npm install

# 4. Install three.js and its type definitions
npm install three
npm install --save-dev @types/three

# 5. Install stats-gl for performance monitoring
npm install stats-gl
```

### 3. Project Structure

The structure is kept minimal, focusing the logic in the `src` directory:

```bash
three-js-app/
├── .github/              # GitHub Actions Workflow (Deployment)
├── node_modules/         # Dependencies
├── public/               # Static assets (models, menus)
├── src/
│   ├── main.ts           # Core three.js scene setup, VR, and app logic
│   └── utils/            # Modular managers for UI, interaction, events, controllers, and models
├── index.html            # Entry point for the application
├── package.json          # Project dependencies and scripts
└── vite.config.js        # Vite configuration file
```

### 4. Usage

To run the app locally:

```bash
npm run dev
```

Open your browser at `http://localhost:3000` to view the app.

To build for production:

```bash
npm run build
npm run preview
```

### 5. VR Interaction

- Click the "Start VR" button in the app to begin a VR session.
- Use VR controllers to interact with the scene and UI menus.
- Controller inputs are handled via event listeners for select, squeeze, and button presses.
- Visual feedback is provided on controller interactions.

### 6. Code Highlights

- `src/main.ts` initializes the scene, camera, renderer, lighting, and managers.
- Managers in `src/utils/` handle UI, interaction, events, controllers, and model loading.
- Models and menus are loaded from the `public/models` and `public/menus` directories.
- Performance stats are displayed using `stats-gl`.
- Responsive design with window resize handling.
- Animation loop driven by `renderer.setAnimationLoop`.

### 7. Customization

- Add or replace 3D models by placing `.glb` files in `public/models` and updating `src/main.ts`.
- Modify or add VR menus by editing HTML files in `public/menus`.
- Extend controller event handling by updating callbacks in `src/main.ts`.
- Customize lighting, camera, and scene setup in `src/main.ts`.

### 8. GitHub Pages Configuration (vite.config.js)

To ensure all asset paths are correctly resolved when deployed to GitHub Pages under a subdirectory (e.g., https://username.github.io/repo-name/), the base path must be explicitly set in Vite's configuration.

```javascript
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: Sets the base URL for the deployment path on GitHub Pages
  base: '/three-js-app/',
})
```

### 9. Repository Setup and Continuous Deployment

To enable automatic building and deployment of the application to GitHub Pages whenever code is pushed to the main branch, a GitHub Actions workflow is used.

The `.github/workflows/deploy.yml` explained:

- Trigger: Runs on every push to the main branch.
- Steps: Installs dependencies, runs `npm run build` (which creates the necessary `dist` directory), and then uses the official `actions/deploy-pages@v4` action to publish the generated assets to GitHub Pages.
- This automation means every commit to main automatically updates the live demo.

### 10. Contributing

Contributions are welcome! Please fork the repository and submit pull requests for bug fixes, features, or improvements.

### 11. License

Specify your license here (e.g., MIT License).
