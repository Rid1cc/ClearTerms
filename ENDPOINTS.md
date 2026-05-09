# API Endpoints Reference

Base URL: `http://localhost:3001` (dev)

Protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Health

### `GET /health`
- **Auth:** none
- **Response:** `{ "status": "ok", "timestamp": "..." }`

---

## Auth

### `POST /api/auth/register`
Tworzy nowe konto. Jeśli w Supabase włączona jest weryfikacja emaila, `session` będzie `null` — użytkownik musi kliknąć link w mailu przed pierwszym logowaniem.
- **Auth:** none
- **Used by:** wtyczka, dashboard
- **Body:**
```json
{
  "email": "jan@example.com",
  "password": "minimalnie8znaków",
  "display_name": "Jan Kowalski"
}
```
- **Response `201`:**
```json
{
  "user": { "id": "uuid", "email": "jan@example.com" },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_in": 3600
  },
  "email_confirmation_required": false
}
```
- **Errors:** `400` validation / email already taken

---

### `POST /api/auth/login`
Logowanie email + hasło. Zwraca tokeny do użycia w nagłówku `Authorization`.
- **Auth:** none
- **Used by:** wtyczka, dashboard
- **Body:**
```json
{ "email": "jan@example.com", "password": "hasło" }
```
- **Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user": { "id": "uuid", "email": "jan@example.com" }
}
```
- **Errors:** `400` validation, `401` wrong credentials / email not confirmed

---

### `POST /api/auth/refresh`
Wymienia `refresh_token` na nową parę tokenów. Wywołuj gdy `access_token` wygaśnie (po `expires_in` sekundach).
- **Auth:** none
- **Used by:** wtyczka, dashboard
- **Body:**
```json
{ "refresh_token": "..." }
```
- **Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_in": 3600
}
```
- **Errors:** `401` invalid/expired refresh token

---

### `POST /api/auth/logout`
Unieważnia sesję po stronie Supabase. Po wywołaniu klient powinien wyrzucić oba tokeny z pamięci.
- **Auth:** required
- **Used by:** wtyczka, dashboard
- **Body:** brak
- **Response:** `204 No Content`

---

### `POST /api/auth/reset-password`
Wysyła email z linkiem do resetu hasła. Zawsze zwraca `204` — nie ujawnia czy podany email istnieje w systemie.
- **Auth:** none
- **Used by:** dashboard
- **Body:**
```json
{ "email": "jan@example.com" }
```
- **Response:** `204 No Content`

---

## Profile

### `GET /api/auth/me`
Zwraca tożsamość zalogowanego użytkownika + profil z `user_profiles`.
- **Auth:** required
- **Used by:** wtyczka, dashboard
- **Response:**
```json
{
  "user": { "id": "uuid", "email": "jan@example.com" },
  "profile": {
    "id": "uuid",
    "display_name": "Jan Kowalski",
    "avatar_url": null,
    "preferences": {},
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### `PATCH /api/auth/me`
Aktualizuje `display_name` i/lub `preferences`.
- **Auth:** required
- **Used by:** dashboard
- **Body:**
```json
{
  "display_name": "Jan Kowalski",
  "preferences": { "language": "pl", "notifications": true }
}
```
- **Response:** zaktualizowany rekord `user_profiles`
- **Errors:** `400` validation, `500` db error
