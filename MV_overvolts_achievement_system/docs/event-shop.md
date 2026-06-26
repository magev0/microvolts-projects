# Event Shop

Players spend Event Currency on exclusive items. Currency is earned from matches lasting 15+ minutes. Items must have a `price` field to appear in the shop. (toyheroes)
![](previews/Pasted%20image%2020260627005644.png)
## API

### Get shop items and balance

```
GET /api/shop/items
```

```json
{
  "success": true,
  "data": {
    "items": [
      { "itemId": 54321, "itemName": "Special Character", "itemOption": "PERM", "price": 100 }
    ],
    "EventCurrency": 150
  }
}
```

### Purchase

```
POST /api/shop/buy
```

```json
{ "itemName": "Special Character" }
```

```json
{
  "success": true,
  "message": "Successfully purchased Special Character",
  "data": {
    "item": { "itemId": 54321, "itemName": "Special Character", "itemOption": "PERM", "price": 100 },
    "currencyAmount": 50
  }
}
```

## Configuration

```
POST /api/config/shop
```

```json
[
  { "itemId": 12345, "itemName": "Devil Headband", "itemOption": "PERM", "price": 50 }
]
```
