import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bossSetForUnit,
  correctIndex,
  encouragement,
  escapeHtml,
  examSetsForSubject,
  isChoiceCorrect,
  mergeGrades,
  mergeSubjects,
  orderItems,
  parseRoute,
  passed,
  practiceSetForLesson,
  renderLessonHtml,
  starsFor,
  subjectLabel,
} from '../js/logic.js';

test('grades stay ป.1–ป.6 and drop prep rows', () => {
  const grades = mergeGrades([
    { code: 'PRE1', name_th: 'เตรียมสอบเข้า ป.1', sort: 0, is_prep: true },
    { code: 'P6', name_th: 'ป.6', sort: 6, is_prep: false },
    { code: 'P1', name_th: 'ป.1', sort: 1, is_prep: false },
  ]);
  assert.deepEqual(grades.map((g) => g.code), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
});

test('core subjects use the short names and hide non-core', () => {
  const subjects = mergeSubjects([
    { code: 'GN', name_th: 'เชาว์ปัญญา', is_core: false, sort: 9 },
    { code: 'SC', name_th: 'วิทยาศาสตร์และเทคโนโลยี', is_core: true, color: '#1FA463', icon: '🔬', sort: 3 },
  ]);
  assert.equal(subjects.some((s) => s.code === 'GN'), false);
  assert.equal(subjectLabel(subjects.find((s) => s.code === 'SC')), 'วิทยาศาสตร์');
  assert.equal(subjectLabel(subjects.find((s) => s.code === 'MA')), 'คณิตศาสตร์');
  assert.equal(subjectLabel(subjects.find((s) => s.code === 'TH')), 'ภาษาไทย');
  assert.equal(subjectLabel(subjects.find((s) => s.code === 'EN')), 'ภาษาอังกฤษ');
  assert.equal(subjectLabel(subjects.find((s) => s.code === 'SO')), 'สังคมศึกษา');
});

test('answer index is zero-based and accepts object or number', () => {
  assert.equal(correctIndex({ index: 1 }), 1);
  assert.equal(correctIndex(0), 0);
  assert.equal(correctIndex('2'), 2);
  assert.equal(isChoiceCorrect({ index: 1 }, 1), true);
  assert.equal(isChoiceCorrect({ index: 1 }, 0), false);
});

test('stars follow 85 and 60 thresholds', () => {
  assert.equal(starsFor(9, 10), 3);
  assert.equal(starsFor(6, 10), 2);
  assert.equal(starsFor(1, 10), 1);
  assert.equal(starsFor(0, 10), 0);
  assert.equal(passed(6, 10), true);
  assert.equal(passed(5, 10), false);
  assert.equal(encouragement(3), 'เยี่ยมมาก');
});

test('lesson html escapes markup and keeps bold lists', () => {
  const html = renderLessonHtml('**<script>alert(1)</script>**\n- 1 < 2\n1) ขั้นหนึ่ง');
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>/);
  assert.match(html, /<ul><li>1 &lt; 2<\/li><\/ul>/);
  assert.match(html, /<ol><li>ขั้นหนึ่ง<\/li><\/ol>/);
  assert.equal(escapeHtml(`"&'`), '&quot;&amp;&#39;');
});

test('practice ordering and set matching', () => {
  const items = orderItems([{ id: 2, question: 'b' }, { id: 1, question: 'a' }], [1, 2, 9]);
  assert.deepEqual(items.map((item) => item.id), [1, 2]);
  const sets = [
    { kind: 'practice', active: true, lesson_id: 16, code: 'PIYA-PRAC-P1-MA-01-01' },
    { kind: 'boss', active: true, code: 'PIYA-BOSS-P1-MA-01', lesson_id: null },
    { kind: 'mock', active: true, grade_code: 'P1', subject_code: 'MA', code: 'PIYA-EXAM-P1-MA' },
  ];
  assert.equal(practiceSetForLesson(sets, '16').code, 'PIYA-PRAC-P1-MA-01-01');
  assert.equal(bossSetForUnit(sets, { code: 'P1-MA-01' }).code, 'PIYA-BOSS-P1-MA-01');
  assert.equal(bossSetForUnit(sets, { code: 'P1-MA-01-01' }), null);
  assert.equal(examSetsForSubject(sets, 'P1', 'MA').length, 1);
});

test('routes ignore a query and keep quiz mode', () => {
  assert.equal(parseRoute('').name, 'home');
  assert.equal(parseRoute('#/g/P1/s/MA/l/16/play').name, 'play');
  assert.equal(parseRoute('#/g/P1/s/MA/quiz?set=7').name, 'subject-quiz');
  assert.equal(parseRoute('#/g/P1/s/MA/u/6/boss').name, 'boss');
  assert.equal(parseRoute('#/me').name, 'progress');
  assert.equal(parseRoute('#/g/PRE1').name, 'home');
});
