# tech.d40m.com 자동 글쓰기(scripts/blog/tech-run.mjs)를 윈도우 작업 스케줄러에 등록한다. PC 2대 모두 켠다(2026-11-27 사용자: 켜져 있는 PC가 실행).
# 집 PC(DESKTOP-UA9AKL2)는 기본 2:00am, 노트북(DESKTOP-GPI3LM1)은 -At 3:15am으로 등록한다(작업 한도 1시간이라 안 겹친다).
# 먼저 돈 PC가 결과를 올리면 늦은 PC는 받아 보고 그날은 쉰다(tech-run.mjs의 other-pc-ran).
# 2026-11-26 작성. 기본: 월·수·금 새벽 2시, 실행 시간 1시간 한도, 로그인한 사용자 권한(비밀번호 저장 없음).
# 켜기 전에 사용자 승인을 받는다(무인으로 공개 글을 올리는 일정이다).
#   시험(시각 없는 작업, 한 번만 직접 시작):
#     powershell -ExecutionPolicy Bypass -File scripts/register-blog-tech.ps1 -TaskName IHM-Blog-Tech-Test -Arguments '"scripts\blog\tech-run.mjs" --preview --force-day' -NoTrigger
#     Start-ScheduledTask -TaskName IHM-Blog-Tech-Test   (끝난 뒤: Unregister-ScheduledTask -TaskName IHM-Blog-Tech-Test -Confirm:$false)
#   실제 등록(집 PC):  powershell -ExecutionPolicy Bypass -File scripts/register-blog-tech.ps1
#   실제 등록(노트북): powershell -ExecutionPolicy Bypass -File scripts/register-blog-tech.ps1 -At 3:15am
#   확인:  Get-ScheduledTask -TaskName IHM-Blog-Tech-Writer | Get-ScheduledTaskInfo
#   해제:  Unregister-ScheduledTask -TaskName IHM-Blog-Tech-Writer -Confirm:$false
param(
  [string]$TaskName = 'IHM-Blog-Tech-Writer',
  [string]$Arguments = '"scripts\blog\tech-run.mjs"',
  [switch]$NoTrigger,
  [string]$At = '2:00am'
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
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Wednesday, Friday -At $At
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $description -Force | Out-Null
}

$task = Get-ScheduledTask -TaskName $TaskName
"등록됨: $($task.TaskName) / 상태: $($task.State) / 다음 실행: $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
