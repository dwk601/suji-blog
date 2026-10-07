import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/** Presigned PUT URL for direct browser uploads to R2. */
export function getUploadUrl(key: string, contentType: string, size: number) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      IfNoneMatch: "*",
    }),
    { expiresIn: 60, signableHeaders: new Set(["content-type", "if-none-match"]) },
  );
}

export function publicUrl(key: string) {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
