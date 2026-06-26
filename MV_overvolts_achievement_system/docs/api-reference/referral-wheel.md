# Referral Wheel API

### Get wheel status and items

```
GET /api/wheel/items
```

```json
{
  "success": true,
  "data": {
    "canSpin": true,
    "remainingSpins": 2,
    "hoursUntilNextSpin": 0,
    "wheelItems": [
      { "itemId": 10001, "itemName": "Apsu", "itemOption": " " }
    ]
  }
}
```

---

### Spin

```
POST /api/wheel/draw
```

```json
{
  "success": true,
  "data": { "message": "Congratulations! You won Classic Rifle", "remainingSpins": 1 }
}
```

403 if not enough playtime:

```json
{ "error": "You need 10 more hours to claim a spin", "hoursUntilNextSpin": 10, "remainingSpins": 0 }
```
