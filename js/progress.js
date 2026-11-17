import { auth } from './auth.js';

function memoryStore() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function browserStore() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      const probe = 'piyapanya.probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* private mode */
  }
  return memoryStore();
}

export function createProgress(storage, keyFn) {
  const bag = storage || memoryStore();
  const keyOf = keyFn || (() => 'piyapanya.progress.v1.device');

  function read() {
    try {
      const parsed = JSON.parse(bag.getItem(keyOf()) || '{}');
      return {
        lessons: parsed.lessons && typeof parsed.lessons === 'object' ? parsed.lessons : {},
        exams: parsed.exams && typeof parsed.exams === 'object' ? parsed.exams : {},
      };
    } catch {
      return { lessons: {}, exams: {} };
    }
  }

  function write(next) {
    bag.setItem(keyOf(), JSON.stringify(next));
  }

  return {
    read,
    recordLesson(lessonId, result) {
      const data = read();
      const prev = data.lessons[String(lessonId)] || {};
      const stars = Math.max(prev.stars || 0, result.stars || 0);
      data.lessons[String(lessonId)] = {
        stars,
        correct: result.correct,
        total: result.total,
        hints: result.hints || 0,
        mode: result.mode || 'play',
        at: new Date().toISOString(),
      };
      write(data);
      return data.lessons[String(lessonId)];
    },
    recordExam(examKey, result) {
      const data = read();
      const prev = data.exams[examKey] || {};
      data.exams[examKey] = {
        correct: result.correct,
        total: result.total,
        stars: Math.max(prev.stars || 0, result.stars || 0),
        at: new Date().toISOString(),
      };
      write(data);
      return data.exams[examKey];
    },
    clear() {
      bag.removeItem(keyOf());
    },
  };
}

export const progress = createProgress(browserStore(), () => auth.storageKey());
