'use client';

import type { CSSProperties } from 'react';

/* ============================================================
   Applo — Auth mascot. One rig, driven by a state class on <svg>:
     idle    gentle float + blink
     look    curious, eyes drift toward the form
     cover   hands fly up and cover the eyes  (typing a hidden password)
     peek    hands lowered, eyes peek out      (password revealed)
     squint  hands rise with password strength (sign-up password)
     load    concentrating  (submitting)
     success hands up, happy squint, check + confetti
     error   worried brows, "o" mouth, little shake
   Flat 2D, navy palette — matches the Applo brand. Ported 1:1 from
   the design handoff (docs/design auth prototype). All motion lives
   in the scoped `.applo-auth` block of auth.css.
   ============================================================ */

const NAVY = '#15233f';
const SCREEN = '#eef3fb';
const BORDER = 'rgba(21,35,63,.10)';
const BLUE = '#2563eb';
const GREEN = '#15a34a';
const HAND = '#3a4f76';
const RIM = 'rgba(255,255,255,0.12)';
const ANT = '#26395c'; // deep navy — strong, crisp contrast on the light panel

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
  /** 0–1 eyelid level (1 = fully open). Feeds the `--lid` CSS var. */
  eyeLevel?: number;
  /** 0–1 how far the hands cover the eyes. Feeds the `--cover` CSS var. */
  coverLevel?: number;
  /** 0/1 toggle that fades the cover hands in. Feeds `--coverShow`. */
  coverShow?: number;
  className?: string;
}

export function AuthApplo({
  state = 'idle',
  size = 300,
  eyeLevel = 1,
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
          '--lid': eyeLevel,
          '--cover': coverLevel,
          '--coverShow': coverShow,
        } as CSSProperties
      }
      role="img"
      aria-label={`Applo – ${state}`}
    >
      {/* shadow stays grounded (sibling of aFloat) so it pulses, not floats */}
      <ellipse className="aShadow" cx="120" cy="300" rx="52" ry="9" fill="rgba(0,0,0,.22)" />
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

          {/* arms — down (idle/look) */}
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

          {/* body */}
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
          </g>

          {/* head */}
          <rect x="50" y="56" width="140" height="112" rx="36" fill={NAVY} stroke={RIM} strokeWidth="2" />
          <rect x="66" y="74" width="108" height="80" rx="22" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />

          {/* cheeks */}
          <g className="aCheeks" fill={BLUE} opacity="0.16">
            <ellipse cx="85" cy="128" rx="8" ry="5" />
            <ellipse cx="155" cy="128" rx="8" ry="5" />
          </g>

          {/* eyes — open (wrapped in aSquint: eyelids lower with password strength) */}
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
            {/* closed-lid lashes — fade in as the eyes squeeze shut */}
            <g className="aLidLine" fill="none" stroke={NAVY} strokeWidth="4.5" strokeLinecap="round">
              <path d="M94 110 Q102 114 110 110" />
              <path d="M130 110 Q138 114 146 110" />
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

          {/* peek hands — flat hands resting just below the eyes; Applo peeks over the fingertips */}
          <g className="aArmPeek">
            <circle cx="84" cy="178" r="12" fill={ANT} />
            <circle cx="156" cy="178" r="12" fill={ANT} />
            <path d="M84 178 Q73 152 97 133" fill="none" stroke={ANT} strokeWidth="22" strokeLinecap="round" />
            <path d="M156 178 Q167 152 143 133" fill="none" stroke={ANT} strokeWidth="22" strokeLinecap="round" />
            <ellipse cx="99" cy="133" rx="17" ry="17" fill={HAND} />
            <ellipse cx="141" cy="133" rx="17" ry="17" fill={HAND} />
            <g stroke={NAVY} strokeWidth="2" strokeLinecap="round" opacity="0.26" fill="none">
              <path d="M90 123 Q91 133 90 145" />
              <path d="M99 122 Q100 133 99 146" />
              <path d="M108 123 Q107 133 108 145" />
              <path d="M132 123 Q133 133 132 145" />
              <path d="M141 122 Q142 133 141 146" />
              <path d="M150 123 Q149 133 150 145" />
            </g>
          </g>

          {/* cover hands — clamped over both eyes (drawn last = on top) */}
          <g className="aArmCover">
            {/* arms buckle a little; wrapped so only they flex, not the hands */}
            <g className="aCoverArm">
              <circle cx="84" cy="178" r="12" fill={ANT} />
              <circle cx="156" cy="178" r="12" fill={ANT} />
              <path d="M84 178 Q77 143 99 116" fill="none" stroke={ANT} strokeWidth="23" strokeLinecap="round" />
              <path d="M156 178 Q163 143 141 116" fill="none" stroke={ANT} strokeWidth="23" strokeLinecap="round" />
            </g>
            {/* two big round cupped hands meeting in the middle */}
            <ellipse cx="100" cy="110" rx="24" ry="24" fill={HAND} />
            <ellipse cx="140" cy="110" rx="24" ry="24" fill={HAND} />
            {/* finger ridges */}
            <g stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" opacity="0.3" fill="none">
              <path d="M89 94 Q91 110 89 126" />
              <path d="M100 92 Q102 110 100 128" />
              <path d="M111 94 Q109 110 111 126" />
              <path d="M129 94 Q131 110 129 126" />
              <path d="M140 92 Q138 110 140 128" />
              <path d="M151 94 Q149 110 151 126" />
            </g>
            {/* peeking gap between the two hands */}
            <line
              className="aGap"
              x1="120"
              y1="95"
              x2="120"
              y2="125"
              stroke={NAVY}
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.28"
            />
          </g>

          {/* confetti (success) */}
          <g className="aConfetti">
            <circle className="cf cf1" cx="58" cy="64" r="5" fill={BLUE} />
            <circle className="cf cf2" cx="182" cy="70" r="5" fill={GREEN} />
            <rect className="cf cf3" x="115" y="22" width="9" height="9" rx="2" fill={NAVY} transform="rotate(20 119 26)" />
            <rect className="cf cf4" x="44" y="118" width="8" height="8" rx="2" fill={GREEN} transform="rotate(-15 48 122)" />
            <circle className="cf cf5" cx="196" cy="120" r="4.5" fill={BLUE} />
          </g>
        </g>
        {/* /aRig */}
      </g>
      {/* /aFloat */}
    </svg>
  );
}
