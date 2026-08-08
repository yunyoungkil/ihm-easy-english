import React from "react";
import { SIGNATURE } from "../theme";
import { FONT_KO } from "../fonts";
import { useEntrance } from "../utils/animation";
import type { SceneKind } from "../utils/sceneKind";

/**
 * `dynamic`-only corner chip. The reference keeps a small section marker
 * pinned in a corner for the whole segment; here it carries the scene kind's
 * colour so a viewer can tell at a glance whether they're in an example, a
 * rule or a quiz without reading anything.
 */
export const StatusBadge: React.FC<{ kind: SceneKind }> = ({ kind }) => {
  const entrance = useEntrance(0);

  return (
    <div
      style={{
        position: "absolute",
        top: SIGNATURE.badgeTopOffset,
        right: SIGNATURE.badgeRightOffset,
        display: "flex",
        alignItems: "center",
        gap: SIGNATURE.badgeGap,
        padding: SIGNATURE.badgePadding,
        borderRadius: 999,
        border: `1px solid ${kind.color}${Math.round(SIGNATURE.badgeBorderOpacity * 255).toString(16)}`,
        opacity: entrance.opacity,
      }}
    >
      <div
        style={{
          width: SIGNATURE.badgeDotSize,
          height: SIGNATURE.badgeDotSize,
          borderRadius: "50%",
          backgroundColor: kind.color,
          boxShadow: `0 0 12px ${kind.color}`,
        }}
      />
      <span
        style={{
          fontFamily: FONT_KO,
          fontWeight: 700,
          fontSize: SIGNATURE.badgeFontSize,
          color: kind.color,
          letterSpacing: 1,
        }}
      >
        {kind.label}
      </span>
    </div>
  );
};
