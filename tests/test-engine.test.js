import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffleArray,
  prepareAttemptOrders,
  sanitizeQuestionsForClient,
  calculateScoring
} from '../functions/_lib/test-engine.js';

test('shuffleArray - massiv elementlarini o\'zgartirmasdan nusxalaydi', () => {
  const original = [1, 2, 3, 4, 5];
  const shuffled = shuffleArray(original);
  assert.strictEqual(shuffled.length, 5);
  assert.deepStrictEqual(shuffled.sort(), original.sort());
});

test('prepareAttemptOrders & sanitizeQuestionsForClient - to\'g\'ri javoblarni berkitadi', () => {
  const questions = [
    {
      id: 101,
      position: 1,
      question_text: 'Savol 1',
      options: [
        { id: 1, option_text: 'Var A', is_correct: 0 },
        { id: 2, option_text: 'Var B', is_correct: 1 }
      ]
    }
  ];

  const orders = prepareAttemptOrders(questions, false, false);
  const clientQuestions = sanitizeQuestionsForClient(questions, orders.questionOrder, orders.optionOrder);

  assert.strictEqual(clientQuestions.length, 1);
  assert.strictEqual(clientQuestions[0].id, 101);
  assert.strictEqual(clientQuestions[0].options[0].id, 1);
  assert.strictEqual(clientQuestions[0].options[0].is_correct, undefined);
  assert.strictEqual(clientQuestions[0].options[1].is_correct, undefined);
});

test('calculateScoring - to\'g\'ri va noto\'g\'ri javoblarni to\'g\'ri hisoblaydi', () => {
  const questions = [
    {
      id: 1,
      options: [
        { id: 10, is_correct: 1 },
        { id: 11, is_correct: 0 }
      ]
    },
    {
      id: 2,
      options: [
        { id: 20, is_correct: 0 },
        { id: 21, is_correct: 1 }
      ]
    }
  ];

  const answersMap = new Map([
    [1, 10], // to'g'ri
    [2, 20]  // noto'g'ri
  ]);

  const score = calculateScoring(questions, answersMap);
  assert.strictEqual(score.correctCount, 1);
  assert.strictEqual(score.totalCount, 2);
  assert.strictEqual(score.scorePercent, 50);
});
