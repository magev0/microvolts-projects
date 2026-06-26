# API Reference

All endpoints require a JWT in the `Authorization` header except `/api/register` and `/api/login`.

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/login`.

A Postman collection is included at `docs/MVO.postman_collection`. Online version: [Postman Docs](https://documenter.getpostman.com/view/40053537/2sB3HooypU).

## Endpoints

- [Authentication](auth.md)
- [Admin](admin.md)
- [Referral Wheel](referral-wheel.md)
- [Event Shop](shop.md)
- [Achievements](achievements.md)
- [Daily Playtime](bonus-loot.md)
