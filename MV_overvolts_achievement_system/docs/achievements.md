# Achievement System

Tracks player progress and rewards milestones. Supports personal progress and social achievement viewing.
### Configuring The Achievements
You will need to manually edit the `generateAchievements.js` script located at `util/scripts/generateAchievements.js`. The script is simple enough to modify.

Try to keep a good balance so players do not get items too early or too late.
## States

- **Locked** — requirements not met
- **In Progress** — partial progress made
- **Completed** — requirements met, ready to claim
- **Claimed** — reward collected

## GUI

Functional for API testing. CSS scaling is broken and the layout is not responsive.

![Achievement GUI](achievements-buggy.png)

## Configuration

Edit `util/scripts/generateAchievements.js` then run:

```
node server.js --generate-achievements
```

## API

### Get personal achievements

```
GET /api/self/achievements
```

### View another player's achievements

```
GET /api/:nickname/achievements
```

### Claim an achievement

```
POST /api/achievements/claim
```

```json
{ "achievementSlug": "sharpshooter-1" }
```
