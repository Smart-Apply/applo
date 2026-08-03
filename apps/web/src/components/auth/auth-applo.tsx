'use client';

import type { CSSProperties } from 'react';

/* ============================================================
   Applo — Auth mascot. One rig, driven by a state class on <svg>:
     idle    gentle float + blink
     look    curious, eyes drift toward the form
     cover   face-camera OFF — display goes dark, LED bars + scanline
             (typing a hidden password)
     peek    camera back ON, eyes glance down at the field (revealed)
     squint  camera dims progressively with password strength (sign-up)
     load    concentrating  (submitting)
     success arms up, happy squint, check + confetti
     error   worried brows, "o" mouth, little shake
   Applo is a robot: instead of holding his hands over his eyes, he
   switches his face-camera off so your password is never "seen".
   Flat 2D, navy palette — matches the Applo brand. Ported 1:1 from
   the design handoff. All motion lives in the scoped `.applo-auth`
   block of auth.css, driven by the --cover / --coverShow vars.
   ============================================================ */

const NAVY = '#15233f';
const SCREEN = '#eef3fb';
const BORDER = 'rgba(21,35,63,.10)';
const BLUE = '#40639C';
const ACCENT = '#5581C7';
const GREEN = '#16A34A';
const HAND = '#3a4f76';
const RIM = 'rgba(255,255,255,0.12)';
const ANT = '#26395c'; // deep navy — strong, crisp contrast on the light pane

export type AuthApploState =
  | 'idle'
  | 'look'
  | 'cover'
  | 'peek'
  | 'squint'
  | 'load'
  | 'success'
  | 'error';

interface AuthApploProps {
  state?: AuthApploState;
  size?: number;
  /** 0–1 how dark the face-camera goes (1 = fully off). Feeds `--cover`. */
  coverLevel?: number;
  /** 0/1 toggle that fades the dark display in. Feeds `--coverShow`. */
  coverShow?: number;
  className?: string;
}

export function AuthApplo({
  state = 'idle',
  size = 300,
  coverLevel = 0,
  coverShow = 0,
  className,
}: AuthApploProps) {
  return (
    <svg
      className={`aApplo s-${state}${className ? ` ${className}` : ''}`}
      viewBox="0 0 240 320"
      width={size}
      height={(size * 320) / 240}
      style={
        {
          display: 'block',
          overflow: 'visible',
          '--cover': coverLevel,
          '--coverShow': coverShow,
        } as CSSProperties
      }
      role="img"
      aria-label={`Applo – ${state}`}
    >
      {/* shadow stays grounded (sibling of aFloat) so it pulses, not floats */}
      <ellipse className="aShadow" cx="120" cy="300" rx="52" ry="9" fill="rgba(0,0,0,.28)" />
      <g className="aFloat">
        <g className="aRig">
          {/* antennas */}
          <g className="aAntL">
            <path d="M108 64 Q100 42 92 30" fill="none" stroke={ANT} strokeWidth="7" strokeLinecap="round" />
            <circle cx="90" cy="27" r="9" fill={ANT} />
          </g>
          <g className="aAntR">
            <path d="M132 64 Q140 42 148 30" fill="none" stroke={ANT} strokeWidth="7" strokeLinecap="round" />
            <circle cx="150" cy="27" r="9" fill={ANT} />
          </g>

          {/* ears */}
          <rect x="42" y="96" width="16" height="36" rx="8" fill={ANT} />
          <rect x="182" y="96" width="16" height="36" rx="8" fill={ANT} />

          {/* feet */}
          <rect x="88" y="236" width="26" height="16" rx="8" fill={HAND} />
          <rect x="126" y="236" width="26" height="16" rx="8" fill={HAND} />

          {/* arms — down (idle/look/cover/peek/squint) */}
          <g className="aArmDown">
            <path d="M86 178 L72 206" fill="none" stroke={ANT} strokeWidth="20" strokeLinecap="round" />
            <circle cx="70" cy="210" r="13" fill={HAND} />
            <path d="M154 178 L168 206" fill="none" stroke={ANT} strokeWidth="20" strokeLinecap="round" />
            <circle cx="170" cy="210" r="13" fill={HAND} />
          </g>

          {/* arms — up (success) */}
          <g className="aArmUp">
            <path d="M86 174 L58 148" fill="none" stroke={ANT} strokeWidth="20" strokeLinecap="round" />
            <circle cx="54" cy="144" r="13" fill={HAND} />
            <path d="M154 174 L182 148" fill="none" stroke={ANT} strokeWidth="20" strokeLinecap="round" />
            <circle cx="186" cy="144" r="13" fill={HAND} />
          </g>

          {/* body — with a status readout that lights up while the camera is off */}
          <g className="aBody">
            <rect x="74" y="160" width="92" height="82" rx="26" fill={NAVY} stroke={RIM} strokeWidth="2" />
            <rect x="96" y="182" width="48" height="32" rx="9" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />
            <path
              className="aCheck"
              d="M104 199 L112 207 L136 189"
              fill="none"
              stroke={GREEN}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g className="aDots" fill={BLUE}>
              <circle className="dt dt1" cx="108" cy="198" r="3.4" />
              <circle className="dt dt2" cx="120" cy="198" r="3.4" />
              <circle className="dt dt3" cx="132" cy="198" r="3.4" />
            </g>
          </g>

          {/* head + face screen */}
          <rect x="50" y="56" width="140" height="112" rx="36" fill={NAVY} stroke={RIM} strokeWidth="2" />
          <rect x="66" y="74" width="108" height="80" rx="22" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />

          {/* cheeks */}
          <g className="aCheeks" fill={BLUE} opacity="0.16">
            <ellipse cx="85" cy="128" rx="8" ry="5" />
            <ellipse cx="155" cy="128" rx="8" ry="5" />
          </g>

          {/* eyes — open (wrapped in aSquint) */}
          <g className="aSquint">
            <g className="aEyesOpen">
              <g className="aEye">
                <ellipse cx="102" cy="110" rx="8" ry="9" fill={NAVY} />
                <circle cx="105" cy="106" r="3" fill="#fff" />
              </g>
              <g className="aEye">
                <ellipse cx="138" cy="110" rx="8" ry="9" fill={NAVY} />
                <circle cx="141" cy="106" r="3" fill="#fff" />
              </g>
            </g>
            {/* closed-lid lashes */}
            <g className="aLidLine" fill="none" stroke={NAVY} strokeWidth="4.5" strokeLinecap="round">
              <path d="M94 110 Q102 114 110 110" />
              <path d="M130 110 Q138 114 146 110" />
            </g>
          </g>

          {/* face-camera OFF — dark display with LED eye-bars, scanline and grid.
              Fades in for `cover`, scales with strength for `squint`. */}
          <g className="aOff">
            <defs>
              <clipPath id="aOffClip">
                <rect x="66" y="74" width="108" height="80" rx="22" />
              </clipPath>
            </defs>
            <g clipPath="url(#aOffClip)">
              <rect x="66" y="74" width="108" height="80" fill={NAVY} />
              <g className="aOffEyes" fill={BLUE}>
                <rect x="92" y="107" width="20" height="5" rx="2.5" />
                <rect x="128" y="107" width="20" height="5" rx="2.5" />
              </g>
              <g className="aOffDots" fill={BLUE} opacity=".85">
                <circle className="od od1" cx="106" cy="132" r="3" />
                <circle className="od od2" cx="120" cy="132" r="3" />
                <circle className="od od3" cx="134" cy="132" r="3" />
              </g>
              <rect className="aScan" x="66" y="74" width="108" height="10" fill={ACCENT} opacity=".28" />
              <g className="aOffGrid" stroke={ACCENT} strokeWidth="1" opacity=".16">
                <path d="M66 92 H174" />
                <path d="M66 122 H174" />
                <path d="M66 146 H174" />
              </g>
            </g>
          </g>

          {/* eyes — happy squint */}
          <g className="aEyesHappy" fill="none" stroke={NAVY} strokeWidth="5" strokeLinecap="round">
            <path d="M94 113 Q102 102 110 113" />
            <path d="M130 113 Q138 102 146 113" />
          </g>

          {/* worried brows */}
          <g className="aBrows" fill="none" stroke={NAVY} strokeWidth="4" strokeLinecap="round">
            <path d="M93 97 Q102 91 111 99" />
            <path d="M129 99 Q138 91 147 97" />
          </g>

          {/* mouths */}
          <path
            className="aMoSmile"
            d="M104 130 Q120 146 136 130"
            fill="none"
            stroke={NAVY}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path className="aMoHappy" d="M103 127 Q120 154 137 127 Z" fill={NAVY} />
          <ellipse className="aMoO" cx="120" cy="135" rx="6" ry="7.5" fill={NAVY} />

          {/* confetti (success) */}
          <g className="aConfetti">
            <circle className="cf cf1" cx="58" cy="64" r="5" fill={BLUE} />
            <circle className="cf cf2" cx="182" cy="70" r="5" fill={GREEN} />
            <rect className="cf cf3" x="115" y="22" width="9" height="9" fill={ACCENT} transform="rotate(20 119 26)" />
            <rect className="cf cf4" x="44" y="118" width="8" height="8" fill={GREEN} transform="rotate(-15 48 122)" />
            <circle className="cf cf5" cx="196" cy="120" r="4.5" fill={BLUE} />
          </g>
        </g>
        {/* /aRig */}
      </g>
      {/* /aFloat */}
    </svg>
  );
}
