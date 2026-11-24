import { resolve } from "node:path"
import { defineConfig, loadEnv } from "vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const siteUrl = (env.VITE_SITE_URL || "http://localhost:3001").replace(/\/$/, "")

  return {
    plugins: [
      {
        name: "site-url-metadata",
        enforce: "pre",
        transformIndexHtml(html) {
          return html.replaceAll("%VITE_SITE_URL%", siteUrl)
        },
      },
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
