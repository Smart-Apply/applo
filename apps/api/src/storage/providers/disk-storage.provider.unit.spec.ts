import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { DiskStorageProvider } from './disk-storage.provider';

/**
 * `deleteByPrefix` is the primitive every erasure path relies on (Art. 17
 * DSGVO). It has to find nested keys, tolerate a missing prefix, and refuse a
 * traversal-shaped prefix — a `../` here would turn an account deletion into
 * arbitrary file removal.
 */
describe('DiskStorageProvider prefix operations (Unit)', () => {
  let cwd: string;
  let tmpDir: string;
  let provider: DiskStorageProvider;

  beforeEach(async () => {
    cwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'applo-storage-'));
    process.chdir(tmpDir);
    provider = new DiskStorageProvider();
    await fs.mkdir(path.join(tmpDir, 'uploads'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(cwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const seed = async (key: string, contents = 'x') => {
    const target = path.join(tmpDir, 'uploads', key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents);
  };

  it('lists every object under a prefix, including nested ones', async () => {
    await seed('user-1/resume.pdf');
    await seed('user-1/nested/job-posting.pdf');
    await seed('user-2/other.pdf');

    const objects = await provider.list('user-1/');

    expect(objects.map((object) => object.key).sort()).toEqual([
      'user-1/nested/job-posting.pdf',
      'user-1/resume.pdf',
    ]);
    expect(objects.every((object) => object.size > 0)).toBe(true);
  });

  it('returns an empty list for a prefix that holds nothing', async () => {
    expect(await provider.list('does-not-exist/')).toEqual([]);
  });

  it('deletes everything under the prefix and nothing outside it', async () => {
    await seed('user-1/resume.pdf');
    await seed('user-1/nested/job-posting.pdf');
    await seed('user-2/other.pdf');

    const deleted = await provider.deleteByPrefix('user-1/');

    expect(deleted).toBe(2);
    expect(await provider.list('user-1/')).toEqual([]);
    expect(await provider.list('user-2/')).toHaveLength(1);
  });

  it('is a no-op for an already-empty prefix', async () => {
    expect(await provider.deleteByPrefix('user-9/')).toBe(0);
  });

  it('refuses a prefix that escapes the upload directory', async () => {
    await expect(provider.deleteByPrefix('../')).rejects.toThrow(/outside the upload directory/);
    await expect(provider.list('../../etc/')).rejects.toThrow(/outside the upload directory/);
  });
});
