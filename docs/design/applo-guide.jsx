/* ============================================================
   applo-guide.jsx — Applo as a step companion in the
   "Neue Bewerbung" wizard. Shows a pose + speech bubble that
   reflects the current step so users see where they are.
   Requires: applo-rig.jsx (ApploRig) + applo.css
   ============================================================ */

const APPLO_STEPS = {
  add: {
    eyebrow: "Schritt 1 von 3",
    label: "Stelle hinzufügen",
    msg: <>Hi, ich bin <b>Applo</b>! Füge eine Stellenanzeige per Link oder Text ein – den Rest übernehme ich.</>,
    pose: "wave",
  },
  config: {
    eyebrow: "Schritt 2 von 3",
    label: "Konfigurieren",
    msg: <>Stark! Jetzt stellen wir <b>Sprache, Anschreiben &amp; Design</b> ein. Fahr über eine Vorlage für die Live-Vorschau.</>,
    pose: "think",
  },
  loading: {
    eyebrow: "Schritt 3 von 3",
    label: "Wird erstellt",
    msg: <>Ich <b>analysiere die Stelle</b> und schreibe deine Dokumente. Das dauert nur einen kleinen Moment …</>,
    pose: "process",
  },
  finishing: {
    eyebrow: "Schritt 3 von 3",
    label: "Fast geschafft",
    msg: <>Geschafft! Deine Bewerbung ist <b>fertig</b> – gleich geht’s weiter …</>,
    pose: "success",
  },
  done: {
    eyebrow: "Fertig",
    label: "Geschafft",
    msg: <>Deine Bewerbung ist <b>fertig</b>! Schau sie dir an und lade sie direkt herunter.</>,
    pose: "success",
  },
};

function ApploGuide({ step = "add", finishing = false }) {
  const baseStep = (step === "loading" && finishing) ? "finishing" : step;
  const cfg = APPLO_STEPS[baseStep] || APPLO_STEPS.add;
  // wave hello on the first step, then settle into a calm idle
  const [pose, setPose] = useState(cfg.pose);

  useEffect(() => {
    setPose(cfg.pose);
    if (cfg.pose === "wave") {
      const id = setTimeout(() => setPose("idle"), 1350);
      return () => clearTimeout(id);
    }
  }, [baseStep]);

  return (
    <div className="applo-guide" role="status" aria-live="polite">
      <div className="applo-guide-av">
        <ApploRig key={baseStep + pose} state={pose} size={132} id={"guide-" + baseStep}/>
      </div>
      <div className="applo-bubble">
        <div className="applo-bubble-inner">
          <p className="ab-eyebrow">
            {cfg.eyebrow}
          </p>
          <p className="ab-msg">{cfg.msg}</p>
        </div>
      </div>
    </div>
  );
}

window.ApploGuide = ApploGuide;
