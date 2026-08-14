# 매일 학습 브리핑 (Self-Teaching Project)

CS · 마케팅 · AI를 매일 공부하는 개인 학습 사이트.
개념 딥다이브 + 이해도 퀴즈 + 마인드맵 + AI 뉴스/동향/논문 브리핑 + 학습 스트릭·복습.

**👉 사이트: https://hyunaeee.github.io/daily-study-briefing/**

| 폴더 | 용도 |
|---|---|
| `docs/` | 사이트 본체 (GitHub Pages 배포 소스). 정적 HTML/JS/JSON — 빌드·의존성 없음 |
| `personal/` | 로컬 도구 — 미리보기 서버(`node personal/server.js` → :4173), 매일 자동 갱신 스크립트 |
| `shareable/` | 배포용 템플릿 — 온보딩(닉네임·분야·수준·시간)으로 사용자별 맞춤. 서버 배포 로드맵 포함 |

## 동작 방식

- 매일 아침 로컬 작업 스케줄러가 Claude CLI로 새 하루치 콘텐츠(`docs/data/day-NNN.json`)를 생성하고 push → Pages 자동 재배포
- 퀴즈 점수·실습 체크·학습 스트릭·틀린 문제 복습 목록은 브라우저 localStorage에 저장 (서버 불필요)
- 모바일 요약판: https://claude.ai/code/artifact/2ae60556-ce5a-40bd-8fa0-8b045ffa15e2 (매일 아침 7시 KST 클라우드 루틴 갱신)

외부 API·유료 의존성 없음 (Node + Claude Code 계정만 사용).
