/* ============================================================
   flow.jsx — New application wizard
   Step 1 Stelle hinzufügen · Step 2 Konfigurieren · Loading
   Improvements: #1 step indicator, #5 live template preview, #2 loading
   ============================================================ */

const WIZ_STEPS = [
  { label: "Stelle hinzufügen", icon: "briefcase" },
  { label: "Konfigurieren", icon: "gear" },
  { label: "Fertig", icon: "sparkles" },
];

/* ---------- Step 1: Add job -------------------------------- */
function StepAddJob({ onNext, onCancel }) {
  const [mode, setMode] = useState("link");
  const [val, setVal] = useState("https://www.linkedin.com/jobs/view/4422023519");
  const [state, setState] = useState("idle"); // idle | loading | done
  const analyze = () => { setState("loading"); setTimeout(() => setState("done"), 1400); };

  return (
    <div className="fade-in">
      <div className="wizard-head">
        <h1 className="page-title">Neue Bewerbung</h1>
        <p className="page-sub">Füge eine Stellenanzeige hinzu und erstelle deine Bewerbung mit KI.</p>
      </div>
      <div style={{ position: "relative" }}>
        <StepIndicator steps={WIZ_STEPS} current={0}/>
        <Note n="1" title="3 klare Phasen statt 2" side="right"/>
      </div>
      <ApploGuide step="add"/>

      <div className="wizard-card card" style={{ maxWidth: 720, margin: "26px auto 0" }}>
        {state !== "done" ? (
          <>
            <h2>Stelle hinzufügen</h2>
            <p className="lead">Füge die Stellenanzeige per Link oder durch Einfügen des Textes hinzu.</p>
            <div className="segmented" style={{ display: "flex", width: "100%" }}>
              <button className={mode === "link" ? "on" : ""} style={{ flex: 1 }} onClick={() => setMode("link")}>
                <Icon name="link" size={17}/> Link einfügen</button>
              <button className={mode === "text" ? "on" : ""} style={{ flex: 1 }} onClick={() => setMode("text")}>
                <Icon name="doc" size={17}/> Text einfügen</button>
            </div>
            <div style={{ marginTop: 20 }}>
              <p className="field-label">{mode === "link" ? "Link zur Stellenanzeige" : "Text der Stellenanzeige"}</p>
              {mode === "link"
                ? <input className="input" value={val} onChange={e => setVal(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/…"/>
                : <textarea className="input" rows={5} placeholder="Stellenbeschreibung hier einfügen…"/>}
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "7px 0 0" }}>Unterstützt LinkedIn, Indeed und weitere Jobportale.</p>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }} onClick={analyze} disabled={state === "loading"}>
              {state === "loading" ? <><Icon name="refresh" size={18} className="spin"/> Wird analysiert…</> : "Stellenanzeige analysieren"}
            </button>
          </>
        ) : (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green-bg)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name="check" size={24} stroke={2.6}/></span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 750 }}>Stelle erfasst</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>Die Stellenanzeige wurde erfolgreich gespeichert.</div>
              </div>
              <span className="pill pill-green" style={{ marginLeft: "auto" }}><Icon name="check" size={13} stroke={3}/> Gespeichert</span>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", background: "var(--surface-2)" }}>
              <Meta label="TITEL" val="Werkstudent (w/m/d) Projektmanagement Rhein Ruhr Express"/>
              <Meta label="UNTERNEHMEN" val="Siemens Mobility"/>
              <Meta label="STANDORT" val="Düsseldorf, North Rhine-Westphalia, Germany" last/>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-foot" style={{ maxWidth: 720, margin: "0 auto" }}>
        <button className="btn btn-quiet" onClick={onCancel}>Abbrechen</button>
        <button className="btn btn-primary" disabled={state !== "done"} onClick={onNext}>
          Weiter <Icon name="arrowRight" size={18}/>
        </button>
      </div>
    </div>
  );
}
function Meta({ label, val, last }) {
  return <div style={{ marginBottom: last ? 0 : 14 }}>
    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", color: "var(--muted)" }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 3 }}>{val}</div>
  </div>;
}

/* ---------- Step 2: Configure + live preview (Improvement 5) */
function StepConfigure({ onNext, onBack, coverLetter, setCoverLetter, accent, setAccent }) {
  const [lang, setLang] = useState("de");
  const [tplId, setTplId] = useState("sidebar");
  const [hoverId, setHoverId] = useState(null);
  const shownId = hoverId || tplId;
  const tpl = TEMPLATES.find(t => t.id === shownId);
  const langs = [["de", "🇩🇪 Deutsch"], ["en", "🇬🇧 English"], ["fr", "🇫🇷 Français"], ["es", "🇪🇸 Español"], ["it", "🇮🇹 Italiano"]];

  return (
    <div className="fade-in">
      <div className="wizard-head">
        <h1 className="page-title">Neue Bewerbung</h1>
        <p className="page-sub">Konfiguriere Sprache, Anschreiben und Design.</p>
      </div>
      <div style={{ position: "relative" }}>
        <StepIndicator steps={WIZ_STEPS} current={1}/>
      </div>
      <ApploGuide step="config"/>

      {/* options */}
      <div className="card" style={{ padding: "24px 28px", marginTop: 26 }}>
        <h2 style={{ fontSize: 19, fontWeight: 750, margin: "0 0 16px" }}>Optionen</h2>
        <div className="optrow" style={{ cursor: "pointer" }} onClick={() => setCoverLetter(!coverLetter)}>
          <span className={"checkbox" + (coverLetter ? "" : " off")}><Icon name="check" size={15} stroke={3}/></span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>Anschreiben generieren</div>
            <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>Erstellt ein auf die Stelle zugeschnittenes Anschreiben.</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <p className="field-label">Sprache der Bewerbung</p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {langs.map(([id, label]) => (
              <button key={id} onClick={() => setLang(id)}
                className="lang-pill" style={lang === id ? { borderColor: "var(--ink)", boxShadow: "0 0 0 2px #e3ecfb" } : {}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* template select + live preview */}
      <div className="card" style={{ padding: "24px 28px", marginTop: 18, position: "relative" }}>
        <Note n="5" title="Live-Vorschau mit echten Profildaten" side="left"/>
        <h2 style={{ fontSize: 19, fontWeight: 750, margin: "0 0 4px" }}>Design auswählen</h2>
        <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 20px" }}>
          Fahre über eine Vorlage, um rechts die Live-Vorschau mit deinen Daten zu sehen.</p>

        <div className="config-split">
          <div className="tpl-list">
            {TEMPLATES.map(t => (
              <button key={t.id} className={"tpl-card" + (tplId === t.id ? " sel" : "")}
                onMouseEnter={() => setHoverId(t.id)} onMouseLeave={() => setHoverId(null)}
                onClick={() => setTplId(t.id)}>
                <div className="tpl-thumb"><div style={{ transform: "scale(.18)", transformOrigin: "top left", width: 333, height: 444 }}>{t.render(accent)}</div></div>
                <div className="tpl-info">
                  <div className="tpl-name">{t.name} <span className="tpl-tag">{t.tag}</span></div>
                  <div className="tpl-desc">{t.desc}</div>
                  {t.id === "sidebar" && tplId === "sidebar" && (
                    <div className="swatches" onClick={e => e.stopPropagation()}>
                      <span className="lbl">Farbe</span>
                      {t.colors.map(([nm, c]) => (
                        <span key={c} title={nm} className={"swatch" + (accent === c ? " on" : "")}
                          style={{ background: c }} onClick={() => setAccent(c)}/>
                      ))}
                    </div>
                  )}
                </div>
                <span className={"tpl-check" + (tplId === t.id ? "" : " off")}>{tplId === t.id && <Icon name="check" size={15} stroke={3}/>}</span>
              </button>
            ))}
          </div>

          <div className="preview-pane">
            <div className="preview-head">
              <div className="t">Vorschau: <b>{tpl.name}</b></div>
              <span className="pill pill-blue"><Icon name="user" size={13}/> Deine Profildaten</span>
            </div>
            <div className="preview-frame">
              <span className="live-badge"><span className="blip"/> Live</span>
              <div key={shownId + accent} className="fade-in" style={{ transformOrigin: "top left" }}>
                <div className="resume-scale" style={{ width: 800, transform: "scale(.555)", transformOrigin: "top left" }}>
                  {tpl.render(accent)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrowLeft" size={18}/> Zurück</button>
        <button className="btn btn-primary" onClick={onNext}>Bewerbung erstellen <Icon name="sparkles" size={18}/></button>
      </div>
    </div>
  );
}

/* ---------- Loading screen (Improvement 2) ----------------- */
const LOAD_STEPS = [
  { key: "analyze", label: "Profil und Stellenanzeige werden analysiert", icon: "target", peek: "match" },
  { key: "cover",   label: "Anschreiben wird mit KI generiert",          icon: "doc",    peek: "cover" },
  { key: "resume",  label: "Lebenslauf wird auf die Stelle zugeschnitten", icon: "user",  peek: "resume" },
  { key: "save",    label: "Dokumente werden gespeichert",               icon: "download", peek: null },
];

function StepLoading({ onDone, coverLetter, accent = "#2f6fb0" }) {
  const steps = LOAD_STEPS.filter(s => coverLetter || s.key !== "cover");
  const TOTAL = 9000;
  const [pct, setPct] = useState(0);
  const [peek, setPeek] = useState(null);
  const start = useRef(Date.now());

  useEffect(() => {
    let raf;
    const tick = () => {
      const e = Date.now() - start.current;
      const p = Math.min(100, Math.round((e / TOTAL) * 100));
      setPct(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      // At 100%: let Applo's success animation (~1s) play, then hold the
      // celebration a short beat before moving on to the result screen.
      else setTimeout(onDone, 3200);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const perStep = 100 / steps.length;
  const activeIdx = Math.min(steps.length - 1, Math.floor(pct / perStep));
  const etaSec = Math.max(0, Math.ceil(((100 - pct) / 100) * (TOTAL / 1000)));
  const R = 50, C = 2 * Math.PI * R;

  return (
    <div className="fade-in">
      <div className="wizard-head">
        <h1 className="page-title">Neue Bewerbung</h1>
        <p className="page-sub">Deine Bewerbung wird mit KI erstellt – das dauert nur einen Moment.</p>
      </div>
      <StepIndicator steps={WIZ_STEPS} current={1}/>
      <ApploGuide step="loading" finishing={pct >= 100}/>

      <div className="load-wrap">
        <div className="load-card card" style={{ position: "relative" }}>
          <Note n="2" title="Echter Fortschritt + Restzeit + klickbare Vorschau" side="left"/>
          <div className="load-top">
            <div className="ring-wrap">
              <svg width="116" height="116" viewBox="0 0 116 116">
                <circle cx="58" cy="58" r={R} fill="none" stroke="#eef1f6" strokeWidth="9"/>
                <circle cx="58" cy="58" r={R} fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 58 58)"
                  style={{ transition: "stroke-dashoffset .15s linear" }}/>
              </svg>
              <div className="ring-pct"><div><div className="num">{pct}%</div><div className="lab">erstellt</div></div></div>
            </div>
            <div>
              <h2 className="load-headline">{pct < 100 ? steps[activeIdx].label : "Fertig!"}</h2>
              <div className="load-eta"><Icon name="clock" size={15}/> Geschätzte Restzeit: ~{etaSec} Sek.</div>
              <div className="load-now">Bitte schließe dieses Fenster nicht.</div>
            </div>
          </div>

          <div className="load-steps">
            {steps.map((s, i) => {
              const st = i < activeIdx ? "done" : i === activeIdx ? "active" : "todo";
              return (
                <div key={s.key} className={"lstep " + st}
                  onClick={() => st === "done" && s.peek && setPeek(s)}>
                  <span className="lico">
                    {st === "done" ? <Icon name="check" size={17} stroke={2.8}/>
                      : st === "active" ? <Icon name="refresh" size={17} className="spin"/>
                      : <Icon name={s.icon} size={17}/>}
                  </span>
                  <span className="ltxt">{s.label}</span>
                  {st === "done" && s.peek && <span className="lview"><Icon name="eye" size={15}/> Vorschau</span>}
                </div>
              );
            })}
          </div>
        </div>
        <p style={{ textAlign: "center", color: "var(--muted-2)", fontSize: 13, marginTop: 14 }}>
          Fertige Schritte kannst du anklicken, um eine Vorschau zu öffnen.</p>
      </div>

      {peek && <PeekModal step={peek} accent={accent} onClose={() => setPeek(null)}/>}
    </div>
  );
}

function PeekModal({ step, accent, onClose }) {
  return (
    <div className="peek-overlay" onClick={onClose}>
      <div className="peek" onClick={e => e.stopPropagation()}>
        <div className="peek-head">
          <span className="t"><Icon name="eye" size={18}/> Vorschau – {step.label.split(" ").slice(0, 2).join(" ")}</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div className="peek-body">
          {step.peek === "match" && <MatchPeek/>}
          {step.peek === "cover" && <CoverPeek/>}
          {step.peek === "resume" && <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ width: 800, transform: "scale(.49)", transformOrigin: "top left", height: 270 }}><ResumeSidebar accent={accent}/></div></div>}
        </div>
      </div>
    </div>
  );
}
function MatchPeek() {
  return <div>
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 40, fontWeight: 850, color: "var(--amber)" }}>67%</div>
      <div style={{ fontSize: 14, color: "var(--muted)" }}>vorläufige Übereinstimmung mit der Stelle</div>
    </div>
    <div className="kw-wrap">
      {["Projektmanagement", "MS Office", "PowerPoint", "Dokumentation"].map(k => <span key={k} className="kw found"><Icon name="check" size={12} stroke={3}/>{k}</span>)}
      {["CORMAP", "Excel"].map(k => <span key={k} className="kw miss"><Icon name="x" size={12} stroke={3}/>{k}</span>)}
    </div>
  </div>;
}
function CoverPeek() {
  return <div style={{ fontSize: 13, lineHeight: 1.6, color: "#374151" }}>
    <p style={{ marginTop: 0 }}><b>Sehr geehrte Damen und Herren,</b></p>
    <p>hiermit bewerbe ich mich auf die Position als Werkstudent Projektmanagement Rhein Ruhr Express bei Siemens Mobility in Düsseldorf…</p>
    <p style={{ color: "var(--muted-2)" }}>… wird gerade fertiggestellt.</p>
  </div>;
}

Object.assign(window, { StepAddJob, StepConfigure, StepLoading, WIZ_STEPS });
