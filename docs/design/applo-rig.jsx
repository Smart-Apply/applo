/* ============================================================
   Applo — Rigged flat 2D mascot for a CSS/SVG state machine.
   One consistent rig with SEPARATE LAYERS so each part moves
   independently:  antennas (L/R) · eyes/screen · arms (L/R) · body.
   Flat style only — no gradients, no shadows, no glow.
   State is driven by a class on the <svg>: state-idle / state-wave
   / state-think / state-success / state-done  (handled in CSS).
   ============================================================ */
(function () {
  const NAVY   = '#15233f';
  const SCREEN = '#eef3fb';
  const BORDER = 'rgba(21,35,63,.10)';
  const BLUE   = '#2563eb';
  const GREEN  = '#15a34a';
  const GEARBG = '#e7eefa';

  /* A single cog/gear: toothed disc with a hub hole. Spins via CSS on `cls`. */
  function Gear({ cx, cy, r, teeth = 8, fill, cls }) {
    const tw = r * 0.42, th = r * 0.6;
    const ts = [];
    for (let i = 0; i < teeth; i++) {
      const ang = (360 / teeth) * i;
      ts.push(
        <rect key={i} x={cx - tw / 2} y={cy - r - th * 0.45} width={tw} height={th} rx={tw * 0.3}
              fill={fill} transform={`rotate(${ang} ${cx} ${cy})`} />
      );
    }
    return (
      <g className={cls} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {ts}
        <circle cx={cx} cy={cy} r={r} fill={fill} />
        <circle cx={cx} cy={cy} r={r * 0.34} fill={GEARBG} />
      </g>
    );
  }

  function ApploRig({ state = 'idle', size = 280, id = 'applo' }) {
    const S = NAVY;
    return (
      <svg className={`applo state-${state}`} data-applo={id}
           viewBox="0 0 240 300" width={size} height={size * 300 / 240}
           style={{ display: 'block', overflow: 'visible' }}
           role="img" aria-label={`Applo – ${state}`}>

        <g className="root-float">
          <g className="rig">

            {/* ---- ANTENNAS (separate layers) ---- */}
            <g className="ant ant-l">
              <path d="M108 64 Q100 42 92 30" fill="none" stroke={S} strokeWidth="7" strokeLinecap="round" />
              <circle cx="90" cy="27" r="9" fill={S} />
            </g>
            <g className="ant ant-r">
              <path d="M132 64 Q140 42 148 30" fill="none" stroke={S} strokeWidth="7" strokeLinecap="round" />
              <circle cx="150" cy="27" r="9" fill={S} />
            </g>

            {/* ---- EARS ---- */}
            <rect x="42" y="96" width="16" height="36" rx="8" fill={S} />
            <rect x="182" y="96" width="16" height="36" rx="8" fill={S} />

            {/* ---- FEET ---- */}
            <rect x="88" y="236" width="26" height="16" rx="8" fill={S} />
            <rect x="126" y="236" width="26" height="16" rx="8" fill={S} />

            {/* ---- ARMS: idle/down (default) ---- */}
            <g className="arm a-l-down">
              <path d="M86 178 L72 206" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="70" cy="210" r="13" fill={S} />
            </g>
            <g className="arm a-r-down">
              <path d="M154 178 L168 206" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="170" cy="210" r="13" fill={S} />
            </g>

            {/* ---- ARMS: raised (success) ---- */}
            <g className="arm a-l-up">
              <path d="M86 174 L58 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="54" cy="146" r="13" fill={S} />
            </g>
            <g className="arm a-r-up">
              <path d="M154 174 L182 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="186" cy="146" r="13" fill={S} />
            </g>

            {/* ---- ARM: right raised for waving ---- */}
            <g className="arm a-r-wave">
              <path d="M154 174 L184 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="188" cy="146" r="13" fill={S} />
            </g>

            {/* ---- ARM: right thumbs-up (done) ---- */}
            <g className="arm a-r-thumb">
              <path d="M154 178 L176 162" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="180" cy="158" r="13" fill={S} />
              <rect x="175.5" y="141" width="9" height="17" rx="4.5" fill={S} />
            </g>


            {/* ---- BODY (breathes) ---- */}
            <g className="body">
              <rect x="74" y="160" width="92" height="82" rx="26" fill={S} />
              {/* chest panel */}
              <rect x="96" y="182" width="48" height="32" rx="9" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />
              {/* chest checkmark (draw-on) */}
              <path className="fx-check" d="M104 199 L112 207 L136 189"
                    fill="none" stroke={GREEN} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* ---- HEAD ---- */}
            <rect x="50" y="56" width="140" height="112" rx="36" fill={S} />
            {/* face screen */}
            <rect x="66" y="74" width="108" height="80" rx="22" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />

            {/* cheeks */}
            <g className="cheeks" fill={BLUE} opacity="0.16">
              <ellipse cx="85" cy="128" rx="8" ry="5" />
              <ellipse cx="155" cy="128" rx="8" ry="5" />
            </g>

            {/* ---- EYES: open (idle/think/done) ---- */}
            <g className="ey-open">
              <ellipse cx="102" cy="110" rx="8" ry="9" fill={S} />
              <ellipse cx="138" cy="110" rx="8" ry="9" fill={S} />
              <circle cx="105" cy="106" r="3" fill="#fff" />
              <circle cx="141" cy="106" r="3" fill="#fff" />
            </g>
            {/* ---- EYES: happy squint (wave/success) ---- */}
            <g className="ey-happy" fill="none" stroke={S} strokeWidth="5" strokeLinecap="round">
              <path d="M94 113 Q102 102 110 113" />
              <path d="M130 113 Q138 102 146 113" />
            </g>

            {/* ---- BROW: thoughtful (writing) ---- */}
            <path className="brow-think" d="M130 99 Q139 94 148 99" fill="none" stroke={S} strokeWidth="4" strokeLinecap="round" />

            {/* ---- MOUTHS ---- */}
            <path className="mo-neutral" d="M104 130 Q120 146 136 130" fill="none" stroke={S} strokeWidth="5.5" strokeLinecap="round" />
            <path className="mo-happy" d="M104 128 Q120 153 136 128 Z" fill={S} />
            <ellipse className="mo-o" cx="120" cy="134" rx="6" ry="5" fill={S} />

            {/* ---- ARM: right hand to chin (thinking) — drawn in FRONT of face ---- */}
            <g className="arm a-r-chin">
              <path d="M158 188 L150 156" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="149" cy="150" r="13" fill={S} />
            </g>

            {/* ---- FX: processing — gears turning in the belly (pondering) ---- */}
            <g className="fx-gears">
              {/* compact machine window (matches chest-panel scale) */}
              <rect x="95" y="181" width="50" height="36" rx="10" fill={GEARBG} stroke={NAVY} strokeWidth="2" />
              <Gear cx={114} cy={197} r={10} teeth={9} fill={NAVY} cls="gear gear-1" />
              <Gear cx={131} cy={206} r={7.5} teeth={8} fill={NAVY} cls="gear gear-2" />
            </g>

            {/* ---- FX: thinking — thought bubble w/ dots (upper right) ---- */}
            <g className="fx-dots">
              {/* trailing bubbles toward head */}
              <circle className="bub bub-1" cx="170" cy="48" r="5" fill="#fff" stroke={NAVY} strokeWidth="2" />
              <circle className="bub bub-2" cx="182" cy="36" r="3.4" fill="#fff" stroke={NAVY} strokeWidth="1.8" />
              {/* main bubble */}
              <g className="bub bub-main">
                <rect x="166" y="2" width="68" height="30" rx="15" fill="#fff" stroke={NAVY} strokeWidth="2" />
                <circle className="d1" cx="184" cy="17" r="4.5" fill={NAVY} />
                <circle className="d2" cx="200" cy="17" r="4.5" fill={NAVY} />
                <circle className="d3" cx="216" cy="17" r="4.5" fill={NAVY} />
              </g>
            </g>

            {/* ---- FX: confetti (success) ---- */}
            <g className="fx-confetti">
              <circle className="c1" cx="60" cy="70" r="5" fill={BLUE} />
              <circle className="c2" cx="180" cy="74" r="5" fill={GREEN} />
              <circle className="c3" cx="120" cy="30" r="4.5" fill={GREEN} />
            </g>

            {/* ======================================================
                 FEATURE-POSEN — passend zu den App-Bereichen.
                 Jede Gruppe ist per Default in CSS ausgeblendet und
                 wird nur über die jeweilige state-* Klasse gezeigt.
               ====================================================== */}

            {/* ---- TOOL: Lupe vor dem Gesicht (Job-Suche / search) ---- */}
            <g className="tool-search">
              {/* Arm hoch zum Griff */}
              <path d="M156 182 L162 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="163" cy="147" r="13" fill={S} />
              {/* Griff von der Hand zur Linse */}
              <line x1="160" y1="145" x2="150" y2="124" stroke={S} strokeWidth="8" strokeLinecap="round" />
              {/* Linse genau über dem rechten Auge */}
              <circle cx="138" cy="110" r="19" fill="#fff" stroke={S} strokeWidth="6" />
              {/* vergrößertes Auge im Glas, Pupille scannt */}
              <g className="search-eye">
                <circle className="se-pupil" cx="138" cy="110" r="9" fill={S} />
                <circle className="se-glint" cx="141" cy="106" r="3.4" fill="#fff" />
              </g>
              {/* Glanzreflex auf dem Glas */}
              <path d="M126 100 q4 -7 13 -7" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
            </g>

            {/* ---- TOOL: Applo spricht mit dem Nutzer (Interview-Coach / coach) ---- */}
            <g className="tool-coach">
              {/* offene, erklärende Handgeste */}
              <g className="coach-arm">
                <path d="M154 178 L182 164" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
                <circle cx="186" cy="161" r="13" fill={S} />
              </g>
              {/* kleine Schallwellen — Applo spricht laut */}
              <g className="fx-say">
                <path className="sw sw1" d="M198 122 q9 11 0 22" fill="none" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
                <path className="sw sw2" d="M209 115 q14 16 0 36" fill="none" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
              </g>
            </g>

            {/* ---- FX: Blitz + Speed-Lines (Auto-Apply / auto) ---- */}
            <g className="fx-auto">
              <path className="bolt" d="M128 6 L106 46 L122 46 L110 78 L146 38 L128 38 Z"
                    fill={BLUE} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <g className="speed speed-l">
                <line x1="28" y1="150" x2="52" y2="150" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
                <line x1="24" y1="168" x2="44" y2="168" stroke={BLUE} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
              </g>
              <g className="speed speed-r">
                <line x1="212" y1="150" x2="188" y2="150" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
                <line x1="216" y1="168" x2="196" y2="168" stroke={BLUE} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
              </g>
            </g>

          </g>{/* /rig */}
        </g>{/* /root-float */}
      </svg>
    );
  }

  window.ApploRig = ApploRig;
})();
