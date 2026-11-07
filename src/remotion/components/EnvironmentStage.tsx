import React from 'react';
import { BackgroundDefinition, SceneDefinition } from '../../types/animation';

interface EnvironmentStageProps {
  background: BackgroundDefinition;
  scene: SceneDefinition;
  frame: number;
  fps: number;
}

export const EnvironmentStage: React.FC<EnvironmentStageProps> = ({
  background,
  scene,
  frame,
  fps,
}) => {
  const t = frame / fps;
  const isEmergency = scene.lightingMode === 'emergency_red_glitch';
  const neonFlicker = isEmergency
    ? 0.72 + 0.28 * Math.sin(frame * 1.7)
    : 0.96 + 0.04 * Math.sin(frame * 0.4);

  if (background.environmentType === 'minimarket_exterior_blackout') {
    return (
      <svg
        viewBox="0 0 1080 1920"
        width="1080"
        height="1920"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#030509" />
            <stop offset="65%" stopColor="#090D18" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <radialGradient id="storeGlow" cx="50%" cy="62%" r="48%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.34)" />
            <stop offset="55%" stopColor="rgba(245, 158, 11, 0.12)" />
            <stop offset="100%" stopColor="rgba(3, 5, 9, 0)" />
          </radialGradient>
        </defs>

        {/* Pitch Blackout Sky over Ciruas */}
        <rect width="1080" height="1920" fill="url(#nightSky)" />

        {/* Distant Darkened Ruko & Houses in Ciruas (Total Blackout) */}
        <rect x="0" y="790" width="210" height="520" fill="#060911" />
        <rect x="40" y="840" width="48" height="65" fill="#0B0F1A" />
        <rect x="115" y="840" width="48" height="65" fill="#0B0F1A" />

        <rect x="860" y="760" width="220" height="550" fill="#060911" />
        <rect x="900" y="820" width="54" height="70" fill="#0B0F1A" />
        <rect x="980" y="820" width="54" height="70" fill="#0B0F1A" />

        {/* Electric Utility Poles & Sagging Power Lines (Dead Grid) */}
        <rect x="145" y="520" width="14" height="790" fill="#05070C" />
        <rect x="115" y="555" width="74" height="10" fill="#05070C" />
        <rect x="920" y="510" width="14" height="800" fill="#05070C" />
        <rect x="890" y="545" width="74" height="10" fill="#05070C" />
        <path
          d="M 0 580 Q 75 630 148 560 Q 535 675 925 550 Q 1000 590 1080 565"
          fill="none"
          stroke="#0F172A"
          strokeWidth="3.5"
        />

        {/* Ambient Light Cone from the Only Lit Minimarket */}
        <ellipse cx="540" cy="1180" rx="520" ry="440" fill="url(#storeGlow)" opacity={neonFlicker} />

        {/* Ciruas Mart Building Structure */}
        <rect
          x="210"
          y="730"
          width="660"
          height="580"
          rx="8"
          fill="#1E293B"
          stroke="#334155"
          strokeWidth="4"
        />

        {/* Illuminated Fascia Signboard: CIRUAS MART 24 JAM */}
        <g opacity={neonFlicker}>
          <rect
            x="190"
            y="745"
            width="700"
            height="125"
            rx="10"
            fill="#065F46"
            stroke="#34D399"
            strokeWidth="4"
          />
          <rect x="194" y="842" width="692" height="18" fill="#F59E0B" />
          <rect x="194" y="858" width="692" height="10" fill="#EF4444" />
          <text
            x="540"
            y="808"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="46"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            letterSpacing="3"
          >
            CIRUAS MART
          </text>
          <text
            x="540"
            y="834"
            textAnchor="middle"
            fill="#A7F3D0"
            fontSize="17"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
            letterSpacing="2"
          >
            BUKA 24 JAM • JL. RAYA SERANG KM 9
          </text>
        </g>

        {/* Brightly Lit Storefront Glass Windows */}
        <rect
          x="250"
          y="895"
          width="580"
          height="395"
          fill="#FEF9C3"
          opacity={0.92 * neonFlicker}
        />

        {/* Interior Shelves Visible Through Glass */}
        <g opacity="0.85">
          {/* Beverage Cooler */}
          <rect x="275" y="940" width="120" height="310" fill="#0EA5E9" opacity="0.35" />
          <line x1="275" y1="1010" x2="395" y2="1010" stroke="#0284C7" strokeWidth="4" />
          <line x1="275" y1="1080" x2="395" y2="1080" stroke="#0284C7" strokeWidth="4" />
          <line x1="275" y1="1150" x2="395" y2="1150" stroke="#0284C7" strokeWidth="4" />

          {/* Snack Gondola */}
          <rect x="425" y="990" width="130" height="260" fill="#CBD5E1" />
          <rect x="435" y="1010" width="110" height="22" fill="#EF4444" />
          <rect x="435" y="1055" width="110" height="22" fill="#F59E0B" />
          <rect x="435" y="1100" width="110" height="22" fill="#10B981" />

          {/* Cashier Counter Inside */}
          <rect x="595" y="1125" width="210" height="165" fill="#0F766E" />
          <rect x="590" y="1115" width="220" height="16" fill="#F59E0B" />
        </g>

        {/* Glass Window Mullions & Door Frame */}
        <line x1="440" y1="895" x2="440" y2="1290" stroke="#334155" strokeWidth="8" />
        <line x1="635" y1="895" x2="635" y2="1290" stroke="#334155" strokeWidth="8" />
        <rect
          x="250"
          y="895"
          width="580"
          height="395"
          fill="none"
          stroke="#475569"
          strokeWidth="10"
        />

        {/* Storefront Pavement & Dark Asphalt Road */}
        <rect x="0" y="1290" width="1080" height="630" fill="#0B0F19" />
        {/* Light Spill on Pavement */}
        <polygon
          points="250,1290 830,1290 990,1740 90,1740"
          fill="rgba(254, 249, 195, 0.16)"
        />
      </svg>
    );
  }

  if (background.environmentType === 'minimarket_entrance_approach') {
    return (
      <svg
        viewBox="0 0 1080 1920"
        width="1080"
        height="1920"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Left side: Dark Blackout Night Exterior; Right side: Warm Fluorescent Interior */}
        <rect width="1080" height="1920" fill="#090D16" />

        {/* Storefront Interior Wall (Right 72% of frame) */}
        <rect x="260" y="240" width="820" height="1180" fill="#F1F5F9" />

        {/* Fluorescent Ceiling Tubes */}
        <rect x="340" y="290" width="320" height="18" rx="9" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="4" />
        <rect x="720" y="290" width="290" height="18" rx="9" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="4" />

        {/* Top Header Banner Inside Store */}
        <rect x="260" y="360" width="820" height="85" fill="#065F46" />
        <rect x="260" y="445" width="820" height="14" fill="#F59E0B" />
        <text
          x="670"
          y="415"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="30"
          fontFamily="Inter, sans-serif"
          fontWeight="800"
          letterSpacing="2"
        >
          SELAMAT DATANG DI CIRUAS MART
        </text>

        {/* Back Wall Cigarette & Promo Rack Behind Cashier */}
        <rect x="650" y="520" width="360" height="460" rx="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="4" />
        {[560, 630, 700, 770, 840].map((yPos, idx) => (
          <g key={idx}>
            <rect x="675" y={yPos} width="310" height="42" fill="#CBD5E1" />
            <rect x="685" y={yPos + 6} width="55" height="30" fill="#EF4444" />
            <rect x="750" y={yPos + 6} width="55" height="30" fill="#F59E0B" />
            <rect x="815" y={yPos + 6} width="55" height="30" fill="#0F766E" />
            <rect x="880" y={yPos + 6} width="55" height="30" fill="#1D4ED8" />
          </g>
        ))}

        {/* Glass Entrance Door Frame on Left */}
        <rect x="235" y="240" width="32" height="1180" fill="#334155" />
        <rect
          x="268"
          y="760"
          width="110"
          height="48"
          rx="6"
          fill="#10B981"
          stroke="#064E3B"
          strokeWidth="2"
        />
        <text
          x="323"
          y="790"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="17"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
        >
          BUKA / OPEN
        </text>

        {/* Tiled Floor & Exterior Terrace Step */}
        <rect x="0" y="1380" width="1080" height="540" fill="#1E293B" />
        <polygon points="260,1380 1080,1380 1080,1920 120,1920" fill="#CBD5E1" />

        {/* Cashier Counter Desk (Midground) */}
        <rect
          x="520"
          y="1190"
          width="520"
          height="290"
          rx="8"
          fill="#0F766E"
          stroke="#064E3B"
          strokeWidth="4"
        />
        <rect x="510" y="1175" width="540" height="24" rx="4" fill="#F59E0B" />
      </svg>
    );
  }

  // Interior Counter View (Scene 3 & Scene 4 Anomaly)
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="1080"
      height="1920"
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Interior Wall */}
      <rect
        width="1080"
        height="1920"
        fill={isEmergency ? '#1C0D12' : '#E2E8F0'}
      />

      {/* Top Minimarket Ceiling Soffit */}
      <rect
        x="0"
        y="0"
        width="1080"
        height="340"
        fill={isEmergency ? '#11070A' : '#0F172A'}
      />

      {/* Overhead Fluorescent Light Fixture */}
      <rect
        x="160"
        y="190"
        width="760"
        height="26"
        rx="13"
        fill={isEmergency ? '#FCA5A5' : '#FFFFFF'}
        opacity={neonFlicker}
      />

      {/* Store Brand Header Behind Counter */}
      <rect
        x="0"
        y="340"
        width="1080"
        height="110"
        fill={isEmergency ? '#7F1D1D' : '#065F46'}
      />
      <rect
        x="0"
        y="450"
        width="1080"
        height="18"
        fill={isEmergency ? '#EF4444' : '#F59E0B'}
      />
      <text
        x="540"
        y="408"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="36"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        letterSpacing="3"
      >
        {isEmergency ? 'PERINGATAN SISTEM KASIR // CIRUAS MART' : 'KASIR 01 • CIRUAS MART 24 JAM'}
      </text>

      {/* Left Beverage Cooler & Snack Shelves */}
      <rect
        x="55"
        y="520"
        width="340"
        height="720"
        rx="10"
        fill={isEmergency ? '#2A1215' : '#0F172A'}
        stroke={isEmergency ? '#EF4444' : '#334155'}
        strokeWidth="5"
      />
      {[600, 720, 840, 960].map((shelfY, idx) => (
        <g key={idx}>
          <rect
            x="80"
            y={shelfY}
            width="290"
            height="85"
            fill={isEmergency ? '#451A1C' : '#1E293B'}
          />
          {[95, 145, 195, 245, 295].map((canX, cIdx) => (
            <rect
              key={cIdx}
              x={canX}
              y={shelfY + 22}
              width="32"
              height="55"
              rx="6"
              fill={
                isEmergency
                  ? '#EF4444'
                  : cIdx % 2 === 0
                  ? '#38BDF8'
                  : '#F59E0B'
              }
            />
          ))}
        </g>
      ))}

      {/* Right Merchandising Rack Behind Bang Dullah */}
      <rect
        x="610"
        y="520"
        width="410"
        height="720"
        rx="10"
        fill={isEmergency ? '#2D1216' : '#CBD5E1'}
        stroke="#64748B"
        strokeWidth="4"
      />
      {[570, 680, 790, 900].map((rowY, rIdx) => (
        <g key={rIdx}>
          <rect
            x="635"
            y={rowY}
            width="360"
            height="72"
            fill={isEmergency ? '#3F161B' : '#94A3B8'}
          />
          {[655, 735, 815, 895].map((boxX, bIdx) => (
            <rect
              key={bIdx}
              x={boxX}
              y={rowY + 14}
              width="62"
              height="48"
              rx="4"
              fill={
                isEmergency
                  ? '#DC2626'
                  : (rIdx + bIdx) % 2 === 0
                  ? '#0F766E'
                  : '#D97706'
              }
            />
          ))}
        </g>
      ))}

      {/* Ceramic Tile Floor */}
      <rect
        x="0"
        y="1340"
        width="1080"
        height="580"
        fill={isEmergency ? '#180B0E' : '#CBD5E1'}
      />

      {/* Foreground Checkout Counter */}
      <g>
        <rect
          x="390"
          y="1220"
          width="690"
          height="460"
          rx="10"
          fill={isEmergency ? '#450A0A' : '#0F766E'}
          stroke={isEmergency ? '#EF4444' : '#064E3B'}
          strokeWidth="5"
        />
        {/* Counter Top Surface */}
        <rect
          x="375"
          y="1196"
          width="705"
          height="32"
          rx="6"
          fill={isEmergency ? '#EF4444' : '#F59E0B'}
        />
        {/* Promo Sticker on Front of Counter */}
        <rect
          x="450"
          y="1290"
          width="310"
          height="110"
          rx="8"
          fill="#FEF3C7"
          stroke="#D97706"
          strokeWidth="3"
        />
        <text
          x="605"
          y="1340"
          textAnchor="middle"
          fill="#92400E"
          fontSize="24"
          fontFamily="Inter, sans-serif"
          fontWeight="800"
        >
          PROMO MALAM CIRUAS
        </text>
        <text
          x="605"
          y="1374"
          textAnchor="middle"
          fill="#B45309"
          fontSize="18"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
        >
          KOPI SACHET + ES: RP 5.000
        </text>
      </g>

      {/* Emergency Red Radial Pulse Overlay during Scene 4 */}
      {isEmergency && (
        <rect
          width="1080"
          height="1920"
          fill="rgba(239, 68, 68, 0.14)"
          opacity={Math.sin(t * 16) * 0.5 + 0.5}
        />
      )}
    </svg>
  );
};

