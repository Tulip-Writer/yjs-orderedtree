import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from "@rollup/plugin-terser";

// We'll produce two outputs in a single pass: browser + node
export default [
  // --- Browser Build ---
  {
    input: "src/index.js",
    output: {
      file: "dist/index.browser.js",
      format: "esm",      // ESM output
      sourcemap: true,    // If you want source maps
    },
    // Mark external packages you don't want bundled (e.g. 'yjs' if it's peerDependency):
    external: ["yjs"],
    plugins: [
      nodeResolve({
        browser: true, // Tells Rollup to bundle for browser
        preferBuiltins: false,
      }),
      commonjs(),
      terser(),
    ],
  },

  // --- Node Build ---
  {
    input: "src/index.js",
    output: {
      file: "dist/index.node.js",
      format: "esm",      // ESM output for Node
      sourcemap: true,
    },
    // Again, specify external dependencies if needed
    external: ["yjs"],
    plugins: [
      nodeResolve({
        browser: false, // Tells Rollup to bundle for Node
        preferBuiltins: true,
      }),
      commonjs(),
      terser(),
    ],
  },
];
