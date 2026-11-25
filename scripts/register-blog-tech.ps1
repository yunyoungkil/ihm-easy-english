# tech.d40m.com 자동 글쓰기(scripts/blog/tech-run.mjs)를 윈도우 작업 스케줄러에 등록한다. 집 PC(DESKTOP-UA9AKL2)에서만 켠다.
# 2026-11-26 작성. 기본: 월·수·금 새벽 2시, 실행 시간 1시간 한도, 로그인한 사용자 권한(비밀번호 저장 없음).
# 켜기 전에 사용자 승인을 받는다(무인으로 공개 글을 올리는 일정이다).
#   시험(시각 없는 작업, 한 번만 직접 시작):
#     powershell -ExecutionPolicy Bypass -File scripts/register-blog-tech.ps1 -TaskName IHM-Blog-Tech-Test -Arguments '"scripts\blog\tech-run.mjs" --preview --force-day' -NoTrigger
#     Start-ScheduledTask -TaskName IHM-Blog-Tech-Test   (끝난 뒤: Unregister-ScheduledTask -TaskName IHM-Blog-Tech-Test -Confirm:$false)
#   실제 등록:  powershell -ExecutionPolicy Bypass -File scripts/register-blog-tech.ps1
#   확인:  Get-ScheduledTask -TaskName IHM-Blog-Tech-Writer | Get-ScheduledTaskInfo
#   해제:  Unregister-ScheduledTask -TaskName IHM-Blog-Tech-Writer -Confirm:$false
param(
  [string]$TaskName = 'IHM-Blog-Tech-Writer',
  [string]$Arguments = '"scripts\blog\tech-run.mjs"',
  [switch]$NoTrigger
)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source

$action = New-ScheduledTaskAction -Execute $node -Argument $Arguments -WorkingDirectory $projectDir
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$description = '이해하면 쉬운영어: tech.d40m.com 자동 글쓰기·그림·게시 (scripts/blog/tech-run.mjs)'

if ($NoTrigger) {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Settings $settings -Principal $principal -Description $description -Force | Out-Null
} else {
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Wednesday, Friday -At 2:00am
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $description -Force | Out-Null
}

$task = Get-ScheduledTask -TaskName $TaskName
"등록됨: $($task.TaskName) / 상태: $($task.State) / 다음 실행: $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
