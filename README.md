# Tnote

학원 학생 관리 시스템 (티노트)

## 기능

학생·반·시험·재시험·클리닉 출석·과제·상담 관리, 문자 발송(Solapi), 캘린더

## 기술 스택

Next.js 16 · React 19 · TypeScript · Supabase(PostgreSQL) · Tailwind CSS · Jotai · React Query

## 실행

```bash
bun install
cp .env.example .env.local   # 값 채우기
bun dev
```

## 환경 변수

`.env.example` 참고. Supabase 키 3개가 필수이고 Axiom(로깅)은 선택입니다. Solapi 문자 키는 환경변수가 아니라 워크스페이스별로 DB에 저장됩니다.

## 아키텍처

- 멀티테넌트 — 모든 데이터는 `workspace` 단위로 격리됩니다.
- 인증은 Supabase Auth(쿠키 세션) 기반이며, 전화번호를 `<번호>@tnote.local` 이메일로 매핑합니다.
- DB 스키마는 Supabase에서 관리하며 이 저장소에는 마이그레이션이 없습니다.
