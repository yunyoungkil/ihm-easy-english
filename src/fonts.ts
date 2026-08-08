import { loadFont as loadNotoSansKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: notoSansKRFamily } = loadNotoSansKR("normal", {
  weights: ["700", "900"],
  subsets: ["korean"],
  ignoreTooManyRequestsWarning: true,
});

const { fontFamily: interFamily } = loadInter("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

export const FONT_KO = notoSansKRFamily;
export const FONT_EN = interFamily;
