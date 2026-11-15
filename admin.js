/* 앙두 관리자: 3D 시안 올리기 · 공개/비공개 · 비밀번호 · 삭제 */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const api = async (url, opts = {}) => {
    const res = await fetch(url, { credentials: 'same-origin', ...opts });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/admin-login') showLogin();
    return { ok: res.ok, status: res.status, data };
  };

  const loginCard = $('#login-card');
  const area = $('#admin-area');
  const logoutBtn = $('#logout-btn');
  const showLogin = () => { loginCard.hidden = false; area.hidden = true; logoutBtn.hidden = true; };
  const showAdmin = () => { loginCard.hidden = true; area.hidden = false; logoutBtn.hidden = false; loadList(); };

  /* 로그인 */
  api('/api/admin-login').then(({ data }) => (data.admin ? showAdmin() : showLogin()));
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { ok, data } = await api('/api/admin-login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: $('#admin-pw').value }),
    });
    $('#login-msg').textContent = ok ? '' : data.message || '로그인에 실패했어요.';
    if (ok) { $('#admin-pw').value = ''; showAdmin(); }
  });
  logoutBtn.addEventListener('click', async () => { await api('/api/admin-login', { method: 'DELETE' }); showLogin(); });

  /* 올리기 */
  const pwWrap = $('#up-pw-wrap');
  document.querySelectorAll('input[name="vis"]').forEach((r) =>
    r.addEventListener('change', () => { pwWrap.hidden = r.value === 'public' && r.checked; })
  );
  $('#upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#up-msg');
    const fd = new FormData();
    fd.append('file', $('#up-file').files[0]);
    fd.append('title', $('#up-title').value);
    fd.append('visibility', document.querySelector('input[name="vis"]:checked').value);
    fd.append('password', $('#up-pw').value);
    msg.className = 'msg'; msg.textContent = '올리는 중…';
    const { ok, data } = await api('/api/admin-models', { method: 'POST', body: fd });
    msg.textContent = ok ? '올렸어요!' : data.message || '올리지 못했어요.';
    if (ok) { msg.classList.add('ok'); e.target.reset(); pwWrap.hidden = false; loadList(); }
  });

  /* 목록 */
  const list = $('#list');
  const fmt = (t) => new Date(t).toLocaleDateString('ko-KR');
  async function loadList() {
    const { ok, data } = await api('/api/admin-models');
    if (!ok) return;
    $('#count').textContent = `(${data.items.length})`;
    list.innerHTML = data.items.length ? '' : '<p class="empty">아직 올린 시안이 없어요.</p>';
    data.items.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        <div>
          <div class="item__title"></div>
          <div class="item__meta"><span class="badge ${it.visibility === 'private' ? 'badge--private' : ''}">${it.visibility === 'private' ? '비공개' : '공개'}</span><span>${fmt(it.createdAt)}</span><span>${Math.round((it.size || 0) / 1024)}KB</span></div>
        </div>
        <div class="item__btns">
          <button class="sbtn" data-act="view">미리보기</button>
          <button class="sbtn" data-act="rename">제목 수정</button>
          <button class="sbtn" data-act="toggle">${it.visibility === 'private' ? '공개로 바꾸기' : '비공개로 바꾸기'}</button>
          ${it.visibility === 'private' ? '<button class="sbtn" data-act="pw">비밀번호 변경</button>' : ''}
          <button class="sbtn sbtn--del" data-act="del">삭제</button>
        </div>`;
      row.querySelector('.item__title').textContent = it.title;
      row.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act, it)));
      list.appendChild(row);
    });
  }

  const patch = (body) =>
    api('/api/admin-models', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  async function act(kind, it) {
    if (kind === 'view') return openPreview(it);
    if (kind === 'rename') {
      const title = prompt('새 제목', it.title);
      if (title && title.trim()) await patch({ id: it.id, title });
    }
    if (kind === 'toggle') {
      if (it.visibility === 'private') {
        if (!confirm('누구나 볼 수 있게 공개할까요?')) return;
        await patch({ id: it.id, visibility: 'public' });
      } else {
        const pw = prompt('비공개로 바꿀게요. 고객 비밀번호를 정해 주세요 (4자 이상)');
        if (!pw) return;
        const r = await patch({ id: it.id, visibility: 'private', password: pw });
        if (!r.ok) alert(r.data.message);
      }
    }
    if (kind === 'pw') {
      const pw = prompt('새 비밀번호 (4자 이상)');
      if (!pw) return;
      const r = await patch({ id: it.id, password: pw });
      alert(r.ok ? '비밀번호를 바꿨어요.' : r.data.message);
    }
    if (kind === 'del') {
      if (!confirm(`'${it.title}' 시안을 삭제할까요? 되돌릴 수 없어요.`)) return;
      await api(`/api/admin-models?id=${encodeURIComponent(it.id)}`, { method: 'DELETE' });
    }
    loadList();
  }

  /* 미리보기 */
  const modal = $('#preview-modal');
  function openPreview(it) {
    $('#preview-title').textContent = it.title;
    $('#preview-viewer').src = `/api/file?id=${encodeURIComponent(it.id)}`;
    modal.hidden = false;
  }
  $('#preview-close').addEventListener('click', () => { modal.hidden = true; $('#preview-viewer').src = ''; });
});
