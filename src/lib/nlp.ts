/**
 * SyncNest 한국어 자연어 일정 파서
 * "내일 오후 3시 팀 회의" → { title, date, time, allDay }
 * 외부 API 없이 브라우저에서 동작합니다.
 */

export type ParsedEvent = {
  title: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:MM (없으면 "")
  endDate: string;   // YYYY-MM-DD (없으면 "")
  endTime: string;   // HH:MM (없으면 "")
  allDay: boolean;
  location: string;
  confidence: "high" | "medium" | "low";
};

const DAY_MAP: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
  일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6,
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function nextWeekday(from: Date, weekday: number) {
  const d = new Date(from);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function thisWeekday(from: Date, weekday: number) {
  const d = new Date(from);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * 텍스트에서 날짜 추출 → { date: Date | null, remaining: string }
 */
function extractDate(text: string, now: Date): { date: Date | null; remaining: string } {
  const t = text;

  // 오늘
  if (/오늘/.test(t)) return { date: new Date(now), remaining: t.replace(/오늘/, "").trim() };
  // 내일
  if (/내일/.test(t)) return { date: addDays(now, 1), remaining: t.replace(/내일/, "").trim() };
  // 모레
  if (/모레/.test(t)) return { date: addDays(now, 2), remaining: t.replace(/모레/, "").trim() };
  // 글피
  if (/글피/.test(t)) return { date: addDays(now, 3), remaining: t.replace(/글피/, "").trim() };

  // N일 후
  const nDaysLater = t.match(/(\d+)일\s*후/);
  if (nDaysLater) {
    return { date: addDays(now, parseInt(nDaysLater[1])), remaining: t.replace(nDaysLater[0], "").trim() };
  }

  // N주 후
  const nWeeksLater = t.match(/(\d+)주\s*후/);
  if (nWeeksLater) {
    return { date: addDays(now, parseInt(nWeeksLater[1]) * 7), remaining: t.replace(nWeeksLater[0], "").trim() };
  }

  // 이번주 X요일
  const thisWeekMatch = t.match(/이번\s*주?\s*([월화수목금토일])요?일?/);
  if (thisWeekMatch) {
    const wd = DAY_MAP[thisWeekMatch[1] + "요일"] ?? DAY_MAP[thisWeekMatch[1]];
    return { date: thisWeekday(now, wd), remaining: t.replace(thisWeekMatch[0], "").trim() };
  }

  // 다음주 X요일 / 다음 X요일
  const nextWeekMatch = t.match(/다음\s*주?\s*([월화수목금토일])요?일?/);
  if (nextWeekMatch) {
    const wd = DAY_MAP[nextWeekMatch[1] + "요일"] ?? DAY_MAP[nextWeekMatch[1]];
    return { date: nextWeekday(now, wd), remaining: t.replace(nextWeekMatch[0], "").trim() };
  }

  // 이번 주말 → 이번 토요일
  if (/이번\s*주말/.test(t)) return { date: thisWeekday(now, 6), remaining: t.replace(/이번\s*주말/, "").trim() };
  // 주말 → 이번 토요일
  if (/주말/.test(t)) return { date: thisWeekday(now, 6) , remaining: t.replace(/주말/, "").trim() };

  // X요일 단독 (다음 X요일로 해석)
  const weekdayAlone = t.match(/([월화수목금토일])요일/);
  if (weekdayAlone) {
    const wd = DAY_MAP[weekdayAlone[0]];
    return { date: nextWeekday(now, wd), remaining: t.replace(weekdayAlone[0], "").trim() };
  }

  // N월 N일 (올해 기준)
  const monthDay = t.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (monthDay) {
    const mo = parseInt(monthDay[1]), da = parseInt(monthDay[2]);
    const d = new Date(now.getFullYear(), mo - 1, da);
    if (d < now) d.setFullYear(d.getFullYear() + 1); // 이미 지났으면 내년
    return { date: d, remaining: t.replace(monthDay[0], "").trim() };
  }

  // N/N (월/일)
  const slashDate = t.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashDate) {
    const mo = parseInt(slashDate[1]), da = parseInt(slashDate[2]);
    const d = new Date(now.getFullYear(), mo - 1, da);
    if (d < now) d.setFullYear(d.getFullYear() + 1);
    return { date: d, remaining: t.replace(slashDate[0], "").trim() };
  }

  return { date: null, remaining: t };
}

/**
 * 텍스트에서 시간 추출 → { hour: number, minute: number, remaining: string } | null
 */
function extractTime(text: string): { hour: number; minute: number; remaining: string } | null {
  const t = text;

  // 정오
  if (/정오/.test(t)) return { hour: 12, minute: 0, remaining: t.replace(/정오/, "").trim() };
  // 자정
  if (/자정/.test(t)) return { hour: 0, minute: 0, remaining: t.replace(/자정/, "").trim() };

  // 오전/오후/새벽/저녁/밤 + N시 (N분)
  const ampmMatch = t.match(/(오전|오후|새벽|아침|저녁|밤)\s*(\d{1,2})시\s*(\d{1,2})?분?/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[2]);
    const m = ampmMatch[3] ? parseInt(ampmMatch[3]) : 0;
    const prefix = ampmMatch[1];
    if ((prefix === "오후" || prefix === "저녁" || prefix === "밤") && h < 12) h += 12;
    if (prefix === "새벽" && h >= 12) h -= 12;
    return { hour: h, minute: m, remaining: t.replace(ampmMatch[0], "").trim() };
  }

  // N시 N분 (단독)
  const timeMatch = t.match(/(\d{1,2})시\s*(\d{1,2})분/);
  if (timeMatch) {
    return { hour: parseInt(timeMatch[1]), minute: parseInt(timeMatch[2]), remaining: t.replace(timeMatch[0], "").trim() };
  }

  // N시 (단독 — 10시 이하면 오전으로, 11-23은 그대로)
  const hourOnly = t.match(/(\d{1,2})시/);
  if (hourOnly) {
    return { hour: parseInt(hourOnly[1]), minute: 0, remaining: t.replace(hourOnly[0], "").trim() };
  }

  // HH:MM 형식
  const hmMatch = t.match(/(\d{1,2}):(\d{2})/);
  if (hmMatch) {
    return { hour: parseInt(hmMatch[1]), minute: parseInt(hmMatch[2]), remaining: t.replace(hmMatch[0], "").trim() };
  }

  return null;
}

/** 장소 추출: "에서", "@ " 또는 "장소:" 접두 */
function extractLocation(text: string): { location: string; remaining: string } {
  // "@장소" 패턴
  const atMatch = text.match(/@([^\s,]+)/);
  if (atMatch) return { location: atMatch[1], remaining: text.replace(atMatch[0], "").trim() };

  // "장소: X" 또는 "위치: X"
  const labelMatch = text.match(/(?:장소|위치)[:\s]+([^\s]+)/);
  if (labelMatch) return { location: labelMatch[1], remaining: text.replace(labelMatch[0], "").trim() };

  return { location: "", remaining: text };
}

/** 불필요한 접속사/조사 정리 */
function cleanTitle(t: string) {
  return t
    .replace(/^[에서에는에게서에서은는이가을를도로부터까지에서의와과]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 메인 파서
 * @param input "내일 오후 3시 팀 회의 @카페"
 */
export function parseNL(input: string): ParsedEvent {
  const now = new Date();
  let text = input.trim();

  // 장소 추출
  const { location, remaining: afterLoc } = extractLocation(text);
  text = afterLoc;

  // 날짜 추출
  const { date, remaining: afterDate } = extractDate(text, now);
  text = afterDate;

  // 시간 추출
  const timeResult = extractTime(text);
  let timeStr = "";
  if (timeResult) {
    text = timeResult.remaining;
    timeStr = `${pad(timeResult.hour)}:${pad(timeResult.minute)}`;
  }

  // ~ N시간 / N시간 동안 → end time
  let endTimeStr = "";
  const durationMatch = text.match(/(\d+)\s*시간/);
  if (durationMatch && timeResult) {
    const endH = timeResult.hour + parseInt(durationMatch[1]);
    endTimeStr = `${pad(endH < 24 ? endH : 23)}:${pad(timeResult.minute)}`;
    text = text.replace(durationMatch[0], "").trim();
  }

  // 제목 정리
  const title = cleanTitle(text) || input.trim();

  const dateStr = date ? toDateStr(date) : toDateStr(now);
  const allDay = !timeResult;

  return {
    title,
    date: dateStr,
    time: timeStr,
    endDate: endTimeStr ? dateStr : "",
    endTime: endTimeStr,
    allDay,
    location,
    confidence: date && timeResult ? "high" : date || timeResult ? "medium" : "low",
  };
}

/**
 * 파스 결과를 사람이 읽을 수 있는 요약으로 변환
 */
export function summarizeParsed(p: ParsedEvent): string {
  const parts: string[] = [];
  parts.push(`📅 ${p.date.replace(/-/g, ".")}`);
  if (p.time) parts.push(`🕐 ${p.time}${p.endTime ? ` ~ ${p.endTime}` : ""}`);
  else parts.push("하루 종일");
  if (p.location) parts.push(`📍 ${p.location}`);
  return parts.join("  |  ");
}
