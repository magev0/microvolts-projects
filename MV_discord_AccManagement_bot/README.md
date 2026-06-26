# MicroVolts Discord Bot

A Discord slash-command bot for managing player accounts on a MicroVolts private server. Credentials are stored in a MariaDB database with bcrypt-hashed passwords.

---

## Commands

| Command | Description |
|---|---|
| `/register <username> <password> <nickname>` | Create a new game account |
| `/whois [user]` | Look up the account linked to a Discord user |
| `/changepassword <username> <old_password> <new_password>` | Update your account password |

All commands reply ephemerally — only visible to the user who ran them.

---

## Requirements

- Node.js ≥ 22
- MariaDB 10.x or 11.x
- A Discord bot token

---

## Docker

The image uses a two-stage build: `node:22-bullseye-slim` installs production dependencies, then the final image is `gcr.io/distroless/nodejs22-debian12` — no shell or package manager, minimal attack surface.

### Build & run

```bash
docker build -t mv-discord-bot .

docker run -d --name mv-discord-bot \
  --env-file .env \
  mv-discord-bot
```

### Deploy slash commands

The distroless image has no shell, so `npm run deploy` won't work inside it. Run the deploy script once before starting the bot:

```bash
# locally (recommended):
npm run deploy

# or via a temporary container:
docker run --rm --env-file .env --entrypoint node mv-discord-bot deploy-commands.js
```

Commands only need to be re-registered if you add or change them.

### CI/CD

`.github/workflows/ci.yml` runs on every push to `main`/`master`:

1. Runs `npm test` and `npm audit`.
2. On success, builds and pushes the image to **GitHub Container Registry** (`ghcr.io/<owner>/<repo>`).

To pull and run the published image:

```bash
docker pull ghcr.io/<your-username>/<repo-name>:main

docker run -d --name mv-discord-bot \
  --env-file .env \
  ghcr.io/<your-username>/<repo-name>:main
```

---

## Manual Setup

### 1 — Discord Developer Portal

1. Go to https://discord.com/developers/applications and create a new application.
2. Under **Bot**, click **Add Bot** and copy the **Token**.
3. Under **OAuth2 → URL Generator**, select scopes `bot` + `applications.commands` and permission **Send Messages**. Use the generated URL to invite the bot to your server.
4. Copy your **Application ID** from the General Information page.

### 2 — Database

```bash
mariadb -u root -p < schema.sql
```

### 3 — Environment

```bash
cp .env.example .env
# fill in all values
```

### 4 — Install & deploy commands

```bash
npm install

# register commands to your guild (instant):
npm run deploy

# or register globally (takes up to 1 hour):
npm run deploy:global
```

### 5 — Run

```bash
npm start
```

For persistent deployment use pm2:

```bash
pm2 start bot.js --name mv-discord-bot
pm2 save && pm2 startup
```

---

## File Structure

```
├── bot.js               # entry point
├── db.js                # MariaDB connection pool
├── deploy-commands.js   # one-time slash command registration
├── schema.sql           # database schema
├── .env.example
├── package.json
└── commands/
    ├── register.js
    ├── whois.js
    └── changepassword.js
```

---

## Security Notes

- Passwords and recovery passphrases are hashed with bcrypt (cost 12). Plaintext is never stored.
- All replies are ephemeral so credentials never appear in public chat.
- Each Discord account can register at most two game accounts.
- Password changes have a 15-minute cooldown. Five consecutive wrong attempts trigger an exponential backoff lockout.
- Reserved staff names (`admin`, `mod`, `gm`, etc.) are blocked at registration.
- Users receive a 16-character hex recovery passphrase on registration.
- In `NODE_ENV=production`, `DB_USE_TLS=true` is enforced  the bot will refuse to start if TLS is disabled.
