/**
 * Test Runner Client — Offline (Client-side) Mode
 * Testlar ro'yxatdan o'tmasdan ishlay oladi, natijalar serverga saqlanmaydi.
 * Keyingi versiyada Google OAuth bilan birga server-side attempt tizimi qaytariladi.
 */

let quizData = null;       // { test, questions }
let shuffledQuestions = []; // shuffled copy
let userAnswers = {};      // questionId -> selectedOptionId
let currentQIdx = 0;
let timerInterval = null;
let expiresAt = null;
let violationCount = 0;
const VIOLATION_LIMIT = 3;

export async function initTestRunner(testId, containerEl) {
  containerEl.innerHTML = `
    <div class="test-runner-container" id="test-runner-box">
      <div id="test-start-screen" class="test-card-box text-center">
        <h2>Testni boshlashga tayyormisiz?</h2>
        <p class="test-desc-text">Test davomida ekrandan chiqish va boshqa ilovalarga o'tish taqiqlanadi (Maksimum 3 ta ogohlantirish).</p>
        <p class="test-desc-text" style="color: var(--text-muted); font-size: 0.85rem;">Natijalar hozircha saqlanmaydi — keyingi versiyada Google profil bilan kirganingizda saqlanadi.</p>

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
    const box = document.getElementById('test-runner-box');
    if (box.requestFullscreen) {
      box.requestFullscreen().catch(() => {});
    }
    await startQuiz(testId);
  });
}

// ---------- Quiz logic ----------

async function startQuiz(testId) {
  try {
    const res = await fetch(`/api/tests/quiz/${testId}`);
    if (!res.ok) {
      alert('Test ma\'lumotlarini yuklashda xatolik');
      return;
    }
    quizData = await res.json();
  } catch (err) {
    console.error('Quiz load error:', err);
    alert('Server bilan bog\'lanishda xatolik');
    return;
  }

  const test = quizData.test;
  let questions = [...quizData.questions];

  // Shuffle questions if needed
  if (test.shuffle_questions) {
    questions = shuffleArray(questions);
  }

  // Shuffle options per question if needed
  if (test.shuffle_options) {
    questions.forEach(q => {
      q.options = shuffleArray([...q.options]);
    });
  }

  shuffledQuestions = questions;
  userAnswers = {};
  currentQIdx = 0;
  violationCount = 0;

  // Timer
  const durationMs = (test.duration_minutes || 15) * 60 * 1000;
  expiresAt = Date.now() + durationMs;

  // Show active screen
  document.getElementById('test-start-screen').style.display = 'none';
  document.getElementById('test-active-screen').style.display = 'block';
  document.getElementById('test-title-display').textContent = test.title_uz || 'Test';

  setupAntiCheatListeners();
  startTimer();
  renderQuestion(0);
  setupControls();
}

function renderQuestion(index) {
  if (!shuffledQuestions[index]) return;
  currentQIdx = index;

  const q = shuffledQuestions[index];
  const total = shuffledQuestions.length;

  document.getElementById('test-question-text').textContent = `${index + 1}. ${q.question_text}`;
  document.getElementById('q-counter-display').textContent = `${index + 1} / ${total}`;
  document.getElementById('test-progress-fill').style.width = `${((index + 1) / total) * 100}%`;

  const optionsList = document.getElementById('test-options-list');
  optionsList.innerHTML = '';

  const savedOptId = userAnswers[q.id];

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `option-item-btn ${savedOptId === opt.id ? 'selected' : ''}`;
    btn.textContent = opt.option_text;

    btn.addEventListener('click', () => {
      optionsList.querySelectorAll('.option-item-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      userAnswers[q.id] = opt.id;
    });

    optionsList.appendChild(btn);
  });
}

function setupControls() {
  document.getElementById('btn-prev-q').onclick = () => {
    if (currentQIdx > 0) renderQuestion(currentQIdx - 1);
  };

  document.getElementById('btn-next-q').onclick = () => {
    if (currentQIdx < shuffledQuestions.length - 1) {
      renderQuestion(currentQIdx + 1);
    }
  };

  document.getElementById('btn-finish-test').onclick = () => {
    if (confirm("Testni yakunlashga ishonchingiz komilmi?")) {
      finishQuiz();
    }
  };
}

// ---------- Timer ----------

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const diff = expiresAt - Date.now();

    if (diff <= 0) {
      clearInterval(timerInterval);
      document.getElementById('test-timer-display').textContent = '⏳ 00:00';
      alert('Vaqtingiz tugadi! Test avtomatik yakunlanmoqda.');
      finishQuiz();
      return;
    }

    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    document.getElementById('test-timer-display').textContent =
      `⏳ ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, 1000);
}

// ---------- Anti-Cheat ----------

function setupAntiCheatListeners() {
  document.addEventListener('visibilitychange', handleVisibilityViolation);
  window.addEventListener('blur', handleBlurViolation);

  const box = document.getElementById('test-question-box');
  if (box) {
    box.addEventListener('copy', prevent);
    box.addEventListener('cut', prevent);
    box.addEventListener('contextmenu', prevent);
  }
}

function cleanupAntiCheatListeners() {
  document.removeEventListener('visibilitychange', handleVisibilityViolation);
  window.removeEventListener('blur', handleBlurViolation);
}

let lastViolationTime = 0;

function handleVisibilityViolation() {
  if (document.hidden && shuffledQuestions.length > 0) recordViolation();
}

function handleBlurViolation() {
  if (shuffledQuestions.length > 0) recordViolation();
}

function prevent(e) { e.preventDefault(); }

function recordViolation() {
  const now = Date.now();
  if (now - lastViolationTime < 1200) return;
  lastViolationTime = now;

  violationCount++;
  if (violationCount >= VIOLATION_LIMIT) {
    alert("Ogohlantirishlar limiti oshib ketdi! Test avtomatik to'xtatildi.");
    finishQuiz();
  } else {
    alert(`OGOHLANTIRISH (${violationCount}/${VIOLATION_LIMIT}): Test oynasidan chiqish taqiqlanadi!`);
  }
}

// ---------- Finish & Results ----------

function finishQuiz() {
  clearInterval(timerInterval);
  cleanupAntiCheatListeners();

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  // Calculate results
  let correctCount = 0;
  const totalCount = shuffledQuestions.length;
  const passingPercent = quizData.test.passing_percent || 60;
  const showAnswers = quizData.test.show_answers_after_finish;

  const resultsPerQuestion = shuffledQuestions.map((q, idx) => {
    const selectedId = userAnswers[q.id];
    const correctOption = q.options.find(o => o.is_correct === 1);
    const isCorrect = selectedId && correctOption && selectedId === correctOption.id;
    if (isCorrect) correctCount++;

    return {
      index: idx + 1,
      question_text: q.question_text,
      options: q.options,
      selectedId,
      correctOptionId: correctOption ? correctOption.id : null,
      isCorrect,
    };
  });

  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const passed = scorePercent >= passingPercent;

  // Render results
  document.getElementById('test-active-screen').style.display = 'none';
  const resultBox = document.getElementById('test-result-screen');
  resultBox.style.display = 'block';

  const statusBadge = passed
    ? '<span class="badge badge-success">O\'tdi ✅</span>'
    : '<span class="badge badge-danger">O\'tmadi ❌</span>';

  let questionsHtml = '';
  if (showAnswers) {
    questionsHtml = `
      <div class="result-questions-review">
        <h3>Savollar tahlili:</h3>
        ${resultsPerQuestion.map(r => `
          <div class="result-question-card">
            <h4>${r.index}. ${r.question_text}</h4>
            <div class="result-options">
              ${r.options.map(opt => {
                let cls = '';
                if (r.selectedId === opt.id) {
                  cls = r.isCorrect ? 'opt-correct' : 'opt-wrong';
                } else if (opt.id === r.correctOptionId) {
                  cls = 'opt-correct-answer';
                }
                return `<div class="result-opt-item ${cls}">${opt.option_text}</div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  resultBox.innerHTML = `
    <div class="test-result-header">
      <h2>Test Natijasi</h2>
      <div class="result-score-banner">
        <div class="score-main">${scorePercent}%</div>
        <div>${statusBadge}</div>
      </div>
      <p>To'g'ri javoblar: <strong>${correctCount} / ${totalCount}</strong></p>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Natijalar hozircha saqlanmaydi — keyingi versiyada profil bilan saqlanadi.</p>
    </div>
    ${questionsHtml}
    <button class="btn btn-primary" onclick="window.location.reload()">Katalogga qaytish</button>
  `;
}

// ---------- Helpers ----------

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
