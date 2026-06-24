// profile-shared.jsx — pieces every variant reuses: the nav rail, edit-text
// helper, micro components.

const Edit = ({ as: As = 'span', children, multiline = false, style, ...rest }) => {
  // Inline-editable text using contentEditable. Spell check off because the
  // demo is a static design — we don't want red squigglies under proper nouns.
  return (
    <As
      className="sa-edit"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      style={{ display: multiline ? 'block' : 'inline-block', ...style }}
      {...rest}
    >{children}</As>
  );
};

window.SAEdit = Edit;

const NavRail = ({ accent }) => {
  const I = window.SAIcons;
  const items = [
    { icon: I.home,      label: 'Dashboard' },
    { icon: I.user,      label: 'Profil', active: true },
    { icon: I.doc,       label: 'Bewerbungen', count: 12 },

    { icon: I.chart,     label: 'Analytics' },
    { icon: I.chat,      label: 'Interview-Coach' },
    { icon: I.cog,       label: 'Einstellungen' },
  ];
  return (
    <aside className="sa-rail">
      <div className="sa-rail__brand">
        <span className="sa-rail__brand-mark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="5" width="16" height="15" rx="3" stroke="white" strokeWidth="2" />
            <path d="M8 3v4M16 3v4M4 11h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="m9 15 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Applo
      </div>
      <nav className="sa-rail__group" aria-label="Navigation">
        <div className="sa-rail__group-label">Menü</div>
        {items.map((it) => {
          const Ic = it.icon;
          return (
            <div key={it.label}
                 className={`sa-rail__item ${it.active ? 'sa-rail__item--active' : ''}`}>
              <Ic />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.count ? (
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: '1px 6px',
                  borderRadius: 999, background: 'var(--ink-100)',
                  color: 'var(--ink-600)',
                }}>{it.count}</span>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="sa-rail__footer">
        <div className="sa-rail__avatar">JD</div>
        <div className="sa-rail__user">
          <div className="sa-rail__user-name">John Demo</div>
          <div className="sa-rail__user-mail">demo@smartapply.com</div>
          <span className="sa-rail__premium">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="m3 7 4 5 5-7 5 7 4-5v12H3z" /></svg>
            Premium
          </span>
        </div>
      </div>
    </aside>
  );
};

window.SANavRail = NavRail;
