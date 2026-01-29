import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'

// Custom Vite plugin — serves local data files as API endpoints during dev.
function localDataPlugin(): Plugin {
  const HOME = process.env.HOME!

  const routes: Record<string, (req: IncomingMessage, res: ServerResponse) => void> = {
    '/data/beads': (_req, res) => {
      try {
        const output = execSync('cd ~/clawd && bd list --all', {
          encoding: 'utf-8',
          timeout: 5000,
        })
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, output }))
      } catch (e: unknown) {
        res.statusCode = 500
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
      }
    },

    '/data/beads-json': (_req, res) => {
      try {
        const jsonl = fs.readFileSync(
          path.resolve(HOME, 'clawd/.beads/issues.jsonl'),
          'utf-8',
        )
        const issues = jsonl
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, issues }))
      } catch (e: unknown) {
        res.statusCode = 500
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
      }
    },

    '/data/contacts': (_req, res) => {
      try {
        const contacts = fs.readFileSync(
          path.resolve(HOME, 'clawd/contacts.json'),
          'utf-8',
        )
        res.setHeader('Content-Type', 'application/json')
        res.end(contacts)
      } catch (e: unknown) {
        res.statusCode = 500
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
      }
    },

    '/data/crm': (req, res) => {
      const crmPath = path.resolve(HOME, 'clawd/.noia/crm.json')
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: Buffer) => (body += chunk))
        req.on('end', () => {
          try {
            const dir = path.dirname(crmPath)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(crmPath, body)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e: unknown) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
          }
        })
      } else {
        try {
          const data = fs.existsSync(crmPath)
            ? fs.readFileSync(crmPath, 'utf-8')
            : '{}'
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
        } catch {
          res.setHeader('Content-Type', 'application/json')
          res.end('{}')
        }
      }
    },
  }

  return {
    name: 'local-data',
    configureServer(server) {
      // Use a single middleware with exact path matching (not prefix)
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url && routes[url]) {
          routes[url](req, res)
        } else {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDataPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:18789',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
