[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$koreanVoice = $null
foreach ($v in $synth.GetInstalledVoices()) {
    Write-Host "Voice: $($v.VoiceInfo.Name) ($($v.VoiceInfo.Culture))"
    if ($v.VoiceInfo.Culture.Name -like "ko*" -and -not $koreanVoice) {
        $koreanVoice = $v.VoiceInfo.Name
    }
}

if ($koreanVoice) {
    Write-Host "Selecting Korean Voice: $koreanVoice"
    $synth.SelectVoice($koreanVoice)
} else {
    Write-Host "No specific Korean voice found, using default voice."
}

$text = "BOAT, RAIN, MEAT... 저도 이런 쉬운 단어 앞에서 순간 멈칫했던 적이 있어요. 모음이 두 개 나란히 붙어 있으면, 이걸 다 읽어야 하는 건지, 하나만 읽어야 하는 건지, 그런 기준이 있는지조차 몰랐거든요. 오늘 그 기준 하나만 알면, 이런 단어들 더 이상 멈추지 않고 바로 읽으실 수 있어요."

$outPath = "c:\Users\yunyo\Downloads\project\videos\ep16-double-vowels\assets\voice\01-windows-tts.wav"

$synth.SetOutputToWaveFile($outPath)
$synth.Speak($text)
$synth.Dispose()

Write-Host "SUCCESS: Saved to $outPath"
