# 개인용 도구 모음

사이트 본체는 [`../docs/`](../docs)에 있습니다 (GitHub Pages로 배포되는 폴더).
이 폴더에는 로컬에서 쓰는 도구만 남아 있습니다.

## 로컬에서 미리보기

```
node server.js
```

→ http://localhost:4173 (../docs를 서빙. 배포본과 동일한 화면)

## 매일 자동 갱신 흐름

`update/run-daily-update.ps1`이 매일 아침:

1. Claude CLI(헤드리스)가 웹 검색으로 `docs/data/day-NNN.json` 생성 (`update/update-prompt.md` 프롬프트 사용)
2. `git push` → GitHub Pages가 자동으로 재배포

작업 스케줄러 등록 (1회만, 일반 PowerShell에서):

```
schtasks /Create /TN "DailyStudyBriefing" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\LIKE\Desktop\code\self-teaching-project\personal\update\run-daily-update.ps1\"" /SC DAILY /ST 06:50
```

로그: `update/last-run.log` · 해제: `schtasks /Delete /TN "DailyStudyBriefing"`

> Claude CLI는 로그인된 계정 사용량을 쓰며 별도 API 키·과금 없음.
> PC가 꺼져 있던 날은 건너뜁니다 (다음 실행 때 하루치만 새로 생성).
