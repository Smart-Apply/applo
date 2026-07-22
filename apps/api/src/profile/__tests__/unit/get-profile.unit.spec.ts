import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../../profile.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLoggerService } from '@/common/audit-logger';
import { KeywordsService } from '@/keywords/keywords.service';
import { StorageService } from '@/storage/storage.service';
import { NotFoundWithCode } from '@/common/exceptions/coded-http.exception';
import { MockHelper } from '../../../../test/helpers/mock.helper';

describe('ProfileService.getProfile (Unit)', () => {
  let service: ProfileService;
  let prisma: ReturnType<typeof MockHelper.createMockPrismaService>;

  beforeEach(async () => {
    prisma = MockHelper.createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLoggerService, useValue: { logProfileUpdate: vi.fn() } },
        { provide: KeywordsService, useValue: { extractAndCacheProfileKeywords: vi.fn() } },
        {
          // getProfile() never touches storage; only the photo endpoints do.
          provide: StorageService,
          useValue: { upload: vi.fn(), getFile: vi.fn(), delete: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('throws PROFILE_NOT_FOUND when no profile exists', async () => {
    prisma.profile.findUnique.mockResolvedValue(null);
    await expect(service.getProfile('user-1')).rejects.toBeInstanceOf(NotFoundWithCode);
  });

  it('maps a fully-populated profile without throwing', async () => {
    prisma.profile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      user: { firstName: 'Test', lastName: 'User' },
      skills: [{ id: 's1', name: 'TS', level: 'expert' }],
      certificates: [{ id: 'c1', name: 'AWS', issuer: 'Amazon', issueDate: new Date(), credentialUrl: null }],
      experiences: [{ id: 'e1', title: 'Dev', company: 'Acme', startDate: new Date(), endDate: null, description: 'x' }],
      projects: [{ id: 'pr1', name: 'Proj', description: 'd', technologies: ['ts'], url: null }],
      education: [],
      languages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getProfile('user-1');
    expect(result.skills).toHaveLength(1);
    expect(result.experiences[0].startDate).toBeDefined();
  });

  // Regression: a partial/failed Prisma include used to throw (TypeError on
  // `.map` of undefined) and surface as a 500. The mapper must degrade to [].
  it('returns empty arrays when relations are missing instead of throwing', async () => {
    prisma.profile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      user: { firstName: 'Test', lastName: 'User' },
      // skills / certificates / experiences / projects / education / languages
      // all absent — simulates a partial include.
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getProfile('user-1');
    expect(result.skills).toEqual([]);
    expect(result.certificates).toEqual([]);
    expect(result.experiences).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.languages).toEqual([]);
  });
});
