import Link from "next/link";

/* ─── Icons (inline SVG, no emoji clutter) ─────────────────────── */

function IconCalendar(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
    </svg>
  );
}
function IconLink(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}
function IconShield(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function IconChat(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.134 2.706.057 3.422-.5l3.289-2.758a.75.75 0 01.472-.138h1.884a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25h-13.5A2.25 2.25 0 002.25 6v8.25a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
function IconList(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
function IconMap(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}
function IconPhone(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}
function IconArrows(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

const valueProps = [
  {
    title: "흩어진 일정",
    body: "채팅·캡처·별도 앱에 나뉜 약속을 한 화면의 월·주·목록 뷰로 정리합니다.",
    Icon: IconCalendar,
  },
  {
    title: "공유 통제",
    body: "캘린더 단위로 권한을 나누고, 링크·게스트 승인으로 열람 범위를 조정합니다.",
    Icon: IconShield,
  },
  {
    title: "변경 기록",
    body: "수정과 댓글에 기록이 남아, 협업 중 생기는 오해를 줄일 수 있습니다.",
    Icon: IconList,
  },
  {
    title: "이동까지",
    body: "일정과 연결된 장소에서 외부 지도로 길찾기를 열 수 있습니다.",
    Icon: IconMap,
  },
];

const features = [
  {
    title: "목적별 캘린더",
    desc: "업무·알바·개인 등 용도별로 캘린더를 나누고, 멤버와 권한을 각각 설정합니다.",
    tag: "구조",
    Icon: IconCalendar,
  },
  {
    title: "공유 링크·멀티 공유",
    desc: "회원 초대 없이 링크로 공유하거나, 여러 캘린더를 묶은 동시 공유를 만들 수 있습니다.",
    tag: "공유",
    Icon: IconLink,
  },
  {
    title: "역할·승인",
    desc: "오너·에디터·뷰어 역할과, 필요 시 게스트 승인 흐름을 사용합니다.",
    tag: "보안",
    Icon: IconShield,
  },
  {
    title: "일정·댓글·반응",
    desc: "일정 단위로 대화를 남기고, 협업 맥락을 한곳에 유지합니다.",
    tag: "협업",
    Icon: IconChat,
  },
  {
    title: "활동 기록",
    desc: "무엇이 바뀌었는지 추적해 팀·알바 스케줄 운영을 투명하게 합니다.",
    tag: "기록",
    Icon: IconList,
  },
  {
    title: "뷰 전환",
    desc: "월간·주간·목록 보기를 전환해 보고 있는 단위에 맞게 씁니다.",
    tag: "표시",
    Icon: IconCalendar,
  },
  {
    title: "모바일 사용성",
    desc: "작은 화면에서도 검색·뒤로 가기·패널 흐름을 우선해 두었습니다.",
    tag: "UX",
    Icon: IconPhone,
  },
  {
    title: "Google Calendar",
    desc: "가져오기·내보내기로 기존 캘린더와 병행할 수 있습니다.",
    tag: "연동",
    Icon: IconArrows,
  },
];

const useCases = [
  {
    title: "팀·프로젝트",
    subtitle: "내부 일정과 대외 일정을 같은 사람에게도 다르게 보이게 나눕니다.",
    bullets: ["캘린더·역할 분리", "댓글·로그", "링크 공유"],
  },
  {
    title: "교대·알바",
    subtitle: "근무표를 한곳에 두고, 링크로 필요한 구성원만 접근하게 합니다.",
    bullets: ["스케줄 조정", "변경 확인", "모바일 확인"],
  },
  {
    title: "개인·복수 역할",
    subtitle: "일·학습·개인 약속을 분리해 두고 한 계정에서 같이 봅니다.",
    bullets: ["통합 화면", "색·캘린더 구분", "길찾기"],
  },
];

const steps = [
  { step: "1", title: "계정 연결", desc: "Google·네이버·카카오 중 편한 방법으로 가입합니다." },
  { step: "2", title: "캘린더 구성", desc: "용도에 맞게 캘린더를 만들고 멤버나 링크를 배치합니다." },
  { step: "3", title: "공유·운영", desc: "일정을 쌓고, 댓글·기록·지도 링크로 실행까지 이어갑니다." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 antialiased">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">SyncNest</span>
            <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:inline">
              Beta
            </span>
          </div>
          <div className="hidden items-center gap-8 text-[13px] font-medium text-slate-600 sm:flex">
            <a href="#values" className="transition hover:text-slate-900">
              소개
            </a>
            <a href="#features" className="transition hover:text-slate-900">
              기능
            </a>
            <a href="#usecases" className="transition hover:text-slate-900">
              활용
            </a>
            <a href="#start" className="transition hover:text-slate-900">
              시작
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-slate-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative border-b border-slate-200/80 bg-white pt-14">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-100/90 to-transparent blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="text-[13px] font-medium text-slate-500">일정 협업 · 권한 분리</p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.2] tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.15]">
              함께 보는 일정,
              <br />
              <span className="text-slate-600">범위는 캘린더마다</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-600">
              SyncNest는 여러 캘린더에 일정을 나누고, 멤버·링크·역할로 공유 범위를 정합니다. 댓글과 기록, Google Calendar 연동,
              모바일에서의 사용 흐름을 기본에 두었습니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-3 text-[14px] font-medium text-white transition hover:bg-slate-800"
              >
                무료로 시작
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-[14px] font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                기능 더 보기
              </a>
            </div>
            <p className="mt-4 text-[12px] text-slate-500">베타 기간 무료 · 카드 없이 소셜 로그인</p>
          </div>
          <div className="relative mx-auto w-full max-w-[400px] lg:mx-0 lg:max-w-none">
            <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/50">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="h-2 w-2 rounded-full bg-slate-200" />
                  <span className="h-2 w-2 rounded-full bg-slate-200" />
                </div>
                <span className="flex-1 text-center text-[10px] font-medium text-slate-400">캘린더 미리보기</span>
              </div>
              <div className="p-3">
                <div className="mb-2 grid grid-cols-7 text-center text-[9px] font-medium text-slate-400">
                  {["일", "월", "화", "수", "목", "금", "토"].map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                {[
                  [null, null, null, 1, 2, 3, 4],
                  [5, 6, 7, 8, 9, 10, 11],
                  [12, 13, 14, 15, 16, 17, 18],
                  [19, 20, 21, 22, 23, 24, 25],
                  [26, 27, 28, 29, 30, null, null],
                ].map((row, ri) => (
                  <div key={ri} className="grid grid-cols-7 gap-px">
                    {row.map((day, ci) => (
                      <div key={ci} className="min-h-[38px] rounded-sm bg-slate-50/50 p-0.5">
                        {day ? (
                          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded text-[10px] text-slate-700">
                            {day}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/80 bg-white py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 text-center text-[12px] text-slate-600 sm:justify-start sm:px-6">
          <span>링크 기반 공유</span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span>게스트·승인 옵션</span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span>월·주·목록</span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span>지도 길찾기</span>
        </div>
      </section>

      <section id="values" className="border-b border-slate-200/80 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">왜 캘린더를 나누는지</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            같은 사람이라도 보여줄 일정이 달라질 때가 있습니다. SyncNest는 그 경계를 제품 안에서 정리합니다.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map(v => (
              <div key={v.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <v.Icon className="h-5 w-5 text-slate-700" />
                <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">기능</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            자주 쓰는 흐름 위주로 정리했습니다. 세부는 대시보드에서 직접 확인해 보셔도 됩니다.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map(f => (
              <div
                key={f.title}
                className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <f.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-slate-900">{f.title}</h3>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{f.tag}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="usecases" className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">활용 예</h2>
          <p className="mt-2 text-[15px] text-slate-600">규모보다는 역할에 맞춘 예시입니다.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {useCases.map(u => (
              <div key={u.title} className="flex flex-col rounded-lg border border-slate-200 bg-[#fafafa] p-5">
                <h3 className="text-[14px] font-semibold text-slate-900">{u.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{u.subtitle}</p>
                <ul className="mt-4 space-y-1.5 border-t border-slate-200 pt-4">
                  {u.bullets.map(b => (
                    <li key={b} className="text-[12px] text-slate-500">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-semibold text-slate-900 sm:text-2xl">시작 순서</h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-8 sm:grid-cols-3">
            {steps.map(s => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-[13px] font-semibold text-slate-800">
                  {s.step}
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-slate-900 px-6 py-12 text-center sm:px-12 sm:py-14">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">지금 바로 써 보기</h2>
          <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-slate-400">
            베타 기간 동안 무료로 열려 있습니다. 정책 변경 시 서비스 내에서 안내드립니다.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-md bg-white px-5 py-2.5 text-[14px] font-medium text-slate-900 transition hover:bg-slate-100"
          >
            계속하기
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 text-[12px] text-slate-500 sm:flex-row sm:px-6">
          <div>
            <span className="font-semibold text-slate-800">SyncNest</span>
            <p className="mt-1">일정 공유·권한 관리</p>
          </div>
          <p>© {new Date().getFullYear()} SyncNest</p>
        </div>
      </footer>
    </div>
  );
}
