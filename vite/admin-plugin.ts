import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import JSZip from 'jszip';
import type { IncomingMessage, RequestOptions, ServerResponse } from 'http';
import { atlasNavigation as defaultIndexTree } from '../src/app/data/admin/atlas-navigation';
import { MATERIAL_PASSPORTS, TAXONOMY_ALIASES } from '../src/app/data/admin/material-passports';
import {
  buildRestoreGuide,
  collectCloudinaryPublicIds,
  readDataFiles,
  sanitizeAdminSettings,
  writeDataFileWithBackups,
} from '../scripts/export-utils';
import { mergePreservingExistingImages } from '../src/app/components/admin/node-editor/image-save-guard';


function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
  });
}

function jsonRes(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function postOnly(res: ServerResponse): boolean {
  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'POST only' }));
  return true;
}

type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

function postRoute(handler: (body: Record<string, any>, res: ServerResponse) => Promise<void>): RouteHandler {
  return async (req, res) => {
    if (req.method !== 'POST') { postOnly(res); return; }
    try {
      const parsed = JSON.parse(await readBody(req));
      await handler(parsed, res);
    } catch (err: any) {
      jsonRes(res, { error: err.message }, 500);
    }
  };
}

// ── JSON file read/write helpers ─────────────────────────

function fileReadRoute(filepath: string): RouteHandler {
  return (_req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.end(fs.readFileSync(filepath, 'utf-8'));
    } catch (err: any) {
      jsonRes(res, { error: err.message }, 500);
    }
  };
}

function fileWriteRoute(filepath: string, opts?: { backup?: boolean }): RouteHandler {
  return postRoute(async (_, res) => {
    const body = JSON.stringify(_);
    JSON.parse(body); // validate
    if (opts?.backup && fs.existsSync(filepath)) {
      const b2 = filepath.replace(/\.json$/, '.backup.2.json');
      const b1 = filepath.replace(/\.json$/, '.backup.1.json');
      const b0 = filepath.replace(/\.json$/, '.backup.json');
      try { if (fs.existsSync(b1)) fs.copyFileSync(b1, b2); } catch { /* ignore */ }
      try { if (fs.existsSync(b0)) fs.copyFileSync(b0, b1); } catch { /* ignore */ }
      fs.copyFileSync(filepath, b0);
    }
    fs.writeFileSync(filepath, body, 'utf-8');
    jsonRes(res, { ok: true, bytes: body.length });
  });
}

// Variant: accept raw body string to preserve original formatting
function rawWriteRoute(filepath: string, opts?: { backup?: boolean }): RouteHandler {
  return async (req, res) => {
    if (req.method !== 'POST') { postOnly(res); return; }
    try {
      const body = await readBody(req);
      JSON.parse(body); // validate
      
      
      if (opts?.backup && fs.existsSync(filepath)) {
        const b2 = filepath.replace(/\.json$/, '.backup.2.json');
        const b1 = filepath.replace(/\.json$/, '.backup.1.json');
        const b0 = filepath.replace(/\.json$/, '.backup.json');
        try { if (fs.existsSync(b1)) fs.copyFileSync(b1, b2); } catch { /* ignore */ }
        try { if (fs.existsSync(b0)) fs.copyFileSync(b0, b1); } catch { /* ignore */ }
        fs.copyFileSync(filepath, b0);
      }
      fs.writeFileSync(filepath, body, 'utf-8');
      jsonRes(res, { ok: true, bytes: body.length });
    } catch (err: any) {
      jsonRes(res, { error: err.message }, 500);
    }
  };
}

// ── External API proxy helper ────────────────────────────

interface ProxyCallOpts {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
}

function proxyFetch(opts: ProxyCallOpts): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const reqOpts: RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: opts.headers,
    };
    const req = client.request(reqOpts, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve({ ok: true, status: 200, data, text: '' });
          } catch {
            resolve({ ok: false, status: res.statusCode || 500, data: null, text: body });
          }
        } else {
          resolve({ ok: false, status: res.statusCode || 500, data: null, text: body });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function proxyBinary(opts: ProxyCallOpts): Promise<{ ok: boolean; status: number; body: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const reqOpts: RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: opts.headers,
    };
    const req = client.request(reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); });
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const ok = !!res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
        resolve({
          ok,
          status: res.statusCode || 500,
          body,
          contentType: (res.headers['content-type'] as string) || 'application/octet-stream',
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ── IIIF helpers ─────────────────────────────────────────

function extractLabel(label: any): string {
  if (!label) return '';
  if (typeof label === 'string') return label;
  if (Array.isArray(label)) return label.map(extractLabel).filter(Boolean).join('; ');
  if (label['@value']) return label['@value'];
  const vals = Object.values(label).flat();
  return vals.filter((v): v is string => typeof v === 'string').join('; ');
}

function extractServiceBase(service: any): string {
  if (!service) return '';
  if (Array.isArray(service)) service = service[0];
  const id = service.id || service['@id'] || '';
  return id.replace(/\/info\.json$/, '');
}

// ── Unified admin plugin ─────────────────────────────────

function adminPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, '../src/app/data/admin');
  const atlasFile = path.join(dataDir, 'atlas-data.json');
  const indexTreeFile = path.join(dataDir, 'index-tree.json');
  const orderFile = path.join(dataDir, 'atlas-order.json');
  const supplierFile = path.join(dataDir, 'supplier-directory.json');
  const evidenceFile = path.join(dataDir, 'evidence-records.json');
  const passportModuleFile = path.join(dataDir, 'material-passports.ts');
  const adminSettingsFile = path.join(dataDir, 'admin-settings.json');
  const passportModuleBackups = {
    b0: passportModuleFile.replace(/\.ts$/, '.backup.ts'),
    b1: passportModuleFile.replace(/\.ts$/, '.backup.1.ts'),
    b2: passportModuleFile.replace(/\.ts$/, '.backup.2.ts'),
  };

  type PassportModulePayload = {
    passports: Record<string, any>;
    aliases: Record<string, any>;
  };

  let passportState: PassportModulePayload = {
    passports: JSON.parse(JSON.stringify(MATERIAL_PASSPORTS)),
    aliases: JSON.parse(JSON.stringify(TAXONOMY_ALIASES)),
  };

  function rotatePassportBackups() {
    try { if (fs.existsSync(passportModuleBackups.b1)) fs.copyFileSync(passportModuleBackups.b1, passportModuleBackups.b2); } catch { /* ignore */ }
    try { if (fs.existsSync(passportModuleBackups.b0)) fs.copyFileSync(passportModuleBackups.b0, passportModuleBackups.b1); } catch { /* ignore */ }
    try { if (fs.existsSync(passportModuleFile)) fs.copyFileSync(passportModuleFile, passportModuleBackups.b0); } catch { /* ignore */ }
  }

  function writePassportModule(nextState: PassportModulePayload) {
    rotatePassportBackups();
    const source = [
      'import type { MaterialPassportRegistry, TaxonomyAliasRegistry } from "../../types/material";',
      '',
      'export const MATERIAL_PASSPORTS: MaterialPassportRegistry = '
        + `${JSON.stringify(nextState.passports, null, 2)};`,
      '',
      'export const TAXONOMY_ALIASES: TaxonomyAliasRegistry = '
        + `${JSON.stringify(nextState.aliases, null, 2)};`,
      '',
    ].join('\n');
    fs.writeFileSync(passportModuleFile, source, 'utf-8');
    passportState = nextState;
  }

  function readAtlasJson(): Record<string, any> {
    return JSON.parse(fs.readFileSync(atlasFile, 'utf-8'));
  }

  function rotateJsonBackups(filepath: string) {
    const b2 = filepath.replace(/\.json$/, '.backup.2.json');
    const b1 = filepath.replace(/\.json$/, '.backup.1.json');
    const b0 = filepath.replace(/\.json$/, '.backup.json');
    try { if (fs.existsSync(b1)) fs.copyFileSync(b1, b2); } catch { /* ignore */ }
    try { if (fs.existsSync(b0)) fs.copyFileSync(b0, b1); } catch { /* ignore */ }
    if (fs.existsSync(filepath)) fs.copyFileSync(filepath, b0);
  }

  function computeNodeRevision(nodeId: string): string {
    const atlas = readAtlasJson();
    const payload = {
      passport: passportState.passports?.[nodeId] || null,
      images: atlas.images?.[nodeId] || null,
      tags: atlas.tags?.[nodeId] || null,
      era: atlas.era?.[nodeId] || null,
      origins: atlas.origins?.[nodeId] || null,
      scientific: atlas.scientific?.[nodeId] || null,
      videos: atlas.videos?.[nodeId] || null,
      embeds: atlas.embeds?.[nodeId] || null,
      links: atlas.links?.[nodeId] || null,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  return {
    name: 'admin-api',
    handleHotUpdate(ctx) {
      const f = ctx.file.replace(/\\/g, '/');
      if (f.includes('material-passports') && (f.endsWith('.ts') || f.includes('material-passports.backup'))) {
        return [];
      }
    },
    configureServer(server) {
      const use = server.middlewares.use.bind(server.middlewares);
      const envValue = (key: string): string => {
        const fromVite = (server.config.env?.[key] as string | undefined) || '';
        return fromVite || process.env[key] || '';
      };

      // ── Client telemetry sink (dev-only observability) ──
      use('/__telemetry/client', postRoute(async (body, res) => {
        console.debug('[telemetry]', body);
        jsonRes(res, { ok: true });
      }));

      // ── Atlas data CRUD ──
      use('/__admin/read-atlas-data', fileReadRoute(atlasFile));
      use('/__admin/save-atlas-data', rawWriteRoute(atlasFile, { backup: true }));
      use('/__admin/read-index-tree', (_req, res) => {
        try {
          let source: unknown = null;
          if (fs.existsSync(indexTreeFile)) {
            const parsed = JSON.parse(fs.readFileSync(indexTreeFile, 'utf-8'));
            source = Array.isArray(parsed) ? parsed : parsed?.tree;
          }
          const tree = Array.isArray(source) && source.length > 0 ? source : defaultIndexTree;
          jsonRes(res, { tree });
        } catch (err: any) {
          jsonRes(res, { error: err.message }, 500);
        }
      });
      use('/__admin/save-index-tree', rawWriteRoute(indexTreeFile, { backup: true }));
      use('/__admin/read-atlas-order', fileReadRoute(orderFile));
      use('/__admin/save-atlas-order', rawWriteRoute(orderFile));

      // ── Simple file writes ──
      use('/__admin/save-suppliers', rawWriteRoute(supplierFile, { backup: true }));
      use('/__admin/save-evidence', rawWriteRoute(evidenceFile, { backup: true }));
      use('/__admin/update-supplier-status', postRoute(async (body, res) => {
        const { supplierId, status } = body;
        if (!supplierId || !status) { jsonRes(res, { error: 'supplierId and status required' }, 400); return; }
        const valid = ['draft', 'reviewed', 'verified', 'published'];
        if (!valid.includes(status)) { jsonRes(res, { error: 'Invalid status' }, 400); return; }
        const data = JSON.parse(fs.readFileSync(supplierFile, 'utf-8'));
        if (!data?.suppliers?.[supplierId]) { jsonRes(res, { error: 'Supplier not found' }, 404); return; }
        if (fs.existsSync(supplierFile)) {
          const b2 = supplierFile.replace(/\.json$/, '.backup.2.json');
          const b1 = supplierFile.replace(/\.json$/, '.backup.1.json');
          const b0 = supplierFile.replace(/\.json$/, '.backup.json');
          try { if (fs.existsSync(b1)) fs.copyFileSync(b1, b2); } catch { /* ignore */ }
          try { if (fs.existsSync(b0)) fs.copyFileSync(b0, b1); } catch { /* ignore */ }
          fs.copyFileSync(supplierFile, b0);
        }
        data.suppliers[supplierId].status = status;
        data.suppliers[supplierId].lastUpdated = new Date().toISOString().slice(0, 10);
        fs.writeFileSync(supplierFile, JSON.stringify(data, null, 2), 'utf-8');
        jsonRes(res, { ok: true });
      }));
      use('/__admin/update-evidence-status', postRoute(async (body, res) => {
        const { evidenceId, status } = body;
        if (!evidenceId || !status) { jsonRes(res, { error: 'evidenceId and status required' }, 400); return; }
        const valid = ['draft', 'reviewed', 'verified', 'published'];
        if (!valid.includes(status)) { jsonRes(res, { error: 'Invalid status' }, 400); return; }
        const data = JSON.parse(fs.readFileSync(evidenceFile, 'utf-8'));
        if (!data?.[evidenceId]) { jsonRes(res, { error: 'Evidence not found' }, 404); return; }
        if (fs.existsSync(evidenceFile)) {
          const b2 = evidenceFile.replace(/\.json$/, '.backup.2.json');
          const b1 = evidenceFile.replace(/\.json$/, '.backup.1.json');
          const b0 = evidenceFile.replace(/\.json$/, '.backup.json');
          try { if (fs.existsSync(b1)) fs.copyFileSync(b1, b2); } catch { /* ignore */ }
          try { if (fs.existsSync(b0)) fs.copyFileSync(b0, b1); } catch { /* ignore */ }
          fs.copyFileSync(evidenceFile, b0);
        }
        data[evidenceId].status = status;
        data[evidenceId].verifiedDate = new Date().toISOString().slice(0, 10);
        fs.writeFileSync(evidenceFile, JSON.stringify(data, null, 2), 'utf-8');
        jsonRes(res, { ok: true });
      }));
      use('/__admin/read-verification-queue', (_req, res) => {
        try {
          const supplierPayload = JSON.parse(fs.readFileSync(supplierFile, 'utf-8'));
          const evidencePayload = JSON.parse(fs.readFileSync(evidenceFile, 'utf-8'));
          jsonRes(res, {
            passports: passportState.passports || {},
            suppliers: supplierPayload?.suppliers || {},
            evidence: evidencePayload || {},
          });
        } catch (err: any) {
          jsonRes(res, { error: err.message }, 500);
        }
      });

      // ── Admin settings (API keys, etc.) — persisted to project file ──
      use('/__admin/read-admin-settings', (_req, res) => {
        try {
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync(adminSettingsFile)) {
            res.end(fs.readFileSync(adminSettingsFile, 'utf-8'));
          } else {
            res.end('{}');
          }
        } catch (err: any) {
          jsonRes(res, { error: err.message }, 500);
        }
      });
      use('/__admin/save-admin-settings', rawWriteRoute(adminSettingsFile, { backup: true }));
      use('/__admin/export-bundle', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'GET only' }));
          return;
        }
        try {
          const files = readDataFiles(dataDir);
          const settingsPath = 'data/admin-settings.json';
          if (files[settingsPath]) {
            files[settingsPath] = sanitizeAdminSettings(files[settingsPath]);
          }
          const atlasJson = files['data/atlas-data.json'] || '{}';
          const manifest = collectCloudinaryPublicIds(atlasJson);

          const zip = new JSZip();
          for (const [filePath, content] of Object.entries(files)) {
            zip.file(filePath, content);
          }
          zip.file('cloudinary-manifest.json', JSON.stringify(manifest, null, 2));
          zip.file('RESTORE.md', buildRestoreGuide());
          zip.file(
            'metadata.json',
            JSON.stringify(
              {
                schemaVersion: '1.0',
                exportedAt: new Date().toISOString(),
                fileCount: Object.keys(files).length,
              },
              null,
              2,
            ),
          );

          const payload = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="atlas-bundle-${new Date().toISOString().slice(0, 10)}.zip"`);
          res.end(payload);
        } catch (err: any) {
          jsonRes(res, { error: err.message }, 500);
        }
      });
      use('/__admin/import-bundle', postRoute(async (body, res) => {
        const bundleBase64 = body.bundleBase64;
        if (!bundleBase64 || typeof bundleBase64 !== 'string') {
          jsonRes(res, { error: 'bundleBase64 is required' }, 400);
          return;
        }
        const zip = await JSZip.loadAsync(Buffer.from(bundleBase64, 'base64'));
        const restored: string[] = [];
        for (const [entryPath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir || !entryPath.startsWith('data/')) continue;
          const filename = entryPath.replace(/^data\//, '');
          const absolutePath = path.join(dataDir, filename);
          if (!absolutePath.startsWith(dataDir)) continue;
          const content = await zipEntry.async('string');
          writeDataFileWithBackups(absolutePath, content);
          restored.push(filename);
        }
        jsonRes(res, { ok: true, restoredCount: restored.length, restored });
      }));

      // ── Cloudinary signed tools (server-only credentials via env) ──
      use('/__admin/cloudinary-signed-status', postRoute(async (_body, res) => {
        const cloudName = envValue('CLOUDINARY_CLOUD_NAME');
        const apiKey = envValue('CLOUDINARY_API_KEY');
        const apiSecret = envValue('CLOUDINARY_API_SECRET');
        jsonRes(res, {
          configured: !!(cloudName && apiKey && apiSecret),
          cloudNameConfigured: !!cloudName,
          apiKeyConfigured: !!apiKey,
          apiSecretConfigured: !!apiSecret,
        });
      }));
      use('/__admin/cloudinary-upscale', postRoute(async (body, res) => {
        const { imageUrl, cloudName, scale = '2x' } = body;
        if (!imageUrl || typeof imageUrl !== 'string') {
          jsonRes(res, { error: 'imageUrl is required' }, 400);
          return;
        }
        if (!cloudName || typeof cloudName !== 'string') {
          jsonRes(res, { error: 'cloudName is required' }, 400);
          return;
        }
        const apiKey = envValue('CLOUDINARY_API_KEY');
        const apiSecret = envValue('CLOUDINARY_API_SECRET');
        const resolvedEnvCloudName = envValue('CLOUDINARY_CLOUD_NAME');
        if (!resolvedEnvCloudName || !apiKey || !apiSecret) {
          jsonRes(res, { error: 'Cloudinary signed tools are not configured in environment variables' }, 400);
          return;
        }
        if (resolvedEnvCloudName !== cloudName) {
          jsonRes(res, { error: 'Configured Cloudinary cloud name does not match server environment' }, 400);
          return;
        }

        const now = Date.now();
        const bodyParams = new URLSearchParams();
        bodyParams.set('file', imageUrl);
        bodyParams.set('folder', 'atlas/upscaled');
        bodyParams.set('public_id', `upscaled-${now}`);
        bodyParams.set('transformation', scale === '4x' ? 'e_upscale' : 'e_upscale');

        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const uploadRes = await proxyFetch({
          url: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: bodyParams.toString(),
        });
        if (!uploadRes.ok) {
          jsonRes(
            res,
            { error: `Cloudinary upscale upload failed (${uploadRes.status}): ${uploadRes.text}` },
            uploadRes.status,
          );
          return;
        }
        jsonRes(res, {
          secureUrl: uploadRes.data?.secure_url || '',
          publicId: uploadRes.data?.public_id || '',
          width: uploadRes.data?.width || null,
          height: uploadRes.data?.height || null,
          bytes: uploadRes.data?.bytes || null,
          format: uploadRes.data?.format || null,
        });
      }));

      // ── Passport endpoints ──
      use('/__admin/read-passports', (_req, res) => {
        jsonRes(res, passportState);
      });
      use('/__admin/read-node-revision', (req, res) => {
        try {
          const parsed = new URL(req.url || '', 'http://localhost');
          const nodeId = parsed.searchParams.get('nodeId');
          if (!nodeId) {
            jsonRes(res, { error: 'nodeId is required' }, 400);
            return;
          }
          jsonRes(res, { nodeId, revision: computeNodeRevision(nodeId) });
        } catch (err: any) {
          jsonRes(res, { error: err.message }, 500);
        }
      });
      use('/__admin/revert-node-bundle', postRoute(async (body, res) => {
        const { nodeId, passport, atlasPatch, injectFailure } = body;
        if (!nodeId || !passport || !atlasPatch || typeof atlasPatch !== 'object') {
          jsonRes(res, { error: 'nodeId, passport, and atlasPatch are required' }, 400);
          return;
        }
        const rollback = { attempted: false, succeeded: true };
        const committed: string[] = [];
        const failed: string[] = [];
        const shouldFailAtlas = injectFailure === 'atlas';
        const shouldFailPassport = injectFailure === 'passport';
        const nextPassportState: PassportModulePayload = {
          passports: { ...passportState.passports, [nodeId]: { ...passport, materialId: nodeId } },
          aliases: { ...passportState.aliases },
        };
        const atlas = readAtlasJson();
        const nextAtlas = {
          ...atlas,
          images: { ...atlas.images, [nodeId]: atlasPatch.images },
          tags: { ...atlas.tags, [nodeId]: atlasPatch.tags },
          era: { ...atlas.era, [nodeId]: atlasPatch.era },
          origins: { ...atlas.origins, [nodeId]: atlasPatch.origins },
          scientific: { ...(atlas.scientific || {}), [nodeId]: atlasPatch.scientificName },
          videos: { ...(atlas.videos || {}), [nodeId]: atlasPatch.videos },
          embeds: { ...(atlas.embeds || {}), [nodeId]: atlasPatch.embeds },
          links: { ...(atlas.links || {}), [nodeId]: atlasPatch.links },
        };

        try {
          if (shouldFailAtlas) throw new Error('Injected atlas failure');
          rotateJsonBackups(atlasFile);
          fs.writeFileSync(atlasFile, JSON.stringify(nextAtlas, null, 2), 'utf-8');
          committed.push('atlas-data');
        } catch (err: any) {
          failed.push(`atlas-data: ${err?.message || String(err)}`);
          jsonRes(res, { error: failed[0], code: 'ROLLBACK_ATLAS_FAILED', summary: { committed, failed, rollback, partial: false } }, 500);
          return;
        }

        try {
          if (shouldFailPassport) throw new Error('Injected passport failure');
          writePassportModule(nextPassportState);
          committed.push('passport');
        } catch (err: any) {
          failed.push(`passport: ${err?.message || String(err)}`);
          rollback.attempted = true;
          rollback.succeeded = false;
          jsonRes(res, { error: failed[failed.length - 1], code: 'ROLLBACK_PASSPORT_FAILED', summary: { committed, failed, rollback, partial: committed.length > 0 } }, 500);
          return;
        }

        jsonRes(res, { ok: true, revision: computeNodeRevision(nodeId), summary: { committed, failed, rollback, partial: false } });
      }));
      use('/__admin/save-node-bundle', postRoute(async (body, res) => {
        const { nodeId, expectedRevision, passport, atlasPatch, injectFailure } = body;
        if (!nodeId || !passport || !atlasPatch || typeof atlasPatch !== 'object') {
          jsonRes(res, { error: 'nodeId, passport, and atlasPatch are required' }, 400);
          return;
        }

        const currentRevision = computeNodeRevision(nodeId);
        if (expectedRevision && expectedRevision !== currentRevision) {
          jsonRes(res, { error: 'Revision conflict', code: 'REV_CONFLICT', currentRevision }, 409);
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const nextPassportState: PassportModulePayload = {
          passports: { ...passportState.passports, [nodeId]: { ...passport, materialId: nodeId, lastUpdated: today } },
          aliases: { ...passportState.aliases },
        };

        const atlas = readAtlasJson();
        const nextAtlas = {
          ...atlas,
          images: {
            ...atlas.images,
            [nodeId]: (() => {
              const merged = mergePreservingExistingImages(
                atlas.images?.[nodeId],
                atlasPatch.images,
              );
              if (merged.length === 0) return [];
              if (merged.length === 1) return merged[0];
              return merged;
            })(),
          },
          tags: { ...atlas.tags, [nodeId]: atlasPatch.tags },
          era: { ...atlas.era, [nodeId]: atlasPatch.era },
          origins: { ...atlas.origins, [nodeId]: atlasPatch.origins },
          scientific: { ...(atlas.scientific || {}), [nodeId]: atlasPatch.scientificName },
          videos: { ...(atlas.videos || {}), [nodeId]: atlasPatch.videos },
          embeds: { ...(atlas.embeds || {}), [nodeId]: atlasPatch.embeds },
          links: { ...(atlas.links || {}), [nodeId]: atlasPatch.links },
        };

        const atlasBackup = atlasFile.replace(/\.json$/, '.backup.json');
        const committed: string[] = [];
        const failed: string[] = [];
        const rollback = { attempted: false, succeeded: true };
        const shouldFailAtlas = injectFailure === 'atlas';
        const shouldFailPassport = injectFailure === 'passport';

        try {
          if (shouldFailAtlas) throw new Error('Injected atlas failure');
          rotateJsonBackups(atlasFile);
          fs.writeFileSync(atlasFile, JSON.stringify(nextAtlas, null, 2), 'utf-8');
          committed.push('atlas-data');
        } catch (err: any) {
          failed.push(`atlas-data: ${err?.message || String(err)}`);
          jsonRes(res, {
            error: failed[0],
            code: 'BUNDLE_WRITE_FAILED',
            summary: { committed, failed, rollback, partial: false },
          }, 500);
          return;
        }

        try {
          if (shouldFailPassport) throw new Error('Injected passport failure');
          writePassportModule(nextPassportState);
          committed.push('passport');
        } catch (err: any) {
          failed.push(`passport: ${err?.message || String(err)}`);
          rollback.attempted = true;
          try {
            if (fs.existsSync(atlasBackup)) {
              fs.copyFileSync(atlasBackup, atlasFile);
              const atlasIdx = committed.indexOf('atlas-data');
              if (atlasIdx >= 0) committed.splice(atlasIdx, 1);
            } else {
              rollback.succeeded = false;
            }
          } catch {
            rollback.succeeded = false;
          }
          jsonRes(res, {
            error: failed[failed.length - 1],
            code: rollback.succeeded ? 'BUNDLE_ROLLED_BACK' : 'BUNDLE_PARTIAL',
            summary: {
              committed,
              failed,
              rollback,
              partial: committed.length > 0,
            },
          }, 500);
          return;
        }

        jsonRes(res, {
          ok: true,
          revision: computeNodeRevision(nodeId),
          summary: {
            committed,
            failed,
            rollback,
            partial: false,
          },
        });
      }));
      use('/__admin/save-passport', postRoute(async (body, res) => {
        const passports = body.passports;
        const aliases = body.aliases;
        if (!passports || typeof passports !== 'object') {
          jsonRes(res, { error: 'passports object is required' }, 400);
          return;
        }
        const nextState: PassportModulePayload = {
          passports,
          aliases: aliases && typeof aliases === 'object' ? aliases : passportState.aliases,
        };
        writePassportModule(nextState);
        jsonRes(res, { ok: true, count: Object.keys(nextState.passports).length });
      }));

      use('/__admin/update-passport-status', postRoute(async (body, res) => {
        const { materialId, status } = body;
        if (!materialId || !status) { jsonRes(res, { error: 'materialId and status required' }, 400); return; }
        const valid = ['draft', 'reviewed', 'verified', 'published'];
        if (!valid.includes(status)) { jsonRes(res, { error: 'Invalid status' }, 400); return; }
        const nextState: PassportModulePayload = {
          passports: { ...passportState.passports },
          aliases: { ...passportState.aliases },
        };
        const p = nextState.passports?.[materialId] || { materialId, lastUpdated: new Date().toISOString().slice(0, 10), performance: {}, process: {}, dyeing: {}, sustainability: {}, sourcing: {}, endUse: {} };
        p.status = status;
        p.lastUpdated = new Date().toISOString().slice(0, 10);
        nextState.passports[materialId] = p;
        writePassportModule(nextState);
        jsonRes(res, { ok: true });
      }));

      use('/__admin/delete-profile', postRoute(async (body, res) => {
        const { profileId } = body;
        if (!profileId) { jsonRes(res, { error: 'profileId required' }, 400); return; }
        const nextState: PassportModulePayload = {
          passports: { ...passportState.passports },
          aliases: { ...passportState.aliases },
        };
        if (nextState.passports?.[profileId]) {
          delete nextState.passports[profileId];
          writePassportModule(nextState);
        }
        const atlas = JSON.parse(fs.readFileSync(atlasFile, 'utf-8'));
        for (const k of ['images', 'tags', 'era', 'origins', 'scientific', 'videos', 'embeds', 'links']) {
          if (atlas[k]?.[profileId] !== undefined) { const o = { ...atlas[k] }; delete o[profileId]; atlas[k] = o; }
        }
        const deleted = new Set((atlas.deletedProfiles as string[]) || []);
        deleted.add(profileId);
        (atlas as any).deletedProfiles = Array.from(deleted);
        fs.writeFileSync(atlasFile, JSON.stringify(atlas, null, 2), 'utf-8');
        jsonRes(res, { ok: true });
      }));

      // ── Image search proxies ──

      use('/__admin/brave-image-search', postRoute(async (body, res) => {
        const { query, count = 20, apiKey } = body;
        if (!apiKey || !query) { jsonRes(res, { error: 'query and apiKey are required' }, 400); return; }
        const params = new URLSearchParams({ q: query, count: String(Math.min(count, 200)), safesearch: 'strict' });
        const r = await proxyFetch({ url: `https://api.search.brave.com/res/v1/images/search?${params}`, headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } });
        if (!r.ok) { jsonRes(res, { error: `Brave API error (${r.status}): ${r.text}` }, r.status); return; }
        const results = (r.data.results || []).map((i: any) => ({
          title: i.title || '', sourceUrl: i.url || '',
          thumbnailUrl: i.thumbnail?.src || '',
          imageUrl: i.properties?.url || i.meta_url?.original || i.thumbnail?.src || '',
          width: i.properties?.width || i.width, height: i.properties?.height || i.height,
          source: i.source || '',
        }));
        jsonRes(res, { results });
      }));

      use('/__admin/unsplash-image-search', postRoute(async (body, res) => {
        const { query, per_page = 20, page = 1, apiKey } = body;
        if (!apiKey || !query) { jsonRes(res, { error: 'query and apiKey are required' }, 400); return; }
        const params = new URLSearchParams({ query, per_page: String(Math.min(per_page, 30)), page: String(page) });
        const r = await proxyFetch({ url: `https://api.unsplash.com/search/photos?${params}`, headers: { 'Accept': 'application/json', 'Authorization': `Client-ID ${apiKey}` } });
        if (!r.ok) { jsonRes(res, { error: `Unsplash API error (${r.status}): ${r.text}` }, r.status); return; }
        const results = (r.data.results || []).map((i: any) => ({
          title: i.description || i.alt_description || '', sourceUrl: i.links?.html || '',
          thumbnailUrl: i.urls?.small || i.urls?.thumb || '',
          imageUrl: i.urls?.raw || i.urls?.full || i.urls?.regular || '',
          width: i.width, height: i.height,
          source: `unsplash.com/@${i.user?.username || 'unknown'}`,
        }));
        jsonRes(res, { results, totalPages: r.data.total_pages || 1 });
      }));

      use('/__admin/pexels-image-search', postRoute(async (body, res) => {
        const { query, per_page = 20, page = 1, apiKey } = body;
        if (!apiKey || !query) { jsonRes(res, { error: 'query and apiKey are required' }, 400); return; }
        const params = new URLSearchParams({ query, per_page: String(Math.min(per_page, 80)), page: String(page) });
        const r = await proxyFetch({ url: `https://api.pexels.com/v1/search?${params}`, headers: { 'Authorization': apiKey } });
        if (!r.ok) { jsonRes(res, { error: `Pexels API error (${r.status}): ${r.text}` }, r.status); return; }
        const results = (r.data.photos || []).map((i: any) => ({
          title: i.alt || i.url || '', sourceUrl: i.url || '',
          thumbnailUrl: i.src?.medium || i.src?.small || '',
          imageUrl: i.src?.original || i.src?.large2x || i.src?.large || '',
          width: i.width, height: i.height,
          source: `pexels.com/${i.photographer || 'unknown'}`,
        }));
        jsonRes(res, { results });
      }));

      use('/__admin/flickr-image-search', postRoute(async (body, res) => {
        const { query, per_page = 20, page = 1, apiKey } = body;
        if (!apiKey || !query) { jsonRes(res, { error: 'query and apiKey are required' }, 400); return; }
        const params = new URLSearchParams({
          method: 'flickr.photos.search',
          api_key: apiKey,
          text: query,
          content_type: '1',
          media: 'photos',
          safe_search: '1',
          license: '1,2,3,4,5,6,7,9,10',
          sort: 'relevance',
          per_page: String(Math.min(per_page, 100)),
          page: String(page),
          extras: 'owner_name,url_q,url_z,url_l,url_o,o_dims,license',
          format: 'json',
          nojsoncallback: '1',
        });
        const r = await proxyFetch({ url: `https://api.flickr.com/services/rest/?${params}`, headers: { Accept: 'application/json' } });
        if (!r.ok) { jsonRes(res, { error: `Flickr API error (${r.status}): ${r.text}` }, r.status); return; }
        const results = (r.data.photos?.photo || []).map((i: any) => {
          const imageUrl = i.url_l || i.url_z || i.url_o || i.url_q || '';
          const thumbnailUrl = i.url_q || i.url_z || imageUrl;
          const sourceUrl = i.owner && i.id ? `https://www.flickr.com/photos/${i.owner}/${i.id}` : '';
          return {
            title: i.title || '',
            sourceUrl,
            thumbnailUrl,
            imageUrl,
            width: Number(i.width_l || i.width_z || i.width_o || 0) || undefined,
            height: Number(i.height_l || i.height_z || i.height_o || 0) || undefined,
            source: i.ownername ? `flickr.com/${i.ownername}` : 'flickr.com',
          };
        }).filter((x: any) => !!x.imageUrl);
        jsonRes(res, { results, totalPages: Number(r.data.photos?.pages || 1) });
      }));

      use('/__admin/openverse-image-search', postRoute(async (body, res) => {
        const { query, page_size = 20, page = 1 } = body;
        if (!query) { jsonRes(res, { error: 'query is required' }, 400); return; }
        const params = new URLSearchParams({ q: query, page_size: String(Math.min(page_size, 50)), page: String(page) });
        const r = await proxyFetch({ url: `https://api.openverse.org/v1/images/?${params}`, headers: { 'Accept': 'application/json' } });
        if (!r.ok) { jsonRes(res, { error: `Openverse API error (${r.status}): ${r.text}` }, r.status); return; }
        const results = (r.data.results || []).map((i: any) => ({
          title: i.title || '', sourceUrl: i.foreign_landing_url || i.url || '',
          thumbnailUrl: i.thumbnail || i.url || '', imageUrl: i.url || '',
          width: i.width, height: i.height, source: i.source || 'openverse',
        }));
        const totalPages = r.data.page_count || Math.ceil((r.data.result_count || 0) / page_size) || 1;
        jsonRes(res, { results, totalPages });
      }));

      use('/__admin/europeana-image-search', postRoute(async (body, res) => {
        const { query, rows = 20, start = 1, apiKey } = body;
        if (!query) { jsonRes(res, { error: 'query is required' }, 400); return; }
        const wskey = typeof apiKey === 'string' && apiKey.trim().length > 0 ? apiKey.trim() : 'api2demo';
        const params = new URLSearchParams({ query, wskey, media: 'true', qf: 'TYPE:IMAGE', profile: 'rich', rows: String(Math.min(rows, 100)), start: String(start) });
        const r = await proxyFetch({ url: `https://api.europeana.eu/record/v2/search.json?${params}`, headers: { 'Accept': 'application/json' } });
        if (!r.ok) { jsonRes(res, { error: `Europeana API error (${r.status}): ${r.text}` }, r.status); return; }
        const results = (r.data.items || []).map((item: any) => {
          const thumbUrl = item.edmPreview?.[0] || '';
          const imageUrl = item.edmIsShownBy?.[0] || thumbUrl;
          const rights = item.rights?.[0] || '';
          const attribution = item.dataProvider?.[0] || item.provider?.[0] || '';
          const manifestUrl = (item.dctermsIsReferencedBy || []).find((u: string) => u.includes('iiif') || u.includes('manifest')) || '';
          return {
            title: item.title?.[0] || '', sourceUrl: item.guid || item.edmIsShownAt?.[0] || '',
            thumbnailUrl: thumbUrl, imageUrl, width: undefined, height: undefined,
            source: attribution, rights, attribution, licenseUrl: rights, sourceManifest: manifestUrl,
          };
        });
        const totalResults = r.data.totalResults || 0;
        jsonRes(res, { results, totalPages: Math.ceil(totalResults / rows) || 1, totalResults });
      }));

      use('/__admin/wikimedia-image-search', postRoute(async (body, res) => {
        const { query, per_page = 20, page = 1 } = body;
        if (!query) { jsonRes(res, { error: 'query is required' }, 400); return; }
        const offset = (page - 1) * per_page;
        const params = new URLSearchParams({
          action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap`,
          gsrnamespace: '6', gsrlimit: String(Math.min(per_page, 50)), gsroffset: String(offset),
          prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '800', format: 'json', origin: '*',
        });
        const r = await proxyFetch({ url: `https://commons.wikimedia.org/w/api.php?${params}`, headers: { 'Accept': 'application/json', 'User-Agent': 'NaturalFiberAtlas/1.0 (image-scout)' } });
        if (!r.ok) { jsonRes(res, { error: `Wikimedia API error (${r.status}): ${r.text}` }, r.status); return; }
        const pages = r.data.query?.pages || {};
        const results = Object.values(pages).filter((p: any) => p.imageinfo?.length).map((p: any) => {
          const info = p.imageinfo[0];
          const meta = info.extmetadata || {};
          return {
            title: (p.title || '').replace(/^File:/, ''), sourceUrl: info.descriptionurl || '',
            thumbnailUrl: info.thumburl || info.url || '', imageUrl: info.url || '',
            width: info.width, height: info.height, source: 'commons.wikimedia.org',
            rights: meta.LicenseShortName?.value || '', attribution: (meta.Artist?.value || '').replace(/<[^>]*>/g, ''),
            licenseUrl: meta.LicenseUrl?.value || '',
          };
        });
        jsonRes(res, { results, hasMore: r.data.continue?.gsroffset != null });
      }));

      // ── IIIF manifest proxy ──

      use('/__admin/iiif-fetch-manifest', postRoute(async (body, res) => {
        const { manifestUrl } = body;
        if (!manifestUrl) { jsonRes(res, { error: 'manifestUrl is required' }, 400); return; }
        const mRes = await fetch(manifestUrl, {
          headers: { 'Accept': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json", application/ld+json, application/json' },
        });
        if (!mRes.ok) { jsonRes(res, { error: `Failed to fetch manifest (${mRes.status})` }, mRes.status); return; }
        const manifest = await mRes.json() as any;
        const results: any[] = [];
        const manifestLabel = extractLabel(manifest.label) || extractLabel(manifest.metadata?.find((m: any) => m.label === 'Title')?.value) || '';
        const isV3 = (manifest['@context'] || '').toString().includes('presentation/3') || !!manifest.items;

        const pushCanvas = (canvas: any, imgBody: any) => {
          const serviceBase = extractServiceBase(imgBody.service);
          const imageUrl = imgBody.id || imgBody['@id'] || '';
          if (!imageUrl) return;
          results.push({
            title: extractLabel(canvas.label) || manifestLabel, imageUrl,
            thumbnailUrl: serviceBase ? `${serviceBase}/full/!200,200/0/default.jpg` : imageUrl,
            tileSource: serviceBase || undefined,
            width: imgBody.width || canvas.width, height: imgBody.height || canvas.height,
            rights: manifest.rights || manifest.license || '',
            attribution: extractLabel(manifest.requiredStatement?.value) || extractLabel(manifest.attribution) || '',
            sourceManifest: manifestUrl,
          });
        };

        if (isV3) {
          for (const canvas of (manifest.items || []))
            for (const page of (canvas.items || []))
              for (const anno of (page.items || []))
                if (anno.body) pushCanvas(canvas, anno.body);
        } else {
          for (const seq of (manifest.sequences || []))
            for (const canvas of (seq.canvases || []))
              for (const img of (canvas.images || []))
                if (img.resource) pushCanvas(canvas, img.resource);
        }

        jsonRes(res, { results, label: manifestLabel });
      }));

      // ── AI content generation ──

      use('/__admin/ai-generate', postRoute(async (body, res) => {
        const { provider, apiKey, model, messages, temperature = 0.7, maxTokens = 4096, baseUrl } = body;
        if (!provider || !messages?.length) { jsonRes(res, { error: 'provider and messages are required' }, 400); return; }
        if (provider !== 'ollama' && !apiKey) { jsonRes(res, { error: 'apiKey is required for cloud providers' }, 400); return; }

        let content = '';
        let usedModel = model || '';
        let usage = { input: 0, output: 0 };

        if (provider === 'openai') {
          usedModel = model || 'gpt-4o';
          const r = await proxyFetch({ url: 'https://api.openai.com/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: usedModel, messages, temperature, max_tokens: maxTokens }) });
          if (!r.ok) { jsonRes(res, { error: `OpenAI error (${r.status}): ${r.text}` }, r.status); return; }
          content = r.data.choices?.[0]?.message?.content || '';
          usage = { input: r.data.usage?.prompt_tokens || 0, output: r.data.usage?.completion_tokens || 0 };
        } else if (provider === 'claude') {
          usedModel = model || 'claude-sonnet-4-20250514';
          const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
          const nonSystem = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({ role: m.role, content: m.content }));
          const r = await proxyFetch({ url: 'https://api.anthropic.com/v1/messages', method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: usedModel, max_tokens: maxTokens, ...(systemMsg ? { system: systemMsg } : {}), messages: nonSystem.length ? nonSystem : [{ role: 'user', content: 'Hello' }], temperature }) });
          if (!r.ok) { jsonRes(res, { error: `Claude error (${r.status}): ${r.text}` }, r.status); return; }
          content = r.data.content?.map((c: any) => c.text).join('') || '';
          usage = { input: r.data.usage?.input_tokens || 0, output: r.data.usage?.output_tokens || 0 };
        } else if (provider === 'gemini') {
          usedModel = model || 'gemini-2.5-flash';
          let systemInstruction: any = undefined;
          const nonSystem = messages.filter((m: any) => { if (m.role === 'system') { systemInstruction = { parts: [{ text: m.content }] }; return false; } return true; });
          const geminiMsgs = nonSystem.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
          const reqBody: any = { contents: geminiMsgs, generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' } };
          if (systemInstruction) reqBody.systemInstruction = systemInstruction;
          const r = await proxyFetch({ url: `https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${apiKey}`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) });
          if (!r.ok) { jsonRes(res, { error: `Gemini error (${r.status}): ${r.text}` }, r.status); return; }
          content = r.data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
          usage = { input: r.data.usageMetadata?.promptTokenCount || 0, output: r.data.usageMetadata?.candidatesTokenCount || 0 };
        } else if (provider === 'openrouter') {
          usedModel = model || 'openai/gpt-4o-mini';
          const r = await proxyFetch({
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': body.referer || 'http://localhost:3000',
              'X-Title': body.title || 'Natural Fiber Atlas Admin',
            },
            body: JSON.stringify({
              model: usedModel,
              messages,
              temperature,
              max_tokens: maxTokens,
              response_format: { type: 'json_object' },
            }),
          });
          if (!r.ok) { jsonRes(res, { error: `OpenRouter error (${r.status}): ${r.text}` }, r.status); return; }
          content = r.data.choices?.[0]?.message?.content || '';
          usage = { input: r.data.usage?.prompt_tokens || 0, output: r.data.usage?.completion_tokens || 0 };
        } else if (provider === 'huggingface') {
          usedModel = model || 'HuggingFaceTB/SmolLM3-3B';
          const r = await proxyFetch({
            url: 'https://router.huggingface.co/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: usedModel,
              messages,
              temperature,
              max_tokens: maxTokens,
              response_format: { type: 'json_object' },
            }),
          });
          if (!r.ok) { jsonRes(res, { error: `Hugging Face error (${r.status}): ${r.text}` }, r.status); return; }
          content = r.data.choices?.[0]?.message?.content || '';
          usage = { input: r.data.usage?.prompt_tokens || 0, output: r.data.usage?.completion_tokens || 0 };
        } else if (provider === 'ollama') {
          const ollamaBase = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
          usedModel = model || 'llama3.1';
          const r = await proxyFetch({ url: `${ollamaBase}/api/chat`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: usedModel, messages, stream: false, options: { temperature, num_predict: maxTokens }, format: 'json' }) });
          if (!r.ok) { jsonRes(res, { error: `Ollama error (${r.status}): ${r.text}` }, r.status); return; }
          content = r.data.message?.content || '';
          usage = { input: r.data.prompt_eval_count || 0, output: r.data.eval_count || 0 };
        } else {
          jsonRes(res, { error: `Unknown provider: ${provider}` }, 400); return;
        }

        jsonRes(res, { content, model: usedModel, provider, usage });
      }));

      // ── Ollama model discovery ──

      use('/__admin/ollama-models', postRoute(async (body, res) => {
        const ollamaBase = (body.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
        try {
          const r = await proxyFetch({ url: `${ollamaBase}/api/tags` });
          if (!r.ok) { jsonRes(res, { error: `Ollama not reachable (${r.status})`, models: [] }, r.status); return; }
          jsonRes(res, { models: (r.data.models || []).map((m: any) => m.name || m.model).filter(Boolean) });
        } catch (err: any) {
          jsonRes(res, { error: `Cannot reach Ollama: ${err.message}`, models: [] }, 502);
        }
      }));

      // ── Hugging Face endpoints ──

      use('/__admin/hf-health', postRoute(async (body, res) => {
        const { apiKey, endpointUrl } = body;
        if (!apiKey) { jsonRes(res, { error: 'apiKey is required' }, 400); return; }
        // Token-first health check: independent of model task/pipeline shape.
        const whoami = await proxyFetch({
          url: 'https://huggingface.co/api/whoami-v2',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!whoami.ok) {
          jsonRes(res, { error: `Hugging Face token check failed (${whoami.status}): ${whoami.text}` }, whoami.status);
          return;
        }

        // Optional endpoint sanity check when user provides dedicated endpoint URL.
        if (endpointUrl?.trim()) {
          const probe = await proxyFetch({
            url: endpointUrl.trim(),
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: 'health check' }),
          });
          if (!probe.ok) {
            jsonRes(
              res,
              { error: `Token is valid, but endpoint check failed (${probe.status}): ${probe.text}` },
              probe.status,
            );
            return;
          }
        }

        jsonRes(res, { ok: true, account: whoami.data?.name || whoami.data?.fullname || 'ok' });
      }));

      use('/__admin/hf-embed', postRoute(async (body, res) => {
        const { apiKey, model, texts, endpointUrl } = body;
        if (!apiKey) { jsonRes(res, { error: 'apiKey is required' }, 400); return; }
        if (!Array.isArray(texts) || texts.length === 0) { jsonRes(res, { error: 'texts must be a non-empty array' }, 400); return; }
        const target = endpointUrl?.trim()
          || `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model || 'sentence-transformers/all-MiniLM-L6-v2')}`;
        const r = await proxyFetch({
          url: target,
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: texts }),
        });
        if (!r.ok) { jsonRes(res, { error: `Hugging Face embedding failed (${r.status}): ${r.text}` }, r.status); return; }
        const raw = r.data;
        const embeddings = Array.isArray(raw?.[0]?.[0])
          ? raw.map((row: any) => row[0])
          : Array.isArray(raw?.[0])
            ? raw
            : [];
        jsonRes(res, { embeddings });
      }));

      use('/__admin/hf-chat', postRoute(async (body, res) => {
        const { apiKey, model, messages, temperature = 0.7, maxTokens = 2048 } = body;
        if (!apiKey) { jsonRes(res, { error: 'apiKey is required' }, 400); return; }
        if (!Array.isArray(messages) || messages.length === 0) { jsonRes(res, { error: 'messages are required' }, 400); return; }
        const target = 'https://router.huggingface.co/v1/chat/completions';
        const r = await proxyFetch({
          url: target,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'HuggingFaceTB/SmolLM3-3B',
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          }),
        });
        if (!r.ok) { jsonRes(res, { error: `Hugging Face chat failed (${r.status}): ${r.text}` }, r.status); return; }
        const content = r.data?.choices?.[0]?.message?.content || '';
        const usage = {
          input: r.data?.usage?.prompt_tokens || 0,
          output: r.data?.usage?.completion_tokens || 0,
        };
        jsonRes(res, { content, model: model || 'HuggingFaceTB/SmolLM3-3B', usage });
      }));

      use('/__admin/local-upscale', postRoute(async (body, res) => {
        const {
          imageUrl,
          imageDataUrl,
          prompt,
          mode = 'creative',
          serviceUrl,
          fidelityBackend = 'lanczos',
          fidelityScale = '2x',
          secondPass = false,
          detailEnhance = 0,
          tileMode = true,
        } = body;
        if (!imageUrl && !imageDataUrl) { jsonRes(res, { error: 'imageUrl or imageDataUrl is required' }, 400); return; }
        const base = String(serviceUrl || 'http://127.0.0.1:8008').replace(/\/+$/, '');

        let srcDataUrl = '';
        if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
          srcDataUrl = imageDataUrl;
        } else {
          const srcRes = await fetch(imageUrl, { headers: { Accept: 'image/*,*/*' }, redirect: 'follow' });
          if (!srcRes.ok) { jsonRes(res, { error: `Unable to fetch source image (${srcRes.status})` }, srcRes.status); return; }
          const srcType = srcRes.headers.get('content-type') || 'image/png';
          const srcBody = Buffer.from(await srcRes.arrayBuffer());
          srcDataUrl = `data:${srcType};base64,${srcBody.toString('base64')}`;
        }

        const localRes = await fetch(`${base}/upscale`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            image: srcDataUrl,
            prompt: String(prompt || ''),
            mode: mode === 'fidelity' ? 'fidelity' : 'creative',
            fidelity_backend: fidelityBackend === 'realesrgan' ? 'realesrgan' : 'lanczos',
            fidelity_scale: fidelityScale === '4x' ? '4x' : '2x',
            second_pass: !!secondPass,
            detail_enhance: Math.max(0, Math.min(1, Number(detailEnhance || 0))),
            tile_mode: tileMode !== false,
          }),
        });
        const localPayload = await localRes.json().catch(() => ({}));
        if (!localRes.ok) {
          jsonRes(
            res,
            { error: localPayload.detail || localPayload.error || `Local upscale failed (${localRes.status})` },
            localRes.status,
          );
          return;
        }
        const outDataUrl = localPayload.image as string | undefined;
        if (!outDataUrl || !outDataUrl.startsWith('data:')) {
          jsonRes(res, { error: 'Local service returned invalid image payload' }, 502);
          return;
        }
        const match = outDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) { jsonRes(res, { error: 'Local service returned malformed data URL' }, 502); return; }
        const [, outType, outB64] = match;
        const outBody = Buffer.from(outB64, 'base64');
        res.statusCode = 200;
        res.setHeader('Content-Type', outType || 'image/png');
        res.end(outBody);
      }));

      use('/__admin/hf-upscale', postRoute(async (body, res) => {
        const { apiKey, model, imageUrl, endpointUrl, prompt, targetPreset, customPrompt } = body;
        if (!apiKey) { jsonRes(res, { error: 'apiKey is required' }, 400); return; }
        if (!imageUrl) { jsonRes(res, { error: 'imageUrl is required' }, 400); return; }

        const srcRes = await fetch(imageUrl, { headers: { Accept: 'image/*,*/*' }, redirect: 'follow' });
        if (!srcRes.ok) {
          jsonRes(res, { error: `Unable to fetch source image (${srcRes.status})` }, srcRes.status);
          return;
        }
        const srcBody = Buffer.from(await srcRes.arrayBuffer());
        const srcType = srcRes.headers.get('content-type') || 'image/png';
        const srcDataUrl = `data:${srcType};base64,${srcBody.toString('base64')}`;

        const resolvedModel = String(model || 'valiantcat/Qwen-Image-Edit-2511-Upscale2K').trim();
        const preset = targetPreset === '2k' || targetPreset === '4k' ? targetPreset : '4k';
        const presetPrompt = preset === '2k'
          ? 'Upscale this picture to 2K resolution.'
          : 'Upscale this picture to 4K resolution.';
        const custom = String(customPrompt || '').trim();
        const finalPrompt = String(prompt || '').trim() || (custom ? `${presetPrompt} ${custom}` : presetPrompt);
        const targetSize = preset === '2k' ? { width: 2048, height: 2048 } : { width: 4096, height: 4096 };

        const encodedModel = encodeURIComponent(resolvedModel);
        const primaryTarget = endpointUrl?.trim()
          ? endpointUrl.trim()
          : `https://router.huggingface.co/hf-inference/models/${encodedModel}`;
        let hfRes = await proxyBinary({
          url: primaryTarget,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'image/*,application/json',
          },
          body: JSON.stringify({ inputs: srcDataUrl, parameters: { prompt: finalPrompt, target_size: targetSize } }),
        });

        if (!hfRes.ok && !endpointUrl?.trim()) {
          hfRes = await proxyBinary({
            url: `https://router.huggingface.co/fal-ai/models/${encodedModel}`,
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'image/*,application/json',
            },
            body: JSON.stringify({ inputs: srcDataUrl, parameters: { prompt: finalPrompt, target_size: targetSize } }),
          });
        }

        if (!hfRes.ok) {
          const status = hfRes.status || 502;
          const details = hfRes.body.toString('utf-8').slice(0, 320) || 'No response body';
          const suffix =
            status === 402
              ? ' Pre-paid credits are required for this provider on your HF account.'
              : status === 401 || status === 403
                ? ' Check your HF token permissions for Inference Providers.'
                : status === 404
                  ? ` Model "${resolvedModel}" is not reachable via the selected endpoint.`
                  : '';
          jsonRes(res, { error: `Hugging Face upscaling failed (${status}): ${details}.${suffix}`.trim() }, status);
          return;
        }

        if ((hfRes.contentType || '').includes('application/json')) {
          try {
            const payload = JSON.parse(hfRes.body.toString('utf-8'));
            const outUrl = payload?.output?.[0] || payload?.url || payload?.image;
            if (!outUrl) { jsonRes(res, { error: 'Upscale model returned JSON without output URL' }, 502); return; }
            const fetched = await proxyBinary({ url: outUrl, headers: { Accept: 'image/*,*/*' } });
            if (!fetched.ok) { jsonRes(res, { error: `Failed to fetch upscaled image (${fetched.status})` }, fetched.status); return; }
            res.statusCode = 200;
            res.setHeader('Content-Type', fetched.contentType || 'image/png');
            res.end(fetched.body);
            return;
          } catch (err: any) {
            jsonRes(res, { error: `Invalid JSON response from upscale endpoint: ${err.message}` }, 502);
            return;
          }
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', hfRes.contentType || 'image/png');
        res.end(hfRes.body);
      }));

      // ── Link preview ──

      use('/__admin/link-preview', postRoute(async (body, res) => {
        const { url } = body;
        if (!url) { jsonRes(res, { error: 'url is required' }, 400); return; }
        const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtlasBot/1.0)', 'Accept': 'text/html' }, redirect: 'follow' });
        if (!pageRes.ok) { jsonRes(res, { error: `Fetch failed (${pageRes.status})` }, pageRes.status); return; }
        const html = await pageRes.text();
        const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
        const description = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim()
          || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1]?.trim() || '';
        const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || '';
        const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)?.[1]
          || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i)?.[1];
        const favicon = faviconMatch
          ? (faviconMatch.startsWith('http') ? faviconMatch : new URL(faviconMatch, url).href)
          : new URL('/favicon.ico', url).href;
        jsonRes(res, { title, description, favicon, ogImage, url });
      }));

      // ── Image proxy ──

      use('/__admin/image-proxy', async (req, res) => {
        try {
          const parsed = new URL(req.url!, 'http://localhost');
          const targetUrl = parsed.searchParams.get('url');
          if (!targetUrl) { jsonRes(res, { error: 'url parameter required' }, 400); return; }
          const imgRes = await fetch(targetUrl, { headers: { 'Accept': 'image/*,*/*' }, redirect: 'follow' });
          if (!imgRes.ok) { jsonRes(res, { error: `Upstream ${imgRes.status}` }, imgRes.status); return; }
          const contentType = imgRes.headers.get('content-type') || 'application/octet-stream';
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(buffer);
        } catch (err: any) {
          jsonRes(res, { error: err.message }, 502);
        }
      });

      // ── Replicate proxy ──

      use('/__admin/replicate-proxy', postRoute(async (body, res) => {
        const { apiKey, action, version, input, pollUrl } = body;
        if (!apiKey) { jsonRes(res, { error: 'apiKey is required' }, 400); return; }

        if (action === 'create') {
          const r = await proxyFetch({ url: 'https://api.replicate.com/v1/predictions', method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ version, input }) });
          if (!r.ok) { jsonRes(res, { error: `Replicate API error (${r.status}): ${r.text.slice(0, 300)}` }, r.status); return; }
          jsonRes(res, { id: r.data.id, status: r.data.status, output: r.data.output, error: r.data.error, pollUrl: r.data.urls?.get || `https://api.replicate.com/v1/predictions/${r.data.id}`, urls: r.data.urls });
        } else if (action === 'poll') {
          if (!pollUrl) { jsonRes(res, { error: 'pollUrl is required' }, 400); return; }
          const r = await proxyFetch({ url: pollUrl, headers: { 'Authorization': `Bearer ${apiKey}` } });
          jsonRes(res, { id: r.data.id, status: r.data.status, output: r.data.output, error: r.data.error, pollUrl, urls: r.data.urls });
        } else {
          jsonRes(res, { error: `Unknown action: ${action}` }, 400);
        }
      }));

      // ── Pinterest proxies ──

      use('/__admin/pinterest-search', postRoute(async (body, res) => {
        const { query, apiKey, cursor, trim } = body;
        if (!apiKey || !query) { jsonRes(res, { error: 'query and apiKey are required' }, 400); return; }
        const params = new URLSearchParams({ query });
        if (cursor) params.set('cursor', cursor);
        if (trim === true) params.set('trim', 'true');
        const r = await proxyFetch({ url: `https://api.scrapecreators.com/v1/pinterest/search?${params}`, headers: { 'x-api-key': apiKey, 'Accept': 'application/json' } });
        if (!r.ok) { jsonRes(res, { error: `Pinterest search error (${r.status}): ${r.text}` }, r.status); return; }
        jsonRes(res, r.data);
      }));

      use('/__admin/pinterest-api', postRoute(async (body, res) => {
        const { endpoint, apiKey, params } = body;
        if (!apiKey || !endpoint) { jsonRes(res, { error: 'endpoint and apiKey are required' }, 400); return; }
        const allowed = ['pin', 'search', 'user/boards', 'board'];
        if (!allowed.includes(endpoint)) { jsonRes(res, { error: `Unsupported endpoint: ${endpoint}` }, 400); return; }
        const qs = new URLSearchParams(params || {});
        const r = await proxyFetch({ url: `https://api.scrapecreators.com/v1/pinterest/${endpoint}?${qs}`, headers: { 'x-api-key': apiKey, 'Accept': 'application/json' } });
        if (!r.ok) { jsonRes(res, { error: `Pinterest API error (${r.status}): ${r.text}` }, r.status); return; }
        jsonRes(res, r.data);
      }));

      use('/__admin/pinterest-pin', postRoute(async (body, res) => {
        const { url: pinUrl, apiKey, trim } = body;
        if (!apiKey || !pinUrl) { jsonRes(res, { error: 'url and apiKey are required' }, 400); return; }
        const params = new URLSearchParams({ url: pinUrl });
        if (trim) params.set('trim', 'true');
        const r = await proxyFetch({ url: `https://api.scrapecreators.com/v1/pinterest/pin?${params}`, headers: { 'x-api-key': apiKey, 'Accept': 'application/json' } });
        if (!r.ok) { jsonRes(res, { error: `Pinterest API error (${r.status}): ${r.text}` }, r.status); return; }
        jsonRes(res, r.data);
      }));
    },
  };
}

export { adminPlugin };
