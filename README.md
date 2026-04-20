## SyncNest

일정 공유 + 권한 제어 + 활동 로그 + Google Calendar 연동 + 소셜 로그인(구글/네이버/카카오) MVP입니다.

## 실행 방법

```bash
npm install
npx prisma db push --force-reset
npm run db:seed
npm run dev
```

## 환경 변수

`.env.example`를 참고해 `.env`를 구성하세요.

- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `AUTH_NAVER_ID`, `AUTH_NAVER_SECRET`
- `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`
- `AUTH_ENABLE_DEMO_LOGIN` (운영 시 `false` 권장)
- `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` (운영 시 `false` 권장)

## 운영 배포 체크리스트 (필수)

1. Vercel 프로젝트 환경 변수에 `.env.example` 항목 모두 등록
2. 데모 로그인 비활성화
   - `AUTH_ENABLE_DEMO_LOGIN=false`
   - `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`
3. OAuth Redirect URI를 배포 도메인 기준으로 등록
4. `/api/health` 응답으로 환경변수/상태 점검

## OAuth Redirect URI

각 플랫폼 콘솔에 아래 Redirect URI 등록:

- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/naver`
- `http://localhost:3000/api/auth/callback/kakao`

배포 환경에서는 도메인으로 동일하게 등록하세요.

## 구현된 기능

- 캘린더별 접근 권한 분리 (업무/알바/개인)
- 일정 생성/수정/댓글
- 활동 로그 추적
- Google 일정 가져오기 (`POST /api/google/import`)
- 서비스 일정 Google 자동 등록 + 수동 내보내기 (`POST /api/google/push`)
- 소셜 로그인 (Google/Naver/Kakao)

## 다음 단계 권장

- 충돌 감지/자동 재배치
- 푸시 알림(PWA + VAPID)
- 조직 초대 링크/권한 승인 플로우
