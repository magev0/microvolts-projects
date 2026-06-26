# Admin API

All endpoints require Admin authentication.

---

### Register a staff member

```
POST /api/register-staff
```

Requires Grade 4 or higher.

```json
{
  "username": "newstaff",
  "password": "StaffP@ssword!",
  "nickname": "NewStaff",
  "grade": 2
}
```

Grades: `2` Event Supporter, `3` Moderator, `4` Game Master, `7` Developer.

201 on success. 403 if caller grade < 4.

---

### Configure reward items

```
POST /api/config/wheel
POST /api/config/shop
POST /api/config/achievements
POST /api/config/daily-chest
```

Body is a JSON array of items. Required fields vary by category:

```json
[
  { "itemId": 12345, "itemName": "Example Sword", "itemOption": "PERM", "price": 50 }
]
```

- `price` required for `shop`
- `dropRate` required for `daily-chest`

```json
{
  "success": true,
  "data": { "category": "shop_items_data", "data": [...] },
  "message": "1 new item(s) added (duplicates skipped)."
}
```

400 if items are malformed or `itemId` doesn't exist in `itemInfo.json`.
