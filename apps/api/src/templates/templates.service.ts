import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import NodeCache from 'node-cache';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '../config/config.service';
import { PreviewRendererService } from '../pdf-v2/preview-renderer.service';
import { isRenderableTemplate } from '../pdf-v2/template-registry';
import { TemplateType } from '../generated/prisma/client';
import { TemplateResponseDto, TemplateWithContentResponseDto } from './dto/template-response.dto';

/** The row fields the react-pdf registry needs to resolve a design. */
interface RegistryLookupRow {
  id: string;
  name: string;
  baseTemplateId: string | null;
  category: string;
  type: TemplateType;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly cache: NodeCache;

  // Cache statistics for monitoring
  private cacheStats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly previewRenderer: PreviewRendererService,
  ) {
    // Initialize cache with TTL from config (default: 3600s from env.schema.ts)
    this.cache = new NodeCache({
      stdTTL: this.config.cacheTtlSeconds,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // Don't clone objects (better performance, read-only access)
    });

    this.logger.log(`Template cache initialized with TTL: ${this.config.cacheTtlSeconds}s`);
  }

  /**
   * Get all active templates, optionally filtered by type
   * Returns one template per design (grouped by baseTemplateId or category)
   * For UI display in wizard - shows only distinct designs, not language variants
   */
  async findAll(type?: TemplateType): Promise<TemplateResponseDto[]> {
    const cacheKey = `templates:all:${type || 'all'}`;

    // Check cache first (use !== undefined to properly handle null cached values)
    const cached = this.cache.get<TemplateResponseDto[]>(cacheKey);
    if (cached !== undefined) {
      this.cacheStats.hits++;
      this.logger.debug(
        `Cache HIT for ${cacheKey} (hits: ${this.cacheStats.hits}, misses: ${this.cacheStats.misses})`,
      );
      return cached;
    }

    // Cache miss - fetch from database
    this.cacheStats.misses++;
    this.logger.debug(
      `Cache MISS for ${cacheKey} (hits: ${this.cacheStats.hits}, misses: ${this.cacheStats.misses})`,
    );

    const allTemplates = await this.prisma.template.findMany({
      where: {
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [{ isDefault: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        category: true,
        language: true,
        baseTemplateId: true,
        accentColor: true,
        colorVariantName: true,
        thumbnailUrl: true,
        previewImageKey: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Only offer designs that actually render: every active row must resolve
    // to a registered react-pdf factory for its type, otherwise picking it in
    // the wizard would crash generation later ("has no react-pdf
    // implementation registered"). Legacy HBS-era seed rows are the known
    // offenders. `PdfService` throwing stays the last line of defense.
    const result = allTemplates.filter((t) => this.isRenderable(t));
    const hidden = allTemplates.filter((t) => !this.isRenderable(t));
    if (hidden.length > 0) {
      this.logger.warn(
        `Catalog hides ${hidden.length} active template(s) without a registered react-pdf factory: ` +
          hidden.map((t) => `${t.id} ("${t.name}")`).join(', '),
      );
    }

    // Store in cache
    this.cache.set(cacheKey, result);
    this.logger.debug(`Cached ${result.length} templates with key ${cacheKey}`);

    return result;
  }

  /** Registry check for a DB row, matching exactly how the renderer resolves it. */
  private isRenderable(row: RegistryLookupRow): boolean {
    return isRenderableTemplate(
      {
        baseTemplateId: row.baseTemplateId,
        templateId: row.id,
        name: row.name,
        category: row.category,
      },
      row.type,
    );
  }

  /**
   * Find template by category and language
   * Used for automatic selection based on job posting language
   */
  async findByCategoryAndLanguage(
    category: string,
    language: string,
    type?: TemplateType,
  ): Promise<TemplateWithContentResponseDto | null> {
    const cacheKey = `templates:category:${category}:lang:${language}:type:${type || 'all'}`;

    // Check cache first (use !== undefined to properly handle null cached values)
    const cached = this.cache.get<TemplateWithContentResponseDto | null>(cacheKey);
    if (cached !== undefined) {
      this.cacheStats.hits++;
      this.logger.debug(
        `Cache HIT for ${cacheKey} (hits: ${this.cacheStats.hits}, misses: ${this.cacheStats.misses})`,
      );
      return cached;
    }

    // Cache miss - fetch from database
    this.cacheStats.misses++;
    this.logger.debug(
      `Cache MISS for ${cacheKey} (hits: ${this.cacheStats.hits}, misses: ${this.cacheStats.misses})`,
    );

    const candidates = await this.prisma.template.findMany({
      where: {
        category,
        language,
        isActive: true,
        ...(type && { type: { in: [type, TemplateType.BOTH] } }),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    // Same-category legacy rows without a react-pdf factory must never win
    // the language resolution — they would crash the PDF render later.
    const template = candidates.find((t) => this.isRenderable(t)) ?? null;

    if (!template) {
      // Fallback to English if specific language not found
      this.logger.warn(
        `Template not found for category ${category} and language ${language}, falling back to English`,
      );

      // Use a separate cache key for fallback to avoid confusion
      const fallbackCacheKey = `templates:category:${category}:lang:en:type:${type || 'all'}`;
      const cachedFallback = this.cache.get<TemplateWithContentResponseDto | null>(
        fallbackCacheKey,
      );

      if (cachedFallback !== undefined) {
        this.cacheStats.hits++;
        this.logger.debug(`Cache HIT for fallback ${fallbackCacheKey}`);
        // Note: We do NOT cache under the original key to allow new templates to be found after cache expiry
        return cachedFallback;
      }

      const fallbackCandidates = await this.prisma.template.findMany({
        where: {
          category,
          language: 'en',
          isActive: true,
          ...(type && { type: { in: [type, TemplateType.BOTH] } }),
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
      const fallback = fallbackCandidates.find((t) => this.isRenderable(t)) ?? null;

      // Cache under fallback key only (not original key)
      this.cache.set(fallbackCacheKey, fallback);
      // Cache null under original key to avoid repeated DB queries for missing templates
      this.cache.set(cacheKey, null);
      return fallback;
    }

    // Cache the result
    this.cache.set(cacheKey, template);
    this.logger.debug(`Cached template with key ${cacheKey}`);

    return template;
  }

  /**
   * Get a single template by ID with full content
   */
  async findOne(id: string): Promise<TemplateWithContentResponseDto> {
    const cacheKey = `templates:id:${id}`;

    // Check cache first (use !== undefined to properly handle null cached values)
    const cached = this.cache.get<TemplateWithContentResponseDto>(cacheKey);
    if (cached !== undefined) {
      this.cacheStats.hits++;
      this.logger.debug(
        `Cache HIT for ${cacheKey} (hits: ${this.cacheStats.hits}, misses: ${this.cacheStats.misses})`,
      );
      return cached;
    }

    // Cache miss - fetch from database
    this.cacheStats.misses++;
    this.logger.debug(
      `Cache MISS for ${cacheKey} (hits: ${this.cacheStats.hits}, misses: ${this.cacheStats.misses})`,
    );

    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Cache the result
    this.cache.set(cacheKey, template);
    this.logger.debug(`Cached template with key ${cacheKey}`);

    return template;
  }

  /**
   * Health check - verify at least one default template exists for each type
   */
  async healthCheck(): Promise<boolean> {
    try {
      const coverLetterTemplate = await this.prisma.template.findFirst({
        where: {
          type: { in: [TemplateType.COVER_LETTER, TemplateType.BOTH] },
          isActive: true,
        },
      });

      const resumeTemplate = await this.prisma.template.findFirst({
        where: {
          type: { in: [TemplateType.RESUME, TemplateType.BOTH] },
          isActive: true,
        },
      });

      return !!(coverLetterTemplate && resumeTemplate);
    } catch (error) {
      this.logger.error('Template health check failed', error);
      return false;
    }
  }

  /**
   * Generate a PNG preview for a template (with caching). On cache miss
   * the image is rendered via `PreviewRendererService` (react-pdf →
   * pdfjs-dist → @napi-rs/canvas) and persisted to storage.
   */
  async generatePreview(id: string): Promise<Buffer> {
    const template = await this.findOne(id);

    // Check if preview already exists in storage
    if (template.previewImageKey) {
      try {
        const cachedPreview = await this.storage.getFile(template.previewImageKey);
        this.logger.debug(`Using cached preview for template: ${id}`);
        return cachedPreview;
      } catch {
        this.logger.warn(`Cached preview not found for template ${id}, regenerating...`);
      }
    }

    this.logger.log(`Generating preview for template: ${id}`);
    const imageBuffer = await this.previewRenderer.renderPreviewPng(id);

    // Store preview in storage
    const previewKey = `templates/${id}/preview.png`;
    await this.storage.upload(previewKey, imageBuffer, 'image/png');

    // Update template with preview key
    await this.prisma.template.update({
      where: { id },
      data: { previewImageKey: previewKey },
    });

    this.logger.log(`Preview generated and cached for template: ${id}`);
    return imageBuffer;
  }
}
