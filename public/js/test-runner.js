/**
 * Test Runner Client & Anti-Cheat Module
 */
import { currentUser } from './auth.js';
import { renderAnonymousWarning } from './presentation-viewer.js';

let currentAttempt = null;
let currentQuestionIndex = 0;
let timerInterval = null;
let lastViolationTime = 0;

export async function initTestRunner(testId, containerEl) {
  renderAnonymousWarning(containerEl);

  containerEl.innerHTML += `
    <div class="test-runner-container" id="test-runner-box">
      <div id="test-start-screen" class="test-card-box text-center">
        <h2>Testni boshlashga tayyormisiz?</h2>
        <p class="test-desc-text">Test davomida ekrandan chiqish va boshqa ilovalarga o'tish taqiqlanadi (Maksimum 3 ta ogohlantirish).</p>

        <div id="telegram-secondary-cta" class="telegram-hint-box" style="margin: 15px 0;">
          <span>💡 Ushbu testni Telegram Mini App orqali ham ishlashingiz mumkin.</span>
        </div>

        <button id="btn-start-test" class="btn btn-primary btn-lg">Testni boshlash 🚀</button>
      </div>

      <div id="test-active-screen" class="test-active-box" style="display:none;">
        <div class="test-header-bar">
          <span id="test-title-display" class="test-title"></span>
          <div class="test-timer-display" id="test-timer-display">⏳ --:--</div>
        </div>

        <div class="test-progress-bar-container">
          <div id="test-progress-fill" class="test-progress-fill" style="width: 0%;"></div>
        </div>

        <div class="test-watermark" id="test-watermark"></div>

        <div id="test-question-box" class="test-question-box" style="user-select: none;">
          <h3 id="test-question-text" class="question-text"></h3>
          <div id="test-options-list" class="options-list"></div>
        </div>

        <div class="test-footer-bar">
          <button id="btn-prev-q" class="btn btn-secondary">◀ Oldingi</button>
          <span id="q-counter-display">1 / 10</span>
          <button id="btn-next-q" class="btn btn-secondary">Keyingi ▶</button>
          <button id="btn-finish-test" class="btn btn-danger" style="margin-left: auto;">Yakunlash 🏁</button>
        </div>
      </div>

      <div id="test-result-screen" class="test-result-box" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btn-start-test').addEventListener('click', async () => {
    // Request Fullscreen
    const box = document.getElementById('test-runner-box');
    if (box.requestFullscreen) {
      box.requestFullscreen().catch(() => {});
    }

    await startNewAttempt(testId);
  });
}

async function startNewAttempt(testId) {
  try {
    const res = await fetch('/api/test-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_id: testId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || 'Testni boshlashda xatolik yuz berdi');
      return;
    }

    await loadAttempt(data.attemptId);
  } catch (err) {
    console.error('Start attempt error:', err);
    alert('Server bilan bog\'lanishda xatolik');
  }
}

async function loadAttempt(attemptId) {
  try {
    const res = await fetch(`/api/test-attempts/${attemptId}`);
    if (!res.ok) return;

    currentAttempt = await res.json();

    document.getElementById('test-start-screen').style.display = 'none';
    document.getElementById('test-active-screen').style.display = 'block';

    document.getElementById('test-title-display').textContent = currentAttempt.titleUz;

    // Watermark display
    const userLabel = currentUser ? `${currentUser.displayName} (${currentUser.email})` : 'Anonymous User';
    document.getElementById('test-watermark').textContent = `${userLabel} - ${new Date().toLocaleTimeString()}`;

    setupAntiCheatListeners();
    startServerTimer(currentAttempt.expiresAt);
    renderQuestion(0);
    setupControls();
  } catch (err) {
    console.error('Load attempt error:', err);
  }
}

function renderQuestion(index) {
  if (!currentAttempt || !currentAttempt.questions[index]) return;
  currentQuestionIndex = index;

  const q = currentAttempt.questions[index];
  const total = currentAttempt.questions.length;

  document.getElementById('test-question-text').textContent = `${index + 1}. ${q.text}`;
  document.getElementById('q-counter-display').textContent = `${index + 1} / ${total}`;
  document.getElementById('test-progress-fill').style.width = `${((index + 1) / total) * 100}%`;

  const optionsList = document.getElementById('test-options-list');
  optionsList.innerHTML = '';

  const savedOptionId = currentAttempt.savedAnswers[q.id];

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `option-item-btn ${savedOptionId === opt.id ? 'selected' : ''}`;
    btn.textContent = opt.text;

    btn.addEventListener('click', async () => {
      // Deselect all
      optionsList.querySelectorAll('.option-item-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentAttempt.savedAnswers[q.id] = opt.id;

      // Autosave answer
      try {
        await fetch(`/api/test-attempts/${currentAttempt.attemptId}/answers/${q.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected_option_id: opt.id })
        });
      } catch (err) {
        console.error('Autosave answer error:', err);
      }
    });

    optionsList.appendChild(btn);
  });
}

function setupControls() {
  document.getElementById('btn-prev-q').onclick = () => {
    if (currentQuestionIndex > 0) renderQuestion(currentQuestionIndex - 1);
  };

  document.getElementById('btn-next-q').onclick = () => {
    if (currentQuestionIndex < currentAttempt.questions.length - 1) {
      renderQuestion(currentQuestionIndex + 1);
    }
  };

  document.getElementById('btn-finish-test').onclick = () => {
    if (confirm("Testni yakunlashga ishonchingiz komilmi?")) {
      finishAttempt();
    }
  };
}

function startServerTimer(expiresAtIso) {
  const expiresAt = new Date(expiresAtIso).getTime();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
      clearInterval(timerInterval);
      document.getElementById('test-timer-display').textContent = '⏳ 00:00';
      alert('Vaqtingiz tugadi! Test avtomatik yakunlanmoqda.');
      finishAttempt();
      return;
    }

    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    document.getElementById('test-timer-display').textContent = `⏳ ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, 1000);
}

function setupAntiCheatListeners() {
  const recordViolation = async (type) => {
    const now = Date.now();
    if (now - lastViolationTime < 1200) return; // Deduplication
    lastViolationTime = now;

    try {
      const res = await fetch(`/api/test-attempts/${currentAttempt.attemptId}/violations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: type })
      });
      const data = await res.json();
      if (data.terminated) {
        alert("Ogohlantirishlar limiti oshib ketdi! Test avtomatik to'xtatildi.");
        finishAttempt();
      } else {
        alert(`OGOHLANTIRISH (${data.violationCount}/${data.violationLimit}): Test oynasidan chiqish taqiqlanadi!`);
      }
    } catch (err) {
      console.error('Violation record error:', err);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentAttempt && currentAttempt.status === 'in_progress') {
      recordViolation('visibility_hidden');
    }
  });

  window.addEventListener('blur', () => {
    if (currentAttempt && currentAttempt.status === 'in_progress') {
      recordViolation('window_blur');
    }
  });

  // Copy/cut/paste prevention
  const prevent = (e) => e.preventDefault();
  const box = document.getElementById('test-question-box');
  if (box) {
    box.addEventListener('copy', prevent);
    box.addEventListener('cut', prevent);
    box.addEventListener('contextmenu', prevent);
  }
}

async function finishAttempt() {
  clearInterval(timerInterval);
  if (!currentAttempt) return;

  try {
    await fetch(`/api/test-attempts/${currentAttempt.attemptId}/finish`, {
      method: 'POST'
    });

    await renderTestResults(currentAttempt.attemptId);
  } catch (err) {
    console.error('Finish attempt error:', err);
  }
}

async function renderTestResults(attemptId) {
  try {
    const res = await fetch(`/api/test-attempts/${attemptId}/result`);
    const data = await res.json();

    document.getElementById('test-active-screen').style.display = 'none';
    const resultBox = document.getElementById('test-result-screen');
    resultBox.style.display = 'block';

    const statusBadge = data.passed ? '<span class="badge badge-success">O\'tdi ✅</span>' : '<span class="badge badge-danger">O\'tmadi ❌</span>';

    resultBox.innerHTML = `
      <div class="test-result-header">
        <h2>Test Natijasi</h2>
        <div class="result-score-banner">
          <div class="score-main">${data.scorePercent}%</div>
          <div>${statusBadge}</div>
        </div>
        <p>To'g'ri javoblar: <strong>${data.correctCount} / ${data.totalCount}</strong></p>
      </div>

      <div class="result-questions-review">
        <h3>Savollar tahlili:</h3>
        ${data.questions.map((q, idx) => {
          const userAns = data.answersMap[q.id];
          return `
            <div class="result-question-card">
              <h4>${idx + 1}. ${q.question_text}</h4>
              <div class="result-options">
                ${q.options.map(opt => {
                  let cls = '';
                  if (userAns && userAns.selectedOptionId === opt.id) {
                    cls = userAns.isCorrect ? 'opt-correct' : 'opt-wrong';
                  } else if (opt.is_correct) {
                    cls = 'opt-correct-answer';
                  }
                  return `<div class="result-opt-item ${cls}">${opt.option_text}</div>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn btn-primary" onclick="window.location.reload()">Katalogga qaytish</button>
    `;
  } catch (err) {
    console.error('Render results error:', err);
  }
}
