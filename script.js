/**
 * 앙두 공식 누리집 동작 스크립트
 * 외부 의존성 없는 순수 자바스크립트
 */
document.addEventListener('DOMContentLoaded', () => {
  // 구글 시트 문의 접수 주소 (Apps Script 웹 앱 URL). 비워두면 접수 완료 창만 떠요.
  const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzqicnirfNJATwhyKXEQMVj9UQBh7p6kzcwXMV5RvA75m0Mu57vgzjf0ldkUFfbhIxZ/exec';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* 1. 머리말: 스크롤 상태 · 펼침 메뉴 · 모바일 메뉴 · 맨 위로 */
  const header = $('.site-header');
  const toTop = $('#to-top');
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 20);
    toTop?.classList.toggle('is-visible', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const desktop = window.matchMedia('(min-width: 961px)');
  const gnb = $('#gnb');
  const setHover = (on) => header?.classList.toggle('is-hover', on && desktop.matches);
  if (gnb) {
    gnb.addEventListener('mouseenter', () => setHover(true));
    header.addEventListener('mouseleave', () => setHover(false));
    gnb.addEventListener('focusin', () => setHover(true));
    gnb.addEventListener('focusout', (e) => { if (!gnb.contains(e.relatedTarget)) setHover(false); });
  }

  const menuBtn = $('#menu-btn');
  const closeMenu = () => {
    gnb?.classList.remove('is-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    menuBtn?.setAttribute('aria-label', '메뉴 열기');
    document.body.style.overflow = '';
  };
  menuBtn?.addEventListener('click', () => {
    const open = gnb.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  gnb?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { closeMenu(); setHover(false); }));
  desktop.addEventListener('change', closeMenu);

  /* 2. 스크롤 등장 효과 */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* 2-1. 첫 화면 고양이: 한 팀씩 번갈아 등장 */
  const cats = $$('.hero__cats img');
  if (cats.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ci = 0;
    setInterval(() => {
      cats[ci].classList.remove('is-on');
      ci = (ci + 1) % cats.length;
      cats[ci].classList.add('is-on');
    }, 3200);
  }

  /* 3. 바로가기 단추 → 문의 유형 자동 선택 */
  const typeBoxes = $$('input[name="inquiryType"]');
  $$('[data-select-inquiry]').forEach((link) => {
    link.addEventListener('click', () => {
      const types = (link.dataset.selectInquiry || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (types.length) typeBoxes.forEach((cb) => { cb.checked = types.includes(cb.value); });
    });
  });

  /* 4. 작업기록: 6장씩 한 쪽, 화살표로 넘기기 · 크게 보기 */
  const openModal = (id) => { const m = document.getElementById(id); if (m) m.hidden = false; };
  const closeModal = (id) => { const m = document.getElementById(id); if (m) m.hidden = true; };

  const track = $('#gallery-track');
  const prevBtn = $('#gallery-prev');
  const nextBtn = $('#gallery-next');
  const countEl = $('#gallery-count');
  const PER_PAGE = 6;
  let page = 0;
  let pageCount = 1;

  if (track) {
    const items = Array.from(track.querySelectorAll('.gallery__item'));
    pageCount = Math.max(1, Math.ceil(items.length / PER_PAGE));
    track.innerHTML = '';
    for (let p = 0; p < pageCount; p++) {
      const pageEl = document.createElement('div');
      pageEl.className = 'gallery__page';
      items.slice(p * PER_PAGE, (p + 1) * PER_PAGE).forEach((it) => pageEl.appendChild(it));
      track.appendChild(pageEl);
    }
    track.classList.add('is-paged');

    const go = (n) => {
      page = Math.min(pageCount - 1, Math.max(0, n));
      track.style.transform = `translateX(-${page * 100}%)`;
      track.querySelectorAll('.gallery__page').forEach((pg, i) => {
        pg.toggleAttribute('inert', i !== page);
        pg.setAttribute('aria-hidden', String(i !== page));
      });
      if (countEl) countEl.textContent = `${page + 1} / ${pageCount}`;
      if (prevBtn) prevBtn.disabled = page === 0;
      if (nextBtn) nextBtn.disabled = page === pageCount - 1;
    };
    prevBtn?.addEventListener('click', () => go(page - 1));
    nextBtn?.addEventListener('click', () => go(page + 1));

    // 손가락으로 밀어서 넘기기
    let startX = null;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) go(page + (dx < 0 ? 1 : -1));
      startX = null;
    });
    go(0);

    const modalImg = $('#archive-modal-img');
    const modalVideo = $('#archive-modal-video');
    items.forEach((it) => {
      it.addEventListener('click', () => {
        const cap = $('#archive-modal-caption');
        if (cap) cap.textContent = it.dataset.caption || '';
        if (it.dataset.video) {
          modalImg.hidden = true;
          modalVideo.hidden = false;
          modalVideo.src = it.dataset.video;
          modalVideo.play().catch(() => {});
        } else {
          const img = it.querySelector('img');
          modalVideo.pause();
          modalVideo.hidden = true;
          modalImg.hidden = false;
          modalImg.src = img.src;
          modalImg.alt = img.alt;
        }
        openModal('archive-modal');
      });
    });
    // 창을 닫으면 영상 멈추기
    new MutationObserver(() => { if ($('#archive-modal').hidden) modalVideo.pause(); })
      .observe($('#archive-modal'), { attributes: true, attributeFilter: ['hidden'] });
  }

  /* 5. 작업실 (비밀번호 · 시안 보기 · 댓글) */
  const gate = $('#password-gate');
  const desk = $('#proofing-workspace');
  const pwInput = $('#workroom-password');
  const pwError = $('#password-error-msg');
  let requiredPass = '0739';

  const lock = () => {
    gate.hidden = false; desk.hidden = true; pwError.hidden = true;
    if (pwInput) pwInput.value = '';
  };
  const unlock = () => { gate.hidden = true; desk.hidden = false; pwError.hidden = true; };

  const posts = $$('.post');
  posts.forEach((post) => {
    const select = () => {
      posts.forEach((p) => { p.classList.remove('is-selected'); p.setAttribute('aria-selected', 'false'); });
      post.classList.add('is-selected');
      post.setAttribute('aria-selected', 'true');
      requiredPass = post.dataset.pass || '0739';
      $('#gate-post-client').textContent = `${post.dataset.client || '고객'} 전용 비밀글`;
      $('#gate-post-title').textContent = post.dataset.title || '';
      $('#workspace-post-title').textContent = post.dataset.title || '';
      lock();
    };
    post.addEventListener('click', select);
    post.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
  });

  $('#password-gate-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if ((pwInput?.value || '').trim() === requiredPass) unlock();
    else pwError.hidden = false;
  });
  $('#demo-unlock-btn')?.addEventListener('click', () => { if (pwInput) pwInput.value = requiredPass; unlock(); });
  $('#lock-again-btn')?.addEventListener('click', lock);

  const P = '#8E1825';
  const INK = '#3D2722';
  const TINT = '#F7E4DC';
  const views = {
    wireframe: {
      note: '지금 보는 화면: 3D 입체 뼈대 — 바느질 전에 캐릭터의 앞모습 볼륨을 미리 확인하는 화면이에요.',
      svg: `
      <svg viewBox="0 0 600 250" role="img" aria-label="3D 입체 뼈대 시안">
        <text x="20" y="28" fill="${P}" font-size="12" font-weight="700">앙두 3D 설계 · 2.4판 · 실제 크기 · 높이 250mm</text>
        <line x1="20" y1="38" x2="580" y2="38" stroke="#EADFC6" stroke-dasharray="4 4"/>
        <g transform="translate(150,145)">
          <ellipse cx="0" cy="-58" rx="22" ry="18" fill="${TINT}" stroke="${P}" stroke-width="1.8" transform="rotate(-18 0 -58)"/>
          <ellipse cx="46" cy="-58" rx="22" ry="18" fill="${TINT}" stroke="${P}" stroke-width="1.8" transform="rotate(18 46 -58)"/>
          <ellipse cx="23" cy="-12" rx="58" ry="50" fill="#FFFEF8" stroke="${P}" stroke-width="2.2"/>
          <path d="M-35 -12 Q23 12 81 -12" fill="none" stroke="${P}" stroke-opacity=".5" stroke-dasharray="3 3"/>
          <path d="M-30 -32 Q23 -14 76 -32" fill="none" stroke="${P}" stroke-opacity=".5" stroke-dasharray="3 3"/>
          <path d="M23 -62 Q10 -12 23 38" fill="none" stroke="${P}" stroke-opacity=".5" stroke-dasharray="3 3"/>
          <path d="M23 -62 Q36 -12 23 38" fill="none" stroke="${P}" stroke-opacity=".5" stroke-dasharray="3 3"/>
          <circle cx="4" cy="-16" r="4.5" fill="${INK}"/><circle cx="42" cy="-16" r="4.5" fill="${INK}"/>
          <ellipse cx="23" cy="-6" rx="7" ry="5" fill="${P}"/>
          <line x1="-45" y1="-65" x2="-45" y2="42" stroke="${P}" stroke-width="1.2"/>
          <text x="-100" y="-8" fill="${P}" font-size="12" font-weight="600">머리 116mm</text>
        </g>
        <g transform="translate(350,62)">
          <rect width="230" height="160" rx="12" fill="#FFF8EC" stroke="#EADFC6" stroke-width="1.5"/>
          <text x="16" y="28" fill="${P}" font-size="13" font-weight="700">2차 시안에서 고친 점</text>
          <text x="16" y="56" fill="${INK}" font-size="12">1. 양 볼 볼륨 12% 키움</text>
          <text x="16" y="82" fill="${INK}" font-size="12">2. 귀 각도 바깥으로 18도</text>
          <text x="16" y="108" fill="${INK}" font-size="12">3. 혼자 앉도록 바닥 주름 보강</text>
          <text x="16" y="138" fill="#8A746C" font-size="11.5">시접 5mm 반영 완료</text>
        </g>
      </svg>`,
    },
    side: {
      note: '지금 보는 화면: 옆·뒤 비율 — 코 높이와 뒤통수, 꼬리 중심을 살펴 인형이 안정적으로 앉도록 맞춰요.',
      svg: `
      <svg viewBox="0 0 600 250" role="img" aria-label="옆모습과 뒷모습 비율 시안">
        <text x="20" y="28" fill="${P}" font-size="12" font-weight="700">옆·뒤 모양 점검 · 앞뒤 깊이 104mm</text>
        <line x1="20" y1="38" x2="580" y2="38" stroke="#EADFC6" stroke-dasharray="4 4"/>
        <g transform="translate(160,145)">
          <ellipse cx="0" cy="-58" rx="16" ry="22" fill="${TINT}" stroke="${P}" stroke-width="1.8"/>
          <path d="M-40 -10 C-40 -52, 35 -52, 42 -12 C48 22, 20 42, -10 42 C-35 42, -40 18, -40 -10 Z" fill="#FFFEF8" stroke="${P}" stroke-width="2.2"/>
          <circle cx="28" cy="-14" r="4" fill="${INK}"/><circle cx="43" cy="-8" r="5" fill="${P}"/>
          <circle cx="-42" cy="24" r="14" fill="${TINT}" stroke="${P}" stroke-width="1.8"/>
          <text x="-110" y="28" fill="${P}" font-size="12" font-weight="700">꼬리 5mm 둥글게</text>
        </g>
        <g transform="translate(350,65)">
          <rect width="230" height="150" rx="12" fill="#FFF8EC" stroke="#EADFC6" stroke-width="1.5"/>
          <text x="16" y="30" fill="${P}" font-size="13" font-weight="700">무게중심 점검 통과</text>
          <text x="16" y="60" fill="${INK}" font-size="12">앞뒤 깊이 104mm</text>
          <text x="16" y="86" fill="${INK}" font-size="12">꼬리가 받쳐 주어 혼자 앉아요</text>
          <text x="16" y="112" fill="${INK}" font-size="12">뒷머리 이음선을 줄여 깔끔하게</text>
        </g>
      </svg>`,
    },
    pattern: {
      note: '지금 보는 화면: 바느질 패턴 펼친 그림 — 3D 모양을 오차 없이 평면으로 펼친 재단선과 주름 설계예요.',
      svg: `
      <svg viewBox="0 0 600 250" role="img" aria-label="바느질 패턴 펼친 그림">
        <text x="20" y="28" fill="${P}" font-size="12" font-weight="700">패턴 펼친 그림 · 시접 5mm</text>
        <line x1="20" y1="38" x2="580" y2="38" stroke="#EADFC6" stroke-dasharray="4 4"/>
        <g transform="translate(55,65)">
          <path d="M20 20 Q70 -10 120 20 L135 95 Q70 125 5 95 Z" fill="#FFF8EC" stroke="${P}" stroke-width="2"/>
          <path d="M62 20 L70 52 L78 20" fill="none" stroke="${P}" stroke-width="1.5"/>
          <text x="40" y="78" fill="${P}" font-size="12" font-weight="700">앞머리 1장</text>
        </g>
        <g transform="translate(230,65)">
          <path d="M15 15 Q60 0 105 15 L110 100 Q60 115 10 100 Z" fill="#FFFEF8" stroke="${P}" stroke-width="2" stroke-dasharray="5 3"/>
          <text x="36" y="65" fill="#8A746C" font-size="12" font-weight="700">옆판 2장</text>
        </g>
        <g transform="translate(395,65)">
          <ellipse cx="45" cy="45" rx="36" ry="28" fill="${TINT}" stroke="${P}" stroke-width="2"/>
          <text x="28" y="50" fill="${P}" font-size="12" font-weight="700">귀 4장</text>
          <text x="0" y="110" fill="${INK}" font-size="12">모두 14조각 재단 설계 완료</text>
        </g>
      </svg>`,
    },
  };

  const stage = $('#cad-stage');
  const note = $('#blueprint-status-note');
  const showView = (key) => {
    const v = views[key] || views.wireframe;
    if (stage) stage.innerHTML = v.svg;
    if (note) note.textContent = v.note;
  };
  showView('wireframe');
  const viewTabs = $$('.viewer__tab');
  viewTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      viewTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      showView(tab.dataset.view);
    });
  });

  const thread = $('#comment-thread');
  $('#proofing-comment-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const bodyEl = $('#comment-body');
    const body = (bodyEl?.value || '').trim();
    if (!body) { bodyEl?.focus(); return; }
    const author = ($('#comment-author')?.value || '').trim() || '제작 고객님';
    const tag = $('#comment-tag-select')?.value || '의견';

    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const time = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const li = document.createElement('li');
    li.className = 'comment';
    li.innerHTML = '<span class="comment__avatar">고객</span><div><p class="comment__meta"><strong></strong><span class="comment__tag"></span><time></time></p><p class="comment__body"></p></div>';
    li.querySelector('strong').textContent = author;
    li.querySelector('.comment__tag').textContent = tag;
    li.querySelector('time').textContent = time;
    li.querySelector('.comment__body').textContent = body;
    thread.appendChild(li);
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
    $('#comment-count-badge').textContent = `(${thread.querySelectorAll('.comment').length})`;
    bodyEl.value = '';
  });

  /* 6. 창 열고 닫기 */
  $$('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal').forEach((m) => { m.hidden = true; });
  });

  /* 7. 문의서 */
  const form = $('#angdoo-contact-form');
  const feedback = $('#form-feedback-msg');
  const warn = (msg) => { feedback.textContent = msg; feedback.hidden = false; };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const name = $('#inquiry-name').value.trim();
    const contact = $('#inquiry-contact').value.trim();
    const message = $('#inquiry-message').value.trim();
    const types = Array.from($$('input[name="inquiryType"]:checked')).map((cb) => cb.value);

    if (!name || !contact || !message) return warn('성함, 연락처, 문의 내용을 모두 적어주세요.');
    if (!types.length) return warn('문의 유형을 하나 이상 골라주세요.');
    if (!$('#inquiry-consent').checked) return warn('상담 안내를 위해 개인정보 수집·이용에 동의해 주세요.');

    const box = $('#success-summary-box');
    box.innerHTML = '';
    [['성함/기관명', name], ['연락처', contact], ['문의 유형', types.join(', ')], ['문의 내용', message]]
      .forEach(([k, v]) => {
        const p = document.createElement('p');
        const s = document.createElement('strong');
        s.textContent = k;
        p.append(s, document.createTextNode(v));
        box.appendChild(p);
      });

    const subject = encodeURIComponent(`[앙두 누리집 문의] ${name}님 (${types.join('/')})`);
    const body = encodeURIComponent(`성함/기관명: ${name}\n연락처: ${contact}\n문의 유형: ${types.join(', ')}\n\n[문의 내용]\n${message}`);
    $('#direct-mailto-btn').href = `mailto:loved28@naver.com?subject=${subject}&body=${body}`;

    // 구글 시트로 보내기 (주소가 설정된 경우)
    if (FORM_ENDPOINT) {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '보내는 중…';
      try {
        await fetch(FORM_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          body: new URLSearchParams({ name, contact, types: types.join(', '), message }),
        });
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = '문의 남기기';
        return warn('전송에 실패했어요. 잠시 후 다시 시도하시거나 문자로 연락 주세요.');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = '문의 남기기';
    }

    openModal('contact-success-modal');
    form.reset();
  });
});
