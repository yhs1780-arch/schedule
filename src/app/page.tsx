import Link from "next/link";

const features = [
  {
    color: "bg-indigo-50",
    iconBg: "bg-indigo-100",
    icon: "🗂",
    title: "권한 분리 공유",
    desc: "벨로컴퍼니 일정은 직원들과만, 알바 일정은 알바생들과만, 개인 일정은 나만. 캘린더별로 공유 범위를 완전히 분리합니다.",
  },
  {
    color: "bg-violet-50",
    iconBg: "bg-violet-100",
    icon: "💬",
    title: "댓글 & 협업",
    desc: "일정마다 팀원들과 댓글로 소통하고, 누가 언제 무엇을 수정했는지 활동 로그로 투명하게 추적합니다.",
  },
  {
    color: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    icon: "🔗",
    title: "Google Calendar 연동",
    desc: "Google 캘린더에서 일정을 가져오거나, SyncNest에서 만든 일정을 Google 캘린더에 자동 반영합니다.",
  },
  {
    color: "bg-sky-50",
    iconBg: "bg-sky-100",
    icon: "🔐",
    title: "소셜 간편 로그인",
    desc: "Google, Naver, Kakao 계정으로 간편하게 로그인. 각자의 개인 일정 공간이 자동으로 생성됩니다.",
  },
];

const steps = [
  { num: "01", title: "로그인", desc: "소셜 계정으로 1초 만에 가입. 개인 캘린더가 자동 생성됩니다." },
  { num: "02", title: "캘린더 구성", desc: "팀·알바·개인 등 목적에 맞게 캘린더를 만들고 멤버를 초대하세요." },
  { num: "03", title: "일정 공유", desc: "권한 설정으로 보여줄 사람만 선택해 일정을 안전하게 공유합니다." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-indigo-600 tracking-tight">SyncNest</span>
            <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-500 sm:inline">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 pt-36 pb-20 sm:px-6 lg:flex lg:items-center lg:gap-16">
        {/* Left: copy */}
        <div className="flex-1 text-center lg:text-left">
          <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 mb-4">
            TimeTree + Google Calendar의 장점만 담았습니다
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            팀 일정,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              모두 한 곳에서
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
            벨로컴퍼니, 알바, 개인 일정을 통합 관리하면서도
            <strong className="text-gray-700"> 캘린더별 권한</strong>으로 보여줄 사람만 선택해
            공유할 수 있습니다. Google Calendar 양방향 연동 지원.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/login"
              className="w-full rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:shadow-indigo-300 sm:w-auto"
            >
              무료로 시작하기 →
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all sm:w-auto"
            >
              데모 체험하기
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            신용카드 필요 없음 · 영구 무료 베타
          </p>
        </div>

        {/* Right: Calendar mockup */}
        <div className="mt-14 flex-1 lg:mt-0">
          <div className="relative mx-auto max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200 overflow-hidden">
            {/* Mockup header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs font-semibold text-gray-500">2026년 4월</span>
              <div className="flex gap-1">
                <div className="h-6 w-6 rounded bg-gray-100" />
                <div className="h-6 w-6 rounded bg-gray-100" />
              </div>
            </div>
            {/* Mockup calendar grid */}
            <div className="p-3">
              <div className="mb-2 grid grid-cols-7 text-center">
                {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                  <span
                    key={d}
                    className={`text-[10px] font-medium py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}
                  >
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
                    <div key={ci} className="border border-gray-50 p-1 min-h-[44px]">
                      {day && (
                        <>
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                              day === 26
                                ? "bg-indigo-600 text-white font-bold"
                                : ci === 0
                                ? "text-red-400"
                                : ci === 6
                                ? "text-blue-400"
                                : "text-gray-600"
                            }`}
                          >
                            {day}
                          </span>
                          {day === 22 && (
                            <div className="mt-0.5 truncate rounded px-1 text-[9px] bg-sky-100 text-sky-700">벨로 회의</div>
                          )}
                          {day === 23 && (
                            <div className="mt-0.5 truncate rounded px-1 text-[9px] bg-violet-100 text-violet-700">알바 오픈조</div>
                          )}
                          {day === 24 && (
                            <div className="mt-0.5 truncate rounded px-1 text-[9px] bg-emerald-100 text-emerald-700">개인 루틴</div>
                          )}
                          {day === 26 && (
                            <div className="mt-0.5 truncate rounded px-1 text-[9px] bg-indigo-100 text-indigo-700">팀 미팅</div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Mockup badges */}
            <div className="flex gap-1.5 border-t border-gray-100 px-3 py-2">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] text-sky-700">벨로컴퍼니</span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] text-violet-700">알바</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] text-emerald-700">개인</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">
              왜 SyncNest인가요?
            </h2>
            <p className="mt-3 text-gray-500">
              단순한 일정 앱을 넘어, 팀 협업까지 한 번에
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-2xl ${f.color} border border-white p-6 shadow-sm`}
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.iconBg} text-xl`}>
                  {f.icon}
                </div>
                <h3 className="mt-4 font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">3단계로 시작하세요</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <span className="text-5xl font-extrabold text-indigo-100">{s.num}</span>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white">
            지금 바로 시작해 보세요
          </h2>
          <p className="mt-4 text-indigo-200">
            팀원을 초대하고, 일정을 공유하고, 협업을 시작하세요.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-lg hover:bg-indigo-50 transition-all"
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <span className="text-lg font-extrabold text-indigo-600">SyncNest</span>
            <p className="text-xs text-gray-400">
              © 2026 SyncNest. 모든 권리 보유.
            </p>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>권한 기반 일정 공유</span>
              <span>·</span>
              <span>Google Calendar 연동</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
