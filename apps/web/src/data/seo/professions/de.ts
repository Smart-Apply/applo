import type { ProfessionCatalog } from '../types';

/**
 * German profession content. `de` is Applo's home market and the reference
 * catalog — when a profession is added, write it here first, then translate.
 */
export const professionsDe: ProfessionCatalog = {
  'software-developer': {
    name: 'Softwareentwickler',
    application: {
      slug: 'softwareentwickler',
      metaTitle: 'Bewerbung als Softwareentwickler: Anschreiben, Lebenslauf & ATS',
      metaDescription:
        'Was in eine Bewerbung als Softwareentwickler gehört: ATS-Keywords, gefragte Skills, Zertifikate, ein Beispiel-Einstieg fürs Anschreiben und die häufigsten Fehler.',
      heading: 'Bewerbung als Softwareentwickler schreiben',
      intro:
        'Bei Entwicklerstellen entscheidet selten das Anschreiben allein – Recruiter und Bewerbermanagementsysteme suchen zuerst nach Tech-Stack, Projektgröße und messbarer Wirkung. Wer nur Technologien aufzählt, wird mit hunderten identischen Profilen verglichen; wer Verantwortung und Ergebnis dazuschreibt, nicht.',
      atsKeywords: [
        'Softwareentwicklung',
        'TypeScript',
        'Java',
        'Python',
        'REST-API',
        'Microservices',
        'CI/CD',
        'Docker',
        'Kubernetes',
        'Git',
        'Code Review',
        'Scrum',
        'Unit-Tests',
        'Cloud (AWS/Azure)',
      ],
      hardSkills: [
        {
          label: 'Ein klar benannter Tech-Stack',
          detail:
            'Sprache, Framework, Datenbank und Cloud in genau der Schreibweise der Stellenanzeige – „TypeScript“ und „JavaScript“ sind für einen Parser zwei verschiedene Wörter.',
        },
        {
          label: 'Systemdesign und Architektur',
          detail:
            'Ab drei Jahren Erfahrung erwarten Teams, dass du Schnittstellen entwirfst und Trade-offs begründen kannst, nicht nur Tickets abarbeitest.',
        },
        {
          label: 'Test- und Release-Praxis',
          detail:
            'Unit- und Integrationstests, Pipelines, Code Review: der Teil deiner Arbeit, der zeigt, ob dein Code auch in sechs Monaten noch wartbar ist.',
        },
        {
          label: 'Messbare Wirkung',
          detail:
            'Ladezeit halbiert, Fehlerrate gesenkt, Deployments von wöchentlich auf täglich – Zahlen aus deinem Alltag schlagen jedes Adjektiv.',
        },
      ],
      softSkills: [
        'Technische Sachverhalte für Nicht-Techniker erklären',
        'Konstruktives Feedback im Code Review',
        'Eigenverantwortung in verteilten Teams',
        'Priorisieren unter Zeitdruck',
        'Bereitschaft, fremden Code zu lesen',
      ],
      certifications: [
        'AWS Certified Developer – Associate',
        'Microsoft Certified: Azure Developer Associate',
        'Professional Scrum Developer (PSD I)',
        'Certified Kubernetes Application Developer (CKAD)',
      ],
      cvFocus: [
        {
          label: 'Projekte statt Aufgabenlisten',
          detail:
            'Pro Station zwei bis drei Projekte mit Kontext: Teamgröße, deine Rolle, eingesetzte Technologien, Ergebnis.',
        },
        {
          label: 'Ein aufgeräumtes GitHub-Profil verlinken',
          detail:
            'Ein gepflegtes Repository mit README ersetzt eine Seite Selbstbeschreibung. Ein verwaistes Profil schadet mehr, als es nützt.',
        },
        {
          label: 'Skills nach Niveau gruppieren',
          detail:
            'Trenne täglich genutzte Technologien von solchen, die du einmal ausprobiert hast – im Fachgespräch wird genau das geprüft.',
        },
      ],
      coverLetterOpener:
        'Ihre Stellenanzeige nennt den Umbau eines Monolithen zu Microservices – genau das habe ich bei [Firma] für ein Team von acht Entwicklern begleitet und die Deployment-Frequenz dabei von wöchentlich auf täglich gebracht.',
      mistakes: [
        {
          label: 'Die Technologieliste als Anschreiben',
          detail:
            'Der Lebenslauf listet den Stack ohnehin. Das Anschreiben muss erklären, warum ausgerechnet dieses Produkt dich interessiert.',
        },
        {
          label: 'Seniorität behaupten statt zeigen',
          detail:
            '„Senior“ überzeugt niemanden. Verantwortung für eine Migration, ein Review-Prozess, eine Einarbeitung neuer Kollegen dagegen schon.',
        },
        {
          label: 'Jede Bewerbung identisch verschicken',
          detail:
            'Kein Bezug zum Produkt heißt: austauschbar. Ein einziger konkreter Satz zur Domäne des Unternehmens hebt dich aus dem Stapel.',
        },
      ],
      faq: [
        {
          question: 'Braucht eine Entwicklerbewerbung überhaupt ein Anschreiben?',
          answer:
            'In Deutschland ja – die meisten größeren Arbeitgeber erwarten es weiterhin. Bei Start-ups und internationalen Tech-Firmen reicht oft der Lebenslauf plus GitHub. Im Zweifel schreib eine halbe Seite: fehlt es, wirkt die Bewerbung unvollständig; ist es zu lang, wird es nicht gelesen.',
        },
        {
          question: 'Wie wichtig sind Zertifikate gegenüber Projekten?',
          answer:
            'Projekte gewinnen fast immer. Cloud-Zertifikate helfen vor allem, wenn du in eine neue Umgebung wechselst und noch keine Praxis vorweisen kannst – sie ersetzen keine Referenzen, öffnen aber die erste Tür.',
        },
        {
          question: 'Sollte ich ein Bewerbungsfoto beilegen?',
          answer:
            'In der deutschen Tech-Branche ist es optional und wird zunehmend weggelassen. Rechtlich darf niemand eines verlangen. Bei klassischen Konzernen ist es noch üblich, bei Start-ups eher unüblich.',
        },
      ],
    },
    interview: {
      slug: 'softwareentwickler',
      metaTitle: 'Vorstellungsgespräch als Softwareentwickler: Fragen und Antworten',
      metaDescription:
        'Die häufigsten Fragen im Entwickler-Interview – was dahinter geprüft wird, wie du strukturiert antwortest, und welche Antworten dich die Stelle kosten.',
      heading: 'Vorstellungsgespräch als Softwareentwickler',
      intro:
        'Das Entwicklergespräch besteht meist aus drei Teilen: Motivation, Fachtiefe und ein Live- oder Take-home-Coding-Teil. Am häufigsten scheitern Kandidaten nicht an der Aufgabe, sondern daran, dass sie ihre Gedanken beim Lösen nicht laut aussprechen.',
      questions: [
        {
          question: 'Erzähl von einem technisch schwierigen Problem, das du gelöst hast.',
          why: 'Geprüft wird, ob du ein Problem eingrenzen kannst und ob du die Ursache wirklich verstanden hast – oder nur so lange etwas geändert hast, bis es lief.',
          tip: 'Vier Schritte: Symptom, wie du es eingegrenzt hast, die eigentliche Ursache, was du danach geändert hast, damit es nicht wiederkommt.',
        },
        {
          question: 'Warum hast du dich für diese Architektur entschieden?',
          why: 'Es geht nicht um die richtige Antwort, sondern darum, ob du Alternativen kennst und Nachteile benennen kannst.',
          tip: 'Nenne die verworfene Option und den Grund. Wer keinen Nachteil seiner eigenen Lösung findet, hat sie nicht durchdacht.',
        },
        {
          question: 'Wie stellst du sicher, dass dein Code wartbar bleibt?',
          why: 'Ein Test dafür, ob du über den Merge hinaus denkst – Tests, Reviews, Dokumentation, Namensgebung.',
          tip: 'Nenne konkrete Praxis aus deinem letzten Team, keine Lehrbuchprinzipien.',
        },
        {
          question: 'Wie gehst du mit Code um, den du nicht geschrieben hast?',
          why: 'Der Alltag ist Legacy-Code. Teams wollen wissen, ob du ihn vorsichtig veränderst oder sofort neu schreiben willst.',
          tip: 'Beschreibe, wie du dich absicherst, bevor du etwas änderst: Tests ergänzen, kleine Schritte, früh deployen.',
        },
        {
          question: 'Erzähl von einer Uneinigkeit mit einem Kollegen im Review.',
          why: 'Verhaltensfrage: Kann du eine fachliche Meinung vertreten, ohne die Zusammenarbeit zu beschädigen?',
          tip: 'Ende mit dem Ergebnis und was du daraus mitgenommen hast – auch wenn du nachgegeben hast.',
        },
        {
          question: 'Was machst du, wenn eine Schätzung nicht haltbar ist?',
          why: 'Prüft Kommunikation gegenüber Product und Stakeholdern, nicht Technik.',
          tip: 'Früh melden, Optionen anbieten (Umfang, Termin, Qualität) statt nur das Problem zu überbringen.',
        },
      ],
      redFlags: [
        'Beim Coding-Teil schweigend tippen – der Gedankengang ist das, was bewertet wird.',
        'Frühere Teams oder Codebasen schlechtreden.',
        'Auf „Kennst du X?“ mit einem vagen Ja antworten, statt den eigenen Kenntnisstand ehrlich einzuordnen.',
      ],
      askThem: [
        'Wie sieht der Weg vom Merge bis in die Produktion aus, und wie lange dauert er?',
        'Wie viel Zeit im Sprint geht an technische Schulden?',
        'Wer entscheidet, was gebaut wird – und wie kommen Entwickler dabei vor?',
      ],
      faq: [
        {
          question: 'Wie bereite ich mich auf den Coding-Teil vor?',
          answer:
            'Übe laut denken, nicht nur lösen. Nimm dir eine mittelschwere Aufgabe und erkläre jeden Schritt so, als säße jemand daneben. Genau das wird bewertet – die fertige Lösung allein reicht in fast keinem Prozess.',
        },
        {
          question: 'Darf ich im Take-home-Test KI-Werkzeuge nutzen?',
          answer:
            'Frag nach. Viele Unternehmen erlauben es inzwischen ausdrücklich und fragen dann im Gespräch nach deinen Entscheidungen. Heimlich nutzen und im Nachgespräch nicht erklären können ist das schlechteste Ergebnis.',
        },
      ],
    },
  },

  nurse: {
    name: 'Pflegefachkraft',
    application: {
      slug: 'pflegefachkraft',
      metaTitle: 'Bewerbung als Pflegefachkraft: Anschreiben, Lebenslauf & Nachweise',
      metaDescription:
        'Bewerbung in der Pflege: welche Nachweise verpflichtend sind, welche Begriffe ins Anschreiben gehören, Beispiel-Einstieg und die häufigsten Fehler.',
      heading: 'Bewerbung als Pflegefachkraft schreiben',
      intro:
        'In der Pflege ist der Arbeitsmarkt auf deiner Seite – trotzdem entscheidet die Bewerbung darüber, welche Station du bekommst und wie du eingruppiert wirst. Vollständige Nachweise und ein klar benannter Fachbereich sind hier wichtiger als jede Formulierungskunst.',
      atsKeywords: [
        'Pflegefachkraft',
        'Grund- und Behandlungspflege',
        'Pflegedokumentation',
        'Pflegeplanung',
        'Medikamentengabe',
        'Wundmanagement',
        'Intensivpflege',
        'Palliativpflege',
        'Expertenstandards',
        'Qualitätsmanagement',
        'Schichtdienst',
        'Anleitung von Auszubildenden',
      ],
      hardSkills: [
        {
          label: 'Anerkennung und Berufsurkunde',
          detail:
            'Die Urkunde über die Erlaubnis zum Führen der Berufsbezeichnung gehört in jede Bewerbung. Bei ausländischem Abschluss zusätzlich der Anerkennungsbescheid.',
        },
        {
          label: 'Fachbereich statt „Pflege“',
          detail:
            'Intensiv, Anästhesie, Onkologie, Geriatrie, ambulant: der Bereich entscheidet über die Stelle und wird als Erstes gefiltert.',
        },
        {
          label: 'Dokumentation und Software',
          detail:
            'Nenne das genutzte System (z. B. ORBIS, medico, Vivendi PD) – Häuser sparen sich damit Einarbeitungszeit und achten darauf.',
        },
        {
          label: 'Fort- und Weiterbildungen',
          detail:
            'Praxisanleitung, Wundexperte ICW, Fachweiterbildung Intensiv: sie beeinflussen direkt die Eingruppierung.',
        },
      ],
      softSkills: [
        'Belastbarkeit im Schichtdienst',
        'Kommunikation mit Angehörigen in Ausnahmesituationen',
        'Interdisziplinäre Zusammenarbeit mit Ärzten und Therapie',
        'Ruhe in akuten Situationen',
        'Empathie ohne Selbstaufgabe',
      ],
      certifications: [
        'Fachweiterbildung Intensivpflege und Anästhesie',
        'Praxisanleiter (300 Stunden)',
        'Wundexperte ICW',
        'Palliative Care (Basiskurs)',
      ],
      cvFocus: [
        {
          label: 'Einrichtungstyp und Stationsgröße',
          detail:
            'Universitätsklinikum, Haus der Grundversorgung, Pflegeheim, ambulanter Dienst – und die Bettenzahl der Station. Das sagt mehr über deinen Alltag als jede Aufgabenliste.',
        },
        {
          label: 'Lückenlose Nachweise',
          detail:
            'Urkunde, Zeugnisse, Fortbildungsnachweise, Masernschutz. Fehlende Anlagen sind in der Pflege der häufigste Grund für Rückfragen.',
        },
        {
          label: 'Verfügbarkeit und Modell',
          detail: 'Wunschumfang, Schichtbereitschaft und frühestmöglicher Eintritt gehören auf Seite eins.',
        },
      ],
      coverLetterOpener:
        'Nach vier Jahren auf einer interdisziplinären Intensivstation mit zwölf Betten suche ich einen Wechsel in die Palliativpflege – ein Bereich, den ich während meiner Weiterbildung Palliative Care kennen und schätzen gelernt habe.',
      mistakes: [
        {
          label: 'Nachweise nachreichen wollen',
          detail:
            'Ohne Berufsurkunde kann die Personalabteilung dich nicht einstellen. Unvollständige Mappen bleiben liegen, statt abgelehnt zu werden.',
        },
        {
          label: 'Den Fachbereich offen lassen',
          detail: '„Ich bin flexibel“ liest sich als „ich weiß nicht, was ich will“ und landet auf der Warteliste.',
        },
        {
          label: 'Nur Belastung schildern',
          detail:
            'Personalmangel kennt jedes Haus. Wer erklärt, unter welchen Bedingungen er bleiben will, wirkt souverän statt erschöpft.',
        },
      ],
      faq: [
        {
          question: 'Wie bewerbe ich mich mit einem ausländischen Pflegeabschluss?',
          answer:
            'Lege den Anerkennungsbescheid der zuständigen Landesbehörde bei, oder – wenn das Verfahren läuft – den Antragsnachweis samt Stand. Viele Häuser stellen mit Defizitbescheid ein und begleiten die Anpassungsqualifizierung, wollen den Stand aber schriftlich sehen.',
        },
        {
          question: 'Welches Sprachniveau wird erwartet?',
          answer:
            'Für die Anerkennung ist in der Regel B2 nachzuweisen, in einigen Bundesländern zusätzlich eine berufsbezogene Fachsprachprüfung. Führe das Zertifikat im Lebenslauf auf – es ist Zulassungsvoraussetzung, keine Zusatzqualifikation.',
        },
        {
          question: 'Soll ich das Wunschgehalt nennen?',
          answer:
            'Bei tarifgebundenen Häusern (TVöD-P, AVR) nicht nötig – dort zählt die korrekte Eingruppierung, also gib Berufsjahre und Weiterbildungen genau an. Bei privaten Trägern ohne Tarif ist eine Spanne sinnvoll.',
        },
      ],
    },
    interview: {
      slug: 'pflegefachkraft',
      metaTitle: 'Vorstellungsgespräch in der Pflege: Fragen und gute Antworten',
      metaDescription:
        'Typische Fragen im Pflege-Vorstellungsgespräch, was dahinter geprüft wird, wie du antwortest – und was du die Pflegedienstleitung fragen solltest.',
      heading: 'Vorstellungsgespräch als Pflegefachkraft',
      intro:
        'Das Gespräch führt meist die Pflegedienstleitung, oft zusammen mit der Stationsleitung. Geprüft wird weniger Fachwissen als Haltung: wie du unter Belastung entscheidest, wie du mit Angehörigen sprichst und ob du auf der Station als Person funktionierst.',
      questions: [
        {
          question: 'Wie gehen Sie mit einer Situation um, in der die Zeit für alle Patienten nicht reicht?',
          why: 'Die Kernfrage des Berufs. Geprüft wird, ob du priorisieren kannst, ohne in Resignation oder Selbstüberforderung zu kippen.',
          tip: 'Beschreibe deine Reihenfolge nach Dringlichkeit, wann du Hilfe holst und wie du es dokumentierst – nicht, dass du „einfach alles schaffst“.',
        },
        {
          question: 'Erzählen Sie von einem schwierigen Gespräch mit Angehörigen.',
          why: 'Angehörigenkonflikte kosten Stationen viel Energie. Gesucht wird Deeskalation, nicht Rechthaben.',
          tip: 'Zuhören, Situation erklären, Grenzen benennen, an die richtige Stelle weiterleiten – in dieser Reihenfolge.',
        },
        {
          question: 'Wie reagieren Sie, wenn Ihnen ein Fehler unterläuft?',
          why: 'Fehlerkultur. Ein Haus, das offen fragt, will hören, dass du meldest statt vertuschst.',
          tip: 'Sofort melden, Patient sichern, dokumentieren, CIRS-Meldung. Ein echtes Beispiel wirkt stärker als jede Absichtserklärung.',
        },
        {
          question: 'Warum wechseln Sie den Arbeitgeber?',
          why: 'Prüft, ob du vor etwas wegläufst oder auf etwas zugehst.',
          tip: 'Nenne, was du suchst (Fachbereich, Anleitung, Dienstplanverlässlichkeit), nicht, was der letzte Arbeitgeber falsch gemacht hat.',
        },
        {
          question: 'Wie stehen Sie zu Schicht- und Wochenenddiensten?',
          why: 'Reine Planungsfrage – ehrliche Antworten sparen beiden Seiten eine gescheiterte Probezeit.',
          tip: 'Sag klar, was du leisten kannst und was nicht. Feste Einschränkungen jetzt zu nennen ist besser als später abzusagen.',
        },
        {
          question: 'Wie halten Sie Ihr Fachwissen aktuell?',
          why: 'Expertenstandards ändern sich; Häuser mit Qualitätsanspruch fragen gezielt danach.',
          tip: 'Konkrete Fortbildungen der letzten zwei Jahre nennen, plus wie du Neues auf Station weitergibst.',
        },
      ],
      redFlags: [
        'Über frühere Kollegen oder Patienten abfällig sprechen – Verschwiegenheit wird auch im Gespräch beobachtet.',
        'Behaupten, nie überfordert zu sein.',
        'Keine einzige Frage zur Station, zum Dienstplan oder zur Einarbeitung stellen.',
      ],
      askThem: [
        'Wie ist der Personalschlüssel im Früh-, Spät- und Nachtdienst tatsächlich besetzt?',
        'Wie lange dauert die Einarbeitung und wer begleitet sie?',
        'Wie verbindlich ist der Dienstplan – wie oft wird kurzfristig eingesprungen?',
      ],
      faq: [
        {
          question: 'Wird im Pflegegespräch Fachwissen abgefragt?',
          answer:
            'Manchmal, meist als Fallbeispiel statt als Prüfung: eine akute Situation, in der du dein Vorgehen schildern sollst. Wichtiger als die perfekte Antwort ist, dass du Grenzen erkennst und benennst, wann du den Arzt hinzuziehst.',
        },
        {
          question: 'Darf ich nach dem Dienstplan und Ausfallmanagement fragen?',
          answer:
            'Unbedingt – es ist die aussagekräftigste Frage, die du stellen kannst. Häuser mit funktionierendem Ausfallkonzept antworten konkret; ausweichende Antworten an dieser Stelle sind selbst schon eine Information.',
        },
      ],
    },
  },

  'project-manager': {
    name: 'Projektmanager',
    application: {
      slug: 'projektmanager',
      metaTitle: 'Bewerbung als Projektmanager: Anschreiben, Lebenslauf & Kennzahlen',
      metaDescription:
        'Bewerbung im Projektmanagement: welche Kennzahlen überzeugen, welche Zertifikate zählen, Beispiel-Einstieg fürs Anschreiben und typische Fehler.',
      heading: 'Bewerbung als Projektmanager schreiben',
      intro:
        'Projektmanagement ist der Beruf, in dem am meisten behauptet und am wenigsten belegt wird. Wer Budget, Teamgröße, Dauer und Ergebnis pro Projekt nennt, hebt sich von der Mehrheit der Bewerbungen ab, bevor er überhaupt einen Satz über Methodik geschrieben hat.',
      atsKeywords: [
        'Projektmanagement',
        'Projektleitung',
        'Stakeholder-Management',
        'Budgetverantwortung',
        'Risikomanagement',
        'Scrum',
        'Kanban',
        'PRINCE2',
        'Meilensteinplanung',
        'Ressourcenplanung',
        'Jira',
        'MS Project',
        'Change Management',
        'Reporting an die Geschäftsführung',
      ],
      hardSkills: [
        {
          label: 'Projektkennzahlen',
          detail:
            'Budget, Teamgröße, Laufzeit, Anzahl beteiligter Abteilungen – vier Zahlen, die eine Projektbeschreibung sofort glaubwürdig machen.',
        },
        {
          label: 'Methodik mit Beleg',
          detail:
            'Klassisch, agil oder hybrid: nenne, was du tatsächlich gefahren hast, und wo die Grenze lag. „Beides“ ohne Beispiel wirkt beliebig.',
        },
        {
          label: 'Werkzeuge',
          detail: 'Jira, Confluence, MS Project, Smartsheet, Asana – ATS-Filter suchen konkret nach diesen Namen.',
        },
        {
          label: 'Steuerung nach oben',
          detail:
            'Wem hast du berichtet? Ein Lenkungsausschuss oder die Geschäftsführung als Adressat sagt mehr über die Ebene als jeder Titel.',
        },
      ],
      softSkills: [
        'Führung ohne Weisungsbefugnis',
        'Konfliktmoderation zwischen Fachbereichen',
        'Entscheidungen unter Unsicherheit',
        'Präsentation vor Geschäftsleitung',
        'Nein sagen zu Scope-Erweiterungen',
      ],
      certifications: [
        'PMP (Project Management Professional)',
        'PRINCE2 Practitioner',
        'Professional Scrum Master (PSM I/II)',
        'IPMA Level C/D',
      ],
      cvFocus: [
        {
          label: 'Eine Projektliste als eigener Block',
          detail:
            'Drei bis fünf Referenzprojekte mit Branche, Volumen, Rolle und Ergebnis, getrennt vom Stationsverlauf.',
        },
        {
          label: 'Branchenwechsel begründen',
          detail:
            'Projektmanagement gilt als übertragbar, wird aber selten so gelesen. Benenne, was aus deiner Branche direkt anwendbar ist.',
        },
        {
          label: 'Ergebnis statt Aktivität',
          detail: '„Termingerecht und 8 % unter Budget geliefert“ statt „verantwortlich für die Steuerung“.',
        },
      ],
      coverLetterOpener:
        'Zwei Jahre lang habe ich die ERP-Einführung bei [Firma] geleitet: 1,4 Mio. € Budget, sechs Standorte, 40 beteiligte Mitarbeitende – und einen Go-live ohne Produktionsstillstand.',
      mistakes: [
        {
          label: 'Methodenkatalog statt Ergebnisse',
          detail:
            'Eine Aufzählung von Frameworks beweist Belesenheit, nicht Lieferfähigkeit. Ein einziges Projekt mit Zahlen wiegt schwerer.',
        },
        {
          label: 'Die eigene Rolle verschwimmen lassen',
          detail:
            'Bei „wir haben eingeführt“ bleibt offen, ob du geleitet oder mitgearbeitet hast. Sag, was du selbst verantwortet hast.',
        },
        {
          label: 'Gescheiterte Projekte verschweigen',
          detail:
            'Erfahrene Interviewer fragen gezielt danach. Ein gestopptes Projekt mit gezogener Lehre wirkt reifer als eine makellose Bilanz.',
        },
      ],
      faq: [
        {
          question: 'Lohnt sich eine PMP- oder PRINCE2-Zertifizierung für die Bewerbung?',
          answer:
            'Sie hilft vor allem bei Konzernen, im öffentlichen Sektor und in Ausschreibungen, wo sie manchmal formale Voraussetzung ist. In Produktorganisationen zählen Referenzprojekte deutlich mehr. Wer wenig dokumentierte Praxis hat, gewinnt durch das Zertifikat am meisten.',
        },
        {
          question: 'Wie beschreibe ich Projekte, die unter NDA stehen?',
          answer:
            'Anonymisiere den Kunden und nenne stattdessen Branche, Größenordnung und Ergebnis: „Automobilzulieferer, 250 Mio. € Umsatz, Migration von 14 Altsystemen“. Das ist zulässig und aussagekräftiger als ein bekannter Name ohne Kontext.',
        },
        {
          question: 'Wie wechsle ich vom Fachexperten ins Projektmanagement?',
          answer:
            'Führe Teilprojektleitungen, Koordinationsrollen und Vertretungen als eigene Punkte auf. Die meisten Quereinstiege gelingen intern oder in der Branche, in der deine Fachkenntnis den fehlenden Track Record ausgleicht.',
        },
      ],
    },
    interview: {
      slug: 'projektmanager',
      metaTitle: 'Vorstellungsgespräch als Projektmanager: Fragen und Antworten',
      metaDescription:
        'Die typischen Fragen im Projektmanagement-Interview – von Eskalation über Scope Creep bis zum gescheiterten Projekt, inklusive Antwortstruktur.',
      heading: 'Vorstellungsgespräch als Projektmanager',
      intro:
        'Fast jede Frage im Projektmanagement-Interview ist eine Verhaltensfrage. Erwartet wird kein Methodenwissen, sondern ein konkreter Fall aus deinem Alltag – erzählt in einer Struktur, der jemand folgen kann, der das Projekt nicht kennt.',
      questions: [
        {
          question: 'Erzählen Sie von einem Projekt, das aus dem Ruder lief.',
          why: 'Die wichtigste Frage überhaupt. Geprüft wird, ob du früh gegensteuerst oder erst beim Meilenstein merkst, dass nichts fertig ist.',
          tip: 'Wann hast du es gemerkt, woran, was hast du geändert, was war das Ergebnis. Ein reales Beispiel, nicht das glimpflichste.',
        },
        {
          question: 'Wie gehen Sie mit Scope Creep um?',
          why: 'Testet, ob du Anforderungen steuerst oder nur weiterreichst.',
          tip: 'Beschreibe deinen Change-Prozess: bewerten, Auswirkung auf Termin und Budget beziffern, entscheiden lassen – nicht selbst absagen.',
        },
        {
          question: 'Wie führen Sie ein Team ohne disziplinarische Verantwortung?',
          why: 'Der Kern der Rolle. Gesucht wird Einfluss über Transparenz und Verlässlichkeit, nicht über Autorität.',
          tip: 'Nenne ein Beispiel, in dem du jemanden gewonnen hast, der eigentlich keine Zeit für dein Projekt hatte.',
        },
        {
          question: 'Wann eskalieren Sie – und wie?',
          why: 'Zu früh gilt als schwach, zu spät als riskant. Interviewer wollen dein Kriterium hören.',
          tip: 'Definiere die Schwelle (Termin, Budget, Qualität nicht mehr haltbar), und eskaliere mit Lösungsvorschlag statt mit Problem.',
        },
        {
          question: 'Wie priorisieren Sie zwischen zwei gleich wichtigen Stakeholdern?',
          why: 'Prüft, ob du Entscheidungen an der richtigen Stelle herbeiführst.',
          tip: 'Kriterien sichtbar machen, gemeinsam entscheiden lassen, Entscheidung dokumentieren.',
        },
        {
          question: 'Wie messen Sie den Erfolg eines Projekts?',
          why: 'Trennt Liefer- von Wirkungsdenken.',
          tip: 'Neben Termin, Budget und Scope auch den Nutzen nach dem Go-live nennen – Adoption, eingesparte Zeit, Fehlerrückgang.',
        },
      ],
      redFlags: [
        'Ausschließlich erfolgreiche Projekte schildern.',
        'Verzögerungen dem Fachbereich, der IT oder dem Lieferanten zuschieben.',
        'Auf Nachfrage keine einzige Zahl zum eigenen Projekt nennen können.',
      ],
      askThem: [
        'Wer entscheidet hier über Projektpriorisierung, und wie oft ändert sich die Reihenfolge?',
        'Wie sind Projekt- und Linienorganisation zueinander aufgestellt?',
        'Welches Projekt ist zuletzt gescheitert, und was hat das Unternehmen daraus geändert?',
      ],
      faq: [
        {
          question: 'Soll ich im Interview eine Methodik empfehlen?',
          answer:
            'Nur mit Begründung aus dem Kontext. „Ich würde hier hybrid fahren, weil die Hardware-Lieferung fixe Termine hat, die Software aber Iterationen verträgt“ zeigt Urteilsvermögen. Ein Bekenntnis zu „agil“ ohne Bezug zum Unternehmen wirkt ungeprüft.',
        },
        {
          question: 'Wie gehe ich mit einer Fallstudie im Gespräch um?',
          answer:
            'Stelle zuerst Fragen, bevor du planst. Interviewer bewerten in Fallstudien fast immer die Klärungsfragen höher als den fertigen Plan – wer sofort einen Zeitplan malt, hat den häufigsten Fehler bereits gemacht.',
        },
      ],
    },
  },

  'sales-representative': {
    name: 'Vertriebsmitarbeiter',
    application: {
      slug: 'vertriebsmitarbeiter',
      metaTitle: 'Bewerbung im Vertrieb: Anschreiben, Lebenslauf & Zahlen',
      metaDescription:
        'Bewerbung als Vertriebsmitarbeiter: welche Zahlen ins Anschreiben gehören, welche Keywords ATS erkennt, Beispiel-Einstieg und typische Fehler.',
      heading: 'Bewerbung als Vertriebsmitarbeiter schreiben',
      intro:
        'Im Vertrieb ist die Bewerbung selbst die erste Arbeitsprobe: Wer sich nicht verkaufen kann, verkauft auch nichts. Entsprechend hart wird gelesen – und zwar zuerst nach Zahlen, dann nach allem anderen.',
      atsKeywords: [
        'Vertrieb',
        'Neukundenakquise',
        'Bestandskundenbetreuung',
        'B2B-Vertrieb',
        'Umsatzverantwortung',
        'Vertriebsziele',
        'CRM (Salesforce, HubSpot)',
        'Angebotserstellung',
        'Vertragsverhandlung',
        'Pipeline-Management',
        'Cross-Selling',
        'Key-Account-Management',
      ],
      hardSkills: [
        {
          label: 'Quote und Zielerreichung',
          detail:
            'Jahresziel, tatsächliche Erreichung, Vergleich zum Team. „112 % Zielerreichung bei 1,8 Mio. € Jahresquote“ ist die stärkste Zeile deiner Bewerbung.',
        },
        {
          label: 'Vertriebsart und Zyklus',
          detail:
            'Inbound oder Outbound, Neukunde oder Bestand, B2B oder B2C, Abschlussdauer, durchschnittliche Dealgröße – jeder dieser Punkte filtert.',
        },
        {
          label: 'CRM-Disziplin',
          detail:
            'Nenne das System und was du damit gesteuert hast. Vertriebsleiter fragen im Gespräch fast immer nach der Pipeline-Pflege.',
        },
        {
          label: 'Branche und Produkt',
          detail:
            'Der Verkauf erklärungsbedürftiger Investitionsgüter ist ein anderer Beruf als schneller Volumenvertrieb. Ordne dich klar zu.',
        },
      ],
      softSkills: [
        'Umgang mit Ablehnung über lange Zyklen',
        'Zuhören statt präsentieren',
        'Verhandlungsführung bis zum Abschluss',
        'Selbstorganisation im Außendienst',
        'Beziehungsaufbau über Jahre',
      ],
      certifications: [
        'Geprüfter Fachwirt für Vertrieb (IHK)',
        'Salesforce Certified Administrator',
        'Zertifizierung nach SPIN Selling / MEDDIC',
        'Weiterbildung Verhandlungsführung (z. B. Harvard-Konzept)',
      ],
      cvFocus: [
        {
          label: 'Zahlen pro Station',
          detail: 'Quote, Erreichung, Umsatzverantwortung, Anzahl betreuter Kunden – in jeder einzelnen Position.',
        },
        {
          label: 'Gebiet und Reiseanteil',
          detail: 'Region, Reisebereitschaft und Führerschein gehören sichtbar auf Seite eins.',
        },
        {
          label: 'Kurze Stationen erklären',
          detail:
            'Im Vertrieb sind Wechsel häufig, werden aber gezählt. Ein Halbsatz zum Grund verhindert die naheliegende Vermutung.',
        },
      ],
      coverLetterOpener:
        'In drei Jahren habe ich das Vertriebsgebiet Süd von 1,2 auf 2,1 Mio. € Jahresumsatz entwickelt – überwiegend durch Neukunden im Maschinenbau, bei einem durchschnittlichen Abschlusszyklus von sieben Monaten.',
      mistakes: [
        {
          label: 'Keine einzige Zahl',
          detail:
            'Ein Vertriebslebenslauf ohne Quoten wird als Warnsignal gelesen: Wer gute Zahlen hat, nennt sie.',
        },
        {
          label: 'Floskeln statt Verkaufsverständnis',
          detail: '„Kundenorientiert und abschlussstark“ steht in jeder zweiten Bewerbung und sagt nichts aus.',
        },
        {
          label: 'Kein Bezug zum Produkt des Unternehmens',
          detail:
            'Vertriebsleiter prüfen genau, ob du verstanden hast, was verkauft werden soll und an wen.',
        },
      ],
      faq: [
        {
          question: 'Was, wenn ich meine Ziele nicht erreicht habe?',
          answer:
            'Nenne sie trotzdem, mit Kontext: eingebrochener Markt, Produktwechsel, neu aufgebautes Gebiet. Verschwiegene Zahlen fallen im Gespräch auf, erklärte Zahlen zeigen, dass du deine Pipeline verstehst.',
        },
        {
          question: 'Darf ich Kundennamen in der Bewerbung nennen?',
          answer:
            'Bekannte Referenzkunden sind erlaubt, wenn die Zusammenarbeit öffentlich ist. Bei allem anderen reicht die Beschreibung: „drei DAX-Konzerne im Bereich Logistik“ ist unbedenklich und wirkt genauso.',
        },
        {
          question: 'Wie gehe ich mit dem Thema Provision um?',
          answer:
            'In der Bewerbung nur, wenn ein Gehaltswunsch verlangt wird – dann als Gesamtpaket mit Fixum und variablem Anteil plus Angabe, worauf sich das Variable bezog. Das Verhältnis Fix zu Variabel gehört ins Gespräch, nicht ins Anschreiben.',
        },
      ],
    },
    interview: {
      slug: 'vertriebsmitarbeiter',
      metaTitle: 'Vorstellungsgespräch im Vertrieb: Fragen und Antworten',
      metaDescription:
        'Vertriebsinterview: typische Fragen von der Einwandbehandlung bis zur Pipeline, was geprüft wird und wie du mit Zahlen antwortest.',
      heading: 'Vorstellungsgespräch als Vertriebsmitarbeiter',
      intro:
        'Vertriebsgespräche sind selbst ein Verkaufsgespräch – und werden auch so bewertet. Fast alle enthalten eine Zahlenrunde und häufig eine kurze Rollensimulation, in der du ein Produkt anbieten oder einen Einwand behandeln sollst.',
      questions: [
        {
          question: 'Wie waren Ihre Zahlen in den letzten drei Jahren?',
          why: 'Die Einstiegsfrage. Geprüft wird nicht nur die Höhe, sondern ob du deine eigenen Kennzahlen im Kopf hast.',
          tip: 'Quote, Erreichung, Rang im Team – für jedes Jahr. Zögern an dieser Stelle ist die schlechteste Antwort.',
        },
        {
          question: 'Verkaufen Sie mir dieses Produkt.',
          why: 'Getestet wird, ob du fragst, bevor du redest.',
          tip: 'Stelle zuerst drei Bedarfsfragen. Wer sofort Merkmale aufzählt, hat die Übung bereits verloren.',
        },
        {
          question: 'Wie gehen Sie mit dem Einwand „zu teuer“ um?',
          why: 'Prüft, ob du in Wert oder in Rabatt denkst.',
          tip: 'Nachfragen, worauf sich „zu teuer“ bezieht, dann Wert gegen Kosten rechnen. Rabatt als Erstreaktion gilt als Schwäche.',
        },
        {
          question: 'Wie sieht Ihre Pipeline heute aus?',
          why: 'Testet Systematik: Wie viele Deals in welcher Phase, mit welcher Abschlusswahrscheinlichkeit.',
          tip: 'Beschreibe deine Phasenlogik und dein Verhältnis von Pipeline zu Ziel (üblich ist Faktor 3 bis 4).',
        },
        {
          question: 'Erzählen Sie von einem verlorenen Deal.',
          why: 'Selbsteinschätzung. Wer nie verliert, verkauft zu wenig oder ist nicht ehrlich.',
          tip: 'Nenne den Grund, was du zu spät erkannt hast und was du seitdem anders machst.',
        },
        {
          question: 'Wie gewinnen Sie Neukunden ohne warme Leads?',
          why: 'Klärt, ob du echten Outbound kannst oder nur Anfragen bearbeitet hast.',
          tip: 'Beschreibe deinen Rhythmus konkret: Recherche, Ansprache, Nachfassen, Kadenz – mit Zahlen aus deinem Alltag.',
        },
      ],
      redFlags: [
        'Die eigenen Zahlen nicht kennen oder ausweichend beantworten.',
        'In der Rollensimulation reden statt fragen.',
        'Erfolge ausschließlich dem Produkt oder dem Markt zuschreiben.',
      ],
      askThem: [
        'Wie ist die Quote definiert, und wie viele im Team haben sie letztes Jahr erreicht?',
        'Wie ist das Verhältnis von Fixum zu variablem Anteil, und wann wird ausgezahlt?',
        'Woher kommen die Leads – und wie viel Outbound wird erwartet?',
      ],
      faq: [
        {
          question: 'Wie bereite ich mich auf die Rollensimulation vor?',
          answer:
            'Recherchiere das Produkt und die Zielkunden des Unternehmens und lege dir fünf gute Bedarfsfragen zurecht. Die Simulation prüft fast nie Produktwissen, sondern deine Gesprächsführung – Fragen zuerst, Nutzen danach.',
        },
        {
          question: 'Soll ich im Gespräch nach dem Abschluss fragen?',
          answer:
            'Ja, im Vertrieb wird das erwartet: eine klare Frage nach den nächsten Schritten und dem Zeitplan am Ende. Ein aggressiver Abschlussversuch auf die Stelle selbst wirkt dagegen aufgesetzt.',
        },
      ],
    },
  },

  accountant: {
    name: 'Buchhalter',
    application: {
      slug: 'buchhalter',
      metaTitle: 'Bewerbung als Buchhalter: Anschreiben, Lebenslauf & Software',
      metaDescription:
        'Bewerbung in der Buchhaltung: welche Software und Abschlüsse ins Profil gehören, welche Keywords ATS filtert, Beispiel-Einstieg und typische Fehler.',
      heading: 'Bewerbung als Buchhalter schreiben',
      intro:
        'In der Buchhaltung wird selten nach Persönlichkeit gefiltert, sondern nach drei Dingen: welche Software du beherrschst, bis zu welchem Abschluss du selbstständig arbeitest und nach welchem Rechnungslegungsstandard. Wer das nicht in den ersten Zeilen beantwortet, wird aussortiert.',
      atsKeywords: [
        'Finanzbuchhaltung',
        'Debitorenbuchhaltung',
        'Kreditorenbuchhaltung',
        'Monatsabschluss',
        'Jahresabschluss',
        'HGB',
        'IFRS',
        'Umsatzsteuervoranmeldung',
        'DATEV',
        'SAP FI',
        'Anlagenbuchhaltung',
        'Kontenabstimmung',
        'Intercompany-Abstimmung',
        'Rückstellungen',
      ],
      hardSkills: [
        {
          label: 'Abschlusssicherheit',
          detail:
            'Bis wohin arbeitest du eigenständig – Monats-, Quartals- oder Jahresabschluss? Das ist das entscheidende Auswahlkriterium.',
        },
        {
          label: 'Software mit Modul',
          detail:
            'DATEV, SAP FI/CO, Lexware, Sage, Navision – und das genutzte Modul. Ein reiner Toolname ohne Modulangabe sagt wenig.',
        },
        {
          label: 'Rechnungslegung',
          detail:
            'HGB, IFRS oder beides. Konzernbewerbungen scheitern regelmäßig daran, dass IFRS im Lebenslauf fehlt.',
        },
        {
          label: 'Umsatzsteuer und Meldewesen',
          detail:
            'UStVA, ZM, Reverse Charge, innergemeinschaftliche Lieferungen – bei international tätigen Unternehmen Pflichtwissen.',
        },
      ],
      softSkills: [
        'Sorgfalt bei hohem Belegvolumen',
        'Termintreue in der Abschlussphase',
        'Kommunikation mit Steuerberatern und Prüfern',
        'Diskretion bei Gehalts- und Finanzdaten',
        'Ruhe bei Rückfragen aus Fachabteilungen',
      ],
      certifications: [
        'Geprüfter Bilanzbuchhalter (IHK)',
        'Geprüfter Finanzbuchhalter (IHK)',
        'DATEV-Zertifizierungen (Rechnungswesen, Kanzleiorganisation)',
        'SAP-Anwenderzertifikat FI',
      ],
      cvFocus: [
        {
          label: 'Unternehmensgröße und Belegvolumen',
          detail:
            'Mittelstand mit 40 Mitarbeitenden oder Konzern mit 12 Gesellschaften – das bestimmt, wie deine Erfahrung gelesen wird.',
        },
        {
          label: 'Abschlussarten explizit nennen',
          detail: '„Mitarbeit am Jahresabschluss“ und „eigenverantwortliche Erstellung“ sind verschiedene Stellen.',
        },
        {
          label: 'Software als eigener Block',
          detail: 'Programme, Module und Jahre Erfahrung als Tabelle – so wird es tatsächlich gelesen.',
        },
      ],
      coverLetterOpener:
        'Seit fünf Jahren erstelle ich den Monatsabschluss nach HGB für drei Gesellschaften mit rund 1.800 Belegen im Monat und arbeite dem Jahresabschluss in SAP FI eigenständig zu.',
      mistakes: [
        {
          label: 'Nur „Buchhaltung“ als Aufgabe',
          detail:
            'Debitoren, Kreditoren, Anlagen und Abschluss sind unterschiedliche Profile. Wer nicht differenziert, passt auf keine Stelle genau.',
        },
        {
          label: 'Software ohne Tiefe angeben',
          detail:
            '„SAP-Kenntnisse“ wird im Gespräch geprüft. Nenne Module und Aufgaben, sonst wirkt es aufgebauscht.',
        },
        {
          label: 'Fortbildungen weglassen',
          detail:
            'Steuerrecht ändert sich jährlich. Ohne aktuelle Fortbildung entsteht der Eindruck, du buchst nach altem Stand.',
        },
      ],
      faq: [
        {
          question: 'Wie wichtig ist der Bilanzbuchhalter für die Bewerbung?',
          answer:
            'Für Positionen mit Abschlussverantwortung ist er oft ausdrücklich gefordert und der wichtigste Gehaltshebel im Beruf. Für Debitoren- und Kreditorenstellen ist er nicht nötig; dort zählen Volumen und Softwareroutine mehr.',
        },
        {
          question: 'Zählt Erfahrung aus einer Steuerkanzlei in der Industrie?',
          answer:
            'Ja, sie gilt als breite Grundlage – Kanzleierfahrung deckt viele Mandanten und Rechtsformen ab. Ergänze konkret, welche Branchen und welche Abschlussarten du dort betreut hast, sonst wirkt sie unspezifisch.',
        },
        {
          question: 'Soll ich Gehaltsvorstellungen nennen?',
          answer:
            'Wenn die Anzeige danach fragt, ja – sonst wirkt die Bewerbung unvollständig. Nenne einen Jahresbruttobetrag und orientiere dich an Unternehmensgröße und Abschlussverantwortung, nicht an der reinen Berufsjahrzahl.',
        },
      ],
    },
    interview: {
      slug: 'buchhalter',
      metaTitle: 'Vorstellungsgespräch als Buchhalter: Fragen und Antworten',
      metaDescription:
        'Fragen im Buchhaltungs-Interview: von Abschlusssicherheit über Fehlerumgang bis zur Softwarepraxis – mit Antwortstruktur und Rückfragen.',
      heading: 'Vorstellungsgespräch als Buchhalter',
      intro:
        'Buchhaltungsgespräche sind fachlicher als die meisten anderen: In der Regel sitzt die Leitung Rechnungswesen mit am Tisch und prüft an konkreten Sachverhalten, ob du wirklich selbstständig arbeitest. Ein kleiner Fachteil ist eher die Regel als die Ausnahme.',
      questions: [
        {
          question: 'Welche Abschlüsse erstellen Sie eigenständig?',
          why: 'Die zentrale Einstufungsfrage – sie entscheidet über Stelle und Gehaltsband.',
          tip: 'Sei exakt: Monatsabschluss eigenständig, Jahresabschluss zuarbeitend. Übertreibungen fallen in der Probezeit sofort auf.',
        },
        {
          question: 'Wie gehen Sie mit einer Differenz in der Kontenabstimmung um?',
          why: 'Prüft Systematik statt Auswendigwissen.',
          tip: 'Beschreibe dein Vorgehen: eingrenzen nach Periode und Konto, Buchungsstapel prüfen, Beleg suchen, Korrektur dokumentieren.',
        },
        {
          question: 'Welche Erfahrung haben Sie mit HGB und IFRS?',
          why: 'Klärt, ob du in einer Konzernumgebung einsetzbar bist.',
          tip: 'Konkrete Unterschiede benennen, mit denen du gearbeitet hast – etwa Rückstellungen oder Leasing.',
        },
        {
          question: 'Erzählen Sie von einem Fehler, den Sie gemacht haben.',
          why: 'In der Buchhaltung wichtiger als anderswo: Gesucht wird jemand, der Fehler meldet, statt sie stillschweigend zu korrigieren.',
          tip: 'Fehler, Auswirkung, Meldung, Korrektur, eingeführte Kontrolle – in dieser Reihenfolge.',
        },
        {
          question: 'Wie halten Sie sich bei Steuerrechtsänderungen aktuell?',
          why: 'Prüft Eigeninitiative in einem Beruf mit jährlich wechselnder Rechtslage.',
          tip: 'Nenne Quellen und Fortbildungen konkret, nicht „Fachliteratur“.',
        },
        {
          question: 'Wie arbeiten Sie unter dem Termindruck des Monatsabschlusses?',
          why: 'Die Abschlusswoche ist die Belastungsprobe des Berufs.',
          tip: 'Beschreibe deine Reihenfolge und wie du Zuarbeiten aus anderen Abteilungen rechtzeitig bekommst.',
        },
      ],
      redFlags: [
        'Softwarekenntnisse behaupten, die im Fachteil nicht belegt werden können.',
        'Fehler als Schuld anderer Abteilungen darstellen.',
        'Keine aktuelle Fortbildung nennen können.',
      ],
      askThem: [
        'Wie viele Gesellschaften und Belege umfasst der Bereich, und wie ist das Team aufgeteilt?',
        'Wie läuft der Abschluss ab, und wie lange dauert er aktuell?',
        'Welche Systeme sind im Einsatz, und stehen Migrationen an?',
      ],
      faq: [
        {
          question: 'Wird im Gespräch ein Fachtest gemacht?',
          answer:
            'Häufig, meist kurz: einige Buchungssätze, eine Abgrenzung oder eine Umsatzsteuerfrage. Es geht um Grundsicherheit, nicht um Prüfungsniveau — rechne mit Standardsachverhalten aus dem Alltag der Stelle.',
        },
        {
          question: 'Wie erkläre ich einen Wechsel aus der Kanzlei ins Unternehmen?',
          answer:
            'Als Wunsch nach Tiefe statt Breite: ein Unternehmen dauerhaft begleiten, statt viele Mandanten parallel. Das ist der übliche und akzeptierte Grund — vermeide es, den Wechsel mit Arbeitsbelastung allein zu begründen.',
        },
      ],
    },
  },

  'marketing-manager': {
    name: 'Marketing Manager',
    application: {
      slug: 'marketing-manager',
      metaTitle: 'Bewerbung als Marketing Manager: Anschreiben, Lebenslauf & KPIs',
      metaDescription:
        'Bewerbung im Marketing: welche KPIs zählen, welche Kanäle und Tools ins Profil gehören, Beispiel-Einstieg fürs Anschreiben und typische Fehler.',
      heading: 'Bewerbung als Marketing Manager schreiben',
      intro:
        'Marketingbewerbungen scheitern selten an der Gestaltung und fast immer an fehlenden Kennzahlen. Wer Kanal, Budget und Ergebnis nennt, wird als Manager gelesen; wer Kampagnen aufzählt, als Ausführender.',
      atsKeywords: [
        'Online-Marketing',
        'Kampagnenmanagement',
        'SEO',
        'SEA / Google Ads',
        'Content-Marketing',
        'E-Mail-Marketing',
        'Social Media',
        'Marketing-Automation (HubSpot)',
        'Google Analytics 4',
        'Conversion-Rate',
        'CAC / ROAS',
        'Budgetverantwortung',
        'Markenführung',
        'A/B-Testing',
      ],
      hardSkills: [
        {
          label: 'KPIs mit Ausgangswert',
          detail:
            '„CAC von 180 € auf 120 € gesenkt“ sagt mehr als jede Prozentangabe ohne Basis. Nenne immer beide Werte.',
        },
        {
          label: 'Kanaltiefe statt Kanalliste',
          detail:
            'Zwei Kanäle, die du wirklich steuerst, schlagen acht, die du einmal bespielt hast. Nenne dazu das verantwortete Budget.',
        },
        {
          label: 'Werkzeuge und Datenbasis',
          detail:
            'GA4, HubSpot, Salesforce Marketing Cloud, Looker Studio – ATS-Filter suchen nach genau diesen Namen.',
        },
        {
          label: 'B2B oder B2C',
          detail:
            'Lange Entscheidungswege mit Lead Nurturing sind ein anderer Beruf als Performance-Marketing im E-Commerce.',
        },
      ],
      softSkills: [
        'Zusammenarbeit mit Vertrieb und Produkt',
        'Steuerung von Agenturen und Freelancern',
        'Priorisieren bei begrenztem Budget',
        'Ergebnisse vor Geschäftsführung vertreten',
        'Redaktionelle Sicherheit',
      ],
      certifications: [
        'Google Ads-Zertifizierungen (Search, Performance Max)',
        'Google Analytics 4 Zertifizierung',
        'HubSpot Inbound Marketing / Marketing Software',
        'Geprüfter Marketing-Fachwirt (IHK)',
      ],
      cvFocus: [
        {
          label: 'Ein Ergebnis pro Station',
          detail: 'Eine Kennzahl, die sich nachweislich durch deine Arbeit verändert hat – mehr braucht es nicht.',
        },
        {
          label: 'Budget- und Teamgröße',
          detail: 'Ob du 30.000 € oder 3 Mio. € gesteuert hast, entscheidet über die Ebene der Stelle.',
        },
        {
          label: 'Portfolio verlinken',
          detail:
            'Zwei bis drei Kampagnen mit Ziel, Umsetzung und Ergebnis – als PDF oder Seite. Ein Link ersetzt eine Seite Beschreibung.',
        },
      ],
      coverLetterOpener:
        'Bei [Firma] habe ich das Performance-Budget von 40.000 € monatlich verantwortet und den Cost per Lead innerhalb von zwei Quartalen von 94 € auf 61 € gesenkt – bei gleichbleibender Abschlussquote im Vertrieb.',
      mistakes: [
        {
          label: 'Kreativität ohne Wirkung',
          detail:
            'Eine schön gestaltete Kampagne ohne Ergebnis überzeugt keine Geschäftsführung. Nenne immer das Ziel dahinter.',
        },
        {
          label: 'Zu viele Kanäle behaupten',
          detail: 'Wer überall Experte ist, wird nirgends als solcher gelesen – und im Gespräch schnell entlarvt.',
        },
        {
          label: 'Die Bewerbung überdesignen',
          detail:
            'Aufwendige Layouts werden von ATS oft unbrauchbar geparst. Ein klarer Lebenslauf plus verlinktes Portfolio ist der sichere Weg.',
        },
      ],
      faq: [
        {
          question: 'Brauche ich ein Portfolio als Marketing Manager?',
          answer:
            'Für inhaltliche und kreative Rollen ja, für Performance- und Analytics-lastige Rollen ist eine Kennzahlenübersicht wertvoller. In beiden Fällen genügt ein Link – Anhänge über 5 MB werden von Mailsystemen häufig abgewiesen.',
        },
        {
          question: 'Wie gehe ich mit KPIs um, die ich nicht veröffentlichen darf?',
          answer:
            'Arbeite mit relativen Angaben: „Conversion-Rate um 34 % gesteigert“ statt absoluter Umsätze. Das ist vertraulichkeitskonform und für die Bewertung deiner Arbeit völlig ausreichend.',
        },
        {
          question: 'Wie wichtig sind KI-Kenntnisse im Marketing inzwischen?',
          answer:
            'Sie werden zunehmend erwartet, aber als Werkzeug, nicht als Selbstzweck. Überzeugend ist, wenn du beschreibst, welchen Prozess du damit beschleunigt hast und wie du die Qualität weiterhin sicherstellst.',
        },
      ],
    },
    interview: {
      slug: 'marketing-manager',
      metaTitle: 'Vorstellungsgespräch als Marketing Manager: Fragen und Antworten',
      metaDescription:
        'Marketing-Interview: Fragen zu Kampagnen, KPIs, Budget und Misserfolgen – was dahinter geprüft wird und wie du strukturiert antwortest.',
      heading: 'Vorstellungsgespräch als Marketing Manager',
      intro:
        'Im Marketinggespräch wird fast immer eine Kampagne im Detail auseinandergenommen. Erwartet wird, dass du Ziel, Zielgruppe, Budget, Ergebnis und die eigene Rolle sauber trennen kannst – daran scheitert der Großteil der Kandidaten.',
      questions: [
        {
          question: 'Erzählen Sie von einer Kampagne, auf die Sie stolz sind.',
          why: 'Geprüft wird, ob du in Zielen denkst oder in Maßnahmen.',
          tip: 'Ziel, Zielgruppe, Kanal, Budget, Ergebnis, dein Anteil – in dieser Reihenfolge, in zwei Minuten.',
        },
        {
          question: 'Welche Kampagne ist gescheitert, und warum?',
          why: 'Marketing ist iterativ. Wer nie etwas eingestellt hat, hat nie wirklich getestet.',
          tip: 'Nenne die Hypothese, was sie widerlegt hat und was du daraufhin geändert hast.',
        },
        {
          question: 'Welche Kennzahl steuern Sie täglich?',
          why: 'Trennt operative Steuerung von Reporting am Monatsende.',
          tip: 'Eine Kennzahl nennen und begründen, warum sie das Geschäft am besten abbildet.',
        },
        {
          question: 'Wie würden Sie unser Marketing verbessern?',
          why: 'Prüft Vorbereitung. Fast alle Kandidaten antworten allgemein.',
          tip: 'Zwei konkrete Beobachtungen von der Website oder aus den Anzeigen des Unternehmens, mit Begründung.',
        },
        {
          question: 'Wie arbeiten Sie mit dem Vertrieb zusammen?',
          why: 'Die häufigste Konfliktlinie in B2B-Organisationen.',
          tip: 'Beschreibe gemeinsame Lead-Definitionen und Rückkopplung zur Lead-Qualität, nicht nur Übergaben.',
        },
        {
          question: 'Wie verteilen Sie ein begrenztes Budget?',
          why: 'Testet Priorisierung und Testkultur.',
          tip: 'Beschreibe eine Aufteilung zwischen laufendem Geschäft und Tests, mit einem Kriterium für den Ausstieg.',
        },
      ],
      redFlags: [
        'Kennzahlen nennen, die man auf Nachfrage nicht herleiten kann.',
        'Alle Erfolge sich selbst und alle Misserfolge dem Budget zuschreiben.',
        'Das Produkt des Unternehmens vor dem Gespräch nicht angesehen haben.',
      ],
      askThem: [
        'Welche Kennzahl entscheidet hier über den Erfolg des Marketings?',
        'Wie ist das Budget zwischen Marke und Performance aufgeteilt?',
        'Wie eng arbeiten Marketing und Vertrieb an der Lead-Definition zusammen?',
      ],
      faq: [
        {
          question: 'Soll ich eine Aufgabe oder Case Study vorbereiten?',
          answer:
            'Wenn keine gestellt wird, reichen zwei konkrete Beobachtungen zum Marketing des Unternehmens. Das wirkt vorbereitet, ohne anmaßend zu sein — ein ungefragter Fertigplan von außen wirkt dagegen oft uninformiert.',
        },
        {
          question: 'Wie gehe ich mit Fragen zu Tools um, die ich nicht kenne?',
          answer:
            'Ehrlich einordnen und die Analogie nennen: „HubSpot habe ich nicht genutzt, aber Marketo in derselben Funktion.“ Marketing-Tools sind erlernbar; falsche Behauptungen fallen dagegen in der ersten Arbeitswoche auf.',
        },
      ],
    },
  },

  'data-analyst': {
    name: 'Datenanalyst',
    application: {
      slug: 'datenanalyst',
      metaTitle: 'Bewerbung als Datenanalyst: Anschreiben, Lebenslauf & Skills',
      metaDescription:
        'Bewerbung als Data Analyst: welche Tools und Methoden ins Profil gehören, wie du Wirkung belegst, Beispiel-Einstieg und typische Fehler.',
      heading: 'Bewerbung als Datenanalyst schreiben',
      intro:
        'Datenanalysten werden nicht nach Tools eingestellt, sondern danach, ob ihre Analysen Entscheidungen verändert haben. SQL setzt jeder voraus – der Unterschied liegt darin, ob du sagen kannst, was nach deiner Auswertung anders gemacht wurde.',
      atsKeywords: [
        'Datenanalyse',
        'SQL',
        'Python',
        'R',
        'Power BI',
        'Tableau',
        'Looker',
        'Datenvisualisierung',
        'ETL',
        'Data Warehouse',
        'dbt',
        'A/B-Test',
        'KPI-Reporting',
        'Statistik',
      ],
      hardSkills: [
        {
          label: 'SQL in echter Tiefe',
          detail:
            'Window-Funktionen, CTEs, Query-Optimierung. Fast jeder Prozess enthält einen SQL-Test – oberflächliche Kenntnisse fallen dort sofort auf.',
        },
        {
          label: 'Ein BI-Werkzeug wirklich beherrschen',
          detail:
            'Power BI, Tableau oder Looker – inklusive Datenmodellierung, nicht nur Diagramme aus fertigen Tabellen.',
        },
        {
          label: 'Statistisches Urteilsvermögen',
          detail:
            'Signifikanz, Konfidenz, Stichprobengröße: der Unterschied zwischen Reporting und Analyse.',
        },
        {
          label: 'Domänenverständnis',
          detail:
            'E-Commerce, Finanzen, Logistik oder Gesundheit – wer die Kennzahlen der Branche kennt, ist ab Tag eins produktiv.',
        },
      ],
      softSkills: [
        'Ergebnisse für Nicht-Analysten erklären',
        'Unklare Fragen in auswertbare übersetzen',
        'Skepsis gegenüber der eigenen Auswertung',
        'Sauberes Dokumentieren von Annahmen',
        'Umgang mit unbequemen Ergebnissen',
      ],
      certifications: [
        'Microsoft Certified: Power BI Data Analyst Associate',
        'Tableau Desktop Specialist',
        'Google Data Analytics Professional Certificate',
        'AWS Certified Data Engineer – Associate',
      ],
      cvFocus: [
        {
          label: 'Entscheidung statt Dashboard',
          detail:
            '„Analyse der Abwanderung führte zur Umstellung des Onboardings, Kündigungsquote −18 %“ statt „Erstellung von Dashboards“.',
        },
        {
          label: 'Datenmenge und Quellen',
          detail: 'Größenordnung und Anzahl der angebundenen Systeme zeigen, in welcher Umgebung du arbeitest.',
        },
        {
          label: 'Ein öffentliches Arbeitsbeispiel',
          detail:
            'Ein Notebook oder ein öffentliches Dashboard mit Fragestellung und Ergebnis ersetzt viele Behauptungen.',
        },
      ],
      coverLetterOpener:
        'Meine Kohortenanalyse zur Kundenabwanderung bei [Firma] hat gezeigt, dass 60 % der Kündigungen in den ersten 30 Tagen entstehen – das daraufhin umgebaute Onboarding hat die Abwanderung im Folgequartal um 18 % gesenkt.',
      mistakes: [
        {
          label: 'Toolliste statt Fragestellung',
          detail: 'Jeder Bewerber kann SQL und Python. Kaum einer schreibt, welche Frage er damit beantwortet hat.',
        },
        {
          label: 'Data Analyst und Data Scientist vermischen',
          detail:
            'Modelle behaupten, die man nicht produktiv gebracht hat, führt im technischen Gespräch schnell zu Nachfragen.',
        },
        {
          label: 'Ohne Geschäftsbezug argumentieren',
          detail: 'Eine methodisch saubere Analyse ohne erkennbaren Nutzen überzeugt keinen Fachbereich.',
        },
      ],
      faq: [
        {
          question: 'Brauche ich ein Studium in Statistik oder Informatik?',
          answer:
            'Nein — Quereinstiege sind in der Datenanalyse üblich. Entscheidend ist eine belastbare Arbeitsprobe: eine echte Fragestellung, sauber ausgewertet und verständlich präsentiert. Ohne Studium wird die Probe wichtiger, nicht die Bewerbung länger.',
        },
        {
          question: 'Wie belege ich Erfahrung ohne veröffentlichbare Firmendaten?',
          answer:
            'Beschreibe Fragestellung, Methode und Wirkung ohne absolute Zahlen, und ergänze ein Projekt mit öffentlichen Daten. Diese Kombination aus beschriebener Praxis und einsehbarem Handwerk ist der übliche Weg.',
        },
        {
          question: 'Wie bereite ich mich auf den SQL-Test vor?',
          answer:
            'Übe Joins, Aggregationen, Window-Funktionen und CTEs an einem echten Datensatz unter Zeitdruck. Fast jeder Prozess enthält eine solche Aufgabe, und sie ist der häufigste Ausscheidungspunkt.',
        },
      ],
    },
    interview: {
      slug: 'datenanalyst',
      metaTitle: 'Vorstellungsgespräch als Datenanalyst: Fragen und Antworten',
      metaDescription:
        'Data-Analyst-Interview: SQL-Test, Fallstudie und Verhaltensfragen – was geprüft wird, wie du antwortest und was du fragen solltest.',
      heading: 'Vorstellungsgespräch als Datenanalyst',
      intro:
        'Der Prozess besteht meist aus drei Stufen: SQL-Test, eine Fallstudie mit offener Fragestellung und ein Gespräch mit dem Fachbereich. Am häufigsten scheitern Kandidaten in der Fallstudie – nicht an der Analyse, sondern daran, dass sie rechnen, bevor sie fragen.',
      questions: [
        {
          question: 'Eine Kennzahl ist über Nacht um 30 % gefallen. Wie gehen Sie vor?',
          why: 'Die klassische Diagnosefrage. Geprüft wird Systematik, nicht Intuition.',
          tip: 'Erst Datenfehler ausschließen, dann segmentieren (Region, Gerät, Kanal, Nutzergruppe), dann Hypothesen prüfen.',
        },
        {
          question: 'Wie erklären Sie ein Ergebnis, das der Fachbereich nicht hören will?',
          why: 'Prüft Standfestigkeit und Kommunikationsvermögen zugleich.',
          tip: 'Ergebnis, Methode, Unsicherheit, Handlungsoption. Ein echtes Beispiel wirkt hier am stärksten.',
        },
        {
          question: 'Wie stellen Sie sicher, dass Ihre Zahlen stimmen?',
          why: 'Datenqualität ist der Kern der Rolle.',
          tip: 'Plausibilitätsprüfungen, Abgleich mit einer zweiten Quelle, dokumentierte Annahmen – konkret benennen.',
        },
        {
          question: 'Erklären Sie einen A/B-Test einem Nicht-Statistiker.',
          why: 'Prüft, ob du Fachsprache übersetzen kannst.',
          tip: 'Ohne Fachbegriffe auskommen, mit einem Beispiel aus dem Produkt des Unternehmens.',
        },
        {
          question: 'Woran haben Sie zuletzt gearbeitet, das eine Entscheidung verändert hat?',
          why: 'Trennt Reporting von Analyse.',
          tip: 'Nenne die Entscheidung, nicht das Dashboard – und wer sie getroffen hat.',
        },
        {
          question: 'Wie priorisieren Sie mehrere Anfragen gleichzeitig?',
          why: 'Analysten werden von allen Abteilungen angefragt; Priorisierung ist Alltag.',
          tip: 'Nach Entscheidungsrelevanz und Frist priorisieren, wiederkehrende Anfragen in Self-Service überführen.',
        },
      ],
      redFlags: [
        'In der Fallstudie sofort rechnen, ohne die Fragestellung zu klären.',
        'Korrelation als Ursache darstellen.',
        'Annahmen treffen, ohne sie zu benennen.',
      ],
      askThem: [
        'Wer nutzt die Analysen, und welche Entscheidungen hängen daran?',
        'Wie ist der Datenstack aufgebaut, und wie verlässlich sind die Quellen?',
        'Ist die Rolle eher Self-Service-Enablement oder tiefe Einzelanalyse?',
      ],
      faq: [
        {
          question: 'Wie schwer ist der SQL-Test üblicherweise?',
          answer:
            'Meist mittleres Niveau unter Zeitdruck: mehrere Joins, Aggregation, eine Window-Funktion. Verbreiteter als Komplexität ist die Falle, das Ergebnis nicht auf Plausibilität zu prüfen — das wird mitbewertet.',
        },
        {
          question: 'Was erwartet mich in der Fallstudie?',
          answer:
            'Eine offene Geschäftsfrage wie „Warum sinkt unsere Wiederkaufrate?“. Erwartet werden Klärungsfragen, ein Vorgehen und benannte Annahmen — nicht eine fertige Zahl.',
        },
      ],
    },
  },

  teacher: {
    name: 'Lehrer',
    application: {
      slug: 'lehrer',
      metaTitle: 'Bewerbung als Lehrer: Anschreiben, Lebenslauf & Unterlagen',
      metaDescription:
        'Bewerbung als Lehrkraft: welche Nachweise nötig sind, was ins Anschreiben gehört, Beispiel-Einstieg und die häufigsten Fehler – auch für Quereinsteiger.',
      heading: 'Bewerbung als Lehrer schreiben',
      intro:
        'Lehrerbewerbungen laufen entweder über ein Landesportal oder direkt an die Schule – und werden völlig unterschiedlich gelesen. Beim Land zählen Fächerkombination, Lehramt und Noten; bei der Schulleitung zählt, was du über den Unterricht hinaus einbringst.',
      atsKeywords: [
        'Lehramt',
        'Fächerkombination',
        'Zweites Staatsexamen',
        'Referendariat',
        'Unterrichtsentwicklung',
        'Differenzierung',
        'Inklusion',
        'Klassenleitung',
        'Elternarbeit',
        'Digitale Medien im Unterricht',
        'Leistungsbewertung',
        'Quereinstieg',
      ],
      hardSkills: [
        {
          label: 'Fächer und Schulform',
          detail:
            'Die Fächerkombination und die Schulform entscheiden praktisch allein über Einstellungschancen. Beide gehören in die erste Zeile.',
        },
        {
          label: 'Abschlüsse und Anerkennung',
          detail:
            'Erstes und zweites Staatsexamen mit Noten; bei einem Abschluss aus einem anderen Bundesland oder Land der Anerkennungsbescheid.',
        },
        {
          label: 'Unterrichtserfahrung außerhalb des Referendariats',
          detail:
            'Vertretung, Nachhilfe, Volkshochschule, Werkstattarbeit – alles, was zeigt, dass du vor einer Klasse stehen kannst.',
        },
        {
          label: 'Digitale und methodische Zusatzqualifikation',
          detail:
            'Lernplattformen, Medienkonzepte, Sprachförderung, DaZ – genau danach suchen Schulleitungen bei der Direktbewerbung.',
        },
      ],
      softSkills: [
        'Klassenführung ohne Autoritätskonflikt',
        'Elterngespräche in Konfliktlagen',
        'Zusammenarbeit im Kollegium',
        'Geduld bei heterogenen Lerngruppen',
        'Verlässlichkeit in der Schulorganisation',
      ],
      certifications: [
        'Zweites Staatsexamen (Lehramt)',
        'Zusatzqualifikation Deutsch als Zweitsprache (DaZ)',
        'Fortbildung Inklusion / sonderpädagogische Förderung',
        'Medienpädagogische Zertifikate der Landesinstitute',
      ],
      cvFocus: [
        {
          label: 'Schulform und Jahrgangsstufen',
          detail: 'Grundschule, Sekundarstufe I oder II und die konkret unterrichteten Stufen.',
        },
        {
          label: 'Engagement über den Unterricht hinaus',
          detail:
            'AGs, Schulfahrten, Projektwochen, Steuergruppen – bei Direktbewerbungen ist das häufig der ausschlaggebende Punkt.',
        },
        {
          label: 'Bezug zum Schulprofil',
          detail:
            'Ganztag, Montessori, bilingual, MINT-Schwerpunkt: ein Satz dazu unterscheidet dich von der Standardbewerbung.',
        },
      ],
      coverLetterOpener:
        'Ihr Schulprofil mit bilingualem Zug in der Sekundarstufe I passt genau zu meiner Fächerkombination Englisch und Geschichte – im Referendariat habe ich zwei Halbjahre bilingualen Geschichtsunterricht in Jahrgang 8 gehalten.',
      mistakes: [
        {
          label: 'Dieselbe Bewerbung an Land und Schule',
          detail:
            'Das Landesportal will formale Daten, die Schulleitung will Passung zum Profil. Zwei verschiedene Texte sind nötig.',
        },
        {
          label: 'Pädagogische Leitsätze statt Praxis',
          detail:
            'Eine halbe Seite Bildungsphilosophie liest niemand. Eine konkrete Unterrichtsreihe mit Ergebnis dagegen schon.',
        },
        {
          label: 'Unvollständige Unterlagen',
          detail:
            'Examenszeugnisse, erweitertes Führungszeugnis, Masernnachweis: Fehlt eines, verzögert sich die Einstellung um Wochen.',
        },
      ],
      faq: [
        {
          question: 'Wie bewerbe ich mich als Quereinsteiger?',
          answer:
            'Über die Seiteneinstiegsverfahren der Länder, die sich in Voraussetzungen und Fristen deutlich unterscheiden. Entscheidend ist, ob dein Studienfach einem Schulfach zugeordnet werden kann; Mangelfächer wie Mathematik, Physik, Informatik und Technik haben die besten Chancen.',
        },
        {
          question: 'Bewerbe ich mich beim Land oder direkt an der Schule?',
          answer:
            'Meist beides: das Landesportal für das reguläre Einstellungsverfahren, die Direktbewerbung für schulscharfe Ausschreibungen und Vertretungsstellen. Die Direktbewerbung ist der schnellere Weg, aber nur für ausgeschriebene Stellen.',
        },
        {
          question: 'Wie wichtig sind die Examensnoten?',
          answer:
            'Im listenbasierten Landesverfahren sind sie oft ausschlaggebend, weil die Reihung danach erfolgt. Bei schulscharfen Ausschreibungen zählen Passung zum Profil und Zusatzqualifikationen deutlich mehr.',
        },
      ],
    },
    interview: {
      slug: 'lehrer',
      metaTitle: 'Vorstellungsgespräch als Lehrer: Fragen und Antworten',
      metaDescription:
        'Fragen im Lehrer-Vorstellungsgespräch: Klassenführung, Elternarbeit, Differenzierung und Schulprofil – mit Antwortstruktur und Rückfragen.',
      heading: 'Vorstellungsgespräch als Lehrer',
      intro:
        'Im schulscharfen Verfahren sitzen meist Schulleitung, Personalrat und eine Vertretung des Kollegiums am Tisch. Gefragt wird fast ausschließlich nach konkreten Situationen – und häufig folgt eine Unterrichtsprobe, die stärker gewichtet wird als das Gespräch.',
      questions: [
        {
          question: 'Wie gehen Sie mit einer Klasse um, die nicht zur Ruhe kommt?',
          why: 'Klassenführung ist die Kernkompetenz. Geprüft wird, ob du Strukturen aufbaust oder auf Lautstärke reagierst.',
          tip: 'Beschreibe Rituale und Regeln, die du vorher etablierst, nicht nur die Reaktion im Moment.',
        },
        {
          question: 'Wie differenzieren Sie in einer heterogenen Lerngruppe?',
          why: 'Der Alltag jeder Schulform. Erwartet wird Praxis, keine Theorie.',
          tip: 'Eine konkrete Stunde mit gestuften Aufgaben schildern – Material, Ablauf, Ergebnis.',
        },
        {
          question: 'Erzählen Sie von einem schwierigen Elterngespräch.',
          why: 'Elternarbeit bindet viel Zeit und ist eine häufige Belastungsquelle.',
          tip: 'Zuhören, Sachverhalt trennen von Emotion, gemeinsame Vereinbarung, Dokumentation.',
        },
        {
          question: 'Warum unsere Schule?',
          why: 'Die entscheidende Frage bei schulscharfen Stellen.',
          tip: 'Auf Schulprogramm, Profil oder ein konkretes Projekt der Schule Bezug nehmen.',
        },
        {
          question: 'Wie setzen Sie digitale Medien im Unterricht ein?',
          why: 'Prüft, ob du Werkzeuge didaktisch begründet einsetzt statt als Selbstzweck.',
          tip: 'Ein Beispiel, bei dem das Werkzeug etwas ermöglicht hat, das ohne es nicht ginge.',
        },
        {
          question: 'Was würden Sie über den Unterricht hinaus einbringen?',
          why: 'Schulen suchen Kollegen, die Schulleben mittragen.',
          tip: 'Konkret werden: eine AG, ein Fachbereich, ein Projekt – und ehrlich zum Zeitbudget bleiben.',
        },
      ],
      redFlags: [
        'Disziplinprobleme allein den Schülern oder dem Elternhaus zuschreiben.',
        'Das Schulprogramm nicht gelesen haben.',
        'Ausschließlich in pädagogischen Schlagworten sprechen, ohne ein Beispiel zu nennen.',
      ],
      askThem: [
        'Wie ist die Einarbeitung neuer Kolleginnen und Kollegen organisiert?',
        'Welche Schwerpunkte setzt die Schulentwicklung in den nächsten zwei Jahren?',
        'Wie ist die Zusammenarbeit in den Fachschaften organisiert?',
      ],
      faq: [
        {
          question: 'Wie läuft eine Unterrichtsprobe ab?',
          answer:
            'In der Regel eine 45-minütige Stunde in einer fremden Klasse, mit Thema und Lerngruppe vorab, gefolgt von einem Reflexionsgespräch. Bewertet wird weniger die perfekte Stunde als deine Reflexion darüber, was funktioniert hat und was nicht.',
        },
        {
          question: 'Wird nach der Fächerkombination noch gefragt?',
          answer:
            'Bei schulscharfen Stellen ja, weil der Bedarf konkret ist. Bereite dich darauf vor zu sagen, welche Stufen und welchen Umfang du in beiden Fächern abdecken kannst — das entscheidet häufig über die Zusage.',
        },
      ],
    },
  },

  'office-administrator': {
    name: 'Bürokaufmann/-frau',
    application: {
      slug: 'buerokaufmann',
      metaTitle: 'Bewerbung als Bürokaufmann/-frau: Anschreiben & Lebenslauf',
      metaDescription:
        'Bewerbung im Büro und in der Verwaltung: welche Aufgaben und Programme ins Profil gehören, Beispiel-Einstieg fürs Anschreiben und typische Fehler.',
      heading: 'Bewerbung als Bürokaufmann/-frau schreiben',
      intro:
        'Kaufmännische Bürostellen bekommen die meisten Bewerbungen von allen – und die meisten sind austauschbar. Wer den eigenen Aufgabenzuschnitt genau beschreibt statt „allgemeine Bürotätigkeiten“, ist damit bereits im vorderen Drittel.',
      atsKeywords: [
        'Büroorganisation',
        'Auftragsabwicklung',
        'Rechnungsprüfung',
        'Terminkoordination',
        'Reisekostenabrechnung',
        'Korrespondenz',
        'MS Office / Excel',
        'ERP-System',
        'Datenpflege',
        'Angebotserstellung',
        'Empfang und Telefonzentrale',
        'Dokumentenmanagement',
      ],
      hardSkills: [
        {
          label: 'Der tatsächliche Aufgabenzuschnitt',
          detail:
            'Auftragsabwicklung, Fakturierung, Personalverwaltung oder Assistenz – das sind völlig verschiedene Stellen unter demselben Titel.',
        },
        {
          label: 'Excel über Grundkenntnisse hinaus',
          detail:
            'SVERWEIS/XVERWEIS, Pivot-Tabellen, Filter: das ist der am häufigsten geprüfte Punkt in dieser Berufsgruppe.',
        },
        {
          label: 'ERP- und Warenwirtschaftssysteme',
          detail:
            'SAP, Navision, Sage, Lexware oder DATEV namentlich nennen – die Einarbeitungszeit ist für Arbeitgeber ein direkter Kostenfaktor.',
        },
        {
          label: 'Zahlen zum Volumen',
          detail:
            'Aufträge pro Woche, Rechnungen pro Monat, betreute Standorte: das macht „Büroorganisation“ überhaupt erst greifbar.',
        },
      ],
      softSkills: [
        'Selbstständige Priorisierung ohne enge Führung',
        'Freundlichkeit auch bei schwierigen Anrufern',
        'Verlässliche Termintreue',
        'Diskretion bei Personal- und Vertragsdaten',
        'Mitdenken über die eigene Aufgabe hinaus',
      ],
      certifications: [
        'Ausbildung Kaufmann/-frau für Büromanagement (IHK)',
        'Geprüfte/r Fachwirt/in für Büro- und Projektorganisation',
        'MS Office Specialist (Excel)',
        'Weiterbildung Buchhaltung oder Lohnabrechnung',
      ],
      cvFocus: [
        {
          label: 'Branche und Unternehmensgröße',
          detail:
            'Handwerksbetrieb, Kanzlei, Industrie oder öffentliche Verwaltung – der Alltag unterscheidet sich grundlegend.',
        },
        {
          label: 'Programme als eigener Block',
          detail: 'Eine kurze Liste mit Software und Niveau wird tatsächlich gelesen, ein Fließtext nicht.',
        },
        {
          label: 'Lückenlosigkeit',
          detail:
            'In kaufmännischen Verfahren wird der Verlauf genau geprüft. Erkläre Lücken kurz, statt sie offen zu lassen.',
        },
      ],
      coverLetterOpener:
        'In meiner jetzigen Position wickle ich rund 120 Kundenaufträge pro Woche in Sage 100 ab – von der Auftragserfassung über die Lieferterminverfolgung bis zur Rechnungsstellung.',
      mistakes: [
        {
          label: '„Allgemeine Bürotätigkeiten“',
          detail: 'Die häufigste Formulierung in diesem Berufsfeld – und die, die am wenigsten aussagt.',
        },
        {
          label: '„Gute MS-Office-Kenntnisse“',
          detail:
            'Das schreibt jeder. Nenne stattdessen, was du in Excel tatsächlich baust, und du unterscheidest dich sofort.',
        },
        {
          label: 'Ein Standardanschreiben ohne Bezug',
          detail:
            'Gerade bei vielen Mitbewerbern entscheidet der eine Satz, der zeigt, dass du die Anzeige gelesen hast.',
        },
      ],
      faq: [
        {
          question: 'Wie hebe ich mich bei vielen Mitbewerbern ab?',
          answer:
            'Durch Konkretheit: Volumen, Systeme und der genaue Aufgabenzuschnitt. Die meisten Bewerbungen in diesem Feld bleiben allgemein, deshalb wirken schon drei präzise Angaben überdurchschnittlich.',
        },
        {
          question: 'Wie erkläre ich einen Wiedereinstieg nach längerer Pause?',
          answer:
            'Offen und kurz im Anschreiben, ohne Rechtfertigung, mit einem Satz zur Aktualisierung deiner Kenntnisse — etwa ein Software- oder Buchhaltungskurs. Verschwiegene Lücken erzeugen mehr Rückfragen als benannte.',
        },
        {
          question: 'Ist eine Initiativbewerbung sinnvoll?',
          answer:
            'Ja, in kaufmännischen Bereichen überdurchschnittlich oft, weil viele Stellen intern oder über Empfehlung besetzt werden. Nenne den gewünschten Einsatzbereich konkret — eine Initiativbewerbung ohne Zielrichtung wird selten weitergeleitet.',
        },
      ],
    },
    interview: {
      slug: 'buerokaufmann',
      metaTitle: 'Vorstellungsgespräch Bürokaufmann/-frau: Fragen und Antworten',
      metaDescription:
        'Typische Fragen im Vorstellungsgespräch für kaufmännische Bürostellen – Organisation, Excel, Priorisierung – mit Antwortstruktur und Rückfragen.',
      heading: 'Vorstellungsgespräch als Bürokaufmann/-frau',
      intro:
        'Das Gespräch führen meist die direkte Führungskraft und jemand aus der Personalabteilung. Gefragt wird nach Selbstorganisation, Sorgfalt und Belastbarkeit an konkreten Beispielen; in vielen Verfahren gehört ein kurzer Excel- oder Rechtschreibtest dazu.',
      questions: [
        {
          question: 'Wie organisieren Sie sich, wenn mehrere Dinge gleichzeitig dringend sind?',
          why: 'Der Kern der Rolle. Geprüft wird ein nachvollziehbares Kriterium, nicht Belastbarkeit.',
          tip: 'Nach Frist und Auswirkung priorisieren, Rückmeldung geben, wenn etwas nicht geht – mit einem Beispiel.',
        },
        {
          question: 'Wie stellen Sie sicher, dass Ihnen keine Fehler unterlaufen?',
          why: 'Sorgfalt ist in der Sachbearbeitung das wichtigste Kriterium.',
          tip: 'Beschreibe deine Kontrollroutine: Vier-Augen-Prinzip, Checkliste, Abgleich vor dem Versand.',
        },
        {
          question: 'Welche Excel-Funktionen nutzen Sie regelmäßig?',
          why: 'Die am häufigsten überschätzte Kompetenz im Lebenslauf.',
          tip: 'Konkrete Funktionen nennen und beschreiben, wofür du sie einsetzt. Ehrlich bleiben – oft folgt ein Test.',
        },
        {
          question: 'Wie gehen Sie mit einem verärgerten Kunden am Telefon um?',
          why: 'Prüft Deeskalation und Verbindlichkeit.',
          tip: 'Ausreden lassen, Sachverhalt zusammenfassen, verbindlichen nächsten Schritt zusagen und einhalten.',
        },
        {
          question: 'Wie gehen Sie mit vertraulichen Unterlagen um?',
          why: 'Bürostellen berühren Personal-, Vertrags- und Gehaltsdaten.',
          tip: 'Konkrete Praxis nennen: Zugriffsrechte, verschlossene Ablage, keine Weitergabe ohne Freigabe.',
        },
        {
          question: 'Was tun Sie, wenn Ihre Führungskraft nicht erreichbar ist und eine Entscheidung ansteht?',
          why: 'Testet Eigenständigkeit und Augenmaß.',
          tip: 'Grenze benennen: Was entscheidest du selbst, wo holst du dir eine Freigabe, wie dokumentierst du es.',
        },
      ],
      redFlags: [
        'Excel-Kenntnisse angeben, die im Test nicht bestätigt werden.',
        'Auf Organisationsfragen nur „Ich bin sehr strukturiert“ antworten.',
        'Über frühere Vorgesetzte oder Kollegen negativ sprechen.',
      ],
      askThem: [
        'Wie ist die Aufgabe zwischen den Kollegen im Team aufgeteilt?',
        'Welche Systeme sind im Einsatz, und wie lange dauert die Einarbeitung?',
        'Was wären in den ersten drei Monaten die wichtigsten Aufgaben?',
      ],
      faq: [
        {
          question: 'Wird ein Test gemacht?',
          answer:
            'Häufig: ein kurzer Excel-Test, eine Rechtschreibprüfung oder eine Musterkorrespondenz. Sie dauern selten länger als 30 Minuten und prüfen Grundsicherheit, nicht Spezialwissen.',
        },
        {
          question: 'Darf ich nach Homeoffice und Arbeitszeit fragen?',
          answer:
            'Ja, im Verlauf des Gesprächs — es sind sachliche Rahmenfragen. Frag nach dem gelebten Modell im Team statt nach der Regelung auf dem Papier, dann bekommst du die brauchbarere Antwort.',
        },
      ],
    },
  },

  'customer-service-agent': {
    name: 'Kundenberater',
    application: {
      slug: 'kundenberater',
      metaTitle: 'Bewerbung im Kundenservice: Anschreiben, Lebenslauf & Kennzahlen',
      metaDescription:
        'Bewerbung als Kundenberater: welche Kennzahlen und Systeme überzeugen, was ins Anschreiben gehört, Beispiel-Einstieg und typische Fehler.',
      heading: 'Bewerbung als Kundenberater schreiben',
      intro:
        'Im Kundenservice entscheidet weniger der Werdegang als der Nachweis, dass du Gespräche unter Druck führen kannst. Wer Kanal, Volumen und Qualitätskennzahlen nennt, wird sofort eingeordnet – alle anderen landen im allgemeinen Stapel.',
      atsKeywords: [
        'Kundenbetreuung',
        'Kundenservice',
        'First-Level-Support',
        'Second-Level-Support',
        'Reklamationsbearbeitung',
        'Beschwerdemanagement',
        'CRM (Salesforce, Zendesk)',
        'Ticketsystem',
        'Inbound / Outbound',
        'Kundenzufriedenheit (CSAT)',
        'Erstlösungsquote',
        'Servicelevel',
      ],
      hardSkills: [
        {
          label: 'Kanal und Volumen',
          detail:
            'Telefon, E-Mail, Chat oder Social Media – und wie viele Vorgänge pro Tag. 80 Anrufe täglich ist ein anderer Beruf als 20 komplexe Fälle.',
        },
        {
          label: 'Servicekennzahlen',
          detail:
            'CSAT, Erstlösungsquote, durchschnittliche Bearbeitungszeit, Einhaltung des Servicelevels: die Sprache jeder Serviceleitung.',
        },
        {
          label: 'Systeme',
          detail: 'Zendesk, Freshdesk, Salesforce Service Cloud, SAP CS – namentlich nennen.',
        },
        {
          label: 'Fachliche Tiefe',
          detail:
            'Technischer Support, Versicherung, Energie, E-Commerce: Produktwissen entscheidet über Einarbeitungszeit und Gehalt.',
        },
      ],
      softSkills: [
        'Ruhe bei verärgerten Kunden',
        'Aktives Zuhören',
        'Verständlich erklären ohne Fachjargon',
        'Belastbarkeit bei hoher Taktung',
        'Verbindlichkeit bei Zusagen',
      ],
      certifications: [
        'Ausbildung Kaufmann/-frau für Dialogmarketing',
        'Zertifizierung im Beschwerdemanagement',
        'Salesforce Service Cloud Consultant',
        'Fremdsprachenzertifikate (z. B. B2/C1 Englisch)',
      ],
      cvFocus: [
        {
          label: 'Kennzahlen pro Station',
          detail: 'Kontakte pro Tag, CSAT, Erstlösungsquote – Serviceleitungen lesen zuerst danach.',
        },
        {
          label: 'Sprachen mit Niveau',
          detail:
            'Im internationalen Service ist jede zusätzliche Sprache ein direkter Gehaltsfaktor. Immer mit GER-Stufe angeben.',
        },
        {
          label: 'Schicht- und Wochenendbereitschaft',
          detail: 'Viele Servicebereiche arbeiten in Schichten. Wer das früh klärt, spart beiden Seiten Zeit.',
        },
      ],
      coverLetterOpener:
        'In der Energiebranche betreue ich täglich rund 60 Kundenkontakte in Telefon und Chat – bei einer Erstlösungsquote von 84 % und einem CSAT von 4,6 von 5.',
      mistakes: [
        {
          label: 'Nur „freundlich und kommunikativ“',
          detail: 'Das steht in praktisch jeder Servicebewerbung. Eine einzige Kennzahl schlägt jede Eigenschaft.',
        },
        {
          label: 'Keine Angabe zum Volumen',
          detail: 'Ohne Kontaktzahlen bleibt offen, ob du Hochlast gewohnt bist – die zentrale Frage im Service.',
        },
        {
          label: 'Beschwerdeerfahrung verschweigen',
          detail: 'Eskalationen zu beherrschen ist die wertvollste Fähigkeit im Kundenservice, nicht ein Makel.',
        },
      ],
      faq: [
        {
          question: 'Zählt Erfahrung aus Gastronomie oder Einzelhandel?',
          answer:
            'Ja, und sie wird häufig unterschätzt. Übersetze sie in Servicesprache: Kundenkontakte pro Schicht, Reklamationen, Umgang mit Beschwerden — dann ist sie unmittelbar anschlussfähig.',
        },
        {
          question: 'Wie gehe ich mit Homeoffice-Wünschen um?',
          answer:
            'Kundenservice ist einer der am häufigsten remote organisierten Bereiche, deshalb ist die Frage üblich. Stelle sie im Gespräch, nicht im Anschreiben, und frage nach dem tatsächlich gelebten Modell.',
        },
        {
          question: 'Sind Fremdsprachen wichtiger als Branchenerfahrung?',
          answer:
            'Im internationalen Service oft ja — eine zweite Sprache auf B2/C1 öffnet Stellen, die sonst verschlossen bleiben. Im technischen Support wiegt Produktwissen dagegen schwerer.',
        },
      ],
    },
    interview: {
      slug: 'kundenberater',
      metaTitle: 'Vorstellungsgespräch im Kundenservice: Fragen und Antworten',
      metaDescription:
        'Kundenservice-Interview: Fragen zu Eskalation, Belastung und Kennzahlen, oft mit Rollenspiel – was geprüft wird und wie du antwortest.',
      heading: 'Vorstellungsgespräch als Kundenberater',
      intro:
        'Serviceinterviews enthalten fast immer ein Rollenspiel: Du bekommst einen verärgerten Kunden simuliert und sollst das Gespräch führen. Bewertet wird nicht die Lösung, sondern ob du zuerst zuhörst und dann eine verbindliche Zusage machst.',
      questions: [
        {
          question: 'Ein Kunde ist wütend und im Recht. Wie reagieren Sie?',
          why: 'Die Kernsituation des Berufs.',
          tip: 'Ausreden lassen, Fehler anerkennen, Lösung anbieten, Termin zusagen, nachfassen. Keine Rechtfertigung des Unternehmens.',
        },
        {
          question: 'Ein Kunde verlangt etwas, das Sie nicht geben dürfen. Was tun Sie?',
          why: 'Prüft, ob du Grenzen freundlich halten kannst.',
          tip: 'Nein zur Forderung, Ja zum Anliegen: erklären, was möglich ist, und die Alternative konkret anbieten.',
        },
        {
          question: 'Wie gehen Sie mit hoher Gesprächslast um?',
          why: 'Fluktuation im Service ist hoch; Arbeitgeber wollen realistische Selbsteinschätzung.',
          tip: 'Ehrlich beschreiben, wie du dich zwischen Gesprächen zurücksetzt, und welche Taktung du kennst.',
        },
        {
          question: 'Was war Ihre schwierigste Eskalation?',
          why: 'Prüft echte Erfahrung statt Theorie.',
          tip: 'Situation, deine Schritte, Ergebnis, was du seitdem anders machst.',
        },
        {
          question: 'Wie erklären Sie etwas Kompliziertes einem ungeduldigen Kunden?',
          why: 'Verständlichkeit ist die eigentliche Fachkompetenz im Service.',
          tip: 'Kurz, ohne Fachbegriffe, mit Rückfrage, ob es angekommen ist.',
        },
        {
          question: 'Woran messen Sie einen guten Servicetag?',
          why: 'Zeigt, ob du kennzahlenbewusst arbeitest.',
          tip: 'Eine Qualitäts- und eine Mengenkennzahl nennen – und warum beide zusammengehören.',
        },
      ],
      redFlags: [
        'Im Rollenspiel sofort eine Lösung anbieten, ohne zugehört zu haben.',
        'Über schwierige Kunden abfällig sprechen.',
        'Zusagen machen, die man nicht halten kann.',
      ],
      askThem: [
        'Wie viele Kontakte übernimmt ein Berater hier pro Tag?',
        'Wie lang ist die Einarbeitung, und wie wird Produktwissen aufgebaut?',
        'Woran wird Leistung gemessen – Menge, Qualität oder beides?',
      ],
      faq: [
        {
          question: 'Wie läuft das Rollenspiel ab?',
          answer:
            'Meist fünf bis zehn Minuten mit einem simulierten Beschwerdefall. Bewertet werden Zuhören, Zusammenfassen und eine verbindliche Zusage — nicht, ob du die inhaltlich richtige Lösung kennst.',
        },
        {
          question: 'Soll ich nach Schichtzuschlägen fragen?',
          answer:
            'Ja, das ist im Service völlig üblich und wird sachlich beantwortet. Frag zusammen mit der Schichtplanung, dann bekommst du beides in einem Zug geklärt.',
        },
      ],
    },
  },

  electrician: {
    name: 'Elektroniker',
    application: {
      slug: 'elektroniker',
      metaTitle: 'Bewerbung als Elektroniker: Anschreiben, Lebenslauf & Nachweise',
      metaDescription:
        'Bewerbung als Elektroniker oder Elektriker: welche Nachweise zählen, welche Fachrichtung genannt werden muss, Beispiel-Einstieg und typische Fehler.',
      heading: 'Bewerbung als Elektroniker schreiben',
      intro:
        'Im Elektrohandwerk werden Bewerbungen kurz gelesen und schnell entschieden. Fachrichtung, Führerschein und gültige Nachweise stehen im Vordergrund – ein langes Anschreiben ersetzt kein fehlendes Zertifikat.',
      atsKeywords: [
        'Elektroniker',
        'Energie- und Gebäudetechnik',
        'Betriebstechnik',
        'Automatisierungstechnik',
        'Schaltschrankbau',
        'SPS-Programmierung (Siemens S7)',
        'DGUV V3 Prüfung',
        'VDE 0100',
        'Störungsbeseitigung',
        'Instandhaltung',
        'Messtechnik',
        'Photovoltaik',
      ],
      hardSkills: [
        {
          label: 'Fachrichtung genau benennen',
          detail:
            'Energie- und Gebäudetechnik, Betriebstechnik, Automatisierungstechnik oder Geräte und Systeme – das ist das erste Filterkriterium.',
        },
        {
          label: 'Prüf- und Schaltberechtigungen',
          detail:
            'DGUV V3, Schaltberechtigung bis 30 kV, Arbeiten unter Spannung: Berechtigungen entscheiden über Einsetzbarkeit und Gehalt.',
        },
        {
          label: 'Steuerungstechnik',
          detail:
            'SPS-Kenntnisse, insbesondere Siemens S7/TIA Portal, sind in der Industrie der größte Unterschied im Stundenlohn.',
        },
        {
          label: 'Führerschein und Reisebereitschaft',
          detail:
            'Bei Montage und Service ist Klasse B praktisch Voraussetzung. Fehlt die Angabe, wird sie als „nicht vorhanden“ gelesen.',
        },
      ],
      softSkills: [
        'Sicherheitsbewusstsein ohne Abkürzungen',
        'Selbstständiges Arbeiten auf der Baustelle',
        'Kundenumgang beim Einsatz vor Ort',
        'Sauberes Dokumentieren von Prüfungen',
        'Zuverlässigkeit im Team',
      ],
      certifications: [
        'Gesellenbrief Elektroniker (Fachrichtung)',
        'Befähigte Person zur Prüfung ortsveränderlicher Geräte (DGUV V3)',
        'Schaltberechtigung Mittelspannung',
        'SPS-Lehrgang Siemens TIA Portal',
      ],
      cvFocus: [
        {
          label: 'Einsatzbereich',
          detail:
            'Neubau, Sanierung, Industrieinstandhaltung oder Service beim Kunden – der Alltag unterscheidet sich vollständig.',
        },
        {
          label: 'Anlagen und Hersteller',
          detail: 'Konkrete Anlagentypen und Steuerungen nennen; Betriebe suchen genau danach.',
        },
        {
          label: 'Nachweise anhängen',
          detail: 'Gesellenbrief und gültige Berechtigungen als Anlage – ohne sie ist ein Einsatz nicht planbar.',
        },
      ],
      coverLetterOpener:
        'Seit sechs Jahren arbeite ich in der Instandhaltung eines Lebensmittelbetriebs mit Drei-Schicht-Produktion: Störungsbeseitigung an S7-gesteuerten Abfüllanlagen, DGUV-V3-Prüfungen und Schaltschrankumbauten.',
      mistakes: [
        {
          label: 'Nur „Elektriker“ schreiben',
          detail: 'Ohne Fachrichtung kann ein Betrieb nicht einschätzen, ob du auf die Stelle passt.',
        },
        {
          label: 'Berechtigungen weglassen',
          detail:
            'Sie sind der wichtigste Inhalt der Bewerbung und entscheiden direkt über die Einstufung im Betrieb.',
        },
        {
          label: 'Ein zu langes Anschreiben',
          detail:
            'Im Handwerk wird kurz gelesen. Eine halbe Seite mit Fachrichtung, Erfahrung und Verfügbarkeit reicht völlig.',
        },
      ],
      faq: [
        {
          question: 'Ist ein Anschreiben im Handwerk überhaupt nötig?',
          answer:
            'Eine kurze Fassung ja — sie beantwortet, warum dieser Betrieb und ab wann du kannst. Viele Betriebe entscheiden nach Lebenslauf und Nachweisen, aber eine Bewerbung ganz ohne Anschreiben wirkt beliebig.',
        },
        {
          question: 'Wie bewerbe ich mich ohne abgeschlossene Ausbildung?',
          answer:
            'Als Helfer mit klarer Angabe deiner Erfahrung und deines Ziels, die Ausbildung nachzuholen. Viele Betriebe qualifizieren nach, wenn Zuverlässigkeit und Sicherheitsbewusstsein erkennbar sind — nenne dafür konkrete Tätigkeiten.',
        },
        {
          question: 'Wie wichtig ist der Meistertitel?',
          answer:
            'Für Führung, Verantwortung für Prüfungen und die Selbstständigkeit ist er entscheidend. Für Fach- und Montagestellen zählen Berechtigungen und Anlagenerfahrung mehr.',
        },
      ],
    },
    interview: {
      slug: 'elektroniker',
      metaTitle: 'Vorstellungsgespräch als Elektroniker: Fragen und Antworten',
      metaDescription:
        'Fragen im Vorstellungsgespräch im Elektrohandwerk: Sicherheit, Störungssuche, Berechtigungen – was geprüft wird und was du fragen solltest.',
      heading: 'Vorstellungsgespräch als Elektroniker',
      intro:
        'Das Gespräch führt meist der Betriebs- oder Meister direkt, oft kurz und praxisnah. Gefragt wird nach Anlagen, die du kennst, nach deinem Vorgehen bei Störungen und vor allem nach deinem Umgang mit Sicherheitsregeln.',
      questions: [
        {
          question: 'Wie gehen Sie bei einer unbekannten Störung vor?',
          why: 'Die Kernfrage. Geprüft wird systematische Eingrenzung statt Ausprobieren.',
          tip: 'Fehlerbild aufnehmen, Anlage sicher schalten, eingrenzen von Versorgung bis Aktor, messen statt vermuten, dokumentieren.',
        },
        {
          question: 'Welche Berechtigungen und Prüfungen haben Sie?',
          why: 'Entscheidet direkt über Einsatzplanung und Einstufung.',
          tip: 'Alle gültigen Nachweise mit Datum nennen und die Unterlagen mitbringen.',
        },
        {
          question: 'Was tun Sie, wenn Sie unter Zeitdruck eine Sicherheitsregel abkürzen sollen?',
          why: 'Die wichtigste Haltungsfrage im Elektrohandwerk.',
          tip: 'Klar bleiben: die fünf Sicherheitsregeln werden nicht verhandelt. Alternative anbieten statt nur ablehnen.',
        },
        {
          question: 'Mit welchen Steuerungen haben Sie gearbeitet?',
          why: 'Klärt Einarbeitungsaufwand in der Industrie.',
          tip: 'Hersteller, Baureihe und was du daran konkret gemacht hast – lesen, ändern, programmieren.',
        },
        {
          question: 'Wie gehen Sie mit Kunden vor Ort um?',
          why: 'Im Service ist der Elektroniker das Gesicht des Betriebs.',
          tip: 'Beispiel nennen: erklären, was du tust, Termin einhalten, Arbeitsplatz sauber hinterlassen.',
        },
        {
          question: 'Wie dokumentieren Sie Ihre Arbeit?',
          why: 'Prüfprotokolle und Nachweise sind rechtlich relevant.',
          tip: 'Konkret beschreiben, was du protokollierst und in welchem System.',
        },
      ],
      redFlags: [
        'Andeuten, dass Sicherheitsregeln unter Zeitdruck verhandelbar sind.',
        'Berechtigungen behaupten, deren Nachweis fehlt.',
        'Keine Frage zur Einsatzplanung oder zum Bereitschaftsdienst stellen.',
      ],
      askThem: [
        'Wie ist der Einsatz aufgeteilt – Baustelle, Werkstatt oder Service beim Kunden?',
        'Gibt es Bereitschaftsdienste, und wie werden sie vergütet?',
        'Welche Weiterbildungen unterstützt der Betrieb?',
      ],
      faq: [
        {
          question: 'Muss ich meine Zeugnisse mitbringen?',
          answer:
            'Ja — Gesellenbrief, Berechtigungen und Prüfnachweise im Original oder als Kopie. Viele Betriebe entscheiden direkt im Gespräch, und fehlende Nachweise verschieben die Zusage.',
        },
        {
          question: 'Wird ein praktischer Test gemacht?',
          answer:
            'In manchen Betrieben ja, meist kurz in der Werkstatt: eine Messung, ein Schaltplan, eine kleine Fehlersuche. Es geht um Grundsicherheit und Vorgehen, nicht um Geschwindigkeit.',
        },
      ],
    },
  },

  'warehouse-logistics': {
    name: 'Fachkraft für Lagerlogistik',
    application: {
      slug: 'fachkraft-lagerlogistik',
      metaTitle: 'Bewerbung in der Lagerlogistik: Anschreiben, Lebenslauf & Scheine',
      metaDescription:
        'Bewerbung als Fachkraft für Lagerlogistik: welche Scheine und Systeme zählen, was ins Anschreiben gehört, Beispiel-Einstieg und typische Fehler.',
      heading: 'Bewerbung als Fachkraft für Lagerlogistik schreiben',
      intro:
        'In der Logistik wird schnell entschieden, oft innerhalb weniger Tage. Staplerschein, Schichtbereitschaft und das genutzte Lagerverwaltungssystem sind die drei Angaben, nach denen zuerst gesucht wird.',
      atsKeywords: [
        'Lagerlogistik',
        'Kommissionierung',
        'Wareneingang',
        'Warenausgang',
        'Inventur',
        'Staplerschein',
        'Flurförderzeuge',
        'Lagerverwaltungssystem (LVS)',
        'SAP EWM / WM',
        'Versandabwicklung',
        'Gefahrgut',
        'Bestandsführung',
      ],
      hardSkills: [
        {
          label: 'Scheine und Berechtigungen',
          detail:
            'Staplerschein, Kranschein, Gefahrgut nach ADR – mit Gültigkeitsdatum. Ohne sie ist ein Einsatz nicht planbar.',
        },
        {
          label: 'Lagerverwaltungssystem',
          detail:
            'SAP EWM/WM, Jungheinrich WMS, MDE-Geräte, Pick-by-Voice: die Systemkenntnis bestimmt die Einarbeitungszeit.',
        },
        {
          label: 'Bereich im Lager',
          detail:
            'Wareneingang, Kommissionierung, Versand oder Bestandsführung sind eigenständige Profile mit eigenen Anforderungen.',
        },
        {
          label: 'Leistungszahlen',
          detail: 'Positionen pro Stunde, Fehlerquote, Sendungen pro Schicht – die Kennzahlen der Logistik.',
        },
      ],
      softSkills: [
        'Körperliche Belastbarkeit im Schichtbetrieb',
        'Sorgfalt bei hohem Durchsatz',
        'Teamarbeit unter Zeitdruck',
        'Zuverlässigkeit und Pünktlichkeit',
        'Aufmerksamkeit für Arbeitssicherheit',
      ],
      certifications: [
        'Ausbildung Fachkraft für Lagerlogistik (IHK)',
        'Staplerschein (Flurförderzeuge, DGUV 68)',
        'Gefahrgutbeauftragter / ADR-Schein',
        'Ladungssicherung nach VDI 2700',
      ],
      cvFocus: [
        {
          label: 'Lagertyp und Größe',
          detail:
            'Hochregallager, Kühllager, E-Commerce-Fulfillment oder Ersatzteillager – Anforderungen und Takt unterscheiden sich stark.',
        },
        {
          label: 'Schichtmodell',
          detail: 'Zwei- oder Dreischicht, Nachtschicht, Wochenende: das ist häufig das entscheidende Kriterium.',
        },
        {
          label: 'Scheine sichtbar platzieren',
          detail: 'Ein eigener Block ganz oben – nicht versteckt zwischen den Stationen.',
        },
      ],
      coverLetterOpener:
        'Seit vier Jahren arbeite ich im Dreischichtbetrieb eines Distributionszentrums mit rund 12.000 Palettenstellplätzen – Kommissionierung per MDE in SAP EWM, Staplerschein seit 2019, zusätzlich Ladungssicherung nach VDI 2700.',
      mistakes: [
        {
          label: 'Scheine erst im Anhang erwähnen',
          detail: 'Sie sind das wichtigste Auswahlkriterium und gehören auf die erste Seite.',
        },
        {
          label: 'Schichtbereitschaft offen lassen',
          detail:
            'Fehlt die Angabe, wird oft Nichtverfügbarkeit angenommen und die Bewerbung sortiert sich selbst aus.',
        },
        {
          label: 'Alles unter „Lagerarbeit“ zusammenfassen',
          detail:
            'Wareneingang und Versand sind verschiedene Aufgaben mit verschiedenen Kennzahlen – differenziere.',
        },
      ],
      faq: [
        {
          question: 'Kann ich mich ohne Staplerschein bewerben?',
          answer:
            'Ja, viele Betriebe finanzieren ihn — schreib dann ausdrücklich, dass du bereit bist, ihn zu machen. Bei Stellen, in denen der Stapler den Kern der Tätigkeit bildet, ist er faktisch Voraussetzung.',
        },
        {
          question: 'Wie wichtig sind Deutschkenntnisse?',
          answer:
            'Für Sicherheitsunterweisungen und Systemarbeit wird meist mindestens B1 erwartet. Gib dein Niveau offen an — viele Logistikbetriebe arbeiten international und bewerten Verlässlichkeit höher als perfekte Sprache.',
        },
        {
          question: 'Lohnt sich der Wechsel von Zeitarbeit in die Festanstellung?',
          answer:
            'In der Logistik ist das der übliche Weg, und Zeitarbeitserfahrung ist kein Nachteil. Führe die Einsatzbetriebe konkret auf — sie belegen genau die Systeme und Lagertypen, nach denen gesucht wird.',
        },
      ],
    },
    interview: {
      slug: 'fachkraft-lagerlogistik',
      metaTitle: 'Vorstellungsgespräch Lagerlogistik: Fragen und Antworten',
      metaDescription:
        'Fragen im Logistik-Vorstellungsgespräch: Schicht, Genauigkeit, Sicherheit und Systeme – was geprüft wird und was du fragen solltest.',
      heading: 'Vorstellungsgespräch in der Lagerlogistik',
      intro:
        'Das Gespräch ist meist kurz und praktisch, geführt von der Schicht- oder Lagerleitung. Häufig folgt eine Führung durch das Lager – die ist Teil der Bewertung, denn dabei wird beobachtet, worauf du achtest und was du fragst.',
      questions: [
        {
          question: 'Welche Schichten können Sie übernehmen?',
          why: 'Die praktisch wichtigste Frage; sie entscheidet häufig allein über die Zusage.',
          tip: 'Klar und ehrlich antworten. Einschränkungen jetzt zu nennen ist besser als eine Absage nach zwei Wochen.',
        },
        {
          question: 'Wie stellen Sie sicher, dass Sie fehlerfrei kommissionieren?',
          why: 'Fehlerquote ist die zentrale Qualitätskennzahl im Lager.',
          tip: 'Konkrete Routine nennen: Scannen statt Sichtprüfung, Kontrolle am Packplatz, bei Unklarheit nachfragen.',
        },
        {
          question: 'Was tun Sie, wenn ein Bestand nicht stimmt?',
          why: 'Prüft, ob du meldest oder stillschweigend korrigierst.',
          tip: 'Nachzählen, melden, Korrektur im System dokumentieren – nie ohne Buchung ausgleichen.',
        },
        {
          question: 'Welche Systeme und Geräte kennen Sie?',
          why: 'Bestimmt die Einarbeitungszeit.',
          tip: 'System, Gerät und Aufgabe nennen – etwa Kommissionierung per MDE in SAP EWM.',
        },
        {
          question: 'Wie gehen Sie mit Zeitdruck vor Versandschluss um?',
          why: 'Der tägliche Belastungsmoment im Lager.',
          tip: 'Priorisieren, früh Bescheid geben, wenn es eng wird – und Sicherheit nicht abkürzen.',
        },
        {
          question: 'Worauf achten Sie bei der Arbeitssicherheit?',
          why: 'Unfälle sind in der Logistik der größte Kostenfaktor.',
          tip: 'Konkrete Punkte nennen: Verkehrswege, Ladungssicherung, Sicht beim Rangieren, Schutzausrüstung.',
        },
      ],
      redFlags: [
        'Schichtbereitschaft zusagen, die man nicht halten kann.',
        'Bestandsabweichungen als Kleinigkeit darstellen.',
        'Bei der Lagerführung desinteressiert wirken.',
      ],
      askThem: [
        'Wie ist das Schichtmodell, und wie werden Zuschläge berechnet?',
        'Welche Kennzahlen werden pro Mitarbeiter gemessen?',
        'Wie läuft die Einarbeitung, und wer begleitet sie?',
      ],
      faq: [
        {
          question: 'Wird der Staplerschein im Gespräch geprüft?',
          answer:
            'Der Nachweis wird kontrolliert, und in manchen Betrieben folgt eine kurze praktische Fahrprobe. Bring den Schein immer mit — ohne Nachweis darfst du nicht fahren, unabhängig von deiner Erfahrung.',
        },
        {
          question: 'Wie erkläre ich häufige Wechsel in der Zeitarbeit?',
          answer:
            'Ganz sachlich: Einsätze werden vom Verleiher gesteuert, nicht von dir. Nenne die Einsatzbetriebe und was du dort gemacht hast — das wird als Erfahrungsbreite gelesen, nicht als Unbeständigkeit.',
        },
      ],
    },
  },
};
