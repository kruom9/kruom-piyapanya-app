import { CONTACTS, PLACE, SCHOOL } from './config.js';
import { ApiError, loadCatalog, loadItemsByIds, loadItemsForLesson, loadItemsForSubject } from './api.js';
import { progress } from './progress.js';
import {
  LEVEL_NAME,
  bossSetForUnit,
  encouragement,
  examSetsForSubject,
  explanationText,
  isChoiceCorrect,
  lessonSignals,
  mergeGrades,
  mergeSubjects,
  orderItems,
  parseRoute,
  passed,
  percent,
  prepareItems,
  practiceSetForLesson,
  renderLessonHtml,
  safeHex,
  safeHttpUrl,
  starsFor,
  stepsOf,
  subjectLabel,
} from './logic.js';

const view = document.querySelector('#view');
const topbar = document.querySelector('#topbar');

let catalog = null;
let renderToken = 0;

function findGrade(code) {
  return mergeGrades(catalog?.grades).find((grade) => grade.code === code) || null;
}

function findSubject(code) {
  return mergeSubjects(catalog?.subjects).find((subject) => subject.code === code) || null;
}

function unitsFor(grade, subject) {
  return (catalog?.units || [])
    .filter((unit) => unit.grade_code === grade && unit.subject_code === subject && unit.status !== 'retired')
    .sort((a, b) => (a.unit_no ?? 0) - (b.unit_no ?? 0));
}

function lessonsFor(unitId) {
  return (catalog?.lessons || [])
    .filter((lesson) => Number(lesson.unit_id) === Number(unitId) && lesson.status !== 'retired')
    .sort((a, b) => (a.lesson_no ?? 0) - (b.lesson_no ?? 0));
}

function lessonStars(lessonId) {
  return progress.read().lessons[String(lessonId)]?.stars || 0;
}

function starsMarkup(count) {
  const n = Math.max(0, Math.min(3, count || 0));
  const bits = [1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : ''}" aria-hidden="true">★</span>`).join('');
  return `<span class="stars" aria-label="${n} จาก 3 ดาว">${bits}</span>`;
}

function setTop({ title, back, home }) {
  topbar.replaceChildren();
  if (home) {
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = '#/';
    const img = document.createElement('img');
    img.src = 'assets/logo.png';
    img.alt = 'ตราสัญลักษณ์ปิยปัญญา';
    img.width = 56;
    img.height = 56;
    const text = document.createElement('span');
    text.innerHTML = `<strong>${SCHOOL}</strong><small>${PLACE}</small>`;
    brand.append(img, text);
    const link = document.createElement('a');
    link.className = 'text-link';
    link.href = '#/me';
    link.textContent = 'ความคืบหน้า';
    topbar.append(brand, link);
    return;
  }
  const backLink = document.createElement('a');
  backLink.className = 'back';
  backLink.href = back || '#/';
  backLink.textContent = 'กลับ';
  const heading = document.createElement('h1');
  heading.className = 'top-title';
  heading.textContent = title || '';
  topbar.append(backLink, heading);
}

function panel(html) {
  view.innerHTML = html;
}

function showLoading(label) {
  setTop({ home: true });
  panel(`<section class="panel"><p class="loading">${label || 'กำลังเปิดสมุดแบบฝึก…'}</p></section>`);
}

function showError(error) {
  const detail = error instanceof ApiError ? error.message : 'ลองใหม่อีกครั้ง';
  setTop({ home: true });
  panel(`
    <section class="panel empty">
      <p class="empty-mark" aria-hidden="true">🌧️</p>
      <h2>ยังโหลดเนื้อหาไม่ได้</h2>
      <p>ตรวจสัญญาณอินเทอร์เน็ต แล้วกดโหลดอีกครั้ง เนื้อหาใหม่จากคลังจะมาเอง ไม่ต้องติดตั้งแอปใหม่</p>
      <button type="button" class="btn primary" id="retry">โหลดอีกครั้ง</button>
      <details class="tech"><summary>รายละเอียด</summary><p></p></details>
    </section>`);
  view.querySelector('#retry').addEventListener('click', () => {
    catalog = null;
    render();
  });
  view.querySelector('.tech p').textContent = detail;
}

async function ensureCatalog() {
  if (catalog) return catalog;
  catalog = await loadCatalog();
  return catalog;
}

function emptyBlock(title, text) {
  return `
    <section class="empty card">
      <p class="empty-mark" aria-hidden="true">🌱</p>
      <h2>${title || 'กำลังเพิ่มเนื้อหา'}</h2>
      <p>${text || 'บทเรียนส่วนนี้กำลังจัดอยู่ กลับมาใหม่ได้เร็ว ๆ นี้'}</p>
    </section>`;
}

function contactBlock() {
  const links = CONTACTS.map((item) => `<a href="${item.href}"${item.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${item.label}</a>`).join('');
  return `<footer class="site-foot"><p>${SCHOOL} · ${PLACE}</p><p>ฝึกฟรี ไม่ต้องสมัคร คะแนนเก็บบนเครื่องนี้</p><nav class="contacts">${links}</nav></footer>`;
}

function renderHome() {
  const grades = mergeGrades(catalog.grades);
  const saved = progress.read().lessons;
  const cards = grades.map((grade) => {
    const lessons = (catalog.lessons || []).filter((lesson) => {
      const unit = (catalog.units || []).find((item) => Number(item.id) === Number(lesson.unit_id));
      return unit && unit.grade_code === grade.code;
    });
    const earned = lessons.reduce((sum, lesson) => sum + (saved[String(lesson.id)]?.stars || 0), 0);
    return `<a class="grade-card" href="#/g/${grade.code}"><span class="grade-no">${grade.name_th}</span><span class="grade-meta">${earned ? `${earned} ดาว` : 'เริ่มเรียน'}</span></a>`;
  }).join('');
  setTop({ home: true });
  panel(`
    <section class="hero">
      <img class="hero-logo" src="assets/logo.png" alt="">
      <div>
        <p class="eyebrow">ฝึกโจทย์ฟรี</p>
        <h2>เลือกชั้นเรียน</h2>
        <p class="lede">ป.1 ถึง ป.6 · ภาษาไทย คณิตศาสตร์ วิทยาศาสตร์ ภาษาอังกฤษ สังคมศึกษา</p>
      </div>
    </section>
    <div class="grid-grades">${cards}</div>
    <p class="refresh-row"><button type="button" class="btn ghost" id="refresh">อัปเดตเนื้อหาล่าสุด</button></p>
    ${contactBlock()}`);
  view.querySelector('#refresh').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'กำลังอัปเดต…';
    catalog = null;
    try {
      await ensureCatalog();
      renderHome();
    } catch (error) {
      showError(error);
    }
  });
}

function renderSubjects(route) {
  const grade = findGrade(route.grade);
  if (!grade) return renderMissing();
  const subjects = mergeSubjects(catalog.subjects);
  const cards = subjects.map((subject) => {
    const units = unitsFor(grade.code, subject.code);
    const color = safeHex(subject.color, '#0F4C48');
    const ready = units.some((unit) => lessonsFor(unit.id).some((lesson) => lessonSignals(lesson, catalog.assets, catalog.sets).hasPractice));
    const note = units.length === 0 ? 'กำลังเพิ่มเนื้อหา' : (ready ? 'มีแบบฝึกแล้ว' : `${units.length} บท`);
    const full = subject.name_th && subject.name_th !== subjectLabel(subject) ? `${subject.name_th} · ` : '';
    return `<a class="subject-card" href="#/g/${grade.code}/s/${subject.code}" style="--subject:${color}"><span class="subject-icon" aria-hidden="true">${escapeText(subject.icon || '📘')}</span><span><strong>${escapeText(subjectLabel(subject))}</strong><small>${escapeText(full)}${escapeText(note)}</small></span></a>`;
  }).join('');
  setTop({ title: grade.name_th, back: '#/' });
  panel(`<section class="stack"><p class="eyebrow">${grade.name_th}</p><h2>เลือกวิชา</h2><div class="grid-subjects">${cards}</div></section>`);
}

function renderUnits(route) {
  const grade = findGrade(route.grade);
  const subject = findSubject(route.subject);
  if (!grade || !subject) return renderMissing();
  const color = safeHex(subject.color, '#0F4C48');
  const units = unitsFor(grade.code, subject.code);
  const exams = examSetsForSubject(catalog.sets, grade.code, subject.code);
  setTop({ title: subjectLabel(subject), back: `#/g/${grade.code}` });
  if (!units.length && !exams.length) {
    panel(`<section class="stack" style="--subject:${color}"><p class="eyebrow">${grade.name_th} · ${subjectLabel(subject)}</p>${emptyBlock('กำลังเพิ่มเนื้อหา', 'วิชานี้ของชั้นนี้กำลังจัดบทเรียนอยู่')}</section>`);
    return;
  }
  const examLinks = exams.length
    ? exams.map((set) => `<a class="banner" href="#/g/${grade.code}/s/${subject.code}/quiz?set=${encodeURIComponent(set.id)}">${escapeText(set.title || 'แบบทดสอบ')}</a>`).join('')
    : `<a class="banner" href="#/g/${grade.code}/s/${subject.code}/quiz">แบบทดสอบวิชานี้</a>`;
  const cards = units.map((unit) => {
    const lessons = lessonsFor(unit.id);
    const boss = bossSetForUnit(catalog.sets, unit);
    const starSum = lessons.reduce((sum, lesson) => sum + lessonStars(lesson.id), 0);
    return `<a class="row-card" href="#/g/${grade.code}/s/${subject.code}/u/${unit.id}"><span class="num">${unit.unit_no}</span><span><strong>บทที่ ${unit.unit_no} ${escapeText(unit.title)}</strong><small>${escapeText(unit.strand || '')}${lessons.length ? ` · ${lessons.length} บทย่อย` : ''}${boss ? ' · มีด่านท้ายบท' : ''}${starSum ? ` · ${starSum} ดาว` : ''}</small></span></a>`;
  }).join('');
  panel(`<section class="stack" style="--subject:${color}"><p class="eyebrow">${grade.name_th}</p><h2>${subjectLabel(subject)}</h2>${subject.name_th !== subjectLabel(subject) ? `<p class="lede">${subject.name_th}</p>` : ''}${examLinks}<div class="list">${cards}</div></section>`);
}

function renderLessons(route) {
  const grade = findGrade(route.grade);
  const subject = findSubject(route.subject);
  const unit = (catalog.units || []).find((item) => String(item.id) === String(route.unitId) && item.grade_code === route.grade && item.subject_code === route.subject);
  if (!grade || !subject || !unit) return renderMissing();
  const lessons = lessonsFor(unit.id);
  const boss = bossSetForUnit(catalog.sets, unit);
  setTop({ title: `บทที่ ${unit.unit_no}`, back: `#/g/${grade.code}/s/${subject.code}` });
  if (!lessons.length && !boss) {
    panel(`<section class="stack"><h2>${unit.title}</h2>${emptyBlock()}</section>`);
    return;
  }
  const cards = lessons.map((lesson) => {
    const signal = lessonSignals(lesson, catalog.assets, catalog.sets);
    const chips = [
      signal.hasPractice ? 'มีแบบฝึก' : '',
      signal.hasText ? 'มีบทอ่าน' : '',
      lesson.minutes ? `${lesson.minutes} นาที` : '',
    ].filter(Boolean).join(' · ');
    return `<a class="row-card" href="#/g/${grade.code}/s/${subject.code}/l/${lesson.id}"><span class="num">${lesson.lesson_no}</span><span><strong>${escapeText(lesson.title)}</strong><small>${escapeText(chips || 'กำลังเพิ่มเนื้อหา')}</small></span>${starsMarkup(lessonStars(lesson.id))}</a>`;
  }).join('');
  const bossLink = boss ? `<a class="banner" href="#/g/${grade.code}/s/${subject.code}/u/${unit.id}/boss">${escapeText(boss.title || 'ด่านท้ายบท')}</a>` : '';
  panel(`<section class="stack"><p class="eyebrow">${grade.name_th} · ${subjectLabel(subject)}${unit.strand ? ` · ${unit.strand}` : ''}</p><h2>${unit.title}</h2>${bossLink}<div class="list">${cards}</div></section>`);
}

function lessonBundle(route) {
  const grade = findGrade(route.grade);
  const subject = findSubject(route.subject);
  const lesson = (catalog.lessons || []).find((item) => String(item.id) === String(route.lessonId));
  const unit = lesson ? (catalog.units || []).find((item) => Number(item.id) === Number(lesson.unit_id)) : null;
  if (!grade || !subject || !lesson || !unit) return null;
  if (unit.grade_code !== grade.code || unit.subject_code !== subject.code) return null;
  return { grade, subject, lesson, unit };
}

function readingHtml(lesson) {
  const signal = lessonSignals(lesson, catalog.assets, catalog.sets);
  const chunks = [];
  if (lesson.intro_md && String(lesson.intro_md).trim()) {
    chunks.push(`<article class="reading">${renderLessonHtml(lesson.intro_md)}</article>`);
  }
  const assets = [...signal.assets].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  for (const asset of assets) {
    const title = asset.title ? `<h3>${escapeText(asset.title)}</h3>` : '';
    if (asset.kind === 'image') {
      const url = safeHttpUrl(asset.url);
      chunks.push(`<article class="reading">${title}${url ? `<img src="${url}" alt="">` : ''}${asset.body ? renderLessonHtml(asset.body) : ''}</article>`);
    } else if (asset.kind === 'link' || asset.kind === 'video' || asset.kind === 'sheet') {
      const url = safeHttpUrl(asset.url);
      chunks.push(`<article class="reading">${title}${url ? `<p><a href="${url}" target="_blank" rel="noopener noreferrer">เปิดสื่อ</a></p>` : ''}${asset.body ? renderLessonHtml(asset.body) : ''}</article>`);
    } else if (asset.body && String(asset.body).trim()) {
      chunks.push(`<article class="reading">${title}${renderLessonHtml(asset.body)}</article>`);
    }
  }
  return chunks.join('');
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function renderLesson(route) {
  const bundle = lessonBundle(route);
  if (!bundle) return renderMissing();
  const { grade, subject, lesson, unit } = bundle;
  const signal = lessonSignals(lesson, catalog.assets, catalog.sets);
  const body = readingHtml(lesson);
  setTop({ title: lesson.title, back: `#/g/${grade.code}/s/${subject.code}/u/${unit.id}` });
  const actions = `<a class="btn primary" href="#/g/${grade.code}/s/${subject.code}/l/${lesson.id}/play">เริ่มฝึก</a><a class="btn gold" href="#/g/${grade.code}/s/${subject.code}/l/${lesson.id}/quiz">ทำแบบทดสอบ</a>`;
  panel(`
    <section class="stack">
      <p class="eyebrow">${grade.name_th} · ${subjectLabel(subject)} · บทที่ ${unit.unit_no}</p>
      <h2>${escapeText(lesson.title)}</h2>
      <p class="meta-row">${lesson.minutes ? `${lesson.minutes} นาที` : ''} ${starsMarkup(lessonStars(lesson.id))}</p>
      ${body || (signal.hasPractice ? '<p class="lede">บทย่อยนี้ยังไม่มีบทอ่าน เริ่มฝึกได้เลย</p>' : '')}
      <div class="actions">${actions}</div>
      ${signal.hasText || signal.hasPractice ? '' : emptyBlock('กำลังเพิ่มเนื้อหา', 'บทย่อยนี้ยังไม่มีบทอ่านและข้อฝึก เมื่อเพิ่มในคลังแล้ว กดอัปเดตที่หน้าแรก')}
    </section>`);
}

function choiceButtons(item, { picked, revealed, onPick }) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  const wrap = document.createElement('div');
  wrap.className = 'choices';
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    const label = document.createElement('span');
    label.className = 'choice-key';
    label.textContent = String(index + 1);
    const text = document.createElement('span');
    text.textContent = String(choice ?? '');
    button.append(label, text);
    const correct = isChoiceCorrect(item.answer, index);
    if (revealed && correct) button.classList.add('is-right');
    if (revealed && picked === index && !correct) button.classList.add('is-wrong');
    if (picked === index) button.classList.add('is-picked');
    if (revealed) button.disabled = true;
    else button.addEventListener('click', () => onPick(index));
    wrap.append(button);
  });
  return wrap;
}

function feedbackNode(item, { correct, hintsUsed }) {
  const box = document.createElement('div');
  box.className = `feedback ${correct ? 'good' : 'bad'}`;
  const title = document.createElement('strong');
  title.textContent = correct ? (hintsUsed ? 'ถูกต้อง ใช้คำใบ้แล้ว' : 'ถูกต้อง') : 'ยังไม่ใช่ข้อนี้';
  box.append(title);
  const explain = explanationText(item.explanation);
  if (explain) {
    const div = document.createElement('div');
    div.className = 'md';
    div.innerHTML = renderLessonHtml(explain);
    box.append(div);
  }
  const steps = stepsOf(item.steps);
  if (steps.length) {
    const list = document.createElement('ol');
    for (const step of steps) {
      const li = document.createElement('li');
      li.textContent = step;
      list.append(li);
    }
    box.append(list);
  }
  if (item.trap) {
    const trap = document.createElement('p');
    trap.className = 'trap';
    trap.textContent = `ข้อควรระวัง: ${item.trap}`;
    box.append(trap);
  }
  return box;
}

async function itemsForPractice(lesson) {
  const set = practiceSetForLesson(catalog.sets, lesson.id);
  if (set?.item_ids?.length) {
    const loaded = await loadItemsByIds(set.item_ids);
    const ordered = orderItems(loaded, set.item_ids);
    if (ordered.length) return { items: ordered, title: set.title || 'แบบฝึก' };
  }
  const loose = await loadItemsForLesson(lesson.id);
  return { items: loose, title: 'แบบฝึก' };
}

async function renderSession(route, mode) {
  const bundle = mode === 'subject-quiz'
    ? { grade: findGrade(route.grade), subject: findSubject(route.subject), lesson: null, unit: null }
    : mode === 'boss'
      ? (() => {
        const grade = findGrade(route.grade);
        const subject = findSubject(route.subject);
        const unit = (catalog.units || []).find((item) => String(item.id) === String(route.unitId));
        return { grade, subject, lesson: null, unit };
      })()
      : lessonBundle(route);
  if (!bundle?.grade || !bundle?.subject || (mode !== 'subject-quiz' && mode !== 'boss' && !bundle.lesson) || (mode === 'boss' && !bundle.unit)) {
    return renderMissing();
  }
  let items = [];
  let title = 'แบบทดสอบ';
  let back = '#/';
  if (mode === 'play' || mode === 'quiz') {
    const loaded = await itemsForPractice(bundle.lesson);
    items = loaded.items;
    title = mode === 'play' ? loaded.title : `แบบทดสอบ · ${bundle.lesson.title}`;
    back = `#/g/${bundle.grade.code}/s/${bundle.subject.code}/l/${bundle.lesson.id}`;
  } else if (mode === 'boss') {
    const set = bossSetForUnit(catalog.sets, bundle.unit);
    items = set ? orderItems(await loadItemsByIds(set.item_ids), set.item_ids) : [];
    title = set?.title || 'ด่านท้ายบท';
    back = `#/g/${bundle.grade.code}/s/${bundle.subject.code}/u/${bundle.unit.id}`;
  } else {
    const exams = examSetsForSubject(catalog.sets, bundle.grade.code, bundle.subject.code);
    const wanted = new URLSearchParams(location.hash.split('?')[1] || '').get('set');
    const set = exams.find((item) => String(item.id) === String(wanted)) || exams[0];
    if (set) {
      items = orderItems(await loadItemsByIds(set.item_ids), set.item_ids);
      title = set.title || 'แบบทดสอบ';
    } else {
      items = await loadItemsForSubject(bundle.grade.code, bundle.subject.code);
      title = `แบบทดสอบ${subjectLabel(bundle.subject)}`;
    }
    back = `#/g/${bundle.grade.code}/s/${bundle.subject.code}`;
  }
  if (!items.length) {
    setTop({ title, back });
    panel(`<section class="stack">${emptyBlock('กำลังเพิ่มเนื้อหา', 'ยังไม่มีข้อในชุดนี้ เมื่อเพิ่มในคลังแล้ว เปิดหน้านี้ใหม่ได้เลย')}</section>`);
    return;
  }
  runSession({
    items: prepareItems(items),
    title,
    back,
    mode,
    lesson: bundle.lesson,
    examKey: `${mode}:${route.grade}:${route.subject}:${route.lessonId || route.unitId || 'all'}`,
  });
}

function runSession({ items, title, back, mode, lesson, examKey }) {
  const exam = mode !== 'play';
  let index = 0;
  let hintsUsed = 0;
  let hintLevel = 0;
  let picked = null;
  let revealed = false;
  const results = [];
  const picks = new Map();
  let done = false;

  setTop({ title, back });

  function paint() {
    view.replaceChildren();
    const section = document.createElement('section');
    section.className = 'stack play';
    if (done) {
      section.append(summaryNode());
      view.append(section);
      return;
    }
    const item = items[index];
    const head = document.createElement('div');
    head.className = 'play-head';
    const progressLabel = document.createElement('p');
    progressLabel.className = 'progress-label';
    progressLabel.textContent = `ข้อ ${index + 1} จาก ${items.length}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('span');
    fill.style.width = `${Math.round((index / items.length) * 100)}%`;
    bar.append(fill);
    head.append(progressLabel, bar);
    const chips = document.createElement('div');
    chips.className = 'chip-row';
    if (item.level && LEVEL_NAME[item.level]) {
      const chip = document.createElement('p');
      chip.className = 'chip';
      chip.textContent = LEVEL_NAME[item.level];
      chips.append(chip);
    }
    if (item.status === 'draft') {
      const badge = document.createElement('p');
      badge.className = 'chip draft';
      badge.textContent = 'ฉบับทดลอง';
      chips.append(badge);
    }
    if (chips.childElementCount) head.append(chips);
    section.append(head);
    const question = document.createElement('div');
    question.className = 'question md';
    question.innerHTML = renderLessonHtml(item.question || '');
    section.append(question);
    const chosen = exam ? picks.get(item.id) ?? null : picked;
    const show = exam ? false : revealed;
    section.append(choiceButtons(item, {
      picked: chosen,
      revealed: show,
      onPick(choice) {
        if (exam) {
          picks.set(item.id, choice);
          paint();
          return;
        }
        if (revealed) return;
        picked = choice;
        revealed = true;
        const correct = isChoiceCorrect(item.answer, choice);
        results.push({ id: item.id, correct, hints: hintLevel });
        paint();
      },
    }));
    if (!exam && !revealed && item.hint1) {
      const hintBtn = document.createElement('button');
      hintBtn.type = 'button';
      hintBtn.className = 'btn ghost';
      const more = hintLevel >= 1 && item.hint2;
      hintBtn.textContent = hintLevel === 0 ? 'ขอคำใบ้' : (more ? 'ขอคำใบ้เพิ่ม' : 'คำใบ้');
      hintBtn.disabled = hintLevel >= 2 || (hintLevel === 1 && !item.hint2);
      hintBtn.addEventListener('click', () => {
        if (hintLevel === 0) hintLevel = 1;
        else if (hintLevel === 1 && item.hint2) hintLevel = 2;
        hintsUsed += 1;
        paint();
      });
      section.append(hintBtn);
      if (hintLevel >= 1 && item.hint1) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = `คำใบ้: ${item.hint1}`;
        section.append(hint);
      }
      if (hintLevel >= 2 && item.hint2) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = `คำใบ้เพิ่ม: ${item.hint2}`;
        section.append(hint);
      }
    }
    if (!exam && revealed) {
      const last = results[results.length - 1];
      section.append(feedbackNode(item, { correct: last.correct, hintsUsed: last.hints }));
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn primary';
      next.textContent = index + 1 === items.length ? 'ดูคะแนน' : 'ข้อถัดไป';
      next.addEventListener('click', () => {
        if (index + 1 === items.length) {
          done = true;
          const correct = results.filter((row) => row.correct).length;
          const stars = starsFor(correct, items.length);
          if (lesson) progress.recordLesson(lesson.id, { stars, correct, total: items.length, hints: hintsUsed, mode: 'play' });
          paint();
          return;
        }
        index += 1;
        picked = null;
        revealed = false;
        hintLevel = 0;
        paint();
      });
      section.append(next);
    }
    if (exam) {
      const nav = document.createElement('div');
      nav.className = 'actions';
      if (index > 0) {
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'btn ghost';
        prev.textContent = 'ข้อก่อน';
        prev.addEventListener('click', () => { index -= 1; paint(); });
        nav.append(prev);
      }
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn primary';
      next.textContent = index + 1 === items.length ? 'ส่งคำตอบ' : 'ข้อถัดไป';
      next.disabled = picks.get(item.id) == null && index + 1 !== items.length ? false : false;
      next.addEventListener('click', () => {
        if (index + 1 === items.length) {
          const unanswered = items.filter((row) => !picks.has(row.id));
          if (unanswered.length) {
            index = items.indexOf(unanswered[0]);
            paint();
            const note = document.createElement('p');
            note.className = 'hint';
            note.textContent = 'ยังมีข้อที่ยังไม่ได้ตอบ เลือกคำตอบก่อนส่งนะ';
            view.querySelector('.play')?.prepend(note);
            return;
          }
          done = true;
          const correct = items.filter((row) => isChoiceCorrect(row.answer, picks.get(row.id))).length;
          const stars = starsFor(correct, items.length);
          if (lesson) progress.recordLesson(lesson.id, { stars, correct, total: items.length, hints: 0, mode: 'quiz' });
          else progress.recordExam(examKey, { stars, correct, total: items.length });
          paint();
          return;
        }
        index += 1;
        paint();
      });
      nav.append(next);
      section.append(nav);
    }
    view.append(section);
  }

  function summaryNode() {
    const correct = exam
      ? items.filter((row) => isChoiceCorrect(row.answer, picks.get(row.id))).length
      : results.filter((row) => row.correct).length;
    const stars = starsFor(correct, items.length);
    const wrap = document.createElement('div');
    wrap.className = 'summary card';
    const score = document.createElement('p');
    score.className = 'score';
    score.textContent = `${correct}/${items.length}`;
    const message = document.createElement('h2');
    message.textContent = encouragement(stars);
    const line = document.createElement('p');
    line.innerHTML = `${starsMarkup(stars)} · ${percent(correct, items.length)}% · ${passed(correct, items.length) ? 'ผ่าน' : 'ยังไม่ผ่าน'}`;
    wrap.append(score, message, line);
    if (!exam && hintsUsed) {
      const hintNote = document.createElement('p');
      hintNote.className = 'lede';
      hintNote.textContent = `ใช้คำใบ้ ${hintsUsed} ครั้ง`;
      wrap.append(hintNote);
    }
    const review = document.createElement('div');
    review.className = 'review';
    items.forEach((item, itemIndex) => {
      const choice = exam ? picks.get(item.id) : null;
      const ok = exam ? isChoiceCorrect(item.answer, choice) : results[itemIndex]?.correct;
      const block = document.createElement('article');
      const heading = document.createElement('h3');
      heading.textContent = `${ok ? 'ถูก' : 'ผิด'} · ข้อ ${itemIndex + 1}`;
      if (item.status === 'draft') {
        const badge = document.createElement('span');
        badge.className = 'chip draft';
        badge.textContent = 'ฉบับทดลอง';
        heading.append(badge);
      }
      const q = document.createElement('div');
      q.className = 'md';
      q.innerHTML = renderLessonHtml(item.question || '');
      block.append(heading, q, feedbackNode(item, { correct: ok, hintsUsed: exam ? 0 : (results[itemIndex]?.hints || 0) }));
      review.append(block);
    });
    const details = document.createElement('details');
    details.className = 'review-wrap';
    const summary = document.createElement('summary');
    summary.textContent = 'ดูเฉลยทีละข้อ';
    details.append(summary, review);
    wrap.append(details);
    const again = document.createElement('a');
    again.className = 'btn primary';
    again.href = back;
    again.textContent = 'กลับ';
    wrap.append(again);
    return wrap;
  }

  paint();
}

function renderMissing() {
  setTop({ title: 'ปิยปัญญา', back: '#/' });
  panel(`<section class="stack">${emptyBlock('ไม่พบบทนี้', 'ลิงก์อาจเก่า หรือเนื้อหายังไม่ถูกเพิ่ม')}</section>`);
}

function renderProgress() {
  setTop({ title: 'ความคืบหน้า', back: '#/' });
  const saved = progress.read().lessons;
  const ids = Object.keys(saved);
  if (!ids.length) {
    panel(`<section class="stack">${emptyBlock('ยังไม่มีคะแนนบนเครื่องนี้', 'เมื่อฝึกหรือทำแบบทดสอบ คะแนนจะอยู่บนอุปกรณ์นี้ จนกว่าจะมีระบบเข้าสู่ระบบ')}</section>`);
    return;
  }
  const rows = ids.map((id) => {
    const lesson = (catalog.lessons || []).find((item) => String(item.id) === id);
    const unit = lesson ? (catalog.units || []).find((item) => Number(item.id) === Number(lesson.unit_id)) : null;
    const grade = unit ? findGrade(unit.grade_code) : null;
    const subject = unit ? findSubject(unit.subject_code) : null;
    const rec = saved[id];
    const href = lesson && unit ? `#/g/${unit.grade_code}/s/${unit.subject_code}/l/${lesson.id}` : '#/me';
    const name = lesson ? lesson.title : `บทย่อย ${id}`;
    const where = [grade?.name_th, subject ? subjectLabel(subject) : ''].filter(Boolean).join(' · ');
    return `<a class="row-card" href="${href}"><span><strong>${escapeText(name)}</strong><small>${escapeText(where)} · ${rec.correct ?? 0}/${rec.total ?? 0}</small></span>${starsMarkup(rec.stars || 0)}</a>`;
  }).join('');
  panel(`<section class="stack"><h2>คะแนนบนเครื่องนี้</h2><p class="lede">ยังไม่ต้องเข้าสู่ระบบ ข้อมูลอยู่แค่ในเบราว์เซอร์นี้</p><div class="list">${rows}</div><button type="button" class="btn ghost" id="clear">ลบคะแนนบนเครื่องนี้</button></section>`);
  view.querySelector('#clear').addEventListener('click', () => {
    if (confirm('ลบคะแนนที่เก็บบนเครื่องนี้ทั้งหมด?')) {
      progress.clear();
      renderProgress();
    }
  });
}

async function render() {
  const token = ++renderToken;
  const route = parseRoute(location.hash);
  if (!catalog) showLoading();
  try {
    await ensureCatalog();
    if (token !== renderToken) return;
    if (route.name === 'home') return renderHome();
    if (route.name === 'progress') return renderProgress();
    if (route.name === 'subjects') return renderSubjects(route);
    if (route.name === 'units') return renderUnits(route);
    if (route.name === 'lessons') return renderLessons(route);
    if (route.name === 'lesson') return renderLesson(route);
    if (route.name === 'play') return await renderSession(route, 'play');
    if (route.name === 'quiz') return await renderSession(route, 'quiz');
    if (route.name === 'boss') return await renderSession(route, 'boss');
    if (route.name === 'subject-quiz') return await renderSession(route, 'subject-quiz');
    return renderHome();
  } catch (error) {
    if (token !== renderToken) return;
    showError(error);
  }
}

window.addEventListener('hashchange', () => { render(); });
render();
