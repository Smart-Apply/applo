import { Test, TestingModule } from '@nestjs/testing';
import { TemplateRendererService } from './template-renderer.service';
import { TemplatesService } from '../templates/templates.service';
import { ResumeTemplateData } from './template-renderer.service';

describe('TemplateRendererService - Multilingual Support', () => {
  let service: TemplateRendererService;
  let templatesService: TemplatesService;

  const mockResumeData: ResumeTemplateData = {
    candidateName: 'Max Mustermann',
    email: 'max@example.com',
    phone: '+49 123 456789',
    location: 'Berlin, Germany',
    summary: 'Erfahrener Full-Stack Developer mit 5+ Jahren Erfahrung in React und Node.js.',
    skillCategories: [
      {
        type: 'Programmiersprachen',
        skills: ['TypeScript', 'JavaScript', 'Python'],
      },
      {
        type: 'Frameworks',
        skills: ['React', 'Node.js', 'NestJS'],
      },
    ],
    experiences: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech GmbH',
        location: 'Berlin',
        dateRange: 'Jan 2020 - Heute',
        achievements: [
          'Entwickelte React-basiertes Dashboard mit TypeScript',
          'Leitete Team von 5 Entwicklern',
        ],
      },
    ],
    education: [
      {
        degree: 'Bachelor of Science',
        institution: 'TU Berlin',
        year: '2015 - 2019',
        fieldOfStudy: 'Informatik',
      },
    ],
    certifications: [
      {
        name: 'AWS Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2023',
      },
    ],
    languages: [
      { name: 'Deutsch', level: 'Muttersprache' },
      { name: 'Englisch', level: 'Fließend' },
    ],
    language: 'de', // German language
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateRendererService,
        {
          provide: TemplatesService,
          useValue: {
            findOne: jest.fn(),
            findDefault: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TemplateRendererService>(TemplateRendererService);
    templatesService = module.get<TemplatesService>(TemplatesService);
  });

  describe('renderResume with German language', () => {
    it('should render German section headers when language is "de"', async () => {
      const html = await service.renderResume(mockResumeData, undefined, true);

      // Check for German section headers
      expect(html).toContain('<h2>Profil</h2>'); // Professional Summary in German
      expect(html).toContain('<h2>Fähigkeiten</h2>'); // Skills in German
      expect(html).toContain('<h2>Berufserfahrung</h2>'); // Experience in German
      expect(html).toContain('<h2>Ausbildung</h2>'); // Education in German
      expect(html).toContain('<h2>Zertifikate</h2>'); // Certifications in German
      expect(html).toContain('<h2>Sprachen</h2>'); // Languages in German

      // Should NOT contain English headers in H2 tags
      expect(html).not.toContain('<h2>Professional Summary</h2>');
      expect(html).not.toContain('<h2>Professional Experience</h2>');
    });

    it('should preserve German content from resume data', async () => {
      const html = await service.renderResume(mockResumeData, undefined, true);

      // Check German content is preserved
      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Erfahrener Full-Stack Developer');
      expect(html).toContain('Programmiersprachen'); // German skill category
      expect(html).toContain('Entwickelte React-basiertes Dashboard'); // German achievement
      expect(html).toContain('TU Berlin');
    });
  });

  describe('renderResume with English language', () => {
    it('should render English section headers when language is "en"', async () => {
      const englishData: ResumeTemplateData = {
        ...mockResumeData,
        candidateName: 'John Doe',
        summary: 'Experienced Full-Stack Developer with 5+ years in React and Node.js.',
        skillCategories: [
          {
            type: 'Programming Languages',
            skills: ['TypeScript', 'JavaScript', 'Python'],
          },
        ],
        experiences: [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco',
            dateRange: 'Jan 2020 - Present',
            achievements: ['Developed React-based dashboard using TypeScript'],
          },
        ],
        language: 'en', // English language
      };

      const html = await service.renderResume(englishData, undefined, true);

      // Check for English section headers
      expect(html).toContain('Professional Summary');
      expect(html).toContain('Skills');
      expect(html).toContain('Professional Experience');
      expect(html).toContain('Education');

      // Should NOT contain German headers
      expect(html).not.toContain('Profil');
      expect(html).not.toContain('Berufserfahrung');
    });
  });

  describe('renderResume without language (fallback)', () => {
    it('should default to English when language is not specified', async () => {
      const dataWithoutLanguage: ResumeTemplateData = {
        ...mockResumeData,
        language: undefined,
      };

      const html = await service.renderResume(dataWithoutLanguage, undefined, true);

      // Should default to English
      expect(html).toContain('Professional Summary');
      expect(html).toContain('Skills');
      expect(html).toContain('Professional Experience');
    });
  });
});
