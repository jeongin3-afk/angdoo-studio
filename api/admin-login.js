// 관리자 로그인 / 로그아웃 / 로그인 확인
import { json, checkAdminPassword, sign, isAdmin, tooMany, clientKey } from './_lib.js';

const COOKIE = 'angdoo_admin';
const cookie = (value, maxAge) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export async function GET(request) {
  return json({ admin: isAdmin(request) });
}

export async function POST(request) {
  if (tooMany(clientKey(request, 'admin'), 6)) {
    return json({ ok: false, message: '여러 번 틀려서 잠시 막혔어요. 10분 뒤에 다시 시도해 주세요.' }, 429);
  }
  const { password } = await request.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return json({ ok: false, message: '관리자 설정이 아직 안 되어 있어요. (환경 변수 확인)' }, 500);
  }
  if (!checkAdminPassword(password)) return json({ ok: false, message: '관리자 비밀번호가 맞지 않아요.' }, 401);
  const token = sign({ role: 'admin' }, 12 * 60 * 60);
  return json({ ok: true }, 200, { 'set-cookie': cookie(encodeURIComponent(token), 12 * 60 * 60) });
}

export async function DELETE() {
  return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
}
