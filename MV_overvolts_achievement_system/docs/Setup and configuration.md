# Installation & Configuration

## Prerequisites
- `ToybattlesHQ` emulator servers
-  Node.js >= 20
-  mariaDB >= 11

## 1. Install Dependencies

```
npm install
```

## 2. Data Files

The server needs item data from the cgd.dip archive, extracted and transformed
into `items.transformed.json` under data/. A pre-built file is already included, 
but you can import your own through the method below:

**To import your own data from cgd.dip:**
1. Unpack the `.dip` file using [mvarchiver](https://github.com/d3v1l401/Microvolt-Archiver).
2. Convert the `iteminfo`, `itemweaponsinfo` `.cdb` files to JSON using [cdb_parser](https://github.com/M4sterG/cdb_parser).
3. Place the json files in `data/SRC_JSON_FILES/`.
4. Delete the existing `data/items.transformed.json`.
5. tell the server to rebuild the master item list (`items.transformed.json`):
```
node server.js --reset-cache
```

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable                      | Description                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `PORT`                        | Server port                                                  |
| `DB_HOST`                     | Database host                                                |
| `DB_USER`                     | Database user                                                |
| `DB_PASSWORD`                 | Database password                                            |
| `DB_NAME`                     | Database name                                                |
| `USER_JWT_SECRET`             | JWT secret for regular users                                 |
| `ADMIN_JWT_SECRET`            | JWT secret for admin users                                   |
| `EMU_JWT_SECRET`              | JWT secret shared with the emulator                          |
| `EMU_API_URL`                 | Emulator API base URL (e.g. `http://192.168.1.102:8080/api`) |
| `DAILY_PLAYTIME_DRAW_TRIGGER` | Hours of playtime required per chest claim (default: 2)      |
| `WHEEL_DRAW_TRIGGER`          | Hours of playtime required per wheel spin (default: 160)     |
## 4. Database Setup

Run once before first start:

```
node server.js --populate
```

This ensures the required columns and tables exist in your database.

## 5. Create an Admin Account

**requirements:**
- Username: 3+ characters, alphanumeric only
- Password: 6+ characters, must include at least one symbol
```
node server.js --create-admin <username> <password>

# example:
node server.js --create-admin adminUser !pass123
# example with a secure password:
node server.js --create-admin adminUser !SECURE!LSA2#%$DX23F
```


The account is created with Grade 7 (highest). After running, the script exits  start the server normally.

## Starting the Server

```
node server.js
```
