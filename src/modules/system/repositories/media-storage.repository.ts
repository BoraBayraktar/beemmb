import { Client } from "minio";

type StorageConfig = {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicBaseUrl?: string;
  region?: string;
};

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value === "1" || value.toLowerCase() === "true";
}

function getStorageConfig(): StorageConfig | null {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    return null;
  }

  const port = Number(process.env.MINIO_PORT ?? "9000");
  const useSSL = parseBool(process.env.MINIO_USE_SSL, false);

  return {
    endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    bucket,
    publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL,
    // Cloudflare R2 gibi AWS-disi S3-uyumlu saglayicilar icin gerekli (R2 "auto"
    // bekler); yerel MinIO icin bos birakilabilir, minio-js kendi varsayilanini kullanir.
    region: process.env.MINIO_REGION || undefined,
  };
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export class MediaStorageRepository {
  private readonly config = getStorageConfig();
  private readonly client = this.config
    ? new Client({
        endPoint: this.config.endpoint,
        port: this.config.port,
        useSSL: this.config.useSSL,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
        ...(this.config.region ? { region: this.config.region } : {}),
      })
    : null;
  private ensureBucketPromise: Promise<void> | null = null;

  isConfigured() {
    return Boolean(this.config && this.client);
  }

  getBucketName() {
    return this.config?.bucket ?? null;
  }

  private async ensureBucket() {
    if (!this.client || !this.config) {
      throw new Error("Media storage is not configured");
    }

    const client = this.client;
    const config = this.config;

    if (this.ensureBucketPromise) {
      return this.ensureBucketPromise;
    }

    this.ensureBucketPromise = (async () => {
      const exists = await client.bucketExists(config.bucket);
      if (!exists) {
        await client.makeBucket(config.bucket);
      }
    })();

    await this.ensureBucketPromise;
  }

  resolvePublicUrl(objectKey: string) {
    if (!this.config) {
      throw new Error("Media storage is not configured");
    }

    if (this.config.publicBaseUrl) {
      return `${trimTrailingSlash(this.config.publicBaseUrl)}/${objectKey}`;
    }

    const protocol = this.config.useSSL ? "https" : "http";
    return `${protocol}://${this.config.endpoint}:${this.config.port}/${this.config.bucket}/${objectKey}`;
  }

  async uploadObject(args: {
    objectKey: string;
    contentType: string;
    bytes: Buffer;
    cacheControl?: string;
  }) {
    if (!this.client || !this.config) {
      throw new Error("Media storage is not configured");
    }

    await this.ensureBucket();

    await this.client.putObject(this.config.bucket, args.objectKey, args.bytes, args.bytes.length, {
      "Content-Type": args.contentType,
      ...(args.cacheControl ? { "Cache-Control": args.cacheControl } : {}),
    });

    return {
      bucket: this.config.bucket,
      objectKey: args.objectKey,
      url: this.resolvePublicUrl(args.objectKey),
    };
  }
}
