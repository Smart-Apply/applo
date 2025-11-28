import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ATSKeywordAgent } from '../agents/ats/ats-keyword.agent';
import { ATSAgentOutput, ATSAgentInput, ProfileData } from '../agents/agents.interface';
import { KeywordMatchDto, MatchAnalysisResponseDto, ExtractedKeywordsDto } from './dto';

interface JobPostingData {
  title: string;
  company: string;
  location?: string;
  language?: string;
  fullText: string;
  rawText?: string;
}

@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly atsAgent: ATSKeywordAgent,
  ) {}

  /**
   * Extract keywords from job posting using ATS Agent
   */
  async extractKeywords(jobPosting: JobPostingData): Promise<ATSAgentOutput> {
    this.logger.log(`Extracting keywords for: ${jobPosting.title} at ${jobPosting.company}`);

    // Build the input for the ATS Agent (simplified with fullText)
    const input: ATSAgentInput = {
      jobPosting: {
        title: jobPosting.title,
        company: jobPosting.company,
        location: jobPosting.location || null,
        fullText: jobPosting.fullText,
        language: (jobPosting.language as 'de' | 'en') || this.detectLanguage(jobPosting.fullText),
      },
    };

    // Execute the ATS Agent
    const keywords = await this.atsAgent.execute(input);

    this.logger.log(`Extracted ${this.countKeywords(keywords)} keywords`);
    return keywords;
  }

  /**
   * Convert ATSAgentOutput to legacy ExtractedKeywordsDto format
   * For backwards compatibility with existing code
   */
  convertToLegacyFormat(keywords: ATSAgentOutput): ExtractedKeywordsDto {
    return {
      technical: [...keywords.technicalSkills, ...keywords.toolsAndTechnologies],
      soft: keywords.softSkills,
      experience: keywords.senioritySignals,
      industry: keywords.industryKeywords,
      methodology: [], // Not directly mapped in new format
      education: keywords.requirementKeywords.filter((k) =>
        /degree|bachelor|master|phd|diploma|university|college/i.test(k),
      ),
      certifications: keywords.requirementKeywords.filter((k) =>
        /certified|certification|certificate|license/i.test(k),
      ),
    };
  }

  /**
   * Analyze how well a profile matches a job posting
   */
  async analyzeMatch(userId: string, jobPostingId: string): Promise<MatchAnalysisResponseDto> {
    // Fetch profile
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
        experiences: true,
        education: true,
        certificates: true,
        projects: true,
        languages: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Fetch job posting
    const jobPosting = await this.prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found');
    }

    // Extract keywords using ATS Agent (simplified with fullText)
    const keywords = await this.extractKeywords({
      title: jobPosting.title,
      company: jobPosting.company,
      location: jobPosting.location || undefined,
      language: jobPosting.language || undefined,
      fullText: jobPosting.fullText,
      rawText: jobPosting.rawText || undefined,
    });

    // Perform matching analysis
    return this.performAnalysis(this.mapProfileToData(profile), keywords);
  }

  /**
   * Perform the actual match analysis between profile and extracted keywords
   */
  performAnalysis(profile: ProfileData, keywords: ATSAgentOutput): MatchAnalysisResponseDto {
    const allKeywords = this.flattenKeywords(keywords);
    const profileKeywords = this.extractProfileKeywords(profile);

    const matchedKeywords: KeywordMatchDto[] = [];
    const missingKeywords: KeywordMatchDto[] = [];

    const categoryStats = {
      technical: { matched: 0, total: 0 },
      soft: { matched: 0, total: 0 },
      experience: { matched: 0, total: 0 },
      other: { matched: 0, total: 0 },
    };

    // Analyze each keyword
    for (const { keyword, category } of allKeywords) {
      const mainCategory = this.mapToMainCategory(category);
      categoryStats[mainCategory].total++;

      const matchResult = this.findKeywordInProfile(keyword, profileKeywords);

      if (matchResult.found) {
        categoryStats[mainCategory].matched++;
        matchedKeywords.push({
          keyword,
          category: this.mapToLegacyCategory(category),
          found: true,
          confidence: matchResult.confidence,
          locations: matchResult.locations,
          frequency: 1,
        });
      } else {
        missingKeywords.push({
          keyword,
          category: this.mapToLegacyCategory(category),
          found: false,
          confidence: 0,
          frequency: 1,
        });
      }
    }

    // Calculate overall match percentage
    const totalKeywords = allKeywords.length;
    const matchPercentage =
      totalKeywords > 0 ? Math.round((matchedKeywords.length / totalKeywords) * 100) : 0;

    // Generate insights
    const suggestions = this.generateSuggestions(missingKeywords, categoryStats);
    const strengths = this.identifyStrengths(matchedKeywords);
    const weaknesses = this.identifyWeaknesses(missingKeywords, categoryStats);

    this.logger.log(
      `Match analysis complete: ${matchPercentage}% (${matchedKeywords.length}/${totalKeywords} keywords)`,
    );

    return {
      matchPercentage,
      matchedKeywords: matchedKeywords.sort((a, b) => b.confidence - a.confidence),
      missingKeywords: missingKeywords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0)),
      suggestions,
      strengths,
      weaknesses,
      categoryBreakdown: {
        technical: this.calculateCategoryPercentage(categoryStats.technical),
        soft: this.calculateCategoryPercentage(categoryStats.soft),
        experience: this.calculateCategoryPercentage(categoryStats.experience),
        other: this.calculateCategoryPercentage(categoryStats.other),
      },
    };
  }

  /**
   * Detect language from job posting full text
   */
  private detectLanguage(text: string): 'de' | 'en' | null {
    const lowercase = text.toLowerCase();

    // Simple heuristic: check for common German words
    const germanWords = ['und', 'oder', 'für', 'mit', 'von', 'bei', 'wir', 'sie', 'ihre', 'unser'];
    const englishWords = ['and', 'or', 'for', 'with', 'from', 'at', 'we', 'you', 'your', 'our'];

    let germanScore = 0;
    let englishScore = 0;

    for (const word of germanWords) {
      if (lowercase.includes(` ${word} `)) germanScore++;
    }
    for (const word of englishWords) {
      if (lowercase.includes(` ${word} `)) englishScore++;
    }

    if (germanScore > englishScore) return 'de';
    if (englishScore > germanScore) return 'en';
    return null;
  }

  /**
   * Count total keywords
   */
  private countKeywords(keywords: ATSAgentOutput): number {
    return (
      keywords.technicalSkills.length +
      keywords.softSkills.length +
      keywords.responsibilityKeywords.length +
      keywords.requirementKeywords.length +
      keywords.toolsAndTechnologies.length +
      keywords.industryKeywords.length +
      keywords.senioritySignals.length +
      keywords.miscKeywords.length
    );
  }

  /**
   * Flatten keywords with category information
   */
  private flattenKeywords(keywords: ATSAgentOutput): { keyword: string; category: string }[] {
    return [
      ...keywords.technicalSkills.map((k) => ({ keyword: k, category: 'technical' })),
      ...keywords.softSkills.map((k) => ({ keyword: k, category: 'soft' })),
      ...keywords.responsibilityKeywords.map((k) => ({ keyword: k, category: 'responsibility' })),
      ...keywords.requirementKeywords.map((k) => ({ keyword: k, category: 'requirement' })),
      ...keywords.toolsAndTechnologies.map((k) => ({ keyword: k, category: 'tool' })),
      ...keywords.industryKeywords.map((k) => ({ keyword: k, category: 'industry' })),
      ...keywords.senioritySignals.map((k) => ({ keyword: k, category: 'seniority' })),
      ...keywords.miscKeywords.map((k) => ({ keyword: k, category: 'misc' })),
    ];
  }

  /**
   * Map profile to ProfileData interface
   */
  private mapProfileToData(profile: any): ProfileData {
    return {
      firstName: profile.user?.firstName || '',
      lastName: profile.user?.lastName || '',
      email: profile.user?.email || '',
      phone: profile.phone || undefined,
      summary: profile.summary || undefined,
      skills: profile.skills.map((s: any) => ({
        id: s.id,
        name: s.name,
        level: s.level || undefined,
      })),
      experiences: profile.experiences.map((e: any) => ({
        id: e.id,
        title: e.title,
        company: e.company,
        location: e.location || undefined,
        startDate: e.startDate,
        endDate: e.endDate || undefined,
        current: e.current,
        description: e.description || undefined,
      })),
      education: profile.education.map((e: any) => ({
        id: e.id,
        degree: e.degree,
        institution: e.institution,
        fieldOfStudy: e.fieldOfStudy || undefined,
        startDate: e.startDate || undefined,
        endDate: e.endDate || undefined,
      })),
      certificates: profile.certificates.map((c: any) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        issueDate: c.issueDate || undefined,
        expiryDate: c.expiryDate || undefined,
      })),
      projects: profile.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        url: p.url || undefined,
        technologies: p.technologies || [],
      })),
      languages: profile.languages.map((l: any) => ({
        id: l.id,
        name: l.name,
        level: l.level,
      })),
    };
  }

  /**
   * Extract keywords from profile for matching
   */
  private extractProfileKeywords(profile: ProfileData): Map<string, string[]> {
    const keywords = new Map<string, string[]>();

    // Skills
    for (const skill of profile.skills || []) {
      this.addToKeywordMap(keywords, skill.name.toLowerCase(), 'skills');
    }

    // Experience titles and descriptions
    for (const exp of profile.experiences || []) {
      const words = this.tokenize(exp.title);
      for (const word of words) {
        this.addToKeywordMap(keywords, word, 'experience.title');
      }
      if (exp.description) {
        const descWords = this.tokenize(exp.description);
        for (const word of descWords) {
          this.addToKeywordMap(keywords, word, 'experience.description');
        }
      }
    }

    // Education
    for (const edu of profile.education || []) {
      const eduText = `${edu.degree} ${edu.institution} ${edu.fieldOfStudy || ''}`;
      const words = this.tokenize(eduText);
      for (const word of words) {
        this.addToKeywordMap(keywords, word, 'education');
      }
    }

    // Certificates
    for (const cert of profile.certificates || []) {
      const certText = `${cert.name} ${cert.issuer}`;
      const words = this.tokenize(certText);
      for (const word of words) {
        this.addToKeywordMap(keywords, word, 'certificates');
      }
    }

    // Projects and technologies
    for (const proj of profile.projects || []) {
      for (const tech of proj.technologies || []) {
        this.addToKeywordMap(keywords, tech.toLowerCase(), 'projects.technologies');
      }
      if (proj.description) {
        const words = this.tokenize(proj.description);
        for (const word of words) {
          this.addToKeywordMap(keywords, word, 'projects.description');
        }
      }
    }

    // Summary
    if (profile.summary) {
      const words = this.tokenize(profile.summary);
      for (const word of words) {
        this.addToKeywordMap(keywords, word, 'summary');
      }
    }

    return keywords;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\-\.\+#]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  /**
   * Add keyword to map with location
   */
  private addToKeywordMap(map: Map<string, string[]>, keyword: string, location: string): void {
    const normalized = keyword.toLowerCase().trim();
    if (!normalized) return;

    const existing = map.get(normalized) || [];
    if (!existing.includes(location)) {
      existing.push(location);
    }
    map.set(normalized, existing);
  }

  /**
   * Find keyword in profile with fuzzy matching
   */
  private findKeywordInProfile(
    keyword: string,
    profileKeywords: Map<string, string[]>,
  ): { found: boolean; confidence: number; locations: string[] } {
    const normalizedKeyword = keyword.toLowerCase().trim();

    // Exact match
    if (profileKeywords.has(normalizedKeyword)) {
      const locations = profileKeywords.get(normalizedKeyword) || [];
      return { found: true, confidence: this.calculateConfidence(locations), locations };
    }

    // Partial match (keyword contains or is contained in profile keyword)
    for (const [profileKeyword, locations] of profileKeywords) {
      if (
        profileKeyword.includes(normalizedKeyword) ||
        normalizedKeyword.includes(profileKeyword)
      ) {
        return { found: true, confidence: 0.7, locations };
      }
    }

    // No match found
    return { found: false, confidence: 0, locations: [] };
  }

  /**
   * Calculate confidence based on where keyword was found
   */
  private calculateConfidence(locations: string[]): number {
    let confidence = 0;
    for (const location of locations) {
      if (location === 'skills') {
        confidence = Math.max(confidence, 1.0);
      } else if (location.startsWith('experience')) {
        confidence = Math.max(confidence, 0.9);
      } else if (location.startsWith('projects.technologies')) {
        confidence = Math.max(confidence, 0.85);
      } else if (location === 'certificates') {
        confidence = Math.max(confidence, 0.85);
      } else if (location === 'education') {
        confidence = Math.max(confidence, 0.8);
      } else if (location === 'summary') {
        confidence = Math.max(confidence, 0.7);
      } else {
        confidence = Math.max(confidence, 0.6);
      }
    }
    return confidence;
  }

  /**
   * Map category to main category for statistics
   */
  private mapToMainCategory(category: string): 'technical' | 'soft' | 'experience' | 'other' {
    switch (category) {
      case 'technical':
      case 'tool':
        return 'technical';
      case 'soft':
        return 'soft';
      case 'seniority':
      case 'requirement':
        return 'experience';
      default:
        return 'other';
    }
  }

  /**
   * Map to legacy category for DTO compatibility
   */
  private mapToLegacyCategory(
    category: string,
  ):
    | 'technical'
    | 'soft'
    | 'experience'
    | 'industry'
    | 'methodology'
    | 'education'
    | 'certification' {
    switch (category) {
      case 'technical':
      case 'tool':
        return 'technical';
      case 'soft':
        return 'soft';
      case 'seniority':
        return 'experience';
      case 'industry':
        return 'industry';
      case 'requirement':
        return 'education';
      default:
        return 'technical';
    }
  }

  /**
   * Calculate category percentage
   */
  private calculateCategoryPercentage(stats: { matched: number; total: number }): {
    matched: number;
    total: number;
    percentage: number;
  } {
    return {
      matched: stats.matched,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0,
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    missingKeywords: KeywordMatchDto[],
    categoryStats: Record<string, { matched: number; total: number }>,
  ): string[] {
    const suggestions: string[] = [];

    // Technical skill suggestions
    const missingTechnical = missingKeywords.filter((k) => k.category === 'technical').slice(0, 3);
    if (missingTechnical.length > 0) {
      const skills = missingTechnical.map((k) => `'${k.keyword}'`).join(', ');
      suggestions.push(`Add ${skills} to your skills if you have experience with them`);
    }

    // Low category match suggestions
    if (
      categoryStats.technical.total > 0 &&
      categoryStats.technical.matched / categoryStats.technical.total < 0.5
    ) {
      suggestions.push('Consider highlighting more technical skills in your profile');
    }

    if (
      categoryStats.soft.total > 0 &&
      categoryStats.soft.matched / categoryStats.soft.total < 0.5
    ) {
      suggestions.push('Add more soft skills to your profile summary or experience descriptions');
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Identify profile strengths
   */
  private identifyStrengths(matchedKeywords: KeywordMatchDto[]): string[] {
    const strengths: string[] = [];

    const technicalMatches = matchedKeywords.filter((k) => k.category === 'technical');
    if (technicalMatches.length >= 3) {
      const topSkills = technicalMatches
        .slice(0, 3)
        .map((k) => k.keyword)
        .join(', ');
      strengths.push(`Strong technical match for ${topSkills}`);
    }

    const expMatches = matchedKeywords.filter((k) => k.category === 'experience');
    if (expMatches.length > 0) {
      strengths.push('Experience level aligns with job requirements');
    }

    const highConfidence = matchedKeywords.filter((k) => k.confidence >= 0.9);
    if (highConfidence.length >= 2) {
      strengths.push('Multiple keywords found in relevant sections');
    }

    return strengths.slice(0, 3);
  }

  /**
   * Identify profile weaknesses
   */
  private identifyWeaknesses(
    missingKeywords: KeywordMatchDto[],
    categoryStats: Record<string, { matched: number; total: number }>,
  ): string[] {
    const weaknesses: string[] = [];

    const criticalMissing = missingKeywords.filter(
      (k) => k.category === 'technical' && (k.frequency || 0) >= 2,
    );
    if (criticalMissing.length > 0) {
      const skills = criticalMissing
        .slice(0, 2)
        .map((k) => k.keyword)
        .join(', ');
      weaknesses.push(`Missing frequently mentioned skills: ${skills}`);
    }

    if (categoryStats.technical.total > 0 && categoryStats.technical.matched === 0) {
      weaknesses.push('No technical skill matches found');
    }

    return weaknesses.slice(0, 3);
  }
}
