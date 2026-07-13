import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';

/**
 * Regression coverage for the broken-access-control (IDOR) fix on the
 * application mutation endpoints. Before the fix, `updateStatus`,
 * `updateTitle` and `updateTargetJobTitle` issued a bare
 * `prisma.application.update({ where: { id } })` with no `userId` scope,
 * so any authenticated user could mutate another user's application by
 * guessing its id. These tests assert cross-user access now 404s while the
 * owner still succeeds.
 */
describe('Application ownership / IDOR protection (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // User A owns the application, User B is the attacker.
  let ownerCookie: string;
  let attackerCookie: string;
  let applicationId: string;

  const registerUser = async (email: string): Promise<{ cookie: string; userId: string }> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Test123!@#Strong' })
      .expect(201);

    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const accessCookie = cookies.find((c: string) => c.startsWith('access_token='));
    return { cookie: accessCookie!.split(';')[0], userId: res.body.user.id };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const stamp = Date.now();
    const owner = await registerUser(`owner-${stamp}@example.com`);
    const attacker = await registerUser(`attacker-${stamp}@example.com`);
    ownerCookie = owner.cookie;
    attackerCookie = attacker.cookie;

    // Create a job posting + application row directly (bypasses the LLM/PDF
    // generation pipeline, which is irrelevant to the access-control checks).
    const jobPosting = await prisma.jobPosting.create({
      data: {
        userId: owner.userId,
        title: 'Software Engineer',
        company: 'Acme',
        fullText: 'Requirements: TypeScript, NestJS.',
      },
    });

    const application = await prisma.application.create({
      data: {
        userId: owner.userId,
        jobPostingId: jobPosting.id,
        title: 'Original title',
        status: 'READY',
      },
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /applications/:id/status', () => {
    it('rejects a non-owner with 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Cookie', attackerCookie)
        .send({ status: 'REJECTED' })
        .expect(404);
    });

    it('allows the owner', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Cookie', ownerCookie)
        .send({ status: 'APPLIED' })
        .expect(200);
    });
  });

  describe('PATCH /applications/:id/title', () => {
    it('rejects a non-owner with 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/title`)
        .set('Cookie', attackerCookie)
        .send({ title: 'Hacked title' })
        .expect(404);
    });

    it('does not mutate the application for a non-owner', async () => {
      const fresh = await prisma.application.findUnique({ where: { id: applicationId } });
      expect(fresh?.title).not.toBe('Hacked title');
    });
  });

  describe('PATCH /applications/:id/target-job-title', () => {
    it('rejects a non-owner with 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/target-job-title`)
        .set('Cookie', attackerCookie)
        .send({ targetJobTitle: 'Hacked target' })
        .expect(404);
    });
  });
});
