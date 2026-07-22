'use client';

import { useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useDeleteProfilePhoto,
  useProfilePhoto,
  useUploadProfilePhoto,
} from '@/hooks/use-profile';
import { toastError } from '@/lib/toast';
import { useTranslations } from 'next-intl';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

interface ProfilePhotoAvatarProps {
  /** Fallback initials shown while no photo is uploaded. */
  initials: string;
  /** Whether the profile reports a stored photo (drives the photo query). */
  hasPhoto: boolean;
}

/**
 * Bewerbungsfoto upload/preview on the profile page. The photo is optional
 * (DACH convention) and only appears in CVs where it is explicitly enabled
 * via the editor's Design panel; ATS-focused applications stay photo-free.
 */
export function ProfilePhotoAvatar({ initials, hasPhoto }: ProfilePhotoAvatarProps) {
  const t = useTranslations('profile');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: photoUrl } = useProfilePhoto(hasPhoto);
  const uploadPhoto = useUploadProfilePhoto();
  const deletePhoto = useDeleteProfilePhoto();

  const busy = uploadPhoto.isPending || deletePhoto.isPending;
  const shownPhoto = hasPhoto ? photoUrl : null;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      toastError(null, t('photo.invalidType'));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toastError(null, t('photo.tooLarge'));
      return;
    }
    uploadPhoto.mutate(file);
  };

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = ''; // allow re-selecting the same file
        }}
      />

      {shownPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated blob; next/image cannot optimize it
        <img
          src={shownPhoto}
          alt={t('photo.alt')}
          className="h-16 w-16 rounded-full border border-border object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {initials}
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
            aria-label={shownPhoto ? t('photo.replace') : t('photo.upload')}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <Camera className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56">
          <p className="font-medium">
            {shownPhoto ? t('photo.replace') : t('photo.upload')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('photo.hint')}
          </p>
        </TooltipContent>
      </Tooltip>

      {shownPhoto && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={busy}
              onClick={() => deletePhoto.mutate()}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
              aria-label={t('photo.remove')}
            >
              <X className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('photo.remove')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
