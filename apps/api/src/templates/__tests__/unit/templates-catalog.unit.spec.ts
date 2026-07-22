import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from '../../templates.service';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { ConfigService } from '@/config/config.service';
import { PreviewRendererService } from '@/pdf-v2/preview-renderer.service';
import { isRenderableTemplate } from '@/pdf-v2/template-registry';

/**
 * Catalog/registry integrity (TEMPLATE_CUSTOMIZATION §2.5):
 * active DB rows without a registered react-pdf factory must never reach the
 * client (findAll) or win the language resolution (findByCategoryAndLanguage)
 * — selecting one would crash generation with "has no react-pdf
 * implementation registered".
 */

const registeredResumeRow = {
  id: 'classic-ats-default-resume',
  name: 'Classic ATS (Klassisch)',
  description: 'ATS-optimiert',
  type: 'RESUME',
  category: 'Professional',
  language: 'en',
  baseTemplateId: 'classic-ats-resume',
  accentColor: '#1a1a1a',
  colorVariantName: 'Klassisch',
  thumbnailUrl: null,
  previewImageKey: null,
  isActive: true,
  isDefault: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

/** Legacy HBS-era seed row — same category, no TSX factory. */
const legacyResumeRow = {
  ...registeredResumeRow,
  id: 'modern-professional-resume',
  name: 'Modern Professional',
  baseTemplateId: 'a4f0c1d2-legacy-uuid',
  colorVariantName: null,
  accentColor: null,
  isDefault: false,
};

describe('template-registry.isRenderableTemplate', () => {
  it('resolves a registered design for its type', () => {
    expect(
      isRenderableTemplate(
        {
          baseTemplateId: 'classic-ats-resume',
          templateId: 'classic-ats-default-resume',
          name: 'Classic ATS (Klassisch)',
          category: 'Professional',
        },
        'RESUME',
      ),
    ).toBe(true);
  });

  it('rejects a legacy design with no registered factory', () => {
    expect(
      isRenderableTemplate(
        {
          baseTemplateId: 'some-uuid',
          templateId: 'modern-professional-resume',
          name: 'Modern Professional',
          category: 'Professional',
        },
        'RESUME',
      ),
    ).toBe(false);
  });
});

describe('TemplatesService catalog/registry integrity (Unit)', () => {
  let service: TemplatesService;
  let prisma: {
    template: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      template: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
        { provide: ConfigService, useValue: { cacheTtlSeconds: 1 } },
        { provide: PreviewRendererService, useValue: {} },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('findAll', () => {
    it('hides active rows without a registered react-pdf factory', async () => {
      prisma.template.findMany.mockResolvedValue([registeredResumeRow, legacyResumeRow]);

      const result = await service.findAll();

      expect(result.map((t) => t.id)).toEqual(['classic-ats-default-resume']);
    });

    it('returns all rows when every design is registered', async () => {
      const harvard = {
        ...registeredResumeRow,
        id: 'harvard-classic-crimson-resume',
        name: 'Harvard Classic (Harvard Crimson)',
        baseTemplateId: 'harvard-classic-resume',
        category: 'Academic',
        isDefault: false,
      };
      prisma.template.findMany.mockResolvedValue([registeredResumeRow, harvard]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findByCategoryAndLanguage', () => {
    it('skips a same-category legacy row and returns the registered design', async () => {
      // Legacy row listed first — ensure the pick is registry-aware, not
      // order-dependent.
      prisma.template.findMany.mockResolvedValue([legacyResumeRow, registeredResumeRow]);

      const result = await service.findByCategoryAndLanguage('Professional', 'en');

      expect(result?.id).toBe('classic-ats-default-resume');
    });

    it('falls back to English when the language has no registered candidate', async () => {
      prisma.template.findMany
        .mockResolvedValueOnce([legacyResumeRow]) // de: legacy only → no renderable hit
        .mockResolvedValueOnce([registeredResumeRow]); // en fallback

      const result = await service.findByCategoryAndLanguage('Professional', 'de');

      expect(result?.id).toBe('classic-ats-default-resume');
    });
  });
});
