import { SUPABASE_KEY, SUPABASE_URL } from './config.js';

const PAGE = 1000;

export class ApiError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'ApiError';
    this.detail = detail;
  }
}

async function request(schema, path, range) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
  };
  if (schema) headers['Accept-Profile'] = schema;
  if (range) headers.Range = range;
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  } catch (error) {
    throw new ApiError('เครือข่ายขัดข้อง', { cause: String(error) });
  }
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    throw new ApiError(body?.message || `HTTP ${response.status}`, {
      status: response.status,
      code: body?.code || null,
      path,
    });
  }
  return Array.isArray(body) ? body : [];
}

export async function fetchAll(schema, path) {
  const rows = [];
  let from = 0;
  for (;;) {
    const chunk = await request(schema, path, `${from}-${from + PAGE - 1}`);
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
    if (from > 20000) break;
  }
  return rows;
}

const ITEM_COLUMNS = 'id,lesson_id,grade_code,subject_code,topic,level,item_type,question,choices,answer,hint1,hint2,steps,trap,explanation,status';

export async function loadCatalog() {
  const [grades, subjects, units, lessons, assets, sets] = await Promise.all([
    fetchAll('kb_content', 'grades?select=code,name_th,sort,is_prep&order=sort.asc'),
    fetchAll('kb_content', 'subjects?select=code,name_th,is_core,color,icon,sort&order=sort.asc'),
    fetchAll('kb_content', 'units?select=id,code,grade_code,subject_code,unit_no,title,strand,status&status=neq.retired&order=unit_no.asc'),
    fetchAll('kb_content', 'lessons?select=id,code,unit_id,lesson_no,title,minutes,intro_md,status&status=neq.retired&order=lesson_no.asc'),
    fetchAll('kb_content', 'lesson_assets?select=id,lesson_id,kind,title,url,body,sort&order=sort.asc'),
    fetchAll('kb_assess', 'practice_sets?select=id,code,kind,grade_code,subject_code,lesson_id,title,item_ids,minutes,active&active=eq.true&order=code.asc'),
  ]);
  return { grades, subjects, units, lessons, assets, sets };
}

export async function loadItemsByIds(ids) {
  const unique = [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id)))];
  if (!unique.length) return [];
  const rows = [];
  const size = 80;
  for (let i = 0; i < unique.length; i += size) {
    const slice = unique.slice(i, i + size);
    const path = `items?select=${ITEM_COLUMNS}&id=in.(${slice.join(',')})`;
    rows.push(...await fetchAll('kb_assess', path));
  }
  return rows;
}

export async function loadItemsForLesson(lessonId) {
  const id = Number(lessonId);
  if (!Number.isInteger(id)) return [];
  return fetchAll('kb_assess', `items?select=${ITEM_COLUMNS}&lesson_id=eq.${id}&order=level.asc.nullslast,id.asc`);
}

export async function loadItemsForSubject(grade, subject) {
  if (!/^P[1-6]$/.test(grade) || !/^[A-Za-z0-9_-]{1,12}$/.test(subject)) return [];
  return fetchAll(
    'kb_assess',
    `items?select=${ITEM_COLUMNS}&grade_code=eq.${grade}&subject_code=eq.${subject}&order=level.asc.nullslast,id.asc`,
  );
}
