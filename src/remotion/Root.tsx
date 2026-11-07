import React from 'react';
import { Composition } from 'remotion';
import { DEFAULT_EPISODE } from '../data/defaultEpisode';
import { EpisodeComposition, EpisodeCompositionProps } from './EpisodeComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OtakKonsletEpisode"
        component={EpisodeComposition as React.FC<Record<string, unknown>>}
        durationInFrames={Math.round(DEFAULT_EPISODE.duration * DEFAULT_EPISODE.fps)}
        fps={DEFAULT_EPISODE.fps}
        width={DEFAULT_EPISODE.width}
        height={DEFAULT_EPISODE.height}
        defaultProps={
          {
            episode: DEFAULT_EPISODE,
          } satisfies EpisodeCompositionProps
        }
        calculateMetadata={async ({ props }) => {
          const ep = (props as EpisodeCompositionProps)?.episode || DEFAULT_EPISODE;
          return {
            durationInFrames: Math.max(30, Math.round(ep.duration * ep.fps)),
            fps: ep.fps || 30,
            width: ep.width || 1080,
            height: ep.height || 1920,
          };
        }}
      />
    </>
  );
};

