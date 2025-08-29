import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Runs after build to move the CSS assets out of the JS dir and into the CSS dir.
 */
function moveCssPlugin() {
  return {
    name: 'move-css',
    closeBundle() {
      const jsOutDir = path.resolve(__dirname, 'js/assets');
      const cssOutDir = path.resolve(__dirname, 'css');
      fs.mkdir(cssOutDir, (err) => {
        if (err) {
          console.error('CSS Directory likely already exists:', err);
        } else {
          console.log('CSS Directory created successfully!');
        }
      });
      // Move all .css files from js/assets dir to css dir
      fs.readdirSync(jsOutDir).forEach(file => {
        if (file.endsWith('.css')) {
          const from = path.join(jsOutDir, file);
          const to = path.join(cssOutDir, 'diagram.css'); // force to diagram.css
          fs.renameSync(from, to);
          console.log(`Moved ${file} -> ${path.relative('.', to)}`);
          fs.rmdir(jsOutDir, function(){});
          console.log(`Removed directory ${jsOutDir}`);
        }
      });
    }
  };
}


// Main vite config
export default defineConfig({
  root: './src',
  build: {
    outDir: '../js',
    emptyOutDir: false,
    minify: false, // Disables minification for development
    sourcemap: true,
    rollupOptions: {
      input: './src/main.js',
      output: {
        entryFileNames: 'MaestroTemplateBuilder.js',
        format: 'es'
      }
    }
  },
  plugins: [moveCssPlugin()],
  optimizeDeps: {
    include: [
      // Add other diagram-js sub-paths you might be using
      // e.g., 'diagram-js/lib/features/modeling',
      // 'diagram-js/lib/core'
    ]
  }
});
