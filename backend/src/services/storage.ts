/**
 * Persistence layer for the refresh job + changes API.
 *
 * In Azure (Container Apps), we use Azure Blob Storage with the workload's
 * managed identity (DefaultAzureCredential -> User-Assigned Managed Identity)
 * — no shared key, so the storage account can keep `allowSharedKeyAccess=false`
 * to satisfy security policy.
 *
 * Locally, we fall back to the filesystem at `MNT_PATH` (default
 * `<cwd>/backend/data`), so `npm run job:refresh` works without Azure auth.
 *
 * Switch is driven by the `AZURE_STORAGE_ACCOUNT` env var: when set, blob
 * mode is used; otherwise filesystem mode.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  type ContainerClient,
  RestError,
} from '@azure/storage-blob';

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'data';
const LOCAL_ROOT = process.env.MNT_PATH || join(process.cwd(), 'data');

export type StorageMode = 'blob' | 'local';

export function getStorageMode(): StorageMode {
  return ACCOUNT ? 'blob' : 'local';
}

let cachedClient: ContainerClient | null = null;
function blobContainer(): ContainerClient {
  if (cachedClient) return cachedClient;
  if (!ACCOUNT) {
    throw new Error('AZURE_STORAGE_ACCOUNT not set');
  }
  const credential = new DefaultAzureCredential();
  const service = new BlobServiceClient(
    `https://${ACCOUNT}.blob.core.windows.net`,
    credential,
  );
  cachedClient = service.getContainerClient(CONTAINER);
  return cachedClient;
}

async function streamToString(
  readable: NodeJS.ReadableStream | undefined,
): Promise<string> {
  if (!readable) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Read a JSON blob/file. Returns null when the blob does not exist (or any
 * other read failure that the caller can treat as "nothing there yet").
 */
export async function readJson<T>(name: string): Promise<T | null> {
  if (getStorageMode() === 'blob') {
    try {
      const blob = blobContainer().getBlockBlobClient(name);
      const dl = await blob.download();
      const text = await streamToString(dl.readableStreamBody);
      if (!text) return null;
      return JSON.parse(text) as T;
    } catch (err) {
      if (err instanceof RestError && err.statusCode === 404) {
        return null;
      }
      console.error(`storage.readJson(${name}) failed:`, err);
      return null;
    }
  }

  const path = join(LOCAL_ROOT, name);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`storage.readJson(${name}) failed:`, err);
    return null;
  }
}

/**
 * Write a JSON blob/file. In blob mode, the container is created on demand.
 * In local mode, the parent directory tree is created if missing.
 */
export async function writeJson(name: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2);
  if (getStorageMode() === 'blob') {
    const container = blobContainer();
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(name);
    await blob.upload(body, Buffer.byteLength(body, 'utf8'), {
      blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
    });
    return;
  }

  const path = join(LOCAL_ROOT, name);
  const dir = path.split(/[\\/]/).slice(0, -1).join('/');
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(LOCAL_ROOT)) {
    mkdirSync(LOCAL_ROOT, { recursive: true });
  }
  writeFileSync(path, body, 'utf8');
}

/**
 * Best-effort: ensure the local root exists (no-op in blob mode). Job
 * entrypoint calls this so the initial `readJson` doesn't trip on a missing
 * directory in dev.
 */
export function ensureLocalRoot(): void {
  if (getStorageMode() === 'blob') return;
  if (!existsSync(LOCAL_ROOT)) {
    mkdirSync(LOCAL_ROOT, { recursive: true });
  }
}
