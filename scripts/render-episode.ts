import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { DEFAULT_EPISODE } from '../src/data/defaultEpisode';
import { ensureDemoAssets } from './generate-demo-audio';
import { EpisodeData } from '../src/types/animation';

export async function renderEpisodeToMp4(
  episode: EpisodeData = DEFAULT_EPISODE,
  onProgress?: (progressPercent: number, stage: string) => void
): Promise<string> {
  ensureDemoAssets();

  const entryPoint = path.resolve(process.cwd(), 'src', 'remotion', 'index.ts');
  const publicDir = path.resolve(process.cwd(), 'public');
  const outDir = path.resolve(process.cwd(), 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const outputPath = path.join(outDir, `${episode.id}.mp4`);

  onProgress?.(5, 'Bundling Remotion composition...');
  const bundleLocation = await bundle({
    entryPoint,
    publicDir,
    onProgress: (p) => {
      onProgress?.(Math.round(5 + p * 0.2), 'Bundling Remotion composition...');
    },
  });

  onProgress?.(25, 'Selecting composition metadata (1080x1920 @ 30fps H.264)...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'OtakKonsletEpisode',
    inputProps: { episode },
  });

  onProgress?.(30, 'Rendering frames & encoding H.264 MP4 with audio...');
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { episode },
    pixelFormat: 'yuv420p',
    overwrite: true,
    onProgress: ({ progress }) => {
      const pct = Math.min(99, Math.round(30 + progress * 70));
      onProgress?.(pct, `Rendering H.264 MP4 (${Math.round(progress * 100)}%)...`);
    },
  });

  onProgress?.(100, 'MP4 export completed');
  return outputPath;
}

if (process.argv[1] && process.argv[1].includes('render-episode')) {
  const customJsonArg =
    process.argv[2] ||
    path.resolve(process.cwd(), 'data', 'episodes', `${DEFAULT_EPISODE.id}.json`);
  let episodeToRender: EpisodeData = DEFAULT_EPISODE;

  if (customJsonArg && fs.existsSync(customJsonArg)) {
    episodeToRender = JSON.parse(fs.readFileSync(customJsonArg, 'utf-8'));
  }

  console.log(`[Otak Konslet Studio] Starting MP4 export for "${episodeToRender.title}"...`);
  renderEpisodeToMp4(episodeToRender, (pct, stage) => {
    process.stdout.write(`\r[${pct}%] ${stage}          `);
  })
    .then((outFile) => {
      console.log(`\n[Otak Konslet Studio] Successfully exported MP4 to: ${outFile}`);
    })
    .catch((err) => {
      console.error('\n[Otak Konslet Studio] Render error:', err);
      process.exit(1);
    });
}

