/**
 * DL-Library Test Engine Helper
 * Attempt generation, random order snapshot, timer, and server scoring
 */

export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function prepareAttemptOrders(questions, shuffleQuestions = true, shuffleOptions = true) {
  let orderedQuestions = shuffleQuestions ? shuffleArray(questions) : [...questions];
  const questionOrder = orderedQuestions.map(q => q.id);

  const optionOrder = {};
  for (const q of orderedQuestions) {
    let opts = shuffleOptions ? shuffleArray(q.options) : [...q.options];
    optionOrder[q.id] = opts.map(o => o.id);
  }

  return {
    questionOrder,
    optionOrder
  };
}

export function sanitizeQuestionsForClient(questions, questionOrder, optionOrder) {
  const qMap = new Map(questions.map(q => [q.id, q]));
  const result = [];

  for (const qId of questionOrder) {
    const q = qMap.get(qId);
    if (!q) continue;

    const optMap = new Map(q.options.map(o => [o.id, o]));
    const optIds = optionOrder[qId] || q.options.map(o => o.id);

    const clientOptions = optIds.map(oId => {
      const opt = optMap.get(oId);
      if (!opt) return null;
      return {
        id: opt.id,
        position: opt.position,
        text: opt.option_text || opt.text
      };
    }).filter(Boolean);

    result.push({
      id: q.id,
      position: q.position,
      text: q.question_text || q.text,
      options: clientOptions
    });
  }

  return result;
}

export function calculateScoring(questionsWithOptions, userAnswersMap) {
  let correctCount = 0;
  const totalCount = questionsWithOptions.length;

  for (const q of questionsWithOptions) {
    const selectedOptionId = userAnswersMap.get(q.id);
    if (selectedOptionId) {
      const correctOption = q.options.find(o => o.is_correct === 1 || o.isCorrect === true);
      if (correctOption && correctOption.id === Number(selectedOptionId)) {
        correctCount++;
      }
    }
  }

  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100 * 100) / 100 : 0;
  return {
    correctCount,
    totalCount,
    scorePercent
  };
}
