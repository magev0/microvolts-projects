# bonus-loot API

### Get progress

```
GET /api/daily-chest/progress
```

```json
{
  "success": true,
  "data": { "canDraw": false, "progress": 3600, "progressPercentage": "50%" }
}
```

---

### Claim

```
POST /api/daily-chest/claim
```

Success:

```json
{
  "success": true,
  "data": { "message": "Congratulations you won 1,000 Battery", "progress": 0, "progressPercentage": "0%" }
}
```

Not enough playtime:

```json
{
  "success": false,
  "message": "Not enough playtime to draw a reward",
  "data": { "canDraw": false, "progress": 3600, "progressPercentage": "50%" }
}
```
