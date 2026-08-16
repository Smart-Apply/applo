/**
 * One object as returned by {@link StorageProvider.list}. `lastModified` is
 * what the orphaned-upload sweep ages objects out by, so a provider that
 * cannot supply it must return `null` rather than guessing.
 */
export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date | null;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param key - Unique storage key/path for the file
   * @param buffer - File content as buffer
   * @param mimeType - MIME type of the file
   * @returns Promise with the storage key
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Download a file from storage
   * @param key - Storage key/path of the file
   * @returns Promise with file buffer
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param key - Storage key/path of the file
   * @returns Promise<void>
   */
  delete(key: string): Promise<void>;

  /**
   * List every object under a key prefix.
   *
   * Used by the GDPR erasure paths and the orphaned-upload sweep — both need
   * to reason about objects the database no longer references, so they cannot
   * work off stored keys alone.
   *
   * @param prefix - Key prefix, e.g. `"<userId>/"`
   */
  list(prefix: string): Promise<StorageObject[]>;

  /**
   * Delete every object under a key prefix.
   *
   * Erasure (Art. 17 DSGVO) must not depend on the caller remembering which
   * keys exist — a forgotten key is an unbounded retention of personal data.
   *
   * @param prefix - Key prefix, e.g. `"<userId>/"`
   * @returns Number of objects deleted
   */
  deleteByPrefix(prefix: string): Promise<number>;

  /**
   * Get a signed URL for temporary file access (Azure SAS or local path)
   * @param key - Storage key/path of the file
   * @param expiresInSeconds - URL expiration time in seconds
   * @returns Promise with signed URL
   */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * Check if storage is healthy
   * @returns Promise<boolean>
   */
  healthCheck(): Promise<boolean>;
}
