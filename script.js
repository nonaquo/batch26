document.addEventListener('DOMContentLoaded', () => {
  // 1. FORCE SCROLL TO TOP ON REFRESH
  window.scrollTo(0, 0);
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // 2. SCROLL REVEAL
  const revealEls = document.querySelectorAll('.photo-frame, .name-card, .letter-card');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  revealEls.forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // 3. SLIDESHOW — buttons, dots, and AUTO-ADVANCE
  const slides = document.querySelectorAll('.slideshow__slide');
  const dots = document.querySelectorAll('.slideshow__dot');
  const prevBtn = document.getElementById('slide-prev');
  const nextBtn = document.getElementById('slide-next');

  if (!slides.length) return; // safety check

  let current = 0;
  let autoTimer = null;

  function goTo(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => { goTo(current + 1); }, 4000);
  }

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  nextBtn.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  prevBtn.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  dots.forEach((dot) => {
    dot.addEventListener('click', () => { goTo(parseInt(dot.dataset.index)); startAuto(); });
  });

  startAuto();
});

// ══════════════════════════════════════════
// COMMUNITY MESSAGE WALL — powered by Firebase Firestore
// Messages are shared across ALL devices in real time
// ══════════════════════════════════════════
(async function initMessageWall() {

  // ── FIREBASE CONFIG (your project keys) ──
  const firebaseConfig = {
    apiKey: "AIzaSyD60t3O-xDpB_itKukGNacSxfGcJv6rs88",
    authDomain: "batch-2026-f545c.firebaseapp.com",
    projectId: "batch-2026-f545c",
    storageBucket: "batch-2026-f545c.firebasestorage.app",
    messagingSenderId: "174959004367",
    appId: "1:174959004367:web:e215cf1f209033dd8d05ba",
    measurementId: "G-12W3041XPN"
  };

  // ── LOAD FIREBASE FROM CDN ──
  // We use the compat (v8-style) SDK so no build tools are needed
  await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ── INIT FIREBASE & FIRESTORE ──
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();
  const messagesRef = db.collection('messages');

  // ── DOM REFS ──
  const grid      = document.getElementById('msg-wall-grid');
  const empty     = document.getElementById('msg-wall-empty');
  const countEl   = document.getElementById('msg-count');
  const fromInput = document.getElementById('msg-from');
  const toInput   = document.getElementById('msg-to');
  const bodyInput = document.getElementById('msg-body');
  const submitBtn = document.getElementById('msg-submit-btn');
  const feedback  = document.getElementById('msg-submit-feedback');
  const charCount = document.getElementById('msg-char-count');

  if (!grid) return;

  // ── CHARACTER COUNTER (max 2000) ──
  const MAX_CHARS = 2000;
  bodyInput.setAttribute('maxlength', MAX_CHARS);
  bodyInput.addEventListener('input', () => {
    const len = bodyInput.value.length;
    charCount.textContent = len;
    if (charCount.parentElement) {
      charCount.parentElement.style.color = len >= MAX_CHARS ? '#e74c3c' : '';
    }
  });

  // ── FORMAT DATE ──
  function formatDate(ts) {
    const d = ts && ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── BUILD A STICKY NOTE ──
  function buildNote(msg, isNew = false) {
    const note = document.createElement('div');
    note.className = 'msg-note' + (isNew ? ' msg-note--new' : '');

    const pin = document.createElement('div');
    pin.className = 'msg-note__pin';

    const header = document.createElement('div');
    header.className = 'msg-note__header';

    const from = document.createElement('span');
    from.className = 'msg-note__from';
    from.textContent = '✉ From: ' + (msg.from || 'Anonymous');

    const to = document.createElement('span');
    to.className = 'msg-note__to';
    to.textContent = msg.to ? 'To: ' + msg.to : '';

    header.appendChild(from);
    header.appendChild(to);

    const body = document.createElement('p');
    body.className = 'msg-note__body';
    body.textContent = '"' + msg.body + '"';

    const date = document.createElement('span');
    date.className = 'msg-note__date';
    date.textContent = formatDate(msg.date);

    note.appendChild(pin);
    note.appendChild(header);
    note.appendChild(body);
    note.appendChild(date);

    return note;
  }

  // ── REAL-TIME LISTENER — updates wall instantly on ALL devices ──
  messagesRef
    .orderBy('date', 'desc')
    .onSnapshot((snapshot) => {
      // Clear existing notes
      grid.querySelectorAll('.msg-note').forEach(n => n.remove());

      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      countEl.textContent = messages.length;

      if (messages.length === 0) {
        empty.style.display = '';
      } else {
        empty.style.display = 'none';
        messages.forEach(msg => grid.appendChild(buildNote(msg)));
      }
    }, (err) => {
      console.error('Firestore listen error:', err);
    });

  // ── SUBMIT A NEW MESSAGE ──
  submitBtn.addEventListener('click', async () => {
    const body = bodyInput.value.trim();
    if (!body) {
      feedback.textContent = 'Please write a message before posting.';
      feedback.className = 'msg-submit-feedback error';
      return;
    }
    if (body.length > 2000) {
      feedback.textContent = 'Message exceeds 2000 characters. Please shorten it.';
      feedback.className = 'msg-submit-feedback error';
      return;
    }

    submitBtn.disabled = true;
    feedback.textContent = 'Posting…';
    feedback.className = 'msg-submit-feedback';

    try {
      await messagesRef.add({
        from: fromInput.value.trim() || 'Anonymous',
        to:   toInput.value.trim(),
        body,
        date: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Clear form
      fromInput.value = '';
      toInput.value   = '';
      bodyInput.value = '';
      charCount.textContent = '0';

      feedback.textContent = '✦ Your message is now on the wall!';
      feedback.className = 'msg-submit-feedback success';
      setTimeout(() => { feedback.textContent = ''; }, 4000);

      // Animate the newest note
      const firstNote = grid.querySelector('.msg-note');
      if (firstNote) firstNote.classList.add('msg-note--new');

    } catch (err) {
      console.error(err);
      feedback.textContent = 'Something went wrong. Please try again.';
      feedback.className = 'msg-submit-feedback error';
    }

    submitBtn.disabled = false;
  });

})();