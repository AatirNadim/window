import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "ES2020",
  format: "esm",
  outfile: "dist/index.js",

  sourcemap: true,

  keepNames: true,

  resolveExtensions: [".ts", ".js", ".json"],

  logLevel: "info",
};

async function generateDeclarations() {
  console.log("\n == Generating TypeScript declarations... == \n");
  try {
    execSync("tsc --emitDeclarationOnly --declaration --outDir dist", {
      stdio: "inherit",
    });
    console.log("\n == Declarations generated == \n");
  } catch (error) {
    console.warn("Declaration generation had issues (non-fatal)");
  }
}

async function build() {
  try {
    // Ensure dist directory exists
    mkdirSync("dist", { recursive: true });

    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log("\n == Watching for changes... == \n");
    } else {
      await esbuild.build(buildOptions);
      console.log("\n == JavaScript build completed == \n");

      // Generate type declarations using tsc
      await generateDeclarations();

      console.log("\n == Build completed successfully == \n");
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
