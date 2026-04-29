import Link from "next/link";

/* ─── Data ───────────────────────────────────────────────────────── */

const painPoints = [
  {
    problem: "일정이 카톡·구글·수기에 흩어져 미칠 것 같아요",
    solution: "한 화면에 모아 월·주·목록으로 보세요. 찾는 시간이 곧 돈입니다",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    problem: "공유 링크 뿌리면 '누가 봤는지' 통제가 안 돼 불안해요",
    solution: "멀티 공유 링크 + 방문자 이름·승인·차단. 오너만 클릭 몇 번이면 끝",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: "text-violet-600 bg-violet-50",
  },
  {
    problem: "약속 장소 찾느라 지도 앱 왔다 갔다… 짜증 나요",
    solution: "일정에서 바로 네이버·티맵 길찾기. 역·장소 검색까지 한 번에",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    solution: "활동 로그에 수정·댓글이 남습니다. '내가 안 건드렸어' 종료",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: "text-rose-600 bg-rose-50",
  },
];

const features = [
  {
    icon: "🎯",
    title: "목적별 캘린더 분리",
    desc: "회사·알바·개인·모임을 캘린더 단위로 쪼갭니다. 섞이면 생기는 사고, 여기선 출발부터 차단합니다.",
    tag: "핵심",
    tagColor: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: "🔗",
    title: "공유 링크 · 멀티 공유 · 게스트 승인",
    desc: "초대 없이도 링크로 공유 가능. 누가 들어왔는지 이름·승인·차단으로 관리하세요. 외부 일정 공유의 종결형입니다.",
    tag: "신규",
    tagColor: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    icon: "🔒",
    title: "오너·에디터·뷰어 권한",
    desc: "같은 사람이어도 캘린더마다 보이는 일정이 달라요. '이건 못 보게'를 제품으로 고정했습니다.",
    tag: "보안",
    tagColor: "bg-violet-50 text-violet-600",
  },
  {
    icon: "💬",
    title: "일정 단위 댓글",
    desc: "미팅 전 준비물, 알바 대타, 모임 장소 조율—쓰레드 말고 일정 아래에서 바로 끝내세요.",
    tag: "협업",
    tagColor: "bg-sky-50 text-sky-600",
  },
  {
    icon: "📋",
    title: "활동 로그",
    desc: "수정 주체와 시점이 남습니다. 책임 공방은 줄이고, 실행은 늘리세요.",
    tag: "추적",
    tagColor: "bg-amber-50 text-amber-600",
  },
  {
    icon: "🗺️",
    title: "길찾기 · 장소·역 검색",
    desc: "일정 상단에서 네이버·티맵 길찾기. 역 이름·매장 검색으로 주소까지 빠르게 박습니다.",
    tag: "이동",
    tagColor: "bg-teal-50 text-teal-600",
  },
  {
    icon: "📅",
    title: "월간 · 주간 · 목록 뷰",
    desc: "한눈에 보는 월 캘린더부터 주 단위·리스트까지. 상황에 맞게 뷰를 갈아 끼우세요.",
    tag: "뷰",
    tagColor: "bg-orange-50 text-orange-600",
  },
  {
    icon: "📱",
    title: "모바일 퍼스트 UX",
    desc: "뒤로가기·오버레이·검색 모달까지 손가락 사용 흐름을 먼저 설계했습니다. 지하철에서도 덜 짜증 나게.",
    tag: "모바일",
    tagColor: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: "👤",
    title: "개인 일정 공간",
    desc: "팀원도 각자 개인 캘린더를 가집니다. 공유와 프라이버시를 한 서비스에서 동시에.",
    tag: "개인화",
    tagColor: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: "🔄",
    title: "Google Calendar 연동",
    desc: "가져오기·내보내기로 기존 습관을 끊지 마세요. 옮겨 타는 데 드는 시간을 아낍니다.",
    tag: "연동",
    tagColor: "bg-rose-50 text-rose-600",
  },
];

const useCases = [
  {
    emoji: "🏢",
    who: "팀장 · PM · 실무 리드",
    title: "팀 일정은 팀 안에서만",
    desc: "외부에 공유하면 안 되는 마감·회의는 권한으로 잠그고, 필요한 사람에게만 링크를 던지세요. 승인 없이 들어오면 끝나는 그런 팀이 아니라면 딱입니다.",
    color: "bg-indigo-600",
    tags: ["권한 분리", "멤버 초대", "댓글·로그"],
  },
  {
    emoji: "⏰",
    who: "사장님 · 매니저 · 알바 크루",
    title: "스케줄 대란, 카톡 스크롤 지옥 종료",
    desc: "근무표를 한 캘린더에 모으고 링크로만 공유하세요. 바뀐 시각은 로그로 남습니다. '나 못 봤어요' 재료를 줄여 드립니다.",
    color: "bg-violet-600",
    tags: ["알바 캘린더", "링크 공유", "변경 추적"],
  },
  {
    emoji: "🙋",
    who: "프리랜서 · 대학생 · 바쁜 일인",
    title: "일·알바·약속 한 화면",
    desc: "여러 모드로 살아도 앱은 하나면 됩니다. 월/주/리스트로 보고, 약속은 길찾기까지 한 번에 연결하세요.",
    color: "bg-emerald-600",
    tags: ["통합 뷰", "길찾기", "멀티 캘린더"],
  },
];

const steps = [
  {
    num: "01",
    title: "소셜로 5초 가입",
    desc: "Google · 네이버 · 카카오. 개인 캘린더가 바로 생깁니다. 설문·카드 없이 시작하세요.",
  },
  {
    num: "02",
    title: "캘린더 나누고 사람 붙이기",
    desc: "업무/알바/모임 단위로 캘린더를 만들고 멤버 또는 공유 링크를 나눕니다. 보여줄 범위는 당신이 정합니다.",
  },
  {
    num: "03",
    title: "일정·댓글·길찾기로 실행",
    desc: "월·주·목록으로 보고, 댓글로 합의하고, 약속은 지도 앱 탭 전환 없이 이동까지. 그게 끝입니다.",
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
            <a href="#why" className="hover:text-gray-800 transition-colors">왜 쓰나요</a>
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-1.5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-800">회사 · 알바 · 모임 — 일정 지옥 탈출 모드</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.25rem] break-keep">
              &quot;캡처 또 보냈어요?&quot;{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                그만. 링크 하나로 끝나는 일정 공유
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-gray-600 lg:mx-0">
              초대장·스프레드시트·단톡에 흩어진 일정을 <strong className="text-gray-900">한곳에 몰아넣고</strong>,{" "}
              <strong className="text-gray-900">보여줄 사람만</strong> 남깁니다. 게스트 승인·멀티 공유·길찾기까지 —{" "}
              <span className="text-indigo-600 font-semibold">말로 설득하지 말고 제품으로 증명</span>하세요.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/login"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-300 transition-all sm:w-auto">
                0원으로 바로 시작 →
              </Link>
              <a href="#features"
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-center text-base font-bold text-gray-800 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all sm:w-auto">
                지금 쓸 수 있는 기능 보기
              </a>
            </div>

            <p className="mt-4 text-xs font-medium text-gray-500">신용카드 없음 · 소셜 로그인만 · 베타 전 기간 무료</p>

            {/* mini stats */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
              {[
                { num: "3초", label: "소셜 가입" },
                { num: "링크", label: "멀티 공유·승인" },
                { num: "뷰 3종", label: "월·주·목록" },
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
                  <span className="text-[11px] font-semibold text-gray-500">SyncNest · 실시간 협업 캘린더</span>
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
              <div className="absolute -right-4 top-12 rounded-xl border border-indigo-100 bg-white px-3 py-2 shadow-lg">
                <p className="text-[10px] font-bold text-indigo-700">🔗 링크 공유</p>
                <p className="text-[9px] text-gray-500">게스트 승인·차단</p>
              </div>

              {/* floating badge 2 */}
              <div className="absolute -left-4 bottom-16 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-lg">
                <p className="text-[10px] font-bold text-emerald-700">🗺️ 길찾기</p>
                <p className="text-[9px] text-gray-500">네이버·티맵</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK HOOKS ── */}
      <section className="border-b border-gray-100 bg-gradient-to-r from-gray-50 via-indigo-50/30 to-violet-50/30 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-center sm:gap-x-8">
          {[
            "📎 링크만 던져도 초대 끝",
            "✋ 게스트 승인·이름 관리",
            "🚶 네이버·티맵 길찾기",
            "📆 월·주·목록 한 앱에서",
          ].map(line => (
            <span key={line} className="text-xs font-bold text-gray-700 sm:text-sm">
              {line}
            </span>
          ))}
        </div>
      </section>

      {/* ── PAIN → SOLUTION ── */}
      <section id="why" className="border-y border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">여기 한 번만 읽어보세요</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-snug text-gray-900 sm:text-3xl break-keep">
              아래 중 하나라도 해당되면, 이미 일정 때문에 <span className="text-indigo-600">매일 대가 치르는 중</span>입니다
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              단톡·스샷·구글캘린더를 오가며 낭비한 10분 × 한 달이면, 새 제품을 배우기엔 충분한 시간이에요. 먼저 체감부터 바꿉니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="text-sm font-semibold uppercase tracking-widest text-fuchsia-600">기능은 많지만 핵심은 하나</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl break-keep">
              공유는 쉽게, 통제는 확실히 — <span className="text-indigo-600">실사용</span>을 기준으로 깎아 냈습니다
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              멀티 공유 링크·게스트 승인·길찾기·장소 검색·모바일 입력까지. &quot;PPT용 기능&quot; 말고, <strong className="text-gray-900">현장에서 매일 닿는 기능</strong>만 모았습니다.
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
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">누가 써도 설명이 짧아집니다</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl break-keep">
              회사든 알바든 1인이든 — <span className="text-violet-600">통은 같고, 권한만 다릅니다</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              규모를 가르지 않습니다. 일정을 같이 잡는 모든 사람이 <strong className="text-gray-900">덜 싸우고 더 빨리 실행</strong>하는 도구를 지향합니다.
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
              가입하고 나면 할 일은 이것뿐
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-gray-600 sm:text-base">
              복잡한 세팅은 빼고, 바로 초대·공유·이동까지 연결했습니다.
            </p>
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
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl break-keep">
                일정은 공유할수록 편해져야지, <span className="text-amber-200">불안해지면 안 됩니다</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-indigo-100 sm:text-lg">
                링크 하나로 열리되, 문지기는 당신. 뷰는 바꿔 맞추고, 갈 길은 지도로 바로 연결하세요. 지금 가입비 0원 — 늦게 올수록 계속 캡처만 보냅니다.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/login"
                  className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-indigo-600 shadow-lg hover:bg-indigo-50 transition-all">
                  지금 0원으로 시작하기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl break-keep">
            내일 또 &quot;일정 몰라서&quot; 미안해하지 말고, <span className="text-indigo-600">오늘 링크 하나로 끝내요</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-600">
            팀이 커도, 알바가 바뀌어도, 나 혼자여도. 캘린더는 나누고 실행은 한곳에서. 지금은 베타로 무료 — 먼저 써본 사람이 다음 스프린트 레이아웃을 정합니다.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/login"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 transition-all">
              3초 만에 가입하고 바로 공유 →
            </Link>
            <Link href="/dashboard"
              className="rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-bold text-gray-800 hover:border-indigo-200 transition-all">
              이미 계정 있음 → 대시보드
            </Link>
          </div>
          <p className="mt-5 text-xs font-medium text-gray-500">
            Google · 네이버 · 카카오 로그인 · 카드/결제 없음 · 베타 기간 무료 (정책은 서비스 내 공지 따름)
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
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-400 sm:justify-end">
              <span>멀티 공유·게스트 승인</span>
              <span>·</span>
              <span>권한형 캘린더</span>
              <span>·</span>
              <span>댓글·활동 로그</span>
              <span>·</span>
              <span>길찾기·장소 검색</span>
              <span>·</span>
              <span>Google 연동</span>
            </div>
            <p className="text-xs text-gray-400">© 2026 SyncNest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
