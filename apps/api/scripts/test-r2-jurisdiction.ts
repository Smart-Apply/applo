import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.join(__dirname, '..', '.env') });
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID!;
const bucket = process.env.R2_BUCKET!;
const creds = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
};

const endpoints = {
  'global (auto location)':    `https://${accountId}.r2.cloudflarestorage.com`,
  'EU jurisdiction (locked)':  `https://${accountId}.eu.r2.cloudflarestorage.com`,
};

(async () => {
  for (const [label, endpoint] of Object.entries(endpoints)) {
    process.stdout.write(`${label.padEnd(28)} `);
    const c = new S3Client({ region: 'auto', endpoint, credentials: creds, forcePathStyle: true });
    const key = `__juris-test/${Date.now()}.txt`;
    try {
      await c.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from('x') }));
      const head = await c.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      await c.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      console.log(`✅ accessible (${endpoint})`);
    } catch (e: any) {
      console.log(`❌ ${e.name || e.$metadata?.httpStatusCode}: ${e.message?.slice(0, 60)}`);
    }
  }
})();
