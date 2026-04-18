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
    // wrap around
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    // remove active from current
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');

    // set new
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAuto() {
    stopAuto(); // clear any existing timer first
    autoTimer = setInterval(() => {
      goTo(current + 1);
    }, 4000); // change slide every 4 seconds
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Button clicks
  nextBtn.addEventListener('click', () => {
    goTo(current + 1);
    startAuto(); // restart timer after manual click
  });

  prevBtn.addEventListener('click', () => {
    goTo(current - 1);
    startAuto(); // restart timer after manual click
  });

  // Dot clicks
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.index));
      startAuto(); // restart timer after manual click
    });
  });

  // Start auto-play on load
  startAuto();
});
// ══════════════════════════════════════════
// COMMUNITY MESSAGE WALL
// ══════════════════════════════════════════
(async function initMessageWall() {
  const STORAGE_KEY = 'classchronicle2026:messages';

  const grid = document.getElementById('msg-wall-grid');
  const empty = document.getElementById('msg-wall-empty');
  const countEl = document.getElementById('msg-count');
  const fromInput = document.getElementById('msg-from');
  const toInput = document.getElementById('msg-to');
  const bodyInput = document.getElementById('msg-body');
  const submitBtn = document.getElementById('msg-submit-btn');
  const feedback = document.getElementById('msg-submit-feedback');
  const charCount = document.getElementById('msg-char-count');

  if (!grid) return;

  // Character counter
  bodyInput.addEventListener('input', () => {
    charCount.textContent = bodyInput.value.length;
  });

  // Format date nicely
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Build a sticky note element
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

  // Load and render all messages
  async function loadMessages() {
    try {
      const result = localStorage.getItem(STORAGE_KEY);
      const messages = result ? JSON.parse(result) : [];
      renderMessages(messages);
      return messages;
    } catch (e) {
      renderMessages([]);
      return [];
    }
  }

  function renderMessages(messages) {
    // Clear existing notes (keep empty state element)
    const existing = grid.querySelectorAll('.msg-note');
    existing.forEach(n => n.remove());

    countEl.textContent = messages.length;

    if (messages.length === 0) {
      empty.style.display = '';
    } else {
      empty.style.display = 'none';
      // Show newest first
      const sorted = [...messages].reverse();
      sorted.forEach(msg => {
        grid.appendChild(buildNote(msg));
      });
    }
  }

  // Submit
  submitBtn.addEventListener('click', async () => {
    const body = bodyInput.value.trim();
    if (!body) {
      feedback.textContent = 'Please write a message before posting.';
      feedback.className = 'msg-submit-feedback error';
      return;
    }

    submitBtn.disabled = true;
    feedback.textContent = 'Posting…';
    feedback.className = 'msg-submit-feedback';

    try {
      // Get current messages
      let messages = [];
      const result = localStorage.getItem(STORAGE_KEY);
      if (result) messages = JSON.parse(result);

      const newMsg = {
        id: Date.now() + Math.random().toString(36).slice(2),
        from: fromInput.value.trim() || 'Anonymous',
        to: toInput.value.trim(),
        body,
        date: new Date().toISOString()
      };

      messages.push(newMsg);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));

      // Re-render
      renderMessages(messages);

      // Animate the newest note (first in grid since reversed)
      const firstNote = grid.querySelector('.msg-note');
      if (firstNote) firstNote.classList.add('msg-note--new');

      // Clear form
      fromInput.value = '';
      toInput.value = '';
      bodyInput.value = '';
      charCount.textContent = '0';

      feedback.textContent = '✦ Your message is now on the wall!';
      feedback.className = 'msg-submit-feedback success';

      setTimeout(() => { feedback.textContent = ''; }, 4000);

    } catch (err) {
      console.error(err);
      feedback.textContent = 'Something went wrong. Please try again.';
      feedback.className = 'msg-submit-feedback error';
    }

    submitBtn.disabled = false;
  });

  // Initial load
  await loadMessages();

  // Auto-refresh every 30s
  setInterval(loadMessages, 30000);
})();