## Configuration

| System | Config endpoint | Required fields |
|---|---|---|
| Wheel | `POST /api/config/wheel` | `itemId`, `itemName`, `itemOption` |
| Shop | `POST /api/config/shop` | `itemId`, `itemName`, `itemOption`, `price` |
| Daily Chest | `POST /api/config/daily-chest` | `itemId`, `itemName`, `itemOption`, `dropRate` |
| Achievements | `node server.js --generate-achievements` | — |
