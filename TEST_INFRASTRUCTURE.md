# Test Infrastructure - Quick Reference

## 🚀 Quick Start

```bash
# 1. Setup (one-time)
cd apps/api
npm run test:setup

# 2. Run tests
npm run test:unit          # ✅ Unit tests (100% passing)
npm run test:integration   # Integration tests (with Puppeteer)
npm run test:e2e           # E2E tests (with database)

# 3. Cleanup
npm run test:cleanup
```

## 📊 Current Status

| Test Type | Suites | Tests | Status | Speed |
|-----------|--------|-------|--------|-------|
| Unit | 22/22 | 154/154 | ✅ 100% | ~12s |
| Integration | 3 | 18 | ⚠️ Needs Puppeteer | ~15-30s |
| E2E | 16 | 168 | ⚠️ Needs DB | ~30-60s |

## 🔧 What test:setup Does

1. ✅ Starts PostgreSQL test database (port 5433)
2. ✅ Runs Prisma migrations
3. ✅ Seeds test data
4. ✅ Installs Puppeteer Chrome

## 📦 Test Database

- **Container:** `smartapply-test-db`
- **Port:** 5433 (not 5432)
- **Connection:** `postgresql://postgres:testpass@localhost:5433/smartapply_test`

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run test:setup` | Setup test environment |
| `npm run test:cleanup` | Stop and remove test database |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:all` | Run all tests |

## 🐛 Troubleshooting

**Database connection failed:**
```bash
docker ps | grep smartapply-test-db
docker logs smartapply-test-db
```

**Puppeteer errors:**
```bash
cd apps/api
npx puppeteer install
```

**Port already in use:**
Edit `infra/docker-compose.test.yml` and change port 5433 to another port.

## 📝 Notes

- Unit tests don't require setup (all mocked)
- Integration/E2E tests need `test:setup` first
- Test database runs on port 5433 (separate from dev database)
- Uses mock LLM provider for speed
- All tests run in isolation with `--runInBand`

For detailed documentation, see `/docs/guides/TESTING_GUIDE.md`
