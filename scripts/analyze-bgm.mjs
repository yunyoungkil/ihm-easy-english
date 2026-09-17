import { execSync } from "node:child_process";

const f1 = "videos/ep16-double-vowels/assets/bgm/Bright & Uplifting Study Beats.wav";
const f2 = "videos/ep16-double-vowels/assets/bgm/Cheerful Focus & Flow.wav";

function getAudioDetail(file) {
  const duration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`).toString().trim();
  const volInfo = execSync(`ffmpeg -i "${file}" -af volumedetect -f null - 2>&1`).toString();
  const meanVol = volInfo.match(/mean_volume: (.*)/)?.[1] || "N/A";
  const maxVol = volInfo.match(/max_volume: (.*)/)?.[1] || "N/A";
  return {
    duration: parseFloat(duration).toFixed(2) + "s",
    meanVolume: meanVol,
    maxVolume: maxVol
  };
}

console.log("1. Bright & Uplifting Study Beats:", getAudioDetail(f1));
console.log("2. Cheerful Focus & Flow:", getAudioDetail(f2));
