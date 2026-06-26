# Authentication

### Register

```
POST /api/register
```

```json
{ "username": "testuser", "password": "password123", "nickname": "TestUser" }
```

201 on success. 400 if fields are missing, format is invalid, or username/nickname is taken.

---

### Login

```
POST /api/login
```

```json
{ "username": "testuser", "password": "password123" }
```

```json
{
  "success": true,
  "data": { "message": "Login successful", "token": "<jwt>" }
}
```

401 on invalid credentials.
