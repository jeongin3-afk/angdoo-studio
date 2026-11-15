// 관리자: 시안 목록 · 올리기 · 수정 · 삭제
import crypto from 'node:crypto';
import { json, isAdmin, listMeta, readMeta, writeMeta, saveModel, removeItem, hashPassword } from './_lib.js';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (시안은 보통 1MB 이하)
const deny = () => json({ ok: false, message: '관리자 로그인이 필요해요.' }, 401);

const adminView = (m) => ({
  id: m.id, title: m.title, visibility: m.visibility, createdAt: m.createdAt,
  hasPassword: !!m.passwordHash, size: m.size,
});

export async function GET(request) {
  if (!isAdmin(request)) return deny();
  const items = await listMeta();
  return json({ items: items.map(adminView) });
}

// 새 시안 올리기 (form-data: file, title, visibility, password)
export async function POST(request) {
  if (!isAdmin(request)) return deny();
  const form = await request.formData();
  const file = form.get('file');
  const title = String(form.get('title') || '').trim().slice(0, 80);
  const visibility = form.get('visibility') === 'private' ? 'private' : 'public';
  const password = String(form.get('password') || '');

  if (!file || typeof file === 'string') return json({ ok: false, message: '3D 파일을 골라주세요.' }, 400);
  if (!/\.glb$/i.test(file.name)) return json({ ok: false, message: 'GLB 파일만 올릴 수 있어요.' }, 400);
  if (file.size > MAX_BYTES) return json({ ok: false, message: '파일이 너무 커요. (4MB 이하)' }, 400);
  if (!title) return json({ ok: false, message: '제목을 입력해 주세요.' }, 400);
  if (visibility === 'private' && password.length < 4) {
    return json({ ok: false, message: '비공개 시안은 비밀번호를 4자 이상 정해 주세요.' }, 400);
  }

  const id = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
  await saveModel(id, Buffer.from(await file.arrayBuffer()));
  const meta = {
    id, title, visibility, size: file.size, createdAt: Date.now(),
    passwordHash: visibility === 'private' ? hashPassword(password) : null,
  };
  await writeMeta(meta);
  return json({ ok: true, item: adminView(meta) });
}

// 수정 (JSON: id, title?, visibility?, password?)
export async function PATCH(request) {
  if (!isAdmin(request)) return deny();
  const body = await request.json().catch(() => ({}));
  const meta = body.id && (await readMeta(body.id));
  if (!meta) return json({ ok: false, message: '시안을 찾을 수 없어요.' }, 404);

  if (typeof body.title === 'string' && body.title.trim()) meta.title = body.title.trim().slice(0, 80);
  if (body.visibility === 'public' || body.visibility === 'private') meta.visibility = body.visibility;
  if (body.password) {
    if (String(body.password).length < 4) return json({ ok: false, message: '비밀번호는 4자 이상이에요.' }, 400);
    meta.passwordHash = hashPassword(body.password);
  }
  if (meta.visibility === 'private' && !meta.passwordHash) {
    return json({ ok: false, message: '비공개로 바꾸려면 비밀번호도 정해 주세요.' }, 400);
  }
  await writeMeta(meta);
  return json({ ok: true, item: adminView(meta) });
}

// 삭제 (?id=)
export async function DELETE(request) {
  if (!isAdmin(request)) return deny();
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !(await readMeta(id))) return json({ ok: false, message: '시안을 찾을 수 없어요.' }, 404);
  await removeItem(id);
  return json({ ok: true });
}
