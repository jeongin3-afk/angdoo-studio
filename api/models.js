// 홈페이지용: 시안 목록 (제목·공개 여부만, 비밀번호 정보는 절대 내보내지 않음)
import { json, listMeta, publicView } from './_lib.js';

export async function GET() {
  try {
    const items = await listMeta();
    return json({ items: items.map(publicView) });
  } catch (e) {
    return json({ items: [], error: 'unavailable' }, 200);
  }
}
