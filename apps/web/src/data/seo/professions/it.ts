import type { ProfessionCatalog } from '../types';

/**
 * Italian profession content — adapted to Italian hiring conventions
 * (lettera di presentazione, iscrizione agli albi professionali, OIC,
 * patentini e abilitazioni, concorsi e graduatorie scolastiche).
 */
export const professionsIt: ProfessionCatalog = {
  'software-developer': {
    name: 'Sviluppatore software',
    application: {
      slug: 'sviluppatore-software',
      metaTitle: 'Candidatura da sviluppatore: lettera di presentazione e CV',
      metaDescription:
        'Cosa serve in una candidatura da sviluppatore: parole chiave ATS, competenze, certificazioni, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da sviluppatore software',
      intro:
        'Nelle posizioni di sviluppo la lettera raramente decide da sola: recruiter e sistemi di selezione cercano prima lo stack, la dimensione dei progetti e l’impatto misurabile. Elencare tecnologie ti mette accanto a centinaia di profili identici; dire cosa hai preso in carico e cosa è cambiato, no.',
      atsKeywords: [
        'Sviluppo software',
        'TypeScript',
        'Java',
        'Python',
        'API REST',
        'Microservizi',
        'CI/CD',
        'Docker',
        'Kubernetes',
        'Git',
        'Code review',
        'Agile / Scrum',
        'Test unitari',
        'Cloud (AWS/Azure)',
      ],
      hardSkills: [
        {
          label: 'Uno stack scritto come nell’annuncio',
          detail:
            'Linguaggio, framework, database e cloud, scritti esattamente come compaiono nell’offerta: «TypeScript» e «JavaScript» sono due parole diverse per un parser.',
        },
        {
          label: 'Progettazione di sistemi',
          detail:
            'Oltre i tre anni di esperienza ci si aspetta che tu progetti interfacce e sappia difendere le scelte, non solo che chiuda ticket.',
        },
        {
          label: 'Pratica di test e rilascio',
          detail:
            'Test unitari e di integrazione, pipeline, code review: la parte del tuo lavoro che dimostra se il codice sarà ancora manutenibile fra sei mesi.',
        },
        {
          label: 'Impatto misurabile',
          detail:
            'Tempo di caricamento dimezzato, meno errori, rilasci passati da settimanali a giornalieri. Un numero preso dal tuo lavoro vale più di qualsiasi aggettivo.',
        },
      ],
      softSkills: [
        'Spiegare scelte tecniche a interlocutori non tecnici',
        'Dare feedback utile in code review',
        'Autonomia in team distribuiti',
        'Stabilire priorità sotto scadenza',
        'Disponibilità a leggere codice altrui',
      ],
      certifications: [
        'AWS Certified Developer – Associate',
        'Microsoft Certified: Azure Developer Associate',
        'Certified Kubernetes Application Developer (CKAD)',
        'Professional Scrum Developer (PSD I)',
      ],
      cvFocus: [
        {
          label: 'Progetti, non elenchi di mansioni',
          detail:
            'Due o tre progetti per ruolo, con il contesto: dimensione del team, il tuo ruolo, tecnologie, risultato.',
        },
        {
          label: 'Un profilo GitHub presentabile',
          detail:
            'Un repository curato con un README vero sostituisce un paragrafo di autodescrizione. Un profilo abbandonato costa più che nessun link.',
        },
        {
          label: 'Competenze raggruppate per livello',
          detail:
            'Separa ciò che usi ogni giorno da ciò che hai provato una volta: il colloquio tecnico andrà esattamente su quel confine.',
        },
      ],
      coverLetterOpener:
        'Il vostro annuncio parla della scomposizione di un monolite in servizi: è esattamente ciò che ho guidato in [Azienda] per un team di otto persone, portando la frequenza di rilascio da settimanale a giornaliera.',
      mistakes: [
        {
          label: 'Una lettera che ripete lo stack',
          detail:
            'Il CV lo elenca già. La lettera deve spiegare perché proprio quel prodotto, in un modo che nessun altro candidato possa copiare.',
        },
        {
          label: 'Affermare la seniority invece di dimostrarla',
          detail:
            '«Senior» non convince nessuno. Guidare una migrazione, tenere il processo di review, inserire i nuovi colleghi sì.',
        },
        {
          label: 'Mandare ovunque la stessa candidatura',
          detail:
            'Senza riferimenti al prodotto il profilo è intercambiabile. Una sola frase concreta sul loro dominio ti toglie dalla pila.',
        },
      ],
      faq: [
        {
          question: 'La lettera di presentazione serve ancora?',
          answer:
            'In Italia, nelle società di consulenza e nelle aziende strutturate, sì. In prodotto e nelle startup basta spesso il CV con il profilo GitHub. Mezza pagina è l’equilibrio: se manca, la candidatura sembra incompleta; se è più lunga, non viene letta.',
        },
        {
          question: 'Le certificazioni contano quanto i progetti?',
          answer:
            'I progetti vincono quasi sempre. Le certificazioni cloud servono soprattutto per entrare in un ambiente in cui non hai ancora produzione da mostrare: aprono la prima porta, non sostituiscono le referenze.',
        },
        {
          question: 'Devo mettere la fotografia sul CV?',
          answer:
            'Resta diffusa in Italia ma non è mai obbligatoria e nel settore tecnologico la sua assenza non penalizza. Se invii il CV all’estero è preferibile ometterla.',
        },
      ],
    },
    interview: {
      slug: 'sviluppatore-software',
      metaTitle: 'Colloquio da sviluppatore: domande frequenti e risposte',
      metaDescription:
        'Le domande più comuni nel colloquio da sviluppatore, cosa valutano davvero, come strutturare la risposta e gli errori che costano il posto.',
      heading: 'Colloquio di lavoro da sviluppatore software',
      intro:
        'Un processo di selezione per sviluppatori ha in genere tre parti: motivazione, profondità tecnica e una prova di codice dal vivo o da svolgere a casa. Raramente si fallisce sull’esercizio: si fallisce risolvendolo in silenzio, quando è il ragionamento a essere valutato.',
      questions: [
        {
          question: 'Raccontami un problema tecnico difficile che hai risolto.',
          why: 'Si valuta se sai circoscrivere un problema e se hai capito la causa reale o hai solo cambiato cose finché ha funzionato.',
          tip: 'Quattro passaggi: il sintomo, come hai ristretto il campo, la causa reale, cosa hai cambiato perché non si ripresentasse.',
        },
        {
          question: 'Perché hai scelto quell’architettura?',
          why: 'Non esiste una risposta giusta: vogliono sapere se conosci le alternative e se sai nominarne gli svantaggi.',
          tip: 'Cita l’opzione scartata e il motivo. Chi non trova alcun difetto nella propria soluzione non l’ha messa alla prova.',
        },
        {
          question: 'Come ti assicuri che il tuo codice resti manutenibile?',
          why: 'Verifica se pensi oltre il merge: test, review, documentazione, nomi.',
          tip: 'Descrivi cosa faceva davvero il tuo ultimo team, non principi da manuale.',
        },
        {
          question: 'Come affronti codice che non hai scritto tu?',
          why: 'Il quotidiano è codice ereditato. Vogliono sapere se lo tocchi con cautela o se proponi di riscriverlo.',
          tip: 'Descrivi la rete di sicurezza che costruisci prima: aggiungere test, passi piccoli, rilasciare presto.',
        },
        {
          question: 'Raccontami un disaccordo in una code review.',
          why: 'Domanda comportamentale: sai sostenere una posizione tecnica senza rovinare il rapporto di lavoro?',
          tip: 'Chiudi con il risultato e con quello che ne hai tratto, anche quando sei stato tu a cedere.',
        },
        {
          question: 'Cosa fai quando una stima non è più sostenibile?',
          why: 'Riguarda la comunicazione con il prodotto e gli stakeholder, non la tecnica.',
          tip: 'Segnalare presto e proporre opzioni — perimetro, data, qualità — invece di trasmettere solo il problema.',
        },
      ],
      redFlags: [
        'Programmare in silenzio durante la prova: ciò che viene valutato è il ragionamento.',
        'Parlare male di team o codebase precedenti.',
        'Rispondere «sì» in modo vago a «conosci X?» invece di collocare onestamente il proprio livello.',
      ],
      askThem: [
        'Com’è il percorso dal merge alla produzione e quanto dura?',
        'Quanta parte di uno sprint va al debito tecnico?',
        'Chi decide cosa si costruisce e che ruolo hanno gli sviluppatori?',
      ],
      faq: [
        {
          question: 'Come mi preparo alla prova di codice?',
          answer:
            'Allenati a pensare ad alta voce, non solo a risolvere. Prendi un esercizio di media difficoltà e commenta ogni passaggio come se qualcuno fosse seduto accanto a te: è quella verbalizzazione a essere valutata in quasi tutti i processi.',
        },
        {
          question: 'Posso usare strumenti di IA in una prova da svolgere a casa?',
          answer:
            'Chiedilo. Molte aziende ormai lo consentono esplicitamente e poi discutono le tue scelte in fase di revisione. Usarla di nascosto e non saper spiegare il risultato è lo scenario peggiore.',
        },
      ],
    },
  },

  nurse: {
    name: 'Infermiere',
    application: {
      slug: 'infermiere',
      metaTitle: 'Candidatura da infermiere: lettera, CV e documentazione',
      metaDescription:
        'Candidatura in ambito infermieristico: quale documentazione serve, quale area indicare, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da infermiere',
      intro:
        'In ambito infermieristico il mercato gioca a tuo favore, ma la candidatura decide ancora in quale reparto entri e a quali condizioni. Documentazione completa e un’area chiaramente indicata pesano qui più di qualsiasi costruzione stilistica.',
      atsKeywords: [
        'Assistenza infermieristica',
        'Piano assistenziale',
        'Somministrazione della terapia',
        'Gestione delle lesioni cutanee',
        'Terapia intensiva',
        'Pronto soccorso',
        'Cure palliative',
        'Cartella clinica informatizzata',
        'Controllo delle infezioni',
        'Documentazione infermieristica',
        'Triage',
        'Tutoraggio degli studenti',
      ],
      hardSkills: [
        {
          label: 'Laurea e iscrizione all’Ordine',
          detail:
            'La laurea in Infermieristica e il numero di iscrizione all’OPI vengono verificati prima di tutto il resto.',
        },
        {
          label: 'L’area, non «infermieristica»',
          detail:
            'Terapia intensiva, pronto soccorso, sala operatoria, oncologia, geriatria o territorio: è il primo filtro applicato al tuo profilo.',
        },
        {
          label: 'Cartella clinica informatizzata',
          detail:
            'Indica il sistema che hai usato: riduce direttamente il tempo di inserimento in reparto.',
        },
        {
          label: 'Formazione specialistica',
          detail:
            'Master di primo livello in area critica, wound care o cure palliative: determinano ruolo e inquadramento.',
        },
      ],
      softSkills: [
        'Resistenza al lavoro su turni',
        'Comunicazione con i familiari in situazioni critiche',
        'Collaborazione con l’équipe medica e riabilitativa',
        'Lucidità di fronte a un peggioramento clinico',
        'Empatia senza logoramento personale',
      ],
      certifications: [
        'Laurea in Infermieristica e iscrizione all’OPI',
        'Master di primo livello in area critica',
        'Master in wound care',
        'Certificazione BLSD e ACLS',
      ],
      cvFocus: [
        {
          label: 'Tipo di struttura e dimensione del reparto',
          detail:
            'Azienda ospedaliera universitaria, ospedale di zona, RSA, territorio — e il numero di posti letto. Dice più di qualsiasi elenco di mansioni.',
        },
        {
          label: 'Documentazione completa',
          detail:
            'Titolo di studio, iscrizione all’Ordine, vaccinazioni e attestati di formazione. È la prima causa di pratiche ferme.',
        },
        {
          label: 'Disponibilità e orario',
          detail: 'Orario desiderato, disponibilità a notti e festivi e data di ingresso, in prima pagina.',
        },
      ],
      coverLetterOpener:
        'Dopo quattro anni in una terapia intensiva polivalente da dodici posti letto desidero entrare in un’équipe di cure palliative: l’area che ho conosciuto durante il master e che voglio esercitare a tempo pieno.',
      mistakes: [
        {
          label: 'Promettere di inviare i documenti più tardi',
          detail:
            'Senza titolo verificabile l’assunzione non si può formalizzare. Le pratiche incomplete restano da parte invece di essere respinte.',
        },
        {
          label: 'Lasciare l’area indefinita',
          detail: '«Sono flessibile» si legge come «non so cosa voglio» e finisce in lista d’attesa.',
        },
        {
          label: 'Scrivere solo del carico di lavoro',
          detail:
            'Ogni struttura lo conosce. Spiegare a quali condizioni resteresti trasmette criterio, non esaurimento.',
        },
      ],
      faq: [
        {
          question: 'Come mi candido con un titolo conseguito all’estero?',
          answer:
            'Allega il decreto di riconoscimento del Ministero della Salute o, se la pratica è in corso, la ricevuta con lo stato del procedimento. Molte strutture assumono prima della decisione finale, ma vogliono lo stato per iscritto.',
        },
        {
          question: 'Devo indicare il numero di iscrizione all’Ordine?',
          answer:
            'Sì: l’iscrizione all’OPI è obbligatoria per esercitare ed è un dato verificabile che ci si aspetta di trovare. Ometterlo aggiunge solo uno scambio di email prima che qualcuno possa istruire la pratica.',
        },
        {
          question: 'Conviene indicare le aspettative retributive?',
          answer:
            'Nel servizio pubblico non serve, perché si applica il contratto collettivo: indica con precisione anzianità e formazione specialistica. Nel privato e nelle cooperative è invece attesa una forbice.',
        },
      ],
    },
    interview: {
      slug: 'infermiere',
      metaTitle: 'Colloquio da infermiere: domande frequenti e risposte',
      metaDescription:
        'Domande frequenti nel colloquio infermieristico, cosa valutano, come rispondere e cosa chiedere al coordinatore di reparto.',
      heading: 'Colloquio di lavoro da infermiere',
      intro:
        'Il colloquio è di norma condotto dal coordinatore infermieristico, a volte con un infermiere di riferimento. Si valutano meno le conoscenze e più gli atteggiamenti: come stabilisci le priorità sotto carico, come parli con i familiari e se ti inserirai nell’équipe del turno.',
      questions: [
        {
          question: 'Come stabilisce le priorità quando non riesce a seguire tutti i pazienti?',
          why: 'La domanda centrale della professione. Si cerca capacità di triage, non resistenza.',
          tip: 'Descrivi il tuo ordine di valutazione, quando allerti e come documenti, non che «ce la fai sempre».',
        },
        {
          question: 'Mi racconti un colloquio difficile con dei familiari.',
          why: 'I conflitti con i familiari logorano i reparti. Si ascolta la capacità di ridurre la tensione.',
          tip: 'Ascoltare, spiegare il quadro clinico, porre un limite, indirizzare — in quest’ordine.',
        },
        {
          question: 'Cosa fa se commette un errore?',
          why: 'Cultura della sicurezza: una struttura che lo chiede apertamente vuole sentire che lo segnali.',
          tip: 'Mettere in sicurezza il paziente, segnalare subito, documentare, effettuare la segnalazione dell’evento avverso. Un caso reale pesa più di un’intenzione.',
        },
        {
          question: 'Perché lascia il posto attuale?',
          why: 'Si verifica se stai scappando da qualcosa o andando verso qualcosa.',
          tip: 'Di’ cosa cerchi — area, formazione, affidabilità dei turni — non cosa ha sbagliato il datore precedente.',
        },
        {
          question: 'Come affronta notti e festivi?',
          why: 'Pura organizzazione: una risposta onesta evita un periodo di prova fallito.',
          tip: 'Di’ con chiarezza cosa riesci a sostenere. Porre un limite ora è meglio che ritirarsi dopo.',
        },
        {
          question: 'Come mantiene aggiornata la sua pratica?',
          why: 'I protocolli cambiano e le strutture esigenti lo chiedono espressamente.',
          tip: 'Cita formazione concreta degli ultimi due anni e come la trasferisci in reparto.',
        },
      ],
      redFlags: [
        'Parlare di colleghi o pazienti in un modo che violi il segreto professionale.',
        'Affermare di non sentirsi mai in difficoltà.',
        'Non fare alcuna domanda su reparto, turni o inserimento.',
      ],
      askThem: [
        'Qual è il rapporto reale infermiere-pazienti in mattina, pomeriggio e notte?',
        'Quanto dura l’inserimento e chi lo affianca?',
        'Quanto è stabile la turnistica e con quale frequenza si richiama personale fuori turno?',
      ],
      faq: [
        {
          question: 'Vengono valutate le conoscenze cliniche?',
          answer:
            'Spesso, ma sotto forma di caso pratico più che di esame: una situazione acuta di cui devi descrivere la gestione. Riconoscere i limiti e dire quando chiami il medico conta più di una risposta da manuale.',
        },
        {
          question: 'Posso chiedere del rapporto di personale e delle sostituzioni?',
          answer:
            'Senz’altro: è la domanda più informativa a tua disposizione. I reparti con un piano di sostituzioni funzionante rispondono in concreto; una risposta evasiva è di per sé un’informazione.',
        },
      ],
    },
  },

  'project-manager': {
    name: 'Project manager',
    application: {
      slug: 'project-manager',
      metaTitle: 'Candidatura da project manager: lettera, CV e numeri',
      metaDescription:
        'Candidatura in project management: quali numeri convincono, quali certificazioni contano, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da project manager',
      intro:
        'Il project management è la professione in cui si afferma di più e si dimostra di meno. Indicare budget, dimensione del team, durata e risultato per ogni progetto ti mette davanti alla maggioranza prima ancora di scrivere una riga sulla metodologia.',
      atsKeywords: [
        'Project management',
        'Gestione progetti',
        'Gestione degli stakeholder',
        'Responsabilità di budget',
        'Gestione dei rischi',
        'Scrum',
        'Kanban',
        'PRINCE2',
        'Pianificazione e milestone',
        'Gestione delle risorse',
        'Jira',
        'MS Project',
        'Change management',
        'Comitato di indirizzo',
      ],
      hardSkills: [
        {
          label: 'I numeri del progetto',
          detail:
            'Budget, dimensione del team, durata e numero di funzioni coinvolte: quattro numeri che rendono una descrizione immediatamente credibile.',
        },
        {
          label: 'Metodologia con evidenze',
          detail:
            'Predittivo, agile o ibrido: di’ cosa hai condotto davvero e dove stava il limite. «Entrambi» senza esempio non vale nulla.',
        },
        {
          label: 'Strumenti',
          detail: 'Jira, Confluence, MS Project, Smartsheet, Asana: i filtri ATS cercano letteralmente questi nomi.',
        },
        {
          label: 'A chi riportavi',
          detail:
            'Un comitato di indirizzo o la direzione generale come interlocutore dice più del tuo livello di qualsiasi titolo.',
        },
      ],
      softSkills: [
        'Guidare senza autorità gerarchica',
        'Mediare fra funzioni aziendali',
        'Decidere in condizioni di incertezza',
        'Presentare alla direzione',
        'Dire no agli allargamenti di perimetro',
      ],
      certifications: [
        'PMP (Project Management Professional)',
        'PRINCE2 Practitioner',
        'Professional Scrum Master (PSM I/II)',
        'Certificazione ISIPM-Base o IPMA livello C/D',
      ],
      cvFocus: [
        {
          label: 'Un elenco progetti a parte',
          detail:
            'Da tre a cinque progetti di riferimento con settore, volume, ruolo e risultato, separati dal percorso cronologico.',
        },
        {
          label: 'Motivare un cambio di settore',
          detail:
            'Il project management è considerato trasferibile e raramente letto come tale. Di’ cosa si trasferisce dal tuo settore.',
        },
        {
          label: 'Risultato, non attività',
          detail: '«Consegnato nei tempi e sotto budget dell’8 %» invece di «responsabile del coordinamento».',
        },
      ],
      coverLetterOpener:
        'Per due anni ho guidato l’introduzione dell’ERP in [Azienda]: 1,4 M€ di budget, sei stabilimenti, 40 persone coinvolte — e un avvio in produzione senza fermare la linea.',
      mistakes: [
        {
          label: 'Un catalogo di metodi al posto dei risultati',
          detail:
            'Un elenco di framework dimostra letture, non capacità di consegna. Un progetto con numeri pesa di più.',
        },
        {
          label: 'Sfumare il proprio ruolo',
          detail: '«Abbiamo implementato» lascia aperto se guidavi o partecipavi. Di’ cosa hai preso in carico tu.',
        },
        {
          label: 'Nascondere i progetti falliti',
          detail:
            'Gli intervistatori esperti ne chiedono uno di proposito. Un progetto fermato con una lezione appresa suona più maturo di uno storico impeccabile.',
        },
      ],
      faq: [
        {
          question: 'Vale la pena certificarsi PMP o PRINCE2?',
          answer:
            'Aiuta soprattutto nelle grandi imprese, nel settore pubblico e nelle gare, dove a volte è requisito formale. Nelle organizzazioni di prodotto pesano molto di più i progetti di riferimento. Chi ne guadagna di più sono i profili con poco storico documentato.',
        },
        {
          question: 'Come descrivo progetti coperti da riservatezza?',
          answer:
            'Anonimizza il cliente e indica settore, ordine di grandezza e risultato: «fornitore automotive, 250 M€ di fatturato, migrazione di 14 sistemi». È lecito e più informativo di un nome noto senza contesto.',
        },
        {
          question: 'Come passo da specialista a project manager?',
          answer:
            'Rendi visibili i coordinamenti di work package, i ruoli di raccordo e le sostituzioni come voci autonome. La maggior parte dei passaggi riesce internamente o nello stesso settore, dove la conoscenza del business compensa lo storico mancante.',
        },
      ],
    },
    interview: {
      slug: 'project-manager',
      metaTitle: 'Colloquio da project manager: domande e risposte',
      metaDescription:
        'Domande di colloquio in project management: escalation, allargamento di perimetro e progetti falliti — cosa valutano e come rispondere.',
      heading: 'Colloquio di lavoro da project manager',
      intro:
        'Quasi tutte le domande a un project manager sono comportamentali. Non ci si aspettano conoscenze metodologiche ma un caso reale, raccontato con una struttura che qualcuno di esterno possa seguire.',
      questions: [
        {
          question: 'Mi racconti un progetto che le è sfuggito di mano.',
          why: 'La domanda più importante. Vogliono sapere se correggi presto o se te ne accorgi alla milestone.',
          tip: 'Quando te ne sei accorto, da quale segnale, cosa hai cambiato e quale è stato il risultato. Scegline uno vero, non il più innocuo.',
        },
        {
          question: 'Come gestisce l’allargamento del perimetro?',
          why: 'Verifica se governi le richieste o se ti limiti a trasmetterle.',
          tip: 'Descrivi il tuo processo di change: valutare, quantificare l’impatto su tempi e budget, far decidere — non rifiutare da solo.',
        },
        {
          question: 'Come guida un team su cui non ha autorità gerarchica?',
          why: 'Il cuore del ruolo: si ascolta l’influenza costruita su trasparenza e affidabilità.',
          tip: 'Porta un esempio in cui hai conquistato qualcuno che oggettivamente non aveva tempo per il tuo progetto.',
        },
        {
          question: 'Quando fa escalation e come?',
          why: 'Troppo presto sembra debolezza, troppo tardi imprudenza. Vogliono la tua soglia.',
          tip: 'Definisci l’innesco — tempi, budget o qualità non più sostenibili — e fai escalation con un’opzione, non con un problema.',
        },
        {
          question: 'Come decide fra due stakeholder di pari livello?',
          why: 'Verifica se porti la decisione dove deve stare.',
          tip: 'Rendere visibili i criteri, farli decidere insieme, verbalizzare la decisione.',
        },
        {
          question: 'Come misura il successo di un progetto?',
          why: 'Distingue la logica di consegna da quella di valore.',
          tip: 'Oltre a tempi, budget e perimetro, cita il beneficio dopo l’avvio: adozione, ore risparmiate, difetti evitati.',
        },
      ],
      redFlags: [
        'Presentare solo progetti riusciti.',
        'Attribuire ogni ritardo al business, all’IT o al fornitore.',
        'Non saper dare un solo numero sul proprio progetto quando viene chiesto.',
      ],
      askThem: [
        'Chi decide qui la priorità dei progetti e con quale frequenza cambia l’ordine?',
        'Come si articolano organizzazione a progetto e organizzazione di linea?',
        'Quale progetto è fallito più di recente e cosa ha cambiato l’azienda dopo?',
      ],
      faq: [
        {
          question: 'Devo consigliare una metodologia durante il colloquio?',
          answer:
            'Solo con un ragionamento tratto dal loro contesto. «Qui andrei su un ibrido, perché la fornitura hardware ha date fisse mentre il software tollera iterazioni» dimostra giudizio. Un’adesione generica «all’agile» suona non verificata.',
        },
        {
          question: 'Come affronto un caso di studio?',
          answer:
            'Fai domande prima di pianificare. I valutatori premiano quasi sempre le domande di inquadramento più del piano finito: disegnare subito un cronoprogramma è il modo più comune di perdere l’esercizio.',
        },
      ],
    },
  },

  'sales-representative': {
    name: 'Addetto alle vendite',
    application: {
      slug: 'addetto-vendite',
      metaTitle: 'Candidatura commerciale: lettera, CV e numeri di vendita',
      metaDescription:
        'Candidatura da commerciale: quali numeri mettere in evidenza, quali parole chiave superano i filtri, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura commerciale',
      intro:
        'Nelle vendite la candidatura è la prima prova di lavoro: chi non sa vendere se stesso non venderà nient’altro. Per questo viene letta con durezza, e viene letta prima di tutto cercando numeri.',
      atsKeywords: [
        'Vendite',
        'Acquisizione clienti',
        'Gestione del portafoglio clienti',
        'Vendita B2B',
        'Responsabilità di fatturato',
        'Raggiungimento degli obiettivi',
        'CRM (Salesforce, HubSpot)',
        'Gestione della pipeline',
        'Negoziazione contrattuale',
        'Vendita incrociata',
        'Key account',
        'Qualificazione delle opportunità',
      ],
      hardSkills: [
        {
          label: 'Obiettivo e raggiungimento',
          detail:
            'Obiettivo annuo, raggiungimento effettivo e posizione nel team. «112 % su un obiettivo da 1,8 M€» è la riga più forte della tua candidatura.',
        },
        {
          label: 'Tipo di vendita e ciclo',
          detail:
            'Inbound o outbound, acquisizione o portafoglio, B2B o B2C, valore medio e durata del ciclo: ognuno di questi punti filtra.',
        },
        {
          label: 'Disciplina nel CRM',
          detail:
            'Indica lo strumento e cosa vi gestivi. Le direzioni commerciali chiedono quasi sempre della manutenzione della pipeline.',
        },
        {
          label: 'Settore e prodotto',
          detail:
            'Vendere beni strumentali complessi è un altro mestiere rispetto alla vendita transazionale rapida. Collocati con chiarezza.',
        },
      ],
      softSkills: [
        'Reggere il rifiuto su cicli lunghi',
        'Ascoltare invece di presentare',
        'Negoziare fino alla chiusura',
        'Organizzarsi da soli sul territorio',
        'Costruire relazioni negli anni',
      ],
      certifications: [
        'Diploma o laurea in ambito economico-commerciale',
        'Salesforce Certified Administrator',
        'Formazione MEDDIC o SPIN Selling',
        'Formazione in negoziazione (metodo Harvard)',
      ],
      cvFocus: [
        {
          label: 'Numeri in ogni ruolo',
          detail: 'Obiettivo, raggiungimento, fatturato gestito e numero di clienti — in ogni posizione, non solo nell’ultima.',
        },
        {
          label: 'Zona e disponibilità a viaggiare',
          detail: 'Area, percentuale di trasferte e patente devono essere visibili in prima pagina.',
        },
        {
          label: 'Spiegare i passaggi brevi',
          detail:
            'I cambi sono frequenti nelle vendite e vengono comunque contati. Mezza frase sul motivo evita l’ipotesi più ovvia.',
        },
      ],
      coverLetterOpener:
        'In tre anni ho portato l’area Sud da 1,2 a 2,1 M€ di fatturato annuo, soprattutto con nuovi clienti nel settore industriale e un ciclo medio di chiusura di sette mesi.',
      mistakes: [
        {
          label: 'Nessun numero',
          detail: 'Un CV commerciale senza obiettivi si legge come un segnale d’allarme: chi ha buoni numeri li pubblica.',
        },
        {
          label: 'Aggettivi al posto della cultura di vendita',
          detail: '«Orientato al cliente e con forte capacità di chiusura» compare in una candidatura su due e non dice nulla.',
        },
        {
          label: 'Nessun riferimento a ciò che vendono',
          detail:
            'Le direzioni commerciali verificano espressamente se hai capito il prodotto e a chi si rivolge.',
        },
      ],
      faq: [
        {
          question: 'Cosa faccio se non ho raggiunto gli obiettivi?',
          answer:
            'Indicali comunque, con il contesto: mercato in calo, cambio di gamma, area costruita da zero. I numeri omessi emergono al colloquio; i numeri spiegati dimostrano che padroneggi la tua pipeline.',
        },
        {
          question: 'Posso citare clienti nella candidatura?',
          answer:
            'I riferimenti pubblici sì. Per il resto basta una descrizione: «tre gruppi quotati nel settore logistico» è sicuro e produce lo stesso effetto.',
        },
        {
          question: 'Come tratto il tema della parte variabile?',
          answer:
            'Nella candidatura solo se vengono chieste le aspettative, e allora come pacchetto: fisso, variabile e su cosa era calcolato il variabile. Il rapporto fisso/variabile si discute al colloquio, non nella lettera.',
        },
      ],
    },
    interview: {
      slug: 'addetto-vendite',
      metaTitle: 'Colloquio commerciale: domande frequenti e risposte',
      metaDescription:
        'Colloquio di vendita: obiezioni, pipeline, trattative perse e simulazione — cosa viene valutato e come rispondere con i numeri.',
      heading: 'Colloquio di lavoro commerciale',
      intro:
        'Un colloquio commerciale è esso stesso una trattativa di vendita e viene valutato come tale. Quasi tutti includono un giro sui numeri e molti una breve simulazione in cui devi presentare o ribattere a un’obiezione.',
      questions: [
        {
          question: 'Quali sono stati i suoi numeri negli ultimi tre anni?',
          why: 'La domanda di apertura: si valutano i numeri, ma anche se porti i tuoi indicatori a memoria.',
          tip: 'Obiettivo, raggiungimento e posizione nel team — anno per anno. Esitare qui è la risposta peggiore.',
        },
        {
          question: 'Mi venda questo prodotto.',
          why: 'Si verifica se chiedi prima di parlare.',
          tip: 'Inizia con tre domande di analisi del bisogno. Elencare subito le caratteristiche fa perdere l’esercizio.',
        },
        {
          question: 'Come gestisce l’obiezione «costa troppo»?',
          why: 'Verifica se ragioni in termini di valore o di sconto.',
          tip: 'Chiedi rispetto a cosa è caro e costruisci il valore. Scontare come prima reazione viene letto come debolezza.',
        },
        {
          question: 'Com’è la sua pipeline in questo momento?',
          why: 'Si valuta il metodo: quante trattative, in quale fase e con quale probabilità.',
          tip: 'Descrivi le tue fasi e il rapporto pipeline/obiettivo — l’usuale è un fattore da 3 a 4.',
        },
        {
          question: 'Mi racconti una trattativa persa.',
          why: 'Consapevolezza: chi non perde mai vende poco o non è sincero.',
          tip: 'Il motivo, cosa hai visto troppo tardi e cosa fai diversamente da allora.',
        },
        {
          question: 'Come acquisisce clienti senza contatti in ingresso?',
          why: 'Stabilisce se sai davvero fare prospezione.',
          tip: 'Descrivi la tua cadenza in concreto: ricerca, primo contatto, solleciti — con i numeri della tua settimana.',
        },
      ],
      redFlags: [
        'Non conoscere i propri numeri o rispondere in modo evasivo.',
        'Parlare invece di chiedere durante la simulazione.',
        'Attribuire ogni successo al prodotto o al mercato.',
      ],
      askThem: [
        'Come viene fissato l’obiettivo e quante persone del team l’hanno raggiunto l’anno scorso?',
        'Qual è il rapporto fra fisso e variabile e quando viene liquidato?',
        'Da dove arrivano le opportunità e quanta prospezione è attesa?',
      ],
      faq: [
        {
          question: 'Come mi preparo alla simulazione?',
          answer:
            'Studia il loro prodotto e i loro clienti tipo e prepara cinque buone domande di analisi. L’esercizio non valuta quasi mai la conoscenza del prodotto ma la conduzione del colloquio: prima le domande, poi il valore.',
        },
        {
          question: 'Devo «chiudere» durante il colloquio?',
          answer:
            'Sì, nel senso atteso nelle vendite: chiedi con chiarezza i prossimi passi e i tempi alla fine. Un tentativo aggressivo di chiusura sulla posizione stessa, invece, suona recitato.',
        },
      ],
    },
  },

  accountant: {
    name: 'Contabile',
    application: {
      slug: 'contabile',
      metaTitle: 'Candidatura da contabile: lettera, CV e gestionali',
      metaDescription:
        'Candidatura in contabilità: quali gestionali e titoli mettere in evidenza, quali parole chiave filtrano, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da contabile',
      intro:
        'In contabilità si filtra raramente sulla personalità e quasi sempre su tre punti: quali gestionali padroneggi, fino a dove arrivi da solo nella chiusura e secondo quale principio contabile. Senza risposta nelle prime righe la candidatura viene scartata.',
      atsKeywords: [
        'Contabilità generale',
        'Ciclo attivo',
        'Ciclo passivo',
        'Chiusura mensile',
        'Bilancio d’esercizio',
        'Principi contabili OIC',
        'IFRS',
        'Liquidazione IVA',
        'SAP FI',
        'Zucchetti / TeamSystem',
        'Cespiti',
        'Riconciliazioni bancarie',
        'Ratei e risconti',
        'Supporto alla revisione',
      ],
      hardSkills: [
        {
          label: 'Fino a dove chiudi in autonomia',
          detail:
            'Chiusura mensile, trimestrale o bilancio completo — in autonomia o a supporto. È il criterio di selezione decisivo.',
        },
        {
          label: 'Gestionale e modulo',
          detail:
            'SAP FI, Zucchetti, TeamSystem, Navision, Fatture in Cloud — e il modulo. Un nome di prodotto senza modulo dice pochissimo.',
        },
        {
          label: 'Principi contabili',
          detail:
            'OIC, IFRS o entrambi. Le candidature nei gruppi falliscono spesso perché manca il riferimento agli IFRS.',
        },
        {
          label: 'Fiscalità e adempimenti',
          detail:
            'IVA, liquidazioni, reverse charge, operazioni intracomunitarie e fatturazione elettronica: indispensabili appena c’è attività internazionale.',
        },
      ],
      softSkills: [
        'Precisione su volumi elevati di documenti',
        'Rispetto delle scadenze di chiusura',
        'Rapporto con commercialisti e revisori',
        'Riservatezza su dati retributivi e finanziari',
        'Pazienza con le richieste delle altre funzioni',
      ],
      certifications: [
        'Diploma di ragioneria o laurea in Economia',
        'Iscrizione all’Ordine dei Dottori Commercialisti ed Esperti Contabili',
        'Master o corso di specializzazione in fiscalità d’impresa',
        'Certificazione su SAP FI o Zucchetti',
      ],
      cvFocus: [
        {
          label: 'Dimensione dell’azienda e volumi',
          detail:
            'Una PMI da 40 dipendenti o un gruppo con 12 società: quel contesto determina come viene letta tutta la tua esperienza.',
        },
        {
          label: 'Nominare con precisione i lavori di chiusura',
          detail: '«Supporto al bilancio» e «redazione del bilancio» sono due ruoli diversi.',
        },
        {
          label: 'I gestionali in un blocco dedicato',
          detail: 'Strumenti, moduli e anni di utilizzo in forma di tabella: è così che viene realmente letto.',
        },
      ],
      coverLetterOpener:
        'Da cinque anni predispongo la chiusura mensile secondo i principi OIC per tre società con circa 1.800 documenti al mese e preparo il bilancio d’esercizio in autonomia in SAP FI.',
      mistakes: [
        {
          label: 'Indicare solo «contabilità»',
          detail:
            'Ciclo attivo, ciclo passivo, cespiti e chiusura sono profili distinti. Senza distinguere non corrispondi con precisione a nessun annuncio.',
        },
        {
          label: 'Dichiarare un gestionale senza profondità',
          detail: '«Conoscenza di SAP» viene verificata al colloquio. Indica moduli e attività o sembrerà gonfiato.',
        },
        {
          label: 'Omettere la formazione recente',
          detail:
            'La normativa fiscale cambia ogni anno. Senza aggiornamento recente si presume che tu lavori su criteri superati.',
        },
      ],
      faq: [
        {
          question: 'Quanto conta l’iscrizione all’Ordine?',
          answer:
            'Per ruoli con responsabilità di bilancio e per la libera professione è determinante ed è la maggiore leva retributiva del settore. Per ruoli di ciclo attivo o passivo non serve: contano di più i volumi e la scioltezza con il gestionale.',
        },
        {
          question: 'L’esperienza in studio conta in azienda?',
          answer:
            'Sì, viene letta come base ampia, che copre molti clienti e forme giuridiche. Aggiungi quali settori e quali lavori di chiusura hai seguito, altrimenti resta troppo generica per essere valorizzata.',
        },
        {
          question: 'Devo indicare le aspettative retributive?',
          answer:
            'Se l’annuncio lo chiede, sì — ometterle dà l’impressione di una candidatura incompleta. Ancora la cifra alla dimensione dell’azienda e al livello di responsabilità di chiusura, non ai soli anni di esperienza.',
        },
      ],
    },
    interview: {
      slug: 'contabile',
      metaTitle: 'Colloquio da contabile: domande frequenti e risposte',
      metaDescription:
        'Colloquio in contabilità: autonomia di chiusura, sbilanci, errori e gestionali — cosa viene valutato e cosa chiedere.',
      heading: 'Colloquio di lavoro da contabile',
      intro:
        'I colloqui in contabilità sono più tecnici della media: di solito è presente il responsabile amministrativo, che verifica su casi concreti la tua reale autonomia. Una breve parte tecnica è la regola, non l’eccezione.',
      questions: [
        {
          question: 'Quali chiusure realizza in autonomia?',
          why: 'La domanda di inquadramento: determina il ruolo e la fascia retributiva.',
          tip: 'Sii preciso: chiusura mensile in autonomia, bilancio a supporto. Esagerare si nota alla prima chiusura.',
        },
        {
          question: 'Come tratta uno sbilancio in una riconciliazione?',
          why: 'Si valuta il metodo, non la memoria.',
          tip: 'Descrivi il processo: circoscrivere per periodo e conto, verificare le registrazioni, risalire al documento, documentare la correzione.',
        },
        {
          question: 'Che esperienza ha con gli OIC e con gli IFRS?',
          why: 'Stabilisce se sei impiegabile in un contesto di gruppo.',
          tip: 'Cita differenze concrete con cui hai lavorato, ad esempio fondi rischi o leasing.',
        },
        {
          question: 'Mi racconti un errore che ha commesso.',
          why: 'Più importante qui che altrove: si cerca qualcuno che segnali invece di correggere in silenzio.',
          tip: 'Errore, impatto, a chi l’hai comunicato, correzione, controllo introdotto — in quest’ordine.',
        },
        {
          question: 'Come si tiene aggiornato sulle novità fiscali?',
          why: 'Si valuta l’iniziativa in una professione il cui quadro cambia ogni anno.',
          tip: 'Cita fonti e formazione concrete, non «la documentazione professionale».',
        },
        {
          question: 'Come lavora sotto la pressione della chiusura?',
          why: 'La settimana di chiusura è la prova di carico del mestiere.',
          tip: 'Descrivi la tua sequenza e come ottieni in tempo le informazioni dalle altre funzioni.',
        },
      ],
      redFlags: [
        'Dichiarare conoscenze di gestionale che la parte tecnica non conferma.',
        'Presentare gli errori come colpa di un altro reparto.',
        'Non saper citare alcuna formazione recente.',
      ],
      askThem: [
        'Quante società e quali volumi segue il team e come è ripartito il lavoro?',
        'Come si svolge la chiusura e quanti giorni lavorativi richiede oggi?',
        'Quali sistemi sono in uso e sono previste migrazioni?',
      ],
      faq: [
        {
          question: 'C’è una prova tecnica?',
          answer:
            'Spesso, e di solito breve: alcune scritture, un risconto o una questione IVA. Si cerca sicurezza di base, non livello d’esame — aspettati casi standard del ruolo stesso.',
        },
        {
          question: 'Come spiego il passaggio dallo studio all’azienda?',
          answer:
            'Come ricerca di profondità invece che di varietà: seguire una società tutto l’anno invece di molte pratiche in parallelo. È la motivazione accettata — evita di fondare la spiegazione solo sul carico di lavoro.',
        },
      ],
    },
  },

  'marketing-manager': {
    name: 'Responsabile marketing',
    application: {
      slug: 'responsabile-marketing',
      metaTitle: 'Candidatura marketing: lettera di presentazione, CV e KPI',
      metaDescription:
        'Candidatura da responsabile marketing: quali KPI convincono, quali canali e strumenti citare, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da responsabile marketing',
      intro:
        'Le candidature nel marketing raramente falliscono per l’impaginazione e quasi sempre per l’assenza di numeri. Se indichi canale, budget e risultato vieni letto come responsabile; se elenchi campagne, come esecutore.',
      atsKeywords: [
        'Marketing digitale',
        'Gestione delle campagne',
        'SEO',
        'SEA / Google Ads',
        'Content marketing',
        'Email marketing',
        'Social media',
        'Marketing automation (HubSpot)',
        'Google Analytics 4',
        'Tasso di conversione',
        'CAC / ROAS',
        'Responsabilità di budget',
        'Gestione del brand',
        'Test A/B',
      ],
      hardSkills: [
        {
          label: 'KPI con valore di partenza',
          detail:
            '«CAC ridotto da 180 € a 120 €» dice più di qualsiasi percentuale senza base. Indica sempre entrambi i valori.',
        },
        {
          label: 'Profondità di canale prima degli elenchi',
          detail:
            'Due canali che governi davvero valgono più di otto sfiorati. Indica il budget che gestivi.',
        },
        {
          label: 'Strumenti e dati',
          detail: 'GA4, HubSpot, Salesforce Marketing Cloud, Looker Studio: i filtri cercano letteralmente questi nomi.',
        },
        {
          label: 'B2B o B2C',
          detail:
            'Cicli lunghi con nurturing sono un altro mestiere rispetto al performance marketing nell’e-commerce.',
        },
      ],
      softSkills: [
        'Lavorare con le vendite e con il prodotto',
        'Gestire agenzie e collaboratori esterni',
        'Stabilire priorità con budget limitato',
        'Difendere i risultati davanti alla direzione',
        'Sicurezza redazionale',
      ],
      certifications: [
        'Certificazioni Google Ads (Search, Performance Max)',
        'Certificazione Google Analytics 4',
        'HubSpot Inbound Marketing / Marketing Software',
        'Master in marketing digitale',
      ],
      cvFocus: [
        {
          label: 'Un risultato per ruolo',
          detail: 'Un indicatore che si è mosso in modo dimostrabile grazie al tuo lavoro. È sufficiente.',
        },
        {
          label: 'Budget e dimensione del team',
          detail: 'Aver gestito 30.000 € o 3 M€ determina il livello di ruolo per cui vieni letto.',
        },
        {
          label: 'Collegare un portfolio',
          detail:
            'Due o tre campagne con obiettivo, esecuzione e risultato, in pagina o in PDF. Un link sostituisce una pagina di descrizione.',
        },
      ],
      coverLetterOpener:
        'In [Azienda] ho gestito un budget di acquisizione da 40.000 € mensili e portato il costo per contatto da 94 € a 61 € in due trimestri, senza peggiorare il tasso di chiusura della rete commerciale.',
      mistakes: [
        {
          label: 'Creatività senza effetto',
          detail: 'Una campagna ben realizzata ma senza risultato non convince nessuna direzione. Cita sempre l’obiettivo.',
        },
        {
          label: 'Dichiarare troppi canali',
          detail: 'Essere esperti in tutto si legge come non esserlo in nulla, e si sfalda in fretta al colloquio.',
        },
        {
          label: 'Sovraprogettare la candidatura',
          detail:
            'I layout complessi diventano spesso illeggibili passando da un ATS. Un CV pulito con portfolio collegato è la via sicura.',
        },
      ],
      faq: [
        {
          question: 'Serve un portfolio nel marketing?',
          answer:
            'Per i ruoli editoriali e creativi sì; per i ruoli di acquisizione e analytics vale di più una sintesi di indicatori. In entrambi i casi basta un link: gli allegati oltre i 5 MB vengono respinti da molti server di posta.',
        },
        {
          question: 'Come tratto KPI riservati?',
          answer:
            'Usa valori relativi: «tasso di conversione aumentato del 34 %» invece del fatturato assoluto. Rispetta la riservatezza ed è del tutto sufficiente per valutare il tuo lavoro.',
        },
        {
          question: 'Le competenze in IA sono attese?',
          answer:
            'Sempre di più, ma come strumento e non come fine. Ciò che convince è descrivere quale processo hai accelerato e come continui a garantire la qualità.',
        },
      ],
    },
    interview: {
      slug: 'responsabile-marketing',
      metaTitle: 'Colloquio marketing: domande frequenti e risposte',
      metaDescription:
        'Colloquio da responsabile marketing: campagne, KPI, budget e insuccessi — cosa viene valutato e come strutturare la risposta.',
      heading: 'Colloquio di lavoro da responsabile marketing',
      intro:
        'Un colloquio di marketing smonta quasi sempre una campagna nel dettaglio. Ci si aspetta che separi con nettezza obiettivo, pubblico, budget, risultato e il tuo contributo — ed è lì che la maggior parte dei candidati inciampa.',
      questions: [
        {
          question: 'Mi racconti una campagna di cui va fiero.',
          why: 'Si valuta se ragioni per obiettivi o per attività.',
          tip: 'Obiettivo, pubblico, canale, budget, risultato e la tua parte — in quest’ordine, in due minuti.',
        },
        {
          question: 'Quale campagna è fallita e perché?',
          why: 'Il marketing è iterativo: chi non ha mai fermato una campagna non ha mai davvero testato.',
          tip: 'Cita l’ipotesi, cosa l’ha smentita e cosa hai cambiato dopo.',
        },
        {
          question: 'Quale indicatore guarda ogni giorno?',
          why: 'Distingue la gestione operativa dal report di fine mese.',
          tip: 'Citane uno e motiva perché rappresenta meglio il business.',
        },
        {
          question: 'Come migliorerebbe il nostro marketing?',
          why: 'Si valuta la preparazione: quasi tutti i candidati rispondono in generale.',
          tip: 'Due osservazioni concrete dal loro sito o dai loro annunci, con un ragionamento.',
        },
        {
          question: 'Come lavora con la rete commerciale?',
          why: 'La linea di attrito più comune nel B2B.',
          tip: 'Descrivi definizioni condivise di contatto qualificato e il ritorno sulla qualità, non solo i passaggi.',
        },
        {
          question: 'Come ripartisce un budget limitato?',
          why: 'Si valutano priorità e cultura del test.',
          tip: 'Descrivi una ripartizione fra consolidato e test, con un criterio di interruzione.',
        },
      ],
      redFlags: [
        'Citare indicatori che poi non si sanno ricostruire.',
        'Attribuirsi ogni successo e dare la colpa al budget per ogni insuccesso.',
        'Non aver guardato il prodotto dell’azienda prima del colloquio.',
      ],
      askThem: [
        'Quale indicatore decide qui se il marketing sta funzionando?',
        'Come è ripartito il budget fra brand e acquisizione?',
        'Quanto collaborano marketing e vendite sulla definizione di contatto qualificato?',
      ],
      faq: [
        {
          question: 'Devo preparare un caso di studio di mia iniziativa?',
          answer:
            'Se non ne viene richiesto nessuno, bastano due osservazioni concrete sul loro marketing. Trasmette preparazione senza risultare presuntuoso — un piano completo non richiesto suona spesso poco informato.',
        },
        {
          question: 'Come rispondo su strumenti che non conosco?',
          answer:
            'Collòcati con onestà e cita l’equivalente: «HubSpot non l’ho usato, ma ho usato Marketo nella stessa funzione». Gli strumenti di marketing si imparano; una dichiarazione falsa emerge nella prima settimana.',
        },
      ],
    },
  },

  'data-analyst': {
    name: 'Analista dati',
    application: {
      slug: 'analista-dati',
      metaTitle: 'Candidatura da analista dati: lettera, CV e competenze',
      metaDescription:
        'Candidatura da data analyst: quali strumenti e metodi citare, come dimostrare l’impatto, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da analista dati',
      intro:
        'Un analista non viene assunto per gli strumenti ma perché la sua analisi ha cambiato una decisione. Tutti dichiarano SQL; la differenza sta nel saper dire cosa si è fatto di diverso dopo il tuo lavoro.',
      atsKeywords: [
        'Analisi dei dati',
        'SQL',
        'Python',
        'R',
        'Power BI',
        'Tableau',
        'Looker',
        'Visualizzazione dei dati',
        'ETL',
        'Data warehouse',
        'dbt',
        'Test A/B',
        'Reportistica KPI',
        'Statistica',
      ],
      hardSkills: [
        {
          label: 'SQL con reale profondità',
          detail:
            'Funzioni finestra, CTE, ottimizzazione delle query. Quasi tutti i processi includono una prova SQL, e un livello superficiale si vede subito.',
        },
        {
          label: 'Uno strumento di BI davvero padroneggiato',
          detail:
            'Power BI, Tableau o Looker — modellazione dei dati inclusa, non solo grafici su una tabella già pronta.',
        },
        {
          label: 'Giudizio statistico',
          detail: 'Significatività, confidenza, dimensione del campione: il confine fra riportare e analizzare.',
        },
        {
          label: 'Conoscenza del settore',
          detail:
            'E-commerce, finanza, logistica o sanità: conoscere gli indicatori del settore ti rende utile dal primo giorno.',
        },
      ],
      softSkills: [
        'Spiegare i risultati a pubblici non analitici',
        'Trasformare domande vaghe in domande rispondibili',
        'Diffidare del proprio risultato',
        'Documentare le assunzioni con ordine',
        'Comunicare un risultato scomodo',
      ],
      certifications: [
        'Microsoft Certified: Power BI Data Analyst Associate',
        'Tableau Desktop Specialist',
        'Google Data Analytics Professional Certificate',
        'AWS Certified Data Engineer – Associate',
      ],
      cvFocus: [
        {
          label: 'Decisioni, non cruscotti',
          detail:
            '«L’analisi degli abbandoni ha portato a ridisegnare l’onboarding; disdette in calo del 18 %» invece di «realizzazione di dashboard».',
        },
        {
          label: 'Volume e fonti dei dati',
          detail: 'L’ordine di grandezza e il numero di sistemi collegati mostrano in quale ambiente lavori.',
        },
        {
          label: 'Un esempio di lavoro pubblico',
          detail: 'Un notebook o una dashboard pubblica con una domanda e una risposta sostituisce molte affermazioni.',
        },
      ],
      coverLetterOpener:
        'La mia analisi per coorti in [Azienda] ha mostrato che il 60 % delle disdette avviene nei primi 30 giorni; la revisione dell’onboarding che ne è seguita ha ridotto l’abbandono del 18 % nel trimestre successivo.',
      mistakes: [
        {
          label: 'Un elenco di strumenti al posto di una domanda',
          detail: 'Tutti i candidati hanno SQL e Python. Quasi nessuno scrive la domanda a cui ha risposto.',
        },
        {
          label: 'Confondere analista e data scientist',
          detail:
            'Dichiarare modelli mai portati in produzione conduce dritto a domande scomode nella parte tecnica.',
        },
        {
          label: 'Argomentare senza legame con il business',
          detail: 'Un’analisi metodologicamente pulita ma senza uso visibile non convince nessuna funzione.',
        },
      ],
      faq: [
        {
          question: 'Serve una laurea in statistica o informatica?',
          answer:
            'No: i cambi di percorso sono comuni nell’analisi dati. Ciò che decide è un lavoro campione solido: una domanda reale, risolta con ordine e presentata con chiarezza. Senza titolo specifico pesa di più il campione, non la lunghezza della candidatura.',
        },
        {
          question: 'Come dimostro esperienza se i dati sono riservati?',
          answer:
            'Descrivi domanda, metodo e impatto senza valori assoluti, e aggiungi un progetto su dati pubblici. Questa combinazione di pratica descritta e mestiere verificabile è la via consueta.',
        },
        {
          question: 'Come mi preparo alla prova SQL?',
          answer:
            'Allenati su join, aggregazioni, funzioni finestra e CTE su un dataset reale e con tempo limitato. Quasi tutti i processi ne includono una, ed è il principale punto di eliminazione.',
        },
      ],
    },
    interview: {
      slug: 'analista-dati',
      metaTitle: 'Colloquio da analista dati: domande frequenti e risposte',
      metaDescription:
        'Colloquio da data analyst: prova SQL, caso di studio e domande comportamentali — cosa viene valutato e come rispondere.',
      heading: 'Colloquio di lavoro da analista dati',
      intro:
        'Il processo ha di solito tre fasi: prova SQL, caso di studio con domanda aperta e confronto con la funzione di business. La maggior parte cade nel caso di studio — non per l’analisi, ma perché calcola prima di chiedere.',
      questions: [
        {
          question: 'Un indicatore è calato del 30 % da un giorno all’altro. Come procede?',
          why: 'La classica domanda diagnostica: valuta il metodo, non l’intuizione.',
          tip: 'Escludere prima un problema sui dati, poi segmentare — area, dispositivo, canale, coorte — e solo dopo verificare le ipotesi.',
        },
        {
          question: 'Come presenta un risultato che il business non vuole sentire?',
          why: 'Si valutano insieme fermezza e comunicazione.',
          tip: 'Risultato, metodo, incertezza, opzioni. Un esempio reale è ciò che pesa di più qui.',
        },
        {
          question: 'Come si assicura che i suoi numeri siano corretti?',
          why: 'La qualità del dato è il cuore del ruolo.',
          tip: 'Controlli di plausibilità, confronto con una seconda fonte, assunzioni documentate — nominali in concreto.',
        },
        {
          question: 'Spieghi un test A/B a chi non ha basi statistiche.',
          why: 'Si valuta la capacità di tradurre.',
          tip: 'Senza gergo, e con un esempio tratto dal loro prodotto.',
        },
        {
          question: 'Su cosa ha lavorato che abbia cambiato una decisione?',
          why: 'Distingue il riportare dall’analizzare.',
          tip: 'Cita la decisione e chi l’ha presa, non il cruscotto.',
        },
        {
          question: 'Come stabilisce le priorità fra richieste concorrenti?',
          why: 'Un analista viene sollecitato da tutte le funzioni: stabilire priorità è lavoro quotidiano.',
          tip: 'Dare priorità in base alla rilevanza decisionale e alla scadenza, e portare le richieste ricorrenti in self-service.',
        },
      ],
      redFlags: [
        'Mettersi a calcolare nel caso di studio senza chiarire la domanda.',
        'Presentare una correlazione come causa.',
        'Fare assunzioni senza dichiararle.',
      ],
      askThem: [
        'Chi usa le analisi e quali decisioni ne dipendono?',
        'Com’è costruita l’architettura dei dati e quanto sono affidabili le fonti?',
        'Il ruolo è più di abilitazione al self-service o di analisi approfondita?',
      ],
      faq: [
        {
          question: 'Che livello ha di solito la prova SQL?',
          answer:
            'Normalmente intermedio e con tempo limitato: più join, un’aggregazione e una funzione finestra. Più frequente della difficoltà è la trappola di non verificare la plausibilità del risultato — anche quello viene valutato.',
        },
        {
          question: 'Cosa mi aspetta nel caso di studio?',
          answer:
            'Una domanda di business aperta, del tipo «perché cala il riacquisto?». Si attendono domande di inquadramento, un approccio e assunzioni dichiarate — non un numero definitivo.',
        },
      ],
    },
  },

  teacher: {
    name: 'Insegnante',
    application: {
      slug: 'insegnante',
      metaTitle: 'Candidatura da insegnante: lettera di presentazione e documenti',
      metaDescription:
        'Candidatura nella scuola: concorso, graduatorie e paritarie, documentazione necessaria, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da insegnante',
      intro:
        'Nella scuola convivono percorsi che si leggono in modo molto diverso: il concorso e le graduatorie, dove contano la classe di concorso e il punteggio, e le scuole paritarie, dove conta l’aderenza al progetto educativo dell’istituto.',
      atsKeywords: [
        'Insegnamento',
        'Classe di concorso',
        'Abilitazione all’insegnamento',
        'Graduatorie provinciali per le supplenze',
        'Programmazione didattica',
        'Didattica differenziata',
        'Gestione della classe',
        'Valutazione degli apprendimenti',
        'Bisogni educativi speciali',
        'Coordinatore di classe',
        'Rapporto con le famiglie',
        'Tecnologie didattiche',
      ],
      hardSkills: [
        {
          label: 'Classe di concorso e ordine di scuola',
          detail:
            'La classe di concorso e i gradi di istruzione determinano quasi tutto. Entrambi devono comparire nella prima riga.',
        },
        {
          label: 'Titoli e abilitazione',
          detail:
            'Laurea, crediti richiesti, percorso abilitante e, per titoli conseguiti all’estero, il riconoscimento.',
        },
        {
          label: 'Esperienza in classe oltre il tirocinio',
          detail:
            'Supplenze, doposcuola, ripetizioni, formazione adulti: tutto ciò che dimostra che sai reggere una classe.',
        },
        {
          label: 'Qualifiche aggiuntive',
          detail:
            'Sostegno, CLIL, competenze digitali: esattamente ciò che cercano i dirigenti scolastici.',
        },
      ],
      softSkills: [
        'Autorevolezza senza scontro',
        'Colloqui difficili con le famiglie',
        'Lavoro nel dipartimento disciplinare',
        'Pazienza con classi eterogenee',
        'Affidabilità nella vita della scuola',
      ],
      certifications: [
        'Abilitazione all’insegnamento (percorso da 60 CFU)',
        'Specializzazione per il sostegno (TFA)',
        'Certificazione CLIL o linguistica (B2/C1)',
        'Certificazioni sulle competenze digitali per la didattica',
      ],
      cvFocus: [
        {
          label: 'Tipo di istituto e classi',
          detail: 'Statale o paritaria, primaria, secondaria di primo o secondo grado, e le classi effettivamente seguite.',
        },
        {
          label: 'Impegno oltre le lezioni',
          detail:
            'Laboratori, uscite, progetti, coordinamenti: nelle paritarie e nelle candidature dirette è spesso il fattore decisivo.',
        },
        {
          label: 'Riferimento al progetto dell’istituto',
          detail:
            'Indirizzo linguistico, percorsi tecnici, progetti di innovazione: una frase basta per distinguerti dalla candidatura standard.',
        },
      ],
      coverLetterOpener:
        'Il vostro indirizzo linguistico alla secondaria di primo grado corrisponde esattamente al mio profilo di inglese e storia: per due quadrimestri ho svolto storia in inglese in una classe eterogenea di terza media.',
      mistakes: [
        {
          label: 'La stessa lettera per il concorso e per l’istituto',
          detail:
            'Il concorso richiede dati formali; la dirigenza scolastica cerca aderenza al progetto. Servono due testi.',
        },
        {
          label: 'Principi pedagogici al posto della pratica',
          detail:
            'Mezza pagina di filosofia dell’educazione non viene letta. Un’unità didattica descritta con il suo esito sì.',
        },
        {
          label: 'Documentazione incompleta',
          detail:
            'Certificati di laurea, abilitazione e certificato penale: se ne manca uno, la presa di servizio slitta di settimane.',
        },
      ],
      faq: [
        {
          question: 'Come entro nell’insegnamento da un’altra professione?',
          answer:
            'Con il percorso abilitante previsto e poi tramite concorso o graduatorie per le supplenze, i cui termini variano di anno in anno. A decidere l’accesso è la corrispondenza fra la tua laurea e una classe di concorso; matematica, discipline tecniche e sostegno offrono le prospettive migliori.',
        },
        {
          question: 'Mi iscrivo alle graduatorie o mi candido direttamente alle scuole?',
          answer:
            'Di norma entrambe le cose: le graduatorie per la scuola statale, la candidatura diretta per le paritarie. La via diretta è più rapida, ma solo dove esiste un posto realmente disponibile.',
        },
        {
          question: 'Quanto pesa il punteggio?',
          answer:
            'Nelle graduatorie è determinante, perché l’ordine dipende da quello. Per un posto in una scuola paritaria contano molto di più l’aderenza al progetto e le qualifiche aggiuntive.',
        },
      ],
    },
    interview: {
      slug: 'insegnante',
      metaTitle: 'Colloquio da insegnante: domande frequenti e risposte',
      metaDescription:
        'Colloquio nella scuola: gestione della classe, didattica differenziata, famiglie e progetto d’istituto — cosa valutano e cosa chiedere.',
      heading: 'Colloquio di lavoro da insegnante',
      intro:
        'Nelle scuole paritarie il colloquio è condotto dalla dirigenza, spesso con il coordinatore didattico. Si chiede quasi sempre di situazioni concrete, e frequentemente si aggiunge una lezione osservata che pesa più della conversazione.',
      questions: [
        {
          question: 'Come gestisce una classe che non si calma?',
          why: 'La gestione della classe è la competenza centrale: si cercano strutture, non volume di voce.',
          tip: 'Descrivi i rituali e le regole che stabilisci prima, non solo la tua reazione sul momento.',
        },
        {
          question: 'Come differenzia in una classe eterogenea?',
          why: 'Il quotidiano di ogni ordine di scuola. Ci si aspetta pratica, non teoria.',
          tip: 'Dettaglia una lezione con compiti graduati: materiali, sequenza, risultato.',
        },
        {
          question: 'Mi racconti un colloquio difficile con una famiglia.',
          why: 'Il rapporto con le famiglie assorbe molto tempo e logora i team.',
          tip: 'Ascoltare, separare i fatti dall’emozione, concordare un’azione, mettere a verbale.',
        },
        {
          question: 'Perché la nostra scuola?',
          why: 'La domanda decisiva per qualsiasi posto specifico.',
          tip: 'Fai riferimento al piano dell’offerta formativa, al carattere dell’istituto o a un progetto preciso.',
        },
        {
          question: 'Come usa la tecnologia in classe?',
          why: 'Si verifica che lo strumento sia giustificato didatticamente e non usato per sé stesso.',
          tip: 'Un esempio in cui lo strumento ha reso possibile qualcosa altrimenti impraticabile.',
        },
        {
          question: 'Cosa porterebbe oltre le sue lezioni?',
          why: 'Le scuole assumono colleghi che sostengono la vita dell’istituto.',
          tip: 'Sii concreto — un laboratorio, un coordinamento, un progetto — e onesto sulla tua disponibilità.',
        },
      ],
      redFlags: [
        'Attribuire i problemi di comportamento solo agli studenti o alle famiglie.',
        'Non aver letto il piano dell’offerta formativa della scuola.',
        'Parlare solo per formule pedagogiche senza un singolo esempio.',
      ],
      askThem: [
        'Come è organizzato l’inserimento dei nuovi docenti?',
        'Quali sono le priorità dell’istituto per i prossimi due anni scolastici?',
        'Come è organizzato il lavoro nel dipartimento disciplinare?',
      ],
      faq: [
        {
          question: 'Come si svolge una lezione osservata?',
          answer:
            'Di solito una lezione ridotta con una classe che non conosci, con l’argomento comunicato in anticipo e un colloquio di riflessione successivo. Si valuta più la tua analisi di ciò che ha funzionato e ciò che non ha funzionato che una lezione impeccabile.',
        },
        {
          question: 'Si può insegnare senza aver vinto il concorso?',
          answer:
            'Sì, con supplenze da graduatoria nella scuola statale o con contratto nelle paritarie, ed è una via d’ingresso comune. La stabilità è minore, ma consente di accumulare servizio che poi vale come punteggio.',
        },
      ],
    },
  },

  'office-administrator': {
    name: 'Impiegato amministrativo',
    application: {
      slug: 'impiegato-amministrativo',
      metaTitle: 'Candidatura amministrativa: lettera di presentazione e CV',
      metaDescription:
        'Candidatura da impiegato amministrativo: quali attività e gestionali citare, esempio di apertura ed errori che rendono un CV intercambiabile.',
      heading: 'Come scrivere una candidatura da impiegato amministrativo',
      intro:
        'I ruoli amministrativi ricevono più candidature di quasi ogni altro, e la maggior parte è intercambiabile. Descrivere il proprio perimetro reale invece di «attività d’ufficio generiche» ti colloca già nel primo terzo.',
      atsKeywords: [
        'Gestione amministrativa',
        'Ciclo ordini',
        'Controllo fatture',
        'Gestione agende',
        'Note spese',
        'Corrispondenza',
        'Pacchetto Office / Excel',
        'Gestionale ERP',
        'Inserimento e aggiornamento dati',
        'Preparazione preventivi',
        'Accoglienza e centralino',
        'Gestione documentale',
      ],
      hardSkills: [
        {
          label: 'Il tuo perimetro reale',
          detail:
            'Ciclo ordini, fatturazione, amministrazione del personale o assistenza alla direzione: mestieri molto diversi sotto la stessa etichetta.',
        },
        {
          label: 'Excel oltre le basi',
          detail:
            'CERCA.VERT/CERCA.X, tabelle pivot, filtri: è la competenza più verificata in questa famiglia professionale.',
        },
        {
          label: 'ERP e gestionali',
          detail:
            'SAP, Zucchetti, TeamSystem, Navision o Danea, per nome: il tempo di inserimento è un costo diretto per l’azienda.',
        },
        {
          label: 'Numeri di volume',
          detail:
            'Ordini a settimana, fatture al mese, sedi seguite: è ciò che rende concreta la «gestione amministrativa».',
        },
      ],
      softSkills: [
        'Stabilire priorità senza supervisione ravvicinata',
        'Restare cortesi con interlocutori difficili',
        'Rispettare le scadenze in modo affidabile',
        'Riservatezza su dati del personale e contratti',
        'Anticipare oltre il proprio compito',
      ],
      certifications: [
        'Diploma di ragioneria o amministrazione, finanza e marketing',
        'Certificazione ECDL / ICDL avanzata',
        'Corso di contabilità o elaborazione paghe',
        'Certificazione su gestionali (Zucchetti, TeamSystem)',
      ],
      cvFocus: [
        {
          label: 'Settore e dimensione dell’azienda',
          detail: 'Impresa artigiana, studio professionale, industria o ente pubblico: il quotidiano non si somiglia affatto.',
        },
        {
          label: 'I gestionali in un blocco dedicato',
          detail: 'Un elenco breve con il livello d’uso viene letto; un paragrafo no.',
        },
        {
          label: 'Un percorso senza vuoti inspiegati',
          detail: 'Nella selezione amministrativa la cronologia è esaminata nel dettaglio. Spiega brevemente le interruzioni.',
        },
      ],
      coverLetterOpener:
        'Nel ruolo attuale gestisco circa 120 ordini cliente a settimana in TeamSystem — dall’inserimento dell’ordine al monitoraggio delle consegne fino alla fatturazione.',
      mistakes: [
        {
          label: '«Attività d’ufficio generiche»',
          detail: 'La formula più frequente del settore e quella che informa di meno.',
        },
        {
          label: '«Buona conoscenza del pacchetto Office»',
          detail: 'Lo scrivono tutti. Di’ cosa costruisci davvero in Excel e ti distingui immediatamente.',
        },
        {
          label: 'Una lettera standard senza riferimenti',
          detail: 'Con così tanti candidati decide la frase che dimostra che hai letto l’annuncio.',
        },
      ],
      faq: [
        {
          question: 'Come mi distinguo fra molti candidati?',
          answer:
            'Con la concretezza: volumi, gestionali e perimetro esatto. La maggior parte delle candidature del settore resta generica, quindi tre dati precisi appaiono già sopra la media.',
        },
        {
          question: 'Come spiego un rientro dopo una lunga pausa?',
          answer:
            'Con naturalezza e brevità nella lettera, senza giustificazioni, e una riga sull’aggiornamento — un corso di informatica o di contabilità. Un vuoto taciuto genera più domande di un vuoto dichiarato.',
        },
        {
          question: 'L’autocandidatura ha senso?',
          answer:
            'Sì, soprattutto in ambito amministrativo, dove molti posti si coprono internamente o su segnalazione. Indica l’area precisa: un’autocandidatura senza direzione viene raramente inoltrata.',
        },
      ],
    },
    interview: {
      slug: 'impiegato-amministrativo',
      metaTitle: 'Colloquio amministrativo: domande frequenti e risposte',
      metaDescription:
        'Colloquio da impiegato amministrativo: organizzazione, Excel, priorità e riservatezza — cosa viene valutato e cosa chiedere.',
      heading: 'Colloquio di lavoro da impiegato amministrativo',
      intro:
        'Il colloquio riunisce di norma il responsabile diretto e una persona delle risorse umane. Si indagano organizzazione personale, precisione e tenuta al carico con esempi concreti, e molti processi includono una breve prova di Excel o di scrittura.',
      questions: [
        {
          question: 'Come si organizza quando più cose sono urgenti insieme?',
          why: 'Il cuore del ruolo: ci si aspetta un criterio ripetibile, non resistenza.',
          tip: 'Dare priorità per scadenza e conseguenza, avvisare quando qualcosa slitterà — con un esempio.',
        },
        {
          question: 'Come evita di commettere errori?',
          why: 'La precisione è il primo criterio nel lavoro amministrativo.',
          tip: 'Descrivi la tua routine di controllo: doppia verifica, lista di riscontro, revisione prima dell’invio.',
        },
        {
          question: 'Quali funzioni di Excel usa abitualmente?',
          why: 'La competenza più sopravvalutata nei CV amministrativi.',
          tip: 'Cita funzioni precise e a cosa ti servono. Resta onesto: spesso segue una prova.',
        },
        {
          question: 'Come gestisce una telefonata di qualcuno irritato?',
          why: 'Si valutano la capacità di ridurre la tensione e l’affidabilità dell’impegno preso.',
          tip: 'Lasciar finire, riformulare, impegnarsi su un passo concreto e rispettarlo.',
        },
        {
          question: 'Come tratta la documentazione riservata?',
          why: 'I ruoli amministrativi toccano dati del personale, contratti e retribuzioni.',
          tip: 'Cita pratiche concrete: permessi di accesso, archivio chiuso, nessuna trasmissione senza autorizzazione.',
        },
        {
          question: 'Cosa fa se il suo responsabile è irreperibile e serve una decisione?',
          why: 'Si valutano autonomia e buon senso.',
          tip: 'Definisci il limite: cosa decidi tu, cosa fai autorizzare, come ne lasci traccia.',
        },
      ],
      redFlags: [
        'Dichiarare un livello di Excel che la prova non conferma.',
        'Rispondere alle domande sull’organizzazione solo con «sono molto organizzato».',
        'Parlare male di responsabili o colleghi precedenti.',
      ],
      askThem: [
        'Come è ripartito il lavoro fra le persone del team?',
        'Quali gestionali sono in uso e quanto dura l’affiancamento iniziale?',
        'Quali sarebbero le priorità dei primi tre mesi?',
      ],
      faq: [
        {
          question: 'C’è una prova?',
          answer:
            'Spesso: un breve esercizio di Excel, una verifica di scrittura o una lettera modello. Raramente superano i 30 minuti e cercano sicurezza di base, non conoscenze specialistiche.',
        },
        {
          question: 'Posso chiedere del lavoro da remoto e dell’orario?',
          answer:
            'Sì, più avanti nella conversazione: sono questioni pratiche legittime. Chiedi cosa fa davvero il team invece di cosa prevede la policy, e otterrai la risposta utile.',
        },
      ],
    },
  },

  'customer-service-agent': {
    name: 'Addetto all’assistenza clienti',
    application: {
      slug: 'assistenza-clienti',
      metaTitle: 'Candidatura assistenza clienti: lettera, CV e indicatori',
      metaDescription:
        'Candidatura da addetto all’assistenza clienti: quali indicatori e strumenti citare, esempio di apertura ed errori che banalizzano un profilo.',
      heading: 'Come scrivere una candidatura per l’assistenza clienti',
      intro:
        'Nell’assistenza clienti conta meno il percorso e più la prova che sai reggere una conversazione sotto pressione. Indica canale, volume e indicatori di qualità e vieni collocato subito; gli altri finiscono nella pila generale.',
      atsKeywords: [
        'Assistenza clienti',
        'Servizio clienti',
        'Supporto di primo livello',
        'Supporto di secondo livello',
        'Gestione dei reclami',
        'Gestione delle escalation',
        'CRM (Salesforce, Zendesk)',
        'Sistema di ticketing',
        'Chiamate in entrata / in uscita',
        'Soddisfazione del cliente (CSAT)',
        'Risoluzione al primo contatto',
        'Livello di servizio',
      ],
      hardSkills: [
        {
          label: 'Canale e volume',
          detail:
            'Telefono, email, chat o social — e quanti contatti al giorno. 80 chiamate è un altro mestiere rispetto a 20 casi complessi.',
        },
        {
          label: 'Indicatori di servizio',
          detail:
            'CSAT, risoluzione al primo contatto, tempo medio di gestione e rispetto del livello di servizio: la lingua di ogni direzione del servizio.',
        },
        {
          label: 'Strumenti',
          detail: 'Zendesk, Freshdesk, Salesforce Service Cloud, Intercom — per nome.',
        },
        {
          label: 'Profondità di prodotto',
          detail:
            'Supporto tecnico, assicurazioni, energia o e-commerce: la conoscenza del prodotto determina inserimento e fascia retributiva.',
        },
      ],
      softSkills: [
        'Mantenere la calma con clienti arrabbiati',
        'Ascolto attivo',
        'Spiegare con chiarezza e senza gergo',
        'Tenuta a ritmi elevati',
        'Mantenere ciò che si è promesso',
      ],
      certifications: [
        'Corso di formazione in customer care',
        'Salesforce Service Cloud Consultant',
        'ITIL Foundation (supporto tecnico)',
        'Certificazioni linguistiche (B2/C1)',
      ],
      cvFocus: [
        {
          label: 'Indicatori in ogni ruolo',
          detail: 'Contatti al giorno, CSAT e risoluzione al primo contatto: è la prima cosa che viene letta.',
        },
        {
          label: 'Lingue con il livello',
          detail: 'Nel servizio internazionale ogni lingua in più è una leva retributiva diretta.',
        },
        {
          label: 'Disponibilità oraria',
          detail: 'Molti servizi lavorano su turni: chiarirlo presto fa risparmiare tempo a entrambe le parti.',
        },
      ],
      coverLetterOpener:
        'Nel settore energetico seguo circa 60 contatti al giorno fra telefono e chat, con l’84 % di risoluzione al primo contatto e un CSAT di 4,6 su 5.',
      mistakes: [
        {
          label: 'Solo «cordiale e comunicativo»',
          detail: 'Compare praticamente in ogni candidatura del settore. Un indicatore vale più di qualsiasi aggettivo.',
        },
        {
          label: 'Nessun dato di volume',
          detail: 'Senza numero di contatti resta ignoto se reggi il carico, che è la domanda centrale del ruolo.',
        },
        {
          label: 'Nascondere l’esperienza sui reclami',
          detail: 'Saper gestire un’escalation è la competenza più preziosa dell’area, non un difetto.',
        },
      ],
      faq: [
        {
          question: 'L’esperienza nella ristorazione o nel commercio conta?',
          answer:
            'Sì, ed è regolarmente sottovalutata. Traducila nel linguaggio del servizio: clienti per turno, reclami gestiti, contestazioni risolte — così diventa immediatamente pertinente.',
        },
        {
          question: 'Come affronto il tema del lavoro da remoto?',
          answer:
            'L’assistenza clienti è una delle funzioni più organizzate da remoto, quindi la domanda è attesa. Ponila al colloquio e non nella lettera, e chiedi il modello realmente in uso nel team.',
        },
        {
          question: 'Le lingue contano più dell’esperienza di settore?',
          answer:
            'Nel servizio internazionale spesso sì: una seconda lingua a livello B2/C1 apre posizioni altrimenti chiuse. Nel supporto tecnico pesa di più la conoscenza del prodotto.',
        },
      ],
    },
    interview: {
      slug: 'assistenza-clienti',
      metaTitle: 'Colloquio assistenza clienti: domande e risposte',
      metaDescription:
        'Colloquio nell’assistenza clienti: escalation, carico e indicatori, di solito con simulazione — cosa viene valutato e come rispondere.',
      heading: 'Colloquio di lavoro nell’assistenza clienti',
      intro:
        'I colloqui nel servizio includono quasi sempre una simulazione: ti viene presentato un cliente arrabbiato e devi condurre la conversazione. Non viene valutata la soluzione ma il fatto che ascolti prima e solo dopo prenda un impegno che puoi mantenere.',
      questions: [
        {
          question: 'Un cliente è furioso e ha ragione. Cosa fa?',
          why: 'La situazione di riferimento del mestiere.',
          tip: 'Lasciar finire, riconoscere l’errore, proporre una soluzione, impegnarsi su una data, richiamare. Senza giustificare l’azienda.',
        },
        {
          question: 'Un cliente pretende qualcosa che lei non può concedere. Come reagisce?',
          why: 'Si valuta se sai tenere un limite con cordialità.',
          tip: 'No alla pretesa, sì al bisogno: spiega cosa è possibile e proponi l’alternativa in concreto.',
        },
        {
          question: 'Come gestisce un volume elevato di chiamate?',
          why: 'Il turnover nel settore è alto; si cerca un’autovalutazione realistica.',
          tip: 'Descrivi con onestà come ti ricomponi fra una chiamata e l’altra, e quale ritmo hai davvero sostenuto.',
        },
        {
          question: 'Qual è stata la sua escalation più difficile?',
          why: 'Si valuta esperienza reale, non teoria.',
          tip: 'Situazione, i tuoi passaggi, esito e cosa hai cambiato dopo.',
        },
        {
          question: 'Come spiega qualcosa di complesso a un cliente impaziente?',
          why: 'La chiarezza è la vera competenza tecnica dell’area.',
          tip: 'Breve, senza gergo e con una verifica che sia arrivato.',
        },
        {
          question: 'Come capisce di aver avuto una buona giornata?',
          why: 'Mostra se lavori tenendo a mente gli indicatori.',
          tip: 'Cita un indicatore di qualità e uno di volume, e perché vanno insieme.',
        },
      ],
      redFlags: [
        'Proporre una soluzione nella simulazione prima di aver ascoltato.',
        'Parlare con disprezzo dei clienti difficili.',
        'Impegnarsi su ciò che non si riuscirà a mantenere.',
      ],
      askThem: [
        'Quanti contatti gestisce qui un addetto al giorno?',
        'Quanto dura l’affiancamento iniziale e come si costruisce la conoscenza del prodotto?',
        'Come viene misurata la prestazione: per volume, per qualità o per entrambi?',
      ],
      faq: [
        {
          question: 'Come funziona la simulazione?',
          answer:
            'Di solito cinque-dieci minuti con un reclamo simulato. Vengono valutati ascolto, riformulazione e fermezza dell’impegno — non il fatto che tu conosca la soluzione corretta.',
        },
        {
          question: 'Posso chiedere delle maggiorazioni per i turni?',
          answer:
            'Sì, è del tutto consueto nel settore e riceve una risposta pacata. Chiedilo insieme alla pianificazione dei turni e chiarisci entrambe le cose in una volta.',
        },
      ],
    },
  },

  electrician: {
    name: 'Elettricista',
    application: {
      slug: 'elettricista',
      metaTitle: 'Candidatura da elettricista: lettera, CV e abilitazioni',
      metaDescription:
        'Candidatura da elettricista: quali abilitazioni mettere in evidenza, come indicare la specializzazione, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da elettricista',
      intro:
        'Nel settore elettrico le candidature si leggono e si decidono in fretta. Specializzazione, abilitazioni e patente vengono prima di tutto: una lettera lunga non compensa un attestato mancante.',
      atsKeywords: [
        'Elettricista',
        'Impianti civili',
        'Impianti industriali',
        'Manutenzione industriale',
        'Automazione',
        'Cablaggio quadri elettrici',
        'Programmazione PLC (Siemens S7)',
        'Norma CEI 64-8',
        'PES / PAV / PEI',
        'Ricerca guasti',
        'Manutenzione preventiva',
        'Fotovoltaico',
      ],
      hardSkills: [
        {
          label: 'Indica la specializzazione',
          detail:
            'Civile, terziario, manutenzione industriale o automazione: è il primo filtro applicato al tuo profilo.',
        },
        {
          label: 'Abilitazioni e qualifiche',
          detail:
            'PES, PAV, PEI, lavori sotto tensione, media tensione — con le date di aggiornamento. Determinano impiego e inquadramento.',
        },
        {
          label: 'Automazione',
          detail:
            'L’esperienza sui PLC, in particolare Siemens S7 / TIA Portal, è la maggiore differenza di paga oraria nell’industria.',
        },
        {
          label: 'Patente e mobilità',
          detail:
            'In cantiere e in assistenza la patente B è di fatto un requisito. Se manca dal CV, si presume che tu non l’abbia.',
        },
      ],
      softSkills: [
        'Rigore sulla sicurezza senza scorciatoie',
        'Autonomia in cantiere',
        'Rapporto con il cliente in locali occupati',
        'Documentazione ordinata delle verifiche',
        'Affidabilità nella squadra',
      ],
      certifications: [
        'Qualifica professionale di operatore elettrico o diploma di perito elettrotecnico',
        'Abilitazioni PES/PAV/PEI (CEI 11-27)',
        'Abilitazione DM 37/08 per la conduzione tecnica',
        'Corso PLC Siemens TIA Portal',
      ],
      cvFocus: [
        {
          label: 'Tipo di intervento',
          detail: 'Nuova costruzione, ristrutturazione, manutenzione industriale o assistenza al cliente: giornate molto diverse.',
        },
        {
          label: 'Impianti e costruttori',
          detail: 'Indica tipi di impianto e PLC concreti; le aziende cercano esattamente quello.',
        },
        {
          label: 'Allega gli attestati',
          detail: 'Qualifica e abilitazioni in allegato: senza di esse non è possibile pianificare il tuo impiego.',
        },
      ],
      coverLetterOpener:
        'Da sei anni lavoro nella manutenzione di uno stabilimento alimentare su tre turni: ricerca guasti su linee di riempimento comandate da S7, verifiche periodiche e modifiche ai quadri.',
      mistakes: [
        {
          label: 'Scrivere solo «elettricista»',
          detail: 'Senza la specializzazione un’azienda non può valutare se sei adatto alla posizione.',
        },
        {
          label: 'Omettere le abilitazioni',
          detail: 'Sono il contenuto più importante della candidatura e fissano direttamente il tuo inquadramento.',
        },
        {
          label: 'Una lettera troppo lunga',
          detail:
            'Nel settore si legge in fretta. Mezza pagina con specializzazione, esperienza e disponibilità è più che sufficiente.',
        },
      ],
      faq: [
        {
          question: 'Serve una lettera di presentazione nel settore?',
          answer:
            'Una versione breve sì: risponde al perché quell’azienda e da quando sei disponibile. Molte decidono su CV e attestati, ma una candidatura senza lettera sembra inviata a caso.',
        },
        {
          question: 'Posso candidarmi senza qualifica completata?',
          answer:
            'Sì, come aiutante, indicando la tua esperienza e l’intenzione di completarla. Molte aziende formano quando affidabilità e sensibilità alla sicurezza sono evidenti — cita attività concrete per dimostrarlo.',
        },
        {
          question: 'Quanto conta l’abilitazione DM 37/08?',
          answer:
            'Per firmare le dichiarazioni di conformità, assumere responsabilità e lavorare in proprio è determinante. Per ruoli operativi e di montaggio contano di più le abilitazioni di sicurezza e l’esperienza sugli impianti.',
        },
      ],
    },
    interview: {
      slug: 'elettricista',
      metaTitle: 'Colloquio da elettricista: domande frequenti e risposte',
      metaDescription:
        'Colloquio nel settore elettrico: sicurezza, ricerca guasti e abilitazioni — cosa viene valutato e cosa chiedere all’azienda.',
      heading: 'Colloquio di lavoro da elettricista',
      intro:
        'Il colloquio è di norma condotto direttamente dal capocantiere o dal titolare, ed è breve e pratico. Si chiede degli impianti che conosci, del tuo metodo davanti a un guasto e soprattutto del tuo rapporto con le regole di sicurezza sotto pressione di tempo.',
      questions: [
        {
          question: 'Come procede davanti a un guasto che non conosce?',
          why: 'La domanda centrale: si cerca una delimitazione sistematica, non tentativi ripetuti.',
          tip: 'Raccogliere il sintomo, mettere in sicurezza l’impianto, risalire dall’alimentazione all’utilizzatore, misurare invece di supporre, documentare.',
        },
        {
          question: 'Quali abilitazioni possiede?',
          why: 'Determina direttamente pianificazione e inquadramento.',
          tip: 'Cita tutte quelle valide con la data e porta gli attestati.',
        },
        {
          question: 'Cosa fa se le chiedono di saltare un passaggio di sicurezza per rispettare i tempi?',
          why: 'La domanda di atteggiamento più importante del mestiere.',
          tip: 'Sii netto: la messa in sicurezza non si negozia. Proponi un’alternativa invece di limitarti a rifiutare.',
        },
        {
          question: 'Con quali PLC ha lavorato?',
          why: 'Fissa il tempo di inserimento in un contesto industriale.',
          tip: 'Costruttore, serie e cosa facevi davvero: leggere, modificare o programmare.',
        },
        {
          question: 'Come gestisce il cliente sul posto?',
          why: 'In assistenza l’elettricista è il volto dell’azienda.',
          tip: 'Un esempio: spiegare cosa stai facendo, rispettare l’appuntamento, lasciare l’area pulita.',
        },
        {
          question: 'Come documenta i suoi interventi?',
          why: 'Verbali e dichiarazioni hanno valore normativo.',
          tip: 'Descrivi con precisione cosa registri e in quale sistema.',
        },
      ],
      redFlags: [
        'Lasciar intendere che la sicurezza sia negoziabile quando il cantiere è in ritardo.',
        'Dichiarare abilitazioni che non si possono documentare.',
        'Non fare alcuna domanda sulla pianificazione dei lavori o sulla reperibilità.',
      ],
      askThem: [
        'Come è ripartito il lavoro fra cantiere, officina e assistenza al cliente?',
        'Esiste una reperibilità e come viene retribuita?',
        'Quali formazioni sostiene l’azienda?',
      ],
      faq: [
        {
          question: 'Devo portare gli attestati?',
          answer:
            'Sì — qualifica, abilitazioni e attestati di formazione sulla sicurezza, in originale o in copia. Molte aziende decidono sul momento e un attestato mancante rinvia semplicemente l’offerta.',
        },
        {
          question: 'C’è una prova pratica?',
          answer:
            'In alcune aziende sì, di solito breve e in officina: una misura, uno schema, una piccola ricerca guasti. Si valutano metodo e sensibilità alla sicurezza, non la velocità.',
        },
      ],
    },
  },

  'warehouse-logistics': {
    name: 'Addetto alla logistica',
    application: {
      slug: 'addetto-logistica',
      metaTitle: 'Candidatura in logistica: CV, patentino muletto e sistemi',
      metaDescription:
        'Candidatura da addetto alla logistica: quali patentini e sistemi citare, cosa deve comparire nella lettera, esempio di apertura ed errori frequenti.',
      heading: 'Come scrivere una candidatura da addetto alla logistica',
      intro:
        'In logistica si decide in fretta, spesso in pochi giorni. Patentino per il carrello elevatore, disponibilità ai turni e sistema di gestione del magazzino utilizzato sono i tre dati cercati per primi.',
      atsKeywords: [
        'Logistica di magazzino',
        'Preparazione ordini',
        'Ricevimento merci',
        'Spedizioni',
        'Inventario',
        'Patentino carrello elevatore',
        'Muletto frontale e retrattile',
        'Sistema di gestione magazzino (WMS)',
        'SAP EWM',
        'Gestione delle giacenze',
        'Merci pericolose (ADR)',
        'Pallettizzazione e reggiatura',
      ],
      hardSkills: [
        {
          label: 'Patentini e abilitazioni',
          detail:
            'Patentino per carrelli elevatori (Accordo Stato-Regioni), transpallet, retrattile, ADR — con la data di scadenza. Senza non è possibile pianificarti.',
        },
        {
          label: 'Sistema di gestione del magazzino',
          detail:
            'SAP EWM, Modula WMS, terminali in radiofrequenza, picking vocale: la padronanza del sistema fissa il tuo tempo di inserimento.',
        },
        {
          label: 'Il ruolo dentro il magazzino',
          detail:
            'Ricevimento, preparazione, spedizione o gestione giacenze sono profili distinti con esigenze distinte.',
        },
        {
          label: 'Numeri di produttività',
          detail: 'Righe all’ora, tasso di errore, colli per turno: gli indicatori del settore.',
        },
      ],
      softSkills: [
        'Resistenza fisica nel lavoro a turni',
        'Precisione a ritmi elevati',
        'Lavoro di squadra sotto scadenza',
        'Puntualità e affidabilità',
        'Attenzione alla sicurezza',
      ],
      certifications: [
        'Qualifica di operatore logistico',
        'Patentino carrelli elevatori (Accordo Stato-Regioni)',
        'Formazione ADR per merci pericolose',
        'Corso su ancoraggio e stivaggio dei carichi',
      ],
      cvFocus: [
        {
          label: 'Tipo e dimensione del magazzino',
          detail:
            'Magazzino automatizzato, cella frigorifera, e-commerce o ricambi: ritmo ed esigenze cambiano molto.',
        },
        {
          label: 'Regime dei turni',
          detail: 'Due turni, tre turni, notte, fine settimana: è spesso il criterio decisivo.',
        },
        {
          label: 'Patentini ben visibili',
          detail: 'Un blocco dedicato in alto, non nascosti fra le esperienze.',
        },
      ],
      coverLetterOpener:
        'Da quattro anni lavoro su tre turni in una piattaforma distributiva con circa 12.000 posti pallet — preparazione con terminale in radiofrequenza in SAP EWM, patentino muletto dal 2019 e corso su ancoraggio dei carichi.',
      mistakes: [
        {
          label: 'Citare i patentini solo in allegato',
          detail: 'Sono il primo criterio di selezione e devono comparire nella prima pagina.',
        },
        {
          label: 'Lasciare vaga la disponibilità ai turni',
          detail: 'Quando il dato manca si presume indisponibilità e la candidatura si esclude da sola.',
        },
        {
          label: 'Riassumere tutto come «lavoro in magazzino»',
          detail: 'Ricevimento e spedizione sono ruoli diversi con indicatori diversi: distinguili.',
        },
      ],
      faq: [
        {
          question: 'Posso candidarmi senza patentino per il muletto?',
          answer:
            'Sì, e molte aziende lo finanziano — indica esplicitamente che sei disponibile a conseguirlo. Nelle posizioni in cui la conduzione è il cuore del lavoro è di fatto un requisito.',
        },
        {
          question: 'Che livello di italiano è richiesto?',
          answer:
            'Quanto basta per seguire le istruzioni di sicurezza e lavorare con il sistema, di norma un livello intermedio. Indica il tuo livello con naturalezza: molte piattaforme sono multilingue e valutano prima l’affidabilità della scioltezza.',
        },
        {
          question: 'Le missioni in somministrazione penalizzano?',
          answer:
            'No, in logistica sono la via abituale verso l’assunzione diretta. Elenca le piattaforme in cui sei stato inviato: documentano esattamente i sistemi e i tipi di magazzino che vengono cercati.',
        },
      ],
    },
    interview: {
      slug: 'addetto-logistica',
      metaTitle: 'Colloquio in logistica: domande frequenti e risposte',
      metaDescription:
        'Colloquio in magazzino: turni, precisione, sicurezza e sistemi — cosa viene valutato e cosa chiedere.',
      heading: 'Colloquio di lavoro in logistica',
      intro:
        'Il colloquio è di solito breve e pratico, con il capoturno o il responsabile di magazzino. Spesso include una visita all’impianto — e quella visita fa parte della valutazione, perché si osserva cosa noti e cosa chiedi.',
      questions: [
        {
          question: 'Quali turni può coprire?',
          why: 'Nella pratica la domanda più importante; spesso decide da sola.',
          tip: 'Rispondi con chiarezza e onestà. Porre un limite ora è meglio che lasciare dopo due settimane.',
        },
        {
          question: 'Come si assicura di preparare senza errori?',
          why: 'Il tasso di errore è l’indicatore di qualità centrale di ogni piattaforma.',
          tip: 'Cita una routine concreta: leggere il codice invece di controllare a vista, verifica alla postazione di imballo, chiedere in caso di dubbio.',
        },
        {
          question: 'Cosa fa se la giacenza non corrisponde al sistema?',
          why: 'Si valuta se segnali o se correggi in silenzio.',
          tip: 'Ricontare, segnalare, registrare la rettifica nel sistema — mai pareggiare senza movimento.',
        },
        {
          question: 'Quali sistemi e attrezzature conosce?',
          why: 'Determina il tempo di inserimento.',
          tip: 'Cita sistema, attrezzatura e attività — ad esempio preparazione in radiofrequenza in SAP EWM.',
        },
        {
          question: 'Come gestisce la pressione prima della chiusura delle spedizioni?',
          why: 'Il momento di tensione quotidiano del magazzino.',
          tip: 'Stabilire priorità, avvisare presto se sarà stretto e non tagliare sulla sicurezza.',
        },
        {
          question: 'A cosa presta attenzione in materia di sicurezza?',
          why: 'Gli infortuni sono la voce di costo maggiore del settore.',
          tip: 'Cita cose concrete: corsie pedonali, ancoraggio dei carichi, visibilità in manovra, dispositivi di protezione.',
        },
      ],
      redFlags: [
        'Accettare turni che poi non si riusciranno a sostenere.',
        'Presentare una differenza di giacenza come una sciocchezza.',
        'Mostrarsi disinteressati durante la visita al magazzino.',
      ],
      askThem: [
        'Qual è il regime dei turni e come vengono calcolate le maggiorazioni?',
        'Quali indicatori vengono misurati per persona?',
        'Com’è l’affiancamento iniziale e chi lo segue?',
      ],
      faq: [
        {
          question: 'Il patentino viene verificato durante il colloquio?',
          answer:
            'L’attestato viene controllato e alcune piattaforme aggiungono una breve prova di guida. Portalo sempre: senza documento non puoi condurre il mezzo, per quanta esperienza tu abbia.',
        },
        {
          question: 'Come spiego missioni brevi e ravvicinate in somministrazione?',
          answer:
            'Con naturalezza: le missioni le stabilisce l’agenzia, non tu. Cita le piattaforme e cosa facevi in ciascuna — si legge come ampiezza di esperienza, non come instabilità.',
        },
      ],
    },
  },
};
