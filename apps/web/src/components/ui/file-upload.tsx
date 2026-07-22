'use client';

import * as React from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FileUploadProps {
  /**
   * Accepted file types (MIME types)
   * @default { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
   */
  accept?: Accept;
  /**
   * Maximum file size in bytes
   * @default 10 * 1024 * 1024 (10MB)
   */
  maxSize?: number;
  /**
   * Callback when a file is selected
   */
  onFileSelect: (file: File) => void;
  /**
   * Callback when file is removed
   */
  onFileRemove?: () => void;
  /**
   * Whether the upload is in progress
   */
  isUploading?: boolean;
  /**
   * Error message to display
   */
  error?: string | null;
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Hint text shown below the upload area
   */
  hint?: string;
}

export function FileUpload({
  accept = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  onFileSelect,
  onFileRemove,
  isUploading = false,
  error = null,
  disabled = false,
  className,
  hint,
}: FileUploadProps) {
  const t = useTranslations('common.fileUpload');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setLocalError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const errorCode = rejection.errors[0]?.code;

        if (errorCode === 'file-too-large') {
          setLocalError(t('errorTooLarge'));
        } else if (errorCode === 'file-invalid-type') {
          setLocalError(t('errorInvalidType'));
        } else {
          setLocalError(t('errorGeneric'));
        }
        return;
      }

      // Handle accepted file
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, t]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || isUploading,
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setLocalError(null);
    onFileRemove?.();
  };

  const displayError = error || localError;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          'hover:border-primary/50 hover:bg-muted/50',
          isDragActive && !isDragReject && 'border-primary bg-primary/5',
          isDragReject && 'border-destructive bg-destructive/5',
          displayError && 'border-destructive',
          (disabled || isUploading) && 'cursor-not-allowed opacity-50',
          !selectedFile && 'min-h-[160px]'
        )}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleRemoveFile}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t('removeFile')}</span>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-medium">
                {isDragActive
                  ? t('dropActive')
                  : t('dropPrompt')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{hint ?? t('defaultHint')}</p>
            </div>
          </>
        )}
      </div>

      {displayError && (
        <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
