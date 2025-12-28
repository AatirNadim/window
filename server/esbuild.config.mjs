import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ["index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: "dist",
  outExtension: { ".js": ".js" },

  // all the deps in node_modules and built-in modules are external
  packages: "external",

  sourcemap: true,

  minify: false,

  keepNames: true,

  supported: {
    "top-level-await": true,
  },

  banner: {
    js: `
// ESM compatibility for __dirname and __filename
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },

  resolveExtensions: [".ts", ".js", ".mjs", ".json"],

  logLevel: "info",

  metafile: true,
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log("\n == Watching for changes... == \n");
    } else {
      const result = await esbuild.build(buildOptions);

      // bundle stats
      if (result.metafile) {
        const text = await esbuild.analyzeMetafile(result.metafile, {
          verbose: false,
        });
        console.log("\n == Bundle analysis == \n");
        console.log(text);
      }

      console.log("\n == Build completed successfully == \n");
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
