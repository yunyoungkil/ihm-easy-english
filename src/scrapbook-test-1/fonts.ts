import { loadFont as loadNotoSansKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const { fontFamily: notoSansKRFamily } = loadNotoSansKR("normal", {
  weights: ["700", "800", "900"],
  subsets: ["korean"],
  ignoreTooManyRequestsWarning: true,
});

const { fontFamily: poppinsFamily } = loadPoppins("normal", {
  weights: ["800", "900"],
  subsets: ["latin"],
});

/** Handwritten cursive for the signature credit line, matching the reference. */
const { fontFamily: caveatFamily } = loadCaveat("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

export const FONT_KO = notoSansKRFamily;
export const FONT_EN = poppinsFamily;
export const FONT_SCRIPT = caveatFamily;
