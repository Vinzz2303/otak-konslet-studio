import React from 'react';
import {
  BodyMovementType,
  CharacterDefinition,
  EmotionState,
  HeadMovementType,
  VisemeCode,
} from '../../types/animation';

export interface CharacterPuppetProps {
  character: CharacterDefinition;
  frame: number;
  fps: number;
  emotion: EmotionState;
  headMovement: HeadMovementType;
  bodyMovement: BodyMovementType;
  viseme: VisemeCode;
  mouthOpenness: number;
  isSpeaking: boolean;
  activeSyllable?: string;
  flipX?: boolean;
  scale?: number;
  showPlaceholderBadge?: boolean;
}

/**
 * Deterministic natural eye-blink generator based on frame & character seed
 */
function computeBlinkAmount(frame: number, characterId: string, blinkMultiplier = 1): number {
  const seed = characterId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const period = Math.max(45, Math.round(105 / Math.max(0.4, blinkMultiplier)));
  const cyclePos = (frame + seed * 17) % period;
  if (cyclePos >= 0 && cyclePos < 5) {
    // 5-frame blink curve: 0 -> 0.6 -> 1.0 -> 0.7 -> 0.2
    const curve = [0.25, 0.75, 1.0, 0.7, 0.2];
    return curve[cyclePos] ?? 0;
  }
  return 0;
}

export const CharacterPuppet: React.FC<CharacterPuppetProps> = ({
  character,
  frame,
  fps,
  emotion,
  headMovement,
  bodyMovement,
  viseme,
  mouthOpenness,
  isSpeaking,
  activeSyllable,
  flipX = false,
  scale = 1,
  showPlaceholderBadge = true,
}) => {
  const t = frame / fps;

  // Handle Cashier Machine POS Terminal Rig
  if (character.rigType === 'machine_terminal_2d') {
    const isActivated = bodyMovement === 'activate_pulse' || emotion === 'alert' || isSpeaking;
    const pulse = isActivated ? Math.sin(t * 18) * 0.5 + 0.5 : 0;
    const jitterX = isActivated ? Math.sin(frame * 1.9) * 1.6 : 0;

    return (
      <div
        style={{
          transform: `scale(${scale}) scaleX(${flipX ? -1 : 1}) translateX(${jitterX}px)`,
          transformOrigin: 'bottom center',
          position: 'relative',
          width: 260,
          height: 290,
        }}
      >
        <svg viewBox="0 0 260 290" width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Layer 1: Counter Shadow */}
          <ellipse cx="130" cy="272" rx="95" ry="12" fill="rgba(0,0,0,0.45)" />

          {/* Layer 2: Cash Drawer Base Unit */}
          <rect
            x="35"
            y="215"
            width="190"
            height="54"
            rx="6"
            fill="#1E293B"
            stroke="#475569"
            strokeWidth="3"
          />
          <rect x="48" y="230" width="110" height="24" rx="3" fill="#0F172A" />
          <circle cx="195" cy="242" r="7" fill={isActivated ? '#EF4444' : '#64748B'} />

          {/* Layer 3: Thermal Receipt Printer + Animated Paper Slip */}
          <rect
            x="45"
            y="168"
            width="58"
            height="50"
            rx="5"
            fill="#334155"
            stroke="#475569"
            strokeWidth="2.5"
          />
          {/* Emerging receipt paper */}
          <g
            transform={`translate(56, ${
              isActivated ? 132 - Math.min(26, (frame % 90) * 0.45) : 158
            })`}
          >
            <rect
              x="0"
              y="0"
              width="36"
              height={isActivated ? 42 : 14}
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {isActivated && (
              <>
                <line x1="5" y1="8" x2="31" y2="8" stroke="#EF4444" strokeWidth="2" />
                <line x1="5" y1="15" x2="26" y2="15" stroke="#334155" strokeWidth="1.5" />
                <line x1="5" y1="22" x2="30" y2="22" stroke="#EF4444" strokeWidth="2" />
              </>
            )}
          </g>

          {/* Layer 4: Monitor Neck Joint */}
          <rect x="132" y="185" width="26" height="34" fill="#334155" />

          {/* Layer 5: CRT / LCD Monitor Housing */}
          <g transform={`rotate(${isActivated ? Math.sin(t * 14) * 1.2 : 0} 145 125)`}>
            <rect
              x="78"
              y="58"
              width="138"
              height="132"
              rx="10"
              fill="#334155"
              stroke={isActivated ? '#EF4444' : '#64748B'}
              strokeWidth="3.5"
            />
            {/* Monitor Inner Screen */}
            <rect
              x="90"
              y="70"
              width="114"
              height="96"
              rx="6"
              fill={isActivated ? '#2A080C' : '#06281E'}
              stroke={isActivated ? '#F87171' : '#10B981'}
              strokeWidth="2"
            />

            {/* Screen Top Status Bar */}
            <rect
              x="94"
              y="74"
              width="106"
              height="16"
              rx="3"
              fill={isActivated ? '#991B1B' : '#047857'}
            />
            <text
              x="147"
              y="85"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              {isActivated ? 'ERR // AUTO-CALL' : 'CIRUAS POS v2.4'}
            </text>

            {/* Layer 6: Screen Viseme / Audio Waveform Display */}
            {isActivated ? (
              <g>
                {/* Animated Voice Bars synced with mouthOpenness */}
                {[-36, -24, -12, 0, 12, 24, 36].map((offset, idx) => {
                  const barHeight = Math.max(
                    6,
                    (12 + Math.sin(t * 22 + idx * 1.3) * 18) * (0.35 + mouthOpenness * 0.95)
                  );
                  return (
                    <rect
                      key={idx}
                      x={145 + offset - 3}
                      y={122 - barHeight / 2}
                      width="6"
                      height={barHeight}
                      rx="2"
                      fill={idx % 2 === 0 ? '#EF4444' : '#F59E0B'}
                    />
                  );
                })}
                <text
                  x="147"
                  y="156"
                  textAnchor="middle"
                  fill="#FCA5A5"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  TARGET: JANGE
                </text>
              </g>
            ) : (
              <g>
                <line x1="102" y1="118" x2="192" y2="118" stroke="#10B981" strokeWidth="2" strokeDasharray="4 3" />
                <text
                  x="147"
                  y="138"
                  textAnchor="middle"
                  fill="#6EE7B7"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  READY // RP 0
                </text>
              </g>
            )}

            {/* Top Emergency Beacon LED */}
            <circle
              cx="147"
              cy="48"
              r={isActivated ? 9 + pulse * 3 : 6}
              fill={isActivated ? '#EF4444' : '#10B981'}
              opacity={isActivated ? 0.95 : 0.7}
            />
          </g>

          {/* Layer 7: Barcode Scanner Stand & Red Laser Beam */}
          <path d="M 28 215 L 18 165 L 38 158 L 42 170 Z" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          {isActivated && (
            <polygon
              points="18,162 -65,120 -65,195"
              fill="rgba(239, 68, 68, 0.28)"
              stroke="#EF4444"
              strokeWidth="1"
            />
          )}
        </svg>

        {showPlaceholderBadge && character.isPlaceholderAsset && (
          <div
            style={{
              position: 'absolute',
              top: -18,
              left: '50%',
              transform: `translateX(-50%) scaleX(${flipX ? -1 : 1})`,
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(239, 68, 68, 0.6)',
              color: '#F8FAFC',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              whiteSpace: 'nowrap',
            }}
          >
            [POS RIG] {viseme} {isActivated ? 'ACTIVE' : 'IDLE'}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // HUMANOID LAYERED 2D PUPPET RIG (Jange & Bang Dullah)
  // ============================================================================
  const isJange = character.id === 'jange';
  const isWalking = bodyMovement === 'walk';
  const isFrozen = bodyMovement === 'freeze' || headMovement === 'freeze';
  const isShrugging = bodyMovement === 'shrug';
  const isPointing = bodyMovement === 'point';

  // Walk & Idle kinematics
  const walkCycle = isWalking ? t * 7.5 : 0;
  const strideLeftDeg = isWalking ? Math.sin(walkCycle) * 24 : 0;
  const strideRightDeg = isWalking ? -Math.sin(walkCycle) * 24 : 0;
  const walkBounceY = isWalking ? Math.abs(Math.cos(walkCycle)) * -9 : 0;

  // Breathing & freeze tremor
  const breathY = isFrozen ? 0 : Math.sin(t * 2.6) * 2.5;
  const freezeTremorX = isFrozen ? Math.sin(frame * 2.4) * 1.4 : 0;

  // Head articulation
  let headRotateDeg = 0;
  let headOffsetX = 0;
  let headOffsetY = 0;

  if (headMovement === 'subtle_bob' && !isFrozen) {
    headRotateDeg = Math.sin(t * 2.2) * 2.2;
    headOffsetY = Math.cos(t * 2.2) * 1.5;
  } else if (headMovement === 'tilt_confused') {
    headRotateDeg = -9 + Math.sin(t * 3.0) * 2.5;
    headOffsetX = -3;
  } else if (headMovement === 'nod') {
    headOffsetY = Math.sin(t * 8.5) * 4.5;
    headRotateDeg = Math.sin(t * 8.5) * 4;
  } else if (headMovement === 'look_around') {
    headOffsetX = Math.sin(t * 3.2) * 8;
    headRotateDeg = Math.sin(t * 3.2) * 5;
  } else if (headMovement === 'double_take') {
    headOffsetX = Math.sin(t * 14) > 0 ? -6 : 4;
    headRotateDeg = -5;
  }

  // Arm articulation
  let leftArmDeg = isWalking ? -strideLeftDeg * 0.75 : Math.sin(t * 2.1) * 3;
  let rightArmDeg = isWalking ? -strideRightDeg * 0.75 : -Math.sin(t * 2.1) * 3;

  if (isPointing) {
    rightArmDeg = -68 + Math.sin(t * 5) * 4; // Raised pointing arm
    leftArmDeg = 8;
  } else if (isShrugging) {
    leftArmDeg = 38 + Math.sin(t * 4) * 4;
    rightArmDeg = -38 - Math.sin(t * 4) * 4;
  } else if (bodyMovement === 'lean_counter') {
    leftArmDeg = 18;
    rightArmDeg = -15;
  } else if (isFrozen) {
    leftArmDeg = 22;
    rightArmDeg = -22;
  }

  // Eye Blinking & Eyelid State
  const naturalBlink = isFrozen ? 0 : computeBlinkAmount(frame, character.id);
  let upperEyelidDrop = naturalBlink * 16;
  if (naturalBlink < 0.2) {
    if (emotion === 'sleepy') upperEyelidDrop = 8.5; // Jange's sleepy Gen-Z eyes
    else if (emotion === 'whispering') upperEyelidDrop = 6.5; // Half-lidded secretive look
    else if (emotion === 'confused') upperEyelidDrop = 4.5;
    else if (emotion === 'angry') upperEyelidDrop = 5.5;
    else if (emotion === 'calm') upperEyelidDrop = 3.5;
    else if (emotion === 'shocked' || emotion === 'scared' || emotion === 'surprised') upperEyelidDrop = 0;
  }

  const pupilRadius =
    emotion === 'shocked' || emotion === 'scared'
      ? 2.6
      : emotion === 'surprised'
      ? 3.4
      : 4.6;
  const pupilShiftX =
    headMovement === 'look_around' || emotion === 'whispering'
      ? Math.sin(t * 3.2) * 4.5
      : emotion === 'confused'
      ? 2.5
      : emotion === 'scared'
      ? Math.sin(frame * 2.1) * 1.5
      : 0;

  // Eyebrow angles
  let leftBrowDeg = 0;
  let rightBrowDeg = 0;
  let browOffsetY = 0;
  if (emotion === 'sleepy') {
    leftBrowDeg = -4;
    rightBrowDeg = 4;
    browOffsetY = 2;
  } else if (emotion === 'confused') {
    leftBrowDeg = -14;
    rightBrowDeg = 11; // Classic asymmetrical confused brow
    browOffsetY = -3;
  } else if (emotion === 'shocked' || emotion === 'scared') {
    leftBrowDeg = -12;
    rightBrowDeg = 12;
    browOffsetY = -8;
  } else if (emotion === 'surprised') {
    leftBrowDeg = -6;
    rightBrowDeg = 6;
    browOffsetY = -10;
  } else if (emotion === 'angry') {
    leftBrowDeg = 16; // Furrowed inward angry brows
    rightBrowDeg = -16;
    browOffsetY = 2;
  } else if (emotion === 'whispering') {
    leftBrowDeg = -6;
    rightBrowDeg = -6;
    browOffsetY = -2;
  } else if (emotion === 'calm') {
    leftBrowDeg = -2;
    rightBrowDeg = 2;
    browOffsetY = 0;
  }

  const { palette } = character;

  return (
    <div
      style={{
        transform: `scale(${scale}) scaleX(${flipX ? -1 : 1}) translateX(${freezeTremorX}px)`,
        transformOrigin: 'bottom center',
        position: 'relative',
        width: 300,
        height: 540,
      }}
    >
      <svg viewBox="0 0 300 540" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* ============================================================
            LAYER 01: GROUND SHADOW
           ============================================================ */}
        <ellipse
          cx="150"
          cy="518"
          rx={isWalking ? 64 : 58}
          ry="12"
          fill="rgba(0, 0, 0, 0.42)"
        />

        {/* Main Body Root Group (Walk Bounce + Breathing) */}
        <g transform={`translate(0, ${walkBounceY})`}>
          {/* ============================================================
              LAYER 02: BACK HAIR / HOOD BACK
             ============================================================ */}
          <g
            transform={`translate(${150 + headOffsetX * 0.6}, ${
              135 + breathY + headOffsetY * 0.6
            }) rotate(${headRotateDeg * 0.8})`}
          >
            {isJange ? (
              /* Jange messy back hair & oversized hoodie hood */
              <>
                <path
                  d="M -56 -20 C -68 -5, -66 35, -45 48 L 45 48 C 66 35, 68 -5, 56 -20 Z"
                  fill={palette.hair}
                />
                {/* Oversized Hoodie Rested Hood behind neck */}
                <path
                  d="M -58 38 C -72 55, -55 82, 0 82 C 55 82, 72 55, 58 38 Z"
                  fill={palette.secondaryTop}
                  stroke="#1E293B"
                  strokeWidth="2.5"
                />
              </>
            ) : (
              /* Bang Dullah neat back hair */
              <path
                d="M -46 -15 C -52 10, -48 34, -38 42 L 38 42 C 48 34, 52 10, 46 -15 Z"
                fill={palette.hair}
              />
            )}
          </g>

          {/* ============================================================
              LAYER 03 & 04: ARTICULATED LEGS & FOOTWEAR
             ============================================================ */}
          {/* Left Leg */}
          <g transform={`translate(124, 345) rotate(${strideLeftDeg})`}>
            {/* Skinny Jeans / Trousers */}
            <rect
              x="-16"
              y="0"
              width="32"
              height="145"
              rx="12"
              fill={palette.bottoms}
              stroke="#0F172A"
              strokeWidth="2.5"
            />
            {isJange ? (
              /* Jange ankle + Indonesian slide sandal */
              <g transform="translate(0, 142)">
                <rect x="-11" y="0" width="22" height="18" rx="4" fill={palette.skin} />
                {/* Sandal sole */}
                <rect x="-16" y="16" width="42" height="10" rx="5" fill="#451A03" />
                {/* Sandal strap */}
                <path d="M -8 16 C 0 4, 16 4, 20 16" fill={palette.footwear} stroke="#290F02" strokeWidth="2" />
              </g>
            ) : (
              /* Bang Dullah work shoe */
              <rect x="-16" y="142" width="40" height="22" rx="8" fill={palette.footwear} />
            )}
          </g>

          {/* Right Leg */}
          <g transform={`translate(176, 345) rotate(${strideRightDeg})`}>
            <rect
              x="-16"
              y="0"
              width="32"
              height="145"
              rx="12"
              fill={palette.bottoms}
              stroke="#0F172A"
              strokeWidth="2.5"
            />
            {isJange ? (
              <g transform="translate(0, 142)">
                <rect x="-11" y="0" width="22" height="18" rx="4" fill={palette.skin} />
                <rect x="-14" y="16" width="42" height="10" rx="5" fill="#451A03" />
                <path d="M -6 16 C 2 4, 18 4, 22 16" fill={palette.footwear} stroke="#290F02" strokeWidth="2" />
              </g>
            ) : (
              <rect x="-14" y="142" width="40" height="22" rx="8" fill={palette.footwear} />
            )}
          </g>

          {/* ============================================================
              LAYER 05 & 06: TORSO, CLOTHING & SLING BAG / APRON
             ============================================================ */}
          <g transform={`translate(150, ${265 + breathY})`}>
            {isJange ? (
              /* Jange: Oversized Hoodie + Kangaroo Pocket + Small Sling Bag */
              <>
                <path
                  d="M -58 -68 C -72 -20, -68 65, -54 92 L 54 92 C 68 65, 72 -20, 58 -68 Z"
                  fill={palette.primaryTop}
                  stroke="#1E293B"
                  strokeWidth="3"
                />
                {/* Hoodie Ribbed Hem */}
                <rect x="-54" y="80" width="108" height="14" rx="4" fill={palette.secondaryTop} />
                {/* Kangaroo Front Pocket */}
                <path
                  d="M -36 32 L 36 32 L 42 74 L -42 74 Z"
                  fill={palette.secondaryTop}
                  stroke="#1E293B"
                  strokeWidth="2"
                />
                {/* Hoodie Drawstrings */}
                <line x1="-12" y1="-55" x2="-14" y2="-12" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                <line x1="12" y1="-55" x2="14" y2="-12" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />

                {/* LAYER 06: Small Crossbody Sling Bag */}
                <line
                  x1="-46"
                  y1="-62"
                  x2="44"
                  y2="48"
                  stroke="#1E293B"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <g transform="translate(22, 24) rotate(-14)">
                  <rect
                    x="-24"
                    y="-16"
                    width="48"
                    height="34"
                    rx="8"
                    fill={palette.accessory}
                    stroke="#78350F"
                    strokeWidth="2.5"
                  />
                  <line x1="-18" y1="-4" x2="18" y2="-4" stroke="#FEF3C7" strokeWidth="2" />
                  <rect x="-8" y="2" width="16" height="8" rx="2" fill="#1E293B" />
                </g>
              </>
            ) : (
              /* Bang Dullah: Minimarket Uniform Polo + Cashier Apron + Name Tag */
              <>
                <path
                  d="M -52 -68 C -60 -20, -56 60, -48 88 L 48 88 C 56 60, 60 -20, 52 -68 Z"
                  fill={palette.primaryTop}
                  stroke="#064E3B"
                  strokeWidth="3"
                />
                {/* Yellow/Amber Minimarket Chest Stripe */}
                <rect x="-53" y="-32" width="106" height="14" fill={palette.secondaryTop} />
                {/* Minimarket Cashier Apron */}
                <path
                  d="M -38 -12 L 38 -12 L 42 86 L -42 86 Z"
                  fill={palette.accessory}
                  stroke="#064E3B"
                  strokeWidth="2"
                />
                {/* Polo Collar */}
                <polygon points="-24,-68 0,-44 -34,-48" fill={palette.secondaryTop} stroke="#064E3B" strokeWidth="2" />
                <polygon points="24,-68 0,-44 34,-48" fill={palette.secondaryTop} stroke="#064E3B" strokeWidth="2" />
                {/* Cashier Name Badge ("DULLAH") */}
                <rect x="12" y="-5" width="28" height="16" rx="2" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.5" />
                <line x1="16" y1="3" x2="36" y2="3" stroke="#0F766E" strokeWidth="2.5" />
              </>
            )}
          </g>

          {/* ============================================================
              LAYER 07 & 08: ARTICULATED LEFT & RIGHT ARMS
             ============================================================ */}
          {/* Left Arm */}
          <g transform={`translate(94, ${208 + breathY}) rotate(${leftArmDeg})`}>
            <rect
              x="-16"
              y="0"
              width="30"
              height="108"
              rx="14"
              fill={palette.primaryTop}
              stroke="#1E293B"
              strokeWidth="2.5"
            />
            {/* Hand */}
            <circle cx="-1" cy="114" r="13" fill={palette.skin} stroke="#7C2D12" strokeWidth="1.8" />
          </g>

          {/* Right Arm */}
          <g transform={`translate(206, ${208 + breathY}) rotate(${rightArmDeg})`}>
            <rect
              x="-14"
              y="0"
              width="30"
              height="108"
              rx="14"
              fill={palette.primaryTop}
              stroke="#1E293B"
              strokeWidth="2.5"
            />
            {/* Hand + Pointing Finger if pointing */}
            <g transform="translate(1, 114)">
              <circle cx="0" cy="0" r="13" fill={palette.skin} stroke="#7C2D12" strokeWidth="1.8" />
              {isPointing && (
                <rect
                  x="6"
                  y="-6"
                  width="20"
                  height="8"
                  rx="4"
                  fill={palette.skin}
                  stroke="#7C2D12"
                  strokeWidth="1.5"
                />
              )}
            </g>
          </g>

          {/* ============================================================
              LAYER 09: NECK JOINT
             ============================================================ */}
          <rect
            x="136"
            y={175 + breathY}
            width="28"
            height="32"
            rx="8"
            fill={palette.skinShadow}
          />

          {/* ============================================================
              LAYER 10, 11, 12, 13, 14: ARTICULATED HEAD, EYES, BROWS, MOUTH, HAIR
             ============================================================ */}
          <g
            transform={`translate(${150 + headOffsetX}, ${
              132 + breathY + headOffsetY
            }) rotate(${headRotateDeg})`}
          >
            {/* Ears */}
            <circle cx="-54" cy="4" r="12" fill={palette.skinShadow} stroke="#431407" strokeWidth="2" />
            <circle cx="54" cy="4" r="12" fill={palette.skinShadow} stroke="#431407" strokeWidth="2" />

            {/* Head Base */}
            <rect
              x="-52"
              y="-58"
              width="104"
              height="114"
              rx="44"
              fill={palette.skin}
              stroke="#431407"
              strokeWidth="2.8"
            />

            {/* Bang Dullah Light Stubble / Goatee */}
            {!isJange && (
              <path
                d="M -22 42 Q 0 54 22 42"
                fill="none"
                stroke="#475569"
                strokeWidth="3.5"
                strokeDasharray="2 3"
                strokeLinecap="round"
              />
            )}

            {/* ============================================================
                LAYER 11: EYE RIG (Sclera, Pupils, Dynamic Blink & Emotion Eyelids)
               ============================================================ */}
            {[-22, 22].map((eyeX, idx) => (
              <g key={idx} transform={`translate(${eyeX}, -6)`}>
                {/* Sleepy eye bags for Jange */}
                {isJange && (
                  <path
                    d="M -13 11 Q 0 16 13 11"
                    fill="none"
                    stroke="rgba(71, 85, 105, 0.55)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                )}

                {/* Eye White (Sclera) */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx="14"
                  ry={emotion === 'shocked' ? 14 : 11}
                  fill="#FFFFFF"
                  stroke="#1E293B"
                  strokeWidth="2"
                />

                {/* Pupil & Iris */}
                {upperEyelidDrop < 13 && (
                  <g transform={`translate(${pupilShiftX}, ${emotion === 'sleepy' ? 1.5 : 0})`}>
                    <circle cx="0" cy="0" r={pupilRadius} fill="#0F172A" />
                    <circle cx="-1.8" cy="-2" r="1.6" fill="#FFFFFF" />
                  </g>
                )}

                {/* Upper Eyelid (Blink + Sleepy/Emotion Droop) */}
                {upperEyelidDrop > 0.5 && (
                  <path
                    d={`M -15 -12 L 15 -12 L 15 ${-12 + upperEyelidDrop * 1.45} L -15 ${
                      -12 + upperEyelidDrop * 1.45
                    } Z`}
                    fill={palette.skinShadow}
                    stroke="#1E293B"
                    strokeWidth="1.8"
                  />
                )}
              </g>
            ))}

            {/* Nose */}
            <path
              d="M -2 -4 L -5 12 L 3 14"
              fill="none"
              stroke="#7C2D12"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ============================================================
                LAYER 12: EYEBROW EXPRESSION RIG
               ============================================================ */}
            <g transform={`translate(0, ${browOffsetY})`}>
              <rect
                x="-36"
                y="-26"
                width="26"
                height="5.5"
                rx="3"
                fill={palette.hair}
                transform={`rotate(${leftBrowDeg} -23 -23)`}
              />
              <rect
                x="10"
                y="-26"
                width="26"
                height="5.5"
                rx="3"
                fill={palette.hair}
                transform={`rotate(${rightBrowDeg} 23 -23)`}
              />
            </g>

            {/* ============================================================
                LAYER 13: 6-VISEME SYNCHRONIZED MOUTH RIG
               ============================================================ */}
            <g transform="translate(0, 31)">
              {viseme === 'REST' && (
                <path
                  d={
                    emotion === 'confused'
                      ? 'M -12 2 Q -2 -3 11 3'
                      : 'M -13 0 Q 0 3 13 0'
                  }
                  fill="none"
                  stroke="#431407"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              )}

              {viseme === 'AA' && (
                <g>
                  <ellipse
                    cx="0"
                    cy="2"
                    rx="16"
                    ry={Math.max(6, 12 * mouthOpenness)}
                    fill="#7F1D1D"
                    stroke="#431407"
                    strokeWidth="2.5"
                  />
                  {/* Upper teeth */}
                  <path d="M -12 -5 L 12 -5 L 10 -1 L -10 -1 Z" fill="#F8FAFC" />
                  {/* Tongue */}
                  <ellipse cx="0" cy="7" rx="9" ry="4" fill="#F87171" />
                </g>
              )}

              {viseme === 'EE' && (
                <g>
                  <rect
                    x="-17"
                    y="-4"
                    width="34"
                    height={Math.max(7, 11 * mouthOpenness)}
                    rx="5"
                    fill="#7F1D1D"
                    stroke="#431407"
                    strokeWidth="2.4"
                  />
                  <line x1="-14" y1="0" x2="14" y2="0" stroke="#F8FAFC" strokeWidth="3.5" />
                </g>
              )}

              {viseme === 'OH' && (
                <g>
                  <ellipse
                    cx="0"
                    cy="2"
                    rx="11"
                    ry={Math.max(8, 13 * mouthOpenness)}
                    fill="#7F1D1D"
                    stroke="#431407"
                    strokeWidth="2.6"
                  />
                  <ellipse cx="0" cy="7" rx="6" ry="3.5" fill="#F87171" />
                </g>
              )}

              {viseme === 'OO' && (
                <circle
                  cx="0"
                  cy="2"
                  r={Math.max(5.5, 8 * mouthOpenness)}
                  fill="#7F1D1D"
                  stroke="#431407"
                  strokeWidth="2.8"
                />
              )}

              {viseme === 'FV' && (
                <g>
                  <rect
                    x="-13"
                    y="-3"
                    width="26"
                    height="7"
                    rx="3"
                    fill="#7F1D1D"
                    stroke="#431407"
                    strokeWidth="2.2"
                  />
                  <rect x="-10" y="-2" width="20" height="3.5" fill="#F8FAFC" />
                </g>
              )}

              {viseme === 'SHOCK' && (
                <g>
                  <ellipse
                    cx="0"
                    cy="3"
                    rx="13"
                    ry="13"
                    fill="#450A0A"
                    stroke="#431407"
                    strokeWidth="2.8"
                  />
                  <path d="M -9 -6 L 9 -6 L 8 -2 L -8 -2 Z" fill="#F8FAFC" />
                </g>
              )}
            </g>

            {/* ============================================================
                LAYER 14: FRONT HAIR / CAP LAYER
               ============================================================ */}
            {isJange ? (
              /* Jange Signature Messy Gen-Z Hair & Bangs */
              <path
                d="M -56 -24 C -62 -62, -25 -78, 4 -74 C 38 -78, 62 -56, 56 -20 C 46 -38, 32 -42, 22 -24 C 12 -44, -4 -42, -12 -20 C -26 -42, -42 -40, -56 -24 Z"
                fill={palette.hair}
                stroke="#0F172A"
                strokeWidth="2"
              />
            ) : (
              /* Bang Dullah Neat Parted Hair + Minimarket Visor Cap */
              <g>
                <path
                  d="M -52 -24 C -54 -60, 54 -60, 52 -24 C 34 -42, -34 -42, -52 -24 Z"
                  fill={palette.hair}
                />
                {/* Minimarket Cap Crown */}
                <path
                  d="M -52 -36 C -48 -72, 48 -72, 52 -36 Z"
                  fill={palette.primaryTop}
                  stroke="#064E3B"
                  strokeWidth="2.5"
                />
                {/* Cap Visor Bill */}
                <path
                  d="M -54 -38 Q 0 -48 58 -34 L 48 -26 Q 0 -36 -52 -30 Z"
                  fill={palette.secondaryTop}
                  stroke="#064E3B"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Sweat Drop for Shocked / Awkward Emotion */}
            {(emotion === 'shocked' || emotion === 'confused') && (
              <path
                d="M 42 -22 C 46 -12, 48 -6, 42 -4 C 36 -6, 38 -12, 42 -22 Z"
                fill="#38BDF8"
                 opacity={0.85}
              />
            )}
          </g>
        </g>
      </svg>

      {/* Clearly Labeled Placeholder Rig Badge */}
      {showPlaceholderBadge && character.isPlaceholderAsset && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: `translateX(-50%) scaleX(${flipX ? -1 : 1})`,
            background: 'rgba(15, 23, 42, 0.86)',
            border: '1px solid rgba(148, 163, 184, 0.45)',
            color: '#F8FAFC',
            padding: '3px 9px',
            borderRadius: 5,
            fontSize: 10.5,
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>[PLACEHOLDER RIG]</span>{' '}
          {character.name.toUpperCase()} • {emotion.toUpperCase()} • VISEME:{viseme}
          {activeSyllable ? ` (${activeSyllable})` : ''}
        </div>
      )}
    </div>
  );
};

