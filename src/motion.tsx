import React, { createContext, useContext } from "react";
import {
  DEFAULT_MOTION_STYLE,
  MOTION_STYLES,
  type MotionStyle,
  type MotionStyleName,
} from "./theme";

// The active motion preset is provided once at the composition root and read
// by the animation hooks deep in the tree, so scene components never have to
// thread it through as a prop.
const MotionStyleContext = createContext<MotionStyle>(MOTION_STYLES[DEFAULT_MOTION_STYLE]);

export const MotionStyleProvider: React.FC<{
  motionStyle: MotionStyleName;
  children: React.ReactNode;
}> = ({ motionStyle, children }) => (
  <MotionStyleContext.Provider value={MOTION_STYLES[motionStyle] ?? MOTION_STYLES[DEFAULT_MOTION_STYLE]}>
    {children}
  </MotionStyleContext.Provider>
);

export const useMotionStyle = (): MotionStyle => useContext(MotionStyleContext);
