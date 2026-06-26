
Players earn one spin per 160 hours of playtime (configurable via `WHEEL_DRAW_TRIGGER`). Spins accumulate. Rewards are drawn randomly from the configured item pool. Each win is logged to `public/wheel.log`. (originally implemented in microvolts surge)
[https://www.youtube.com/watch?v=Wq3uV1y7X6I](https://www.youtube.com/watch?v=JjKTigTB0WI)
https://www.youtube.com/watch?v=ZG2P97g2UyI

## Screenshots
![](previews/Pasted%20image%2020260627005258.png)

![](previews/Pasted%20image%2020260627005317.png)

![](previews/Pasted%20image%2020260627005403.png)
## API

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
    "wheelItems": [...]
  }
}
```

### Spin

```
POST /api/wheel/draw
```

```json
{
  "success": true,
  "data": {
    "message": "Congratulations! You won Classic Rifle",
    "remainingSpins": 1
  }
}
```

Not enough playtime returns 403:

```json
{
  "error": "You need 10 more hours to claim a spin",
  "hoursUntilNextSpin": 10,
  "remainingSpins": 0
}
```

## Configuration

```
POST /api/config/wheel
```

```json
[
  { "itemId": 10001, "itemName": "Apsu", "itemOption": "PERM" }
]
```
