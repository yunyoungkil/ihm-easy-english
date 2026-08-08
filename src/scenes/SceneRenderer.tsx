import React from "react";
import type { Scene } from "../types";
import { SceneFrame } from "../components/SceneFrame";
import { SceneBridge } from "../components/SceneBridge";
import { SceneWatermark } from "../components/SceneWatermark";
import { StatusBadge } from "../components/StatusBadge";
import { QuizScene } from "./QuizScene";
import { WordListScene } from "./WordListScene";
import { RuleBoxScene } from "./RuleBoxScene";
import { CompareScene } from "./CompareScene";
import { SummaryScene } from "./SummaryScene";
import { ReferenceScene } from "./ReferenceScene";
import { filterEditorialNotes } from "../utils/contentFilter";
import { getSceneKind } from "../utils/sceneKind";
import { useMotionStyle } from "../motion";

export const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const motion = useMotionStyle();
  const kind = getSceneKind(scene.layout);

  // `reference` replaces the channel layouts wholesale rather than decorating
  // them, so it returns before any of the calm/dynamic rendering below.
  if (motion.referenceLayout) {
    return <ReferenceScene scene={scene} />;
  }
  // The whole signature layer (watermark, corner badge, bulb bridge) belongs
  // to `dynamic` only; `calm` renders exactly what it did before.
  const showSignature = motion.signatureEnabled;

  const ruleContent = filterEditorialNotes(
    typeof scene.content === "string" ? scene.content : undefined,
  );
  const summaryItems = Array.isArray(scene.content) ? scene.content : [];

  return (
    <>
      <SceneFrame
        caption={scene.caption}
        watermark={showSignature ? <SceneWatermark kind={kind} /> : null}
        badge={showSignature ? <StatusBadge kind={kind} /> : null}
      >
        {scene.layout === "quiz" && <QuizScene words={scene.words} />}
        {scene.layout === "wordList" && <WordListScene words={scene.words} />}
        {scene.layout === "ruleBox" && <RuleBoxScene content={ruleContent} />}
        {scene.layout === "compare" && <CompareScene words={scene.words} content={ruleContent} />}
        {scene.layout === "summary" && (
          <SummaryScene items={summaryItems} caption={scene.caption} />
        )}
      </SceneFrame>
      {/* Outside SceneFrame so the bridge isn't dimmed by the scene's own
          fade-in — it needs to read at full strength during the handover. */}
      {showSignature && <SceneBridge kind={kind} />}
    </>
  );
};
