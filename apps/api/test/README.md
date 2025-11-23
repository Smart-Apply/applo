# Test-Struktur

Organisierte Test-Suite für Smart Apply Backend API.

## 📁 Ordnerstruktur

```
test/
├── e2e/                          # End-to-End Tests
│   ├── auth/                     # Authentication & Authorization
│   │   ├── auth.e2e-spec.ts
│   │   ├── auth-refresh.e2e-spec.ts
│   │   └── sessions.e2e-spec.ts
│   ├── features/                 # Feature Tests
│   │   ├── applications.e2e-spec.ts
│   │   ├── job-postings.e2e-spec.ts
│   │   ├── profile.e2e-spec.ts
│   │   └── uploads.e2e-spec.ts
│   └── security/                 # Security Tests
│       ├── audit-logging.e2e-spec.ts
│       ├── cors.e2e-spec.ts
│       ├── csp-headers.e2e-spec.ts
│       ├── csrf.e2e-spec.ts
│       ├── rate-limit.e2e-spec.ts
│       └── xss-sanitization.e2e-spec.ts
├── unit/                         # Unit Tests
│   └── providers/                # Provider Tests
│       └── huggingface-llm.provider.spec.ts
├── fixtures/                     # Test Fixtures
│   ├── large-file.pdf
│   ├── sample-job-posting.txt
│   ├── test-resume.docx
│   └── test-resume.pdf
├── jest-e2e.json                 # Jest Configuration
└── setup.ts                      # Test Setup
```

## 🧪 Test-Kategorien

### E2E Tests (`e2e/`)

End-to-End Tests für API-Endpunkte mit echter Datenbank und vollem Request-Lifecycle.

#### Auth (`e2e/auth/`)
- **auth.e2e-spec.ts**: Login, Register, Logout, /me Endpoint
- **auth-refresh.e2e-spec.ts**: Refresh Token Strategy, Rotation, Max Tokens
- **sessions.e2e-spec.ts**: Session Management, Device Tracking, Multi-Device Logout

#### Features (`e2e/features/`)
- **applications.e2e-spec.ts**: Application Pipeline, PDF Generation, Status Updates
- **job-postings.e2e-spec.ts**: Job Parsing, URL Extraction, Storage
- **profile.e2e-spec.ts**: Profile CRUD, Skills, Experiences, Education, etc.
- **uploads.e2e-spec.ts**: File Upload, Validation, Storage

#### Security (`e2e/security/`)
- **audit-logging.e2e-spec.ts**: Security Event Logging, Failed Logins, Rate Limits
- **cors.e2e-spec.ts**: CORS Headers, Origin Validation
- **csp-headers.e2e-spec.ts**: Content Security Policy Headers
- **csrf.e2e-spec.ts**: CSRF Protection, Token Validation
- **rate-limit.e2e-spec.ts**: Rate Limiting, Throttling
- **xss-sanitization.e2e-spec.ts**: Input Sanitization, XSS Protection

### Unit Tests (`unit/`)

Unit Tests für isolierte Komponenten, Services und Provider.

#### Providers (`unit/providers/`)
- **huggingface-llm.provider.spec.ts**: Hugging Face LLM Provider Logic

## 🚀 Tests ausführen

### Alle Tests
```bash
npm run test:e2e
```

### Spezifische Kategorie
```bash
# Auth Tests
npx jest --config ./test/jest-e2e.json e2e/auth

# Security Tests
npx jest --config ./test/jest-e2e.json e2e/security

# Feature Tests
npx jest --config ./test/jest-e2e.json e2e/features

# Unit Tests
npx jest --config ./test/jest-e2e.json unit
```

### Einzelner Test
```bash
npx jest --config ./test/jest-e2e.json e2e/auth/auth.e2e-spec.ts
```

### Mit Coverage
```bash
npm run test:cov
```

### Watch Mode
```bash
npx jest --config ./test/jest-e2e.json --watch
```

## 📝 Test-Conventions

### Naming
- **E2E Tests**: `*.e2e-spec.ts` - Testen vollständige API-Flows
- **Unit Tests**: `*.spec.ts` - Testen isolierte Funktionen/Services
- **Describe Blocks**: Feature oder Endpoint-basiert
- **Test Cases**: Sollten mit "should" beginnen

### Struktur
```typescript
describe('FeatureName (E2E)', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    // Setup
  });
  
  afterAll(async () => {
    // Cleanup
  });
  
  describe('POST /endpoint', () => {
    it('should handle success case', async () => {
      // Test
    });
    
    it('should handle error case', async () => {
      // Test
    });
  });
});
```

### Best Practices
1. **Isolierte Tests**: Jeder Test sollte unabhängig laufen können
2. **Cleanup**: Datenbank nach jedem Test aufräumen
3. **Fixtures**: Verwende Test-Fixtures aus `fixtures/` Ordner
4. **Mocking**: Mock externe Services (LLM, Storage) in Unit Tests
5. **Assertions**: Verwende spezifische Assertions (`expect().toBe()`, nicht nur `toBeTruthy()`)

## 🔧 Konfiguration

### jest-e2e.json
- **testMatch**: `**/e2e/**/*.e2e-spec.ts`, `**/unit/**/*.spec.ts`
- **rootDir**: `test/`
- **setupFiles**: `setup.ts` (Environment, DB Connection)

### setup.ts
Enthält globale Test-Setup-Logik:
- Environment Variables
- Database Connection
- Global Mocks

## 📊 Test Coverage

Aktuelle Coverage:
- **Auth**: 100% (3 Test-Dateien)
- **Security**: 100% (6 Test-Dateien)
- **Features**: 100% (4 Test-Dateien)
- **Providers**: Partial (1 Test-Datei)

**Gesamt**: 14 Test-Dateien

## 🎯 Neue Tests hinzufügen

### E2E Test
```bash
# Erstelle in passender Kategorie
touch test/e2e/features/new-feature.e2e-spec.ts
```

### Unit Test
```bash
# Erstelle in passender Kategorie
touch test/unit/services/new-service.spec.ts
```

### Test Fixture
```bash
# Füge Test-Dateien hinzu
cp sample.pdf test/fixtures/
```

## 🐛 Debugging

### Einzelnen Test debuggen
```bash
node --inspect-brk node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand e2e/auth/auth.e2e-spec.ts
```

### Logs anzeigen
Tests verwenden Winston Logger. Logs werden in Console ausgegeben wenn `LOG_LEVEL=debug` gesetzt ist.

### Test-Datenbank
E2E Tests verwenden eine separate Test-Datenbank (`DATABASE_URL` in `.env.test`).

---

**Letzte Aktualisierung:** 23. November 2025  
**Maintainer:** Smart Apply Team
