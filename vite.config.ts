import react from '@vitejs/plugin-react'
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'third-party-notices',
      async closeBundle() {
        await mkdir(`${root}dist/LICENSES`, { recursive: true })
        await Promise.all([
          copyFile(`${root}THIRD_PARTY_NOTICES.md`, `${root}dist/THIRD_PARTY_NOTICES.md`),
          copyFile(`${root}LICENSES/GPL-3.0-or-later.txt`, `${root}dist/LICENSES/GPL-3.0-or-later.txt`),
          copyFile(`${root}LICENSES/POKEAPI-BSD-3-CLAUSE.txt`, `${root}dist/LICENSES/POKEAPI-BSD-3-CLAUSE.txt`),
        ])
      },
    },
  ],
})
