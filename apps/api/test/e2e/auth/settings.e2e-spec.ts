import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../../src/app.module';

describe('Settings API (e2e)', () => {
  let app: INestApplication;
  let userEmail: string;
  let accessToken: string;
  let cookies: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Add cookie parser middleware
    app.use(cookieParser());

    // Set global prefix to match production setup
    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Register a test user
    userEmail = `test-settings-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: userEmail,
        password: 'Test123!',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(201);

    // Extract cookies
    const setCookie = registerResponse.headers['set-cookie'];
    cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/profile (PUT)', () => {
    it('should update user profile (firstName, lastName)', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/profile')
        .set('Cookie', cookies)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        })
        .expect(200);

      expect(response.body.user).toHaveProperty('firstName', 'Jane');
      expect(response.body.user).toHaveProperty('lastName', 'Smith');
      expect(response.body.user).toHaveProperty('email', userEmail);
    });

    it('should allow partial updates', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/profile')
        .set('Cookie', cookies)
        .send({
          firstName: 'UpdatedFirstName',
        })
        .expect(200);

      expect(response.body.user).toHaveProperty('firstName', 'UpdatedFirstName');
      expect(response.body.user).toHaveProperty('email', userEmail);
    });

    it('should sanitize XSS in firstName and lastName', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/profile')
        .set('Cookie', cookies)
        .send({
          firstName: '<script>alert("XSS")</script>Test',
          lastName: '<img src=x onerror=alert(1)>Lastname',
        })
        .expect(200);

      // Sanitization should remove script tags
      expect(response.body.user.firstName).not.toContain('<script>');
      expect(response.body.user.lastName).not.toContain('<img');
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put('/api/v1/auth/profile')
        .send({
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/change-password (POST)', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('logged out from all other devices');

      // Verify old cookies are cleared
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject incorrect current password', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });

    it('should enforce password strength requirements', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'weak', // Too weak
        })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });
  });

  describe('/api/v1/user-preferences (GET)', () => {
    it('should get user preferences (auto-create if not exists)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/user-preferences')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('applicationUpdates', true); // default
      expect(response.body).toHaveProperty('newJobPostings', false); // default
      expect(response.body).toHaveProperty('marketingEmails', false); // default
      expect(response.body).toHaveProperty('language', 'de'); // default
      expect(response.body).toHaveProperty('theme', 'system'); // default
      expect(response.body).toHaveProperty('profilePublic', false); // default
      expect(response.body).toHaveProperty('analyticsEnabled', true); // default
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/user-preferences')
        .expect(401);
    });
  });

  describe('/api/v1/user-preferences (PUT)', () => {
    it('should update user preferences', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/user-preferences')
        .set('Cookie', cookies)
        .send({
          applicationUpdates: false,
          newJobPostings: true,
          marketingEmails: true,
          language: 'en',
          theme: 'dark',
          profilePublic: true,
          analyticsEnabled: false,
        })
        .expect(200);

      expect(response.body).toHaveProperty('applicationUpdates', false);
      expect(response.body).toHaveProperty('newJobPostings', true);
      expect(response.body).toHaveProperty('marketingEmails', true);
      expect(response.body).toHaveProperty('language', 'en');
      expect(response.body).toHaveProperty('theme', 'dark');
      expect(response.body).toHaveProperty('profilePublic', true);
      expect(response.body).toHaveProperty('analyticsEnabled', false);
    });

    it('should allow partial updates', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/user-preferences')
        .set('Cookie', cookies)
        .send({
          language: 'fr',
          theme: 'light',
        })
        .expect(200);

      expect(response.body).toHaveProperty('language', 'fr');
      expect(response.body).toHaveProperty('theme', 'light');
    });

    it('should validate language values', async () => {
      return request(app.getHttpServer())
        .put('/api/v1/user-preferences')
        .set('Cookie', cookies)
        .send({
          language: 'invalid', // Not in allowed values
        })
        .expect(400);
    });

    it('should validate theme values', async () => {
      return request(app.getHttpServer())
        .put('/api/v1/user-preferences')
        .set('Cookie', cookies)
        .send({
          theme: 'invalid', // Not in allowed values
        })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put('/api/v1/user-preferences')
        .send({
          language: 'en',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/account (DELETE)', () => {
    it('should delete user account and all related data', async () => {
      // Create a separate user for deletion test
      const deleteUserEmail = `test-delete-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: deleteUserEmail,
          password: 'Test123!',
          firstName: 'Delete',
          lastName: 'Me',
        })
        .expect(201);

      const deleteCookies = Array.isArray(registerResponse.headers['set-cookie'])
        ? registerResponse.headers['set-cookie']
        : [registerResponse.headers['set-cookie']];

      // Delete account
      const response = await request(app.getHttpServer())
        .delete('/api/v1/auth/account')
        .set('Cookie', deleteCookies)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Account deleted successfully');

      // Verify cookies are cleared
      expect(response.headers['set-cookie']).toBeDefined();

      // Verify user cannot login anymore
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: deleteUserEmail,
          password: 'Test123!',
        })
        .expect(401);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/auth/account')
        .expect(401);
    });
  });
});
