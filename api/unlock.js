// 비공개 시안 열기: 비밀번호가 맞으면 30분짜리 열람권을 줘요
import { json, readMeta, checkPassword, sign, tooMany, clientKey } from './_lib.js';

export async function POST(request) {
  const { id, password } = await request.json().catch(() => ({}));
  if (!id || !password) return json({ ok: false, message: '비밀번호를 입력해 주세요.' }, 400);
  if (tooMany(clientKey(request, id))) {
    return json({ ok: false, message: '여러 번 틀려서 잠시 막혔어요. 10분 뒤에 다시 시도해 주세요.' }, 429);
  }
  const meta = await readMeta(id);
  if (!meta || meta.visibility !== 'private') return json({ ok: false, message: '시안을 찾을 수 없어요.' }, 404);
  if (!checkPassword(password, meta.passwordHash)) return json({ ok: false, message: '비밀번호가 맞지 않아요.' }, 401);
  return json({ ok: true, token: sign({ id, role: 'viewer' }, 30 * 60) });
}
