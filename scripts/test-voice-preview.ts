import fs from 'node:fs';
import path from 'node:path';
import { synthesizeCharacterDialogueToWav } from '../server/ttsService';
import { DEFAULT_EPISODE } from '../src/data/defaultEpisode';
import { CHARACTER_VOICE_PROFILES, TTS_MODEL_AUDIT_LOG } from '../src/data/voiceProfiles';

async function runVoicePreviewVerification() {
  console.log('================================================================');
  console.log(' OTAK KONSLET STUDIO — CHARACTER VOICE PREVIEW & TTS AUDIT TEST ');
  console.log('================================================================\n');

  console.log('1. TTS MODEL INVESTIGATION & COMMERCIAL LICENSE AUDIT:');
  for (const item of TTS_MODEL_AUDIT_LOG) {
    console.log(
      `   - ${item.modelName}: [${item.verdict}] | ID Support: ${item.indonesianSupport} | License: ${item.license}`
    );
  }
  console.log('');

  // 2. Test Jange Voice Previews (Sleepy/Confused Gen Z Male)
  console.log('2. TESTING JANGE VOICE PROFILE (voice_jange_genz):');
  const jangePreview1 = await synthesizeCharacterDialogueToWav({
    characterId: 'jange',
    text: 'Bang, kok toko lu doang yang nyala?',
    emotion: 'confused',
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'preview_jange_confused.wav',
  });
  console.log(
    `   [OK] Jange (confused): ${jangePreview1.filePath} (${jangePreview1.durationSec}s, ${jangePreview1.phonemes.length} synced viseme cues)`
  );

  const jangePreviewWhisper = await synthesizeCharacterDialogueToWav({
    characterId: 'jange',
    text: 'Ssst... Bang, denger suara dengung dari kulkas belakang kagak?',
    emotion: 'whispering',
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'preview_jange_whispering.wav',
  });
  console.log(
    `   [OK] Jange (whispering): ${jangePreviewWhisper.filePath} (${jangePreviewWhisper.durationSec}s)`
  );

  // 3. Test Bang Dullah Voice Previews (Relaxed Adult Male + Jawa Serang Dialect)
  console.log('\n3. TESTING BANG DULLAH VOICE PROFILE (voice_dullah_serang):');
  const dullahPreview1 = await synthesizeCharacterDialogueToWav({
    characterId: 'bang_dullah',
    text: 'Gue juga kagak ngerti, Nge.',
    emotion: 'confused',
    includeJawaSerang: false,
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'preview_dullah_standard.wav',
  });
  console.log(
    `   [OK] Bang Dullah (standard): ${dullahPreview1.filePath} (${dullahPreview1.durationSec}s, ${dullahPreview1.phonemes.length} synced viseme cues)`
  );

  const dullahPreviewSerang = await synthesizeCharacterDialogueToWav({
    characterId: 'bang_dullah',
    text: 'Gue juga kagak ngerti, Nge. Dari magrib lampu kampung mati kabeh, geh.',
    emotion: 'confused',
    includeJawaSerang: true,
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'preview_dullah_jawa_serang.wav',
  });
  console.log(
    `   [OK] Bang Dullah (Jawa Serang): ${dullahPreviewSerang.filePath} (${dullahPreviewSerang.durationSec}s)`
  );

  // 4. Synchronize Episode 01 Dialogue Stems & Update Episode JSON Timing
  console.log('\n4. GENERATING & SYNCHRONIZING EPISODE 01 DIALOGUE AUDIO STEMS:');
  const epDlg1 = await synthesizeCharacterDialogueToWav({
    characterId: 'jange',
    text: DEFAULT_EPISODE.dialogue[0].text,
    emotion: 'confused',
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'dlg_01_jange.wav',
  });
  const epDlg2 = await synthesizeCharacterDialogueToWav({
    characterId: 'bang_dullah',
    text: DEFAULT_EPISODE.dialogue[1].text,
    emotion: 'confused',
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'dlg_02_dullah.wav',
  });
  const epDlg3 = await synthesizeCharacterDialogueToWav({
    characterId: 'cashier_machine',
    text: DEFAULT_EPISODE.dialogue[2].text,
    emotion: 'alert',
    engineId: 'local_mms_vits_onnx',
    outputFileName: 'dlg_03_machine.wav',
  });

  console.log(`   - dlg_01_jange.wav: ${epDlg1.durationSec}s (${epDlg1.phonemes.length} visemes)`);
  console.log(`   - dlg_02_dullah.wav: ${epDlg2.durationSec}s (${epDlg2.phonemes.length} visemes)`);
  console.log(`   - dlg_03_machine.wav: ${epDlg3.durationSec}s (${epDlg3.phonemes.length} visemes)`);

  // Update data/episodes/ep01-minimarket-ciruas.json with the exact neural TTS durations & synced phonemes
  const updatedEpisode = structuredClone(DEFAULT_EPISODE);
  updatedEpisode.characters = updatedEpisode.characters.map((c) => ({
    ...c,
    voiceProfile: CHARACTER_VOICE_PROFILES[c.id],
  }));

  updatedEpisode.dialogue[0].duration = epDlg1.durationSec;
  updatedEpisode.dialogue[0].phonemes = epDlg1.phonemes;
  updatedEpisode.dialogue[0].ttsEngineUsed = epDlg1.engineUsed;
  updatedEpisode.dialogue[0].voiceProfileId = 'voice_jange_genz';

  updatedEpisode.dialogue[1].duration = epDlg2.durationSec;
  updatedEpisode.dialogue[1].phonemes = epDlg2.phonemes;
  updatedEpisode.dialogue[1].ttsEngineUsed = epDlg2.engineUsed;
  updatedEpisode.dialogue[1].voiceProfileId = 'voice_dullah_serang';

  updatedEpisode.dialogue[2].duration = epDlg3.durationSec;
  updatedEpisode.dialogue[2].phonemes = epDlg3.phonemes;
  updatedEpisode.dialogue[2].ttsEngineUsed = epDlg3.engineUsed;
  updatedEpisode.dialogue[2].voiceProfileId = 'voice_pos_terminal';

  // Sync audioTracks durations with dialogue durations
  updatedEpisode.audioTracks = updatedEpisode.audioTracks.map((t) => {
    if (t.id === 'aud_dlg_01_jange') {
      return {
        ...t,
        duration: epDlg1.durationSec,
        licenseStatus: 'non_commercial_preview',
        ttsEngineId: epDlg1.engineUsed,
        notes: 'Generated via Local Indonesian Neural VITS (mms-tts-ind ONNX) + Jange Gen-Z Voice Profile DSP.',
      };
    }
    if (t.id === 'aud_dlg_02_dullah') {
      return {
        ...t,
        duration: epDlg2.durationSec,
        licenseStatus: 'non_commercial_preview',
        ttsEngineId: epDlg2.engineUsed,
        notes: 'Generated via Local Indonesian Neural VITS (mms-tts-ind ONNX) + Bang Dullah Adult Male Baritone DSP.',
      };
    }
    if (t.id === 'aud_dlg_03_machine') {
      return {
        ...t,
        duration: epDlg3.durationSec,
        licenseStatus: 'non_commercial_preview',
        ttsEngineId: epDlg3.engineUsed,
        notes: 'Generated via Local Indonesian Neural VITS (mms-tts-ind ONNX) + POS Terminal Ring-Modulation DSP.',
      };
    }
    return t;
  });

  // Add TTS Model License Audit entry to licensingChecklist
  const hasTtsChecklist = updatedEpisode.licensingChecklist.some(
    (item) => item.id === 'lic_tts_model'
  );
  if (!hasTtsChecklist) {
    updatedEpisode.licensingChecklist.push({
      id: 'lic_tts_model',
      assetName: 'Local Indonesian Neural VITS TTS (facebook/mms-tts-ind ONNX)',
      category: 'tts_model',
      licenseType: 'CC-BY-NC 4.0 (Non-Commercial TTS)',
      commercialSafe: false,
      isFinalProductionAsset: false,
      ownerOrSource: 'Meta MMS-TTS (CC-BY-NC 4.0) / Switchable to Commercial API or Human Voice',
      verificationNotes:
        'Kokoro-82M (no Indonesian) and Piper (single flat voice, unverified dataset) were audited and rejected. Local MMS-TTS ONNX provides natural Indonesian preview; switch to OpenAI/ElevenLabs Commercial API or imported WAV voice actors before commercial release.',
    });
  }

  const epJsonPath = path.resolve(
    process.cwd(),
    'data',
    'episodes',
    `${updatedEpisode.id}.json`
  );
  fs.writeFileSync(epJsonPath, JSON.stringify(updatedEpisode, null, 2), 'utf-8');
  console.log(`\n[SUCCESS] Voice previews verified and synced to ${epJsonPath}`);
}

runVoicePreviewVerification().catch((err) => {
  console.error('Voice preview verification failed:', err);
  process.exit(1);
});

