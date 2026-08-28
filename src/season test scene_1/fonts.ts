import { loadFont as loadNotoSansKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

// Independent font loading from src/fonts.ts on purpose — this scene ignores
// the channel's existing Inter/NotoSansKR-700/900-only setup and picks
// Poppins for English to match the reference reel's rounded geometric look.
const { fontFamily: notoSansKRFamily } = loadNotoSansKR("normal", {
  weights: ["700", "900"],
  subsets: ["korean"],
  ignoreTooManyRequestsWarning: true,
});

const { fontFamily: poppinsFamily } = loadPoppins("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

export const FONT_KO = notoSansKRFamily;
export const FONT_EN = poppinsFamily;
