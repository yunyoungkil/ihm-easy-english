import "./index.css";
import { SubtitleCardsComposition } from "./Composition";
import {
  Ep06Composition,
  EP07_SPEC,
  EP08_SPEC,
  EP09_SPEC,
  EP10_SPEC,
} from "./Ep06Composition";
import { ShortsComposition, SHORTS_B_SPEC } from "./ShortsComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <SubtitleCardsComposition />
      {/* Same script and narration, three motion presets — see MOTION_STYLES. */}
      <Ep06Composition id="EP06-calm" motionStyle="calm" />
      <Ep06Composition id="EP06-dynamic" motionStyle="dynamic" />
      <Ep06Composition id="EP06-reference" motionStyle="reference" />
      <Ep06Composition id="EP06-card" motionStyle="card" />
      {/* EP7 has no narration yet, so its scene lengths come from the script's
          planned durations until public/audio/ep07_* exists. */}
      <Ep06Composition id="EP07-card" motionStyle="card" spec={EP07_SPEC} />
      <Ep06Composition id="EP08-card" motionStyle="card" spec={EP08_SPEC} />
      <Ep06Composition id="EP09-card" motionStyle="card" spec={EP09_SPEC} />
      <Ep06Composition id="EP10-card" motionStyle="card" spec={EP10_SPEC} />
      {/* Vertical short (1080x1920). Shares the palette and fonts but none of
          the long-form layout code — see ShortsScene. */}
      <ShortsComposition id="EP06-shortsA" />
      <ShortsComposition id="EP06-shortsB" spec={SHORTS_B_SPEC} />
    </>
  );
};
