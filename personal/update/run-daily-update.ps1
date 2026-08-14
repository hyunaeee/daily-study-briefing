# 매일 학습 브리핑 자동 갱신 스크립트
# 1) Claude CLI가 웹 검색으로 docs/data에 새 하루치 콘텐츠 생성
# 2) git push → GitHub Pages 자동 재배포
# Windows 작업 스케줄러에 등록해서 매일 아침 실행 (README.md 참고)
$ErrorActionPreference = "Stop"

$project = "C:\Users\LIKE\Desktop\code\self-teaching-project"
$claude  = "C:\Users\LIKE\AppData\Roaming\npm\claude.cmd"
$prompt  = Get-Content -Raw (Join-Path $project "personal\update\update-prompt.md")
$log     = Join-Path $project "personal\update\last-run.log"

Set-Location $project
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 갱신 시작" | Out-File $log -Encoding utf8

& $claude -p $prompt `
  --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash" `
  --permission-mode acceptEdits 2>&1 | Out-File $log -Append -Encoding utf8

# 새 데이터가 생겼으면 커밋 & 푸시 (Pages 재배포)
git add docs/data 2>&1 | Out-File $log -Append -Encoding utf8
$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "daily: $(Get-Date -Format 'yyyy-MM-dd') 학습 브리핑 갱신" 2>&1 | Out-File $log -Append -Encoding utf8
  git push 2>&1 | Out-File $log -Append -Encoding utf8
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 푸시 완료 → Pages 재배포" | Out-File $log -Append -Encoding utf8
} else {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 변경 없음 (이미 오늘 데이터 존재)" | Out-File $log -Append -Encoding utf8
}
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 종료" | Out-File $log -Append -Encoding utf8
