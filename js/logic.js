export const LEVEL_NAME = {
  1: 'พื้นฐาน',
  2: 'กลาง',
  3: 'สูง',
  4: 'ท้าทาย',
};

export const SUBJECT_SHORT = {
  TH: 'ภาษาไทย',
  MA: 'คณิตศาสตร์',
  SC: 'วิทยาศาสตร์',
  EN: 'ภาษาอังกฤษ',
  SO: 'สังคมศึกษา',
};

const FALLBACK_GRADES = [
  { code: 'P1', name_th: 'ป.1', sort: 1, is_prep: false },
  { code: 'P2', name_th: 'ป.2', sort: 2, is_prep: false },
  { code: 'P3', name_th: 'ป.3', sort: 3, is_prep: false },
  { code: 'P4', name_th: 'ป.4', sort: 4, is_prep: false },
  { code: 'P5', name_th: 'ป.5', sort: 5, is_prep: false },
  { code: 'P6', name_th: 'ป.6', sort: 6, is_prep: false },
];

const FALLBACK_SUBJECTS = [
  { code: 'TH', name_th: 'ภาษาไทย', is_core: true, color: '#E5484D', icon: '📖', sort: 1 },
  { code: 'MA', name_th: 'คณิตศาสตร์', is_core: true, color: '#3557D6', icon: '🔢', sort: 2 },
  { code: 'SC', name_th: 'วิทยาศาสตร์และเทคโนโลยี', is_core: true, color: '#1FA463', icon: '🔬', sort: 3 },
  { code: 'EN', name_th: 'ภาษาอังกฤษ', is_core: true, color: '#7C3AED', icon: '🔤', sort: 4 },
  { code: 'SO', name_th: 'สังคมศึกษา ศาสนาและวัฒนธรรม', is_core: true, color: '#F97316', icon: '🌏', sort: 5 },
];

function bySort(a, b) {
  return (a.sort ?? 0) - (b.sort ?? 0) || String(a.code).localeCompare(String(b.code));
}

export function mergeGrades(rows) {
  const map = new Map(FALLBACK_GRADES.map((g) => [g.code, { ...g }]));
  for (const row of rows || []) {
    if (!row || typeof row.code !== 'string') continue;
    if (row.is_prep === true) {
      map.delete(row.code);
      continue;
    }
    if (!/^P[1-6]$/.test(row.code)) continue;
    map.set(row.code, { ...map.get(row.code), ...row, is_prep: false });
  }
  return [...map.values()].filter((g) => /^P[1-6]$/.test(g.code)).sort(bySort);
}

export function mergeSubjects(rows) {
  const map = new Map(FALLBACK_SUBJECTS.map((s) => [s.code, { ...s }]));
  for (const row of rows || []) {
    if (!row || typeof row.code !== 'string') continue;
    if (row.is_core === false) {
      map.delete(row.code);
      continue;
    }
    const prev = map.get(row.code) || { code: row.code, sort: row.sort ?? 50, is_core: true };
    map.set(row.code, { ...prev, ...row, is_core: true });
  }
  return [...map.values()].filter((s) => s.is_core !== false).sort(bySort);
}

export function subjectLabel(subject) {
  return SUBJECT_SHORT[subject.code] || subject.name_th || subject.code;
}

export function safeHex(color, fallback) {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

export function correctIndex(answer) {
  if (answer == null) return null;
  if (typeof answer === 'number' && Number.isInteger(answer)) return answer;
  if (typeof answer === 'string' && /^-?\d+$/.test(answer.trim())) return Number(answer.trim());
  if (typeof answer === 'object') {
    for (const key of ['index', 'correctIndex', 'choice', 'answer_index']) {
      const value = answer[key];
      if (typeof value === 'number' && Number.isInteger(value)) return value;
      if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
    }
  }
  return null;
}

export function isChoiceCorrect(answer, choiceIndex) {
  const idx = correctIndex(answer);
  return idx != null && idx === choiceIndex;
}

function withIndex(answer, index) {
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) return { ...answer, index };
  return { index };
}

/** New choice order for one sitting. The correct text stays correct. */
export function shuffleChoices(item, random = Math.random) {
  const choices = Array.isArray(item?.choices) ? item.choices.slice() : null;
  if (!choices || choices.length < 2) return item;
  const order = choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  const original = correctIndex(item.answer);
  const next = original == null ? -1 : order.indexOf(original);
  return {
    ...item,
    choices: order.map((i) => choices[i]),
    answer: next >= 0 ? withIndex(item.answer, next) : item.answer,
  };
}

export function prepareItems(items, random = Math.random) {
  return (items || []).map((item) => shuffleChoices(item, random));
}

export function starsFor(correct, total) {
  if (!total || total < 0 || correct < 0) return 0;
  const pct = (100 * correct) / total;
  if (pct >= 85) return 3;
  if (pct >= 60) return 2;
  if (correct > 0) return 1;
  return 0;
}

export function passed(correct, total) {
  if (!total) return false;
  return (100 * correct) / total >= 60;
}

export function percent(correct, total) {
  if (!total) return 0;
  return Math.round((100 * correct) / total);
}

export function explanationText(explanation) {
  if (!explanation) return '';
  if (typeof explanation === 'string') return explanation.trim();
  if (typeof explanation === 'object' && typeof explanation.text === 'string') return explanation.text.trim();
  return '';
}

export function stepsOf(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((step) => {
      if (typeof step === 'string') return step.trim();
      if (step && typeof step === 'object') return String(step.text || step.step || '').trim();
      return '';
    })
    .filter(Boolean);
}

export function orderItems(items, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return items || [];
  const byId = new Map((items || []).map((item) => [Number(item.id), item]));
  const ordered = [];
  for (const id of ids) {
    const item = byId.get(Number(id));
    if (item) ordered.push(item);
  }
  return ordered;
}

export function practiceSetForLesson(sets, lessonId) {
  return (sets || []).find((set) => set.kind === 'practice' && set.active !== false && Number(set.lesson_id) === Number(lessonId)) || null;
}

export function bossSetForUnit(sets, unit) {
  if (!unit) return null;
  return (sets || []).find((set) => set.kind === 'boss' && set.active !== false && typeof set.code === 'string' && set.code.endsWith(`-${unit.code}`)) || null;
}

export function examSetsForSubject(sets, grade, subject) {
  return (sets || []).filter((set) => set.active !== false && set.grade_code === grade && set.subject_code === subject && (set.kind === 'mock' || set.kind === 'exam'));
}

export function lessonSignals(lesson, assets, sets) {
  const ownAssets = (assets || []).filter((asset) => Number(asset.lesson_id) === Number(lesson.id));
  const hasText = Boolean(lesson.intro_md && String(lesson.intro_md).trim()) || ownAssets.some((asset) => (asset.body && String(asset.body).trim()) || asset.url);
  const hasPractice = Boolean(practiceSetForLesson(sets, lesson.id));
  return { hasText, hasPractice, assets: ownAssets };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMd(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Small, safe subset: paragraphs, bold, and lists. Input is escaped first. */
export function renderLessonHtml(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let list = null;
  const close = () => {
    if (list) {
      html += list === 'ul' ? '</ul>' : '</ol>';
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    if (line.startsWith('- ')) {
      if (list !== 'ul') {
        close();
        html += '<ul>';
        list = 'ul';
      }
      html += `<li>${inlineMd(line.slice(2))}</li>`;
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (list !== 'ol') {
        close();
        html += '<ol>';
        list = 'ol';
      }
      html += `<li>${inlineMd(numbered[1])}</li>`;
      continue;
    }
    close();
    html += `<p>${inlineMd(line)}</p>`;
  }
  close();
  return html;
}

export function safeHttpUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {
    return null;
  }
  return null;
}

export function parseRoute(hash) {
  const parts = String(hash || '').replace(/^#/, '').split('?')[0].split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'me') return { name: 'progress' };
  if (parts[0] !== 'g' || !/^P[1-6]$/.test(parts[1] || '')) return { name: 'home' };
  const grade = parts[1];
  if (parts.length === 2) return { name: 'subjects', grade };
  if (parts[2] !== 's' || !/^[A-Za-z0-9_-]{1,12}$/.test(parts[3] || '')) return { name: 'subjects', grade };
  const subject = parts[3];
  if (parts.length === 4) return { name: 'units', grade, subject };
  if (parts[4] === 'quiz') return { name: 'subject-quiz', grade, subject };
  if (parts[4] === 'u' && /^\d+$/.test(parts[5] || '')) {
    const unitId = parts[5];
    if (parts[6] === 'boss') return { name: 'boss', grade, subject, unitId };
    return { name: 'lessons', grade, subject, unitId };
  }
  if (parts[4] === 'l' && /^\d+$/.test(parts[5] || '')) {
    const lessonId = parts[5];
    if (parts[6] === 'play') return { name: 'play', grade, subject, lessonId };
    if (parts[6] === 'quiz') return { name: 'quiz', grade, subject, lessonId };
    return { name: 'lesson', grade, subject, lessonId };
  }
  return { name: 'units', grade, subject };
}

export function encouragement(stars) {
  if (stars >= 3) return 'เยี่ยมมาก';
  if (stars === 2) return 'ผ่านแล้ว เก่งมาก';
  if (stars === 1) return 'เริ่มได้แล้ว ลองอีกครั้งนะ';
  return 'ยังไม่เป็นไร ฝึกอีกนิดแล้วจะคล่อง';
}
