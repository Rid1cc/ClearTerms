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

## Dashboard

Endpointy zwracające zagregowane dane do dashboardu webowego. Wszystkie wymagają auth, dane są scoped do zalogowanego użytkownika.

### `GET /api/dashboard/stats`
Top-line counters dla dashboardu — liczby skanów, breakdown werdyktów, otwarte alerty.
- **Query:** `?days=30` (1–365, default 30) — okno czasowe dla pól `*_in_window`
- **Response:**
```json
{
  "window_days": 30,
  "total_scans": 1284,
  "scans_in_window": 412,
  "unique_sites_in_window": 187,
  "verdict_breakdown": { "safe": 380, "suspicious": 27, "phishing": 5, "unknown": 0 },
  "threats_in_window": 32,
  "open_leak_alerts": 2,
  "open_parental_alerts_as_admin": 5
}
```
`open_parental_alerts_as_admin` liczy alerty we wszystkich grupach gdzie zalogowany jest adminem; 0 jeśli nie jest adminem nigdzie.

---

### `GET /api/dashboard/scan-history`
Paginowana historia własnych skanów.
- **Query:**
  - `limit` (max 200, default 50), `offset` (default 0)
  - `verdict` — filtr po werdykcie (`safe` | `suspicious` | `phishing` | `unknown`)
- **Response:**
```json
{
  "history": [
    {
      "id": "uuid",
      "scanned_at": "...",
      "triggered_refresh": false,
      "site": { "id": "uuid", "url": "...", "domain": "..." },
      "verdict": { "verdict": "suspicious", "score": 42, "summary": "..." }
    }
  ],
  "total": 1284,
  "limit": 50,
  "offset": 0
}
```

---

### `GET /api/dashboard/top-threats`
Top zagrożenia (`phishing` / `suspicious`) z ostatnich N dni — domeny które użytkownik najczęściej odwiedzał.
- **Query:** `?days=30&limit=10`
- **Response:**
```json
{
  "window_days": 30,
  "threats": [
    {
      "site_id": "uuid",
      "url": "https://shady.example/login",
      "domain": "shady.example",
      "verdict": "phishing",
      "score": 12,
      "summary": "...",
      "encounters": 7
    }
  ]
}
```
Sortowanie: phishing > suspicious, potem `encounters` desc, potem `score` asc.

---

### `GET /api/dashboard/data-map`
Mapa sprzedaży danych — agregacja: do jakich krajów / firm trafiły dane użytkownika. Łączy `submitted_data_log` z `scanned_sites → companies` i krajami przetwarzania z `site_verdicts.data_processing_countries`.

- **Response:**
```json
{
  "countries": [
    {
      "country": "US",
      "total_submissions": 12,
      "data_categories": ["email", "phone", "password"],
      "companies": [
        {
          "company_id": "uuid",
          "name": "Example Corp",
          "headquarters_country": "US",
          "site_count": 3,
          "data_categories": ["email", "phone"],
          "submission_count": 8
        }
      ]
    }
  ]
}
```
Dla każdej submisji liczymy ją do każdego kraju z listy `headquarters_country` ∪ `data_processing_countries`. Strony bez znanej firmy/krajów lądują w bukcie `"UNKNOWN"`.

---

## Companies

### `GET /api/companies/:id/audit`
Pełen audyt firmy — oś czasu incydentów, licznik wycieków, źródła + lista podpiętych domen. Dane publiczne dla zalogowanych.
- **Response:**
```json
{
  "company": {
    "id": "uuid",
    "name": "Example Corp",
    "headquarters_country": "US",
    "website": "https://example.com",
    "description": "..."
  },
  "audit": {
    "known_breaches_count": 2,
    "regulatory_fines_count": 1,
    "incidents_timeline": [
      { "date": "2023-08-01", "title": "...", "description": "...", "severity": "high", "source_url": "..." }
    ],
    "sources": ["https://..."],
    "reliability_score": 38,
    "last_researched_at": "..."
  },
  "sites": [
    { "id": "uuid", "url": "https://example.com", "domain": "example.com" }
  ]
}
```
- **Errors:** `404` company not found

---

## Leak detection

> **Bezpieczeństwo:** backend NIGDY nie przyjmuje i nie zapisuje wartości wpisanych przez użytkownika. Tylko **kategorie** (np. `email`, `password`). Hasło użytkownika nigdy nie opuszcza jego przeglądarki.
>
> Schema `submittedDataSchema` używa `.strict()` — każde nieznane pole w body wywala 400, więc payload nie może przemycić wartości.

Jak działa wykrywanie wycieków:
1. Wtyczka monitoruje formularze i przy submit wysyła `POST /api/submitted-data` z listą **kategorii** danych.
2. Backend zapisuje wpis do `submitted_data_log`.
3. Gdy `/api/scan` ustawia werdykt `phishing` lub `suspicious` dla strony → backend cofa się po historii `submitted_data_log` i tworzy `leak_alerts` dla każdego użytkownika który tam coś wpisał (idempotentnie — dedup po `submitted_data_log_id`).
4. Jeśli strona JEST już znana jako phishing/suspicious gdy user submituje dane — alert powstaje natychmiast.

### `POST /api/submitted-data`
Wtyczka loguje co użytkownik wpisał w formularz — **tylko kategorie**.
- **Auth:** required
- **Used by:** wtyczka
- **Body:**
```json
{
  "url": "https://example.com/login",
  "data_categories": ["email", "password"]
}
```
Allowed kategorie: `email` | `password` | `phone` | `full_name` | `address` | `date_of_birth` | `national_id` | `credit_card` | `bank_account` | `gps_location` | `ip_address` | `device_id` | `biometric` | `photo` | `browsing_history` | `contacts` | `other`.

- **Response `201`:**
```json
{
  "id": "uuid",
  "submitted_at": "2026-05-09T12:00:00Z",
  "alerted": true
}
```
`alerted: true` oznacza że strona jest już znana jako phishing/suspicious i alert wyciekowy powstał natychmiast.

- **Errors:** `400` validation, **`400` jeśli payload zawiera nieznane pola** (anti-leak guard), `401` brak/zły token

---

### `GET /api/leaks/me`
Lista wycieków zalogowanego użytkownika.
- **Auth:** required
- **Query:**
  - `acknowledged` — `true` / `false` (filtruj)
  - `limit` (max 200, default 50), `offset`
- **Response:**
```json
{
  "leaks": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "site_url": "https://...",
      "data_categories": ["email", "password"],
      "severity": "critical",
      "message": "30 października przekazałeś tej stronie email i hasło. Strona jest phishingowa — Zmień hasło wszędzie gdzie używasz tego samego.",
      "detected_at": "...",
      "acknowledged_at": null
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

`severity`:
- `critical` — wpisane: `password`, `credit_card`, `bank_account`, `national_id`, `biometric`
- `high` — ≥2 dane osobowe (email/phone/name/dob/address)
- `medium` — pojedyncza dana osobowa
- `low` — tylko techniczne / mało wrażliwe

---

### `POST /api/leaks/:alertId/acknowledge`
Oznacza alert jako przejrzany (user już zmienił hasło / zignorował).
- **Auth:** required
- **Response:** `{ "id": "uuid", "acknowledged_at": "..." }`
- **Errors:** `404` not found / już ack'd

---

## Phishing block

### `GET /api/check-url`
Szybki blacklist-lookup zoptymalizowany pod niskie opóźnienie. Wtyczka woła ten endpoint **przed** załadowaniem strony, więc nie wykonuje pełnej analizy AI — tylko jeden indexed read.

Sprawdza:
- dokładny URL hash w `phishing_blacklist`
- albo blokadę całej domeny

Tylko wpisy `is_active = true` i niewygasłe (`expires_at IS NULL OR expires_at > now()`).

Zewnętrzne źródła (Google Safe Browsing, PhishTank, AI, user reports) są synchronizowane do `phishing_blacklist` przez osobny worker — endpoint nie woła ich on-demand, bo dodatkowe round-tripy zabiłyby latency.

**Fail-open:** jeśli zapytanie do bazy padnie, zwracamy `{ blocked: false }`. Pełna analiza i tak idzie przez `/api/scan`.

- **Auth:** required
- **Used by:** wtyczka (pre-flight przed każdą stroną)
- **Query:** `?url=https://podejrzana.com`
- **Response (czysta):** `{ "blocked": false }`
- **Response (zablokowana):**
```json
{
  "blocked": true,
  "reason": "Reported as credential phishing",
  "source": "google_safe_browsing"
}
```
`source` to enum `phishing_source`: `google_safe_browsing` | `phishtank` | `internal_ai` | `user_report`.

- **Errors:** `400` validation / invalid URL, `401` brak/zły token

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
  "dom_content": "<html>...</html>",
  "prefer_stale": false
}
```
`dom_content` jest opcjonalne — wtyczka może je dostarczyć aby AI nie musiało scrapować strony samo (limit 500 KB).

`prefer_stale` (default `false`) włącza tryb **stale-while-revalidate**: gdy strona ma poprzedni werdykt starszy niż TTL, backend zwraca stary werdykt natychmiast z `stale: true` i odpala odświeżenie w tle. Bez tego flagu (default) klient czeka na świeży werdykt synchronicznie. Sugerowane użycie:
- wtyczka przeglądarkowa: `prefer_stale: true` (instant feedback, brak długiego spinnera)
- "Rescan" w dashboardzie: `prefer_stale: false` (użytkownik chce świeże dane)

Background-refresh jest debounce'owany per site — równoczesne stale-requesty dla tej samej strony nie kickują kilku analiz.

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

Pola mogą być `null` jeśli AI nie zwróciło danych (np. strona bez wykrywalnej polityki prywatności, świeża domena bez audytu).

Flagi w response:
- `cached: true` — werdykt pobrany z bazy bez wołania AI
- `stale: true` — werdykt jest przeterminowany, ale klient prosił o `prefer_stale`; w tle leci refresh
- `partial: true` — zadziałał fallback heurystyczny (AI niedostępne lub timeout)

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

---

## Parental controls

Alerty są generowane automatycznie gdy użytkownik z rolą `child` w jakiejś grupie:
- trafi na stronę z werdyktem `phishing` (`event_type: visit_attempted`)
- trafi na stronę z werdyktem `suspicious` lub score < 40 (`event_type: suspicious_site_visited`)
- spróbuje wejść na URL który `/api/check-url` zwrócił jako blocked (`event_type: visit_blocked`)

Powiadomienia (email/push) są poza scope MVP.

### `GET /api/groups/:id/parental-alerts`
Lista wszystkich alertów grupy (po wszystkich dzieciach). **Admin only.**
- **Query:**
  - `acknowledged` — `true`/`false` (filtruj po stanie ack)
  - `event_type` — `visit_attempted` | `visit_blocked` | `data_submitted_to_phishing` | `suspicious_site_visited`
  - `child_user_id` — UUID konkretnego dziecka
  - `limit` (max 200, default 50), `offset` (default 0)
- **Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "child_user_id": "uuid",
      "site_id": "uuid",
      "site_url": "https://...",
      "event_type": "suspicious_site_visited",
      "details": { "verdict": "suspicious", "score": 28 },
      "occurred_at": "...",
      "acknowledged_at": null,
      "child": { "display_name": "Ania", "avatar_url": null }
    }
  ],
  "total": 14,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/groups/:id/parental-alerts/:alertId/acknowledge`
Oznacza alert jako przejrzany. **Admin only.**
- **Response:** `{ "id": "uuid", "acknowledged_at": "..." }`
- **Errors:** `404` not found / już ack'd

---

### `GET /api/groups/:id/members/:userId/safety-stats`
Statystyki bezpieczeństwa dziecka (lub dowolnego członka). **Admin only.**
- **Query:** `?days=30` (1–365, default 30) — okno czasowe dla statystyk z prefixem `_in_window`
- **Response:**
```json
{
  "window_days": 30,
  "total_scans": 1284,
  "scans_in_window": 412,
  "open_alerts": 3,
  "blocked_in_window": 5,
  "suspicious_in_window": 18,
  "top_risky_domains": [
    { "domain": "shady-deals.example", "count": 7 },
    { "domain": "free-iphone.xyz", "count": 4 }
  ]
}
```
`top_risky_domains` jest agregowane z ostatnich do 500 skanów w oknie i pokazuje domeny z werdyktem `phishing` lub `suspicious`.
