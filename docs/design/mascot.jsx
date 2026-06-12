/* ============================================================
   SmartApply Mascot — "Applo"
   Head inspired by the logo (rounded navy body + antennae +
   document-with-checkmark), now with a friendly face.
   Two looks: flat 2D (web/UI) and glossy 3D (social).
   Poses: wave | think | celebrate | done
   ============================================================ */
(function () {
  const NAVY   = '#15233f';
  const NAVY_D = '#16243f';
  const SCREEN = '#eef3fb';
  const SCREEN_BORDER = 'rgba(21,35,63,.08)';
  const BLUE   = '#2563eb';
  const GREEN  = '#15a34a';
  const DASH   = '#9fb0c9';
  const FOLD   = '#d7e0f0';

  function Diamond({ cx, cy, s, fill, o = 1 }) {
    const x = Number(cx), y = Number(cy), r = Number(s);
    return (
      <path
        d={`M${x} ${y - r} L${x + r * 0.7} ${y} L${x} ${y + r} L${x - r * 0.7} ${y} Z`}
        fill={fill}
        opacity={o}
      />
    );
  }

  function Mascot({ pose = 'wave', variant = 'flat', size = 260, id }) {
    const is3d = variant === '3d';
    const uid = id || pose + '-' + variant;
    const body = is3d ? `url(#navy-${uid})` : NAVY;
    const screen = is3d ? `url(#screen-${uid})` : SCREEN;
    const armStroke = NAVY_D;

    /* ---- eyes ---- */
    let eyes;
    if (pose === 'celebrate' || pose === 'done') {
      eyes = (
        <g fill="none" stroke={NAVY} strokeWidth="5" strokeLinecap="round">
          <path d="M94 113 Q102 101 110 113" />
          <path d="M130 113 Q138 101 146 113" />
        </g>
      );
    } else if (pose === 'think') {
      eyes = (
        <g>
          <ellipse cx="102" cy="111" rx="7" ry="7.5" fill={NAVY} />
          <ellipse cx="138" cy="111" rx="7" ry="7.5" fill={NAVY} />
          <circle cx="104" cy="107" r="2.6" fill="#fff" />
          <circle cx="140" cy="107" r="2.6" fill="#fff" />
          <path d="M131 99 Q139 95 147 100" fill="none" stroke={NAVY} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    } else {
      eyes = (
        <g className="m-eyes">
          <ellipse cx="102" cy="110" rx="8" ry="9" fill={NAVY} />
          <ellipse cx="138" cy="110" rx="8" ry="9" fill={NAVY} />
          <circle cx="105" cy="106" r="3" fill="#fff" />
          <circle cx="141" cy="106" r="3" fill="#fff" />
        </g>
      );
    }

    /* ---- mouth ---- */
    let mouth;
    if (pose === 'wave' || pose === 'celebrate') {
      mouth = <path d="M104 128 Q120 153 136 128 Z" fill={NAVY} />;
    } else if (pose === 'think') {
      mouth = <ellipse cx="129" cy="134" rx="5" ry="4.2" fill={NAVY} />;
    } else {
      mouth = <path d="M104 130 Q120 147 136 130" fill="none" stroke={NAVY} strokeWidth="5.5" strokeLinecap="round" />;
    }

    /* ---- cheeks ---- */
    const cheeks = (pose !== 'think') && (
      <g fill={BLUE} opacity="0.16">
        <ellipse cx="85" cy="128" rx="8" ry="5" />
        <ellipse cx="155" cy="128" rx="8" ry="5" />
      </g>
    );

    /* ---- arms + hands ---- */
    let arms;
    if (pose === 'wave') {
      arms = (
        <g>
          {/* left down */}
          <path d="M86 176 L72 204" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="70" cy="208" r="13" fill={body} />
          {/* right raised */}
          <g className="m-wavearm">
            <path d="M154 174 L184 150" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
            <circle cx="188" cy="146" r="13" fill={body} />
          </g>
        </g>
      );
    } else if (pose === 'think') {
      arms = (
        <g>
          <path d="M86 176 L72 204" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="70" cy="208" r="13" fill={body} />
          {/* right hand to chin */}
          <path d="M156 178 L150 156" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="148" cy="152" r="12" fill={body} />
        </g>
      );
    } else if (pose === 'celebrate') {
      arms = (
        <g className="m-celearms">
          <path d="M86 174 L58 150" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="54" cy="146" r="13" fill={body} />
          <path d="M154 174 L182 150" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="186" cy="146" r="13" fill={body} />
        </g>
      );
    } else { /* done — thumbs up */
      arms = (
        <g>
          <path d="M86 176 L72 204" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="70" cy="208" r="13" fill={body} />
          <path d="M154 176 L176 160" fill="none" stroke={armStroke} strokeWidth="20" strokeLinecap="round" />
          <circle cx="180" cy="156" r="13" fill={body} />
          <rect x="175.5" y="139" width="9" height="17" rx="4.5" fill={body} />
        </g>
      );
    }

    /* ---- extras ---- */
    let extras = null;
    if (pose === 'wave') {
      extras = (
        <g fill="none" stroke={NAVY} strokeWidth="3" strokeLinecap="round" opacity="0.45">
          <path d="M200 138 Q207 145 202 154" />
          <path d="M208 131 Q218 142 210 158" />
        </g>
      );
    } else if (pose === 'think') {
      extras = (
        <g className="m-think">
          <circle className="m-think-d1" cx="162" cy="104" r="2.4" fill={NAVY} opacity=".5" />
          <circle className="m-think-d2" cx="170" cy="92" r="3.4" fill={NAVY} opacity=".6" />
          <rect x="176" y="56" width="44" height="30" rx="13" fill="#fff" stroke={SCREEN_BORDER} />
          <g fill={NAVY}>
            <circle className="m-think-t1" cx="187" cy="71" r="2.6" />
            <circle className="m-think-t2" cx="198" cy="71" r="2.6" />
            <circle className="m-think-t3" cx="209" cy="71" r="2.6" />
          </g>
        </g>
      );
    } else if (pose === 'celebrate') {
      extras = (
        <g className="m-confetti">
          <Diamond cx="42" cy="74" s="7" fill={BLUE} />
          <Diamond cx="198" cy="78" s="7" fill={GREEN} />
          <Diamond cx="120" cy="14" s="6" fill={BLUE} o=".9" />
          <circle cx="62" cy="44" r="3.4" fill={NAVY} opacity=".7" />
          <circle cx="182" cy="46" r="3.4" fill={BLUE} />
          <circle cx="28" cy="112" r="2.8" fill={GREEN} />
          <circle cx="214" cy="110" r="2.8" fill={NAVY} opacity=".7" />
        </g>
      );
    } else if (pose === 'done') {
      extras = (
        <g className="m-check">
          <circle cx="186" cy="66" r="16" fill={GREEN} />
          <path d="M178 66 L184 72 L195 59" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }

    return (
      <svg viewBox="0 0 240 300" width={size} height={size * 300 / 240} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={`SmartApply Maskottchen – ${pose}`}>
        {is3d && (
          <defs>
            <linearGradient id={`navy-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c4063" />
              <stop offset="48%" stopColor="#1a2b48" />
              <stop offset="100%" stopColor="#0d182d" />
            </linearGradient>
            <linearGradient id={`screen-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e4edfb" />
            </linearGradient>
          </defs>
        )}

        {/* ground shadow */}
        <ellipse cx="120" cy="288" rx="72" ry="13" fill="#15233f" opacity={is3d ? 0.18 : 0.07} />

        {/* antennae */}
        <g className="m-ant m-ant-l">
          <path d="M108 64 Q100 42 92 30" fill="none" stroke={body} strokeWidth="7" strokeLinecap="round" />
          <circle cx="90" cy="27" r="9" fill={body} />
          {is3d && <circle cx="87" cy="24" r="2.6" fill="#fff" opacity="0.5" />}
        </g>
        <g className="m-ant m-ant-r">
          <path d="M132 64 Q140 42 148 30" fill="none" stroke={body} strokeWidth="7" strokeLinecap="round" />
          <circle cx="150" cy="27" r="9" fill={body} />
          {is3d && <circle cx="147" cy="24" r="2.6" fill="#fff" opacity="0.5" />}
        </g>

        {/* ears */}
        <rect x="42" y="96" width="16" height="36" rx="8" fill={body} />
        <rect x="182" y="96" width="16" height="36" rx="8" fill={body} />

        {/* feet */}
        <rect x="88" y="236" width="26" height="16" rx="8" fill={body} />
        <rect x="126" y="236" width="26" height="16" rx="8" fill={body} />

        {/* body */}
        <rect x="74" y="160" width="92" height="82" rx="26" fill={body} />
        {is3d && <ellipse cx="120" cy="172" rx="32" ry="9" fill="#fff" opacity="0.08" />}

        {/* chest panel — small screen */}
        <g>
          <rect x="96" y="182" width="48" height="32" rx="9" fill={screen} stroke={SCREEN_BORDER} strokeWidth="1.5" />
        </g>

        {/* head */}
        <rect x="50" y="56" width="140" height="112" rx="36" fill={body} />
        {is3d && <ellipse cx="120" cy="80" rx="54" ry="18" fill="#fff" opacity="0.12" />}

        {/* face screen */}
        <rect x="66" y="74" width="108" height="80" rx="22" fill={screen} stroke={SCREEN_BORDER} strokeWidth="1.5" />

        {cheeks}
        {eyes}
        {mouth}

        {/* arms in front of body */}
        {arms}

        {extras}
      </svg>
    );
  }

  /* The pure logo mark (faithful, monochrome) — for the merge explainer */
  function LogoMark({ size = 120, color = NAVY }) {
    return (
      <svg viewBox="0 0 140 140" width={size} height={size} style={{ display: 'block' }} role="img" aria-label="SmartApply Logo">
        {/* antennae */}
        <g fill="none" stroke={color} strokeWidth="7" strokeLinecap="round">
          <path d="M58 36 L52 18" />
          <path d="M82 36 L88 18" />
        </g>
        <circle cx="50" cy="14" r="8" fill={color} />
        <circle cx="90" cy="14" r="8" fill={color} />
        {/* ears */}
        <rect x="20" y="64" width="14" height="34" rx="7" fill={color} />
        <rect x="106" y="64" width="14" height="34" rx="7" fill={color} />
        {/* body */}
        <rect x="30" y="34" width="80" height="84" rx="22" fill={color} />
        {/* document */}
        <rect x="50" y="52" width="40" height="50" rx="7" fill="#fff" />
        <path d="M82 52 L90 60 L82 60 Z" fill={color} opacity=".25" />
        <line x1="58" y1="66" x2="74" y2="66" stroke={color} strokeWidth="4" strokeLinecap="round" opacity=".5" />
        <path d="M56 82 L65 91 L84 70" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  window.Mascot = Mascot;
  window.LogoMark = LogoMark;
})();
