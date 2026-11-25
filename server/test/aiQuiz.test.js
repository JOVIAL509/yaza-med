import test from 'node:test';
import assert from 'node:assert/strict';
import { callGemini, gradeQuiz, quizValidation } from '../src/services/aiQuiz.js';

const createQuiz = () => ({
  questions: Array.from({ length: 30 }, (_, index) => ({
    prompt: `Question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer: index % 4,
    explanation: 'A short explanation.'
  })),
  shortAnswerQuestions: Array.from({ length: 3 }, (_, index) => ({
    prompt: `Short answer ${index + 1}`,
    modelAnswer: 'A model answer.',
    keyPoints: ['A key point.']
  }))
});

test('validates exactly 30 MCQs and 3 short-answer questions', () => {
  const validated = quizValidation(createQuiz());

  assert.equal(validated.questions.length, 30);
  assert.equal(validated.shortAnswerQuestions.length, 3);
});

test('rejects generated output that does not contain the required question counts', () => {
  const quiz = createQuiz();
  quiz.questions.pop();

  assert.throws(() => quizValidation(quiz), { status: 502 });
});

test('generates quizzes directly with Gemini 3.8 Flash', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const requestedModels = [];
  process.env.GEMINI_API_KEY = 'test-key';
  const requestBodies = [];
  globalThis.fetch = async (url, options) => {
    const model = String(url).match(/\/models\/([^:]+):generateContent/)?.[1];
    requestedModels.push(model);
    requestBodies.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(createQuiz()) }] } }]
      })
    };
  };

  try {
    const result = await callGemini({ text: 'Study material' }, 'gemini-3.8-flash');

    assert.deepEqual(requestedModels, ['gemini-3.8-flash']);
    assert.equal(requestBodies[0].generationConfig.thinkingConfig.thinkingLevel, 'medium');
    assert.equal(result.questions.length, 30);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test('reports Gemini generation timeouts separately from connection failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  globalThis.fetch = async () => {
    const error = new Error('The operation was aborted due to timeout');
    error.name = 'TimeoutError';
    throw error;
  };

  try {
    await assert.rejects(
      callGemini({ text: 'Study material' }, 'gemini-3.8-flash'),
      { status: 504, message: 'Gemini took too long to build this quiz. Try a shorter handout or try again.' }
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test('does not retry Gemini Flash when it returns a rate limit', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const requestedModels = [];
  process.env.GEMINI_API_KEY = 'test-key';
  globalThis.fetch = async url => {
    requestedModels.push(String(url).match(/\/models\/([^:]+):generateContent/)?.[1]);
    return {
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded.' } })
    };
  };

  try {
    await assert.rejects(
      callGemini({ text: 'Study material' }, 'gemini-3.8-flash'),
      /rate-limiting quiz generation/
    );
    assert.deepEqual(requestedModels, ['gemini-3.8-flash']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test('grades MCQs and returns short-answer review without another AI request', () => {
  const quiz = createQuiz();
  const answers = quiz.questions.map(question => question.answer);
  answers[0] = (answers[0] + 1) % 4;
  const result = gradeQuiz(quiz, answers, ['Answer one', 'Answer two', 'Answer three']);

  assert.equal(result.score, 29);
  assert.equal(result.total, 30);
  assert.equal(result.percentage, 97);
  assert.equal(result.questions[0].correct, false);
  assert.equal(result.shortAnswerQuestions[0].modelAnswer, 'A model answer.');
});

test('grades partial submissions and treats unanswered MCQs as incorrect', () => {
  const quiz = createQuiz();
  const result = gradeQuiz(quiz, [quiz.questions[0].answer], ['A response']);

  assert.equal(result.score, 1);
  assert.equal(result.total, 30);
  assert.equal(result.questions[0].selectedAnswer, quiz.questions[0].answer);
  assert.equal(result.questions[1].selectedAnswer, null);
  assert.equal(result.questions[1].correct, false);
  assert.equal(result.shortAnswerQuestions[0].response, 'A response');
  assert.equal(result.shortAnswerQuestions[1].response, '');
});

test('allows submitting the quiz with no answers', () => {
  const result = gradeQuiz(createQuiz(), [], []);

  assert.equal(result.score, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.questions.every(question => question.selectedAnswer === null), true);
  assert.equal(result.shortAnswerQuestions.every(question => question.response === ''), true);
});

test('rejects invalid submitted answer values', () => {
  const quiz = createQuiz();

  assert.throws(() => gradeQuiz(quiz, [4], []), { status: 400 });
  assert.throws(() => gradeQuiz(quiz, [], [5]), { status: 400 });
});
