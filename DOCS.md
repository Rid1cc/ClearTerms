# ClearTerms — Rozszerzona Dokumentacja Techniczna

> Platforma uświadamiająca o zagrożeniach prywatności, która tłumaczy techniczny i prawny żargon na ludzki język przy użyciu AI.
> 
> **Faza Projektu:** Hackathon Prototype / MVP
> **Core Stack:** Fastify + Supabase (Postgres) · Next.js 16 (React 19) · Chromium MV3 Extension

---

## 1. Executive Summary (Podsumowanie)

ClearTerms to innowacyjne rozwiązanie mające na celu zasypanie przepaści między skomplikowanymi zagrożeniami prywatności a przeciętnym użytkownikiem internetu. Wykorzystując przeglądarkowe rozszerzenie działające w czasie rzeczywistym oraz zintegrowane mechanizmy Sztucznej Inteligencji (LLM) wspierane przez deterministyczne silniki heurystyczne, aplikacja automatycznie analizuje odwiedzane witryny, ich polityki prywatności oraz zasady przetwarzania danych.

Niniejsza dokumentacja jest przeznaczona dla sędziów hackathonu, programistów oraz inżynierów testujących projekt. Znajdziesz w niej kompletną architekturę, nasze decyzje inżynieryjne skoncentrowane na bezpieczeństwie (Privacy by Design), model bazodanowy oraz szczegółowe procedury wdrożeniowe.

---

## 2. Architektura Systemu

System opiera się na rozproszonej, modularnej architekturze z trzema niezależnymi komponentami, które wspólnie korzystają ze scentralizowanej bazy PostgreSQL.

```text
┌─────────────────────┐     POST /api/scan         ┌────────────────────┐
│   Browser Extension │ ─────────────────────────► │   Fastify Backend  │
│   (Manifest V3)     │ ◄───────────────────────── │   (Node 20 + TS)   │
└─────────────────────┘     verdict + score        └─────────┬──────────┘
         │                                                   │ auth & data
         ▼ blocks/warns UX                                   ▼
┌─────────────────────┐     fetch /api/dashboard   ┌────────────────────┐
│   Web Dashboard     │ ─────────────────────────► │  Supabase DB       │
│   (Next.js 16 RSC)  │ ◄───────────────────────── │  (Postgres + RLS)  │
└─────────────────────┘     dashboard JSON         └────────────────────┘
```

### 2.1. Przykładowy Przepływ: Analiza Strony WWW
1. **Trigger (Wyzwalacz)**: Użytkownik wchodzi na podany adres URL. Service Worker extensiona wykrywa to zdarzenie.
2. **Ekstrakcja (Content Script)**: Skrypt wstrzyknięty w stronę analizuje DOM w poszukiwaniu polityki prywatności oraz metadanych witryny.
3. **Orkiestracja**: Rozszerzenie przesyła żądanie do endpointu `/api/scan` na backendzie.
4. **Weryfikacja Cache**: Backend za pomocą zoptymalizowanego hasha SHA-256 sprawdza, czy domena była skanowana w ciągu ostatnich 24 godzin (`SCAN_CACHE_TTL_HOURS`).
5. **Przetwarzanie AI**: Jeśli brak cache, uruchamiana jest integracja AI (lokalne API Proxy lub zew. usługi), generująca wynik (`verdict`), punktację (`score 0-100`) i podsumowanie uchybień.
6. **Zapis i Odpowiedź**: Rezultat jest zapisywany w bazie (omija ograniczenia RLS dzięki `service_role`), a znormalizowana odpowiedź wraca do rozszerzenia.
7. **Reakcja UX**: Rozszerzenie aktualizuje swój stan i w zależności od rezultatu wyświetla użytkownikowi ostrzeżenie/blokadę o odpowiednim zabarwieniu (np. `suspicious`, `phishing`).

---

## 3. Wybór Technologii (Tech Stack)

### 3.1. Infrastruktura i Backend
* **Fastify (Node.js 20, TypeScript)**: Wybrany ze względu na swoją wydajność, minimalny narzut i świetny system pluginów. Odpowiada za orkiestrację całego ruchu i komunikację z bazą. Wszystkie schematy walidowane są przez bibliotekę `zod`.
* **Supabase (PostgreSQL + Auth)**: Służy jako serce danych. Wykorzystujemy jego mechanizmy JWT do uwierzytelniania, a wbudowane Row Level Security (RLS) gwarantuje izolację danych użytkowników w warstwie bazy.

### 3.2. Dashboard (Aplikacja Webowa)
* **Next.js 16 (React 19, RSC)**: Nowoczesny framework oparty o React Server Components. Zapewnia optymalną wydajność i mniejszy rozmiar bundla przesyłanego do przeglądarki.
* **Tailwind CSS v4 & Recharts**: Pozwalają na bardzo szybki development i budowę zaawansowanych, interaktywnych wykresów w panelu analitycznym.

### 3.3. Browser Extension (Wtyczka)
* **Manifest V3 (Vanilla JS)**: Gwarantuje zgodność z najnowszymi standardami bezpieczeństwa Chrome Web Store, unikając przy tym ciężaru wielkich frameworków frontendowych w samym rozszerzeniu. Używamy Service Workerów (background.js) do komunikacji oraz Content Skryptów do interakcji z DOM-em odwiedzanej strony.

---

## 4. Innowacje Inżynieryjne ("Wow Factors")

Projekt obfituje w zaawansowane rozwiązania pokazujące głębokie zrozumienie wyzwań cybersecurity i prywatności. Te punkty powinny być silnie podkreślone podczas pitchingu.

### 4.1. Deterministyczny Fallback Heurystyczny
Zewnętrzne usługi AI (np. OpenAI, Gemini) regularnie zmagają się z opóźnieniami (latency) i limitami zapytań.
* **Rozwiązanie:** Wdrożyliśmy niestandardowy mechanizm Fallbacku. Jeśli integracja z AI nie odpowie w ciągu dopuszczalnego czasu (np. 30s) lub zwróci błąd, backend przejmuje zapytanie.
* **Działanie:** Wykorzystuje heurystykę i wyrażenia regularne, wykrywając podejrzane TLD (np. `.ru`, `.cn`, `.zip`), zbyt dużą liczbę parametrów śledzących w URL oraz surowe adresy IP.
* Zwraca wynik `partial: true`, pozwalając rozszerzeniu na płynną zmianę stanu bez zawieszania aplikacji.

### 4.2. Detekcja Wycieków "Privacy-First" (Meta-logowanie)
Jak śledzić, czy dane użytkownika wyciekły na podejrzanej stronie, bez jednoczesnego zagrażania jego prywatności archiwizując same wartości?
* **Rozwiązanie:** Zbieramy wyłącznie metadane. Mechanizmy we wtyczce przechwytują pola formularzy (hasła, e-maile, dane karty kredytowej) i klasyfikują je w *kategorie*.
* Do endpointu `/api/submitted-data` wysyłane są tylko tagi (np. `["EMAIL", "PASSWORD"]`) oraz adres URL formy. **Prawdziwe dane nigdy nie opuszczają przeglądarki.**

### 4.3. Pipeline Retroaktywnych Alertów o Wyciekach (Retroactive Leaks)
Co się dzieje, jeśli ktoś założy konto na rzetelnie wyglądającej stronie w Poniedziałek, a w Środę zacznie ona wyłudzać dane i straci reputację?
* **Rozwiązanie:** Za każdym razem, gdy AI zmienia `verdict` domeny na niebezpieczny (`phishing`, `suspicious`), na backendzie uruchamia się funkcja `backfillLeakAlertsForSite`.
* Asynchronicznie przeskakuje on po logach metadanych historycznych sesji użytkowników. Każdy z użytkowników, na którego logu znajdą się ślady wysłania danych do tej podejrzanej już po czasie domeny, natychmiastowo otrzymuje Alert Bezpieczeństwa widoczny w jego Web Dashboardzie.

### 4.4. Backend-Driven Writes & Defense-in-Depth (RLS)
Klasyczne aplikacje Supabase po prostu piszą z przeglądarki prosto do bazy z autoryzacją po API konfigurowanej w RLS. W rozwiązaniu Enterprise Security to podejście ma bardzo słabą sterowalność dla reguł biznesowych.
* U nas pisze do bazy tylko Fastify przy użyciu trybu uprzywilejowanego (`service_role`), byśmy mieli pełną kontrolę nad zdarzeniami ubocznymi takimi jak punkt 4.3.
* Jednakże – z poziomu Bazy Danych nadal obowiązuje silne reguły RLS na wszystkich tabelach dla poszczególnych requestów zapytania użytkowników (Defense-in-depth). Posiadając sam token nikt nie może czytać niczego poza swoimi limitami!

---

## 5. Model Bezpieczeństwa i Reprezentacja Danych

Relacyjna baza danych została starannie zaprojektowana do obsługi masowej ilości odczytów logów i powiadomień. Poniżej omówienie najważniejszych struktur:

### 5.1. Tabele Głównych Bytów
* **`auth.users` / `user_profiles`**: Podstawowy profil logującego się użytkownika rozszerzony przez automatyczne triggery Postgres nasłuchujące operacji Auth.
* **`groups` & `group_members`**: Moduł wspierający aplikacje B2B Enterprise (Organizacja) i nadzór rodzicielski. Grupa pozwala zrzeszać członków według uprawnień (`admin`, `member`, `child`).
* **`scanned_sites` & `site_verdicts`**: Globalne repozytorium odwiedzonych witryn. Mechanizmy wymuszają tylko jednen oficjalny "Werdykt" na witrynę w odpowiednim cyklu. Pełni bazę całego logu i mechanizmu weryfikacyjnego.
* **`scan_history`**: Tabela asocjacyjna. Log, trzymająca w rejestrze informację o tym "Kto, Kiedy odwiedził Daną Stronę", dzięki czemu frontend może z dużą precyzją wyrysować Dashboard.
* **`submitted_data_log` & `leak_alerts`**: Główne tabele przechowujące zasygnalizowane próby wycieku (patrz Pkt 4.2).

### 5.2. RBAC (Role-Based Access Control)
W systemie na backendzie obowiązuje ścisły restrykcyjny model kontroli ról oparty o członkostwo Grupowe. Skrypty używają helpera `getMembership(groupId, userId)`, zanim cokolwiek z bazy udostępnią użytkownikom, w dodatku system ma zabezpieczenie uniemożliwiające usunięcie ostatniego Admina w przedsiębiorstwie by zapobiec tzw. soft-lockom.

---

## 6. Endpoiny / Architektura API

Aplikacja ma udokumentowane ponad 25 endpointów podzielonych ze względu na domeny. Standardowy cykl wyklucza ruch nieautoryzowany oprócz procesów rejestracji logowania – wszystko działa z JWT standardem `Bearer`.

| Domena | Metoda | Rozszerzenie | Cel Endpointu | Auth |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/auth/login` | Wykonuje operacje autoryzacyjne, wystawia Access i Refresh Tokeny. | Brak |
| | GET | `/api/auth/me` | Informacje o własnym profilu. | Tak |
| **Scan** | POST | `/api/scan` | Trigger do analizy (AI lub Heurystyka lub Cache). | Tak |
| | POST | `/api/scan/extension-result` | Synchronizacyjne okienko od rozszerzenia posiadającego samodzielny wynik lokalny na pokładzie przeglądarki. | Tak |
| **Leaks** | POST | `/api/submitted-data` | Wchodzi event Logowania Formularzowych danych wg klas i regexu bez podawania inputu "własnościowego". | Tak |
| | GET | `/api/leaks/me` | Pagowana oś zdarzeń Alertów bezpieczeństwa użytych w Panelu WWW. | Tak |
| **Stats** | GET | `/api/dashboard/stats` | Skumulowane wyliczenia i optymalne pobranie wszystkich danych dla złożonych dashboardów Recharts do wdrożeń panelu WEB. | Tak |

---

## 7. Przewodnik Deweloperski (Local Setup)

### 7.1. Wymagania Środowiska
* Node.js v20+
* Supabase Account z dostępną dedykowaną pod projekt Bazą (PostgreSQL)
* Trzeba zaimplementować tzw DDL SQL z pliku `database.txt` w środowisku zapytań Supabase.

### 7.2. Konfiguracja `.env`
W folderze `/backend` utwórz plik `.env` na podstawie pliku wzorcowego. 
Przykładowy szablon:
```ini
SUPABASE_URL=https://<twój-projekt-sup>.supabase.co
SUPABASE_ANON_KEY=eyJhb...
# Sekrecik serwerowy absolutnie nie powinien trafić do FEu (zastępstwo admin)
SUPABASE_SERVICE_ROLE_KEY=eyJhb... 
PORT=3001
CORS_ORIGINS=http://localhost:3000
AI_SCAN_TIMEOUT_MS=30000
SCAN_CACHE_TTL_HOURS=24
```

### 7.3. Bootstrapping i Seedy
W celu najlepszego przetestowania Dashboardu konieczne jest odpalenie skryptu zraszającego, tzw "Mega Seedu". Używa algorytmów pseudolosowych do deterministycznego wygenerowania 16 użytkowników, tysięcy stron i fałszywych logów, co natychmiast ożywi panele!

```bash
cd backend
npm install
npm run seed  # Wypełnia całą zdefiniowaną wyżej Bazę przykładowymi danymi i upewnia demówki.
npm run dev   # Podnosi port :3001 -> Logujemy się w dev.
```
*Wartościowe Konto Demo z Uprawnieniami:* `ceo@company.com` (Hasło: `Password123!`)  

### 7.4. Panel Dashboardu
```bash
cd frontend
npm install
# API bazowe zaciąga się standardowo z loclahosta portu:3001 (Można to spatchować w dotenvie FE jeśli backend jest wystawiony indziej)
npm run dev   # Podnosi Next.js port: 3000
```

### 7.5. Dodawanie the Rozszerzenia
By testować bezpośrednio moduł manifestowy: Wchodzisz w Chromium w ustawienia `chrome://extensions/`, **Włączasz tryb dewelopera**, A następnie ładujesz odpakowane po czym zaznaczasz folder repozycyjny: `/wtyczka`.

---

## 8. Workflow na "PITCH" (Przewodnik po zrobieniu Demo na Hackathonie)

W czasie krótkiego przemówienia zastosujcie tzw. strukturę demonstracji "Problem-Działanie-Profilaktyka". Wybierzcie sobie idealnie zadaną ścieżkę do poprowadzenia przed obieracami sędziowskimi!

1. **Demonstracja Problemu (Edukacyjna)**: Wejdź na serwis znany z dramatycznie trudnej polityki Prywatności, niech widownia zobaczy ile zajmuje zrozumienie jej założeń normalnej jednostce użytkującej technologię.
2. **Aktywna Naprawa**: Pokaż kliknięcie Extensiona, skanowanie AI wykonane migiem oraz jak algorytm tłumaczy potężny żargon z polityk w proste bulet pointowe punkty.
3. **Zapobieganie i Meta Logowanie**: Znajdź przykładową stronę podstawionego fałszywego SCAM-Phishingu. Udajemy złapanie użytkownika naiwnego na klik podawając prawdziwe hasło. Zrób na Extension skan bezpieczeństwa by ujawnić mechanikę heurystyczną i spryt z `Privacy-First-Tracking`.
4. **Wizualizacja Przedsiębiorstawa**: Udaj się na przeglądający panel www. `localhost:3000`, logując jako `ceo@company.com`. Podnieś walory panelu, opowiedz na temat agregacji a następnie wpadnijcie na sekcję **LEAKS** gdzie wywołało się w punkcie 3. Ostatnie złudzenie Phishingowe - ukazując jak Retroaktywne Alerty mogą realnie i bezkolizyjnie po cichu dbać o użytkownika z poziomu bazy danych. Działanie które po ludzku budzi realny respekt!

*`ClearTerms: Bridging the gap between technological complexity and human comprehension.`*
