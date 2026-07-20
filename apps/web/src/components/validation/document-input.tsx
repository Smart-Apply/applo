'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, ArrowRight, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface DocumentInputProps {
  resumeText: string;
  coverLetterText: string;
  onResumeChange: (text: string) => void;
  onCoverLetterChange: (text: string) => void;
  onNext: () => void;
}

type InputMode = 'upload' | 'text';

interface FileChip {
  name: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SegmentedToggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      className="inline-flex rounded-xl p-0.5"
      style={{ backgroundColor: '#F5F6F8', border: '1px solid #E6E8EE' }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-[10px] px-3 py-1 text-xs font-medium transition-all duration-200',
            value === opt.value
              ? 'bg-white text-[#1B2A49] shadow-sm'
              : 'text-[#6B6969] hover:text-[#1B2A49]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DropZone({
  onFileExtracted,
  onFilePicked,
  isExtracting,
  chip,
  onRemove,
}: {
  onFileExtracted: (text: string) => void;
  onFilePicked: (file: FileChip) => void;
  isExtracting: boolean;
  chip: FileChip | null;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    onFilePicked({ name: file.name, size: file.size });
    try {
      const { text } = await api.validation.extractText(file);
      onFileExtracted(text);
    } catch (err) {
      toastError(err, 'Die Datei konnte nicht gelesen werden');
      onRemove();
    }
  };

  if (chip) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: '#EAF1FE', border: '1px solid #C7D0E4' }}
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: '#E5E9F2' }}
        >
          <FileText className="h-4 w-4" style={{ color: '#1B2A49' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[#1B2A49]">{chip.name}</span>
            <span
              className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: '#E7F6EC', color: '#16A34A' }}
            >
              Erkannt
            </span>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: '#6B6969' }}>
            {formatBytes(chip.size)} · Text erfolgreich gelesen
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 rounded-lg p-1 text-[#6B6969] hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label="Datei entfernen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void handleFile(file);
      }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl py-8 transition-colors duration-200"
      style={{
        border: `1.5px dashed ${isDragging ? '#5581C7' : '#C7D0E4'}`,
        backgroundColor: isDragging ? '#EAF1FE' : '#EAF1FE',
        cursor: isExtracting ? 'wait' : 'pointer',
      }}
      onClick={() => !isExtracting && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: '#E5E9F2' }}
      >
        {isExtracting ? (
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#1B2A49' }} />
        ) : (
          <Upload className="h-5 w-5" style={{ color: '#1B2A49' }} />
        )}
      </div>
      <p className="text-sm text-[#1B2A49]">
        <span className="font-semibold">Datei auswählen</span> oder hierher ziehen
      </p>
      <p className="text-xs" style={{ color: '#6B6969' }}>
        PDF oder DOCX · max. 10 MB
      </p>
    </div>
  );
}

export function DocumentInput({
  resumeText,
  coverLetterText,
  onResumeChange,
  onCoverLetterChange,
  onNext,
}: DocumentInputProps) {
  const [resumeMode, setResumeMode] = useState<InputMode>('upload');
  const [coverMode, setCoverMode] = useState<InputMode>('upload');
  const [coverVisible, setCoverVisible] = useState(false);

  const [resumeExtracting, setResumeExtracting] = useState(false);
  const [coverExtracting, setCoverExtracting] = useState(false);
  const [resumeChip, setResumeChip] = useState<FileChip | null>(null);
  const [coverChip, setCoverChip] = useState<FileChip | null>(null);

  const resumeValid = resumeText.trim().length >= 50 || resumeChip !== null;

  const toggleOptions = [
    { value: 'upload', label: 'Datei hochladen' },
    { value: 'text', label: 'Text einfügen' },
  ];

  return (
    <div
      className="mx-auto w-full max-w-2xl rounded-[18px] p-7"
      style={{
        background: '#fff',
        boxShadow:
          '0 1px 2px rgba(27,42,73,.04), 0 6px 16px -8px rgba(27,42,73,.10)',
        border: '1px solid #E6E8EE',
      }}
    >
      {/* Card head */}
      <div className="mb-6">
        <h2 className="text-[19px] font-bold tracking-tight text-[#1B2A49]">Deine Unterlagen</h2>
        <p className="mt-1 text-sm" style={{ color: '#6B6969' }}>
          Nur der Lebenslauf ist Pflicht. Mit Anschreiben erhältst du noch präziseres Feedback.
        </p>
      </div>

      {/* Lebenslauf */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[14.5px] font-semibold text-[#1B2A49]">
            Lebenslauf <span className="text-red-500">*</span>
          </Label>
          <SegmentedToggle
            value={resumeMode}
            onChange={(v) => setResumeMode(v as InputMode)}
            options={toggleOptions}
          />
        </div>

        {resumeMode === 'upload' ? (
          <DropZone
            isExtracting={resumeExtracting}
            chip={resumeChip}
            onFilePicked={(chip) => {
              setResumeChip(chip);
              setResumeExtracting(true);
            }}
            onFileExtracted={(text) => {
              onResumeChange(text);
              setResumeExtracting(false);
            }}
            onRemove={() => {
              setResumeChip(null);
              onResumeChange('');
              setResumeExtracting(false);
            }}
          />
        ) : (
          <div className="relative">
            <Textarea
              rows={8}
              placeholder="Füge hier den Text deines Lebenslaufs ein…"
              value={resumeText}
              onChange={(e) => onResumeChange(e.target.value)}
              className="resize-y text-sm"
              style={{ minHeight: 150 }}
            />
            <span
              className="absolute bottom-2.5 right-3 text-xs"
              style={{ color: resumeText.length > 24000 ? '#DC2626' : '#6B6969' }}
            >
              {resumeText.length.toLocaleString('de-DE')} / 24.000
            </span>
          </div>
        )}
      </div>

      {/* Anschreiben */}
      <div className="mt-6">
        {!coverVisible ? (
          <button
            type="button"
            onClick={() => setCoverVisible(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors duration-200"
            style={{
              border: '1.5px dashed #C7D0E4',
              color: '#1B2A49',
            }}
          >
            <Plus className="h-4 w-4" />
            Anschreiben hinzufügen
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[14.5px] font-semibold text-[#1B2A49]">
                Anschreiben{' '}
                <span className="text-xs font-normal" style={{ color: '#6B6969' }}>
                  (optional)
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <SegmentedToggle
                  value={coverMode}
                  onChange={(v) => setCoverMode(v as InputMode)}
                  options={toggleOptions}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverVisible(false);
                    onCoverLetterChange('');
                    setCoverChip(null);
                  }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#6B6969' }}
                >
                  Entfernen
                </button>
              </div>
            </div>

            {coverMode === 'upload' ? (
              <DropZone
                isExtracting={coverExtracting}
                chip={coverChip}
                onFilePicked={(chip) => {
                  setCoverChip(chip);
                  setCoverExtracting(true);
                }}
                onFileExtracted={(text) => {
                  onCoverLetterChange(text);
                  setCoverExtracting(false);
                }}
                onRemove={() => {
                  setCoverChip(null);
                  onCoverLetterChange('');
                  setCoverExtracting(false);
                }}
              />
            ) : (
              <div className="relative">
                <Textarea
                  rows={6}
                  placeholder="Füge hier den Text deines Anschreibens ein…"
                  value={coverLetterText}
                  onChange={(e) => onCoverLetterChange(e.target.value)}
                  className="resize-y text-sm"
                  style={{ minHeight: 120 }}
                />
                <span
                  className="absolute bottom-2.5 right-3 text-xs"
                  style={{ color: coverLetterText.length > 12000 ? '#DC2626' : '#6B6969' }}
                >
                  {coverLetterText.length.toLocaleString('de-DE')} / 12.000
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-end">
        <Button
          type="button"
          onClick={onNext}
          disabled={!resumeValid}
          className="gap-2"
          style={
            resumeValid
              ? { backgroundColor: '#1B2A49', color: '#fff' }
              : undefined
          }
        >
          {resumeValid && <CheckCircle2 className="h-4 w-4 opacity-70" />}
          Weiter zur Zielstelle
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
