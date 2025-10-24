# THREE-JS-APP: a minimal boilerplate for threejs on github

This repository serves as a minimal template for setting up a modern 3D development environment using three.js, bundled by Vite, and written in TypeScript.
The application itself displays a simple, rotating 3D cube within a basic scene, demonstrating core three.js setup, scene initialization, and an animation loop.
Available at: https://riccardogiussani.github.io/three-js-app/
# Project Creation: A Step-by-Step Guide
This section details every step required to initialize and configure this project from a blank slate.
### 1. Environment Setup
Before starting, ensure you have a stable development environment. We recommend using a Node Version Manager (NVM) to manage Node.js versions.
For Ubuntu/Linux users:
```bash
# Install Node Version Manager (NVM)
curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash

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
```
### 3. Project Structure
The structure is kept minimal, focusing the logic in the `src` directory:
```bash
three-js-app/
├── .github/              # GitHub Actions Workflow (Deployment)
├── node_modules/         # Dependencies
├── src/
│   ├── main.ts           # ⇐ The core three.js scene setup and logic
│   └── style.css         # Basic styling (usually minimal for 3D)
├── index.html            # Entry point for the application
├── package.json          # Project dependencies and scripts
└── vite.config.js        # Vite configuration file
```
The main rendering logic is entirely contained within `src/main.ts`.

### 4. GitHub Pages Configuration (vite.config.js)
To ensure all asset paths are correctly resolved when deployed to GitHub Pages under a subdirectory (e.g., https://username.github.io/repo-name/), the base path must be explicitly set in Vite's configuration.
```javascript
import { defineConfig } from 'vite'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  // IMPORTANT: Sets the base URL for the deployment path on GitHub Pages
  base: '/three-js-app/',
})
```

### 5. Repository Setup and Continuous Deployment
To enable automatic building and deployment of the application to GitHub Pages whenever code is pushed to the main branch, a GitHub Actions workflow is used.
The `.github/workflows/deploy.yml` explained:
This YAML file defines the Continuous Integration/Continuous Deployment (CI/CD) pipeline.
Trigger: It runs on every push to the main branch.
Steps: It installs dependencies, runs npm run build (which creates the necessary dist directory), and then uses the official `actions/deploy-pages@v4` action to publish the generated assets to GitHub Pages. This automation means every commit to main automatically updates the live demo.
