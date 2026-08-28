import {loadFont as loadFredoka} from "@remotion/google-fonts/Fredoka";
import {loadFont as loadJua} from "@remotion/google-fonts/Jua";

const {fontFamily: soundFamily} = loadFredoka("normal", {
  weights: ["600"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const {fontFamily: keywordFamily} = loadJua("normal", {
  weights: ["400"],
  subsets: ["korean"],
  ignoreTooManyRequestsWarning: true,
});

export const FONT_SOUND = soundFamily;
export const FONT_KEYWORD = keywordFamily;
