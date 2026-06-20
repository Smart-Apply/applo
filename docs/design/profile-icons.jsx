// profile-icons.jsx — Lightweight stroked icons used across all variants.
// Stroked SVGs at 1.6 weight, currentColor-driven so we can recolor
// per-variant without touching markup.

const Icon = ({ d, size = 16, fill, viewBox = "0 0 24 24", stroke = 1.6, children, ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill || "none"}
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  home:    (p) => <Icon {...p}><path d="M3 11l9-8 9 8" /><path d="M5 9.5V21h14V9.5" /></Icon>,
  user:    (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Icon>,
  doc:     (p) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Icon>,
  spark:   (p) => <Icon {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" /></Icon>,
  bolt:    (p) => <Icon {...p}><path d="M13 3 4 14h7l-1 7 9-11h-7z" /></Icon>,
  chart:   (p) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></Icon>,
  chat:    (p) => <Icon {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></Icon>,
  cog:     (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 16.9l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7.1 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>,
  pin:     (p) => <Icon {...p}><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></Icon>,
  mail:    (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>,
  phone:   (p) => <Icon {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></Icon>,
  link:    (p) => <Icon {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></Icon>,
  ext:     (p) => <Icon {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></Icon>,
  briefcase: (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Icon>,
  cap:     (p) => <Icon {...p}><path d="M2 9 12 4l10 5-10 5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></Icon>,
  code:    (p) => <Icon {...p}><path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16" /></Icon>,
  globe:   (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>,
  award:   (p) => <Icon {...p}><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></Icon>,
  folder:  (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>,
  pen:     (p) => <Icon {...p}><path d="M16 3l5 5L8 21H3v-5z" /></Icon>,
  arrow:   (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>,
  check:   (p) => <Icon {...p}><path d="m4 12 5 5L20 6" /></Icon>,
  download:(p) => <Icon {...p}><path d="M12 3v13M6 11l6 6 6-6M5 21h14" /></Icon>,
  share:   (p) => <Icon {...p}><circle cx="6" cy="12" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m9 11 6-3M9 13l6 3" /></Icon>,
  logout:  (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>,
  dot:     (p) => <Icon {...p} stroke={0}><circle cx="12" cy="12" r="4" fill="currentColor" /></Icon>,
  star:    (p) => <Icon {...p}><path d="m12 3 2.6 5.4 5.9.9-4.3 4.2 1 5.9L12 16.6 6.8 19.4l1-5.9-4.3-4.2 5.9-.9z" /></Icon>,
  crown:   (p) => <Icon {...p}><path d="m3 7 4 5 5-7 5 7 4-5v12H3z" /></Icon>,
  lang:    (p) => <Icon {...p}><path d="M3 5h12M9 3v2c0 4-2.5 8-6 10M5 9c0 3 4 7 9 8" /><path d="M22 22 17 11l-5 11M14 18h6" /></Icon>,
  copy:    (p) => <Icon {...p}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></Icon>,
};

window.SAIcon = Icon;
window.SAIcons = I;
