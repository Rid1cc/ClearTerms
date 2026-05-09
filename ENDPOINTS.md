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

---

## Scan

### `POST /api/scan`
Pełna analiza strony — kluczowy endpoint. Odpowiada: "Co ta strona o mnie zbiera i czy mogę jej zaufać?"

**Flow:**
1. URL jest normalizowany (lowercase host, strip portu, strip UTM-ów, strip fragmentu) i hashowany SHA-256.
2. Cache w `scanned_sites`:
   - **`last_analyzed_at < SCAN_CACHE_TTL_HOURS` (domyślnie 24h):** zwracamy werdykt z bazy, BEZ wołania AI. `cached: true`.
   - **starsze lub brak:** wołamy serwis AI (`AI_SERVICE_URL`), zapisujemy nowy werdykt + analizę polityki + audyt firmy, zwracamy świeży werdykt. `cached: false`.
3. Każdy skan loguje wpis do `scan_history` (`triggered_refresh: true` jeśli ten skan zainicjował refresh).
4. **Fallback:** jeśli AI niedostępne lub timeout (`AI_SCAN_TIMEOUT_MS`), zwracamy minimalny werdykt z `verdict: "unknown"` i `partial: true`. Wtyczka może wtedy pokazać "wynik niepewny".

- **Auth:** required
- **Used by:** wtyczka, dashboard
- **Body:**
```json
{
  "url": "https://example.com",
  "dom_content": "<html>...</html>"
}
```
`dom_content` jest opcjonalne — wtyczka może je dostarczyć aby AI nie musiało scrapować strony samo (limit 500 KB).

- **Response `200`:**
```json
{
  "url": "https://example.com",
  "verdict": "suspicious",
  "score": 42,
  "summary": "Strona zbiera szeroki zakres danych osobowych...",
  "data_collected": ["email", "phone", "gps_location"],
  "red_flags": [
    "Sprzedaż danych firmom trzecim bez wyraźnej zgody",
    "Brak opcji usunięcia konta"
  ],
  "company": {
    "name": "Example Corp",
    "headquarters_country": "US",
    "website": "https://example.com",
    "description": "...",
    "data_processing_countries": ["US", "IN", "PH"]
  },
  "company_audit": {
    "known_breaches": 2,
    "regulatory_fines": 1,
    "incidents_timeline": [ { "date": "...", "title": "...", "severity": "high" } ],
    "sources": [ "https://..." ],
    "reliability_score": 38
  },
  "privacy_policy": {
    "short_summary": "...",
    "key_clauses": [ { "title": "...", "description": "...", "severity": "high" } ],
    "sells_data_to_third_parties": true,
    "transfers_outside_eea": true,
    "allows_account_deletion": false,
    "raw_policy_url": "https://example.com/privacy",
    "language": "en"
  },
  "last_analyzed_at": "2026-05-09T12:00:00Z",
  "cached": false
}
```

Pola mogą być `null` jeśli AI nie zwróciło danych (np. strona bez wykrywalnej polityki prywatności, świeża domena bez audytu). `partial: true` jest dodawane gdy zadziałał fallback heurystyczny.

- **Errors:** `400` validation / invalid URL, `401` brak/zły token, `500` błąd zapisu do bazy

---

## Groups

Wszystkie endpointy w tej sekcji wymagają `Authorization: Bearer ...`. Role: `admin`, `member`, `child`. Twórca grupy automatycznie zostaje administratorem.

### `POST /api/groups`
Tworzy nową grupę. Wywołujący zostaje administratorem.
- **Body:**
```json
{ "name": "Rodzina Kowalskich", "description": "Kontrola rodzicielska" }
```
- **Response `201`:** rekord grupy + `role: "admin"`
- **Errors:** `400` validation, `500` db error

---

### `GET /api/groups`
Lista grup, do których należy użytkownik.
- **Response:**
```json
{
  "groups": [
    { "id": "uuid", "name": "...", "description": "...", "invite_code": "...",
      "role": "admin", "joined_at": "...", "created_at": "...", "updated_at": "..." }
  ]
}
```

---

### `GET /api/groups/:id`
Szczegóły grupy. Tylko dla członków.
- **Response:** rekord grupy + `role`
- **Errors:** `404` jeśli nie jest członkiem

---

### `PATCH /api/groups/:id`
Aktualizacja `name`/`description`. **Admin only.**
- **Body:** `{ "name"?: "...", "description"?: "..." }`
- **Errors:** `403` non-admin, `404` not found

---

### `DELETE /api/groups/:id`
Usuwa grupę (cascade na członkostwa, zaproszenia, alerty). **Admin only.**
- **Response:** `204`

---

### `GET /api/groups/:id/members`
Lista członków grupy z profilami. Widoczne dla każdego członka.
- **Response:**
```json
{
  "members": [
    { "user_id": "uuid", "role": "child", "joined_at": "...",
      "profile": { "display_name": "...", "avatar_url": null } }
  ]
}
```

---

### `PATCH /api/groups/:id/members/:userId`
Zmiana roli członka. **Admin only.** Nie pozwala zdjąć roli admina ostatniemu administratorowi.
- **Body:** `{ "role": "admin" | "member" | "child" }`
- **Errors:** `400` last admin, `403` non-admin, `404` member not found

---

### `DELETE /api/groups/:id/members/:userId`
Usuwa członka z grupy. Admin może usunąć każdego, użytkownik może usunąć siebie. Ostatni admin nie może opuścić grupy bez powołania innego.
- **Response:** `204`
- **Errors:** `400` last admin, `403` non-admin & non-self, `404` not found

---

### `POST /api/groups/:id/invite-code`
Generuje (lub rotuje) wspólny kod zaproszenia grupy. **Admin only.**
- **Response:** `{ "invite_code": "abc123..." }`

---

### `DELETE /api/groups/:id/invite-code`
Wyłącza wspólny kod zaproszenia. **Admin only.**
- **Response:** `204`

---

### `POST /api/groups/join`
Dołączanie do grupy przez wspólny kod (rola: `member`).
- **Body:** `{ "invite_code": "abc123..." }`
- **Response `201`:** `{ "group_id": "uuid", "role": "member" }`
- **Response `200`:** `{ "group_id": "uuid", "role": "...", "already_member": true }` — jeśli już był członkiem
- **Errors:** `404` invalid code

---

### `POST /api/groups/:id/invitations`
Tworzy zaproszenie email z indywidualnym tokenem. **Admin only.** Backend zwraca token; wysyłka emaila przez integrację z mailerem (frontend buduje link).
- **Body:**
```json
{ "email": "ann@example.com", "role": "child" }
```
- **Response `201`:**
```json
{
  "id": "uuid",
  "group_id": "uuid",
  "email": "ann@example.com",
  "role": "child",
  "token": "<long-url-safe-token>",
  "status": "pending",
  "expires_at": "...",
  "created_at": "..."
}
```
- **Errors:** `409` jeśli istnieje już pending invite na ten email w tej grupie

---

### `GET /api/groups/:id/invitations`
Lista zaproszeń grupy (wszystkie statusy). **Admin only.**
- **Response:** `{ "invitations": [ ... ] }` (bez tokenów — zwraca `id`, `email`, `role`, `status`, `expires_at`, `accepted_at`, `created_at`)

---

### `DELETE /api/groups/:id/invitations/:invitationId`
Cofa pending zaproszenie (status → `revoked`). **Admin only.**
- **Response:** `204`
- **Errors:** `404` if not pending

---

### `POST /api/invitations/:token/accept`
Akceptacja zaproszenia po tokenie. Email zalogowanego użytkownika musi pasować do emaila z zaproszenia.
- **Auth:** required (zalogowany jako odbiorca zaproszenia)
- **Response `201`:** `{ "group_id": "uuid", "role": "..." }`
- **Response `200`:** `{ "group_id": "uuid", "role": "...", "already_member": true }`
- **Errors:** `403` email mismatch, `410` expired/revoked/accepted, `404` invalid token

---

## Group activity (admin views)

Administrator grupy widzi aktywność członków — rodzic historię skanów dziecka, lider zespołu — pracownika.

### `GET /api/groups/:id/members/:userId/scan-history`
Historia skanów członka grupy. **Admin only.**
- **Query:** `?limit=50&offset=0` (limit max 200)
- **Response:**
```json
{
  "history": [
    { "id": "uuid", "scanned_at": "...", "triggered_refresh": false,
      "site": { "id": "uuid", "url": "...", "domain": "..." },
      "verdict": { "verdict": "suspicious", "score": 42, "summary": "..." } }
  ],
  "limit": 50,
  "offset": 0
}
```

---

### `GET /api/groups/:id/members/:userId/parental-alerts`
Alerty kontroli rodzicielskiej dla konkretnego dziecka. **Admin only.**
- **Response:**
```json
{
  "alerts": [
    { "id": "uuid", "site_url": "...", "event_type": "visit_blocked",
      "details": { ... }, "occurred_at": "...", "acknowledged_at": null }
  ]
}
```
