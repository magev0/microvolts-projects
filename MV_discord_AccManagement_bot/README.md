# MicroVolts Discord Registration Bot

A Discord slash-command bot that lets players register accounts for your MicroVolts private server. Credentials are stored in a MariaDB database with bcrypt hashed passwords.

---

## Commands

| Command | Description |
|---|---|
| `/register <username> <password> <nickname>` | Create a new game account |
| `/whois [user]` | Look up the account linked to a Discord user |
| `/changepassword <username> <old_password> <new_password>` | Update your account password (uses autocomplete for username) |

All commands reply **ephemerally** (only visible to the user who ran them) to keep credentials private.

---

## Requirements

- **Node.js** ≥ 18
- **MariaDB** (10.x or 11.x)
- A **Discord bot token** (see setup below)

---

## Setup

### 1 — Discord Developer Portal

1. Go to https://discord.com/developers/applications and create a new application.
2. Under **Bot**, click **Add Bot** and copy the **Token**.
3. Enable **Server Members Intent** if you plan to expand the bot later.
4. Under **OAuth2 → URL Generator**, select scopes: `bot` + `applications.commands`.
   Add bot permission: **Send Messages**. Use the generated URL to invite the bot to your server.
5. Copy your **Application ID** (shown on the General Information page).

### 2 — Database

```sql
-- Run schema.sql against your MariaDB instance:
mariadb -u root -p < schema.sql
```

### 3 — Environment

```bash
cp .env.example .env
# Edit .env and fill in all values
```

### 4 — Install & Deploy

```bash
npm install

# Register commands to your guild (instant):
npm run deploy

# OR register globally (takes up to 1 hour):
npm run deploy:global
```

### 5 — Run the Bot

```bash
npm start
```

For deployment, use a process manager:

```bash
npm install -g pm2
pm2 start bot.js --name mv-discord-bot
pm2 save
pm2 startup
```

---

## File Structure

```
microvolts-discord-bot/
├── bot.js               # Entry point – loads commands, handles interactions
├── db.js                # MariaDB connection pool + initDB()
├── deploy-commands.js   # One-time slash command registration script
├── schema.sql           # Database schema (run once)
├── .env.example         # Environment variable template
├── package.json
└── commands/
    ├── register.js      # /register
    ├── whois.js         # /whois
    └── changepassword.js# /changepassword
```

---

## Security Notes

- Passwords and recovery passphrases are hashed with **bcrypt 12** before storage — plaintext is never saved.
- All command replies are **ephemeral** so credentials never appear in public chat.
- Each Discord account can register a maximum of **two** game accounts.
- **Persistent Rate Limiting:** Password changes have a 15-minute global cooldown. If a user fails to supply the correct current password 5 times, they are locked out with an exponential backoff.
- **Account Protection:** Registration blocks the use of reserved staff names (`admin`, `mod`, `gm`, etc.).
- **Recovery Mechanisms:** Upon registration, users receive a 16-character hex Recovery Passphrase to store in a password manager.
- **TLS Enforcement:** When `NODE_ENV=production`, the bot enforces `DB_USE_TLS=true` and will fail to boot if it is disabled, ensuring database queries remain encrypted.
