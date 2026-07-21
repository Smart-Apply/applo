'use client';

export type ApploState =
  | 'idle'
  | 'wave'
  | 'think'
  | 'process'
  | 'success'
  | 'done'
  | 'coach'
  | 'search'
  | 'auto'
  | 'love';

const NAVY = '#15233f';
const SCREEN = '#eef3fb';
const BORDER = 'rgba(21,35,63,.10)';
const BLUE = '#40639C';
const GREEN = '#15a34a';
const GEARBG = '#e7eefa';
const HEART = '#ff5a72';
const HAND = '#3a4f76';

function Heart({ cx, cy, size, fill }: { cx: number; cy: number; size: number; fill: string }) {
  const sc = size / 32;
  return (
    <g transform={`translate(${cx - 16 * sc} ${cy - 14 * sc}) scale(${sc})`}>
      <path
        d="M16 28 C16 28 2 18 2 9 C2 4 6 2 9 2 C12 2 14 4 16 7 C18 4 20 2 23 2 C26 2 30 4 30 9 C30 18 16 28 16 28 Z"
        fill={fill}
      />
    </g>
  );
}

function Gear({
  cx,
  cy,
  r,
  teeth = 8,
  fill,
  cls,
}: {
  cx: number;
  cy: number;
  r: number;
  teeth?: number;
  fill: string;
  cls: string;
}) {
  const tw = r * 0.42;
  const th = r * 0.6;
  const ts = [];
  for (let i = 0; i < teeth; i++) {
    const ang = (360 / teeth) * i;
    ts.push(
      <rect
        key={i}
        x={cx - tw / 2}
        y={cy - r - th * 0.45}
        width={tw}
        height={th}
        rx={tw * 0.3}
        fill={fill}
        transform={`rotate(${ang} ${cx} ${cy})`}
      />,
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

export function ApploRig({
  state = 'idle',
  size = 280,
  className,
  ...rest
}: {
  state?: ApploState;
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}) {
  const S = NAVY;
  return (
    <svg
      className={`applo state-${state}${className ? ` ${className}` : ''}`}
      viewBox="0 0 240 300"
      width={size}
      height={(size * 300) / 240}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label={`Applo – ${state}`}
      {...rest}
    >
      <g className="root-float">
        <g className="rig">
          {/* Antennas */}
          <g className="ant ant-l">
            <path d="M108 64 Q100 42 92 30" fill="none" stroke={S} strokeWidth="7" strokeLinecap="round" />
            <circle cx="90" cy="27" r="9" fill={S} />
          </g>
          <g className="ant ant-r">
            <path d="M132 64 Q140 42 148 30" fill="none" stroke={S} strokeWidth="7" strokeLinecap="round" />
            <circle cx="150" cy="27" r="9" fill={S} />
          </g>

          {/* Ears */}
          <rect x="42" y="96" width="16" height="36" rx="8" fill={S} />
          <rect x="182" y="96" width="16" height="36" rx="8" fill={S} />

          {/* Feet */}
          <rect x="88" y="236" width="26" height="16" rx="8" fill={HAND} />
          <rect x="126" y="236" width="26" height="16" rx="8" fill={HAND} />

          {/* Arms: idle/down */}
          <g className="arm a-l-down">
            <path d="M86 178 L72 206" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="70" cy="210" r="13" fill={HAND} />
          </g>
          <g className="arm a-r-down">
            <path d="M154 178 L168 206" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="170" cy="210" r="13" fill={HAND} />
          </g>

          {/* Arms: raised (success) */}
          <g className="arm a-l-up">
            <path d="M86 174 L58 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="54" cy="146" r="13" fill={HAND} />
          </g>
          <g className="arm a-r-up">
            <path d="M154 174 L182 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="186" cy="146" r="13" fill={HAND} />
          </g>

          {/* Arm: right wave */}
          <g className="arm a-r-wave">
            <path d="M154 174 L184 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="188" cy="146" r="13" fill={HAND} />
          </g>

          {/* Arm: right thumbs-up (done) */}
          <g className="arm a-r-thumb">
            <path d="M154 178 L176 162" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="180" cy="158" r="13" fill={HAND} />
            <rect x="175.5" y="141" width="9" height="17" rx="4.5" fill={HAND} />
          </g>

          {/* Body */}
          <g className="body">
            <rect x="74" y="160" width="92" height="82" rx="26" fill={S} />
            <rect x="96" y="182" width="48" height="32" rx="9" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />
            <path
              className="fx-check"
              d="M104 199 L112 207 L136 189"
              fill="none"
              stroke={GREEN}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Head */}
          <rect x="50" y="56" width="140" height="112" rx="36" fill={S} />
          <rect x="66" y="74" width="108" height="80" rx="22" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />

          {/* Cheeks */}
          <g className="cheeks" fill={BLUE} opacity="0.16">
            <ellipse cx="85" cy="128" rx="8" ry="5" />
            <ellipse cx="155" cy="128" rx="8" ry="5" />
          </g>

          {/* Eyes: open */}
          <g className="ey-open">
            <ellipse cx="102" cy="110" rx="8" ry="9" fill={S} />
            <ellipse cx="138" cy="110" rx="8" ry="9" fill={S} />
            <circle cx="105" cy="106" r="3" fill="#fff" />
            <circle cx="141" cy="106" r="3" fill="#fff" />
          </g>
          {/* Eyes: happy squint */}
          <g className="ey-happy" fill="none" stroke={S} strokeWidth="5" strokeLinecap="round">
            <path d="M94 113 Q102 102 110 113" />
            <path d="M130 113 Q138 102 146 113" />
          </g>

          {/* Brow: thoughtful */}
          <path className="brow-think" d="M130 99 Q139 94 148 99" fill="none" stroke={S} strokeWidth="4" strokeLinecap="round" />

          {/* Mouths */}
          <path className="mo-neutral" d="M104 130 Q120 146 136 130" fill="none" stroke={S} strokeWidth="5.5" strokeLinecap="round" />
          <path className="mo-happy" d="M104 128 Q120 153 136 128 Z" fill={S} />
          <ellipse className="mo-o" cx="120" cy="134" rx="6" ry="5" fill={S} />

          {/* Arm: chin (thinking) - in front of face */}
          <g className="arm a-r-chin">
            <path d="M158 188 L150 156" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="149" cy="150" r="13" fill={HAND} />
          </g>

          {/* FX: gears (processing) */}
          <g className="fx-gears">
            <rect x="95" y="181" width="50" height="36" rx="10" fill={GEARBG} stroke={NAVY} strokeWidth="2" />
            <Gear cx={114} cy={197} r={10} teeth={9} fill={NAVY} cls="gear gear-1" />
            <Gear cx={131} cy={206} r={7.5} teeth={8} fill={NAVY} cls="gear gear-2" />
          </g>

          {/* FX: thought bubble (thinking) */}
          <g className="fx-dots">
            <circle className="bub bub-1" cx="170" cy="48" r="5" fill="#fff" stroke={NAVY} strokeWidth="2" />
            <circle className="bub bub-2" cx="182" cy="36" r="3.4" fill="#fff" stroke={NAVY} strokeWidth="1.8" />
            <g className="bub bub-main">
              <rect x="166" y="2" width="68" height="30" rx="15" fill="#fff" stroke={NAVY} strokeWidth="2" />
              <circle className="d1" cx="184" cy="17" r="4.5" fill={NAVY} />
              <circle className="d2" cx="200" cy="17" r="4.5" fill={NAVY} />
              <circle className="d3" cx="216" cy="17" r="4.5" fill={NAVY} />
            </g>
          </g>

          {/* FX: confetti (success) */}
          <g className="fx-confetti">
            <circle className="c1" cx="60" cy="70" r="5" fill={BLUE} />
            <circle className="c2" cx="180" cy="74" r="5" fill={GREEN} />
            <circle className="c3" cx="120" cy="30" r="4.5" fill={GREEN} />
          </g>


          {/* TOOL: speaking gesture + sound waves (coach) */}
          <g className="tool-coach">
            <g className="coach-arm">
              <path d="M154 178 L182 164" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
              <circle cx="186" cy="161" r="13" fill={HAND} />
            </g>
            <g className="fx-say">
              <path className="sw sw1" d="M198 122 q9 11 0 22" fill="none" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
              <path className="sw sw2" d="M209 115 q14 16 0 36" fill="none" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
            </g>
          </g>

          {/* TOOL: magnifying glass over the eye (search) */}
          <g className="tool-search">
            <path d="M156 182 L162 150" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <circle cx="163" cy="147" r="13" fill={HAND} />
            <line x1="160" y1="145" x2="150" y2="124" stroke={S} strokeWidth="8" strokeLinecap="round" />
            <circle cx="138" cy="110" r="19" fill="#fff" stroke={S} strokeWidth="6" />
            <g className="search-eye">
              <circle className="se-pupil" cx="138" cy="110" r="9" fill={S} />
              <circle className="se-glint" cx="141" cy="106" r="3.4" fill="#fff" />
            </g>
            <path d="M126 100 q4 -7 13 -7" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
          </g>

          {/* FX: lightning bolt + speed lines (auto-apply) */}
          <g className="fx-auto">
            <path
              className="bolt"
              d="M128 6 L106 46 L122 46 L110 78 L146 38 L128 38 Z"
              fill={BLUE}
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <g className="speed speed-l">
              <line x1="28" y1="150" x2="52" y2="150" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
              <line x1="24" y1="168" x2="44" y2="168" stroke={BLUE} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
            </g>
            <g className="speed speed-r">
              <line x1="212" y1="150" x2="188" y2="150" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
              <line x1="216" y1="168" x2="196" y2="168" stroke={BLUE} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
            </g>
          </g>

          {/* LOVE: heart eyes */}
          <g className="ey-hearts">
            <Heart cx={101} cy={112} size={19} fill={HEART} />
            <Heart cx={139} cy={112} size={19} fill={HEART} />
          </g>

          {/* LOVE: heart cradled in both hands */}
          <g className="tool-love">
            <path d="M86 178 L106 197" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <path d="M154 178 L134 197" fill="none" stroke={S} strokeWidth="20" strokeLinecap="round" />
            <g className="love-heart">
              <Heart cx={120} cy={176} size={58} fill={HEART} />
            </g>
            <circle cx="107" cy="199" r="13" fill={HAND} />
            <circle cx="133" cy="199" r="13" fill={HAND} />
          </g>

          {/* FX: rising hearts (love) */}
          <g className="fx-love">
            <g className="lh lh1"><Heart cx={64} cy={92} size={15} fill={HEART} /></g>
            <g className="lh lh2"><Heart cx={180} cy={84} size={20} fill={BLUE} /></g>
            <g className="lh lh3"><Heart cx={120} cy={30} size={13} fill={HEART} /></g>
          </g>

        </g>
      </g>
    </svg>
  );
}

const FLY_NAVY = '#15233f';
const FLY_ANT = '#26395c';
const FLY_ACCENT = '#5581C7';

/**
 * Flying Applo for the dashboard-hero "Superman" entrance. Renders the
 * fly-in rig (motion streaks, swept antennas, reach + wave arms, and the
 * fly/happy face pair). All animation lives in globals.css (`.dash-flyer`,
 * `dashFly`/`dashWave`/`dashBob`) and is driven by `.landed`/`.rested`
 * classes on the wrapping `.dash-flyer` element.
 */
export function ApploFlyer() {
  return (
    <svg
      className="dash-applo"
      viewBox="0 0 240 300"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        filter: 'drop-shadow(0 12px 20px rgba(0,0,0,.35))',
      }}
      aria-hidden
    >
      {/* motion streaks — faded + stopped once .landed */}
      <g stroke={FLY_ACCENT} strokeWidth="5" strokeLinecap="round">
        <line className="dstreak d1" x1="-46" y1="150" x2="46" y2="150" />
        <line className="dstreak d2" x1="-58" y1="186" x2="34" y2="186" />
        <line className="dstreak d3" x1="-40" y1="216" x2="40" y2="216" />
      </g>
      <g>
        {/* antennas swept back in the airstream */}
        <g>
          <path d="M108 62 Q92 44 80 40" fill="none" stroke={FLY_ANT} strokeWidth="7" strokeLinecap="round" />
          <circle cx="77" cy="39" r="8" fill={FLY_ANT} />
        </g>
        <g>
          <path d="M132 62 Q120 40 108 34" fill="none" stroke={FLY_ANT} strokeWidth="7" strokeLinecap="round" />
          <circle cx="105" cy="33" r="8" fill={FLY_ANT} />
        </g>
        <rect x="42" y="96" width="16" height="34" rx="8" fill={FLY_ANT} />
        <rect x="182" y="96" width="16" height="34" rx="8" fill={FLY_ANT} />
        {/* trailing legs */}
        <path d="M104 240 L92 276" fill="none" stroke={FLY_NAVY} strokeWidth="16" strokeLinecap="round" />
        <path d="M138 240 L156 274" fill="none" stroke={FLY_NAVY} strokeWidth="16" strokeLinecap="round" />
        <circle cx="90" cy="279" r="9" fill={HAND} />
        <circle cx="158" cy="277" r="9" fill={HAND} />
        {/* left arm reaching forward */}
        <g>
          <path d="M86 176 L60 202" fill="none" stroke={FLY_NAVY} strokeWidth="20" strokeLinecap="round" />
          <circle cx="56" cy="206" r="13" fill={HAND} />
        </g>
        {/* body with sparkle screen */}
        <g>
          <rect x="74" y="160" width="92" height="82" rx="26" fill={FLY_NAVY} stroke="rgba(255,255,255,.14)" strokeWidth="2" />
          <rect x="96" y="182" width="48" height="32" rx="9" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />
          <path
            d="M120 186 C122 196 124 198 134 200 C124 202 122 204 120 214 C118 204 116 202 106 200 C116 198 118 196 120 186 Z"
            fill={FLY_ACCENT}
          />
        </g>
        {/* head */}
        <rect x="50" y="56" width="140" height="112" rx="36" fill={FLY_NAVY} stroke="rgba(255,255,255,.14)" strokeWidth="2" />
        <rect x="66" y="74" width="108" height="80" rx="22" fill={SCREEN} stroke={BORDER} strokeWidth="1.5" />
        <g fill={FLY_ACCENT} opacity="0.18">
          <ellipse cx="86" cy="128" rx="8" ry="5" />
          <ellipse cx="154" cy="128" rx="8" ry="5" />
        </g>
        <g className="dash-brow" stroke={FLY_NAVY} strokeWidth="4" strokeLinecap="round">
          <path d="M92 96 L112 101" />
          <path d="M148 96 L128 101" />
        </g>
        <g className="dash-eyes-open">
          <g>
            <ellipse cx="104" cy="112" rx="8" ry="9" fill={FLY_NAVY} />
            <circle cx="107" cy="108" r="3" fill="#fff" />
          </g>
          <g>
            <ellipse cx="140" cy="112" rx="8" ry="9" fill={FLY_NAVY} />
            <circle cx="143" cy="108" r="3" fill="#fff" />
          </g>
        </g>
        <g className="dash-eyes-happy" fill="none" stroke={FLY_NAVY} strokeWidth="5" strokeLinecap="round">
          <path d="M96 115 Q104 104 112 115" />
          <path d="M132 115 Q140 104 148 115" />
        </g>
        <path className="dash-mouth-fly" d="M107 133 Q122 144 137 132" fill="none" stroke={FLY_NAVY} strokeWidth="5.5" strokeLinecap="round" />
        <path className="dash-mouth-happy" d="M104 130 Q122 152 140 130 Z" fill={FLY_NAVY} />
        {/* right arm — raised in flight, waves on landing, lowers at rest */}
        <g className="dash-wave-arm">
          <path d="M154 176 L188 150" fill="none" stroke={FLY_NAVY} strokeWidth="20" strokeLinecap="round" />
          <circle cx="192" cy="146" r="14" fill={HAND} />
        </g>
      </g>
    </svg>
  );
}
