/* ============================================
   DL-library.uz — Test dvigateli (o'quv rejimi)
   • Har urinishda tasodifiy 20 ta savol
   • Vaqt cheklanmagan — sarflangan vaqt hisoblanadi
   • Javob belgilanganda darhol to'g'ri/noto'g'ri ko'rsatiladi
   • Yakunda natijalar ekrani (animatsiyali)
   Natijalar localStorage tarixiga yoziladi.
   ============================================ */

import { saveTestResult } from './local-progress.js';

const QUESTIONS_PER_ATTEMPT = 20;
const FEEDBACK_DELAY_MS = 1400;

const TEXTS = {
  uz: {
    readyTitle: "Testni boshlashga tayyormisiz?",
    metaQuestions: (n) => `${n} ta savol`,
    metaRandom: "Savollar tasodifiy tartibda tanlanadi",
    metaTime: "Vaqt cheklanmagan — sarflangan vaqt hisoblab boriladi",
    metaFeedback: "Har javobdan so'ng to'g'ri javob darhol ko'rsatiladi",
    start: "🚀 Testni boshlash",
    question: "Savol",
    correct: "To'g'ri",
    wrong: "Noto'g'ri",
    resultTitle: "Test yakunlandi!",
    correctAnswers: "To'g'ri javoblar",
    wrongAnswers: "Noto'g'ri javoblar",
    timeSpent: "Sarflangan vaqt",
    passed: "✅ Muvaffaqiyatli o'tdingiz!",
    failed: "Yana bir bor urinib ko'ring",
    review: "Savollar tahlili",
    yourAnswer: "Sizning javobingiz",
    correctAnswer: "To'g'ri javob",
    retry: "🔄 Qayta ishlash",
    noAnswer: "Belgilanmagan",
    loadError: "Test savollarini yuklashda xatolik yuz berdi. Keyinroq urinib ko'ring.",
  },
  ru: {
    readyTitle: "Готовы начать тест?",
    metaQuestions: (n) => `${n} вопросов`,
    metaRandom: "Вопросы выбираются случайным образом",
    metaTime: "Время не ограничено — учитывается затраченное время",
    metaFeedback: "После каждого ответа сразу показывается правильный",
    start: "🚀 Начать тест",
    question: "Вопрос",
    correct: "Верно",
    wrong: "Неверно",
    resultTitle: "Тест завершён!",
    correctAnswers: "Правильных ответов",
    wrongAnswers: "Неправильных ответов",
    timeSpent: "Затраченное время",
    passed: "✅ Вы успешно прошли!",
    failed: "Попробуйте ещё раз",
    review: "Разбор вопросов",
    yourAnswer: "Ваш ответ",
    correctAnswer: "Правильный ответ",
    retry: "🔄 Пройти заново",
    noAnswer: "Не отмечено",
    loadError: "Не удалось загрузить вопросы. Попробуйте позже.",
  },
  en: {
    readyTitle: "Ready to start the test?",
    metaQuestions: (n) => `${n} questions`,
    metaRandom: "Questions are selected randomly",
    metaTime: "No time limit — elapsed time is tracked",
    metaFeedback: "The correct answer is shown right after each response",
    start: "🚀 Start test",
    question: "Question",
    correct: "Correct",
    wrong: "Wrong",
    resultTitle: "Test finished!",
    correctAnswers: "Correct answers",
    wrongAnswers: "Wrong answers",
    timeSpent: "Time spent",
    passed: "✅ You passed!",
    failed: "Try again",
    review: "Answer review",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    retry: "🔄 Retry",
    noAnswer: "Not answered",
    loadError: "Failed to load questions. Please try again later.",
  },
};

export async function initTestRunner(test, containerEl, { lang = 'uz' } = {}) {
  const tr = TEXTS[lang] || TEXTS.uz;
  const title = test[`title_${lang}`] || test.title_uz || 'Test';
  const questionCount = Math.min(QUESTIONS_PER_ATTEMPT, test.question_count || QUESTIONS_PER_ATTEMPT);

  containerEl.innerHTML = `
    <section class="quiz" id="quiz-box">
      <div class="quiz__start" id="quiz-start">
        <div class="quiz__start-icon">📝</div>
        <h2 class="quiz__start-title"></h2>
        <h3 class="quiz__start-question">${tr.readyTitle}</h3>
        <ul class="quiz__meta-list">
          <li>🎲 ${tr.metaQuestions(questionCount)} — ${tr.metaRandom.toLowerCase()}</li>
          <li>⏱ ${tr.metaTime}</li>
          <li>💡 ${tr.metaFeedback}</li>
        </ul>
        <button class="btn btn-primary btn-lg" id="quiz-start-btn">${tr.start}</button>
      </div>
      <div class="quiz__active" id="quiz-active" hidden></div>
      <div class="quiz__result" id="quiz-result" hidden></div>
    </section>
  `;
  containerEl.querySelector('.quiz__start-title').textContent = title;

  containerEl.querySelector('#quiz-start-btn').addEventListener('click', () => {
    startQuiz(test, containerEl, tr, title);
  });
}

async function startQuiz(test, containerEl, tr, title) {
  let quizData;
  try {
    const res = await fetch(`/api/tests/quiz/${test.id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    quizData = await res.json();
  } catch (err) {
    console.error('Quiz load error:', err);
    containerEl.querySelector('#quiz-start').innerHTML = `<p class="error-msg">${tr.loadError}</p>`;
    return;
  }

  // Tasodifiy 20 ta savol + variantlarni aralashtirish
  const questions = shuffleArray(quizData.questions)
    .slice(0, QUESTIONS_PER_ATTEMPT)
    .map((q) => ({ ...q, options: shuffleArray([...q.options]) }));

  const session = {
    questions,
    index: 0,
    correctCount: 0,
    wrongCount: 0,
    answers: [], // { question, selectedId, correctId, isCorrect }
    startedAt: Date.now(),
    timerId: null,
  };

  const startEl = containerEl.querySelector('#quiz-start');
  const activeEl = containerEl.querySelector('#quiz-active');
  startEl.hidden = true;
  activeEl.hidden = false;

  activeEl.innerHTML = `
    <header class="quiz__topbar">
      <div class="quiz__scorechips">
        <span class="quiz-chip quiz-chip--correct" id="quiz-correct-chip">✓ 0</span>
        <span class="quiz-chip quiz-chip--wrong" id="quiz-wrong-chip">✗ 0</span>
      </div>
      <div class="quiz__timer" id="quiz-timer">⏱ 00:00</div>
    </header>
    <div class="quiz__progress"><div class="quiz__progress-fill" id="quiz-progress-fill"></div></div>
    <div class="quiz__stage" id="quiz-stage"></div>
  `;

  // Sarflangan vaqt hisoblagichi
  const timerEl = activeEl.querySelector('#quiz-timer');
  session.timerId = setInterval(() => {
    timerEl.textContent = `⏱ ${formatElapsed(Date.now() - session.startedAt)}`;
  }, 1000);

  renderQuestion(session, containerEl, tr, title, test);
}

function renderQuestion(session, containerEl, tr, title, test) {
  const { questions, index } = session;
  const q = questions[index];
  const total = questions.length;
  const stage = containerEl.querySelector('#quiz-stage');

  containerEl.querySelector('#quiz-progress-fill').style.width = `${(index / total) * 100}%`;

  const card = document.createElement('div');
  card.className = 'quiz-card quiz-card--enter';
  card.innerHTML = `
    <div class="quiz-card__label">${tr.question} ${index + 1} / ${total}</div>
    <h3 class="quiz-card__question"></h3>
    <div class="quiz-card__options"></div>
  `;
  card.querySelector('.quiz-card__question').textContent = q.question_text;

  const optionsWrap = card.querySelector('.quiz-card__options');
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.style.animationDelay = `${i * 60}ms`;
    btn.innerHTML = `<span class="quiz-option__letter">${String.fromCharCode(65 + i)}</span><span class="quiz-option__text"></span>`;
    btn.querySelector('.quiz-option__text').textContent = opt.option_text;
    btn.addEventListener('click', () => {
      handleAnswer(session, containerEl, card, q, opt, tr, title, test);
    });
    optionsWrap.appendChild(btn);
  });

  stage.innerHTML = '';
  stage.appendChild(card);
  setTimeout(() => card.classList.remove('quiz-card--enter'), 30);
}

function handleAnswer(session, containerEl, card, q, selectedOpt, tr, title, test) {
  // Takroriy bosishni bloklash
  if (card.dataset.answered) return;
  card.dataset.answered = '1';

  const correctOpt = q.options.find((o) => o.is_correct === 1);
  const isCorrect = correctOpt && selectedOpt.id === correctOpt.id;

  const optionBtns = [...card.querySelectorAll('.quiz-option')];
  optionBtns.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add('quiz-option--locked');
  });

  const selectedBtn = optionBtns[q.options.indexOf(selectedOpt)];
  const correctBtn = optionBtns[q.options.indexOf(correctOpt)];

  if (isCorrect) {
    session.correctCount++;
    selectedBtn.classList.add('quiz-option--correct');
    selectedBtn.insertAdjacentHTML('beforeend', `<span class="quiz-option__mark">✓ ${tr.correct}</span>`);
  } else {
    session.wrongCount++;
    selectedBtn.classList.add('quiz-option--wrong', 'quiz-option--shake');
    selectedBtn.insertAdjacentHTML('beforeend', `<span class="quiz-option__mark">✗ ${tr.wrong}</span>`);
    if (correctBtn) {
      correctBtn.classList.add('quiz-option--reveal');
    }
  }

  // Hisob chiplari yangilanadi
  const cChip = containerEl.querySelector('#quiz-correct-chip');
  const wChip = containerEl.querySelector('#quiz-wrong-chip');
  cChip.textContent = `✓ ${session.correctCount}`;
  wChip.textContent = `✗ ${session.wrongCount}`;
  (isCorrect ? cChip : wChip).classList.add('quiz-chip--bump');
  setTimeout(() => (isCorrect ? cChip : wChip).classList.remove('quiz-chip--bump'), 400);

  session.answers.push({
    question_text: q.question_text,
    options: q.options,
    selectedId: selectedOpt.id,
    correctId: correctOpt ? correctOpt.id : null,
    isCorrect,
  });

  setTimeout(() => {
    card.classList.add('quiz-card--exit');
    setTimeout(() => {
      session.index++;
      if (session.index < session.questions.length) {
        renderQuestion(session, containerEl, tr, title, test);
      } else {
        finishQuiz(session, containerEl, tr, title, test);
      }
    }, 320);
  }, FEEDBACK_DELAY_MS);
}

function finishQuiz(session, containerEl, tr, title, test) {
  clearInterval(session.timerId);

  const total = session.questions.length;
  const elapsedMs = Date.now() - session.startedAt;
  const percent = total > 0 ? Math.round((session.correctCount / total) * 100) : 0;
  const passingPercent = test.passing_percent || 60;
  const passed = percent >= passingPercent;

  saveTestResult({
    testId: test.id,
    title,
    correct: session.correctCount,
    wrong: session.wrongCount,
    total,
    percent,
    elapsedSeconds: Math.round(elapsedMs / 1000),
    passed,
  });

  const activeEl = containerEl.querySelector('#quiz-active');
  const resultEl = containerEl.querySelector('#quiz-result');
  activeEl.hidden = true;
  resultEl.hidden = false;

  // Natija ringi (SVG)
  const R = 54;
  const CIRC = 2 * Math.PI * R;

  resultEl.innerHTML = `
    <div class="quiz-result-card">
      <h2 class="quiz-result-card__title">${tr.resultTitle}</h2>
      <p class="quiz-result-card__verdict ${passed ? 'is-passed' : 'is-failed'}">${passed ? tr.passed : tr.failed}</p>

      <div class="quiz-ring-wrap">
        <svg class="quiz-ring" viewBox="0 0 128 128" role="img" aria-label="${percent}%">
          <circle class="quiz-ring__track" cx="64" cy="64" r="${R}" />
          <circle class="quiz-ring__value ${passed ? 'is-passed' : 'is-failed'}" cx="64" cy="64" r="${R}"
                  stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}" />
        </svg>
        <div class="quiz-ring__center">
          <span class="quiz-ring__percent" id="quiz-ring-percent">0%</span>
        </div>
      </div>

      <div class="quiz-result-stats">
        <div class="quiz-stat quiz-stat--correct">
          <span class="quiz-stat__num">${session.correctCount}</span>
          <span class="quiz-stat__label">${tr.correctAnswers}</span>
        </div>
        <div class="quiz-stat quiz-stat--wrong">
          <span class="quiz-stat__num">${session.wrongCount}</span>
          <span class="quiz-stat__label">${tr.wrongAnswers}</span>
        </div>
        <div class="quiz-stat">
          <span class="quiz-stat__num">${formatElapsed(elapsedMs)}</span>
          <span class="quiz-stat__label">${tr.timeSpent}</span>
        </div>
      </div>

      <button class="btn btn-primary" id="quiz-retry-btn">${tr.retry}</button>

      <details class="quiz-review">
        <summary>${tr.review}</summary>
        <div class="quiz-review__list">
          ${session.answers.map((a, i) => `
            <div class="quiz-review__item ${a.isCorrect ? 'is-correct' : 'is-wrong'}">
              <p class="quiz-review__q">${i + 1}. ${escapeHtml(a.question_text)}</p>
              ${a.options.map((opt) => {
                let cls = '';
                if (opt.id === a.correctId) cls = 'is-correct-answer';
                else if (opt.id === a.selectedId) cls = 'is-wrong-answer';
                return `<div class="quiz-review__opt ${cls}">${escapeHtml(opt.option_text)}</div>`;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </details>
    </div>
  `;

  // Ring va foiz animatsiyasi
  setTimeout(() => {
    const ring = resultEl.querySelector('.quiz-ring__value');
    ring.style.strokeDashoffset = String(CIRC * (1 - percent / 100));

    const percentEl = resultEl.querySelector('#quiz-ring-percent');
    const durationMs = 900;
    const startTime = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - startTime) / durationMs);
      percentEl.textContent = `${Math.round(percent * p)}%`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // rAF ishlamay qolsa ham yakuniy qiymat ko'rinishi kafolati
    setTimeout(() => { percentEl.textContent = `${percent}%`; }, durationMs + 150);
  });

  resultEl.querySelector('#quiz-retry-btn').addEventListener('click', () => {
    resultEl.hidden = true;
    startQuiz(test, containerEl, tr, title);
  });
}

// ---------- Yordamchilar ----------

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
