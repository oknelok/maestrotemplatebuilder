import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Creates our Drupal-centric js and css directories on the same hierarchy in the dist folder.
 */
function moveCssPlugin() {
  return {
    name: 'move-css',
    closeBundle() {
      const jsOutDir = path.resolve(__dirname, 'dist/js/css');
      const cssOutDir = path.resolve(__dirname, 'dist/css');

      if (!fs.existsSync(jsOutDir)) {
        console.log(`No css dir found at ${jsOutDir}, skipping move.`);
        return;
      }

      fs.mkdirSync(cssOutDir, { recursive: true });

      fs.readdirSync(jsOutDir).forEach(file => {
        if (file.endsWith('.css')) {
          const from = path.join(jsOutDir, file);
          const to = path.join(cssOutDir, 'diagram.css'); // normalize filename
          fs.renameSync(from, to);
          console.log(`Moved ${file} -> ${to}`);
        }
      });

      // Cleanup js/css
      try {
        fs.rmdirSync(jsOutDir);
        console.log(`Removed temp dir ${jsOutDir}`);
      } catch (e) {}
    }
  };
}

export default defineConfig({
  build: {
    outDir: './dist/js',
    emptyOutDir: true, // Clear out the output directory
    minify: true, // Minified output on.  Set to false for debug
    sourcemap: true, // Generates our output JS mapping for debug
    lib: {
      entry: './src/main.js',
      name: 'MaestroTemplateBuilder',
      fileName: () => 'MaestroTemplateBuilder.js',
      // formats: ['iife'], // Omitting for now as we expose our TemplateBuilder and Maestro objects to window.
    },
    rollupOptions: {
      output: {
        extend: true, // Merge with existing global. Not likely, but safe.
        assetFileNames: (assetInfo) => {
          const filename = assetInfo.names?.[0]; // Use the first name if available

          if (filename && filename.endsWith('.css')) {
            // CSS temporarily goes into dist/js/css/
            // It gets moved out with our moveCssPlugin
            return 'css/[name][extname]';
          }

          // For this project, we only have css and js.  This is a catch all.
          return 'assets/[name][extname]';
        }
      }
    }
  },
  plugins: [moveCssPlugin()], // Runs this plugin post build
});
