// 3D 파일 내려주기: 공개는 바로, 비공개는 열람권(또는 관리자)일 때만
import { readMeta, readModel, verify, isAdmin } from './_lib.js';

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const token = url.searchParams.get('t');
  if (!id || !/^[a-z0-9-]+$/i.test(id)) return new Response('Not found', { status: 404 });

  const meta = await readMeta(id);
  if (!meta) return new Response('Not found', { status: 404 });

  if (meta.visibility === 'private' && !isAdmin(request)) {
    const data = verify(token);
    if (!data || data.id !== id) return new Response('Locked', { status: 403 });
  }

  const file = await readModel(id);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file.stream, {
    headers: {
      'content-type': 'model/gltf-binary',
      'cache-control': meta.visibility === 'private' ? 'private, no-store' : 'public, max-age=300',
    },
  });
}
