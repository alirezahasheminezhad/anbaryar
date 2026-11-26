import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-ay-app-build, x-ay-schema-version, x-ay-sync-revision, x-ay-device-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-AY-Sync-Revision, X-AY-Sync-Updated-At, X-AY-Sync-Legacy, X-AY-Backup-Id",
  "Vary": "Origin",
};
const BUCKET = "anbaryar-backups";
const MAX_FILE = 45 * 1024 * 1024;
const MAX_TOTAL = 600 * 1024 * 1024;
const MAX_COUNT = 30;

type BackupRow = {
  id: string;
  object_path: string;
  size_bytes: number;
  created_at: string;
  sync_revision?: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function syncConflict(revision: number) {
  return json({ error: "Cloud data changed on another device.", code: "SYNC_CONFLICT", revision }, 409);
}

async function readUpload(req: Request) {
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_FILE) return { error: "File must be between 1 byte and 45 MiB." as const };
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return { error: "Expected a gzip-compressed file." as const };
  return { bytes };
}

function objectPath(ownerId: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return ownerId + "/" + stamp + "-" + crypto.randomUUID() + ".json.gz";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === authHeader) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration missing" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Invalid session" }, 401);
  const ownerId = userData.user.id;

  let payload: { action?: string; id?: string };
  if (req.headers.get("content-type")?.includes("application/json")) {
    try { payload = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }
  } else {
    payload = { action: new URL(req.url).searchParams.get("action") || "upload" };
  }

  if (payload.action === "list") {
    const { data, error } = await admin.from("anbaryar_backup_files")
      .select("id, object_path, size_bytes, app_build, schema_version, created_at")
      .eq("owner_id", ownerId).eq("is_sync_state", false)
      .order("created_at", { ascending: false }).limit(MAX_COUNT);
    if (error) return json({ error: "Could not list backups" }, 500);
    return json({ backups: data || [], maxCount: MAX_COUNT, maxTotalBytes: MAX_TOTAL, maxFileBytes: MAX_FILE });
  }

  if (payload.action === "restore") {
    const id = payload.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid backup id" }, 400);
    const { data: row, error: rowError } = await admin.from("anbaryar_backup_files")
      .select("id, object_path, created_at, size_bytes")
      .eq("id", id).eq("owner_id", ownerId).eq("is_sync_state", false).maybeSingle();
    if (rowError || !row) return json({ error: "Backup not found" }, 404);
    const { data: file, error: fileError } = await admin.storage.from(BUCKET).download(row.object_path);
    if (fileError || !file) return json({ error: "Could not download backup" }, 500);
    return new Response(file.stream(), {
      headers: { ...cors, "Content-Type": "application/gzip", "Content-Length": String(row.size_bytes),
        "Content-Disposition": 'attachment; filename="anbaryar-cloud-backup.json.gz"',
        "X-AY-Backup-Id": row.id, "Cache-Control": "no-store" },
    });
  }

  if (payload.action === "sync-meta") {
    const { data: current, error: currentError } = await admin.from("anbaryar_backup_files")
      .select("sync_revision, created_at")
      .eq("owner_id", ownerId).eq("is_sync_state", true).maybeSingle();
    if (currentError) return json({ error: "Could not read cloud sync metadata" }, 500);

    if (current) {
      return json({ exists: true, revision: Number(current.sync_revision || 0), updatedAt: current.created_at, legacy: false });
    }

    const { data: oldBackup, error: oldError } = await admin.from("anbaryar_backup_files")
      .select("created_at")
      .eq("owner_id", ownerId).eq("is_sync_state", false)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (oldError) return json({ error: "Could not read legacy cloud metadata" }, 500);
    return json({
      exists: !!oldBackup,
      revision: 0,
      updatedAt: oldBackup?.created_at || null,
      legacy: !!oldBackup,
    });
  }

  if (payload.action === "sync-get") {
    const { data: current, error: currentError } = await admin.from("anbaryar_backup_files")
      .select("id, object_path, size_bytes, created_at, sync_revision")
      .eq("owner_id", ownerId).eq("is_sync_state", true).maybeSingle();
    if (currentError) return json({ error: "Could not read cloud sync state" }, 500);

    let row: BackupRow | null = current as BackupRow | null;
    let legacy = false;
    if (!row) {
      const { data: oldBackup, error: oldError } = await admin.from("anbaryar_backup_files")
        .select("id, object_path, size_bytes, created_at")
        .eq("owner_id", ownerId).eq("is_sync_state", false)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (oldError) return json({ error: "Could not read legacy cloud backup" }, 500);
      row = oldBackup as BackupRow | null;
      legacy = !!row;
    }

    if (!row) {
      return new Response(null, { status: 204, headers: { ...cors, "Cache-Control": "no-store" } });
    }
    const { data: file, error: fileError } = await admin.storage.from(BUCKET).download(row.object_path);
    if (fileError || !file) return json({ error: "Could not download cloud sync state" }, 500);

    return new Response(file.stream(), {
      headers: {
        ...cors,
        "Content-Type": "application/gzip",
        "Content-Length": String(row.size_bytes),
        "Cache-Control": "no-store",
        "X-AY-Sync-Revision": String(row.sync_revision || 0),
        "X-AY-Sync-Updated-At": row.created_at,
        "X-AY-Sync-Legacy": legacy ? "true" : "false",
      },
    });
  }

  if (payload.action === "sync-push") {
    const expectedRevision = Number(req.headers.get("x-ay-sync-revision") || "0");
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      return json({ error: "Invalid sync revision" }, 400);
    }
    const deviceId = (req.headers.get("x-ay-device-id") || "").slice(0, 128);
    const incoming = await readUpload(req);
    if ("error" in incoming) return json({ error: incoming.error }, 413);
    const { bytes } = incoming;

    const { data: current, error: currentError } = await admin.from("anbaryar_backup_files")
      .select("id, object_path, size_bytes, created_at, sync_revision")
      .eq("owner_id", ownerId).eq("is_sync_state", true).maybeSingle();
    if (currentError) return json({ error: "Could not check current sync revision" }, 500);
    const currentRevision = Number(current?.sync_revision || 0);
    if (current && currentRevision !== expectedRevision) return syncConflict(currentRevision);
    if (!current && expectedRevision !== 0) return syncConflict(0);

    const now = new Date().toISOString();
    const path = objectPath(ownerId);
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "application/gzip", upsert: false, cacheControl: "0",
    });
    if (uploadError) return json({ error: "Cloud sync upload failed" }, 500);

    const appBuild = (req.headers.get("x-ay-app-build") || "").slice(0, 80);
    const schemaVersion = Number(req.headers.get("x-ay-schema-version") || 0) || null;
    const nextRevision = expectedRevision + 1;

    if (current) {
      const { data, error } = await admin.from("anbaryar_backup_files")
        .update({
          object_path: path,
          size_bytes: bytes.byteLength,
          app_build: appBuild || null,
          schema_version: schemaVersion,
          created_at: now,
          sync_revision: nextRevision,
          device_id: deviceId || null,
        })
        .eq("id", current.id)
        .eq("owner_id", ownerId)
        .eq("is_sync_state", true)
        .eq("sync_revision", expectedRevision)
        .select("id, object_path, size_bytes, created_at, sync_revision")
        .maybeSingle();
      if (error || !data) {
        await admin.storage.from(BUCKET).remove([path]);
        const { data: latest } = await admin.from("anbaryar_backup_files")
          .select("sync_revision").eq("owner_id", ownerId).eq("is_sync_state", true).maybeSingle();
        return syncConflict(Number(latest?.sync_revision || 0));
      }
      // متادیتا اکنون به فایل جدید اشاره می‌کند؛ فایل قبلی فقط پس از موفقیت حذف می‌شود.
      const { error: deleteOldError } = await admin.storage.from(BUCKET).remove([current.object_path]);
      return json({
        revision: nextRevision,
        updatedAt: now,
        retentionWarning: !!deleteOldError,
      });
    }

    const { data, error } = await admin.from("anbaryar_backup_files").insert({
      owner_id: ownerId,
      object_path: path,
      size_bytes: bytes.byteLength,
      app_build: appBuild || null,
      schema_version: schemaVersion,
      created_at: now,
      is_sync_state: true,
      sync_revision: nextRevision,
      device_id: deviceId || null,
    }).select("id, object_path, size_bytes, created_at, sync_revision").maybeSingle();

    if (error || !data) {
      await admin.storage.from(BUCKET).remove([path]);
      const { data: latest } = await admin.from("anbaryar_backup_files")
        .select("sync_revision").eq("owner_id", ownerId).eq("is_sync_state", true).maybeSingle();
      return syncConflict(Number(latest?.sync_revision || 0));
    }
    return json({ revision: nextRevision, updatedAt: data.created_at, retentionWarning: false });
  }

  if (payload.action !== "upload") return json({ error: "Unsupported action" }, 400);
  const incoming = await readUpload(req);
  if ("error" in incoming) return json({ error: incoming.error }, 413);
  const { bytes } = incoming;

  const now = new Date();
  const path = objectPath(ownerId);
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: "application/gzip", upsert: false, cacheControl: "0",
  });
  if (uploadError) return json({ error: "Backup upload failed" }, 500);

  const appBuild = (req.headers.get("x-ay-app-build") || "").slice(0, 80);
  const schemaVersion = Number(req.headers.get("x-ay-schema-version") || 0) || null;
  const { data: inserted, error: insertError } = await admin.from("anbaryar_backup_files").insert({
    owner_id: ownerId, object_path: path, size_bytes: bytes.byteLength,
    app_build: appBuild || null, schema_version: schemaVersion, is_sync_state: false,
  }).select("id, object_path, size_bytes, app_build, schema_version, created_at").single();
  if (insertError || !inserted) {
    await admin.storage.from(BUCKET).remove([path]);
    return json({ error: "Backup index write failed" }, 500);
  }

  const { data: rows, error: listError } = await admin.from("anbaryar_backup_files")
    .select("id, object_path, size_bytes, created_at")
    .eq("owner_id", ownerId).eq("is_sync_state", false)
    .order("created_at", { ascending: false });
  if (listError) return json({ backup: inserted, retentionWarning: true });

  let total = 0;
  const keep: typeof rows = [];
  const remove: typeof rows = [];
  for (const row of rows || []) {
    if (keep.length < MAX_COUNT && (total + Number(row.size_bytes) <= MAX_TOTAL || keep.length === 0)) {
      keep.push(row); total += Number(row.size_bytes);
    } else {
      remove.push(row);
    }
  }
  if (remove.length) {
    const { error: removeError } = await admin.storage.from(BUCKET).remove(remove.map(x => x.object_path));
    if (!removeError) await admin.from("anbaryar_backup_files").delete()
      .eq("owner_id", ownerId).eq("is_sync_state", false).in("id", remove.map(x => x.id));
    else return json({ backup: inserted, retentionWarning: true });
  }
  return json({ backup: inserted, retainedCount: keep.length, retainedBytes: total, removedOldBackups: remove.length });
});
