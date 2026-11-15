// 3D 시안 갤러리 공용 도구 (밑줄로 시작하는 파일은 Vercel에서 주소로 열리지 않아요)
import { put, get, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

/* ---------- 서명 토큰 ---------- */
const b64 = (buf) => Buffer.from(buf).toString('base64url');
export function sign(payload, ttlSec) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  const sig = b64(crypto.createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${sig}`;
}
export function verify(token) {
  if (!token || !SECRET) return null;
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  const expect = b64(crypto.createHmac('sha256', SECRET).update(body).digest());
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  return data.exp > Date.now() / 1000 ? data : null;
}

/* ---------- 관리자 확인 ---------- */
export function checkAdminPassword(pw) {
  if (!ADMIN_PASSWORD || !pw) return false;
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
export function isAdmin(request) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)angdoo_admin=([^;]+)/);
  const data = m && verify(decodeURIComponent(m[1]));
  return !!(data && data.role === 'admin');
}

/* ---------- 비밀번호 저장 (원문 대신 scrypt 해시) ---------- */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
export function checkPassword(pw, stored) {
  if (!stored || !pw) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pw), salt, 32);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

/* ---------- 너무 많이 틀리면 잠깐 막기 (서버 인스턴스별, 간단 방식) ---------- */
const attempts = new Map();
export function tooMany(key, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const rec = attempts.get(key) || { n: 0, t: now };
  if (now - rec.t > windowMs) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  attempts.set(key, rec);
  return rec.n > limit;
}
export const clientKey = (request, extra = '') =>
  (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() + '|' + extra;

/* ---------- 시안 정보 저장소 (Vercel Blob, 비공개) ---------- */
const metaPath = (id) => `meta/${id}.json`;
export const modelPath = (id) => `models/${id}.glb`;

export async function readMeta(id) {
  const r = await get(metaPath(id), { access: 'private' });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function writeMeta(meta) {
  await put(metaPath(meta.id), JSON.stringify(meta), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  });
}
export async function listMeta() {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix: 'meta/', cursor });
    for (const b of page.blobs) {
      const id = b.pathname.replace(/^meta\//, '').replace(/\.json$/, '');
      const m = await readMeta(id);
      if (m) out.push(m);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
export async function saveModel(id, file) {
  await put(modelPath(id), file, {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'model/gltf-binary',
  });
}
export async function readModel(id) {
  const r = await get(modelPath(id), { access: 'private' });
  return r && r.statusCode === 200 ? r : null;
}
export async function removeItem(id) {
  await del([metaPath(id), modelPath(id)]);
}

/* 공개 목록에 내보낼 정보만 */
export const publicView = (m) => ({ id: m.id, title: m.title, visibility: m.visibility, createdAt: m.createdAt });
