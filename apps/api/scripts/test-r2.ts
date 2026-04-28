import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.join(__dirname, '..', '.env') });
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
if (!accountId) throw new Error('R2_ACCOUNT_ID not set');

async function tryEndpoint(endpoint: string, label: string) {
  console.log(`\n--- Trying ${label}: ${endpoint} ---`);
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const bucket = process.env.R2_BUCKET!;
  const key = `__healthcheck/${Date.now()}.txt`;

  console.log(`1. PUT ${bucket}/${key} …`);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from('hello from smart-apply'),
        ContentType: 'text/plain',
      }),
    );
    console.log('   OK');
  } catch (e: any) {
    console.error('   FAIL:', e.$metadata?.httpStatusCode, e.name, e.message);
    return false;
  }

  console.log('2. GET (read back) …');
  const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await (got.Body as any).transformToString();
  console.log('   Body:', body);

  console.log('3. DELETE …');
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log('   OK');

  console.log(`\n✅ R2 round-trip succeeded via ${label}.`);
  return true;
}

(async () => {
  // If R2_ENDPOINT is explicitly set in .env (e.g. EU jurisdiction), use it
  // directly — that's what the production provider will do.
  const explicit = process.env.R2_ENDPOINT;
  if (explicit) {
    console.log(`Using explicit R2_ENDPOINT from .env: ${explicit}`);
    if (await tryEndpoint(explicit, 'configured').catch(() => false)) {
      return;
    }
    console.error('\n❌ Explicit endpoint failed.');
    process.exit(1);
  }

  // Otherwise, probe known jurisdictions in order.
  const globalEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  if (await tryEndpoint(globalEndpoint, 'global').catch(() => false)) {
    return;
  }

  const euEndpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;
  if (await tryEndpoint(euEndpoint, 'EU jurisdiction').catch(() => false)) {
    console.log('\n→ Set R2_ENDPOINT in .env to:', euEndpoint);
    return;
  }

  const fedrampEndpoint = `https://${accountId}.fedramp.r2.cloudflarestorage.com`;
  if (await tryEndpoint(fedrampEndpoint, 'FedRAMP').catch(() => false)) {
    console.log('\n→ Set R2_ENDPOINT in .env to:', fedrampEndpoint);
    return;
  }

  console.error('\n❌ All endpoints failed.');
  process.exit(1);
})();
