import { defineConfig } from 'vite';

// Get the repository name from environment variables or set it manually
const REPO_NAME = 'three-js-app'; // Replace with your actual GitHub repository name

export default defineConfig({
  // Sets the base public path for the project.
  // This is crucial for GitHub Pages to correctly load assets (like /src/main.ts).
  base: `/${REPO_NAME}/`,
});
