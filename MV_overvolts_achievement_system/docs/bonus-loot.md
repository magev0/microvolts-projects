# Bonus Loot
![[Pasted image 20260627012112.png]]


Players claim a reward every 2 hours of active playtime (configurable via `DAILY_PLAYTIME_DRAW_TRIGGER`). Uses weighted drop rates. Counter resets after each claim.
(toyheroes)

## API

### Get progress

```
GET /api/daily-chest/progress
```

```json
{
  "success": true,
  "data": {
    "canDraw": false,
    "progress": 3600,
    "progressPercentage": "50%"
  }
}
```

### Claim

```
POST /api/daily-chest/claim
```

```json
{
  "success": true,
  "data": {
    "message": "Congratulations you won 1,000 Battery",
    "progress": 0,
    "progressPercentage": "0%"
  }
}
```

## Configuration

```
POST /api/config/daily-chest
```

```json
[
  { "itemId": 1001, "itemName": "1,000 Battery", "itemOption": "", "dropRate": 50 },
  { "itemId": 1002, "itemName": "Rare Weapon", "itemOption": "PERM", "dropRate": 5 }
]
```

Higher `dropRate` = more common. Values don't need to sum to 100.
