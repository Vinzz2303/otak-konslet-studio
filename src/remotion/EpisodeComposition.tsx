import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { DEFAULT_EPISODE } from '../data/defaultEpisode';
import {
  BodyMovementType,
  EpisodeData,
  HeadMovementType,
} from '../types/animation';
import { resolveCharacterLipSync } from '../utils/lipSync';
import { CharacterPuppet } from './components/CharacterPuppet';
import { EnvironmentStage } from './components/EnvironmentStage';

export interface EpisodeCompositionProps {
  episode?: EpisodeData;
}

function resolveAudioSrc(fileUrl: string): string {
  if (!fileUrl) return '';
  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://') ||
    fileUrl.startsWith('data:') ||
    fileUrl.startsWith('blob:')
  ) {
    return fileUrl;
  }
  // Remove cache-busting query strings before resolving bundled public assets.
  const cleanPath = (fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl).split(/[?#]/)[0];
  return staticFile(cleanPath);
}

export const EpisodeComposition: React.FC<EpisodeCompositionProps> = ({
  episode = DEFAULT_EPISODE,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  // 1. Resolve Active Scene
  const activeScene =
    episode.scenes.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    ) || episode.scenes[episode.scenes.length - 1];

  const activeBackground =
    episode.backgrounds.find((b) => b.id === activeScene?.backgroundId) ||
    episode.backgrounds[0];

  // 2. Resolve Active Camera Instruction
  const activeCam =
    episode.camera.find(
      (c) => currentTime >= c.startTime && currentTime < c.endTime
    ) || episode.camera[0];

  let camZoom = 1;
  let camPanX = 0;
  let camPanY = 0;
  let shakeX = 0;
  let shakeY = 0;
  let transitionOpacity = 1;
  let glitchFlashOpacity = 0;

  if (activeCam) {
    const camDuration = Math.max(0.1, activeCam.endTime - activeCam.startTime);
    const camProgress = Math.min(
      1,
      Math.max(0, (currentTime - activeCam.startTime) / camDuration)
    );

    camZoom = interpolate(
      camProgress,
      [0, 1],
      [activeCam.startZoom, activeCam.endZoom],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    camPanX = interpolate(
      camProgress,
      [0, 1],
      [activeCam.startPanX, activeCam.endPanX],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    camPanY = interpolate(
      camProgress,
      [0, 1],
      [activeCam.startPanY, activeCam.endPanY],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    if (
      (activeCam.type === 'shake' || activeCam.type === 'zoom_and_shake') &&
      activeCam.shakeIntensity > 0
    ) {
      // Dampen shake slightly after initial jolt
      const damper = interpolate(camProgress, [0, 0.4, 1], [1.2, 0.85, 0.35]);
      shakeX =
        Math.sin(frame * 1.85) *
        Math.cos(frame * 0.9) *
        activeCam.shakeIntensity *
        damper;
      shakeY =
        Math.cos(frame * 2.15) *
        activeCam.shakeIntensity *
        0.75 *
        damper;
    }

    const localSec = currentTime - activeCam.startTime;
    const remSec = activeCam.endTime - currentTime;

    if (activeCam.transitionIn === 'fade_from_black' && localSec < 0.7) {
      transitionOpacity = interpolate(localSec, [0, 0.7], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
    if (activeCam.transitionIn === 'glitch_flash' && localSec < 0.25) {
      glitchFlashOpacity = interpolate(localSec, [0, 0.25], [0.65, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
    if (activeCam.transitionOut === 'cross_dissolve' && remSec < 0.35) {
      transitionOpacity = interpolate(remSec, [0, 0.35], [0.35, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  // Check Cut to Black trigger
  const isCutToBlack =
    activeScene?.cutToBlackAtSecond !== undefined &&
    currentTime >= activeScene.cutToBlackAtSecond;

  // 3. Active Dialogue for Subtitles
  const currentDialogue = episode.dialogue.find(
    (d) => currentTime >= d.startTime && currentTime <= d.startTime + d.duration
  );

  // Sort characters in scene by zIndex
  const sortedPlacements = [...(activeScene?.characters || [])].sort(
    (a, b) => a.zIndex - b.zIndex
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* ==================================================================
          AUDIO ENGINE (Voice Recordings, Ambience & SFX Stems)
         ================================================================== */}
      {episode.audioTracks.map((track) => {
        const startFrame = Math.max(0, Math.round(track.startTime * fps));
        const durationFrames = Math.max(1, Math.round(track.duration * fps));
        const src = resolveAudioSrc(track.fileUrl);
        if (!src) return null;

        return (
          <Sequence
            key={track.id}
            from={startFrame}
            durationInFrames={durationFrames}
            name={`Audio: ${track.label}`}
          >
            <Audio src={src} volume={track.volume} />
          </Sequence>
        );
      })}

      {/* ==================================================================
          2D CAMERA VIEWPORT RIG (Zoom, Pan, Shake, Framing)
         ================================================================== */}
      {!isCutToBlack && activeScene && activeBackground && (
        <AbsoluteFill
          style={{
            opacity: transitionOpacity,
            transform: `scale(${camZoom}) translate(${camPanX + shakeX}px, ${
              camPanY + shakeY
            }px)`,
            transformOrigin: '50% 55%',
          }}
        >
          {/* Layer A: Environment Stage Background */}
          <EnvironmentStage
            background={activeBackground}
            scene={activeScene}
            frame={frame}
            fps={fps}
          />

          {/* Layer B: Articulated 2D Character Puppets */}
          {sortedPlacements.map((placement) => {
            const charDef = episode.characters.find(
              (c) => c.id === placement.characterId
            );
            if (!charDef) return null;

            const sceneDuration = Math.max(
              0.1,
              activeScene.endTime - activeScene.startTime
            );
            const sceneProgress = Math.min(
              1,
              Math.max(
                0,
                (currentTime - activeScene.startTime) / sceneDuration
              )
            );

            // If walking in Scene 2, finish walk translation in the first 35% of the scene so Jange stops to speak
            const moveProgress =
              placement.baseBodyAction === 'walk'
                ? Math.min(1, sceneProgress / 0.35)
                : sceneProgress;

            const posX = interpolate(
              moveProgress,
              [0, 1],
              [placement.startX, placement.endX]
            );
            const posY = interpolate(
              moveProgress,
              [0, 1],
              [placement.startY, placement.endY]
            );
            const charScale = interpolate(
              moveProgress,
              [0, 1],
              [placement.startScale, placement.endScale]
            );

            // Resolve Lip-Sync & Active Dialogue Overrides
            const lipSync = resolveCharacterLipSync(
              charDef.id,
              currentTime,
              episode.dialogue,
              placement.baseEmotion
            );

            const effectiveEmotion = lipSync.activeDialogue
              ? lipSync.activeDialogue.emotion
              : placement.baseEmotion;

            let effectiveBody: BodyMovementType = placement.baseBodyAction;
            if (placement.baseBodyAction === 'walk' && moveProgress >= 1) {
              effectiveBody = 'idle';
            }
            if (lipSync.activeDialogue) {
              effectiveBody =
                lipSync.activeDialogue.animationInstructions.bodyMovement;
            }

            let effectiveHead: HeadMovementType = placement.baseHeadMovement;
            if (lipSync.activeDialogue) {
              effectiveHead =
                lipSync.activeDialogue.animationInstructions.headMovement;
            }

            const pixelX = (posX / 100) * width;
            const pixelY = (posY / 100) * height;

            return (
              <div
                key={`${activeScene.id}-${charDef.id}`}
                style={{
                  position: 'absolute',
                  left: pixelX,
                  top: pixelY,
                  transform: 'translate(-50%, -100%)',
                  zIndex: placement.zIndex,
                }}
              >
                <CharacterPuppet
                  character={charDef}
                  frame={frame}
                  fps={fps}
                  emotion={effectiveEmotion}
                  headMovement={effectiveHead}
                  bodyMovement={effectiveBody}
                  viseme={lipSync.viseme}
                  mouthOpenness={lipSync.openness}
                  isSpeaking={lipSync.isSpeaking}
                  activeSyllable={lipSync.activeSyllable}
                  flipX={placement.flipX}
                  scale={charScale}
                  showPlaceholderBadge={episode.showPlaceholderBadges}
                />
              </div>
            );
          })}
        </AbsoluteFill>
      )}

      {/* ==================================================================
          TRANSITION & CINEMATIC OVERLAYS
         ================================================================== */}
      {/* Glitch Flash on Scene 4 Anomaly */}
      {glitchFlashOpacity > 0 && !isCutToBlack && (
        <AbsoluteFill
          style={{
            backgroundColor: '#EF4444',
            opacity: glitchFlashOpacity,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Establishing Location Stamp (0.4s - 4.4s) */}
      {currentTime >= 0.4 && currentTime <= 4.4 && !isCutToBlack && (
        <div
          style={{
            position: 'absolute',
            top: 110,
            left: 64,
            right: 64,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            opacity: interpolate(
              currentTime,
              [0.4, 0.9, 3.8, 4.4],
              [0, 1, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            ),
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(15, 23, 42, 0.88)',
              borderLeft: '5px solid #10B981',
              padding: '12px 20px',
              borderRadius: '0 8px 8px 0',
              width: 'fit-content',
            }}
          >
            <span
              style={{
                color: '#10B981',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              LOKASI //
            </span>
            <span
              style={{
                color: '#F8FAFC',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {episode.location}
            </span>
          </div>
        </div>
      )}

      {/* ==================================================================
          DIALOGUE SUBTITLE / CAPTION OVERLAY
         ================================================================== */}
      {currentDialogue && !isCutToBlack && (
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: 64,
            right: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            zIndex: 30,
          }}
        >
          {/* Speaker Tag */}
          <div
            style={{
              backgroundColor:
                currentDialogue.speakerId === 'cashier_machine'
                  ? '#DC2626'
                  : currentDialogue.speakerId === 'jange'
                  ? '#2563EB'
                  : '#0D9488',
              color: '#FFFFFF',
              padding: '6px 18px',
              borderRadius: '8px 8px 0 0',
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {currentDialogue.speakerName}
          </div>

          {/* Dialogue Box */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: `2px solid ${
                currentDialogue.speakerId === 'cashier_machine'
                  ? '#EF4444'
                  : 'rgba(255, 255, 255, 0.22)'
              }`,
              padding: '22px 32px',
              borderRadius: 14,
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
              maxWidth: 920,
            }}
          >
            <div
              style={{
                color:
                  currentDialogue.speakerId === 'cashier_machine'
                    ? '#FCA5A5'
                    : '#F8FAFC',
                fontSize: 38,
                fontWeight: 700,
                lineHeight: 1.32,
              }}
            >
              “{currentDialogue.text}”
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          SAFE AREA & PRODUCTION WATERMARK OVERLAY (Optional Toggle)
         ================================================================== */}
      {episode.showPlaceholderBadges && !isCutToBlack && (
        <div
          style={{
            position: 'absolute',
            top: 38,
            left: 44,
            right: 44,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 40,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.78)',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              color: '#E2E8F0',
              padding: '6px 14px',
              borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 16,
            }}
          >
            {episode.episodeCode} • SCENE {activeScene?.sceneNumber || 1} •{' '}
            {currentTime.toFixed(2)}s / {episode.duration.toFixed(1)}s
          </div>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.9)',
              color: '#0F172A',
              padding: '6px 14px',
              borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            MVP PLACEHOLDER RIGS
          </div>
        </div>
      )}

      {/* License-aware burn-in: preview-only audio must never look publication-ready. */}
      {episode.audioTracks.some(
        (track) => track.licenseStatus === 'non_commercial_preview' ||
          track.licenseStatus === 'placeholder_synth'
      ) && (
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 48,
            right: 48,
            background: 'rgba(127, 29, 29, 0.88)',
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1,
            textAlign: 'center',
            padding: '12px 18px',
            borderRadius: 8,
            zIndex: 99,
            pointerEvents: 'none',
          }}
        >
          DEMO NONKOMERSIAL — GANTI AUDIO SEBELUM PUBLIKASI
        </div>
      )}
      {episode.showSafeAreaGuides && (
        <AbsoluteFill
          style={{
            border: '2px dashed rgba(56, 189, 248, 0.45)',
            margin: '96px 64px',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

