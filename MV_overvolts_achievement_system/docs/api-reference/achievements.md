# Achievements API

### Get personal achievements

```
GET /api/self/achievements
```

```json
{
  "success": true,
  "data": [
    { "slug": "level-up-10", "status": { "claimed": true, "unlocked": true, "inProgress": false, "overallPercent": 100 } },
    { "slug": "total-slayer-5", "status": { "claimed": false, "unlocked": false, "inProgress": true, "overallPercent": 65 } }
  ]
}
```

---

### Get another player's achievements

```
GET /api/:nickname/achievements
```

404 if player not found.

---

### Claim

```
POST /api/achievements/claim
```

```json
{ "achievementSlug": "sharpshooter-1" }
```

```json
{
  "success": true,
  "data": {
    "message": "Achievement claimed successfully",
    "achievement": {
      "name": "Sharpshooter - 1",
      "rewards": [{ "itemId": 4600001, "itemName": "100 MP" }]
    }
  }
}
```

Requirements not met:

```json
{ "success": false, "data": { "message": "Requirements not met: level 100/104" } }
```
