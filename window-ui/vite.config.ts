import { resolve } from "node:path"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { defineConfig, loadEnv } from "vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import { TanStackRouterVite } from "@tanstack/router-plugin/vite"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const siteUrl = (env.VITE_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

  return {
  plugins: [
    {
      name: "site-url-metadata",
      transformIndexHtml(html) {
        return html.replaceAll("%VITE_SITE_URL%", siteUrl)
      },
      closeBundle() {
        for (const fileName of ["sitemap.xml", "robots.txt"]) {
          const publicPath = resolve(__dirname, `dist/${fileName}`)
          if (existsSync(publicPath)) {
            writeFileSync(publicPath, readFileSync(publicPath, "utf8").replaceAll("%VITE_SITE_URL%", siteUrl))
          }
        }
      },
    },
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  }
})
