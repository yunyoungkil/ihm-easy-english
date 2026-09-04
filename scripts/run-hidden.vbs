' 콘솔 창을 띄우지 않고 명령을 실행한다.
' 사용법: wscript scripts\run-hidden.vbs "<작업 디렉토리>" "<실행할 명령>"
' 예:     wscript scripts\run-hidden.vbs "videos\ep12-want-wont" "npx --yes hyperframes@0.8.26 preview --background"
Set objShell = CreateObject("WScript.Shell")
workDir = WScript.Arguments(0)
cmd = WScript.Arguments(1)
objShell.CurrentDirectory = workDir
objShell.Run "cmd /c " & Chr(34) & cmd & Chr(34), 0, False
