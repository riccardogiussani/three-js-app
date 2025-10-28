import { defineConfig } from 'vite';

// Get the repository name from environment variables or set it manually
const REPO_NAME = 'three-js-app'; // Replace with your actual GitHub repository name

// The defineConfig function now takes a context object with a 'command' property.
export default defineConfig(({ command }) => {
  // Check if the command being run is 'build' (i.e., production).
  const isProduction = command === 'build';

  return {
    // Set the base path:
    // - If it's the 'build' command (production), use the GitHub Pages subdirectory.
    // - Otherwise (development), use the default root path '/'.
    base: isProduction ? `/${REPO_NAME}/` : '/',
  };
});