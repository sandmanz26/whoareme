// pm2 ecosystem — update BASE_PATH to match your VPS directory
const BASE_PATH = "/home/rendy/whoareme"

module.exports = {
  apps: [
    // ── Frontend (static SPA via serve) ───────────────────────────────────────
    {
      name:      "whoareyou-fe",
      script:    "npm",
      args:      "run preview",
      cwd:       BASE_PATH,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch:     false,
      env: {
        NODE_ENV: "production",
      },
    },

    // ── Backend (compiled Node) ───────────────────────────────────────────────
    {
      name:      "whoareyou-api",
      script:    "dist/src/server.js",
      node_args: "--env-file=.env",
      cwd:       `${BASE_PATH}/server`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch:     false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
