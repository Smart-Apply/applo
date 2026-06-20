// profile-applo.jsx — SmartApply Profil-Redesign mit Applo als Coach
// ============================================================================
// Designidee (warum, nicht wie):
//
//  Applo nimmt den Nutzer an der Hand. Statt eines stummen Formulars ist das
//  Profil ein geführter Raum: Applo reagiert auf die Sektion, in der du gerade
//  arbeitest (Pose + Sprechblase), zeigt dir den NÄCHSTEN offenen Schritt und
//  bietet einen geführten Rundgang an. → Lernbarkeit.
//
//  Transparenz: Profil-Stärke ist keine nackte „100 %"-Zahl mehr, sondern eine
//  aufgeschlüsselte Checkliste — jedes Feld zeigt sein Gewicht (+%), seinen
//  Status und WARUM es zählt. Der Wert verändert sich live, während du editierst.
//
//  Benutzerfreundlichkeit: eine klare Farb-Logik — Navy = deine Daten/Aktionen,
//  Applo-Blau = KI-Hilfe. Sichtbare Edit-Affordances, echtes Add/Remove,
//  „Springe-zu-Feld" aus der Checkliste.
//
//  Designsystem identisch zum Dashboard-Redesign: Navy #0c1d3f, Geist, weiße
//  Surfaces, 12px-Radien, eine sehr subtile Schattenstufe.
// ============================================================================

const { useState, useEffect, useMemo, useRef } = React;

const ProfileApplo = () => {
  const P = window.PROFILE;
  const I = window.SAIcons;
  const Edit = window.SAEdit;

  // ── Editierbarer State ────────────────────────────────────────────────────
  // Bewusst unvollständig gestartet (Telefon + Foto fehlen → 80 %), damit
  // Applos Führung etwas zu tun hat und Transparenz sichtbar wird.
  const [photo, setPhoto]           = useState(false);
  const [phone, setPhone]           = useState('');
  const [about, setAbout]           = useState(P.about);
  const [experience, setExperience] = useState(P.experience);
  const [education]                 = useState(P.education);
  const [skills, setSkills]         = useState(P.skills);
  const [languages, setLanguages]   = useState(P.languages);

  // ── Applo-Zustand ─────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState(null);
  const [tourStep, setTourStep] = useState(null); // null = kein Rundgang
  const [pose, setPose] = useState('wave');
  const [celebrated, setCelebrated] = useState(false);
  const sectionRefs = useRef({});

  // ── Transparente Stärke-Berechnung ─────────────────────────────────────────
  // Jedes Kriterium trägt ein klares Gewicht. Summe = 100.
  const criteria = useMemo(() => [
    { id: 'identity', label: 'Profilfoto',        weight: 10, done: photo,                 hint: 'Profile mit Foto werden 2× häufiger angeklickt.' },
    { id: 'identity', label: 'Kontaktdaten',      weight: 10, done: true,                  hint: 'E-Mail ist hinterlegt — landet in jeder Bewerbung.' },
    { id: 'identity', label: 'Telefonnummer',     weight: 10, done: phone.trim().length>4, hint: 'Erhöht deine Rückmeldequote spürbar.' },
    { id: 'about',    label: 'Über mich',         weight: 15, done: about.trim().length>40,hint: 'Mein wichtigster Input für deine Anschreiben.' },
    { id: 'experience',label:'Berufserfahrung',   weight: 20, done: experience.length>=1,  hint: 'Je konkreter die Erfolge, desto überzeugender.' },
    { id: 'skills',   label: 'Fähigkeiten (≥5)',  weight: 15, done: skills.length>=5,      hint: 'Recruiter filtern zuerst nach Skills.' },
    { id: 'education',label: 'Ausbildung',        weight: 10, done: education.length>=1,   hint: 'Schaltet passende Senior/Junior-Filter frei.' },
    { id: 'languages',label: 'Sprachen (≥2)',     weight: 10, done: languages.length>=2,   hint: 'Öffnet internationale Stellen.' },
  ], [photo, phone, about, experience, skills, languages, education]);

  const strength = criteria.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const openItems = criteria.filter(c => !c.done);
  const nextOpen = openItems[0] || null;
  const isComplete = strength >= 100;

  // ── Applo-Tour-Skript ──────────────────────────────────────────────────────
  const tour = [
    { id: 'identity',  msg: <>Fangen wir oben an: deine <b>Kontaktdaten</b> übernehme ich 1:1 in jede Bewerbung. Eine Telefonnummer bringt dir mehr Rückmeldungen.</> },
    { id: 'about',     msg: <>Dein <b>Steckbrief</b> ist mein wichtigster Input. 2–3 Sätze über deine Stärken reichen — den Rest formuliere ich pro Stelle neu.</> },
    { id: 'experience',msg: <>Bei der <b>Berufserfahrung</b> zählen konkrete Erfolge mit Zahlen. Ich hebe automatisch das hervor, was zur jeweiligen Stelle passt.</> },
    { id: 'skills',    msg: <>Setze bei deinen <b>Fähigkeiten</b> ein Level pro Skill. So zeige ich transparent, wo du wirklich stark bist.</> },
    { id: 'languages', msg: <>Zum Schluss deine <b>Sprachen</b> — sie schalten internationale Stellen frei. Mindestens zwei empfehle ich.</> },
  ];

  // ── Kontextuelle Sprechblase ───────────────────────────────────────────────
  const sectionMsg = {
    identity:  <>Deine <b>Kontaktdaten</b> landen direkt in jeder Bewerbung. {phone.trim().length>4 ? 'Top — alles vollständig.' : 'Ergänze deine Telefonnummer für mehr Rückmeldungen.'}</>,
    about:     <>Dein <b>Steckbrief</b> ist mein wichtigster Input. Schreib 2–3 Sätze über deine Stärken — pro Stelle texte ich daraus ein passendes Anschreiben.</>,
    experience:<>Konkrete Erfolge mit <b>Zahlen</b> überzeugen am meisten. Ich wähle pro Bewerbung automatisch die relevantesten Punkte aus.</>,
    skills:    <>Recruiter filtern zuerst nach <b>Skills</b>. Klick auf die Punkte, um dein Level zu setzen — das macht deine Stärke transparent.</>,
    education: <>Deine <b>Ausbildung</b> rundet das Profil ab und passt zu mehr Stellenfiltern.</>,
    languages: <>Sprachkenntnisse öffnen <b>internationale Stellen</b>. Mit Niveau (z. B. C1) kann ich gezielter matchen.</>,
  };

  let message;
  if (tourStep !== null) {
    message = tour[tourStep].msg;
  } else if (isComplete && celebrated) {
    message = <>Stark, {P.name.split(' ')[0]}! Dein Profil ist zu <b>100 %</b> startklar. Recruiter finden dich jetzt — und meine Bewerbungen treffen ins Schwarze.</>;
  } else if (activeSection && sectionMsg[activeSection]) {
    message = sectionMsg[activeSection];
  } else {
    message = <>Hi, ich bin <b>Applo</b> — dein Profil-Coach. Je mehr ich über dich weiß, desto besser passe ich deine Bewerbungen an. Lass uns dein Profil startklar machen.</>;
  }

  // ── Pose-Logik ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Begrüßung beim Laden
    const t = setTimeout(() => setPose('idle'), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isComplete && !celebrated) {
      setCelebrated(true);
      setPose('success');
      const t = setTimeout(() => setPose('done'), 1400);
      return () => clearTimeout(t);
    }
    if (!isComplete && celebrated) setCelebrated(false);
  }, [isComplete]);

  useEffect(() => {
    if (isComplete && celebrated) return;
    if (tourStep !== null || activeSection) setPose('think');
    else setPose('idle');
  }, [activeSection, tourStep]);

  // ── Navigation / Hand-an-der-Hand ────────────────────────────────────────────
  const scrollToSection = (id) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };
  const focusSection = (id) => {
    setActiveSection(id);
    scrollToSection(id);
    // Fokussiere das erste editierbare Feld der Sektion
    setTimeout(() => {
      const el = sectionRefs.current[id];
      const f = el && el.querySelector('.sa-edit, input');
      if (f) f.focus();
    }, 420);
  };
  const goToNext = () => { if (nextOpen) focusSection(nextOpen.id); };

  const startTour = () => { setTourStep(0); setActiveSection(tour[0].id); scrollToSection(tour[0].id); };
  const tourNext = () => {
    if (tourStep === null) return;
    if (tourStep >= tour.length - 1) { setTourStep(null); setActiveSection(null); setPose('success'); setTimeout(()=>setPose('idle'),1300); window.scrollTo({top:0,behavior:'smooth'}); return; }
    const n = tourStep + 1; setTourStep(n); setActiveSection(tour[n].id); scrollToSection(tour[n].id);
  };
  const endTour = () => { setTourStep(null); setActiveSection(null); };

  // ── List-Mutationen ───────────────────────────────────────────────────────
  const addExperience = () => setExperience([...experience, {
    role: 'Neue Position', company: 'Unternehmen', period: 'Jahr – heute', duration: '',
    description: 'Beschreibe hier deine Aufgaben und Erfolge — am besten mit konkreten Zahlen.', stack: [],
  }]);
  const removeExperience = (i) => setExperience(experience.filter((_, idx) => idx !== i));
  const addSkill = () => { const l = prompt('Welche Fähigkeit?'); if (l) setSkills([...skills, { label: l, level: 3 }]); };
  const removeSkill = (i) => setSkills(skills.filter((_, idx) => idx !== i));
  const cycleSkill = (i) => setSkills(skills.map((s, idx) => idx===i ? { ...s, level: s.level===5?1:s.level+1 } : s));
  const addLanguage = () => { const l = prompt('Welche Sprache?'); if (l) setLanguages([...languages, { label: l, level: 'Grundkenntnisse' }]); };
  const removeLanguage = (i) => setLanguages(languages.filter((_, idx) => idx !== i));

  const initials = P.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const setRef = (id) => (el) => { sectionRefs.current[id] = el; };
  const cardCls = (id) => `pf-card pf-sec ${activeSection === id ? 'pf-sec--active' : ''}`;

  return (
    <div className="sa-root pf">
      <style>{PF_CSS}</style>

      <div className="pf-app">
        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="pf-side">
          <div className="pf-brand">
            <span className="pf-brand-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="5" width="16" height="15" rx="3" stroke="white" strokeWidth="2" />
                <path d="M8 3v4M16 3v4M4 11h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="m9 15 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            SmartApply
          </div>
          <nav className="pf-nav">
            <div className="pf-nav-label">Menü</div>
            <div className="pf-nav-item"><I.home size={17} />Dashboard</div>
            <div className="pf-nav-item pf-nav-item--active"><I.user size={17} />Profil</div>
            <div className="pf-nav-item"><I.doc size={17} />Bewerbungen<span className="pf-nav-badge">7</span></div>
            <div className="pf-nav-item"><I.spark size={17} />Job-Suche</div>
            <div className="pf-nav-item"><I.bolt size={17} />Auto-Apply</div>
            <div className="pf-nav-item"><I.chart size={17} />Analytics</div>
            <div className="pf-nav-item"><I.chat size={17} />Interview-Coach</div>
            <div className="pf-nav-item"><I.cog size={17} />Einstellungen</div>
          </nav>
          <div className="pf-side-footer">
            <div className="pf-user">
              <div className="pf-user-av">{initials}</div>
              <div className="pf-user-info">
                <div className="pf-user-name">{P.name}<span className="pf-premium">★ Premium</span></div>
                <div className="pf-user-mail">{P.email}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <main className="pf-main">
          <div className="pf-topbar">
            <div className="pf-bread">
              <span>SmartApply</span><I.arrow size={11} /><b>Mein Profil</b>
            </div>
            <div className="pf-actions">
              <button className="pf-btn"><I.download size={14} /> CV herunterladen</button>
              <button className="pf-btn pf-btn--primary"><I.check size={14} /> Speichern</button>
            </div>
          </div>

          {/* ── Applo Coach ──────────────────────────────────────── */}
          <div className={`pf-coach ${isComplete && celebrated ? 'pf-coach--done' : ''}`}>
            <div className="pf-coach-applo">
              <ApploRig key={pose} state={pose} size={130} id="profile-coach" />
            </div>
            <div className="pf-coach-body">
              <div className="pf-coach-eyebrow">
                <span className="pf-coach-dot"></span>
                Applo · dein Profil-Coach
              </div>
              <p className="pf-coach-msg" key={tourStep + '-' + activeSection + '-' + isComplete}>{message}</p>
              <div className="pf-coach-actions">
                {tourStep !== null ? (
                  <>
                    <button className="pf-btn pf-btn--applo" onClick={tourNext}>
                      {tourStep >= tour.length - 1 ? 'Rundgang beenden' : 'Weiter'} <I.arrow size={13} />
                    </button>
                    <button className="pf-btn pf-btn--ghost" onClick={endTour}>Überspringen</button>
                    <span className="pf-coach-step">{tourStep + 1} / {tour.length}</span>
                  </>
                ) : isComplete ? (
                  <button className="pf-btn pf-btn--applo" onClick={startTour}><I.spark size={13} /> Profil noch einmal durchgehen</button>
                ) : (
                  <>
                    {nextOpen && (
                      <button className="pf-btn pf-btn--applo" onClick={goToNext}>
                        Als Nächstes: {nextOpen.label} <I.arrow size={13} />
                      </button>
                    )}
                    <button className="pf-btn pf-btn--ghost" onClick={startTour}><I.spark size={13} /> Geführter Rundgang</button>
                  </>
                )}
              </div>
            </div>
            <div className="pf-coach-strength">
              <StrengthRing pct={strength} />
              <div className="pf-coach-strength-cap">Profil-Stärke</div>
            </div>
          </div>

          {/* ── Grid ─────────────────────────────────────────────── */}
          <div className="pf-grid">
            {/* Left column */}
            <div className="pf-col">

              {/* Identity */}
              <div className={cardCls('identity')} ref={setRef('identity')}>
                <div className="pf-id">
                  <div className={`pf-avatar ${photo ? 'pf-avatar--photo' : ''}`}>
                    {photo
                      ? <span className="sa-placeholder pf-avatar-ph">Foto</span>
                      : initials}
                    <button className="pf-avatar-edit" title="Foto hochladen" onClick={() => setPhoto(!photo)}>
                      <I.pen size={12} />
                    </button>
                  </div>
                  <div className="pf-id-main">
                    <h2 className="pf-id-name"><Edit>{P.name}</Edit></h2>
                    <span className="pf-id-tag">Offen für neue Rollen</span>
                    <div className="pf-id-role"><Edit>{P.role}</Edit> · <span className="pf-id-loc"><I.pin size={12} /><Edit>{P.location}</Edit></span></div>
                  </div>
                </div>
                <div className="pf-fields">
                  <div className="pf-field">
                    <span className="pf-field-label"><I.mail size={14} /> E-Mail</span>
                    <span className="pf-field-value"><Edit>{P.email}</Edit></span>
                    <span className="pf-field-ok" title="vollständig"><I.check size={13} /></span>
                  </div>
                  <div className={`pf-field ${phone.trim().length>4 ? '' : 'pf-field--open'}`}>
                    <span className="pf-field-label"><I.phone size={14} /> Telefon</span>
                    <input className="pf-input" value={phone} placeholder="+49 …"
                           onChange={(e) => setPhone(e.target.value)}
                           onFocus={() => setActiveSection('identity')} />
                    {phone.trim().length>4
                      ? <span className="pf-field-ok"><I.check size={13} /></span>
                      : <span className="pf-field-missing">fehlt</span>}
                  </div>
                  <div className="pf-field">
                    <span className="pf-field-label"><I.link size={14} /> LinkedIn</span>
                    <span className="pf-field-value"><Edit>{P.linkedin}</Edit></span>
                    <span className="pf-field-ok"><I.check size={13} /></span>
                  </div>
                </div>
              </div>

              {/* Über mich */}
              <div className={cardCls('about')} ref={setRef('about')}>
                <SectionHead I={I} icon={I.user} title="Über mich"
                  meta={`${about.trim().length} Zeichen`}
                  active={activeSection==='about'} onAsk={() => setActiveSection('about')} />
                <div className="pf-sec-body">
                  <Edit multiline className="pf-about"
                        onInput={(e) => setAbout(e.currentTarget.textContent)}
                        onFocus={() => setActiveSection('about')}>{P.about}</Edit>
                </div>
              </div>

              {/* Berufserfahrung */}
              <div className={cardCls('experience')} ref={setRef('experience')}>
                <SectionHead I={I} icon={I.briefcase} title="Berufserfahrung"
                  meta={`${experience.length} Stationen`} active={activeSection==='experience'}
                  onAsk={() => setActiveSection('experience')}
                  action={<button className="pf-sec-add" onClick={addExperience}><I.spark size={12} /> Hinzufügen</button>} />
                <div className="pf-sec-body" onFocus={() => setActiveSection('experience')}>
                  <div className="pf-timeline">
                    {experience.map((e, i) => (
                      <div className="pf-tl-item" key={i}>
                        <div className="pf-tl-mark">{(e.company||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                        <div className="pf-tl-body">
                          <div className="pf-tl-top">
                            <div>
                              <div className="pf-tl-role"><Edit>{e.role}</Edit></div>
                              <div className="pf-tl-company"><Edit>{e.company}</Edit></div>
                            </div>
                            <span className="pf-tl-period"><Edit>{e.period}</Edit></span>
                          </div>
                          <div className="pf-tl-desc"><Edit multiline>{e.description}</Edit></div>
                          {e.stack && e.stack.length > 0 && (
                            <div className="pf-tags">{e.stack.map(s => <span key={s} className="pf-tag">{s}</span>)}</div>
                          )}
                          <button className="pf-tl-remove" onClick={() => removeExperience(i)} title="Entfernen">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="pf-add" onClick={addExperience}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    Station hinzufügen
                  </button>
                </div>
              </div>

              {/* Fähigkeiten */}
              <div className={cardCls('skills')} ref={setRef('skills')}>
                <SectionHead I={I} icon={I.code} title="Fähigkeiten"
                  meta={`${skills.length} Skills`} active={activeSection==='skills'}
                  onAsk={() => setActiveSection('skills')}
                  action={<button className="pf-sec-add" onClick={addSkill}><I.spark size={12} /> Hinzufügen</button>} />
                <div className="pf-sec-body" onClick={() => setActiveSection('skills')}>
                  <div className="pf-skills">
                    {skills.map((s, i) => (
                      <span className="pf-skill" key={s.label + i}>
                        <span className="pf-skill-dots" onClick={() => cycleSkill(i)} title={`Level ${s.level}/5 — klicken`}>
                          {[1,2,3,4,5].map(n => <span key={n} className={`pf-skill-dot ${n<=s.level?'on':''}`} />)}
                        </span>
                        <Edit>{s.label}</Edit>
                        <button className="pf-skill-x" onClick={() => removeSkill(i)} title="Entfernen">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m6 6 12 12M6 18 18 6" /></svg>
                        </button>
                      </span>
                    ))}
                    <button className="pf-skill pf-skill--add" onClick={addSkill}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      Skill
                    </button>
                  </div>
                </div>
              </div>

              {/* Ausbildung */}
              <div className={cardCls('education')} ref={setRef('education')}>
                <SectionHead I={I} icon={I.cap} title="Ausbildung"
                  meta={`${education.length} Abschlüsse`} active={activeSection==='education'}
                  onAsk={() => setActiveSection('education')} />
                <div className="pf-sec-body" onClick={() => setActiveSection('education')}>
                  <div className="pf-timeline">
                    {education.map((e, i) => (
                      <div className="pf-tl-item" key={i}>
                        <div className="pf-tl-mark pf-tl-mark--edu"><I.cap size={16} /></div>
                        <div className="pf-tl-body">
                          <div className="pf-tl-top">
                            <div>
                              <div className="pf-tl-role"><Edit>{e.degree}</Edit></div>
                              <div className="pf-tl-company"><Edit>{e.school}</Edit></div>
                            </div>
                            <span className="pf-tl-period"><Edit>{e.period}</Edit></span>
                          </div>
                          <div className="pf-tl-desc"><Edit multiline>{e.detail}</Edit></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right rail */}
            <aside className="pf-rail">
              {/* Transparente Profil-Check Karte */}
              <div className="pf-card pf-check">
                <div className="pf-check-head">
                  <div className="pf-check-title"><I.spark size={15} /> Profil-Check</div>
                  <div className={`pf-check-pct ${isComplete?'pf-check-pct--done':''}`}>{strength}%</div>
                </div>
                <div className="pf-check-bar"><i style={{ width: `${strength}%` }}></i></div>
                <div className="pf-check-note">
                  {isComplete
                    ? 'Vollständig — Recruiter finden dich über die Job-Suche.'
                    : `Noch ${openItems.length} ${openItems.length===1?'Schritt':'Schritte'} bis zum vollständigen Profil.`}
                </div>
                <div className="pf-check-list">
                  {criteria.map((c, i) => (
                    <button className={`pf-check-item ${c.done?'is-done':'is-open'}`} key={i}
                            onClick={() => focusSection(c.id)}>
                      <span className="pf-check-mark">
                        {c.done
                          ? <I.check size={12} />
                          : <span className="pf-check-empty" />}
                      </span>
                      <span className="pf-check-label">{c.label}</span>
                      <span className="pf-check-weight">+{c.weight}%</span>
                    </button>
                  ))}
                </div>
                <div className="pf-check-why">
                  <span className="pf-check-why-ic"><I.bolt size={13} /></span>
                  <span><b>Warum?</b> Jedes ausgefüllte Feld macht Applos KI-Bewerbungen genauer und schaltet mehr passende Stellen frei.</span>
                </div>
              </div>

              {/* Sprachen */}
              <div className={cardCls('languages')} ref={setRef('languages')}>
                <SectionHead I={I} icon={I.lang} title="Sprachen"
                  meta={`${languages.length}`} active={activeSection==='languages'}
                  onAsk={() => setActiveSection('languages')}
                  action={<button className="pf-sec-add" onClick={addLanguage}><I.spark size={12} /> Hinzufügen</button>} />
                <div className="pf-sec-body" onClick={() => setActiveSection('languages')}>
                  {languages.map((l, i) => (
                    <div className="pf-lang" key={l.label + i}>
                      <strong><Edit>{l.label}</Edit></strong>
                      <span className="pf-lang-lvl"><Edit>{l.level}</Edit></span>
                      <button className="pf-lang-x" onClick={() => removeLanguage(i)} title="Entfernen">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
                      </button>
                    </div>
                  ))}
                  <button className="pf-add" onClick={addLanguage}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    Sprache hinzufügen
                  </button>
                </div>
              </div>

              {/* Datenschutz-Transparenz */}
              <div className="pf-card pf-privacy">
                <div className="pf-privacy-head"><I.user size={14} /> Deine Daten, deine Kontrolle</div>
                <p className="pf-privacy-text">
                  Applo nutzt dein Profil ausschließlich, um deine Bewerbungen zu schreiben.
                  Du entscheidest pro Bewerbung, welche Angaben mitgeschickt werden.
                </p>
                <a className="pf-privacy-link" href="#">Datenverwendung ansehen <I.arrow size={11} /></a>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

// ── Section header mit „Was bringt das?"-Hilfe (Applo-Trigger) ───────────────
const SectionHead = ({ I, icon: Ic, title, meta, action, onAsk, active }) => (
  <div className="pf-sec-head">
    <h3 className="pf-sec-title"><Ic size={15} /> {title}</h3>
    <span className="pf-sec-meta">{meta}</span>
    <button className={`pf-ask ${active ? 'pf-ask--active' : ''}`} onClick={onAsk} title="Was bringt das?">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M9.2 9.2a2.8 2.8 0 0 1 5.3 1c0 1.9-2.8 2.5-2.8 2.5" /><path d="M12 17h.01" /></svg>
    </button>
    {action}
  </div>
);

// ── Strength ring (Applo-blau bis vollständig → grün) ────────────────────────
const StrengthRing = ({ pct }) => {
  const done = pct >= 100;
  const color = done ? '#16a34a' : '#2563eb';
  const bg = `conic-gradient(${color} ${pct * 3.6}deg, #e7ecf6 0deg)`;
  return (
    <div className="pf-ring" style={{ background: bg }}>
      <div className="pf-ring-hole">
        <span className="pf-ring-num" style={{ color }}>{pct}<small>%</small></span>
      </div>
    </div>
  );
};

window.ProfileApplo = ProfileApplo;

// ── Styles ───────────────────────────────────────────────────────────────────
const PF_CSS = `
.pf{font-family:'Geist',system-ui,sans-serif;
  --navy:#0c1d3f; --navy-soft:#1c2d52; --blue:#2563eb; --blue-tint:#eef3ff;
  --line:#eef0f4; --line-soft:#f3f4f8; --muted:#7d859e; --muted-2:#a3aac4;
  --good:#16a34a; --good-tint:#dcfce7; --bg:#fafbfc;
  --shadow:0 1px 2px rgba(15,23,42,.04);
  color:var(--navy);background:var(--bg);min-height:100%;
}
.pf, .pf *{box-sizing:border-box;}
.pf-app{display:grid;grid-template-columns:236px 1fr;min-height:100vh;align-items:start;}

/* Sidebar (sticky) */
.pf-side{position:sticky;top:0;height:100vh;padding:28px 16px 18px;background:#fff;
  display:flex;flex-direction:column;gap:28px;border-right:1px solid var(--line)}
.pf-brand{display:flex;align-items:center;gap:9px;padding:0 8px;font-size:20px;font-weight:700;
  letter-spacing:-.02em;color:var(--navy)}
.pf-brand-mark{width:32px;height:32px;border-radius:9px;background:var(--navy);display:grid;
  place-items:center;color:#fff;flex-shrink:0}
.pf-nav{display:flex;flex-direction:column;gap:2px;flex:1}
.pf-nav-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted-2);padding:0 12px 6px}
.pf-nav-item{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:8px;
  font-size:13.5px;font-weight:500;color:var(--muted);cursor:pointer;transition:background .15s,color .15s}
.pf-nav-item:hover{background:#f5f6f9;color:var(--navy)}
.pf-nav-item--active{background:var(--navy);color:#fff;font-weight:600}
.pf-nav-item svg{opacity:.9;flex-shrink:0}
.pf-nav-badge{margin-left:auto;font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;
  background:#fef2f2;color:#dc2626;font-variant-numeric:tabular-nums}
.pf-nav-item--active .pf-nav-badge{background:rgba(255,255,255,.2);color:#fff}
.pf-side-footer{padding-top:14px;border-top:1px solid var(--line)}
.pf-user{display:flex;align-items:center;gap:10px;padding:6px 8px}
.pf-user-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#1c2d52,#0c1d3f);
  color:#fff;font-weight:600;font-size:13px;display:grid;place-items:center;flex-shrink:0}
.pf-user-info{flex:1;min-width:0}
.pf-user-name{font-size:12.5px;font-weight:600;color:var(--navy);display:flex;align-items:center;gap:6px}
.pf-user-mail{font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf-premium{font-size:9px;font-weight:600;padding:1px 5px;border-radius:4px;
  background:linear-gradient(135deg,#0c1d3f,#1c2d52);color:#fff;letter-spacing:.04em;text-transform:uppercase}

/* Main */
.pf-main{padding:24px 32px 56px;display:flex;flex-direction:column;gap:20px;min-width:0;max-width:1180px}
.pf-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}
.pf-bread{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}
.pf-bread b{color:var(--navy);font-weight:600;font-size:18px;letter-spacing:-.015em}
.pf-actions{display:flex;gap:8px}
.pf-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:9px;
  font-size:13.5px;font-weight:600;border:1px solid var(--line);background:#fff;color:var(--navy);
  cursor:pointer;font-family:inherit;transition:all .12s;letter-spacing:-.005em;white-space:nowrap}
.pf-btn:hover{background:#f5f6f9}
.pf-btn--primary{background:var(--navy);color:#fff;border-color:var(--navy);box-shadow:var(--shadow)}
.pf-btn--primary:hover{background:var(--navy-soft);border-color:var(--navy-soft)}
.pf-btn--applo{background:var(--blue);color:#fff;border-color:var(--blue);box-shadow:0 1px 2px rgba(37,99,235,.2)}
.pf-btn--applo:hover{background:#1d4fd0;border-color:#1d4fd0}
.pf-btn--ghost{background:transparent;border-color:transparent;color:var(--blue)}
.pf-btn--ghost:hover{background:var(--blue-tint)}

/* ── Applo Coach ── */
.pf-coach{display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center;
  background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 24px 18px 14px;
  box-shadow:var(--shadow);position:relative;overflow:hidden}
.pf-coach::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(420px 150px at 8% 0%, rgba(37,99,235,.06), transparent 70%)}
.pf-coach--done::before{background:radial-gradient(420px 150px at 8% 0%, rgba(22,163,74,.08), transparent 70%)}
.pf-coach-applo{width:130px;height:150px;display:grid;place-items:center;flex-shrink:0;
  background:radial-gradient(58% 52% at 50% 44%, #eef3fb 0%, rgba(238,243,251,0) 72%)}
.pf-coach-body{min-width:0;position:relative}
.pf-coach-eyebrow{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;
  letter-spacing:.07em;text-transform:uppercase;color:var(--blue);margin-bottom:7px}
.pf-coach-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);
  box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.pf-coach-msg{font-size:15.5px;line-height:1.55;color:var(--navy);margin:0 0 14px;max-width:60ch;
  text-wrap:pretty;animation:pfFade .3s ease both}
.pf-coach-msg b{font-weight:700}
@keyframes pfFade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
.pf-coach-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pf-coach-step{font-size:12px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
.pf-coach-strength{display:flex;flex-direction:column;align-items:center;gap:8px;flex-shrink:0;
  padding-left:20px;border-left:1px solid var(--line)}
.pf-coach-strength-cap{font-size:11.5px;color:var(--muted);font-weight:600}

/* Strength ring */
.pf-ring{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;
  transition:background .5s ease}
.pf-ring-hole{width:64px;height:64px;border-radius:50%;background:#fff;display:grid;place-items:center}
.pf-ring-num{font-size:21px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.pf-ring-num small{font-size:12px;font-weight:600;margin-left:1px}

/* Grid */
.pf-grid{display:grid;grid-template-columns:1fr 332px;gap:20px;align-items:start}
.pf-col{display:flex;flex-direction:column;gap:20px;min-width:0}
.pf-rail{display:flex;flex-direction:column;gap:20px;position:sticky;top:24px}

/* Card + active section highlight */
.pf-card{background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}
.pf-sec{transition:box-shadow .2s,border-color .2s;scroll-margin-top:96px}
.pf-sec--active{border-color:#c7d6f7;box-shadow:0 0 0 3px rgba(37,99,235,.12)}

/* Identity */
.pf-id{display:flex;gap:20px;align-items:center;padding:22px 24px;border-bottom:1px solid var(--line)}
.pf-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#1c2d52,#0c1d3f);
  display:grid;place-items:center;color:#fff;font-size:27px;font-weight:600;letter-spacing:-.02em;
  box-shadow:0 4px 14px rgba(12,29,63,.18);position:relative;flex-shrink:0}
.pf-avatar--photo{background:#f1f3f9}
.pf-avatar-ph{width:80px;height:80px;border-radius:50%;font-size:10px}
.pf-avatar-edit{position:absolute;right:-2px;bottom:-2px;width:28px;height:28px;border-radius:50%;
  background:#fff;border:1px solid var(--line);color:var(--navy);display:grid;place-items:center;
  cursor:pointer;box-shadow:0 2px 6px rgba(12,29,63,.12)}
.pf-avatar-edit:hover{background:var(--blue);color:#fff;border-color:var(--blue)}
.pf-id-main{min-width:0}
.pf-id-name{font-size:23px;font-weight:700;color:var(--navy);letter-spacing:-.02em;line-height:1.15;margin:0 0 7px}
.pf-id-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;
  font-size:12px;font-weight:600;background:var(--good-tint);color:#166534;margin-bottom:9px}
.pf-id-tag::before{content:'';width:6px;height:6px;border-radius:50%;background:#16a34a}
.pf-id-role{font-size:13.5px;color:var(--muted);font-weight:500;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pf-id-loc{display:inline-flex;align-items:center;gap:5px}
.pf-id-loc svg{color:var(--muted-2)}

.pf-fields{padding:6px 24px 18px}
.pf-field{display:grid;grid-template-columns:140px 1fr auto;gap:16px;align-items:center;
  padding:13px 0;border-bottom:1px dashed var(--line)}
.pf-field:last-child{border-bottom:0}
.pf-field-label{font-size:13px;color:var(--muted);font-weight:500;display:flex;align-items:center;gap:9px}
.pf-field-label svg{color:var(--muted-2)}
.pf-field-value{font-size:13.5px;color:var(--navy);font-weight:500}
.pf-field-ok{width:22px;height:22px;border-radius:50%;background:var(--good-tint);color:var(--good);
  display:grid;place-items:center;justify-self:end}
.pf-field-missing{font-size:11px;font-weight:700;color:#b45309;background:#fef3c7;padding:3px 9px;
  border-radius:99px;justify-self:end;letter-spacing:.02em}
.pf-field--open{background:linear-gradient(90deg,rgba(254,243,199,.4),transparent);border-radius:8px;
  margin:0 -10px;padding:13px 10px}
.pf-input{font-family:inherit;font-size:13.5px;color:var(--navy);font-weight:500;border:1px solid var(--line);
  background:#fff;border-radius:8px;padding:8px 11px;outline:none;width:100%;transition:box-shadow .12s,border-color .12s}
.pf-input::placeholder{color:var(--muted-2)}
.pf-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.12)}

/* Section head */
.pf-sec-head{display:flex;align-items:center;gap:10px;padding:16px 22px;border-bottom:1px solid var(--line)}
.pf-sec-title{font-size:14.5px;font-weight:700;color:var(--navy);letter-spacing:-.005em;margin:0;
  display:flex;align-items:center;gap:8px}
.pf-sec-meta{font-size:11.5px;color:var(--muted-2);font-weight:500;font-variant-numeric:tabular-nums}
.pf-ask{width:26px;height:26px;border-radius:7px;border:1px solid var(--line);background:#fff;
  color:var(--muted);cursor:pointer;display:grid;place-items:center;transition:all .12s;margin-left:auto}
.pf-ask:hover,.pf-ask--active{background:var(--blue);color:#fff;border-color:var(--blue)}
.pf-sec-add{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;
  background:transparent;border:1px solid var(--line);color:var(--navy);font-size:12px;font-weight:600;
  cursor:pointer;font-family:inherit;transition:all .12s}
.pf-sec-add:hover{background:var(--navy);color:#fff;border-color:var(--navy)}
.pf-sec-body{padding:18px 22px 20px}

/* About */
.pf-about{font-size:14px;line-height:1.65;color:var(--ink-700,#334155);display:block;min-height:48px;text-wrap:pretty}

/* Timeline */
.pf-timeline{display:flex;flex-direction:column;gap:6px}
.pf-tl-item{display:grid;grid-template-columns:40px 1fr;gap:16px;padding:12px;border-radius:10px;
  transition:background .12s;position:relative}
.pf-tl-item:hover{background:#f9fafc}
.pf-tl-mark{width:40px;height:40px;border-radius:10px;background:var(--navy);color:#fff;display:grid;
  place-items:center;font-weight:700;font-size:12px;font-family:'Geist Mono',monospace}
.pf-tl-mark--edu{background:var(--blue-tint);color:var(--blue)}
.pf-tl-body{min-width:0}
.pf-tl-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.pf-tl-role{font-size:14px;font-weight:600;color:var(--navy)}
.pf-tl-company{font-size:12.5px;color:var(--muted);margin-top:2px}
.pf-tl-period{font-size:11.5px;color:var(--muted);font-weight:500;background:#f5f6f9;padding:5px 10px;
  border-radius:6px;white-space:nowrap;font-variant-numeric:tabular-nums}
.pf-tl-desc{font-size:12.5px;color:var(--muted);margin-top:7px;line-height:1.55;max-width:62ch}
.pf-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
.pf-tag{padding:3px 9px;border-radius:6px;border:1px solid var(--line);font-size:11px;color:var(--muted);
  font-weight:500;background:#fff}
.pf-tl-remove{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:7px;
  border:1px solid var(--line);background:#fff;color:var(--muted);cursor:pointer;display:grid;
  place-items:center;opacity:0;transition:all .12s}
.pf-tl-item:hover .pf-tl-remove{opacity:1}
.pf-tl-remove:hover{background:#dc2626;color:#fff;border-color:#dc2626}

/* Add button */
.pf-add{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;
  margin-top:10px;border:1.5px dashed var(--line);border-radius:10px;background:transparent;
  color:var(--muted);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .12s}
.pf-add:hover{border-color:var(--navy);color:var(--navy);background:#f9fafc}

/* Skills */
.pf-skills{display:flex;flex-wrap:wrap;gap:7px}
.pf-skill{display:inline-flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;
  background:#f5f6f9;font-size:12.5px;color:var(--navy);font-weight:500;position:relative;transition:padding .12s}
.pf-skill:hover{padding-right:30px}
.pf-skill-dots{display:inline-flex;gap:2px;cursor:pointer;padding:2px;border-radius:4px;transition:background .12s}
.pf-skill-dots:hover{background:rgba(12,29,63,.08)}
.pf-skill-dot{width:4px;height:4px;border-radius:50%;background:#cdd2de}
.pf-skill-dot.on{background:var(--blue)}
.pf-skill-x{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:19px;height:19px;border:0;
  background:transparent;color:var(--muted);border-radius:4px;cursor:pointer;display:none;
  align-items:center;justify-content:center}
.pf-skill:hover .pf-skill-x{display:flex}
.pf-skill-x:hover{background:#dc2626;color:#fff}
.pf-skill--add{background:transparent;border:1.5px dashed var(--line);color:var(--muted);cursor:pointer;
  font-family:inherit;gap:5px}
.pf-skill--add:hover{border-color:var(--navy);color:var(--navy);padding-right:9px}

/* Languages */
.pf-lang{display:flex;align-items:center;gap:10px;padding:11px 10px;margin:0 -10px;border-radius:8px;
  transition:background .12s;position:relative}
.pf-lang:hover{background:#f9fafc}
.pf-lang strong{color:var(--navy);font-weight:600;font-size:13.5px}
.pf-lang-lvl{color:var(--muted);font-size:12px;margin-left:auto}
.pf-lang-x{width:26px;height:26px;border-radius:7px;border:1px solid var(--line);background:#fff;
  color:var(--muted);cursor:pointer;display:none;place-items:center}
.pf-lang:hover .pf-lang-x{display:grid}
.pf-lang-x:hover{background:#dc2626;color:#fff;border-color:#dc2626}

/* ── Profil-Check ── */
.pf-check{padding:20px 22px}
.pf-check-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pf-check-title{font-size:14.5px;font-weight:700;color:var(--navy);display:flex;align-items:center;gap:8px}
.pf-check-pct{font-size:20px;font-weight:700;color:var(--blue);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.pf-check-pct--done{color:var(--good)}
.pf-check-bar{height:6px;background:var(--line);border-radius:99px;overflow:hidden;margin-bottom:10px}
.pf-check-bar i{display:block;height:100%;background:var(--blue);border-radius:99px;transition:width .4s ease}
.pf-check-pct--done ~ .pf-check-bar i,.pf-check:has(.pf-check-pct--done) .pf-check-bar i{background:var(--good)}
.pf-check-note{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px}
.pf-check-list{display:flex;flex-direction:column;gap:2px;margin-bottom:14px}
.pf-check-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;border:0;
  background:transparent;cursor:pointer;font-family:inherit;text-align:left;transition:background .12s;width:100%}
.pf-check-item:hover{background:#f9fafc}
.pf-check-mark{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
.pf-check-item.is-done .pf-check-mark{background:var(--good-tint);color:var(--good)}
.pf-check-empty{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--muted-2)}
.pf-check-label{flex:1;font-size:13px;font-weight:500;color:var(--navy)}
.pf-check-item.is-open .pf-check-label{color:var(--navy)}
.pf-check-weight{font-size:11px;font-weight:700;color:var(--muted-2);font-variant-numeric:tabular-nums}
.pf-check-item.is-open .pf-check-weight{color:var(--blue)}
.pf-check-why{display:flex;gap:9px;padding:12px;background:var(--blue-tint);border-radius:10px;
  font-size:11.5px;line-height:1.5;color:var(--navy)}
.pf-check-why b{font-weight:700}
.pf-check-why-ic{width:22px;height:22px;border-radius:6px;background:#fff;color:var(--blue);display:grid;
  place-items:center;flex-shrink:0}

/* Privacy */
.pf-privacy{padding:18px 20px}
.pf-privacy-head{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px}
.pf-privacy-text{font-size:12px;color:var(--muted);line-height:1.55;margin:0 0 10px}
.pf-privacy-link{font-size:12px;font-weight:600;color:var(--blue);text-decoration:none;
  display:inline-flex;align-items:center;gap:5px}
.pf-privacy-link:hover{text-decoration:underline}

/* Inline-edit affordance */
.pf .sa-edit{border-bottom:1px dashed transparent;border-radius:3px}
.pf .sa-edit:hover{border-bottom-color:var(--muted-2);background:rgba(37,99,235,.05)}
.pf .sa-edit:focus{border-bottom-color:transparent;background:#fff;box-shadow:0 0 0 1.5px var(--blue)}

@media (max-width:1080px){
  .pf-grid{grid-template-columns:1fr}
  .pf-rail{position:static}
  .pf-coach{grid-template-columns:auto 1fr}
  .pf-coach-strength{display:none}
}
`;
