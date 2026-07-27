import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';

/**
 * Shared upload-validation pipes — single source of truth for the four
 * multipart routes (general uploads, resume parsing, Bewerbungs-Check
 * text extraction, profile photo). Previously each controller inlined its
 * own ParseFilePipe and the copies had drifted (three different size
 * messages in two languages and two formality levels for the same limit).
 *
 * NestJS 11's FileTypeValidator does magic-number sniffing by default, so
 * every pipe built here validates real file content, not just the
 * client-supplied MIME string.
 *
 * Deliberately route-specific and NOT unified: the photo's 2 MB cap (DACH
 * Bewerbungsfoto convention) and the general-upload route's
 * MAX_FILE_SIZE_MB env override.
 */

export const DOCUMENT_MAX_SIZE_MB = 10;
export const DOCUMENT_FILE_TYPE_REGEX =
  /(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

export const PHOTO_MAX_SIZE_MB = 2;
export const PHOTO_FILE_TYPE_REGEX = /^image\/(jpeg|png)$/;

const documentTooLargeMessage = (maxSizeMb: number) =>
  `Die Datei ist zu groß. Bitte lade eine Datei mit maximal ${maxSizeMb} MB hoch.`;

const PHOTO_TOO_LARGE_MESSAGE = `Das Foto ist zu groß. Bitte lade ein Bild mit maximal ${PHOTO_MAX_SIZE_MB} MB hoch.`;

/**
 * PDF/DOCX document upload (resume parsing, general uploads, Bewerbungs-Check).
 *
 * @param maxSizeMb override for routes with an env-configurable cap
 *                  (general uploads via MAX_FILE_SIZE_MB); defaults to 10 MB.
 */
export function createDocumentUploadPipe(maxSizeMb: number = DOCUMENT_MAX_SIZE_MB): ParseFilePipe {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({
        maxSize: maxSizeMb * 1024 * 1024,
        message: documentTooLargeMessage(maxSizeMb),
      }),
      new FileTypeValidator({ fileType: DOCUMENT_FILE_TYPE_REGEX }),
    ],
    fileIsRequired: true,
    errorHttpStatusCode: 400,
  });
}

/** JPEG/PNG Bewerbungsfoto upload (2 MB cap is a deliberate product decision). */
export function createPhotoUploadPipe(): ParseFilePipe {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({
        maxSize: PHOTO_MAX_SIZE_MB * 1024 * 1024,
        message: PHOTO_TOO_LARGE_MESSAGE,
      }),
      new FileTypeValidator({ fileType: PHOTO_FILE_TYPE_REGEX }),
    ],
    fileIsRequired: true,
    errorHttpStatusCode: 400,
  });
}
