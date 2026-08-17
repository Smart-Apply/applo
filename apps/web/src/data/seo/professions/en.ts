import type { ProfessionCatalog } from '../types';

/**
 * English profession content.
 *
 * Adapted, not translated: hiring conventions differ per market, so the
 * advice differs too. No photo, no reference letters, résumé instead of the
 * German Lebenslauf, and certifications that are actually recognised in
 * English-speaking markets.
 */
export const professionsEn: ProfessionCatalog = {
  'software-developer': {
    name: 'Software Developer',
    application: {
      slug: 'software-developer',
      metaTitle: 'Software Developer Cover Letter and Résumé: What to Include',
      metaDescription:
        'What a software developer application needs: ATS keywords, the skills hiring managers screen for, certifications, a sample opening line and the usual mistakes.',
      heading: 'Writing a software developer application',
      intro:
        'Developer applications are rarely won by the cover letter alone — recruiters and applicant tracking systems look for stack, project scale and measurable impact first. Listing technologies puts you next to hundreds of identical profiles; naming what you owned and what changed does not.',
      atsKeywords: [
        'Software development',
        'TypeScript',
        'Java',
        'Python',
        'REST API',
        'Microservices',
        'CI/CD',
        'Docker',
        'Kubernetes',
        'Git',
        'Code review',
        'Agile / Scrum',
        'Unit testing',
        'Cloud (AWS/Azure)',
      ],
      hardSkills: [
        {
          label: 'A stack written the way the job ad writes it',
          detail:
            'Language, framework, database and cloud, spelled exactly as the posting spells them — "TypeScript" and "JavaScript" are two different words to a parser.',
        },
        {
          label: 'System design',
          detail:
            'Past three years of experience, teams expect you to design interfaces and defend trade-offs, not just close tickets.',
        },
        {
          label: 'Testing and release practice',
          detail:
            'Unit and integration tests, pipelines, code review — the part of your work that shows whether your code is still maintainable in six months.',
        },
        {
          label: 'Measurable impact',
          detail:
            'Load time halved, error rate down, deploys moved from weekly to daily. One number from your own work beats any adjective.',
        },
      ],
      softSkills: [
        'Explaining technical decisions to non-technical stakeholders',
        'Giving useful code review feedback',
        'Working independently across time zones',
        'Prioritising under deadline pressure',
        'Willingness to read other people’s code',
      ],
      certifications: [
        'AWS Certified Developer – Associate',
        'Microsoft Certified: Azure Developer Associate',
        'Certified Kubernetes Application Developer (CKAD)',
        'Professional Scrum Developer (PSD I)',
      ],
      cvFocus: [
        {
          label: 'Projects, not duty lists',
          detail:
            'Two or three projects per role with context: team size, your part in it, technologies, outcome.',
        },
        {
          label: 'A GitHub profile worth linking',
          detail:
            'One well-kept repository with a real README replaces a paragraph of self-description. An abandoned profile costs you more than no link.',
        },
        {
          label: 'Skills grouped by depth',
          detail:
            'Separate what you use daily from what you tried once — the technical interview will test exactly that line.',
        },
      ],
      coverLetterOpener:
        'Your posting mentions breaking a monolith into services — that is what I led at [Company] for a team of eight, taking deployment frequency from weekly to daily along the way.',
      mistakes: [
        {
          label: 'A cover letter that repeats the tech stack',
          detail:
            'The résumé already lists it. The letter has to answer why this product, in a way no other applicant could copy.',
        },
        {
          label: 'Claiming seniority instead of showing it',
          detail:
            '"Senior" convinces nobody. Owning a migration, running the review process, onboarding new engineers does.',
        },
        {
          label: 'Sending the same application everywhere',
          detail:
            'No reference to the product reads as interchangeable. One specific sentence about their domain lifts you out of the pile.',
        },
      ],
      faq: [
        {
          question: 'Do developers still need a cover letter?',
          answer:
            'At larger and more traditional employers, yes. At startups and many US tech companies a résumé plus GitHub is enough. When in doubt write half a page: missing entirely, it looks incomplete; longer than that, it does not get read.',
        },
        {
          question: 'How much do certifications matter versus projects?',
          answer:
            'Projects win almost every time. Cloud certifications mainly help when you are moving into an environment you have no production experience in — they open the first door, they do not replace references.',
        },
        {
          question: 'Should I include a photo?',
          answer:
            'No. In the US, UK, Ireland, Canada and Australia a photo on a résumé is a liability — many employers discard photo résumés to avoid discrimination claims. Continental European employers are the exception.',
        },
      ],
    },
    interview: {
      slug: 'software-developer',
      metaTitle: 'Software Developer Interview Questions and How to Answer Them',
      metaDescription:
        'The questions developers actually get asked, what each one is really testing, how to structure your answer, and the answers that cost people the offer.',
      heading: 'Software developer interview questions',
      intro:
        'Most developer loops have three parts: motivation, technical depth, and a live or take-home coding exercise. Candidates rarely fail on the exercise itself — they fail by solving it silently, when the reasoning is the thing being assessed.',
      questions: [
        {
          question: 'Tell me about a hard technical problem you solved.',
          why: 'Tests whether you can narrow a problem down, and whether you understood the root cause or just changed things until it worked.',
          tip: 'Four beats: the symptom, how you narrowed it, the actual cause, what you changed so it could not recur.',
        },
        {
          question: 'Why did you choose that architecture?',
          why: 'There is no right answer — they want to know whether you know the alternatives and can name the downsides.',
          tip: 'Name the option you rejected and why. Anyone who cannot find a drawback in their own design has not stress-tested it.',
        },
        {
          question: 'How do you keep your code maintainable?',
          why: 'Checks whether you think past the merge — tests, reviews, documentation, naming.',
          tip: 'Describe what your last team actually did, not textbook principles.',
        },
        {
          question: 'How do you approach code you did not write?',
          why: 'The job is mostly legacy code. Teams want to know whether you change it carefully or want to rewrite it on sight.',
          tip: 'Describe how you build a safety net first: add tests, small steps, ship early.',
        },
        {
          question: 'Tell me about a disagreement in a code review.',
          why: 'Behavioural: can you hold a technical position without damaging the working relationship?',
          tip: 'Finish with the outcome and what you took from it — including when you were the one who conceded.',
        },
        {
          question: 'What do you do when an estimate stops being realistic?',
          why: 'This is about communication with product and stakeholders, not about engineering.',
          tip: 'Flag early and bring options — scope, date, quality — rather than only the problem.',
        },
      ],
      redFlags: [
        'Typing in silence during the coding exercise — the reasoning is what gets scored.',
        'Speaking badly about previous teams or codebases.',
        'Answering "do you know X?" with a vague yes instead of placing your actual level honestly.',
      ],
      askThem: [
        'What does the path from merge to production look like, and how long does it take?',
        'How much of a sprint goes to technical debt?',
        'Who decides what gets built, and where do engineers come into that?',
      ],
      faq: [
        {
          question: 'How should I prepare for the coding round?',
          answer:
            'Practise thinking out loud, not just solving. Take a medium problem and narrate every step as if someone were sitting next to you — that narration is what is being scored in almost every process.',
        },
        {
          question: 'Am I allowed to use AI tools in a take-home?',
          answer:
            'Ask. Many companies now explicitly allow it and then question your decisions in the follow-up. Using it quietly and being unable to explain the result is the worst possible outcome.',
        },
      ],
    },
  },

  nurse: {
    name: 'Nurse',
    application: {
      slug: 'nurse',
      metaTitle: 'Nursing Application: Cover Letter, Résumé and Credentials',
      metaDescription:
        'What a nursing application needs: licence and credential details, the specialty that decides the shortlist, ATS keywords, a sample opening and common mistakes.',
      heading: 'Writing a nursing application',
      intro:
        'The nursing market favours you — but your application still decides which unit you land on and at what band. Complete, current credentials and a clearly named specialty matter more here than any turn of phrase.',
      atsKeywords: [
        'Registered Nurse (RN)',
        'Patient care',
        'Care planning',
        'Medication administration',
        'Wound care',
        'Intensive care (ICU)',
        'Emergency (ED)',
        'Palliative care',
        'Electronic health records (EHR)',
        'Infection control',
        'Clinical documentation',
        'Preceptorship',
      ],
      hardSkills: [
        {
          label: 'Licence and registration',
          detail:
            'Licence number, issuing body and expiry belong at the top — NMC, state board or the equivalent. Recruiters verify this before anything else.',
        },
        {
          label: 'Specialty, not "nursing"',
          detail:
            'ICU, ED, theatre, oncology, care of the elderly, community. The specialty is the first filter applied to your file.',
        },
        {
          label: 'Certifications with expiry dates',
          detail:
            'BLS, ACLS, PALS, and specialty certifications. An expired certification stalls onboarding for weeks.',
        },
        {
          label: 'EHR systems',
          detail:
            'Epic, Cerner, Meditech — naming the system you already know shortens the trust that unit has to build in you.',
        },
      ],
      softSkills: [
        'Staying steady through shift work',
        'Talking with families in the worst hour of their week',
        'Working across the multidisciplinary team',
        'Composure in an acute deterioration',
        'Empathy that does not consume you',
      ],
      certifications: [
        'Basic Life Support (BLS) / Advanced Cardiac Life Support (ACLS)',
        'Critical Care Registered Nurse (CCRN)',
        'Certified Emergency Nurse (CEN)',
        'Paediatric Advanced Life Support (PALS)',
      ],
      cvFocus: [
        {
          label: 'Facility type and unit size',
          detail:
            'Teaching hospital, district general, nursing home, community. Bed count and patient ratio say more about your day than any duty list.',
        },
        {
          label: 'Ratios and acuity',
          detail:
            'The patient-to-nurse ratio you are used to tells a hiring manager immediately whether you will cope with theirs.',
        },
        {
          label: 'Availability and shift pattern',
          detail: 'Preferred hours, nights, weekends and start date belong on page one.',
        },
      ],
      coverLetterOpener:
        'After four years on a twelve-bed mixed ICU I am moving into palliative care — the specialty I came to during my end-of-life care certification and have wanted to practise in full ever since.',
      mistakes: [
        {
          label: 'Promising to send credentials later',
          detail:
            'Without a verifiable licence you cannot be hired. Incomplete files get set aside rather than rejected, and quietly expire.',
        },
        {
          label: 'Leaving the specialty open',
          detail: '"I am flexible" reads as "I do not know what I want" and lands on the reserve list.',
        },
        {
          label: 'Writing only about burnout',
          detail:
            'Every employer knows about staffing. Saying what conditions would make you stay reads as clear-eyed rather than exhausted.',
        },
      ],
      faq: [
        {
          question: 'How do I apply with a nursing qualification from another country?',
          answer:
            'Include the registration decision from the regulator, or the application reference and current stage if it is still in progress. Many employers hire ahead of full registration and support the process, but they need the stage in writing.',
        },
        {
          question: 'What English level is expected?',
          answer:
            'Regulators typically require IELTS or OET at a set level, and it is a registration condition rather than a nice-to-have. List the certificate and the score on the résumé itself.',
        },
        {
          question: 'Should I list my licence number?',
          answer:
            'Yes — registration number, regulator and expiry. It is public, verifiable information and leaving it out simply adds a round of email before anyone can progress your file.',
        },
      ],
    },
    interview: {
      slug: 'nurse',
      metaTitle: 'Nursing Interview Questions and How to Answer Them',
      metaDescription:
        'Common nursing interview questions, what each one is really assessing, how to structure an answer, and what to ask the ward manager back.',
      heading: 'Nursing interview questions',
      intro:
        'Nursing interviews are usually run by the ward or unit manager, often with a senior nurse present. They test judgement rather than textbook knowledge: how you prioritise under load, how you speak to families, and whether you will fit the team on shift.',
      questions: [
        {
          question: 'How do you prioritise when you cannot get to everyone?',
          why: 'The defining question of the job. They want to see triage, not stamina.',
          tip: 'Describe your order of assessment, when you escalate, and how you document it — not that you "always manage".',
        },
        {
          question: 'Tell me about a difficult conversation with a family.',
          why: 'Family conflict drains a ward. They are listening for de-escalation, not for who was right.',
          tip: 'Listen, explain the clinical picture, set a boundary, refer on — in that order.',
        },
        {
          question: 'What do you do when you make an error?',
          why: 'Safety culture. A unit that asks this openly wants to hear that you report rather than quietly correct.',
          tip: 'Make the patient safe, report immediately, document, complete the incident report. A real example lands far harder than an intention.',
        },
        {
          question: 'Why are you leaving your current post?',
          why: 'Tests whether you are running from something or towards something.',
          tip: 'Name what you are looking for — specialty, development, rota reliability — not what your last employer got wrong.',
        },
        {
          question: 'How do you feel about nights and weekends?',
          why: 'Pure planning. An honest answer here saves both sides a failed probation.',
          tip: 'State clearly what you can and cannot sustain. Naming a fixed constraint now beats withdrawing later.',
        },
        {
          question: 'How do you keep your practice current?',
          why: 'Guidelines change, and units with a quality focus ask deliberately.',
          tip: 'Name specific training from the last two years, plus how you pass it on to the team.',
        },
      ],
      redFlags: [
        'Speaking about former colleagues or patients in a way that breaches confidence — it is being observed in the interview too.',
        'Claiming you are never overwhelmed.',
        'Asking nothing about the unit, the rota or the induction.',
      ],
      askThem: [
        'What is the actual staffing ratio on days, nights and weekends?',
        'How long is the induction, and who supervises it?',
        'How reliable is the roster — how often do staff get called in at short notice?',
      ],
      faq: [
        {
          question: 'Will clinical knowledge be tested?',
          answer:
            'Often, but as a scenario rather than an exam: an acute deterioration where you talk through your actions. Recognising your limits and saying when you escalate matters more than a textbook-perfect answer.',
        },
        {
          question: 'Can I ask about staffing and escalation policy?',
          answer:
            'Yes — it is the single most informative question available to you. Units with a working escalation policy answer it concretely; an evasive answer at that point is itself the information you needed.',
        },
      ],
    },
  },

  'project-manager': {
    name: 'Project Manager',
    application: {
      slug: 'project-manager',
      metaTitle: 'Project Manager Cover Letter and Résumé: What Actually Works',
      metaDescription:
        'Project management applications: the numbers that convince, the certifications that count, a sample opening line and the mistakes that get files rejected.',
      heading: 'Writing a project manager application',
      intro:
        'Project management is the profession where the most is claimed and the least is evidenced. Naming budget, team size, duration and outcome for each project puts you ahead of most applicants before you have written a single word about methodology.',
      atsKeywords: [
        'Project management',
        'Stakeholder management',
        'Budget ownership',
        'Risk management',
        'Scrum',
        'Kanban',
        'PRINCE2',
        'Milestone planning',
        'Resource planning',
        'Jira',
        'MS Project',
        'Change management',
        'Steering committee reporting',
        'Programme delivery',
      ],
      hardSkills: [
        {
          label: 'Project metrics',
          detail:
            'Budget, team size, duration, number of departments involved — four numbers that make a project description credible instantly.',
        },
        {
          label: 'Methodology with evidence',
          detail:
            'Waterfall, agile or hybrid: say what you actually ran and where the limits were. "Both" without an example reads as neither.',
        },
        {
          label: 'Tooling',
          detail: 'Jira, Confluence, MS Project, Smartsheet, Asana — ATS filters look for these names literally.',
        },
        {
          label: 'Who you reported to',
          detail:
            'A steering committee or a board audience says more about your level than any job title on the page.',
        },
      ],
      softSkills: [
        'Leading without authority',
        'Mediating between departments',
        'Deciding under uncertainty',
        'Presenting to executives',
        'Saying no to scope',
      ],
      certifications: [
        'PMP (Project Management Professional)',
        'PRINCE2 Practitioner',
        'Professional Scrum Master (PSM I/II)',
        'PMI Agile Certified Practitioner (PMI-ACP)',
      ],
      cvFocus: [
        {
          label: 'A project list as its own block',
          detail: 'Three to five reference projects with sector, value, your role and outcome, separate from the career history.',
        },
        {
          label: 'Explain a sector change',
          detail:
            'Project management is called transferable and rarely read that way. Name what carries across from your industry.',
        },
        {
          label: 'Outcome, not activity',
          detail: '"Delivered on time and 8% under budget" instead of "responsible for delivery".',
        },
      ],
      coverLetterOpener:
        'For two years I led the ERP rollout at [Company]: £1.2m budget, six sites, 40 people involved — and a go-live with no production downtime.',
      mistakes: [
        {
          label: 'A catalogue of methods instead of results',
          detail:
            'A list of frameworks proves reading, not delivery. One project with numbers outweighs all of it.',
        },
        {
          label: 'Blurring your own role',
          detail: '"We implemented" leaves open whether you led or attended. Say what you personally owned.',
        },
        {
          label: 'Hiding the projects that failed',
          detail:
            'Experienced interviewers ask for one deliberately. A stopped project with a lesson reads as more senior than a flawless record.',
        },
      ],
      faq: [
        {
          question: 'Is a PMP or PRINCE2 certification worth it for applications?',
          answer:
            'It helps most in large enterprises, the public sector and tender-driven work, where it is sometimes a formal requirement. In product organisations, reference projects count for considerably more. The people who gain most are those with little documented delivery history.',
        },
        {
          question: 'How do I describe projects covered by an NDA?',
          answer:
            'Anonymise the client and give sector, scale and outcome instead: "automotive supplier, £250m revenue, migration of 14 legacy systems". That is permissible and more informative than a recognisable name with no context.',
        },
        {
          question: 'How do I move from specialist into project management?',
          answer:
            'List workstream leadership, coordination roles and deputising as separate line items. Most successful moves happen internally or within the same sector, where your domain knowledge offsets the missing delivery record.',
        },
      ],
    },
    interview: {
      slug: 'project-manager',
      metaTitle: 'Project Manager Interview Questions and How to Answer Them',
      metaDescription:
        'Project management interview questions from escalation to scope creep to the project that failed — what each tests and how to structure your answer.',
      heading: 'Project manager interview questions',
      intro:
        'Nearly every project management question is a behavioural question. They are not testing methodology knowledge, they are asking for a real case from your working life, told in a structure someone who was not there can follow.',
      questions: [
        {
          question: 'Tell me about a project that went off the rails.',
          why: 'The single most important question. They want to know whether you correct early or only discover it at the milestone.',
          tip: 'When you noticed, what tipped you off, what you changed, what the outcome was. Pick a real one, not the mildest one.',
        },
        {
          question: 'How do you handle scope creep?',
          why: 'Tests whether you manage requirements or just pass them on.',
          tip: 'Describe your change process: assess, quantify the effect on date and budget, escalate the decision — do not simply refuse.',
        },
        {
          question: 'How do you lead a team you have no authority over?',
          why: 'The core of the role. They are listening for influence through transparency and reliability.',
          tip: 'Give an example where you won over someone who genuinely had no time for your project.',
        },
        {
          question: 'When do you escalate, and how?',
          why: 'Too early reads as weak, too late as reckless. They want your threshold.',
          tip: 'Define the trigger — date, budget or quality no longer holdable — and escalate with an option, not just a problem.',
        },
        {
          question: 'How do you choose between two equally senior stakeholders?',
          why: 'Tests whether you push decisions to where they belong.',
          tip: 'Make the criteria visible, have them decide together, document the decision.',
        },
        {
          question: 'How do you measure project success?',
          why: 'Separates delivery thinking from outcome thinking.',
          tip: 'Beyond time, budget and scope, name the benefit after go-live: adoption, hours saved, defects avoided.',
        },
      ],
      redFlags: [
        'Describing only successful projects.',
        'Attributing every delay to the business, IT or a supplier.',
        'Being unable to give a single number about your own project when asked.',
      ],
      askThem: [
        'Who decides project priority here, and how often does the order change?',
        'How do the project and line organisations sit relative to each other?',
        'Which project failed most recently, and what did the company change afterwards?',
      ],
      faq: [
        {
          question: 'Should I recommend a methodology in the interview?',
          answer:
            'Only with reasoning drawn from their context. "I would run this hybrid, because the hardware delivery has fixed dates while the software can iterate" shows judgement. A general commitment to "agile" reads as unexamined.',
        },
        {
          question: 'How do I handle a case study exercise?',
          answer:
            'Ask questions before you plan. Interviewers almost always score the clarifying questions above the finished plan — drawing a timeline immediately is the most common way to lose the exercise.',
        },
      ],
    },
  },

  'sales-representative': {
    name: 'Sales Representative',
    application: {
      slug: 'sales-representative',
      metaTitle: 'Sales Cover Letter and Résumé: The Numbers That Get Interviews',
      metaDescription:
        'Sales applications: which numbers belong in the letter, the ATS keywords that get you through, a sample opening line and the usual mistakes.',
      heading: 'Writing a sales application',
      intro:
        'In sales the application is the first work sample: if you cannot sell yourself, the assumption is you cannot sell anything else. It gets read hard, and it gets read for numbers before anything else.',
      atsKeywords: [
        'Sales',
        'New business development',
        'Account management',
        'B2B sales',
        'Revenue ownership',
        'Quota attainment',
        'CRM (Salesforce, HubSpot)',
        'Pipeline management',
        'Contract negotiation',
        'Cross-selling',
        'Key account management',
        'Lead qualification',
      ],
      hardSkills: [
        {
          label: 'Quota and attainment',
          detail:
            'Annual target, what you actually hit, where that put you in the team. "112% against a $1.8m quota" is the strongest line in your application.',
        },
        {
          label: 'Motion and cycle',
          detail:
            'Inbound or outbound, new business or account growth, B2B or B2C, average deal size, sales cycle length. Every one of these is a filter.',
        },
        {
          label: 'CRM discipline',
          detail:
            'Name the system and what you ran in it. Sales managers ask about pipeline hygiene in almost every interview.',
        },
        {
          label: 'Sector and product',
          detail:
            'Selling complex capital equipment is a different job from fast transactional volume. Place yourself clearly.',
        },
      ],
      softSkills: [
        'Handling rejection across long cycles',
        'Listening instead of presenting',
        'Negotiating to close',
        'Self-management on the road',
        'Building relationships over years',
      ],
      certifications: [
        'Salesforce Certified Administrator',
        'MEDDIC / MEDDPICC certification',
        'Challenger Sales or SPIN Selling training',
        'HubSpot Sales Software certification',
      ],
      cvFocus: [
        {
          label: 'Numbers in every role',
          detail: 'Quota, attainment, revenue owned, accounts held — in each position, not just the latest one.',
        },
        {
          label: 'Territory and travel',
          detail: 'Region, travel share and driving licence belong visibly on page one.',
        },
        {
          label: 'Explain short tenures',
          detail:
            'Moves are common in sales and still get counted. Half a sentence on the reason prevents the obvious assumption.',
        },
      ],
      coverLetterOpener:
        'Over three years I grew the southern territory from $1.2m to $2.1m in annual revenue, mostly through new logos in manufacturing, on an average seven-month sales cycle.',
      mistakes: [
        {
          label: 'No numbers at all',
          detail: 'A sales résumé without quota data is read as a warning sign: people with good numbers publish them.',
        },
        {
          label: 'Adjectives instead of sales understanding',
          detail: '"Customer-focused and results-driven" appears in every second application and says nothing.',
        },
        {
          label: 'No reference to what they sell',
          detail:
            'Sales leaders check specifically whether you understood the product and who it is sold to.',
        },
      ],
      faq: [
        {
          question: 'What if I missed my targets?',
          answer:
            'Include them anyway, with context: a collapsing market, a product transition, a territory built from scratch. Omitted numbers surface in the interview; explained numbers show you understand your own pipeline.',
        },
        {
          question: 'Can I name customers in my application?',
          answer:
            'Well-known reference accounts are fine where the relationship is public. For everything else a description works just as well: "three FTSE 100 logistics accounts" is safe and reads identically.',
        },
        {
          question: 'How should I handle commission and OTE?',
          answer:
            'Only in the application if compensation is asked for, and then as a package: base, variable and what the variable was measured against. The base-to-variable split is an interview conversation, not a cover letter one.',
        },
      ],
    },
    interview: {
      slug: 'sales-representative',
      metaTitle: 'Sales Interview Questions and How to Answer Them',
      metaDescription:
        'Sales interviews: objection handling, pipeline, lost deals and the role play — what is being assessed and how to answer with numbers.',
      heading: 'Sales interview questions',
      intro:
        'A sales interview is itself a sales conversation and is scored as one. Almost all include a numbers round, and many include a short role play where you have to pitch or handle an objection live.',
      questions: [
        {
          question: 'What were your numbers over the last three years?',
          why: 'The opening question. They are assessing not only the figures but whether you carry your own metrics in your head.',
          tip: 'Quota, attainment, team ranking — per year. Hesitating here is the worst possible answer.',
        },
        {
          question: 'Sell me this product.',
          why: 'They are testing whether you ask before you talk.',
          tip: 'Open with three discovery questions. Reeling off features immediately loses the exercise.',
        },
        {
          question: 'How do you handle "it is too expensive"?',
          why: 'Tests whether you think in value or in discount.',
          tip: 'Ask what "too expensive" is being compared against, then build the value case. Discounting first reads as weakness.',
        },
        {
          question: 'What does your pipeline look like right now?',
          why: 'Checks method: how many deals at which stage, at what probability.',
          tip: 'Describe your stage definitions and your pipeline-to-quota ratio — 3x to 4x is the usual expectation.',
        },
        {
          question: 'Tell me about a deal you lost.',
          why: 'Self-awareness. Anyone who never loses is either underselling or not being straight.',
          tip: 'Name the reason, what you spotted too late, and what you have done differently since.',
        },
        {
          question: 'How do you win new business with no warm leads?',
          why: 'Establishes whether you can genuinely do outbound or have only worked inbound.',
          tip: 'Describe your cadence concretely: research, first touch, follow-up rhythm — with numbers from your own week.',
        },
      ],
      redFlags: [
        'Not knowing your own numbers, or answering evasively.',
        'Talking instead of asking in the role play.',
        'Crediting every win to the product or the market.',
      ],
      askThem: [
        'How is quota set, and how many of the team hit it last year?',
        'What is the base-to-variable split, and when does commission pay out?',
        'Where do leads come from, and how much outbound is expected?',
      ],
      faq: [
        {
          question: 'How do I prepare for the role play?',
          answer:
            'Research their product and their buyers, then prepare five good discovery questions. The exercise almost never tests product knowledge — it tests whether you run the conversation, questions first and value second.',
        },
        {
          question: 'Should I close in the interview?',
          answer:
            'Yes, in the sense expected in sales: ask clearly about next steps and timelines at the end. An aggressive attempt to close on the job itself reads as performance rather than skill.',
        },
      ],
    },
  },

  accountant: {
    name: 'Accountant',
    application: {
      slug: 'accountant',
      metaTitle: 'Accountant Cover Letter and Résumé: What Recruiters Screen For',
      metaDescription:
        'Accounting applications: the software, standards and close experience that decide the shortlist, plus a sample opening and common mistakes.',
      heading: 'Writing an accounting application',
      intro:
        'Accounting applications are rarely filtered on personality. They are filtered on three things: which systems you know, how far through the close you work independently, and under which reporting standard. Answer those in the first lines or you do not get read.',
      atsKeywords: [
        'Financial accounting',
        'Accounts payable',
        'Accounts receivable',
        'Month-end close',
        'Year-end close',
        'IFRS',
        'GAAP',
        'VAT / sales tax returns',
        'SAP FI',
        'Fixed assets',
        'Account reconciliation',
        'Intercompany reconciliation',
        'Accruals and provisions',
        'Audit support',
      ],
      hardSkills: [
        {
          label: 'How far you close independently',
          detail:
            'Month-end, quarter-end or full year-end — done alone or assisting. This is the decisive selection criterion.',
        },
        {
          label: 'Software plus module',
          detail:
            'SAP FI/CO, Oracle, NetSuite, Xero, Sage — and the module. A bare product name without the module says very little.',
        },
        {
          label: 'Reporting standard',
          detail:
            'IFRS, local GAAP, or both. Group-level applications routinely fail because IFRS is missing from the résumé.',
        },
        {
          label: 'Indirect tax and filings',
          detail:
            'VAT returns, reverse charge, intra-community supplies — mandatory knowledge at any internationally trading company.',
        },
      ],
      softSkills: [
        'Accuracy at high transaction volume',
        'Hitting close deadlines',
        'Working with auditors and advisers',
        'Discretion with payroll and financial data',
        'Patience with queries from the business',
      ],
      certifications: [
        'ACCA / ACA (chartered accountant)',
        'CIMA (management accounting)',
        'CPA (Certified Public Accountant)',
        'AAT Level 4 / equivalent bookkeeping qualification',
      ],
      cvFocus: [
        {
          label: 'Company size and volume',
          detail:
            'A 40-person business or a group with 12 entities — that context frames how all your experience is read.',
        },
        {
          label: 'Name the close activities explicitly',
          detail: '"Assisted with year-end" and "prepared year-end" are two different jobs.',
        },
        {
          label: 'Systems as their own block',
          detail: 'Products, modules and years of use as a short table — that is how it actually gets read.',
        },
      ],
      coverLetterOpener:
        'For five years I have prepared the month-end close under IFRS for three entities running roughly 1,800 documents a month, and I support the year-end close independently in SAP FI.',
      mistakes: [
        {
          label: 'Listing "accounting" as the duty',
          detail:
            'Payables, receivables, fixed assets and close are distinct profiles. Without differentiation you match no posting precisely.',
        },
        {
          label: 'Claiming software without depth',
          detail:
            '"SAP experience" gets tested in interview. Name modules and tasks or it reads as inflated.',
        },
        {
          label: 'Omitting recent training',
          detail:
            'Tax and reporting rules change yearly. With no recent CPD, the impression is that you are working to an old standard.',
        },
      ],
      faq: [
        {
          question: 'How much does a chartered qualification matter?',
          answer:
            'For roles carrying close or reporting responsibility it is often an explicit requirement and the biggest single salary lever in the profession. For payables and receivables roles it is not needed — volume and system fluency count for more.',
        },
        {
          question: 'Does practice experience count in industry?',
          answer:
            'Yes, it reads as broad grounding across many clients and entity types. Add which sectors and which close activities you covered, otherwise it stays unspecific and gets discounted.',
        },
        {
          question: 'Should I state salary expectations?',
          answer:
            'If the posting asks, yes — leaving it out looks incomplete. Anchor on company size and the level of close responsibility rather than on years of experience alone.',
        },
      ],
    },
    interview: {
      slug: 'accountant',
      metaTitle: 'Accounting Interview Questions and How to Answer Them',
      metaDescription:
        'Accounting interviews: close responsibility, reconciliation differences, errors and systems — what is tested and what to ask back.',
      heading: 'Accounting interview questions',
      intro:
        'Accounting interviews are more technical than most. The head of finance is usually in the room, testing against concrete scenarios whether you really work independently. A short technical section is the rule rather than the exception.',
      questions: [
        {
          question: 'Which closes do you prepare independently?',
          why: 'The core grading question — it decides both the role and the salary band.',
          tip: 'Be exact: month-end independently, year-end supporting. Overstatement shows up within the first close.',
        },
        {
          question: 'How do you handle a difference in a reconciliation?',
          why: 'Tests method rather than memory.',
          tip: 'Describe your process: narrow by period and account, check the posting batches, find the document, document the correction.',
        },
        {
          question: 'What is your experience with IFRS versus local GAAP?',
          why: 'Establishes whether you are deployable in a group environment.',
          tip: 'Name concrete differences you have worked with — provisions or leases, for example.',
        },
        {
          question: 'Tell me about a mistake you made.',
          why: 'More important here than elsewhere: they want someone who reports rather than quietly fixes.',
          tip: 'Error, impact, who you told, correction, control introduced — in that order.',
        },
        {
          question: 'How do you keep up with changes in reporting and tax rules?',
          why: 'Tests initiative in a field whose rules change annually.',
          tip: 'Name sources and specific CPD, not "professional literature".',
        },
        {
          question: 'How do you work under close deadlines?',
          why: 'Close week is the stress test of the job.',
          tip: 'Describe your sequence and how you get inputs from other departments in time.',
        },
      ],
      redFlags: [
        'Claiming system knowledge that the technical section does not bear out.',
        'Presenting errors as another department’s fault.',
        'Being unable to name any recent professional development.',
      ],
      askThem: [
        'How many entities and what volume does the team handle, and how is the work split?',
        'What does the close look like, and how many working days does it take?',
        'Which systems are in use, and are any migrations planned?',
      ],
      faq: [
        {
          question: 'Is there a technical test?',
          answer:
            'Frequently, and usually short: a few journal entries, an accrual, or a VAT question. It targets baseline confidence rather than exam depth — expect standard scenarios from the role itself.',
        },
        {
          question: 'How do I explain moving from practice into industry?',
          answer:
            'As wanting depth over breadth: following one business through the year instead of many clients in parallel. That is the accepted reason — avoid resting the explanation on workload alone.',
        },
      ],
    },
  },

  'marketing-manager': {
    name: 'Marketing Manager',
    application: {
      slug: 'marketing-manager',
      metaTitle: 'Marketing Manager Cover Letter and Résumé: KPIs That Convince',
      metaDescription:
        'Marketing applications: which KPIs to lead with, the channels and tools that get parsed, a sample opening line and the usual mistakes.',
      heading: 'Writing a marketing manager application',
      intro:
        'Marketing applications rarely fail on design and almost always on missing numbers. Name channel, budget and result and you are read as a manager; list campaigns and you are read as an executor.',
      atsKeywords: [
        'Digital marketing',
        'Campaign management',
        'SEO',
        'Paid search / Google Ads',
        'Content marketing',
        'Email marketing',
        'Social media',
        'Marketing automation (HubSpot)',
        'Google Analytics 4',
        'Conversion rate',
        'CAC / ROAS',
        'Budget ownership',
        'Brand management',
        'A/B testing',
      ],
      hardSkills: [
        {
          label: 'KPIs with a baseline',
          detail:
            '"Cut CAC from £180 to £120" says more than any percentage without a starting point. Always give both numbers.',
        },
        {
          label: 'Channel depth over channel lists',
          detail:
            'Two channels you genuinely run beat eight you have touched. Name the budget you owned alongside them.',
        },
        {
          label: 'Tools and data',
          detail: 'GA4, HubSpot, Salesforce Marketing Cloud, Looker Studio — ATS filters search these names literally.',
        },
        {
          label: 'B2B or B2C',
          detail:
            'Long buying cycles with lead nurturing is a different profession from performance marketing in e-commerce.',
        },
      ],
      softSkills: [
        'Working with sales and product',
        'Managing agencies and freelancers',
        'Prioritising a constrained budget',
        'Defending results to executives',
        'Editorial judgement',
      ],
      certifications: [
        'Google Ads certifications (Search, Performance Max)',
        'Google Analytics 4 certification',
        'HubSpot Inbound Marketing / Marketing Software',
        'Meta Certified Marketing Science Professional',
      ],
      cvFocus: [
        {
          label: 'One result per role',
          detail: 'A single metric that demonstrably moved because of your work. That is enough.',
        },
        {
          label: 'Budget and team size',
          detail: 'Whether you ran £30k or £3m decides which level of role you are read for.',
        },
        {
          label: 'Link a portfolio',
          detail:
            'Two or three campaigns with goal, execution and result, as a page or PDF. One link replaces a page of description.',
        },
      ],
      coverLetterOpener:
        'At [Company] I owned a £40k monthly performance budget and brought cost per lead from £94 to £61 within two quarters, with no drop in the sales team’s close rate.',
      mistakes: [
        {
          label: 'Creativity without effect',
          detail: 'A beautifully executed campaign with no outcome convinces no leadership team. Always name the goal behind it.',
        },
        {
          label: 'Claiming too many channels',
          detail: 'Expertise everywhere reads as expertise nowhere — and unravels quickly in the interview.',
        },
        {
          label: 'Over-designing the application',
          detail:
            'Elaborate layouts frequently parse into nonsense in an ATS. A clean résumé plus a linked portfolio is the safe route.',
        },
      ],
      faq: [
        {
          question: 'Do I need a portfolio as a marketing manager?',
          answer:
            'For content and creative roles yes; for performance and analytics roles a metrics summary is worth more. Either way a link is enough — attachments over 5MB are routinely bounced by mail servers.',
        },
        {
          question: 'How do I handle KPIs I am not allowed to publish?',
          answer:
            'Use relative figures: "increased conversion rate by 34%" instead of absolute revenue. That stays within confidentiality and is entirely sufficient to judge your work.',
        },
        {
          question: 'How much do AI skills matter in marketing now?',
          answer:
            'They are increasingly expected, but as a tool rather than an end in itself. What convinces is describing which process you accelerated and how you still guarantee quality.',
        },
      ],
    },
    interview: {
      slug: 'marketing-manager',
      metaTitle: 'Marketing Manager Interview Questions and How to Answer Them',
      metaDescription:
        'Marketing interviews: campaigns, KPIs, budget and failure — what each question is really testing and how to structure an answer.',
      heading: 'Marketing manager interview questions',
      intro:
        'Marketing interviews almost always take one campaign apart in detail. You are expected to separate goal, audience, budget, result and your own contribution cleanly — which is where most candidates come unstuck.',
      questions: [
        {
          question: 'Tell me about a campaign you are proud of.',
          why: 'Tests whether you think in goals or in activities.',
          tip: 'Goal, audience, channel, budget, result, your part — in that order, in two minutes.',
        },
        {
          question: 'Which campaign failed, and why?',
          why: 'Marketing is iterative. Anyone who has never killed a campaign has never really tested.',
          tip: 'Name the hypothesis, what disproved it, and what you changed as a result.',
        },
        {
          question: 'Which metric do you look at daily?',
          why: 'Separates operational steering from month-end reporting.',
          tip: 'Name one and justify why it represents the business best.',
        },
        {
          question: 'How would you improve our marketing?',
          why: 'Tests preparation. Almost every candidate answers generically.',
          tip: 'Two concrete observations from their site or their ads, with reasoning.',
        },
        {
          question: 'How do you work with sales?',
          why: 'The most common fault line in B2B organisations.',
          tip: 'Describe shared lead definitions and feedback loops on lead quality, not just handovers.',
        },
        {
          question: 'How do you allocate a constrained budget?',
          why: 'Tests prioritisation and testing culture.',
          tip: 'Describe a split between proven spend and tests, with a criterion for cutting a test.',
        },
      ],
      redFlags: [
        'Quoting metrics you cannot derive when questioned.',
        'Taking credit for every success and blaming budget for every failure.',
        'Not having looked at the company’s product before the interview.',
      ],
      askThem: [
        'Which metric decides whether marketing is succeeding here?',
        'How is budget split between brand and performance?',
        'How closely do marketing and sales work on the lead definition?',
      ],
      faq: [
        {
          question: 'Should I prepare a case study unprompted?',
          answer:
            'If none is set, two concrete observations about their marketing are enough. That reads as prepared without being presumptuous — an unrequested full plan from outside usually reads as under-informed.',
        },
        {
          question: 'How do I handle questions about tools I do not know?',
          answer:
            'Place yourself honestly and name the analogue: "I have not used HubSpot, but I ran Marketo in the same function." Marketing tools are learnable; false claims surface in week one.',
        },
      ],
    },
  },

  'data-analyst': {
    name: 'Data Analyst',
    application: {
      slug: 'data-analyst',
      metaTitle: 'Data Analyst Cover Letter and Résumé: What Gets You Shortlisted',
      metaDescription:
        'Data analyst applications: the tools and methods that belong in your profile, how to evidence impact, a sample opening and common mistakes.',
      heading: 'Writing a data analyst application',
      intro:
        'Data analysts are not hired on tools — they are hired on whether their analysis changed a decision. Everyone claims SQL. The difference is whether you can say what was done differently after your work.',
      atsKeywords: [
        'Data analysis',
        'SQL',
        'Python',
        'R',
        'Power BI',
        'Tableau',
        'Looker',
        'Data visualisation',
        'ETL',
        'Data warehouse',
        'dbt',
        'A/B testing',
        'KPI reporting',
        'Statistics',
      ],
      hardSkills: [
        {
          label: 'SQL at real depth',
          detail:
            'Window functions, CTEs, query optimisation. Nearly every process includes a SQL test, and surface knowledge shows there immediately.',
        },
        {
          label: 'One BI tool properly',
          detail:
            'Power BI, Tableau or Looker — including the data modelling, not just charts on top of a finished table.',
        },
        {
          label: 'Statistical judgement',
          detail: 'Significance, confidence, sample size: the line between reporting and analysis.',
        },
        {
          label: 'Domain knowledge',
          detail:
            'E-commerce, finance, logistics or healthcare — knowing the sector’s metrics makes you useful from day one.',
        },
      ],
      softSkills: [
        'Explaining findings to non-analysts',
        'Turning vague questions into answerable ones',
        'Scepticism about your own output',
        'Documenting assumptions cleanly',
        'Delivering unwelcome results well',
      ],
      certifications: [
        'Microsoft Certified: Power BI Data Analyst Associate',
        'Tableau Desktop Specialist',
        'Google Data Analytics Professional Certificate',
        'AWS Certified Data Engineer – Associate',
      ],
      cvFocus: [
        {
          label: 'Decisions, not dashboards',
          detail:
            '"Churn analysis drove an onboarding redesign; cancellations down 18%" instead of "built dashboards".',
        },
        {
          label: 'Data scale and sources',
          detail: 'Order of magnitude and number of connected systems show what environment you can work in.',
        },
        {
          label: 'One public work sample',
          detail: 'A notebook or public dashboard with a question and an answer replaces a lot of assertion.',
        },
      ],
      coverLetterOpener:
        'My cohort analysis at [Company] showed that 60% of cancellations happen in the first 30 days — the onboarding rebuild that followed cut churn by 18% the next quarter.',
      mistakes: [
        {
          label: 'A tool list instead of a question',
          detail: 'Every applicant has SQL and Python. Almost none write down the question they answered with them.',
        },
        {
          label: 'Blurring analyst and data scientist',
          detail:
            'Claiming models you never put into production leads straight to awkward questions in the technical round.',
        },
        {
          label: 'Arguing without business context',
          detail: 'A methodologically clean analysis with no visible use convinces no stakeholder.',
        },
      ],
      faq: [
        {
          question: 'Do I need a statistics or computer science degree?',
          answer:
            'No — career changers are common in analytics. What decides it is a solid work sample: a real question, cleanly analysed, clearly presented. Without a degree the sample matters more, not the application length.',
        },
        {
          question: 'How do I evidence experience when company data is confidential?',
          answer:
            'Describe question, method and impact without absolute figures, and add one project on public data. That combination of described practice plus inspectable craft is the standard route.',
        },
        {
          question: 'How do I prepare for the SQL test?',
          answer:
            'Practise joins, aggregation, window functions and CTEs against a real dataset under time pressure. Nearly every process includes one, and it is the most common point of elimination.',
        },
      ],
    },
    interview: {
      slug: 'data-analyst',
      metaTitle: 'Data Analyst Interview Questions and How to Answer Them',
      metaDescription:
        'Data analyst interviews: the SQL test, the case study and the behavioural round — what is assessed and how to answer.',
      heading: 'Data analyst interview questions',
      intro:
        'The process is usually three stages: a SQL test, a case study with an open question, and a conversation with the business stakeholder. Most candidates lose it in the case study — not on the analysis, but by calculating before asking.',
      questions: [
        {
          question: 'A metric dropped 30% overnight. What do you do?',
          why: 'The classic diagnostic question. It tests method, not intuition.',
          tip: 'Rule out data issues first, then segment — region, device, channel, cohort — then test hypotheses.',
        },
        {
          question: 'How do you present a finding the business does not want?',
          why: 'Tests backbone and communication at once.',
          tip: 'Finding, method, uncertainty, options. A real example lands hardest here.',
        },
        {
          question: 'How do you make sure your numbers are right?',
          why: 'Data quality is the core of the role.',
          tip: 'Sanity checks, cross-checking a second source, documented assumptions — name them concretely.',
        },
        {
          question: 'Explain an A/B test to someone with no statistics background.',
          why: 'Tests whether you can translate.',
          tip: 'Avoid jargon entirely and use an example from their product.',
        },
        {
          question: 'What have you worked on that changed a decision?',
          why: 'Separates reporting from analysis.',
          tip: 'Name the decision and who made it, not the dashboard.',
        },
        {
          question: 'How do you prioritise competing requests?',
          why: 'Analysts get pulled by every department; prioritisation is daily work.',
          tip: 'Prioritise by decision relevance and deadline, and move recurring requests into self-service.',
        },
      ],
      redFlags: [
        'Starting to calculate in the case study without clarifying the question.',
        'Presenting correlation as cause.',
        'Making assumptions without stating them.',
      ],
      askThem: [
        'Who uses the analysis, and which decisions depend on it?',
        'How is the data stack built, and how reliable are the sources?',
        'Is this role more self-service enablement or deep individual analysis?',
      ],
      faq: [
        {
          question: 'How hard is the SQL test usually?',
          answer:
            'Typically intermediate under time pressure: several joins, aggregation, one window function. More common than difficulty is the trap of not sanity-checking the result — that is scored too.',
        },
        {
          question: 'What should I expect in the case study?',
          answer:
            'An open business question such as "why is repeat purchase falling?". They want clarifying questions, an approach and stated assumptions — not a finished number.',
        },
      ],
    },
  },

  teacher: {
    name: 'Teacher',
    application: {
      slug: 'teacher',
      metaTitle: 'Teaching Application: Cover Letter, CV and Supporting Documents',
      metaDescription:
        'Teaching applications: which qualifications and clearances matter, what belongs in the letter, a sample opening and the most common mistakes.',
      heading: 'Writing a teaching application',
      intro:
        'Teaching applications are read by a head or head of department who is looking for fit with their school, not for a general statement about education. Subject, phase and safeguarding clearance come first; your philosophy comes last, if at all.',
      atsKeywords: [
        'Qualified teacher status',
        'Subject specialism',
        'Curriculum planning',
        'Differentiation',
        'Classroom management',
        'Assessment and feedback',
        'Special educational needs (SEN)',
        'Safeguarding',
        'Form tutor',
        'Parental engagement',
        'Behaviour management',
        'Educational technology',
      ],
      hardSkills: [
        {
          label: 'Subject and phase',
          detail:
            'What you teach and to which age groups decides almost everything. Both belong in the first line.',
        },
        {
          label: 'Qualification and status',
          detail:
            'Teaching qualification, registration status and any recognition of overseas qualifications — with the awarding body.',
        },
        {
          label: 'Safeguarding clearance',
          detail:
            'Background check status (DBS or equivalent) and whether it is on the update service. A missing clearance delays a start date by weeks.',
        },
        {
          label: 'Evidence of impact',
          detail:
            'Progress data, intervention outcomes, results at a specific level — the one thing most applications leave out entirely.',
        },
      ],
      softSkills: [
        'Classroom presence without confrontation',
        'Difficult conversations with parents',
        'Collaboration within a department',
        'Patience with mixed-attainment groups',
        'Reliability in the wider life of the school',
      ],
      certifications: [
        'Qualified Teacher Status (QTS) or national equivalent',
        'National Professional Qualifications (NPQ)',
        'SEND / inclusion certification',
        'Safeguarding lead training',
      ],
      cvFocus: [
        {
          label: 'School type and context',
          detail:
            'Primary, secondary, sixth form, independent, and the intake profile — it frames everything else you write.',
        },
        {
          label: 'Contribution beyond the classroom',
          detail:
            'Clubs, trips, whole-school projects, working groups. For direct applications this is often the deciding factor.',
        },
        {
          label: 'Reference to the school',
          detail:
            'One sentence on their intake, ethos or a current project separates you from the generic application.',
        },
      ],
      coverLetterOpener:
        'Your bilingual stream at key stage 3 lines up directly with my subject combination of English and history — I taught two terms of history through English during my training year with a mixed-attainment year 8 group.',
      mistakes: [
        {
          label: 'A generic letter sent to every school',
          detail:
            'Heads read dozens. The one that names their school, their intake and their current priority gets the interview.',
        },
        {
          label: 'Philosophy instead of practice',
          detail:
            'Half a page of educational belief goes unread. A described unit of work with an outcome does not.',
        },
        {
          label: 'Incomplete documents',
          detail:
            'Qualification certificates and clearance status. Missing one delays appointment past the start of term.',
        },
      ],
      faq: [
        {
          question: 'How do I apply as a career changer?',
          answer:
            'Through the recognised training and assessment routes, which differ by country and often by region. What decides eligibility is whether your degree subject maps to a school subject; shortage subjects such as maths, physics, computing and technology have the strongest prospects.',
        },
        {
          question: 'Should I apply centrally or directly to the school?',
          answer:
            'Usually both: the central process for the general pool, direct applications for advertised vacancies and cover posts. Direct is faster, but only where a post is actually advertised.',
        },
        {
          question: 'How much do my grades matter?',
          answer:
            'Most in pooled processes, where ranking is partly grade-driven. For a school-advertised post, fit with the department and additional qualifications count for considerably more.',
        },
      ],
    },
    interview: {
      slug: 'teacher',
      metaTitle: 'Teaching Interview Questions and How to Answer Them',
      metaDescription:
        'Teaching interviews: behaviour, differentiation, parents and safeguarding — what each question is testing, plus what to ask the school.',
      heading: 'Teaching interview questions',
      intro:
        'A teaching interview day usually includes a lesson observation, a pupil panel and a formal interview. The observed lesson typically carries more weight than the conversation — and the reflection afterwards carries more weight than the lesson.',
      questions: [
        {
          question: 'How do you handle a class that will not settle?',
          why: 'Behaviour management is the core competence. They want structures, not volume.',
          tip: 'Describe the routines you establish in advance, not just your reaction in the moment.',
        },
        {
          question: 'How do you differentiate in a mixed-attainment group?',
          why: 'The daily reality of every classroom. They want practice, not theory.',
          tip: 'Walk through one lesson with tiered tasks — materials, sequence, outcome.',
        },
        {
          question: 'Tell me about a difficult conversation with a parent.',
          why: 'Parental relations take a great deal of staff time and are a common source of strain.',
          tip: 'Listen, separate fact from feeling, agree an action, record it.',
        },
        {
          question: 'Why our school?',
          why: 'The decisive question for any school-advertised post.',
          tip: 'Reference their development plan, ethos or a specific project.',
        },
        {
          question: 'What is your approach to safeguarding?',
          why: 'Non-negotiable, and asked in essentially every teaching interview.',
          tip: 'Report to the designated lead, record factually, never promise confidentiality. Know the procedure.',
        },
        {
          question: 'What would you contribute beyond your timetable?',
          why: 'Schools hire colleagues who carry the wider life of the school.',
          tip: 'Be specific — a club, a department role, a project — and honest about the time you have.',
        },
      ],
      redFlags: [
        'Attributing behaviour problems entirely to pupils or families.',
        'Not having read the school’s most recent inspection report or development plan.',
        'Speaking only in educational slogans without a single example.',
      ],
      askThem: [
        'How are new staff inducted and mentored?',
        'What are the school improvement priorities for the next two years?',
        'How does the department plan and moderate together?',
      ],
      faq: [
        {
          question: 'What happens in the observed lesson?',
          answer:
            'Usually a shortened lesson with an unfamiliar class, topic given in advance, followed by a reflection conversation. Panels weigh your reflection on what worked and what did not more heavily than a flawless delivery.',
        },
        {
          question: 'Is there a pupil panel?',
          answer:
            'In many schools, yes, and its view genuinely carries weight. Talk to the pupils directly rather than performing for the observing staff — panels reliably notice the difference.',
        },
      ],
    },
  },

  'office-administrator': {
    name: 'Office Administrator',
    application: {
      slug: 'office-administrator',
      metaTitle: 'Office Administrator Cover Letter and CV: What to Include',
      metaDescription:
        'Administrative applications: the tasks and systems that belong in your profile, a sample opening line and the mistakes that make files interchangeable.',
      heading: 'Writing an office administrator application',
      intro:
        'Administrative roles attract more applications than almost any other, and most of them are interchangeable. Describing your actual remit instead of "general office duties" already puts you in the top third.',
      atsKeywords: [
        'Office administration',
        'Order processing',
        'Invoice processing',
        'Diary management',
        'Expense processing',
        'Correspondence',
        'MS Office / Excel',
        'ERP system',
        'Data entry and maintenance',
        'Quotations',
        'Reception and switchboard',
        'Document management',
      ],
      hardSkills: [
        {
          label: 'Your actual remit',
          detail:
            'Order processing, invoicing, HR administration or executive support — completely different jobs under one title.',
        },
        {
          label: 'Excel beyond the basics',
          detail:
            'VLOOKUP/XLOOKUP, pivot tables, filters. This is the single most frequently tested skill in the field.',
        },
        {
          label: 'ERP and business systems',
          detail:
            'SAP, NetSuite, Sage, Dynamics or Xero by name — onboarding time is a direct cost to the employer.',
        },
        {
          label: 'Volume figures',
          detail:
            'Orders a week, invoices a month, sites supported. That is what makes "office administration" concrete.',
        },
      ],
      softSkills: [
        'Prioritising without close supervision',
        'Staying courteous with difficult callers',
        'Reliable follow-through on deadlines',
        'Discretion with personnel and contract data',
        'Thinking a step beyond your own task',
      ],
      certifications: [
        'Business administration qualification (NVQ / BTEC or equivalent)',
        'Microsoft Office Specialist (Excel)',
        'Bookkeeping or payroll certification',
        'Project support / PRINCE2 Foundation',
      ],
      cvFocus: [
        {
          label: 'Sector and company size',
          detail: 'A trades business, a law firm, a manufacturer or the public sector — the day looks nothing alike.',
        },
        {
          label: 'Systems as their own block',
          detail: 'A short list of software with level of use gets read; a paragraph does not.',
        },
        {
          label: 'A continuous history',
          detail: 'Administrative recruiting checks the timeline closely. Explain gaps briefly rather than leaving them open.',
        },
      ],
      coverLetterOpener:
        'In my current role I process around 120 customer orders a week in Sage 200 — from order entry through delivery tracking to invoicing.',
      mistakes: [
        {
          label: '"General office duties"',
          detail: 'The most common phrase in this field, and the one that conveys the least.',
        },
        {
          label: '"Good MS Office skills"',
          detail: 'Everyone writes it. Say what you actually build in Excel and you separate yourself immediately.',
        },
        {
          label: 'A template letter with no reference',
          detail: 'With this many applicants, the one sentence proving you read the advert decides it.',
        },
      ],
      faq: [
        {
          question: 'How do I stand out among many applicants?',
          answer:
            'Through specifics: volumes, systems, and your exact remit. Most applications in this field stay general, so three precise details already read as above average.',
        },
        {
          question: 'How do I explain returning after a career break?',
          answer:
            'Openly and briefly in the letter, with no justification, plus one line on how you refreshed your skills — a software or bookkeeping course. Unexplained gaps generate more questions than named ones.',
        },
        {
          question: 'Are speculative applications worth it?',
          answer:
            'Yes, unusually often in administration, because many posts are filled internally or by referral. Name the area you want to work in — a speculative application with no direction is rarely passed on.',
        },
      ],
    },
    interview: {
      slug: 'office-administrator',
      metaTitle: 'Office Administrator Interview Questions and How to Answer Them',
      metaDescription:
        'Administrative interviews: organisation, Excel, prioritisation and confidentiality — what is being tested and what to ask back.',
      heading: 'Office administrator interview questions',
      intro:
        'The interview is usually with the line manager and someone from HR. They probe self-organisation, accuracy and resilience through concrete examples, and many processes include a short Excel or written test.',
      questions: [
        {
          question: 'How do you organise yourself when several things are urgent at once?',
          why: 'The core of the role. They want a repeatable criterion, not stamina.',
          tip: 'Prioritise by deadline and consequence, communicate when something will slip — with an example.',
        },
        {
          question: 'How do you make sure you do not make mistakes?',
          why: 'Accuracy is the top criterion in administrative work.',
          tip: 'Describe your checking routine: second pair of eyes, checklist, verification before sending.',
        },
        {
          question: 'Which Excel functions do you use regularly?',
          why: 'The most overstated skill on administrative CVs.',
          tip: 'Name specific functions and what you use them for. Stay honest — a test often follows.',
        },
        {
          question: 'How do you handle an angry caller?',
          why: 'Tests de-escalation and follow-through.',
          tip: 'Let them finish, summarise the issue, commit to a specific next step, then actually do it.',
        },
        {
          question: 'How do you handle confidential documents?',
          why: 'Administrative roles touch personnel, contract and salary data.',
          tip: 'Name concrete practice: access rights, locked filing, no forwarding without approval.',
        },
        {
          question: 'What do you do if your manager is unreachable and a decision is needed?',
          why: 'Tests independence and judgement.',
          tip: 'Name your boundary: what you decide, where you get approval, how you document it.',
        },
      ],
      redFlags: [
        'Claiming Excel skills the test does not confirm.',
        'Answering organisation questions with "I am very structured" and nothing else.',
        'Speaking negatively about previous managers or colleagues.',
      ],
      askThem: [
        'How is the work divided between the people in the team?',
        'Which systems are in use, and how long is the induction?',
        'What would the priorities be in the first three months?',
      ],
      faq: [
        {
          question: 'Will there be a test?',
          answer:
            'Frequently: a short Excel exercise, a written accuracy check or a sample piece of correspondence. They rarely take more than 30 minutes and test baseline confidence rather than specialist knowledge.',
        },
        {
          question: 'Can I ask about hybrid working and hours?',
          answer:
            'Yes, later in the conversation — they are legitimate practical questions. Ask what the team actually does rather than what the policy says, and you get the more useful answer.',
        },
      ],
    },
  },

  'customer-service-agent': {
    name: 'Customer Service Agent',
    application: {
      slug: 'customer-service-agent',
      metaTitle: 'Customer Service Cover Letter and Résumé: Metrics That Matter',
      metaDescription:
        'Customer service applications: the metrics and systems that convince, a sample opening line and the mistakes that make applications generic.',
      heading: 'Writing a customer service application',
      intro:
        'In customer service your history matters less than evidence that you can hold a conversation under pressure. Name channel, volume and quality metrics and you are placed immediately; everyone else lands in the general pile.',
      atsKeywords: [
        'Customer service',
        'Customer support',
        'First-line support',
        'Second-line support',
        'Complaint handling',
        'Escalation management',
        'CRM (Salesforce, Zendesk)',
        'Ticketing system',
        'Inbound / outbound',
        'Customer satisfaction (CSAT)',
        'First contact resolution',
        'Service level agreement',
      ],
      hardSkills: [
        {
          label: 'Channel and volume',
          detail:
            'Phone, email, chat or social — and how many contacts a day. 80 calls is a different job from 20 complex cases.',
        },
        {
          label: 'Service metrics',
          detail:
            'CSAT, first contact resolution, average handling time, SLA attainment: the language every service manager reads in.',
        },
        {
          label: 'Systems',
          detail: 'Zendesk, Freshdesk, Salesforce Service Cloud, Intercom — by name.',
        },
        {
          label: 'Subject depth',
          detail:
            'Technical support, insurance, utilities, e-commerce: product knowledge decides both ramp time and pay band.',
        },
      ],
      softSkills: [
        'Staying calm with angry customers',
        'Active listening',
        'Explaining clearly without jargon',
        'Resilience at high contact rates',
        'Doing what you said you would do',
      ],
      certifications: [
        'Customer service qualification (NVQ / equivalent)',
        'Salesforce Service Cloud Consultant',
        'ITIL Foundation (technical support)',
        'Language certificates (B2/C1)',
      ],
      cvFocus: [
        {
          label: 'Metrics per role',
          detail: 'Contacts per day, CSAT, first contact resolution — service managers read for these first.',
        },
        {
          label: 'Languages with levels',
          detail: 'In international service every extra language is a direct pay factor. Always give the level.',
        },
        {
          label: 'Shift availability',
          detail: 'Many service operations run shifts. Clarifying this early saves both sides time.',
        },
      ],
      coverLetterOpener:
        'In the utilities sector I handle around 60 customer contacts a day across phone and chat, at 84% first contact resolution and a CSAT of 4.6 out of 5.',
      mistakes: [
        {
          label: 'Only "friendly and communicative"',
          detail: 'It appears in virtually every service application. One metric outweighs every adjective.',
        },
        {
          label: 'No volume figures',
          detail: 'Without contact numbers it stays unclear whether you are used to load — the central service question.',
        },
        {
          label: 'Hiding complaint experience',
          detail: 'Handling escalations is the most valuable skill in support, not a blemish.',
        },
      ],
      faq: [
        {
          question: 'Does hospitality or retail experience count?',
          answer:
            'Yes, and it is routinely undersold. Translate it into service language: customers per shift, complaints handled, escalations resolved — then it maps directly onto the role.',
        },
        {
          question: 'How should I raise remote working?',
          answer:
            'Customer service is one of the most commonly remote-organised functions, so the question is expected. Raise it in the interview rather than the letter, and ask about the model the team actually runs.',
        },
        {
          question: 'Are languages more valuable than sector experience?',
          answer:
            'In international service often yes — a second language at B2/C1 opens roles that are otherwise closed. In technical support, product knowledge weighs more.',
        },
      ],
    },
    interview: {
      slug: 'customer-service-agent',
      metaTitle: 'Customer Service Interview Questions and How to Answer Them',
      metaDescription:
        'Customer service interviews: escalation, load and metrics, usually including a role play — what is assessed and how to answer.',
      heading: 'Customer service interview questions',
      intro:
        'Service interviews nearly always include a role play: you get a simulated angry customer and have to run the conversation. What is scored is not the solution but whether you listen first and then make a commitment you can keep.',
      questions: [
        {
          question: 'A customer is furious and they are right. What do you do?',
          why: 'The defining situation of the job.',
          tip: 'Let them finish, acknowledge the failure, offer a fix, commit to a time, follow up. No defending the company.',
        },
        {
          question: 'A customer demands something you are not allowed to give. What now?',
          why: 'Tests whether you can hold a boundary warmly.',
          tip: 'No to the demand, yes to the need: explain what is possible and offer the alternative concretely.',
        },
        {
          question: 'How do you cope with high contact volume?',
          why: 'Attrition in service is high; employers want a realistic self-assessment.',
          tip: 'Describe honestly how you reset between calls, and what cadence you have actually worked.',
        },
        {
          question: 'What was your hardest escalation?',
          why: 'Tests real experience rather than theory.',
          tip: 'Situation, your steps, outcome, what you changed afterwards.',
        },
        {
          question: 'How do you explain something complicated to an impatient customer?',
          why: 'Clarity is the actual technical skill in support.',
          tip: 'Short, no jargon, and check back that it landed.',
        },
        {
          question: 'How do you know you have had a good day?',
          why: 'Shows whether you work with metrics in mind.',
          tip: 'Name one quality and one volume metric, and why they belong together.',
        },
      ],
      redFlags: [
        'Offering a solution in the role play before listening.',
        'Talking dismissively about difficult customers.',
        'Committing to things you cannot deliver.',
      ],
      askThem: [
        'How many contacts does an agent handle per day here?',
        'How long is the induction, and how is product knowledge built?',
        'How is performance measured — volume, quality, or both?',
      ],
      faq: [
        {
          question: 'How does the role play work?',
          answer:
            'Usually five to ten minutes with a simulated complaint. Listening, summarising and making a firm commitment are what get scored — not whether you know the correct resolution.',
        },
        {
          question: 'Can I ask about shift premiums?',
          answer:
            'Yes, it is entirely normal in service and gets a straight answer. Ask alongside the shift pattern and you settle both in one go.',
        },
      ],
    },
  },

  electrician: {
    name: 'Electrician',
    application: {
      slug: 'electrician',
      metaTitle: 'Electrician Cover Letter and CV: Qualifications That Count',
      metaDescription:
        'Electrician applications: which cards and qualifications decide it, how to name your discipline, a sample opening and common mistakes.',
      heading: 'Writing an electrician application',
      intro:
        'Electrical applications get read fast and decided fast. Discipline, cards and a driving licence come first — a long letter does not compensate for a missing qualification.',
      atsKeywords: [
        'Electrician',
        'Commercial installation',
        'Industrial maintenance',
        'Automation',
        'Control panel building',
        'PLC programming (Siemens S7)',
        'Testing and inspection',
        'Wiring regulations',
        'Fault finding',
        'Preventive maintenance',
        'Instrumentation',
        'Solar PV',
      ],
      hardSkills: [
        {
          label: 'Name your discipline',
          detail:
            'Domestic, commercial, industrial maintenance or automation — this is the first filter applied to your file.',
        },
        {
          label: 'Cards, tickets and authorisations',
          detail:
            'Competence card, testing and inspection qualification, high-voltage authorisation, live-working permits — with expiry dates.',
        },
        {
          label: 'Control systems',
          detail:
            'PLC experience, particularly Siemens S7 / TIA Portal, is the biggest single difference in hourly rate on the industrial side.',
        },
        {
          label: 'Licence and travel',
          detail:
            'For service and installation work a driving licence is effectively a requirement. If it is missing from the CV it is assumed you do not hold one.',
        },
      ],
      softSkills: [
        'Safety discipline with no shortcuts',
        'Working unsupervised on site',
        'Customer manner when working in occupied premises',
        'Clean test documentation',
        'Reliability with the rest of the crew',
      ],
      certifications: [
        'Electrical installation qualification (NVQ Level 3 or equivalent)',
        'Inspection and testing certification',
        'High-voltage switching authorisation',
        'PLC training (Siemens TIA Portal)',
      ],
      cvFocus: [
        {
          label: 'Type of work',
          detail: 'New build, refurbishment, industrial maintenance or customer service calls — completely different days.',
        },
        {
          label: 'Plant and manufacturers',
          detail: 'Name specific plant types and control systems; employers search for exactly those.',
        },
        {
          label: 'Attach the certificates',
          detail: 'Qualifications and current cards as an attachment — without them nobody can plan you onto a job.',
        },
      ],
      coverLetterOpener:
        'For six years I have worked in maintenance at a three-shift food production site: fault finding on S7-controlled filling lines, periodic testing, and control panel modifications.',
      mistakes: [
        {
          label: 'Writing only "electrician"',
          detail: 'Without the discipline an employer cannot judge whether you fit the vacancy at all.',
        },
        {
          label: 'Leaving out cards and authorisations',
          detail: 'They are the most important content in the application and set your grade directly.',
        },
        {
          label: 'A letter that is too long',
          detail:
            'Trades applications get read briefly. Half a page with discipline, experience and availability is plenty.',
        },
      ],
      faq: [
        {
          question: 'Is a cover letter needed in the trades?',
          answer:
            'A short one, yes — it answers why this employer and when you can start. Many decide on the CV and certificates alone, but an application with no letter at all reads as untargeted.',
        },
        {
          question: 'Can I apply without a completed qualification?',
          answer:
            'Yes, as an improver or mate, stating your experience and your intention to complete. Many employers support qualification where reliability and safety awareness are evident — name concrete tasks to show it.',
        },
        {
          question: 'How much does the higher qualification matter?',
          answer:
            'For supervision, sign-off responsibility and self-employment it is decisive. For hands-on and installation roles, current cards and plant experience count for more.',
        },
      ],
    },
    interview: {
      slug: 'electrician',
      metaTitle: 'Electrician Interview Questions and How to Answer Them',
      metaDescription:
        'Electrical trade interviews: safety, fault finding and qualifications — what is assessed and what to ask the employer back.',
      heading: 'Electrician interview questions',
      intro:
        'The conversation is usually held by the supervisor or owner directly, and it is short and practical. Expect questions about the plant you know, how you approach a fault, and above all how you treat safety rules under time pressure.',
      questions: [
        {
          question: 'How do you approach a fault you have not seen before?',
          why: 'The central question. They want systematic isolation, not trial and error.',
          tip: 'Take the fault description, make it safe, work from supply to load, measure rather than guess, document.',
        },
        {
          question: 'Which cards and qualifications do you hold?',
          why: 'It decides directly how you can be scheduled and graded.',
          tip: 'Name every current qualification with its date, and bring the certificates.',
        },
        {
          question: 'What do you do if you are asked to skip a safety step under time pressure?',
          why: 'The most important attitude question in the trade.',
          tip: 'Be unambiguous: isolation procedure is not negotiable. Offer an alternative rather than only refusing.',
        },
        {
          question: 'Which control systems have you worked with?',
          why: 'Establishes how much ramp-up an industrial role needs.',
          tip: 'Manufacturer, series and what you actually did — read, modify or program.',
        },
        {
          question: 'How do you deal with customers on site?',
          why: 'On service work the electrician is the face of the business.',
          tip: 'Give an example: explain what you are doing, keep to the appointment, leave the area clean.',
        },
        {
          question: 'How do you document your work?',
          why: 'Test certificates and records carry legal weight.',
          tip: 'Describe exactly what you record and in which system.',
        },
      ],
      redFlags: [
        'Hinting that safety procedure is negotiable when the job is running late.',
        'Claiming qualifications you cannot evidence.',
        'Asking nothing about scheduling or call-out.',
      ],
      askThem: [
        'How is the work split between site, workshop and customer call-outs?',
        'Is there a call-out rota, and how is it paid?',
        'Which qualifications does the company support?',
      ],
      faq: [
        {
          question: 'Should I bring my certificates?',
          answer:
            'Yes — qualifications, cards and test certificates, original or copy. Many employers decide in the room, and a missing certificate simply pushes the offer back.',
        },
        {
          question: 'Is there a practical test?',
          answer:
            'At some employers, usually short and in the workshop: a measurement, a drawing, a small fault-find. It targets method and baseline safety, not speed.',
        },
      ],
    },
  },

  'warehouse-logistics': {
    name: 'Warehouse Operative',
    application: {
      slug: 'warehouse-operative',
      metaTitle: 'Warehouse and Logistics Application: CV, Licences and Systems',
      metaDescription:
        'Warehouse applications: which licences and systems decide it, what belongs in the letter, a sample opening and common mistakes.',
      heading: 'Writing a warehouse and logistics application',
      intro:
        'Logistics hiring moves fast, often within days. Forklift licence, shift availability and the warehouse management system you have used are the three things searched for first.',
      atsKeywords: [
        'Warehouse operations',
        'Picking and packing',
        'Goods in',
        'Goods out',
        'Stock control',
        'Forklift licence',
        'Counterbalance / reach truck',
        'Warehouse management system (WMS)',
        'SAP EWM',
        'Dispatch',
        'Dangerous goods',
        'Inventory accuracy',
      ],
      hardSkills: [
        {
          label: 'Licences and tickets',
          detail:
            'Counterbalance, reach truck, VNA, dangerous goods — with expiry dates. Without them you cannot be scheduled.',
        },
        {
          label: 'Warehouse management system',
          detail:
            'SAP EWM, Manhattan, Blue Yonder, handheld scanners, pick-by-voice: system familiarity sets your ramp time.',
        },
        {
          label: 'Area of the operation',
          detail:
            'Goods in, picking, dispatch or stock control are distinct profiles with distinct requirements.',
        },
        {
          label: 'Performance figures',
          detail: 'Picks per hour, error rate, shipments per shift — the metrics of the sector.',
        },
      ],
      softSkills: [
        'Physical resilience on shifts',
        'Accuracy at high throughput',
        'Teamwork under deadline',
        'Reliability and punctuality',
        'Attention to site safety',
      ],
      certifications: [
        'Forklift certification (counterbalance / reach)',
        'Dangerous goods (ADR) awareness',
        'Load securing certification',
        'Warehouse operations qualification (NVQ or equivalent)',
      ],
      cvFocus: [
        {
          label: 'Warehouse type and size',
          detail:
            'High-bay, cold store, e-commerce fulfilment or spare parts — the pace and requirements differ sharply.',
        },
        {
          label: 'Shift pattern',
          detail: 'Two or three shifts, nights, weekends: often the single deciding criterion.',
        },
        {
          label: 'Put the licences up front',
          detail: 'Their own block at the top — not buried between roles.',
        },
      ],
      coverLetterOpener:
        'For four years I have worked three-shift in a distribution centre with around 12,000 pallet locations — scanner picking in SAP EWM, counterbalance and reach truck licensed since 2019, plus load securing certification.',
      mistakes: [
        {
          label: 'Mentioning licences only in the attachment',
          detail: 'They are the primary selection criterion and belong on page one.',
        },
        {
          label: 'Leaving shift availability open',
          detail: 'Where it is missing, unavailability is usually assumed and the application filters itself out.',
        },
        {
          label: 'Summarising everything as "warehouse work"',
          detail: 'Goods in and dispatch are different jobs with different metrics — differentiate.',
        },
      ],
      faq: [
        {
          question: 'Can I apply without a forklift licence?',
          answer:
            'Yes, and many employers fund it — say explicitly that you are willing to train. Where truck work is the core of the role it is effectively a prerequisite.',
        },
        {
          question: 'How important are language skills?',
          answer:
            'Enough to follow safety briefings and work the system, typically an intermediate level. State your level openly — many logistics operations are multilingual and weigh reliability higher than fluency.',
        },
        {
          question: 'Does agency experience count against me?',
          answer:
            'No, in logistics it is the normal route into permanent work. List the sites you were placed at — they evidence exactly the systems and warehouse types employers search for.',
        },
      ],
    },
    interview: {
      slug: 'warehouse-operative',
      metaTitle: 'Warehouse Interview Questions and How to Answer Them',
      metaDescription:
        'Warehouse and logistics interviews: shifts, accuracy, safety and systems — what is assessed and what to ask back.',
      heading: 'Warehouse and logistics interview questions',
      intro:
        'The interview is usually short and practical, run by the shift or warehouse manager. It often includes a walk round the operation — and that walk is part of the assessment, because they watch what you notice and what you ask.',
      questions: [
        {
          question: 'Which shifts can you cover?',
          why: 'In practice the most important question; it often decides the offer on its own.',
          tip: 'Answer clearly and honestly. Naming a constraint now beats withdrawing after two weeks.',
        },
        {
          question: 'How do you make sure you pick accurately?',
          why: 'Error rate is the central quality metric on any site.',
          tip: 'Name a concrete routine: scan rather than eyeball, check at the pack bench, ask when unsure.',
        },
        {
          question: 'What do you do when stock does not match the system?',
          why: 'Tests whether you report or quietly correct.',
          tip: 'Recount, report, document the adjustment in the system — never balance it off the books.',
        },
        {
          question: 'Which systems and equipment have you used?',
          why: 'Determines ramp-up time.',
          tip: 'Name system, device and task — scanner picking in SAP EWM, for example.',
        },
        {
          question: 'How do you handle the pressure before dispatch cut-off?',
          why: 'The daily crunch point of the operation.',
          tip: 'Prioritise, flag early when it will be tight, and do not cut safety corners.',
        },
        {
          question: 'What do you watch for on safety?',
          why: 'Accidents are the largest single cost in the sector.',
          tip: 'Name specifics: pedestrian routes, load securing, visibility when manoeuvring, PPE.',
        },
      ],
      redFlags: [
        'Agreeing to shift patterns you cannot actually sustain.',
        'Treating stock discrepancies as trivial.',
        'Looking disengaged during the warehouse walk-round.',
      ],
      askThem: [
        'What is the shift pattern, and how are premiums calculated?',
        'Which metrics are measured per person?',
        'How does induction work, and who supervises it?',
      ],
      faq: [
        {
          question: 'Will my forklift licence be checked at interview?',
          answer:
            'The certificate is verified, and some sites add a short practical drive. Always bring it — without proof you cannot operate a truck, regardless of your experience.',
        },
        {
          question: 'How do I explain frequent agency moves?',
          answer:
            'Factually: placements are set by the agency, not by you. List the sites and what you did there — it reads as breadth of experience rather than instability.',
        },
      ],
    },
  },
};
