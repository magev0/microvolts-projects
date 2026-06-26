# Event Shop API

### Get shop items and balance

```
GET /api/shop/items
```

```json
{
  "success": true,
  "data": {
    "items": [{ "itemId": 54321, "itemName": "Special Character", "itemOption": "PERM", "price": 100 }],
    "EventCurrency": 150
  }
}
```

---

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

400 if item not found or insufficient currency.
