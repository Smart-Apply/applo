import { config } from 'dotenv';
config({ path: '.env.test' }); // Load .env.test before any imports

import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { AppModule } from '../../../src/app.module';
import { StorageService } from '../../../src/storage/storage.service';

/**
 * Account erasure has to leave the object store empty (Art. 17 DSGVO).
 *
 * This is the regression test for the bug that motivated issue #806: the
 * deletion path collected the *known* file keys (generated PDFs, the
 * Bewerbungsfoto) and deleted those, so every uploaded original under
 * `<userId>/` — full résumés, job-posting documents — survived the account
 * deletion indefinitely. Nothing ever asserted the prefix was empty
 * afterwards, which is exactly why it went unnoticed.
 *
 * Needs a real database (like every e2e spec here) and runs against the
 * `disk` storage driver by default.
 */
describe('Account erasure clears object storage (e2e)', () => {
  let app: INestApplication;
  let storage: StorageService;

  const testPdfPath = path.join(__dirname, '../../fixtures', 'test-resume.pdf');
  const password = 'ErasureTest123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    storage = moduleFixture.get<StorageService>(StorageService);
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deletes every object under the user prefix when the account is deleted', async () => {
    const email = `erasure-test-${Date.now()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Erasure', lastName: 'Test' })
      .expect(201);

    const cookies = registerResponse.headers['set-cookie'];
    const userId: string = registerResponse.body.user.id;

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Cookie', cookies)
      .attach('file', testPdfPath)
      .expect(201);

    expect(uploadResponse.body.storageKey).toContain(userId);
    expect(await storage.list(`${userId}/`)).not.toHaveLength(0);

    await request(app.getHttpServer())
      .delete('/api/v1/auth/account')
      .set('Cookie', cookies)
      .send({ password })
      .expect(200);

    expect(await storage.list(`${userId}/`)).toHaveLength(0);
  });
});
