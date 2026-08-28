import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {FONT_KEYWORD, FONT_SOUND} from "./fonts";

const T = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 1380,
  color: {bg: "#07111F", panel: "#112849", text: "#F8F4EC", muted: "#B7C5D7", gold: "#FFD15C", cyan: "#72D6EA", coral: "#FF846A"},
  size: {meta: 23, headline: 76, word: 124, support: 33, caption: 29},
  edge: 112,
};

const fade = (frame: number, from: number, to: number) => Math.min(
  interpolate(frame, [from, from + 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)}),
  interpolate(frame, [to - 12, to], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)}),
);

const Phase: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  return <div style={{opacity: fade(frame, from, to)}}>{children}</div>;
};

const SectionBand: React.FC<{step: string; label: string}> = ({step, label}) => {
  const frame = useCurrentFrame();
  const current = Number(step);
  const starts = [0, 293, 502, 719, 990];
  const localFrame = Math.max(0, frame - starts[current - 1]);
  const enter = interpolate(localFrame, [0, 15], [0, 1], {extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const scan = ((localFrame % 90) / 90) * 100;
  const isQuiz = current === 4;
  const activeLabel = isQuiz ? "LISTEN" : `${step} · ${label}`;

  return <div style={{position: "absolute", top: 44, left: 72, right: 72, height: 108, opacity: enter, transform: `translateY(${(1 - enter) * -16}px)`, color: T.color.text, fontSize: 18, fontWeight: 800, letterSpacing: 1.5}}>
    <div style={{position: "absolute", inset: 0, overflow: "hidden", border: `1px solid ${isQuiz ? T.color.gold : "#315170"}`, borderRadius: 14, background: "rgba(7, 22, 40, 0.84)", boxShadow: "0 12px 30px rgba(0,0,0,0.18)"}}>
      <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 9, background: T.color.cyan}} />
      {[0, 1, 2].map((index) => <div key={index} style={{position: "absolute", left: 42 + index * 21, top: 25, width: 12, height: 58, transform: "skewX(-28deg)", background: index === 1 ? T.color.gold : T.color.cyan, opacity: 0.9}} />)}
      <div style={{position: "absolute", left: `${scan}%`, top: 0, width: 150, height: "100%", transform: "translateX(-100%) skewX(-20deg)", background: "linear-gradient(90deg, transparent, rgba(114,214,234,0.13), transparent)"}} />
      <div style={{position: "absolute", left: 128, top: 34, fontSize: 31, lineHeight: "36px", letterSpacing: 2.5}}>SEASON 2 · EP1</div>
      <div style={{position: "absolute", left: 470, top: 53, width: 480, height: 3, background: "#36516D"}}><div style={{width: `${current * 20}%`, height: "100%", background: T.color.cyan}} /></div>
      <div style={{position: "absolute", left: 470, top: 43, display: "flex", gap: 99}}>{[1, 2, 3, 4, 5].map((item) => <div key={item} style={{width: item === current ? 14 : 8, height: item === current ? 14 : 8, borderRadius: 99, background: item === current ? T.color.gold : "#59718A", boxShadow: item === current ? `0 0 0 6px ${T.color.gold}33` : "none"}} />)}</div>
      <div style={{position: "absolute", right: isQuiz ? 305 : 28, top: 34, fontSize: 31, color: T.color.gold, letterSpacing: 2.2, lineHeight: "36px", whiteSpace: "nowrap"}}>{activeLabel}</div>
      {isQuiz && <div style={{position: "absolute", top: 0, right: 0, width: 270, height: "100%", borderLeft: `2px dashed ${T.color.gold}`, background: "rgba(255,209,92,0.08)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center"}}><div style={{position: "absolute", left: -8, top: -8, width: 15, height: 15, borderRadius: 99, background: T.color.bg}} /><div style={{position: "absolute", left: -8, bottom: -8, width: 15, height: 15, borderRadius: 99, background: T.color.bg}} /><div style={{fontSize: 28, color: T.color.gold, letterSpacing: 2}}>04 · QUIZ</div></div>}
    </div>
  </div>;
};

const Center: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"}}>{children}</div>;

const PulseRings: React.FC<{from: number; x: number; y: number; color: string; count?: number; gap?: number}> = ({from, x, y, color, count = 3, gap = 36}) => {
  const frame = useCurrentFrame();
  return <>{Array.from({length: count}, (_, index) => {
    const progress = interpolate(frame, [from + index * gap, from + index * gap + 30], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
    return <div key={index} style={{position: "absolute", left: x, top: y, width: 120, height: 120, border: `3px solid ${color}`, borderRadius: 999, opacity: (1 - progress) * 0.48, transform: `translate(-50%, -50%) scale(${0.4 + progress * 2.6})`, pointerEvents: "none"}} />;
  })}</>;
};

const SectionTransition: React.FC<{at: number; color: string}> = ({at, color}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < -3 || local > 13) return null;
  const travel = interpolate(local, [-3, 13], [-35, 135], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const flash = interpolate(local, [-3, 3, 13], [0, 0.13, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <><div style={{position: "absolute", inset: 0, background: color, opacity: flash, pointerEvents: "none"}} /><div style={{position: "absolute", left: "-25%", top: 0, width: "55%", height: "100%", transform: `translateX(${travel}vw) skewX(-18deg)`, background: `linear-gradient(90deg, transparent, ${color}22 30%, ${color}BB 50%, ${color}22 70%, transparent)`, pointerEvents: "none"}} /></>;
};

const CaptionLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const captions = [
    {from: 0, to: 78, before: "", key: "I'mma call you later."},
    {from: 78, to: 293, before: "방금 휙 지나간 원어민의 이 문장, 혹시 한국어 ‘아이 엄마’처럼 들리지 않으셨나요?"},
    {from: 293, to: 502, before: "영어는 ", key: "강세와 강세 사이의 간격", after: "을 일정하게 유지하려는 습성이 있는 언어입니다."},
    {from: 502, to: 719, before: "강세를 못 받는 단어는 자리를 지키기 위해 소리 자체가 짧아지고 뭉개집니다."},
    {from: 719, to: 835, before: "아이 가라 두 잇."},
    {from: 835, to: 990, before: "잠깐, 무슨 소리인지 한번 맞혀보세요."},
    {from: 990, to: 1110, before: "아이 갓 투 두 잇, 저거 해야 해요, 라는 뜻입니다."},
    {from: 1110, to: 1280, before: "갓 투가 가라로 뭉개진 거죠."},
  ];
  const caption = captions.find((item) => frame >= item.from && frame < item.to);
  if (!caption) return null;
  const opacity = fade(frame, caption.from, caption.to);
  return <div style={{position: "absolute", left: 0, right: 0, bottom: 66, display: "flex", justifyContent: "center", opacity, pointerEvents: "none"}}>
    <div style={{maxWidth: 1420, padding: "18px 34px", borderRadius: 18, background: "rgba(4, 13, 26, 0.78)", border: "1px solid rgba(183,197,215,0.18)", color: T.color.text, fontSize: 34, fontWeight: 750, lineHeight: 1.34, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.2)"}}>{caption.before}{caption.key && <span style={{color: T.color.gold, fontFamily: FONT_SOUND, fontWeight: 600}}>{caption.key}</span>}{caption.after}</div>
  </div>;
};

const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [1280, 1332], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  return <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: progress, transform: `translateY(${(1 - progress) * 24}px)`}}>
    <div style={{fontSize: 20, color: T.color.cyan, letterSpacing: 3.4, fontWeight: 900}}>TODAY&apos;S TAKEAWAY</div>
    <div style={{marginTop: 34, fontSize: 72, color: T.color.text, fontWeight: 900, letterSpacing: -4, lineHeight: 1.28}}>강세는 남고,<br /><span style={{color: T.color.gold, fontFamily: FONT_KEYWORD, fontWeight: 400}}>약한 소리</span>는 압축된다.</div>
    <div style={{marginTop: 42, padding: "13px 25px", borderRadius: 999, border: `1px solid ${T.color.cyan}66`, color: T.color.muted, fontSize: 25, fontWeight: 700}}>다음 문장에서 직접 찾아보세요.</div>
  </div>;
};

const CorePass: React.FC = () => {
  const frame = useCurrentFrame();
  const squeeze = interpolate(frame, [535, 690], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const squeezeSource = 1 - interpolate(frame, [535, 600], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)});
  const squeezeResult = interpolate(frame, [600, 665], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const reveal = interpolate(frame, [990, 1080], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const quizRemaining = frame >= 900 && frame < 990 ? Math.max(1, Math.ceil((990 - frame) / 30)) : null;
  const dot = (index: number) => <div key={index} style={{position: "absolute", width: 7, height: 7, borderRadius: 99, left: 100 + (index * 277) % 1690, top: 130 + (index * 157) % 780, opacity: 0.1 + (index % 3) * 0.05, background: T.color.cyan}} />;
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${T.color.panel}, ${T.color.bg} 72%)`, fontFamily: "Noto Sans KR, Arial, sans-serif", overflow: "hidden"}}>
    {Array.from({length: 18}, (_, index) => dot(index))}
    <Sequence from={0}><Audio src={staticFile("audio/season2_ep1_seg01.wav")} /></Sequence>
    <Sequence from={293}><Audio src={staticFile("audio/season2_ep1_seg12.wav")} /></Sequence>
    <Sequence from={502}><Audio src={staticFile("audio/season2_ep1_seg13.wav")} /></Sequence>
    <Sequence from={719}><Audio src={staticFile("audio/season2_ep1_seg21.wav")} /></Sequence>
    <Sequence from={990}><Audio src={staticFile("audio/season2_ep1_seg22.wav")} /></Sequence>
    <Sequence from={70}><Audio src={staticFile("audio/core-pass-pop.wav")} volume={0.11} /></Sequence>
    {[336, 408].map((from) => <Sequence key={`rhythm-tick-${from}`} from={from}><Audio src={staticFile("audio/core-pass-tick.wav")} volume={0.09} /></Sequence>)}
    <Sequence from={605}><Audio src={staticFile("audio/core-pass-squeeze.wav")} volume={0.13} /></Sequence>
    {[900, 930, 960].map((from) => <Sequence key={`quiz-tick-${from}`} from={from}><Audio src={staticFile("audio/core-pass-tick.wav")} volume={0.13} /></Sequence>)}
    <Sequence from={1018}><Audio src={staticFile("audio/core-pass-ding.wav")} volume={0.15} /></Sequence>
    <Sequence from={1278}><Audio src={staticFile("audio/core-pass-outro.wav")} volume={0.12} /></Sequence>

    <Phase from={0} to={293}><SectionBand step="01" label="LISTEN"/><Center>
      <div style={{fontSize: T.size.support, color: T.color.muted, fontWeight: 700, marginBottom: 36}}>휙 지나간 이 문장, 이렇게 들리셨나요?</div>
      <div style={{fontFamily: FONT_SOUND, fontSize: T.size.word, color: T.color.gold, fontWeight: 600, letterSpacing: -3}}>I&apos;mma call you later</div>
      <div style={{marginTop: 38, border: `2px solid ${T.color.coral}`, color: T.color.coral, borderRadius: 999, padding: "13px 30px", fontSize: T.size.caption, fontWeight: 800}}>“아이머 콜 유 레이터”</div>
    </Center></Phase>

    <Phase from={293} to={502}><SectionBand step="02" label="RHYTHM"/><Center>
      <div style={{fontSize: T.size.headline, color: T.color.text, fontWeight: 900, letterSpacing: -4}}>영어는 <span style={{color: T.color.gold, fontFamily: FONT_KEYWORD, fontWeight: 400}}>강세 사이의 간격</span>을 지킵니다.</div>
      <div style={{display: "flex", alignItems: "center", gap: 58, marginTop: 100}}>
        {["I", "want", "to", "go", "home"].map((word, index) => <div key={word} style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 20}}><div style={{width: index === 0 || index === 3 || index === 4 ? 74 : 28, height: index === 0 || index === 3 || index === 4 ? 74 : 28, borderRadius: 99, background: index === 0 || index === 3 || index === 4 ? T.color.gold : "#3B526D"}} /><div style={{fontSize: 30, color: index === 0 || index === 3 || index === 4 ? T.color.text : T.color.muted, fontWeight: 800}}>{word}</div></div>)}
      </div>
      <PulseRings from={336} x={960} y={700} color={T.color.cyan} />
    </Center></Phase>

    <Phase from={502} to={719}><SectionBand step="03" label="LINKING"/><Center>
      <div style={{fontSize: T.size.support, color: T.color.muted, fontWeight: 700, marginBottom: 58}}>강세를 못 받는 단어는 짧아지고 뭉개집니다.</div>
      <div style={{height: 180, width: 1200, position: "relative"}}>
        <div style={{position: "absolute", left: interpolate(squeeze, [0, 1], [90, 380]), top: 20, color: T.color.text, fontSize: T.size.word, fontWeight: 900, opacity: squeezeSource}}>want</div>
        <div style={{position: "absolute", left: interpolate(squeeze, [0, 1], [680, 650]), top: 20, color: T.color.coral, fontSize: T.size.word, fontWeight: 900, transform: `scale(${1 - squeeze * 0.55})`, transformOrigin: "left center", opacity: squeezeSource}}>to</div>
        <div style={{position: "absolute", left: interpolate(squeezeResult, [0, 1], [980, 500]), top: 20, color: T.color.gold, fontFamily: FONT_SOUND, fontSize: T.size.word, fontWeight: 600, opacity: squeezeResult}}>wanna</div>
        <div style={{position: "absolute", left: 380, top: 145, width: interpolate(squeeze, [0, 1], [0, 650]), height: 6, borderRadius: 99, background: T.color.gold}} />
      </div>
      <PulseRings from={610} x={960} y={540} color={T.color.gold} count={2} gap={44} />
      <div style={{marginTop: 48, color: T.color.cyan, fontFamily: FONT_KEYWORD, fontSize: T.size.caption + 4, fontWeight: 400}}>여기서만, 한 박자 압축됩니다.</div>
    </Center></Phase>

    <Phase from={719} to={990}><SectionBand step="04" label="QUIZ"/><Center>
      <div style={{fontSize: T.size.support, color: T.color.muted, fontWeight: 700, marginBottom: 44}}>잠깐, 무슨 뜻인지 맞혀보세요.</div>
      <div style={{fontFamily: FONT_SOUND, fontSize: T.size.word, color: T.color.gold, fontWeight: 600, letterSpacing: -3}}>I gotta do it</div>
      <div style={{marginTop: 58, width: 280, height: 8, borderRadius: 99, background: "#2E4664", overflow: "hidden"}}><div style={{width: `${Math.min(100, Math.max(0, ((frame - 900) / 90) * 100))}%`, height: "100%", background: T.color.cyan}} /></div>
      {quizRemaining && <div style={{marginTop: 22, display: "flex", alignItems: "center", gap: 13, color: T.color.cyan, fontWeight: 900, letterSpacing: 2}}><span style={{fontSize: 18}}>THINK</span><span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 99, border: `2px solid ${T.color.cyan}`, fontSize: 27, color: T.color.text}}>{quizRemaining}</span></div>}
    </Center></Phase>

    <Phase from={990} to={1280}><SectionBand step="05" label="RECAP"/><Center>
      <div style={{fontSize: T.size.support, color: T.color.muted, fontWeight: 700, marginBottom: 35, opacity: reveal}}>I got to do it</div>
      <div style={{fontFamily: FONT_SOUND, fontSize: T.size.word, color: T.color.gold, fontWeight: 600, letterSpacing: -3, transform: `scale(${0.82 + reveal * 0.18})`}}>got to → gotta</div>
      <div style={{marginTop: 45, fontSize: T.size.caption, color: T.color.text, fontWeight: 700, opacity: reveal}}>“저거 해야 해요.” 기능어가 리듬 속에서 한 덩어리가 됩니다.</div>
      <PulseRings from={1016} x={960} y={540} color={T.color.gold} count={2} gap={48} />
    </Center></Phase>
    <Phase from={1280} to={1380}><OutroCard /></Phase>
    <SectionTransition at={293} color={T.color.cyan} />
    <SectionTransition at={502} color={T.color.gold} />
    <SectionTransition at={719} color={T.color.cyan} />
    <SectionTransition at={990} color={T.color.gold} />
    <CaptionLayer />
  </AbsoluteFill>;
};

export const Season2Ep1CorePassComposition: React.FC = () => <Composition id="season2-ep1-core-pass" component={CorePass} durationInFrames={T.duration} fps={T.fps} width={T.width} height={T.height} />;
