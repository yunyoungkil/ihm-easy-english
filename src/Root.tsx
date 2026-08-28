import "./index.css";
import { SubtitleCardsComposition } from "./Composition";
import {
  Ep06Composition,
  EP07_SPEC,
  EP08_SPEC,
  EP09_SPEC,
  EP10_SPEC,
} from "./Ep06Composition";
import { ShortsComposition, SHORTS_B_SPEC, EP07_SHORTS_B_SPEC } from "./ShortsComposition";
import { Ep07ShortsAComposition } from "./EP07ShortsAComposition";
import { SeasonTestScene1Composition } from "./season test scene_1/SeasonTestScene1";
import { SeasonTestScene2Composition } from "./season-test-scene-2/SeasonTestScene2";
import { SeasonEp1Composition } from "./season2-ep1/SeasonEp1";
import { SeasonEp2Composition } from "./season2-ep2/SeasonEp2";
import { ScrapbookTest1Composition } from "./scrapbook-test-1/ScrapbookTest1";
import { CarTest2Composition } from "./car-test-2/CarTest2";
import { PodcastTest3Composition } from "./podcast-test-3/PodcastTest3";
import { Season2CodexPrototypeComposition } from "./codex-prototype/Season2CodexPrototype";
import { Season2Ep1CorePassComposition } from "./codex-prototype/Season2Ep1CorePass";
import { Season2Ep1ListenPassComposition } from "./codex-prototype/Season2Ep1ListenPass";
import { Season2Ep1StartPassComposition } from "./codex-prototype/Season2Ep1StartPass";
import { Season2Ep1RhythmPassComposition } from "./codex-prototype/Season2Ep1RhythmPass";
import { Season2Ep1LinkingPassComposition } from "./codex-prototype/Season2Ep1LinkingPass";
import { Season2Ep1QuizPassComposition } from "./codex-prototype/Season2Ep1QuizPass";
import { Season2Ep1BridgeIntroComposition } from "./codex-prototype/Season2Ep1BridgeIntro";
import { Season2Ep1CtaComposition } from "./codex-prototype/Season2Ep1Cta";
import { Season2Ep1FinalComposition } from "./codex-prototype/Season2Ep1Final";
import { Ep8ShortsAReplicaComposition } from "./shorts-template/Ep8ShortsAReplicaV2";
import { Ep8ShortsBAutoComposition } from "./shorts-template/Ep8ShortsBAuto";
import { ChannelShortsCSchwaComposition } from "./shorts-template/ChannelShortsCSchwa";
import { Ep9ShortsAAutoComposition } from "./shorts-template/Ep9ShortsAAuto";
import { Ep9ShortsBAutoComposition } from "./shorts-template/Ep9ShortsBAuto";
import { Ep09ThumbnailComposition } from "./thumbnail/Ep09Thumbnail";
import { Ep09ThumbnailV2Composition } from "./thumbnail/Ep09ThumbnailV2";

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
      {/* Separate composition, not a ShortsScene variant: persistent 3-pill
          reveal state across segments and a pixel-exact safe area are
          architecturally different from EP06 shorts — see shortsALayout.ts. */}
      <Ep07ShortsAComposition />
      <ShortsComposition id="EP07-shortsB" spec={EP07_SHORTS_B_SPEC} />
      {/* Isolated test scene — ignores the channel's design system entirely.
          See src/season test scene_1/. Transparent background, own palette/fonts. */}
      <SeasonTestScene1Composition />
      {/* Second iteration: 16:9, own painted background (not transparent —
          the brief specifies background particle/gradient motion), adds the
          season-2 intro beats. See src/season-test-scene-2/. */}
      <SeasonTestScene2Composition />
      {/* Full 10-scene episode built from gemini-remotion-spec.md. See
          src/season2-ep1/. SFX substituted with @remotion/sfx's ding/uiSwitch/
          whoosh — the spec's ~30 named SFX files don't exist in this project. */}
      <SeasonEp1Composition />
      {/* Second full episode, built from a similar gemini-remotion-spec.md.
          Own component library in src/season2-ep2/ (master/slave word
          metaphor) — separate from EP1's, not shared. */}
      <SeasonEp2Composition />
      {/* Torn-paper scrapbook collage test — completely separate visual system
          from every other composition in this project. See
          src/scrapbook-test-1/. */}
      <ScrapbookTest1Composition />
      {/* Single-photo cinematic treatment test — no script, no channel design
          system. See src/car-test-2/. */}
      <CarTest2Composition />
      {/* 2-speaker podcast test over a fixed background photo — karaoke
          subtitles + speaker sound-wave indicator. No real narration yet;
          see src/podcast-test-3/. */}
      <PodcastTest3Composition />
      {/* Independent exploration: a rhythm-first visual language for season 2.
          It deliberately does not reuse or modify the authored EP1 scenes. */}
      <Season2CodexPrototypeComposition />
      <Season2Ep1CorePassComposition />
      <Season2Ep1ListenPassComposition />
      <Season2Ep1StartPassComposition />
      <Season2Ep1RhythmPassComposition />
      <Season2Ep1LinkingPassComposition />
      <Season2Ep1QuizPassComposition />
      <Season2Ep1BridgeIntroComposition />
      <Season2Ep1CtaComposition />
      <Season2Ep1FinalComposition />
      <Ep8ShortsAReplicaComposition />
      <Ep8ShortsBAutoComposition />
      <ChannelShortsCSchwaComposition />
      <Ep9ShortsAAutoComposition />
      <Ep9ShortsBAutoComposition />
      <Ep09ThumbnailComposition />
      <Ep09ThumbnailV2Composition />
    </>
  );
};
