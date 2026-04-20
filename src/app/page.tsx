import Link from "next/link";

/* ─── Data ───────────────────────────────────────────────────────── */

const painPoints = [
  {
    problem: "일정이 여러 앱에 흩어져 있어요",
    solution: "SyncNest 하나로 모든 일정을 한 화면에서 통합 관리",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    problem: "공유하면 안 볼 사람도 다 보여요",
    solution: "캘린더별 권한 분리로 보여줄 사람만 정확하게 선택",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: "text-violet-600 bg-violet-50",
  },
  {
    problem: "누가 일정을 바꿨는지 모르겠어요",
    solution: "모든 수정 내역을 활동 로그로 투명하게 기록·추적",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: "text-emerald-600 bg-emerald-50",
  },
];

const features = [
  {
    icon: "🎯",
    title: "목적별 캘린더 분리",
    desc: "업무, 알바, 개인 일정을 각각의 캘린더로 관리하세요. 각 캘린더마다 독립적인 멤버와 권한이 적용됩니다.",
    tag: "핵심 기능",
    tagColor: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: "🔒",
    title: "완전한 권한 제어",
    desc: "같은 사람이라도 캘린더마다 볼 수 있는 일정이 다릅니다. 오너·에디터·뷰어 권한으로 세밀하게 조정하세요.",
    tag: "보안",
    tagColor: "bg-violet-50 text-violet-600",
  },
  {
    icon: "💬",
    title: "일정 댓글 소통",
    desc: "일정마다 팀원들과 댓글로 빠르게 소통하세요. 미팅 전 사전 공유, 알바 교대 조율 모두 한 곳에서.",
    tag: "협업",
    tagColor: "bg-sky-50 text-sky-600",
  },
  {
    icon: "📋",
    title: "투명한 활동 로그",
    desc: "누가 언제 어떤 일정을 수정했는지 자동으로 기록됩니다. 나중에 '나는 안 바꿨는데' 같은 상황은 없습니다.",
    tag: "추적",
    tagColor: "bg-amber-50 text-amber-600",
  },
  {
    icon: "👤",
    title: "개인 일정 공간 제공",
    desc: "팀원들도 본인만의 개인 캘린더를 가집니다. 공유 일정과 개인 일정을 한 서비스에서 동시에 관리하세요.",
    tag: "개인화",
    tagColor: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: "🔗",
    title: "Google Calendar 연동",
    desc: "기존에 쓰던 Google 캘린더 일정을 그대로 가져오거나, SyncNest 일정을 Google에 자동 반영하세요.",
    tag: "연동",
    tagColor: "bg-rose-50 text-rose-600",
  },
];

const useCases = [
  {
    emoji: "🏢",
    who: "팀장 & 직원",
    title: "팀 업무 일정 공유",
    desc: "회의, 마감, 출장 일정을 팀원들과만 공유합니다. 외부에 노출되지 않고, 팀 내에서도 댓글로 바로 소통할 수 있습니다.",
    color: "bg-indigo-600",
    tags: ["업무 캘린더", "팀원 초대", "댓글 소통"],
  },
  {
    emoji: "⏰",
    who: "사장님 & 알바생",
    title: "알바 스케줄 관리",
    desc: "오픈조, 마감조, 교대 일정을 알바생들끼리만 볼 수 있도록 공유합니다. 근무 변경 내역도 모두 로그로 남습니다.",
    color: "bg-violet-600",
    tags: ["근무 캘린더", "스케줄 조율", "변경 로그"],
  },
  {
    emoji: "🙋",
    who: "개인 사용자",
    title: "개인 일정 통합 관리",
    desc: "업무·알바·개인 약속을 하나의 화면에서 전부 확인하세요. 각 일정이 어디에 속하는지 색으로 바로 구분됩니다.",
    color: "bg-emerald-600",
    tags: ["개인 캘린더", "통합 뷰", "색상 구분"],
  },
];

const steps = [
  {
    num: "01",
    title: "소셜 계정으로 가입",
    desc: "Google, 네이버, 카카오 계정으로 5초 만에 시작하세요. 개인 캘린더가 자동으로 생성됩니다.",
  },
  {
    num: "02",
    title: "목적별 캘린더 구성",
    desc: "업무, 알바, 친구 모임 등 원하는 이름으로 캘린더를 만들고 함께할 멤버를 초대합니다.",
  },
  {
    num: "03",
    title: "스마트하게 공유 & 소통",
    desc: "보여줄 사람만 선택하고 일정에 댓글을 달며 효율적으로 일정을 함께 관리하세요.",
  },
];

/* ─── Page ───────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-indigo-600">SyncNest</span>
            <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-500 sm:inline">
              FREE BETA
            </span>
          </div>
          <div className="hidden items-center gap-6 text-sm font-medium text-gray-500 sm:flex">
            <a href="#features" className="hover:text-gray-800 transition-colors">기능</a>
            <a href="#usecases" className="hover:text-gray-800 transition-colors">활용 사례</a>
            <a href="#howto" className="hover:text-gray-800 transition-colors">시작하기</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              로그인
            </Link>
            <Link href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors">
              무료 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-16">
        {/* background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-100/60 via-violet-50/40 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:flex lg:items-center lg:gap-16 lg:pt-28">
          {/* left: copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-semibold text-indigo-600">지금 무료로 사용해보세요</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-[3.5rem]">
              일정 관리의 새로운 기준,{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                보여줄 사람만 골라서
              </span>{" "}
              공유하세요
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-gray-500 lg:mx-0">
              팀 업무, 알바 근무, 개인 약속까지 — 모든 일정을 <strong className="text-gray-700">하나의 공간</strong>에서 관리하면서,
              각 그룹에게 <strong className="text-gray-700">필요한 정보만</strong> 정확하게 공유합니다.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/login"
                className="w-full rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all sm:w-auto">
                무료로 시작하기 →
              </Link>
              <a href="#features"
                className="w-full rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all sm:w-auto">
                기능 살펴보기
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-400">카드 등록 없음 · 무료 · 지금 바로 시작 가능</p>

            {/* mini stats */}
            <div className="mt-10 flex items-center justify-center gap-8 lg:justify-start">
              {[
                { num: "3초", label: "소셜 로그인 가입" },
                { num: "무제한", label: "캘린더 생성" },
                { num: "100%", label: "권한 분리 보장" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-extrabold text-indigo-600">{s.num}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* right: mockup */}
          <div className="mt-16 flex-1 lg:mt-0">
            <div className="relative mx-auto max-w-[420px]">
              {/* shadow decoration */}
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-xl" />

              <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                {/* window chrome */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400">SyncNest · 2026년 4월</span>
                  <div className="w-12" />
                </div>

                {/* calendar grid */}
                <div className="p-3">
                  <div className="mb-2 grid grid-cols-7 text-center">
                    {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                      <span key={d} className={`py-1 text-[10px] font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>
                        {d}
                      </span>
                    ))}
                  </div>
                  {[
                    [null, null, null, 1, 2, 3, 4],
                    [5, 6, 7, 8, 9, 10, 11],
                    [12, 13, 14, 15, 16, 17, 18],
                    [19, 20, 21, 22, 23, 24, 25],
                    [26, 27, 28, 29, 30, null, null],
                  ].map((row, ri) => (
                    <div key={ri} className="grid grid-cols-7">
                      {row.map((day, ci) => (
                        <div key={ci} className="min-h-[42px] border border-gray-50 p-0.5">
                          {day && (
                            <>
                              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${day === 26 ? "bg-indigo-600 text-white" : ci === 0 ? "text-red-400" : ci === 6 ? "text-blue-400" : "text-gray-600"}`}>
                                {day}
                              </span>
                              {day === 7  && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-sky-100 text-sky-700">팀 스탠드업</div>}
                              {day === 14 && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-violet-100 text-violet-700">알바 오픈조</div>}
                              {day === 16 && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-emerald-100 text-emerald-700">개인 운동</div>}
                              {day === 21 && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-sky-100 text-sky-700">주간 회의</div>}
                              {day === 23 && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-rose-100 text-rose-700">마감 데드라인</div>}
                              {day === 26 && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-indigo-100 text-indigo-700">월간 리뷰</div>}
                              {day === 28 && <div className="mt-0.5 truncate rounded px-1 text-[8px] bg-violet-100 text-violet-700">알바 교대</div>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* calendar legend */}
                <div className="flex gap-1.5 border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-medium text-sky-700">● 팀 업무</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-medium text-violet-700">● 알바</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-700">● 개인</span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-medium text-rose-700">● 마감</span>
                </div>
              </div>

              {/* floating badge 1 */}
              <div className="absolute -right-4 top-12 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                <p className="text-[10px] font-bold text-gray-700">🔒 권한 분리</p>
                <p className="text-[9px] text-gray-400">보여줄 사람만 선택</p>
              </div>

              {/* floating badge 2 */}
              <div className="absolute -left-4 bottom-16 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                <p className="text-[10px] font-bold text-gray-700">💬 댓글 소통</p>
                <p className="text-[9px] text-gray-400">일정마다 팀원과 대화</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN → SOLUTION ── */}
      <section className="border-y border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">Pain → Solution</p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              이런 불편함, 겪어본 적 있으신가요?
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {painPoints.map((p, i) => (
              <div key={i} className="rounded-2xl border border-white bg-white p-6 shadow-sm">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${p.color}`}>
                  {p.icon}
                </div>
                <p className="mt-4 font-bold text-gray-800">❌ &nbsp;{p.problem}</p>
                <div className="my-3 h-px bg-gray-100" />
                <p className="text-sm leading-relaxed text-gray-500">✅ &nbsp;{p.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">Features</p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              일정 관리에 필요한 모든 것
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              단순히 일정을 기록하는 것을 넘어, 팀과 함께 관리하고 소통하는 스마트한 협업 도구입니다.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-2xl">{f.icon}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${f.tagColor}`}>{f.tag}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section id="usecases" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">Use Cases</p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              이런 분들이 쓰고 있어요
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              일하는 방식은 달라도, SyncNest 하나로 모두가 편리하게 일정을 관리합니다.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {useCases.map(u => (
              <div key={u.title} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* card header */}
                <div className={`${u.color} px-6 py-5`}>
                  <span className="text-4xl">{u.emoji}</span>
                  <p className="mt-3 text-sm font-semibold text-white/80">{u.who}</p>
                  <h3 className="mt-0.5 text-lg font-extrabold text-white">{u.title}</h3>
                </div>
                {/* card body */}
                <div className="px-6 py-5">
                  <p className="text-sm leading-relaxed text-gray-500">{u.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {u.tags.map(t => (
                      <span key={t} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="howto" className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">How It Works</p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              딱 3단계면 충분합니다
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {/* connector */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-6 hidden h-px w-[calc(100%-80px)] border-t-2 border-dashed border-indigo-100 sm:block" />
                )}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-200">
                  {s.num}
                </div>
                <h3 className="mt-5 text-base font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHT BANNER ── */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-1 shadow-2xl shadow-indigo-200">
            <div className="rounded-[calc(1.5rem-4px)] bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-14 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">SyncNest</p>
              <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                "공유는 하되, 다 보여줄 필요는 없다"
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-indigo-200">
                각 그룹에게 필요한 일정만 정확하게 전달하세요. 정보 과부하 없이 모두가 자신에게 필요한 것만 봅니다.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/login"
                  className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-indigo-600 shadow-lg hover:bg-indigo-50 transition-all">
                  지금 무료로 시작하기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            일정 관리, 이제 스마트하게
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            팀원을 초대하고, 권한을 설정하고, 필요한 일정만 공유하세요.
            SyncNest는 지금 무료로 사용할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/login"
              className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              무료로 시작하기 →
            </Link>
            <Link href="/dashboard"
              className="rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-all">
              대시보드 바로가기
            </Link>
          </div>
          <p className="mt-5 text-xs text-gray-400">
            Google · 네이버 · 카카오 소셜 로그인 · 신용카드 불필요 · 영구 무료 베타
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div>
              <span className="text-xl font-extrabold tracking-tight text-indigo-600">SyncNest</span>
              <p className="mt-1 text-xs text-gray-400">스마트한 일정 공유 플랫폼</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
              <span>권한 기반 공유</span>
              <span>·</span>
              <span>댓글 & 활동 로그</span>
              <span>·</span>
              <span>Google Calendar 연동</span>
              <span>·</span>
              <span>소셜 로그인 지원</span>
            </div>
            <p className="text-xs text-gray-400">© 2026 SyncNest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
