# 매일 새벽 5시에 채널 성장 루프(scripts/daily-loop.mjs)를 돌리도록 윈도우 작업 스케줄러에 등록한다.
# 2026-11-11 사용자 승인. PC가 그 시각에 꺼져 있었으면 켜진 뒤 바로 한 번 돈다(StartWhenAvailable).
# 로그인한 사용자 권한으로만 돈다(비밀번호 저장 없음). 다시 실행하면 같은 이름의 작업을 덮어쓴다.
#   등록:  powershell -ExecutionPolicy Bypass -File scripts/register-daily-loop.ps1
#   확인:  Get-ScheduledTask -TaskName IHM-Daily-Growth-Loop
#   해제:  Unregister-ScheduledTask -TaskName IHM-Daily-Growth-Loop -Confirm:$false

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$taskName = 'IHM-Daily-Growth-Loop'

$action = New-ScheduledTaskAction -Execute $node -Argument '"scripts\daily-loop.mjs"' -WorkingDirectory $projectDir
$trigger = New-ScheduledTaskTrigger -Daily -At 5:00am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description '이해하면 쉬운영어: 매일 동기화, 7일 판정, 경쟁 채널·시청자 고민 갱신 (scripts/daily-loop.mjs)' -Force | Out-Null

$task = Get-ScheduledTask -TaskName $taskName
"등록됨: $($task.TaskName) / 상태: $($task.State) / 다음 실행: $((Get-ScheduledTaskInfo -TaskName $taskName).NextRunTime)"
