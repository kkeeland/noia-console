import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Custom Vite plugin — serves local data files as API endpoints during dev.
// In production these would come from the gateway or a separate API.
function localDataPlugin(): Plugin {
  return {
    name: 'local-data',
    configureServer(server) {
      // Beads CLI text output
      server.middlewares.use('/data/beads', (_req, res) => {
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
      })

      // Beads JSONL — parsed issues
      server.middlewares.use('/data/beads-json', (_req, res) => {
        try {
          const jsonl = fs.readFileSync(
            path.resolve(process.env.HOME!, 'clawd/.beads/issues.jsonl'),
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
      })

      // Contacts JSON
      server.middlewares.use('/data/contacts', (_req, res) => {
        try {
          const contacts = fs.readFileSync(
            path.resolve(process.env.HOME!, 'clawd/contacts.json'),
            'utf-8',
          )
          res.setHeader('Content-Type', 'application/json')
          res.end(contacts)
        } catch (e: unknown) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
        }
      })

      // CRM data (GET / POST)
      server.middlewares.use('/data/crm', (req, res) => {
        const crmPath = path.resolve(process.env.HOME!, 'clawd/.noia/crm.json')
        if (req.method === 'GET') {
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
        } else if (req.method === 'POST') {
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
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDataPlugin()],
  server: {
    // Dev proxy: forwards /api to localhost gateway.
    // In production, the console uses the gateway URL from localStorage directly
    // (configured via Settings / SetupScreen), so no proxy is needed.
    proxy: {
      '/api': {
        target: 'http://localhost:18789',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
