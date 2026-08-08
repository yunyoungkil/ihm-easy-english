import { CalculateMetadataFunction, Composition, Series } from "remotion";
import { SubtitleCard } from "./SubtitleCard";
import { FRAMES_PER_CARD, subtitles } from "./data/subtitles";

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {
    durationInFrames: subtitles.length * FRAMES_PER_CARD,
  };
};

export const SubtitleCardsComposition = () => {
  return (
    <Composition
      id="SubtitleCards"
      component={SubtitleCardsVideo}
      durationInFrames={subtitles.length * FRAMES_PER_CARD}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const SubtitleCardsVideo: React.FC<Props> = () => {
  return (
    <Series>
      {subtitles.map((entry, index) => (
        <Series.Sequence key={index} durationInFrames={FRAMES_PER_CARD}>
          <SubtitleCard entry={entry} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
