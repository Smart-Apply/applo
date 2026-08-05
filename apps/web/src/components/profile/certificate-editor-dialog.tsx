'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Certificate } from '@/types';
import { useTranslations } from 'next-intl';

interface CertificateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item being edited; `null`/`undefined` opens add mode. */
  initial?: Certificate | null;
  onSubmit: (certificate: Certificate) => void;
}

/** Add / edit form for a single certificate, rendered as a dialog on the profile page. */
export function CertificateEditorDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: CertificateEditorDialogProps) {
  const t = useTranslations('profile');
  const isEditing = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {isEditing ? t('certificates.editTitle') : t('certificates.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <CertificateForm
          initial={initial}
          isEditing={isEditing}
          onSubmit={(cert) => {
            onSubmit(cert);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CertificateForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
}: {
  initial?: Certificate | null;
  isEditing: boolean;
  onSubmit: (certificate: Certificate) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('profile');

  const [name, setName] = useState(initial?.name ?? '');
  const [issuer, setIssuer] = useState(initial?.issuer ?? '');
  const [issueDate, setIssueDate] = useState(
    initial?.dateObtained ? initial.dateObtained.split('T')[0] : '',
  );
  const [expiryDate, setExpiryDate] = useState(
    initial?.expiryDate ? initial.expiryDate.split('T')[0] : '',
  );
  const [credentialId, setCredentialId] = useState(initial?.credentialId ?? '');
  const [credentialUrl, setCredentialUrl] = useState(initial?.url ?? '');
  const [urlError, setUrlError] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(focus);
  }, []);

  const canSubmit = name.trim() && issuer.trim();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t('certificates.errors.name'));
      nameRef.current?.focus();
      return;
    }
    if (!issuer.trim()) {
      toast.error(t('certificates.errors.issuer'));
      return;
    }
    if (credentialUrl.trim()) {
      try {
        new URL(
          credentialUrl.trim().startsWith('http')
            ? credentialUrl.trim()
            : `https://${credentialUrl.trim()}`,
        );
      } catch {
        setUrlError(t('certificates.errors.url'));
        return;
      }
    }
    if (issueDate && expiryDate && new Date(expiryDate) < new Date(issueDate)) {
      toast.error(t('certificates.errors.dateOrder'));
      return;
    }

    let finalUrl = credentialUrl.trim() || undefined;
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `https://${finalUrl}`;
    }

    onSubmit({
      ...(initial?.id && { id: initial.id }),
      name: name.trim(),
      issuer: issuer.trim(),
      dateObtained: issueDate ? new Date(issueDate).toISOString() : undefined,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      credentialId: credentialId.trim() || undefined,
      url: finalUrl,
    });
  };

  return (
    <div className="space-y-5 px-6 pb-6 pt-2">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('certificates.name')} <span className="text-destructive">*</span>
        </label>
        <Input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('certificates.namePlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* Issuer */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('certificates.issuer')} <span className="text-destructive">*</span>
        </label>
        <Input
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder={t('certificates.issuerPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('certificates.issuedAt')}{' '}
            <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
          </label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('certificates.expiresAt')}{' '}
            <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
          </label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t('certificates.noExpiry')}</p>
        </div>
      </div>

      {/* Credential ID */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('certificates.credentialId')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <Input
          value={credentialId}
          onChange={(e) => setCredentialId(e.target.value)}
          placeholder={t('certificates.credentialPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.link')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={credentialUrl}
            onChange={(e) => {
              setCredentialUrl(e.target.value);
              setUrlError('');
            }}
            placeholder="example.com/verify/certificate"
            className="pl-9"
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />
        </div>
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {isEditing ? t('actions.save') : t('actions.add')}
        </Button>
      </div>
    </div>
  );
}
