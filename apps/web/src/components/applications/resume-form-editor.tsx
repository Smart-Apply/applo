'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { ResumeData } from '@/types';
import { DescriptionEditor } from './description-editor';
import { AiAssistantPopover } from '@/components/ui/ai-assistant-popover';

/**
 * Textarea that converts comma-separated text to array only on blur
 */
function CommaSeparatedTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  rows,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const [text, setText] = useState(() => value.join(', '));

  // Sync external changes (e.g., initial load)
  useEffect(() => {
    setText(value.join(', '));
  }, [value]);

  const handleBlur = useCallback(() => {
    const parsed = text.split(',').map((s) => s.trim()).filter(Boolean);
    onChange(parsed);
  }, [text, onChange]);

  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

/**
 * Textarea that converts newline-separated text to array only on blur
 */
function NewlineSeparatedTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  rows,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const [text, setText] = useState(() => value.join('\n'));

  // Sync external changes (e.g., initial load)
  useEffect(() => {
    setText(value.join('\n'));
  }, [value]);

  const handleBlur = useCallback(() => {
    const parsed = text.split('\n').map((s) => s.trim()).filter(Boolean);
    onChange(parsed);
  }, [text, onChange]);

  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

interface ResumeFormEditorProps {
  value: ResumeData;
  onChange: (resume: ResumeData) => void;
  disabled?: boolean;
  /** Application ID for AI summary generation */
  applicationId?: string;
  /** Target job title for the application (editable in Stellendetails section) */
  targetJobTitle?: string;
  /** Company name from job posting (read-only display in Stellendetails section) */
  company?: string;
  /** Callback when target job title is changed */
  onTargetJobTitleChange?: (title: string) => void;
  /** Callback when target job title input loses focus (for saving) */
  onTargetJobTitleBlur?: (title: string) => void;
  /** Whether target job title update is in progress */
  isTargetJobTitleLoading?: boolean;
  /** Callback to generate summary with AI (returns generated summary text) */
  onAiSummaryRequest?: (instructions: string, currentSummary: string) => Promise<string>;
  /** Whether AI summary generation is in progress */
  isAiSummaryLoading?: boolean;
  /** Callback to generate experience description with AI (returns generated HTML) */
  onAiExperienceRequest?: (
    instructions: string,
    experienceIndex: number,
    currentDescription: string,
    experienceTitle: string,
    experienceCompany: string,
    experienceDateRange: string,
  ) => Promise<string>;
  /** Index of experience entry where AI generation is in progress (-1 if none) */
  experienceAiLoadingIndex?: number;
  /** Callback to generate project description with AI (returns generated HTML) */
  onAiProjectRequest?: (
    instructions: string,
    projectIndex: number,
    currentDescription: string,
    projectName: string,
    projectDate: string,
  ) => Promise<string>;
  /** Index of project entry where AI generation is in progress (-1 if none) */
  projectAiLoadingIndex?: number;
}

export function ResumeFormEditor({ 
  value, 
  onChange, 
  disabled, 
  applicationId,
  targetJobTitle,
  company,
  onTargetJobTitleChange,
  onTargetJobTitleBlur,
  isTargetJobTitleLoading = false,
  onAiSummaryRequest,
  isAiSummaryLoading = false,
  onAiExperienceRequest,
  experienceAiLoadingIndex = -1,
  onAiProjectRequest,
  projectAiLoadingIndex = -1,
}: ResumeFormEditorProps) {
  const t = useTranslations('editor');
  // Section navigation state
  const [activeSection, setActiveSection] = useState<string>('personal');
  
  // AI Summary Assistant state
  const [summaryAiOpen, setSummaryAiOpen] = useState(false);
  const [summaryInstructions, setSummaryInstructions] = useState('');

  // AI Experience Description Assistant state (per-entry)
  const [experienceAiOpenIndex, setExperienceAiOpenIndex] = useState<number>(-1);
  const [experienceInstructions, setExperienceInstructions] = useState('');

  // AI Project Description Assistant state (per-entry)
  const [projectAiOpenIndex, setProjectAiOpenIndex] = useState<number>(-1);
  const [projectInstructions, setProjectInstructions] = useState('');

  // Handler for AI summary generation
  const handleApplySummaryAI = useCallback(async () => {
    if (!onAiSummaryRequest || !summaryInstructions.trim()) return;
    
    try {
      const generatedSummary = await onAiSummaryRequest(
        summaryInstructions.trim(),
        value.summary || ''
      );
      
      // Update the summary field with generated content
      onChange({ ...value, summary: generatedSummary });
      
      // Clear instructions and close popover
      setSummaryInstructions('');
      setSummaryAiOpen(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('AI summary generation failed:', error);
    }
  }, [onAiSummaryRequest, summaryInstructions, value, onChange]);

  // Handler for AI experience description generation
  const handleApplyExperienceAI = useCallback(async (index: number) => {
    if (!onAiExperienceRequest || !experienceInstructions.trim()) return;
    
    const exp = value.experiences[index];
    if (!exp) return;

    try {
      const generatedDescription = await onAiExperienceRequest(
        experienceInstructions.trim(),
        index,
        exp.description || '',
        exp.title,
        exp.company,
        exp.dateRange || '',
      );
      
      // Update the experience description with generated content
      const updated = [...value.experiences];
      updated[index] = { ...updated[index], description: generatedDescription };
      onChange({ ...value, experiences: updated });
      
      // Clear instructions and close popover
      setExperienceInstructions('');
      setExperienceAiOpenIndex(-1);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('AI experience description generation failed:', error);
    }
  }, [onAiExperienceRequest, experienceInstructions, value, onChange]);

  // Handler for AI project description generation
  const handleApplyProjectAI = useCallback(async (index: number) => {
    if (!onAiProjectRequest || !projectInstructions.trim()) return;
    
    const project = (value.projects || [])[index];
    if (!project) return;

    try {
      const generatedDescription = await onAiProjectRequest(
        projectInstructions.trim(),
        index,
        project.description || '',
        project.name,
        project.date || '',
      );
      
      // Update the project description with generated content
      const updated = [...(value.projects || [])];
      updated[index] = { ...updated[index], description: generatedDescription };
      onChange({ ...value, projects: updated });
      
      // Clear instructions and close popover
      setProjectInstructions('');
      setProjectAiOpenIndex(-1);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('AI project description generation failed:', error);
    }
  }, [onAiProjectRequest, projectInstructions, value, onChange]);

  // Helper to compute fullAddress from address components
  const computeFullAddress = (data: ResumeData): string => {
    const parts: string[] = [];
    if (data.street) parts.push(data.street);
    if (data.postalCode || data.city) {
      parts.push([data.postalCode, data.city].filter(Boolean).join(' '));
    }
    if (data.country) parts.push(data.country);
    return parts.join(', ');
  };

  const updateField = <K extends keyof ResumeData>(field: K, newValue: ResumeData[K]) => {
    const updated = { ...value, [field]: newValue };
    // Auto-update fullAddress when any address field changes
    if (['street', 'postalCode', 'city', 'country'].includes(field as string)) {
      updated.fullAddress = computeFullAddress(updated);
    }
    onChange(updated);
  };

  const addSkillCategory = () => {
    onChange({
      ...value,
      skillCategories: [...value.skillCategories, { type: '', skills: [], _key: Date.now().toString() }],
    });
  };

  const updateSkillCategory = (index: number, type: string, skills: string[]) => {
    const updated = [...value.skillCategories];
    updated[index] = { type, skills };
    onChange({ ...value, skillCategories: updated });
  };

  const removeSkillCategory = (index: number) => {
    onChange({
      ...value,
      skillCategories: value.skillCategories.filter((_, i) => i !== index),
    });
  };

  const addExperience = () => {
    onChange({
      ...value,
      experiences: [
        ...value.experiences,
        { title: '', company: '', location: '', dateRange: '', description: '', achievements: [] },
      ],
    });
  };

  const updateExperience = (index: number, field: string, newValue: string | string[]) => {
    const updated = [...value.experiences];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange({ ...value, experiences: updated });
  };

  const removeExperience = (index: number) => {
    onChange({
      ...value,
      experiences: value.experiences.filter((_, i) => i !== index),
    });
  };

  const addProject = () => {
    onChange({
      ...value,
      projects: [...(value.projects || []), { name: '', description: '', date: '', highlights: [] }],
    });
  };

  const updateProject = (index: number, field: string, newValue: string | string[]) => {
    const updated = [...(value.projects || [])];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange({ ...value, projects: updated });
  };

  const removeProject = (index: number) => {
    onChange({
      ...value,
      projects: (value.projects || []).filter((_, i) => i !== index),
    });
  };

  const addEducation = () => {
    onChange({
      ...value,
      education: [
        ...(value.education || []),
        { degree: '', institution: '', year: '', fieldOfStudy: '', gpa: '', description: '' },
      ],
    });
  };

  const updateEducation = (index: number, field: string, newValue: string) => {
    const updated = [...(value.education || [])];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange({ ...value, education: updated });
  };

  const removeEducation = (index: number) => {
    onChange({
      ...value,
      education: (value.education || []).filter((_, i) => i !== index),
    });
  };

  const addCertification = () => {
    onChange({
      ...value,
      certifications: [...(value.certifications || []), { name: '', issuer: '', date: '' }],
    });
  };

  const updateCertification = (index: number, field: string, newValue: string) => {
    const updated = [...(value.certifications || [])];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange({ ...value, certifications: updated });
  };

  const removeCertification = (index: number) => {
    onChange({
      ...value,
      certifications: (value.certifications || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Selector */}
      <div className="flex items-center gap-4">
        <Label className="whitespace-nowrap font-medium">{t('resumeForm.sectionSelector.label')}</Label>
        <Select value={activeSection} onValueChange={setActiveSection}>
          <SelectTrigger className="w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">{t('resumeForm.sections.personal')}</SelectItem>
            <SelectItem value="job-details">{t('resumeForm.sections.jobDetails')}</SelectItem>
            <SelectItem value="skills">{t('resumeForm.sections.skills')}</SelectItem>
            <SelectItem value="experience">{t('resumeForm.sections.experience')}</SelectItem>
            <SelectItem value="projects">{t('resumeForm.sections.projects')}</SelectItem>
            <SelectItem value="education">{t('resumeForm.sections.education')}</SelectItem>
            <SelectItem value="certifications">{t('resumeForm.sections.certifications')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Personal Information */}
      {activeSection === 'personal' && (
      <Card>
        <CardHeader>
          <CardTitle>{t('resumeForm.sections.personal')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="candidateName">{t('resumeForm.personal.name')}</Label>
              <Input
                id="candidateName"
                value={value.candidateName}
                onChange={(e) => updateField('candidateName', e.target.value)}
                disabled={disabled}
                placeholder={t('resumeForm.personal.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={value.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={disabled}
                placeholder="deine@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('resumeForm.personal.phone')}</Label>
              <Input
                id="phone"
                value={value.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                disabled={disabled}
                placeholder="+49 123 456789"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="street">{t('resumeForm.personal.street')}</Label>
              <Input
                id="street"
                value={value.street || ''}
                onChange={(e) => updateField('street', e.target.value)}
                disabled={disabled}
                placeholder={t('resumeForm.personal.streetPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('resumeForm.personal.postalCode')}</Label>
              <Input
                id="postalCode"
                value={value.postalCode || ''}
                onChange={(e) => updateField('postalCode', e.target.value)}
                disabled={disabled}
                placeholder="47057"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t('resumeForm.personal.city')}</Label>
              <Input
                id="city"
                value={value.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
                disabled={disabled}
                placeholder="Duisburg"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="country">{t('resumeForm.personal.country')} <span className="text-muted-foreground text-xs font-normal">{t('resumeForm.optional')}</span></Label>
              <Input
                id="country"
                value={value.country || ''}
                onChange={(e) => updateField('country', e.target.value)}
                disabled={disabled}
                placeholder={t('resumeForm.personal.countryPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={value.linkedin || ''}
                onChange={(e) => updateField('linkedin', e.target.value)}
                disabled={disabled}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                value={value.github || ''}
                onChange={(e) => updateField('github', e.target.value)}
                disabled={disabled}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary">{t('resumeForm.personal.summary')}</Label>
              {onAiSummaryRequest && applicationId && (
                <AiAssistantPopover
                  open={summaryAiOpen}
                  onOpenChange={setSummaryAiOpen}
                  instructions={summaryInstructions}
                  onInstructionsChange={setSummaryInstructions}
                  onApply={handleApplySummaryAI}
                  isLoading={isAiSummaryLoading}
                  placeholder={t('resumeForm.ai.summaryPlaceholder')}
                  title={t('resumeForm.ai.summaryTitle')}
                  description={t('resumeForm.ai.summaryDescription')}
                  warningMessage={t('resumeForm.ai.summaryWarning')}
                />
              )}
            </div>
            <DescriptionEditor
              value={value.summary || ''}
              onChange={(html) => updateField('summary', html)}
              disabled={disabled}
              placeholder={t('resumeForm.personal.summaryPlaceholder')}
              minHeight="140px"
            />
          </div>
        </CardContent>
      </Card>
      )}

      {/* Job Details */}
      {activeSection === 'job-details' && (
      <Card>
        <CardHeader>
          <CardTitle>{t('resumeForm.sections.jobDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetJobTitle">{t('resumeForm.jobDetails.targetJobTitle')}</Label>
              <Input
                id="targetJobTitle"
                value={targetJobTitle || ''}
                onChange={(e) => onTargetJobTitleChange?.(e.target.value)}
                onBlur={(e) => onTargetJobTitleBlur?.(e.target.value)}
                disabled={disabled || isTargetJobTitleLoading}
                placeholder={t('resumeForm.jobDetails.targetJobTitlePlaceholder')}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {t('resumeForm.jobDetails.targetJobTitleHelp')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">{t('resumeForm.jobDetails.company')}</Label>
              <Input
                id="company"
                value={company || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('resumeForm.jobDetails.companyHelp')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Skills */}
      {activeSection === 'skills' && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('resumeForm.sections.skills')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSkillCategory}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('resumeForm.skills.addCategory')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {value.skillCategories.map((category, index) => (
            <div key={category._key || `skill-${index}`} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Input
                    value={category.type}
                    onChange={(e) =>
                      updateSkillCategory(index, e.target.value, category.skills)
                    }
                    disabled={disabled}
                    placeholder={t('resumeForm.skills.categoryPlaceholder')}
                  />
                  <CommaSeparatedTextarea
                    value={category.skills}
                    onChange={(skills) => updateSkillCategory(index, category.type, skills)}
                    disabled={disabled}
                    placeholder={t('resumeForm.skills.skillsPlaceholder')}
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSkillCategory(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {value.skillCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('resumeForm.skills.empty')}</p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Experience */}
      {activeSection === 'experience' && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('resumeForm.sections.experience')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExperience}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('resumeForm.experience.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {value.experiences.map((exp, index) => (
            <div key={index} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(index, 'title', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.experience.positionPlaceholder')}
                    />
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.experience.companyPlaceholder')}
                    />
                    <Input
                      value={exp.location || ''}
                      onChange={(e) => updateExperience(index, 'location', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.experience.locationPlaceholder')}
                    />
                    <Input
                      value={exp.dateRange}
                      onChange={(e) => updateExperience(index, 'dateRange', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.experience.dateRangePlaceholder')}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`exp-description-${index}`}>{t('resumeForm.description')}</Label>
                      {onAiExperienceRequest && exp.title && exp.company && (
                        <AiAssistantPopover
                          open={experienceAiOpenIndex === index}
                          onOpenChange={(open) => {
                            if (open) {
                              setExperienceAiOpenIndex(index);
                              setExperienceInstructions('');
                            } else {
                              setExperienceAiOpenIndex(-1);
                            }
                          }}
                          instructions={experienceInstructions}
                          onInstructionsChange={setExperienceInstructions}
                          onApply={() => handleApplyExperienceAI(index)}
                          isLoading={experienceAiLoadingIndex === index}
                          placeholder={t('resumeForm.ai.experiencePlaceholder')}
                          title={t('resumeForm.ai.descriptionTitle')}
                          description={t('resumeForm.ai.experienceDescription')}
                          warningMessage={t('resumeForm.ai.descriptionWarning')}
                        />
                      )}
                    </div>
                    <DescriptionEditor
                      value={exp.description || ''}
                      onChange={(html) => updateExperience(index, 'description', html)}
                      disabled={disabled}
                      placeholder={t('resumeForm.experience.descriptionPlaceholder')}
                      minHeight="160px"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExperience(index)}
                  disabled={disabled}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {value.experiences.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('resumeForm.experience.empty')}</p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Projects */}
      {activeSection === 'projects' && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('resumeForm.sections.projects')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProject}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('resumeForm.projects.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(value.projects || []).map((project, index) => (
            <div key={index} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={project.name}
                      onChange={(e) => updateProject(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.projects.namePlaceholder')}
                    />
                    <Input
                      value={project.date || ''}
                      onChange={(e) => updateProject(index, 'date', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.projects.datePlaceholder')}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`project-description-${index}`}>{t('resumeForm.description')}</Label>
                      {onAiProjectRequest && project.name && (
                        <AiAssistantPopover
                          open={projectAiOpenIndex === index}
                          onOpenChange={(open) => {
                            if (open) {
                              setProjectAiOpenIndex(index);
                              setProjectInstructions('');
                            } else {
                              setProjectAiOpenIndex(-1);
                            }
                          }}
                          instructions={projectInstructions}
                          onInstructionsChange={setProjectInstructions}
                          onApply={() => handleApplyProjectAI(index)}
                          isLoading={projectAiLoadingIndex === index}
                          placeholder={t('resumeForm.ai.projectPlaceholder')}
                          title={t('resumeForm.ai.descriptionTitle')}
                          description={t('resumeForm.ai.projectDescription')}
                          warningMessage={t('resumeForm.ai.descriptionWarning')}
                        />
                      )}
                    </div>
                    <DescriptionEditor
                      value={project.description || ''}
                      onChange={(html) => updateProject(index, 'description', html)}
                      disabled={disabled}
                      placeholder={t('resumeForm.projects.descriptionPlaceholder')}
                      minHeight="120px"
                    />
                  </div>
                  <NewlineSeparatedTextarea
                    value={project.highlights || []}
                    onChange={(highlights) => updateProject(index, 'highlights', highlights)}
                    disabled={disabled}
                    placeholder={t('resumeForm.projects.highlightsPlaceholder')}
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeProject(index)}
                  disabled={disabled}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(!value.projects || value.projects.length === 0) && (
            <p className="text-sm text-muted-foreground">{t('resumeForm.projects.empty')}</p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Education */}
      {activeSection === 'education' && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('resumeForm.sections.education')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEducation}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('resumeForm.education.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(value.education || []).map((edu, index) => (
            <div key={index} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.education.degreePlaceholder')}
                    />
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.education.institutionPlaceholder')}
                    />
                    <Input
                      value={edu.year}
                      onChange={(e) => updateEducation(index, 'year', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.education.yearPlaceholder')}
                    />
                    <Input
                      value={edu.fieldOfStudy || ''}
                      onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value)}
                      disabled={disabled}
                      placeholder={t('resumeForm.education.fieldPlaceholder')}
                    />
                  </div>
                  <Input
                    value={edu.gpa || ''}
                    onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                    disabled={disabled}
                    placeholder={t('resumeForm.education.gpaPlaceholder')}
                  />
                  <DescriptionEditor
                    value={edu.description || ''}
                    onChange={(html) => updateEducation(index, 'description', html)}
                    disabled={disabled}
                    placeholder={t('resumeForm.education.descriptionPlaceholder')}
                    minHeight="100px"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEducation(index)}
                  disabled={disabled}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(!value.education || value.education.length === 0) && (
            <p className="text-sm text-muted-foreground">{t('resumeForm.education.empty')}</p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Certifications */}
      {activeSection === 'certifications' && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('resumeForm.sections.certifications')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCertification}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('resumeForm.certifications.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(value.certifications || []).map((cert, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex-1 grid gap-3 md:grid-cols-3">
                <Input
                  value={cert.name}
                  onChange={(e) => updateCertification(index, 'name', e.target.value)}
                  disabled={disabled}
                  placeholder={t('resumeForm.certifications.namePlaceholder')}
                />
                <Input
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                  disabled={disabled}
                  placeholder={t('resumeForm.certifications.issuerPlaceholder')}
                />
                <Input
                  value={cert.date || ''}
                  onChange={(e) => updateCertification(index, 'date', e.target.value)}
                  disabled={disabled}
                  placeholder={t('resumeForm.certifications.datePlaceholder')}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCertification(index)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {(!value.certifications || value.certifications.length === 0) && (
            <p className="text-sm text-muted-foreground">{t('resumeForm.certifications.empty')}</p>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
