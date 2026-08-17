import type { ProfessionCatalog } from '../types';

/**
 * French profession content — adapted to French hiring conventions
 * (lettre de motivation, CV d'une page, diplômes RNCP, habilitations,
 * CACES, concours de l'Éducation nationale).
 */
export const professionsFr: ProfessionCatalog = {
  'software-developer': {
    name: 'Développeur logiciel',
    application: {
      slug: 'developpeur-logiciel',
      metaTitle: 'Candidature de développeur : lettre de motivation et CV',
      metaDescription:
        'Ce qu’attend un recruteur d’une candidature de développeur : mots-clés ATS, compétences, certifications, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature de développeur logiciel',
      intro:
        'Sur les postes de développeur, la lettre seule décide rarement : recruteurs et logiciels de tri cherchent d’abord la stack, la taille des projets et l’impact mesurable. Énumérer des technologies vous place à côté de centaines de profils identiques ; dire ce que vous avez porté et ce qui a changé, non.',
      atsKeywords: [
        'Développement logiciel',
        'TypeScript',
        'Java',
        'Python',
        'API REST',
        'Microservices',
        'CI/CD',
        'Docker',
        'Kubernetes',
        'Git',
        'Revue de code',
        'Agile / Scrum',
        'Tests unitaires',
        'Cloud (AWS/Azure)',
      ],
      hardSkills: [
        {
          label: 'Une stack écrite comme dans l’annonce',
          detail:
            'Langage, framework, base de données et cloud, orthographiés exactement comme dans l’offre : « TypeScript » et « JavaScript » sont deux mots différents pour un parseur.',
        },
        {
          label: 'Conception et architecture',
          detail:
            'Au-delà de trois ans d’expérience, on attend que vous conceviez des interfaces et justifiiez des arbitrages, pas seulement que vous traitiez des tickets.',
        },
        {
          label: 'Pratique des tests et des livraisons',
          detail:
            'Tests unitaires et d’intégration, pipelines, revue de code : la partie de votre travail qui montre si votre code sera encore maintenable dans six mois.',
        },
        {
          label: 'Impact mesurable',
          detail:
            'Temps de chargement divisé par deux, taux d’erreur réduit, déploiements passés d’hebdomadaires à quotidiens. Un chiffre issu de votre quotidien vaut mieux que n’importe quel adjectif.',
        },
      ],
      softSkills: [
        'Expliquer un choix technique à un interlocuteur non technique',
        'Donner un retour utile en revue de code',
        'Autonomie dans une équipe distribuée',
        'Prioriser sous contrainte de délai',
        'Accepter de lire le code des autres',
      ],
      certifications: [
        'AWS Certified Developer – Associate',
        'Microsoft Certified: Azure Developer Associate',
        'Certified Kubernetes Application Developer (CKAD)',
        'Professional Scrum Developer (PSD I)',
      ],
      cvFocus: [
        {
          label: 'Des projets, pas des listes de tâches',
          detail:
            'Deux ou trois projets par poste, avec le contexte : taille de l’équipe, votre rôle, technologies, résultat.',
        },
        {
          label: 'Un profil GitHub présentable',
          detail:
            'Un dépôt tenu avec un vrai README remplace un paragraphe d’autodescription. Un profil à l’abandon coûte plus qu’un lien absent.',
        },
        {
          label: 'Des compétences classées par niveau',
          detail:
            'Séparez ce que vous utilisez tous les jours de ce que vous avez essayé une fois : l’entretien technique portera exactement sur cette frontière.',
        },
      ],
      coverLetterOpener:
        'Votre annonce évoque le découpage d’un monolithe en services : c’est précisément ce que j’ai piloté chez [Entreprise] pour une équipe de huit développeurs, en faisant passer la fréquence de déploiement d’hebdomadaire à quotidienne.',
      mistakes: [
        {
          label: 'Une lettre qui répète la stack',
          detail:
            'Le CV la liste déjà. La lettre doit expliquer pourquoi ce produit-là, d’une façon qu’aucun autre candidat ne pourrait recopier.',
        },
        {
          label: 'Affirmer sa séniorité au lieu de la montrer',
          detail:
            '« Senior » ne convainc personne. Porter une migration, tenir le processus de revue, former les nouveaux arrivants, oui.',
        },
        {
          label: 'Envoyer partout la même candidature',
          detail:
            'Sans référence au produit, le dossier est interchangeable. Une phrase précise sur leur domaine suffit à vous sortir de la pile.',
        },
      ],
      faq: [
        {
          question: 'La lettre de motivation est-elle encore utile pour un développeur ?',
          answer:
            'En France, oui : la plupart des ESN et des grands groupes l’attendent toujours. Dans les start-up et les scale-up, le CV et le profil GitHub suffisent souvent. Une demi-page reste le bon compromis — absente, la candidature paraît bâclée ; trop longue, elle n’est pas lue.',
        },
        {
          question: 'Les certifications comptent-elles autant que les projets ?',
          answer:
            'Les projets l’emportent presque toujours. Les certifications cloud servent surtout à entrer dans un environnement où vous n’avez pas encore de production à montrer : elles ouvrent la première porte, elles ne remplacent pas des références.',
        },
        {
          question: 'Faut-il mettre une photo sur le CV ?',
          answer:
            'Elle reste courante en France mais n’est jamais obligatoire, et le Défenseur des droits en déconseille l’usage. Dans la tech, l’absence de photo ne pénalise pas ; sur un CV envoyé à l’international, mieux vaut l’omettre.',
        },
      ],
    },
    interview: {
      slug: 'developpeur-logiciel',
      metaTitle: 'Entretien de développeur : questions fréquentes et réponses',
      metaDescription:
        'Les questions posées en entretien de développeur, ce qu’elles évaluent réellement, comment structurer vos réponses et les erreurs à éviter.',
      heading: 'Entretien d’embauche de développeur logiciel',
      intro:
        'Un processus de développeur comporte le plus souvent trois volets : motivation, profondeur technique, et un exercice de code en direct ou à emporter. Les candidats échouent rarement sur l’exercice lui-même : ils échouent en le résolvant en silence, alors que c’est le raisonnement qui est évalué.',
      questions: [
        {
          question: 'Parlez-moi d’un problème technique difficile que vous avez résolu.',
          why: 'On évalue votre capacité à circonscrire un problème et à comprendre la cause réelle plutôt qu’à modifier jusqu’à ce que ça marche.',
          tip: 'Quatre temps : le symptôme, la manière dont vous avez réduit le périmètre, la cause réelle, ce que vous avez changé pour que cela ne revienne pas.',
        },
        {
          question: 'Pourquoi avoir retenu cette architecture ?',
          why: 'Il n’y a pas de bonne réponse : on cherche à savoir si vous connaissez les alternatives et si vous en nommez les inconvénients.',
          tip: 'Citez l’option écartée et la raison. Qui ne trouve aucun défaut à sa propre solution ne l’a pas éprouvée.',
        },
        {
          question: 'Comment garantissez-vous la maintenabilité de votre code ?',
          why: 'On vérifie si vous pensez au-delà de la fusion : tests, revues, documentation, nommage.',
          tip: 'Décrivez ce que votre dernière équipe faisait réellement, pas des principes de manuel.',
        },
        {
          question: 'Comment abordez-vous du code que vous n’avez pas écrit ?',
          why: 'Le quotidien, c’est le legacy. On veut savoir si vous le modifiez prudemment ou si vous voulez tout réécrire.',
          tip: 'Décrivez le filet de sécurité que vous construisez d’abord : ajouter des tests, avancer par petits pas, livrer tôt.',
        },
        {
          question: 'Racontez un désaccord survenu en revue de code.',
          why: 'Question comportementale : pouvez-vous défendre une position technique sans abîmer la relation de travail ?',
          tip: 'Terminez par le résultat et ce que vous en avez tiré, y compris lorsque c’est vous qui avez cédé.',
        },
        {
          question: 'Que faites-vous quand une estimation n’est plus tenable ?',
          why: 'Il s’agit de communication avec le produit et les parties prenantes, pas de technique.',
          tip: 'Alerter tôt et proposer des options — périmètre, date, qualité — plutôt que de transmettre seulement le problème.',
        },
      ],
      redFlags: [
        'Coder en silence pendant l’exercice : c’est le raisonnement qui est noté.',
        'Dénigrer ses anciennes équipes ou bases de code.',
        'Répondre « oui » vaguement à « connaissez-vous X ? » au lieu de situer honnêtement son niveau.',
      ],
      askThem: [
        'Quel est le chemin entre la fusion et la production, et combien de temps prend-il ?',
        'Quelle part d’un sprint est consacrée à la dette technique ?',
        'Qui décide de ce qui est construit, et quelle place y ont les développeurs ?',
      ],
      faq: [
        {
          question: 'Comment préparer l’épreuve de code ?',
          answer:
            'Entraînez-vous à penser à voix haute, pas seulement à résoudre. Prenez un exercice de difficulté moyenne et commentez chaque étape comme si quelqu’un était assis à côté de vous : c’est cette verbalisation qui est notée dans presque tous les processus.',
        },
        {
          question: 'Peut-on utiliser des outils d’IA sur un test à emporter ?',
          answer:
            'Demandez-le. Beaucoup d’entreprises l’autorisent désormais explicitement, puis interrogent vos choix pendant la restitution. L’utiliser discrètement sans pouvoir expliquer le résultat est le pire scénario.',
        },
      ],
    },
  },

  nurse: {
    name: 'Infirmier',
    application: {
      slug: 'infirmier',
      metaTitle: 'Candidature d’infirmier : lettre de motivation, CV et diplômes',
      metaDescription:
        'Candidature en soins infirmiers : quels justificatifs fournir, quelle spécialité mettre en avant, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature d’infirmier',
      intro:
        'En soins infirmiers, le marché vous est favorable, mais la candidature détermine encore le service que vous obtiendrez et à quelles conditions. Des justificatifs complets et une spécialité clairement nommée comptent ici plus que n’importe quelle tournure.',
      atsKeywords: [
        'Infirmier diplômé d’État',
        'Soins infirmiers',
        'Démarche de soins',
        'Administration des traitements',
        'Pansements complexes',
        'Réanimation',
        'Urgences',
        'Soins palliatifs',
        'Dossier patient informatisé',
        'Hygiène et prévention des infections',
        'Transmissions ciblées',
        'Encadrement des étudiants',
      ],
      hardSkills: [
        {
          label: 'Diplôme d’État et numéro RPPS',
          detail:
            'Le Diplôme d’État d’infirmier, le numéro RPPS et l’inscription à l’Ordre national des infirmiers sont vérifiés avant tout le reste.',
        },
        {
          label: 'La spécialité, pas « le soin »',
          detail:
            'Réanimation, urgences, bloc opératoire, oncologie, gériatrie, libéral : c’est le premier filtre appliqué à votre dossier.',
        },
        {
          label: 'Logiciel de dossier patient',
          detail:
            'Citez le logiciel utilisé (DxCare, Orbis, Hôpital Manager, Easily) : cela réduit d’autant le temps d’intégration.',
        },
        {
          label: 'Formations et diplômes complémentaires',
          detail:
            'IADE, IBODE, puéricultrice, DU plaies et cicatrisation, soins palliatifs : ils déterminent directement le poste et la rémunération.',
        },
      ],
      softSkills: [
        'Résistance au travail posté',
        'Communication avec les familles en situation de crise',
        'Coopération avec les médecins et les rééducateurs',
        'Sang-froid face à une dégradation clinique',
        'Empathie sans épuisement',
      ],
      certifications: [
        'Diplôme d’État d’infirmier (DEI)',
        'Diplôme d’État d’infirmier anesthésiste (IADE) ou de bloc (IBODE)',
        'DU plaies et cicatrisation',
        'DU soins palliatifs',
      ],
      cvFocus: [
        {
          label: 'Type d’établissement et taille du service',
          detail:
            'CHU, centre hospitalier, clinique, EHPAD, libéral — et le nombre de lits. Cela en dit plus que n’importe quelle liste de tâches.',
        },
        {
          label: 'Des justificatifs complets',
          detail:
            'Diplôme, attestation d’inscription à l’Ordre, vaccinations obligatoires, attestations de formation. C’est la première cause de relance.',
        },
        {
          label: 'Disponibilité et rythme',
          detail: 'Quotité souhaitée, disponibilité pour les nuits et les week-ends, date d’entrée : dès la première page.',
        },
      ],
      coverLetterOpener:
        'Après quatre ans en réanimation polyvalente sur une unité de douze lits, je souhaite rejoindre une équipe de soins palliatifs — la discipline que j’ai découverte pendant mon DU et que je veux désormais exercer à temps plein.',
      mistakes: [
        {
          label: 'Promettre d’envoyer les justificatifs plus tard',
          detail:
            'Sans diplôme vérifiable, aucun recrutement n’est possible. Les dossiers incomplets sont mis de côté plutôt que refusés.',
        },
        {
          label: 'Laisser la spécialité ouverte',
          detail: '« Je suis polyvalent » se lit comme « je ne sais pas ce que je veux » et finit sur la liste d’attente.',
        },
        {
          label: 'N’écrire que sur la charge de travail',
          detail:
            'Tous les établissements la connaissent. Dire à quelles conditions vous resteriez donne une image posée plutôt qu’épuisée.',
        },
      ],
      faq: [
        {
          question: 'Comment candidater avec un diplôme obtenu hors de France ?',
          answer:
            'Joignez la décision d’autorisation d’exercice, ou l’accusé de réception et l’état d’avancement si la procédure est en cours. Beaucoup d’établissements recrutent en amont de la décision finale, mais exigent l’état du dossier par écrit.',
        },
        {
          question: 'Faut-il mentionner son numéro RPPS ?',
          answer:
            'Oui : le numéro RPPS et l’inscription à l’Ordre sont des informations vérifiables et attendues. Les omettre ajoute simplement un aller-retour de courriels avant tout traitement de votre dossier.',
        },
        {
          question: 'Faut-il indiquer ses prétentions salariales ?',
          answer:
            'Inutile dans la fonction publique hospitalière, où la grille s’applique : indiquez précisément ancienneté et diplômes complémentaires. Dans le privé et l’intérim, une fourchette est en revanche attendue.',
        },
      ],
    },
    interview: {
      slug: 'infirmier',
      metaTitle: 'Entretien d’infirmier : questions fréquentes et réponses',
      metaDescription:
        'Les questions posées en entretien de soins infirmiers, ce qu’elles évaluent, comment y répondre et quoi demander au cadre de santé.',
      heading: 'Entretien d’embauche d’infirmier',
      intro:
        'L’entretien est le plus souvent conduit par le cadre de santé, parfois avec un infirmier référent. On y évalue moins des connaissances que des attitudes : comment vous priorisez sous charge, comment vous parlez aux familles, et si vous tiendrez dans l’équipe.',
      questions: [
        {
          question: 'Comment priorisez-vous quand vous ne pouvez pas tout faire ?',
          why: 'La question centrale du métier. On cherche du tri clinique, pas de l’endurance.',
          tip: 'Décrivez votre ordre d’évaluation, le moment où vous alertez, et la traçabilité — pas le fait que « vous y arrivez toujours ».',
        },
        {
          question: 'Racontez un entretien difficile avec une famille.',
          why: 'Les conflits avec les proches épuisent les services. On écoute votre capacité à désamorcer.',
          tip: 'Écouter, expliquer la situation clinique, poser une limite, orienter — dans cet ordre.',
        },
        {
          question: 'Que faites-vous en cas d’erreur ?',
          why: 'Culture de sécurité : un établissement qui pose ouvertement la question veut entendre que vous déclarez.',
          tip: 'Sécuriser le patient, signaler immédiatement, tracer, déclarer l’événement indésirable. Un exemple réel pèse plus qu’une intention.',
        },
        {
          question: 'Pourquoi quittez-vous votre poste actuel ?',
          why: 'On vérifie si vous fuyez quelque chose ou si vous allez vers quelque chose.',
          tip: 'Dites ce que vous cherchez — spécialité, encadrement, fiabilité des plannings — pas ce que l’employeur précédent a mal fait.',
        },
        {
          question: 'Comment envisagez-vous les nuits et les week-ends ?',
          why: 'Pure question d’organisation : une réponse honnête évite une période d’essai ratée.',
          tip: 'Dites clairement ce que vous pouvez tenir. Poser une contrainte maintenant vaut mieux que se désister ensuite.',
        },
        {
          question: 'Comment actualisez-vous vos pratiques ?',
          why: 'Les recommandations évoluent ; les établissements exigeants posent la question.',
          tip: 'Citez des formations précises des deux dernières années et la façon dont vous les transmettez dans le service.',
        },
      ],
      redFlags: [
        'Parler d’anciens collègues ou de patients d’une manière qui trahit le secret professionnel.',
        'Affirmer n’être jamais dépassé.',
        'Ne poser aucune question sur le service, les plannings ou l’intégration.',
      ],
      askThem: [
        'Quel est l’effectif réel de jour, de nuit et le week-end ?',
        'Combien de temps dure l’intégration, et qui l’encadre ?',
        'Quelle est la stabilité des plannings, et à quelle fréquence rappelle-t-on du personnel ?',
      ],
      faq: [
        {
          question: 'Y a-t-il une évaluation des connaissances ?',
          answer:
            'Souvent sous forme de cas clinique plutôt que d’examen : une situation aiguë dont vous décrivez la prise en charge. Reconnaître ses limites et dire quand on appelle le médecin compte davantage qu’une réponse parfaite.',
        },
        {
          question: 'Peut-on interroger sur les effectifs et le remplacement ?',
          answer:
            'Absolument : c’est la question la plus informative dont vous disposiez. Les services dotés d’un vrai dispositif de remplacement répondent concrètement ; une réponse évasive est en soi un renseignement.',
        },
      ],
    },
  },

  'project-manager': {
    name: 'Chef de projet',
    application: {
      slug: 'chef-de-projet',
      metaTitle: 'Candidature de chef de projet : lettre, CV et indicateurs',
      metaDescription:
        'Candidature en gestion de projet : quels chiffres convainquent, quelles certifications comptent, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature de chef de projet',
      intro:
        'La gestion de projet est le métier où l’on affirme le plus et où l’on prouve le moins. Donner budget, taille d’équipe, durée et résultat pour chaque projet vous place devant la majorité des candidatures, avant même d’avoir écrit une ligne sur la méthode.',
      atsKeywords: [
        'Gestion de projet',
        'Pilotage de projet',
        'Gestion des parties prenantes',
        'Responsabilité budgétaire',
        'Gestion des risques',
        'Scrum',
        'Kanban',
        'PRINCE2',
        'Planification et jalons',
        'Gestion des ressources',
        'Jira',
        'MS Project',
        'Conduite du changement',
        'Comité de pilotage',
      ],
      hardSkills: [
        {
          label: 'Les chiffres du projet',
          detail:
            'Budget, taille d’équipe, durée, nombre de directions impliquées : quatre chiffres qui rendent une description immédiatement crédible.',
        },
        {
          label: 'Une méthode étayée',
          detail:
            'Cycle en V, agile ou hybride : dites ce que vous avez réellement conduit et où étaient les limites. « Les deux » sans exemple ne vaut rien.',
        },
        {
          label: 'Les outils',
          detail: 'Jira, Confluence, MS Project, Smartsheet, Asana — les filtres ATS cherchent littéralement ces noms.',
        },
        {
          label: 'À qui vous rendiez compte',
          detail:
            'Un comité de pilotage ou un comité de direction comme interlocuteur en dit plus sur votre niveau que n’importe quel intitulé.',
        },
      ],
      softSkills: [
        'Animer sans autorité hiérarchique',
        'Arbitrer entre directions métier',
        'Décider en situation d’incertitude',
        'Présenter en comité de direction',
        'Refuser une extension de périmètre',
      ],
      certifications: [
        'PMP (Project Management Professional)',
        'PRINCE2 Practitioner',
        'Professional Scrum Master (PSM I/II)',
        'Certification AFNOR / ICPM ou IPMA niveau C-D',
      ],
      cvFocus: [
        {
          label: 'Une liste de projets à part',
          detail:
            'Trois à cinq projets de référence avec secteur, volume, rôle et résultat, séparés du parcours chronologique.',
        },
        {
          label: 'Justifier un changement de secteur',
          detail:
            'La gestion de projet est dite transférable et rarement lue comme telle. Dites ce qui se transpose depuis votre secteur.',
        },
        {
          label: 'Le résultat, pas l’activité',
          detail: '« Livré dans les délais et 8 % sous budget » plutôt que « responsable du pilotage ».',
        },
      ],
      coverLetterOpener:
        'Pendant deux ans, j’ai piloté le déploiement de l’ERP chez [Entreprise] : 1,4 M€ de budget, six sites, 40 collaborateurs impliqués — et une mise en production sans arrêt de la ligne.',
      mistakes: [
        {
          label: 'Un catalogue de méthodes plutôt que des résultats',
          detail:
            'Une liste de référentiels prouve des lectures, pas une capacité à livrer. Un projet chiffré pèse davantage.',
        },
        {
          label: 'Laisser son rôle dans le flou',
          detail: '« Nous avons déployé » laisse ouvert si vous pilotiez ou participiez. Dites ce que vous portiez.',
        },
        {
          label: 'Taire les projets arrêtés',
          detail:
            'Les recruteurs expérimentés en demandent un délibérément. Un projet stoppé avec une leçon fait plus mûr qu’un parcours sans accroc.',
        },
      ],
      faq: [
        {
          question: 'La certification PMP ou PRINCE2 vaut-elle le coup ?',
          answer:
            'Surtout dans les grands groupes, le secteur public et les réponses à appels d’offres, où elle est parfois exigée formellement. Dans les organisations produit, les projets de référence comptent nettement plus. Ce sont les profils sans historique documenté qui y gagnent le plus.',
        },
        {
          question: 'Comment décrire des projets couverts par une clause de confidentialité ?',
          answer:
            'Anonymisez le client et donnez secteur, ordre de grandeur et résultat : « équipementier automobile, 250 M€ de chiffre d’affaires, migration de 14 systèmes ». C’est licite et plus parlant qu’un nom connu sans contexte.',
        },
        {
          question: 'Comment passer d’expert métier à chef de projet ?',
          answer:
            'Faites apparaître les pilotages de lot, les rôles de coordination et les intérims comme des lignes distinctes. La plupart des transitions réussies se font en interne ou dans le même secteur, où l’expertise compense l’historique manquant.',
        },
      ],
    },
    interview: {
      slug: 'chef-de-projet',
      metaTitle: 'Entretien de chef de projet : questions et réponses',
      metaDescription:
        'Questions d’entretien en gestion de projet : escalade, dérive du périmètre, projet raté — ce qui est évalué et comment structurer vos réponses.',
      heading: 'Entretien d’embauche de chef de projet',
      intro:
        'Presque toutes les questions posées à un chef de projet sont comportementales. On n’attend pas des connaissances méthodologiques mais un cas réel, raconté dans une structure que quelqu’un d’extérieur peut suivre.',
      questions: [
        {
          question: 'Parlez-moi d’un projet qui a dérapé.',
          why: 'La question la plus importante. On veut savoir si vous corrigez tôt ou si vous découvrez au jalon.',
          tip: 'Quand vous l’avez vu, à quel signal, ce que vous avez changé, le résultat. Prenez un cas réel, pas le plus anodin.',
        },
        {
          question: 'Comment gérez-vous la dérive du périmètre ?',
          why: 'On vérifie si vous pilotez les demandes ou si vous les transmettez.',
          tip: 'Décrivez votre processus de changement : évaluer, chiffrer l’impact sur délai et budget, faire arbitrer — sans refuser vous-même.',
        },
        {
          question: 'Comment animez-vous une équipe sans lien hiérarchique ?',
          why: 'Le cœur du métier : on écoute l’influence par la transparence et la fiabilité.',
          tip: 'Donnez un exemple où vous avez gagné quelqu’un qui n’avait objectivement pas de temps pour votre projet.',
        },
        {
          question: 'Quand escaladez-vous, et comment ?',
          why: 'Trop tôt passe pour de la faiblesse, trop tard pour de l’imprudence. On veut votre seuil.',
          tip: 'Définissez le déclencheur — délai, budget ou qualité non tenables — et escaladez avec une option, pas avec un problème.',
        },
        {
          question: 'Comment arbitrez-vous entre deux parties prenantes de même niveau ?',
          why: 'On vérifie si vous faites remonter la décision au bon endroit.',
          tip: 'Rendre les critères visibles, faire trancher ensemble, tracer la décision.',
        },
        {
          question: 'Comment mesurez-vous la réussite d’un projet ?',
          why: 'Cela distingue la logique de livraison de la logique de valeur.',
          tip: 'Au-delà du délai, du budget et du périmètre, citez le bénéfice après mise en service : adoption, temps gagné, défauts évités.',
        },
      ],
      redFlags: [
        'Ne présenter que des projets réussis.',
        'Imputer chaque retard au métier, à l’informatique ou au prestataire.',
        'Ne pouvoir citer aucun chiffre sur son propre projet.',
      ],
      askThem: [
        'Qui décide de la priorité des projets ici, et à quelle fréquence l’ordre change-t-il ?',
        'Comment s’articulent l’organisation projet et l’organisation hiérarchique ?',
        'Quel projet a échoué le plus récemment, et qu’est-ce qui a changé ensuite ?',
      ],
      faq: [
        {
          question: 'Faut-il recommander une méthode pendant l’entretien ?',
          answer:
            'Seulement avec un raisonnement tiré de leur contexte. « Je partirais sur de l’hybride, parce que la livraison matérielle a des dates fixes alors que le logiciel supporte l’itération » montre du jugement. Un attachement général à « l’agile » paraît non examiné.',
        },
        {
          question: 'Comment aborder une étude de cas ?',
          answer:
            'Posez des questions avant de planifier. Les évaluateurs valorisent presque toujours les questions de cadrage au-dessus du plan fini : dessiner un planning d’emblée est la manière la plus courante de perdre l’exercice.',
        },
      ],
    },
  },

  'sales-representative': {
    name: 'Commercial',
    application: {
      slug: 'commercial',
      metaTitle: 'Candidature de commercial : lettre, CV et chiffres',
      metaDescription:
        'Candidature commerciale : quels chiffres mettre en avant, quels mots-clés passent les filtres, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature de commercial',
      intro:
        'Dans la vente, la candidature est le premier échantillon de travail : qui ne sait pas se vendre ne vendra rien d’autre. Elle est donc lue durement, et d’abord pour les chiffres.',
      atsKeywords: [
        'Développement commercial',
        'Prospection',
        'Gestion de portefeuille',
        'Vente B2B',
        'Chiffre d’affaires',
        'Atteinte des objectifs',
        'CRM (Salesforce, HubSpot)',
        'Gestion du pipeline',
        'Négociation commerciale',
        'Vente additionnelle',
        'Grands comptes',
        'Qualification de leads',
      ],
      hardSkills: [
        {
          label: 'Objectif et atteinte',
          detail:
            'Objectif annuel, réalisation effective, rang dans l’équipe. « 112 % d’un objectif de 1,8 M€ » est la ligne la plus forte de votre dossier.',
        },
        {
          label: 'Type de vente et cycle',
          detail:
            'Entrant ou sortant, conquête ou fidélisation, B2B ou B2C, panier moyen, durée du cycle : chacun de ces points filtre.',
        },
        {
          label: 'Rigueur CRM',
          detail:
            'Citez l’outil et ce que vous y pilotiez. Les directions commerciales interrogent presque toujours la tenue du pipeline.',
        },
        {
          label: 'Secteur et produit',
          detail:
            'Vendre des biens d’équipement complexes est un autre métier que la vente transactionnelle rapide. Situez-vous clairement.',
        },
      ],
      softSkills: [
        'Encaisser le refus sur des cycles longs',
        'Écouter plutôt que présenter',
        'Mener une négociation jusqu’à la signature',
        'S’organiser seul en itinérance',
        'Construire une relation sur plusieurs années',
      ],
      certifications: [
        'BTS NDRC ou BTS MCO',
        'Salesforce Certified Administrator',
        'Formation MEDDIC / SPIN Selling',
        'Formation à la négociation (méthode Harvard)',
      ],
      cvFocus: [
        {
          label: 'Des chiffres à chaque poste',
          detail: 'Objectif, atteinte, chiffre d’affaires porté, nombre de comptes — à chaque ligne, pas seulement la dernière.',
        },
        {
          label: 'Secteur géographique et déplacements',
          detail: 'Région, taux de déplacement et permis B doivent apparaître dès la première page.',
        },
        {
          label: 'Expliquer les passages courts',
          detail:
            'Les changements sont fréquents dans la vente et restent comptés. Une demi-phrase sur la raison évite la supposition évidente.',
        },
      ],
      coverLetterOpener:
        'En trois ans, j’ai porté le secteur Sud de 1,2 à 2,1 M€ de chiffre d’affaires annuel, principalement en conquête dans la machine-outil, sur un cycle moyen de sept mois.',
      mistakes: [
        {
          label: 'Aucun chiffre',
          detail: 'Un CV commercial sans objectifs se lit comme un signal d’alerte : ceux qui ont de bons chiffres les affichent.',
        },
        {
          label: 'Des adjectifs à la place d’une culture de la vente',
          detail: '« Orienté client et fort tempérament commercial » figure dans une candidature sur deux et ne dit rien.',
        },
        {
          label: 'Aucune référence à ce qui est vendu',
          detail:
            'Les directions commerciales vérifient précisément si vous avez compris le produit et sa cible.',
        },
      ],
      faq: [
        {
          question: 'Que faire si je n’ai pas atteint mes objectifs ?',
          answer:
            'Indiquez-les quand même, avec le contexte : marché en repli, changement de gamme, secteur créé de zéro. Les chiffres omis ressortent en entretien ; les chiffres expliqués montrent que vous maîtrisez votre pipeline.',
        },
        {
          question: 'Peut-on citer des clients dans une candidature ?',
          answer:
            'Les références publiques, oui. Pour le reste, une description suffit : « trois groupes du CAC 40 dans la logistique » est sans risque et produit le même effet.',
        },
        {
          question: 'Comment aborder la question du variable ?',
          answer:
            'Dans la candidature uniquement si les prétentions sont demandées, et alors en package : fixe, variable et base de calcul du variable. La répartition fixe/variable se discute en entretien, pas dans la lettre.',
        },
      ],
    },
    interview: {
      slug: 'commercial',
      metaTitle: 'Entretien de commercial : questions fréquentes et réponses',
      metaDescription:
        'Entretien commercial : traitement des objections, pipeline, affaires perdues et mise en situation — ce qui est évalué et comment répondre.',
      heading: 'Entretien d’embauche de commercial',
      intro:
        'Un entretien commercial est lui-même un entretien de vente, et il est noté comme tel. Presque tous comportent un passage sur les chiffres et souvent une courte mise en situation où vous devez présenter ou traiter une objection.',
      questions: [
        {
          question: 'Quels ont été vos chiffres ces trois dernières années ?',
          why: 'La question d’ouverture : on évalue le niveau, mais aussi si vous avez vos propres indicateurs en tête.',
          tip: 'Objectif, atteinte, classement dans l’équipe — année par année. Hésiter ici est la pire des réponses.',
        },
        {
          question: 'Vendez-moi ce produit.',
          why: 'On teste si vous questionnez avant de parler.',
          tip: 'Commencez par trois questions de découverte. Énumérer des caractéristiques fait perdre l’exercice.',
        },
        {
          question: 'Comment traitez-vous l’objection « c’est trop cher » ?',
          why: 'On vérifie si vous raisonnez en valeur ou en remise.',
          tip: 'Demandez par rapport à quoi c’est cher, puis construisez la valeur. Remiser d’emblée passe pour une faiblesse.',
        },
        {
          question: 'À quoi ressemble votre pipeline aujourd’hui ?',
          why: 'On teste la méthode : combien d’affaires, à quel stade, avec quelle probabilité.',
          tip: 'Décrivez vos stades et votre ratio pipeline/objectif — un facteur 3 à 4 est la norme.',
        },
        {
          question: 'Parlez-moi d’une affaire perdue.',
          why: 'Lucidité : qui ne perd jamais vend trop peu ou manque de franchise.',
          tip: 'La raison, ce que vous avez vu trop tard, ce que vous faites différemment depuis.',
        },
        {
          question: 'Comment conquérez-vous sans leads entrants ?',
          why: 'On établit si vous savez réellement prospecter.',
          tip: 'Décrivez votre cadence concrètement : recherche, premier contact, relances — avec les chiffres de votre semaine.',
        },
      ],
      redFlags: [
        'Ne pas connaître ses propres chiffres ou répondre de façon évasive.',
        'Parler au lieu de questionner pendant la mise en situation.',
        'Attribuer chaque réussite au produit ou au marché.',
      ],
      askThem: [
        'Comment l’objectif est-il fixé, et combien de commerciaux l’ont atteint l’an dernier ?',
        'Quelle est la répartition fixe/variable, et quand le variable est-il versé ?',
        'D’où viennent les leads, et quelle part de prospection est attendue ?',
      ],
      faq: [
        {
          question: 'Comment préparer la mise en situation ?',
          answer:
            'Étudiez leur produit et leurs clients types, puis préparez cinq bonnes questions de découverte. L’exercice ne teste presque jamais la connaissance produit mais la conduite d’entretien : questions d’abord, valeur ensuite.',
        },
        {
          question: 'Faut-il « conclure » pendant l’entretien ?',
          answer:
            'Oui, au sens attendu dans la vente : demandez clairement les prochaines étapes et le calendrier en fin d’échange. Une tentative de closing agressive sur le poste lui-même paraît en revanche jouée.',
        },
      ],
    },
  },

  accountant: {
    name: 'Comptable',
    application: {
      slug: 'comptable',
      metaTitle: 'Candidature de comptable : lettre, CV et logiciels',
      metaDescription:
        'Candidature en comptabilité : quels logiciels et diplômes mettre en avant, quels mots-clés filtrent, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature de comptable',
      intro:
        'En comptabilité, on filtre rarement sur la personnalité et presque toujours sur trois points : quels logiciels vous maîtrisez, jusqu’où vous allez seul dans la clôture, et selon quel référentiel. Sans réponse dans les premières lignes, le dossier est écarté.',
      atsKeywords: [
        'Comptabilité générale',
        'Comptabilité clients',
        'Comptabilité fournisseurs',
        'Clôture mensuelle',
        'Bilan et liasse fiscale',
        'Normes françaises (PCG)',
        'IFRS',
        'Déclaration de TVA',
        'Sage',
        'Cegid',
        'SAP FI',
        'Immobilisations',
        'Rapprochements bancaires',
        'Révision des comptes',
      ],
      hardSkills: [
        {
          label: 'Jusqu’où vous clôturez seul',
          detail:
            'Clôture mensuelle, trimestrielle ou bilan complet — en autonomie ou en appui. C’est le critère de sélection décisif.',
        },
        {
          label: 'Logiciel et module',
          detail:
            'Sage, Cegid, SAP FI, Quadratus, Pennylane — et le module. Un nom d’outil sans précision ne dit presque rien.',
        },
        {
          label: 'Référentiel comptable',
          detail:
            'PCG, IFRS ou les deux. Les candidatures en groupe échouent régulièrement parce que l’IFRS manque au CV.',
        },
        {
          label: 'Fiscalité et déclarations',
          detail:
            'TVA, DEB/DES, autoliquidation, livraisons intracommunautaires : indispensable dès qu’il y a de l’international.',
        },
      ],
      softSkills: [
        'Rigueur sur de gros volumes de pièces',
        'Respect des délais de clôture',
        'Relation avec l’expert-comptable et les commissaires aux comptes',
        'Discrétion sur les données salariales et financières',
        'Patience face aux demandes des opérationnels',
      ],
      certifications: [
        'DCG (diplôme de comptabilité et de gestion)',
        'DSCG (diplôme supérieur de comptabilité et de gestion)',
        'BTS Comptabilité et gestion',
        'Certification Sage ou Cegid',
      ],
      cvFocus: [
        {
          label: 'Taille de l’entreprise et volumétrie',
          detail:
            'PME de 40 salariés ou groupe de 12 sociétés : ce contexte détermine la lecture de toute votre expérience.',
        },
        {
          label: 'Nommer précisément les travaux de clôture',
          detail: '« Participation au bilan » et « établissement du bilan » sont deux postes différents.',
        },
        {
          label: 'Les logiciels dans un bloc dédié',
          detail: 'Outils, modules et années de pratique sous forme de tableau : c’est ainsi que c’est réellement lu.',
        },
      ],
      coverLetterOpener:
        'Depuis cinq ans, j’établis la clôture mensuelle en normes françaises pour trois sociétés représentant environ 1 800 pièces par mois, et je prépare le bilan en autonomie sous Cegid.',
      mistakes: [
        {
          label: 'Indiquer seulement « comptabilité »',
          detail:
            'Clients, fournisseurs, immobilisations et clôture sont des profils distincts. Sans distinction, vous ne correspondez précisément à aucune offre.',
        },
        {
          label: 'Annoncer un logiciel sans profondeur',
          detail: '« Connaissance de SAP » sera testée en entretien. Nommez modules et travaux, sinon cela paraît gonflé.',
        },
        {
          label: 'Omettre les formations récentes',
          detail:
            'La fiscalité change chaque année. Sans formation récente, on suppose que vous travaillez sur un état ancien du droit.',
        },
      ],
      faq: [
        {
          question: 'Le DCG ou le DSCG sont-ils indispensables ?',
          answer:
            'Pour les postes à responsabilité de clôture, ils sont souvent explicitement demandés et constituent le principal levier de rémunération. Pour un poste clients ou fournisseurs, ils ne sont pas nécessaires : la volumétrie et la maîtrise logicielle comptent davantage.',
        },
        {
          question: 'L’expérience en cabinet compte-t-elle en entreprise ?',
          answer:
            'Oui, elle est lue comme une base large, couvrant de nombreux clients et formes juridiques. Précisez les secteurs et les travaux de clôture couverts, sinon elle reste trop générale pour être valorisée.',
        },
        {
          question: 'Faut-il indiquer ses prétentions salariales ?',
          answer:
            'Si l’annonce le demande, oui — les omettre donne une impression de dossier incomplet. Calez-vous sur la taille de l’entreprise et le niveau de responsabilité de clôture plutôt que sur la seule ancienneté.',
        },
      ],
    },
    interview: {
      slug: 'comptable',
      metaTitle: 'Entretien de comptable : questions fréquentes et réponses',
      metaDescription:
        'Entretien en comptabilité : autonomie de clôture, écarts de rapprochement, erreurs et logiciels — ce qui est évalué et quoi demander.',
      heading: 'Entretien d’embauche de comptable',
      intro:
        'Les entretiens en comptabilité sont plus techniques que la moyenne : le responsable comptable est généralement présent et vérifie sur des cas concrets votre autonomie réelle. Un court volet technique est la règle plutôt que l’exception.',
      questions: [
        {
          question: 'Quelles clôtures réalisez-vous en autonomie ?',
          why: 'La question de classement : elle détermine le poste et la fourchette salariale.',
          tip: 'Soyez exact : clôture mensuelle en autonomie, bilan en appui. Une exagération se voit dès la première clôture.',
        },
        {
          question: 'Comment traitez-vous un écart de rapprochement ?',
          why: 'On teste la méthode, pas la mémoire.',
          tip: 'Décrivez votre démarche : circonscrire par période et par compte, vérifier les journaux, retrouver la pièce, tracer la correction.',
        },
        {
          question: 'Quelle est votre expérience du PCG et des IFRS ?',
          why: 'On établit si vous êtes employable en environnement de groupe.',
          tip: 'Citez des différences concrètes que vous avez traitées — provisions ou contrats de location par exemple.',
        },
        {
          question: 'Parlez-moi d’une erreur que vous avez commise.',
          why: 'Plus important ici qu’ailleurs : on cherche quelqu’un qui signale plutôt qu’il ne corrige en silence.',
          tip: 'Erreur, incidence, signalement, correction, contrôle mis en place — dans cet ordre.',
        },
        {
          question: 'Comment suivez-vous les évolutions fiscales ?',
          why: 'On teste l’initiative dans un métier dont le droit change chaque année.',
          tip: 'Citez des sources et des formations précises, pas « la documentation professionnelle ».',
        },
        {
          question: 'Comment travaillez-vous sous la pression de la clôture ?',
          why: 'La semaine de clôture est l’épreuve du métier.',
          tip: 'Décrivez votre séquencement et la façon d’obtenir à temps les éléments des autres services.',
        },
      ],
      redFlags: [
        'Annoncer des compétences logicielles que le volet technique ne confirme pas.',
        'Présenter les erreurs comme la faute d’un autre service.',
        'Ne citer aucune formation récente.',
      ],
      askThem: [
        'Combien de sociétés et quel volume le service traite-t-il, et comment le travail est-il réparti ?',
        'Comment se déroule la clôture, et combien de jours prend-elle aujourd’hui ?',
        'Quels systèmes sont en place, et des migrations sont-elles prévues ?',
      ],
      faq: [
        {
          question: 'Y a-t-il un test technique ?',
          answer:
            'Souvent, et généralement court : quelques écritures, une régularisation, une question de TVA. On vise l’aisance de base, pas le niveau d’examen — attendez-vous à des cas standards du poste.',
        },
        {
          question: 'Comment expliquer un passage du cabinet à l’entreprise ?',
          answer:
            'Comme une recherche de profondeur plutôt que de diversité : suivre une société toute l’année au lieu de nombreux dossiers en parallèle. C’est la raison attendue — évitez de fonder l’explication sur la seule charge de travail.',
        },
      ],
    },
  },

  'marketing-manager': {
    name: 'Responsable marketing',
    application: {
      slug: 'responsable-marketing',
      metaTitle: 'Candidature marketing : lettre de motivation, CV et KPI',
      metaDescription:
        'Candidature de responsable marketing : quels indicateurs convainquent, quels canaux et outils citer, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature de responsable marketing',
      intro:
        'Les candidatures marketing échouent rarement sur la mise en forme et presque toujours sur l’absence de chiffres. Citez canal, budget et résultat et vous êtes lu comme un responsable ; listez des campagnes et vous êtes lu comme un exécutant.',
      atsKeywords: [
        'Marketing digital',
        'Gestion de campagnes',
        'SEO',
        'SEA / Google Ads',
        'Marketing de contenu',
        'E-mailing',
        'Réseaux sociaux',
        'Marketing automation (HubSpot)',
        'Google Analytics 4',
        'Taux de conversion',
        'CAC / ROAS',
        'Responsabilité budgétaire',
        'Stratégie de marque',
        'Test A/B',
      ],
      hardSkills: [
        {
          label: 'Des KPI avec une base de départ',
          detail:
            '« CAC ramené de 180 € à 120 € » dit plus que n’importe quel pourcentage sans point de départ. Donnez toujours les deux valeurs.',
        },
        {
          label: 'La profondeur plutôt que la liste de canaux',
          detail:
            'Deux canaux réellement pilotés valent mieux que huit effleurés. Précisez le budget que vous portiez.',
        },
        {
          label: 'Outils et données',
          detail: 'GA4, HubSpot, Salesforce Marketing Cloud, Looker Studio — les filtres cherchent littéralement ces noms.',
        },
        {
          label: 'B2B ou B2C',
          detail:
            'Des cycles longs avec nurturing sont un autre métier que la performance en e-commerce.',
        },
      ],
      softSkills: [
        'Travailler avec les ventes et le produit',
        'Piloter agences et indépendants',
        'Arbitrer un budget contraint',
        'Défendre ses résultats en comité de direction',
        'Sûreté rédactionnelle',
      ],
      certifications: [
        'Certifications Google Ads (Search, Performance Max)',
        'Certification Google Analytics 4',
        'HubSpot Inbound Marketing / Marketing Software',
        'Master ou licence professionnelle en marketing digital',
      ],
      cvFocus: [
        {
          label: 'Un résultat par poste',
          detail: 'Un indicateur qui a bougé de façon démontrable grâce à votre travail. C’est suffisant.',
        },
        {
          label: 'Budget et taille d’équipe',
          detail: 'Avoir piloté 30 000 € ou 3 M€ détermine le niveau de poste auquel vous êtes lu.',
        },
        {
          label: 'Un portfolio en lien',
          detail:
            'Deux ou trois campagnes avec objectif, exécution et résultat, en page ou en PDF. Un lien remplace une page de description.',
        },
      ],
      coverLetterOpener:
        'Chez [Entreprise], j’ai porté un budget d’acquisition de 40 000 € par mois et ramené le coût par lead de 94 € à 61 € en deux trimestres, sans dégrader le taux de transformation commercial.',
      mistakes: [
        {
          label: 'De la créativité sans effet',
          detail: 'Une campagne réussie esthétiquement mais sans résultat ne convainc aucune direction. Citez toujours l’objectif.',
        },
        {
          label: 'Revendiquer trop de canaux',
          detail: 'Être expert partout se lit comme n’être expert nulle part — et se défait vite en entretien.',
        },
        {
          label: 'Sur-designer sa candidature',
          detail:
            'Les mises en page complexes sont souvent illisibles pour un ATS. Un CV clair et un portfolio en lien restent la voie sûre.',
        },
      ],
      faq: [
        {
          question: 'Un portfolio est-il nécessaire en marketing ?',
          answer:
            'Pour les postes éditoriaux et créatifs oui ; pour les postes acquisition et analytics, une synthèse chiffrée vaut davantage. Dans les deux cas un lien suffit : les pièces jointes de plus de 5 Mo sont souvent rejetées par les messageries.',
        },
        {
          question: 'Comment traiter des KPI confidentiels ?',
          answer:
            'Utilisez des valeurs relatives : « taux de conversion augmenté de 34 % » plutôt que le chiffre d’affaires absolu. C’est conforme à la confidentialité et parfaitement suffisant pour évaluer votre travail.',
        },
        {
          question: 'Les compétences en IA sont-elles attendues ?',
          answer:
            'De plus en plus, mais comme un outil et non comme une fin. Ce qui convainc, c’est de décrire quel processus vous avez accéléré et comment vous continuez à garantir la qualité.',
        },
      ],
    },
    interview: {
      slug: 'responsable-marketing',
      metaTitle: 'Entretien marketing : questions fréquentes et réponses',
      metaDescription:
        'Entretien de responsable marketing : campagnes, KPI, budget et échecs — ce qui est réellement évalué et comment structurer vos réponses.',
      heading: 'Entretien d’embauche de responsable marketing',
      intro:
        'Un entretien marketing démonte presque toujours une campagne en détail. On attend que vous sépariez proprement objectif, cible, budget, résultat et votre propre contribution — et c’est précisément là que la plupart des candidats trébuchent.',
      questions: [
        {
          question: 'Parlez-moi d’une campagne dont vous êtes fier.',
          why: 'On évalue si vous raisonnez en objectifs ou en actions.',
          tip: 'Objectif, cible, canal, budget, résultat, votre part — dans cet ordre, en deux minutes.',
        },
        {
          question: 'Quelle campagne a échoué, et pourquoi ?',
          why: 'Le marketing est itératif : qui n’a jamais arrêté une campagne n’a jamais vraiment testé.',
          tip: 'Citez l’hypothèse, ce qui l’a infirmée, et ce que vous avez changé ensuite.',
        },
        {
          question: 'Quel indicateur suivez-vous quotidiennement ?',
          why: 'Cela distingue le pilotage opérationnel du reporting de fin de mois.',
          tip: 'Citez-en un et justifiez pourquoi il représente le mieux l’activité.',
        },
        {
          question: 'Comment amélioreriez-vous notre marketing ?',
          why: 'On teste la préparation : presque tous les candidats répondent de façon générale.',
          tip: 'Deux observations concrètes tirées de leur site ou de leurs annonces, avec un raisonnement.',
        },
        {
          question: 'Comment travaillez-vous avec les commerciaux ?',
          why: 'La ligne de friction la plus courante en B2B.',
          tip: 'Décrivez des définitions de lead partagées et une boucle de retour sur la qualité, pas seulement des transmissions.',
        },
        {
          question: 'Comment répartissez-vous un budget contraint ?',
          why: 'On teste la priorisation et la culture du test.',
          tip: 'Décrivez une répartition entre l’acquis et les tests, avec un critère d’arrêt.',
        },
      ],
      redFlags: [
        'Citer des indicateurs qu’on ne sait pas reconstituer quand on est questionné.',
        'S’attribuer tous les succès et imputer tous les échecs au budget.',
        'Ne pas avoir regardé le produit de l’entreprise avant l’entretien.',
      ],
      askThem: [
        'Quel indicateur décide ici de la réussite du marketing ?',
        'Comment le budget se répartit-il entre marque et acquisition ?',
        'Quelle est la coopération réelle entre marketing et ventes sur la définition du lead ?',
      ],
      faq: [
        {
          question: 'Faut-il préparer une étude de cas spontanément ?',
          answer:
            'Si rien n’est demandé, deux observations concrètes sur leur marketing suffisent. Cela paraît préparé sans être présomptueux — un plan complet non sollicité passe souvent pour mal informé.',
        },
        {
          question: 'Comment répondre sur des outils que je ne connais pas ?',
          answer:
            'Situez-vous honnêtement et citez l’équivalent : « je n’ai pas utilisé HubSpot, mais Marketo dans la même fonction ». Les outils marketing s’apprennent ; une affirmation fausse se voit dès la première semaine.',
        },
      ],
    },
  },

  'data-analyst': {
    name: 'Analyste de données',
    application: {
      slug: 'analyste-de-donnees',
      metaTitle: 'Candidature data analyst : lettre, CV et compétences',
      metaDescription:
        'Candidature d’analyste de données : quels outils et méthodes citer, comment prouver l’impact, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature d’analyste de données',
      intro:
        'On ne recrute pas un analyste sur ses outils mais sur le fait que son analyse a changé une décision. Tout le monde annonce SQL ; la différence tient à votre capacité à dire ce qui a été fait autrement après votre travail.',
      atsKeywords: [
        'Analyse de données',
        'SQL',
        'Python',
        'R',
        'Power BI',
        'Tableau',
        'Looker',
        'Visualisation de données',
        'ETL',
        'Entrepôt de données',
        'dbt',
        'Test A/B',
        'Reporting et KPI',
        'Statistiques',
      ],
      hardSkills: [
        {
          label: 'Un SQL réellement approfondi',
          detail:
            'Fonctions de fenêtrage, CTE, optimisation de requêtes. Presque tous les processus comportent un test SQL, et un niveau superficiel s’y voit immédiatement.',
        },
        {
          label: 'Un outil de BI vraiment maîtrisé',
          detail:
            'Power BI, Tableau ou Looker — modélisation comprise, pas seulement des graphiques posés sur une table finie.',
        },
        {
          label: 'Jugement statistique',
          detail: 'Significativité, intervalle de confiance, taille d’échantillon : la frontière entre reporting et analyse.',
        },
        {
          label: 'Connaissance du domaine',
          detail:
            'E-commerce, finance, logistique ou santé : connaître les indicateurs du secteur vous rend utile dès le premier jour.',
        },
      ],
      softSkills: [
        'Expliquer un résultat à un public non analytique',
        'Transformer une question floue en question exploitable',
        'Se méfier de sa propre analyse',
        'Documenter proprement ses hypothèses',
        'Annoncer un résultat qui dérange',
      ],
      certifications: [
        'Microsoft Certified: Power BI Data Analyst Associate',
        'Tableau Desktop Specialist',
        'Google Data Analytics Professional Certificate',
        'AWS Certified Data Engineer – Associate',
      ],
      cvFocus: [
        {
          label: 'Des décisions, pas des tableaux de bord',
          detail:
            '« L’analyse du churn a conduit à refondre l’accueil client ; résiliations en baisse de 18 % » plutôt que « création de tableaux de bord ».',
        },
        {
          label: 'Volume et sources de données',
          detail: 'L’ordre de grandeur et le nombre de systèmes connectés montrent dans quel environnement vous travaillez.',
        },
        {
          label: 'Un exemple de travail public',
          detail: 'Un notebook ou un tableau de bord public avec une question et une réponse remplace beaucoup d’affirmations.',
        },
      ],
      coverLetterOpener:
        'Mon analyse de cohortes chez [Entreprise] a montré que 60 % des résiliations surviennent dans les 30 premiers jours ; la refonte de l’accueil client qui a suivi a réduit le churn de 18 % au trimestre suivant.',
      mistakes: [
        {
          label: 'Une liste d’outils au lieu d’une question',
          detail: 'Tous les candidats ont SQL et Python. Presque aucun n’écrit la question qu’il a traitée avec.',
        },
        {
          label: 'Confondre analyste et data scientist',
          detail:
            'Revendiquer des modèles jamais mis en production mène droit aux questions gênantes du volet technique.',
        },
        {
          label: 'Argumenter sans lien avec le métier',
          detail: 'Une analyse méthodologiquement propre mais sans usage visible ne convainc aucun opérationnel.',
        },
      ],
      faq: [
        {
          question: 'Faut-il un diplôme en statistiques ou en informatique ?',
          answer:
            'Non : les reconversions sont fréquentes en analyse de données. Ce qui décide, c’est un travail témoin solide : une vraie question, proprement traitée, clairement présentée. Sans diplôme, c’est l’exemple qui pèse davantage, pas la longueur de la candidature.',
        },
        {
          question: 'Comment prouver son expérience si les données sont confidentielles ?',
          answer:
            'Décrivez la question, la méthode et l’impact sans valeurs absolues, et ajoutez un projet sur des données publiques. Cette combinaison — pratique décrite, savoir-faire vérifiable — est la voie habituelle.',
        },
        {
          question: 'Comment préparer le test SQL ?',
          answer:
            'Entraînez-vous aux jointures, agrégations, fonctions de fenêtrage et CTE sur un vrai jeu de données, chronomètre en main. Presque tous les processus en comportent un, et c’est le principal point d’élimination.',
        },
      ],
    },
    interview: {
      slug: 'analyste-de-donnees',
      metaTitle: 'Entretien data analyst : questions fréquentes et réponses',
      metaDescription:
        'Entretien d’analyste de données : test SQL, étude de cas et questions comportementales — ce qui est évalué et comment répondre.',
      heading: 'Entretien d’embauche d’analyste de données',
      intro:
        'Le processus comporte le plus souvent trois étapes : un test SQL, une étude de cas ouverte et un échange avec le métier. C’est dans l’étude de cas que la plupart des candidats échouent — non sur l’analyse, mais parce qu’ils calculent avant de questionner.',
      questions: [
        {
          question: 'Un indicateur a chuté de 30 % du jour au lendemain. Comment procédez-vous ?',
          why: 'La question de diagnostic classique : on teste la méthode, pas l’intuition.',
          tip: 'Écarter d’abord un problème de données, puis segmenter — région, appareil, canal, cohorte — puis tester des hypothèses.',
        },
        {
          question: 'Comment présentez-vous un résultat que le métier ne veut pas entendre ?',
          why: 'On évalue à la fois la fermeté et la communication.',
          tip: 'Résultat, méthode, incertitude, options. Un exemple réel est ce qui porte le plus ici.',
        },
        {
          question: 'Comment vous assurez-vous que vos chiffres sont justes ?',
          why: 'La qualité des données est le cœur du poste.',
          tip: 'Contrôles de vraisemblance, recoupement avec une seconde source, hypothèses documentées — citez-les concrètement.',
        },
        {
          question: 'Expliquez un test A/B à quelqu’un sans bagage statistique.',
          why: 'On teste votre capacité à traduire.',
          tip: 'Aucun jargon, et un exemple tiré de leur produit.',
        },
        {
          question: 'Sur quoi avez-vous travaillé qui a changé une décision ?',
          why: 'Cela distingue le reporting de l’analyse.',
          tip: 'Citez la décision et qui l’a prise, pas le tableau de bord.',
        },
        {
          question: 'Comment priorisez-vous des demandes concurrentes ?',
          why: 'Un analyste est sollicité par tous les services : la priorisation est quotidienne.',
          tip: 'Prioriser selon l’enjeu décisionnel et l’échéance, et basculer les demandes récurrentes en self-service.',
        },
      ],
      redFlags: [
        'Se mettre à calculer dans l’étude de cas sans clarifier la question.',
        'Présenter une corrélation comme une cause.',
        'Poser des hypothèses sans les énoncer.',
      ],
      askThem: [
        'Qui utilise les analyses, et quelles décisions en dépendent ?',
        'Comment la chaîne de données est-elle construite, et quelle est la fiabilité des sources ?',
        'Le poste relève-t-il plutôt du self-service ou de l’analyse approfondie ?',
      ],
      faq: [
        {
          question: 'Quel est le niveau habituel du test SQL ?',
          answer:
            'Généralement intermédiaire sous contrainte de temps : plusieurs jointures, une agrégation, une fonction de fenêtrage. Plus fréquent que la difficulté est le piège de ne pas vérifier la vraisemblance du résultat — c’est également noté.',
        },
        {
          question: 'À quoi ressemble l’étude de cas ?',
          answer:
            'Une question métier ouverte, du type « pourquoi le réachat baisse-t-il ? ». On attend des questions de cadrage, une démarche et des hypothèses énoncées — pas un chiffre définitif.',
        },
      ],
    },
  },

  teacher: {
    name: 'Enseignant',
    application: {
      slug: 'enseignant',
      metaTitle: 'Candidature d’enseignant : lettre de motivation et dossier',
      metaDescription:
        'Candidature dans l’enseignement : concours, contractuel, pièces à fournir, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature d’enseignant',
      intro:
        'Dans l’enseignement, deux voies coexistent et se lisent différemment : le concours, où comptent la discipline et le classement, et le recrutement de contractuels par le rectorat ou l’établissement, où comptent la discipline en tension et votre disponibilité immédiate.',
      atsKeywords: [
        'Enseignement',
        'Discipline enseignée',
        'CAPES / CRPE / agrégation',
        'Contractuel de l’Éducation nationale',
        'Préparation de séquences',
        'Différenciation pédagogique',
        'Gestion de classe',
        'Évaluation des acquis',
        'Élèves à besoins particuliers',
        'Professeur principal',
        'Relation avec les familles',
        'Numérique éducatif',
      ],
      hardSkills: [
        {
          label: 'Discipline et niveau',
          detail:
            'La discipline et les niveaux enseignés déterminent presque tout. Les deux doivent figurer dès la première ligne.',
        },
        {
          label: 'Diplômes et concours',
          detail:
            'Licence, master MEEF, CAPES, CRPE ou agrégation, avec l’année d’obtention ; pour un diplôme étranger, l’attestation de comparabilité.',
        },
        {
          label: 'Expérience devant élèves hors stage',
          detail:
            'Remplacements, soutien scolaire, ateliers, formation d’adultes : tout ce qui montre que vous tenez une classe.',
        },
        {
          label: 'Qualifications complémentaires',
          detail:
            'FLE, numérique éducatif, accompagnement des élèves à besoins particuliers : c’est exactement ce que cherchent les chefs d’établissement.',
        },
      ],
      softSkills: [
        'Autorité sans rapport de force',
        'Entretiens avec des familles en désaccord',
        'Travail en équipe disciplinaire',
        'Patience face à des classes hétérogènes',
        'Fiabilité dans la vie de l’établissement',
      ],
      certifications: [
        'CAPES, CAPET, CRPE ou agrégation',
        'Master MEEF',
        'Certification FLE ou DAEFLE',
        'Certification en numérique éducatif (PIX+ Édu)',
      ],
      cvFocus: [
        {
          label: 'Type d’établissement et niveaux',
          detail: 'École, collège, lycée général, professionnel ou privé sous contrat, et les niveaux effectivement pris en charge.',
        },
        {
          label: 'Engagement hors cours',
          detail:
            'Clubs, sorties, projets, conseils : c’est souvent l’élément décisif lors d’un recrutement par l’établissement.',
        },
        {
          label: 'Lien avec le projet d’établissement',
          detail:
            'Section européenne, filière technologique, dispositif d’accompagnement : une phrase suffit à vous distinguer.',
        },
      ],
      coverLetterOpener:
        'Votre section européenne au collège correspond exactement à mon profil anglais-histoire : j’ai assuré pendant deux trimestres un enseignement d’histoire en anglais avec une classe de quatrième hétérogène.',
      mistakes: [
        {
          label: 'La même lettre pour le rectorat et pour l’établissement',
          detail:
            'Le rectorat attend des données formelles, le chef d’établissement attend une adéquation au projet. Deux textes sont nécessaires.',
        },
        {
          label: 'Des principes pédagogiques au lieu de pratique',
          detail:
            'Une demi-page de philosophie de l’éducation n’est pas lue. Une séquence décrite avec son résultat, si.',
        },
        {
          label: 'Un dossier incomplet',
          detail:
            'Diplômes, extrait de casier judiciaire, pièces d’état civil : une pièce manquante décale l’affectation de plusieurs semaines.',
        },
      ],
      faq: [
        {
          question: 'Comment devenir enseignant en reconversion ?',
          answer:
            'Par les concours (externe, interne, troisième concours) ou par le recrutement de contractuels via les rectorats. Ce qui décide l’éligibilité, c’est la correspondance entre votre diplôme et une discipline ; les disciplines en tension — mathématiques, lettres, allemand, technologie — offrent les meilleures perspectives.',
        },
        {
          question: 'Faut-il candidater au rectorat ou à l’établissement ?',
          answer:
            'Le plus souvent aux deux : le rectorat pour le vivier de remplacement, l’établissement pour les postes publiés. La voie directe est plus rapide, mais seulement là où un poste est effectivement ouvert.',
        },
        {
          question: 'Le classement au concours compte-t-il encore ensuite ?',
          answer:
            'Il détermine surtout l’affectation initiale et l’académie obtenue. Pour un poste spécifique publié, l’adéquation au projet d’établissement et les qualifications complémentaires pèsent nettement plus.',
        },
      ],
    },
    interview: {
      slug: 'enseignant',
      metaTitle: 'Entretien d’enseignant : questions fréquentes et réponses',
      metaDescription:
        'Entretien dans l’enseignement : gestion de classe, différenciation, familles et projet d’établissement — ce qui est évalué et quoi demander.',
      heading: 'Entretien d’embauche d’enseignant',
      intro:
        'Selon la voie, l’entretien est mené par un inspecteur, par le rectorat ou par le chef d’établissement. Dans tous les cas, on interroge des situations concrètes, et une séance observée pèse souvent davantage que l’entretien lui-même.',
      questions: [
        {
          question: 'Comment gérez-vous une classe qui ne se calme pas ?',
          why: 'La gestion de classe est la compétence centrale : on cherche des structures, pas du volume sonore.',
          tip: 'Décrivez les rituels et les règles posés en amont, pas seulement votre réaction sur le moment.',
        },
        {
          question: 'Comment différenciez-vous dans une classe hétérogène ?',
          why: 'Le quotidien de tous les niveaux. On attend de la pratique, pas de la théorie.',
          tip: 'Détaillez une séance avec des tâches graduées : supports, déroulé, résultat.',
        },
        {
          question: 'Racontez un entretien difficile avec une famille.',
          why: 'La relation aux familles prend beaucoup de temps et pèse sur les équipes.',
          tip: 'Écouter, séparer les faits du ressenti, convenir d’une suite, garder une trace.',
        },
        {
          question: 'Pourquoi notre établissement ?',
          why: 'La question décisive pour un poste publié.',
          tip: 'Appuyez-vous sur le projet d’établissement, un dispositif ou un projet précis.',
        },
        {
          question: 'Comment utilisez-vous le numérique en classe ?',
          why: 'On vérifie que l’outil est justifié didactiquement et non employé pour lui-même.',
          tip: 'Un exemple où l’outil a permis quelque chose d’impossible autrement.',
        },
        {
          question: 'Qu’apporteriez-vous en dehors de vos cours ?',
          why: 'Les établissements recrutent des collègues qui font vivre l’établissement.',
          tip: 'Soyez précis — un club, une responsabilité disciplinaire, un projet — et honnête sur votre disponibilité.',
        },
      ],
      redFlags: [
        'Imputer les problèmes de discipline uniquement aux élèves ou aux familles.',
        'Ne pas avoir lu le projet d’établissement.',
        'Ne parler qu’en formules pédagogiques sans un seul exemple.',
      ],
      askThem: [
        'Comment l’accueil des nouveaux collègues est-il organisé ?',
        'Quelles sont les priorités du projet d’établissement pour les deux prochaines années ?',
        'Comment le travail en équipe disciplinaire est-il organisé ?',
      ],
      faq: [
        {
          question: 'Comment se déroule une séance observée ?',
          answer:
            'En général une heure devant une classe qui n’est pas la vôtre, avec le thème communiqué à l’avance, suivie d’un entretien de reprise. C’est votre analyse de ce qui a fonctionné ou non qui est la plus regardée, davantage qu’une séance sans accroc.',
        },
        {
          question: 'Peut-on être recruté sans concours ?',
          answer:
            'Oui, comme contractuel, et c’est une voie d’entrée courante dans les disciplines en tension. Le contrat est à durée déterminée au départ, mais il ouvre l’accès aux concours internes une fois l’ancienneté acquise.',
        },
      ],
    },
  },

  'office-administrator': {
    name: 'Assistant administratif',
    application: {
      slug: 'assistant-administratif',
      metaTitle: 'Candidature d’assistant administratif : lettre et CV',
      metaDescription:
        'Candidature administrative : quelles missions et quels logiciels citer, exemple d’accroche et erreurs qui rendent un dossier interchangeable.',
      heading: 'Rédiger une candidature d’assistant administratif',
      intro:
        'Les postes administratifs reçoivent plus de candidatures que presque tous les autres, et la plupart sont interchangeables. Décrire son périmètre réel plutôt que « tâches administratives courantes » suffit déjà à se placer dans le premier tiers.',
      atsKeywords: [
        'Gestion administrative',
        'Administration des ventes',
        'Contrôle des factures',
        'Gestion des agendas',
        'Notes de frais',
        'Correspondance',
        'Pack Office / Excel',
        'ERP',
        'Saisie et mise à jour de données',
        'Établissement de devis',
        'Accueil et standard',
        'Gestion documentaire',
      ],
      hardSkills: [
        {
          label: 'Votre périmètre réel',
          detail:
            'Administration des ventes, facturation, gestion du personnel ou assistanat de direction : des métiers très différents sous un même intitulé.',
        },
        {
          label: 'Excel au-delà des bases',
          detail:
            'RECHERCHEV/RECHERCHEX, tableaux croisés dynamiques, filtres : c’est la compétence la plus souvent testée dans la famille.',
        },
        {
          label: 'ERP et logiciels de gestion',
          detail:
            'SAP, Sage, Cegid, Dynamics ou EBP, nommément : le temps d’intégration est un coût direct pour l’employeur.',
        },
        {
          label: 'Des volumes',
          detail:
            'Commandes par semaine, factures par mois, sites suivis : c’est ce qui rend « gestion administrative » concret.',
        },
      ],
      softSkills: [
        'Prioriser sans encadrement rapproché',
        'Rester courtois avec des interlocuteurs difficiles',
        'Tenir ses échéances de façon fiable',
        'Discrétion sur les données contractuelles et salariales',
        'Anticiper au-delà de sa propre tâche',
      ],
      certifications: [
        'BTS Support à l’action managériale ou BTS GPME',
        'Titre professionnel Assistant de direction',
        'Certification TOSA Excel',
        'Formation en comptabilité ou en paie',
      ],
      cvFocus: [
        {
          label: 'Secteur et taille de la structure',
          detail: 'Artisanat, cabinet, industrie ou secteur public : le quotidien n’a rien de comparable.',
        },
        {
          label: 'Les logiciels dans un bloc dédié',
          detail: 'Une courte liste avec le niveau d’usage est lue ; un paragraphe ne l’est pas.',
        },
        {
          label: 'Un parcours sans zone grise',
          detail: 'Le recrutement administratif examine la chronologie de près. Expliquez brièvement les interruptions.',
        },
      ],
      coverLetterOpener:
        'Dans mon poste actuel, je traite environ 120 commandes clients par semaine sous Sage 100 — de la saisie au suivi des délais jusqu’à la facturation.',
      mistakes: [
        {
          label: '« Tâches administratives courantes »',
          detail: 'La formule la plus fréquente du secteur, et celle qui informe le moins.',
        },
        {
          label: '« Bonne maîtrise du Pack Office »',
          detail: 'Tout le monde l’écrit. Dites ce que vous construisez réellement sous Excel et vous vous distinguez aussitôt.',
        },
        {
          label: 'Une lettre type sans référence',
          detail: 'Avec autant de candidats, c’est la phrase prouvant que vous avez lu l’annonce qui décide.',
        },
      ],
      faq: [
        {
          question: 'Comment se démarquer face à de nombreux candidats ?',
          answer:
            'Par la précision : volumes, logiciels et périmètre exact. La plupart des candidatures du secteur restent générales, si bien que trois détails précis suffisent à paraître au-dessus de la moyenne.',
        },
        {
          question: 'Comment expliquer une reprise après une interruption ?',
          answer:
            'Ouvertement et brièvement, sans justification, avec une ligne sur la remise à niveau — une formation bureautique ou comptable. Une interruption tue génère plus de questions qu’une interruption nommée.',
        },
        {
          question: 'La candidature spontanée est-elle utile ?',
          answer:
            'Oui, particulièrement dans l’administratif, où beaucoup de postes se pourvoient en interne ou par recommandation. Précisez le service visé : une candidature spontanée sans direction est rarement transmise.',
        },
      ],
    },
    interview: {
      slug: 'assistant-administratif',
      metaTitle: 'Entretien assistant administratif : questions et réponses',
      metaDescription:
        'Entretien administratif : organisation, Excel, priorisation et confidentialité — ce qui est évalué et quoi demander en retour.',
      heading: 'Entretien d’embauche d’assistant administratif',
      intro:
        'L’entretien réunit généralement le responsable direct et une personne des ressources humaines. On y sonde l’organisation personnelle, la rigueur et la résistance à la charge, sur des exemples concrets ; un court test Excel ou de rédaction est fréquent.',
      questions: [
        {
          question: 'Comment vous organisez-vous quand plusieurs urgences arrivent ensemble ?',
          why: 'Le cœur du poste : on attend un critère reproductible, pas de l’endurance.',
          tip: 'Prioriser par échéance et par conséquence, prévenir quand quelque chose glissera — avec un exemple.',
        },
        {
          question: 'Comment évitez-vous les erreurs ?',
          why: 'La rigueur est le premier critère du métier.',
          tip: 'Décrivez votre routine de contrôle : double lecture, liste de vérification, relecture avant envoi.',
        },
        {
          question: 'Quelles fonctions Excel utilisez-vous régulièrement ?',
          why: 'La compétence la plus surestimée sur les CV administratifs.',
          tip: 'Citez des fonctions précises et leur usage. Restez honnête : un test suit souvent.',
        },
        {
          question: 'Comment gérez-vous un interlocuteur mécontent au téléphone ?',
          why: 'On teste la désescalade et la fiabilité de l’engagement.',
          tip: 'Laisser finir, reformuler, s’engager sur une suite précise, puis tenir.',
        },
        {
          question: 'Comment traitez-vous des documents confidentiels ?',
          why: 'Les postes administratifs touchent aux données de personnel, de contrats et de salaires.',
          tip: 'Citez une pratique concrète : droits d’accès, archivage fermé, aucune transmission sans validation.',
        },
        {
          question: 'Que faites-vous si votre responsable est injoignable et qu’une décision s’impose ?',
          why: 'On teste l’autonomie et le discernement.',
          tip: 'Posez la limite : ce que vous décidez, ce que vous faites valider, comment vous le tracez.',
        },
      ],
      redFlags: [
        'Annoncer un niveau Excel que le test ne confirme pas.',
        'Répondre aux questions d’organisation par « je suis très organisé » et rien d’autre.',
        'Parler négativement d’anciens responsables ou collègues.',
      ],
      askThem: [
        'Comment le travail est-il réparti entre les personnes de l’équipe ?',
        'Quels logiciels sont utilisés, et combien de temps dure l’intégration ?',
        'Quelles seraient les priorités des trois premiers mois ?',
      ],
      faq: [
        {
          question: 'Y a-t-il un test ?',
          answer:
            'Fréquemment : un exercice Excel court, un contrôle d’orthographe ou un modèle de courrier. Ils dépassent rarement 30 minutes et visent l’aisance de base, pas une expertise.',
        },
        {
          question: 'Peut-on interroger sur le télétravail et les horaires ?',
          answer:
            'Oui, plus tard dans l’échange : ce sont des questions pratiques légitimes. Demandez ce que l’équipe pratique réellement plutôt que ce que prévoit l’accord, la réponse sera plus utile.',
        },
      ],
    },
  },

  'customer-service-agent': {
    name: 'Conseiller clientèle',
    application: {
      slug: 'conseiller-clientele',
      metaTitle: 'Candidature service client : lettre, CV et indicateurs',
      metaDescription:
        'Candidature de conseiller clientèle : quels indicateurs et outils citer, exemple d’accroche et erreurs qui banalisent un dossier.',
      heading: 'Rédiger une candidature de conseiller clientèle',
      intro:
        'Dans la relation client, le parcours compte moins que la preuve que vous savez tenir un échange sous pression. Citez canal, volume et indicateurs de qualité et vous êtes situé immédiatement ; les autres finissent dans la pile générale.',
      atsKeywords: [
        'Relation client',
        'Service client',
        'Support niveau 1',
        'Support niveau 2',
        'Traitement des réclamations',
        'Gestion des escalades',
        'CRM (Salesforce, Zendesk)',
        'Outil de ticketing',
        'Appels entrants / sortants',
        'Satisfaction client (CSAT)',
        'Taux de résolution au premier contact',
        'Engagement de service',
      ],
      hardSkills: [
        {
          label: 'Canal et volume',
          detail:
            'Téléphone, e-mail, chat ou réseaux sociaux — et le nombre de contacts par jour. 80 appels est un autre métier que 20 dossiers complexes.',
        },
        {
          label: 'Indicateurs de service',
          detail:
            'CSAT, résolution au premier contact, durée moyenne de traitement, respect des engagements : la langue de toute direction de service.',
        },
        {
          label: 'Outils',
          detail: 'Zendesk, Freshdesk, Salesforce Service Cloud, Easiware — nommément.',
        },
        {
          label: 'Profondeur métier',
          detail:
            'Support technique, assurance, énergie, e-commerce : la connaissance produit détermine intégration et rémunération.',
        },
      ],
      softSkills: [
        'Garder son calme face à un client en colère',
        'Écoute active',
        'Expliquer clairement sans jargon',
        'Endurance à forte cadence',
        'Tenir ses engagements',
      ],
      certifications: [
        'BTS NDRC ou titre professionnel Conseiller relation client à distance',
        'Salesforce Service Cloud Consultant',
        'ITIL Foundation (support technique)',
        'Certifications de langue (B2/C1)',
      ],
      cvFocus: [
        {
          label: 'Des indicateurs à chaque poste',
          detail: 'Contacts par jour, CSAT, résolution au premier contact : c’est ce qui est lu en premier.',
        },
        {
          label: 'Les langues avec leur niveau',
          detail: 'En service international, chaque langue supplémentaire est un levier direct de rémunération.',
        },
        {
          label: 'Disponibilité horaire',
          detail: 'Beaucoup de plateaux fonctionnent en horaires décalés : le clarifier tôt fait gagner du temps.',
        },
      ],
      coverLetterOpener:
        'Dans le secteur de l’énergie, je traite environ 60 contacts par jour en téléphone et en chat, avec un taux de résolution au premier contact de 84 % et un CSAT de 4,6 sur 5.',
      mistakes: [
        {
          label: 'Seulement « souriant et à l’écoute »',
          detail: 'On le lit dans presque toutes les candidatures du secteur. Un indicateur vaut mieux que tous les adjectifs.',
        },
        {
          label: 'Aucun volume indiqué',
          detail: 'Sans nombre de contacts, on ignore si vous tenez la charge — la question centrale du métier.',
        },
        {
          label: 'Taire l’expérience des réclamations',
          detail: 'Savoir traiter une escalade est la compétence la plus recherchée, pas un défaut.',
        },
      ],
      faq: [
        {
          question: 'L’expérience en restauration ou en commerce compte-t-elle ?',
          answer:
            'Oui, et elle est régulièrement sous-vendue. Traduisez-la en langage service : clients par service, réclamations traitées, litiges résolus — elle devient alors directement transposable.',
        },
        {
          question: 'Comment aborder le télétravail ?',
          answer:
            'La relation client est l’une des fonctions les plus souvent organisées à distance, la question est donc attendue. Posez-la en entretien plutôt que dans la lettre, et interrogez le fonctionnement réel de l’équipe.',
        },
        {
          question: 'Les langues comptent-elles plus que l’expérience sectorielle ?',
          answer:
            'En service international, souvent oui : une seconde langue en B2/C1 ouvre des postes autrement fermés. En support technique, la connaissance produit pèse davantage.',
        },
      ],
    },
    interview: {
      slug: 'conseiller-clientele',
      metaTitle: 'Entretien service client : questions fréquentes et réponses',
      metaDescription:
        'Entretien de conseiller clientèle : escalade, charge et indicateurs, souvent avec mise en situation — ce qui est évalué et comment répondre.',
      heading: 'Entretien d’embauche de conseiller clientèle',
      intro:
        'Les entretiens en relation client comportent presque toujours une mise en situation : on vous simule un client mécontent et vous devez mener l’échange. Ce qui est noté n’est pas la solution mais le fait d’écouter d’abord et de vous engager ensuite sur quelque chose de tenable.',
      questions: [
        {
          question: 'Un client est furieux et il a raison. Que faites-vous ?',
          why: 'La situation de référence du métier.',
          tip: 'Laisser finir, reconnaître le manquement, proposer une solution, s’engager sur un délai, rappeler. Aucune justification de l’entreprise.',
        },
        {
          question: 'Un client exige ce que vous n’avez pas le droit d’accorder. Comment réagissez-vous ?',
          why: 'On teste votre capacité à tenir une limite avec chaleur.',
          tip: 'Non à la demande, oui au besoin : expliquer ce qui est possible et proposer concrètement l’alternative.',
        },
        {
          question: 'Comment supportez-vous une forte cadence d’appels ?',
          why: 'Le turnover est élevé : les employeurs veulent une autoévaluation réaliste.',
          tip: 'Décrivez honnêtement comment vous vous remettez entre deux appels, et la cadence que vous avez réellement tenue.',
        },
        {
          question: 'Quelle a été votre escalade la plus difficile ?',
          why: 'On teste l’expérience réelle plutôt que la théorie.',
          tip: 'Situation, vos étapes, résultat, ce que vous avez changé depuis.',
        },
        {
          question: 'Comment expliquez-vous quelque chose de complexe à un client pressé ?',
          why: 'La clarté est la vraie compétence technique du métier.',
          tip: 'Court, sans jargon, avec une reformulation pour vérifier que c’est passé.',
        },
        {
          question: 'À quoi reconnaissez-vous une bonne journée ?',
          why: 'Cela montre si vous travaillez avec des indicateurs en tête.',
          tip: 'Citez un indicateur de qualité et un de volume, et pourquoi ils vont ensemble.',
        },
      ],
      redFlags: [
        'Proposer une solution dans la mise en situation avant d’avoir écouté.',
        'Parler des clients difficiles avec mépris.',
        'S’engager sur ce qu’on ne pourra pas tenir.',
      ],
      askThem: [
        'Combien de contacts un conseiller traite-t-il par jour ici ?',
        'Combien de temps dure l’intégration, et comment la connaissance produit est-elle construite ?',
        'Sur quoi la performance est-elle mesurée — volume, qualité, ou les deux ?',
      ],
      faq: [
        {
          question: 'Comment se déroule la mise en situation ?',
          answer:
            'Généralement cinq à dix minutes sur une réclamation simulée. On évalue l’écoute, la reformulation et la fermeté de l’engagement — pas votre connaissance de la bonne réponse.',
        },
        {
          question: 'Peut-on interroger sur les majorations d’horaires décalés ?',
          answer:
            'Oui, c’est parfaitement usuel dans le secteur et la réponse est factuelle. Posez la question avec celle des plannings, vous réglerez les deux d’un coup.',
        },
      ],
    },
  },

  electrician: {
    name: 'Électricien',
    application: {
      slug: 'electricien',
      metaTitle: 'Candidature d’électricien : lettre, CV et habilitations',
      metaDescription:
        'Candidature d’électricien : quelles habilitations mettre en avant, comment nommer sa spécialité, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature d’électricien',
      intro:
        'Dans l’électricité, les candidatures se lisent et se tranchent vite. Spécialité, habilitations et permis passent avant tout — une longue lettre ne compense pas un titre manquant.',
      atsKeywords: [
        'Électricien',
        'Installation tertiaire',
        'Maintenance industrielle',
        'Automatisme',
        'Câblage d’armoires',
        'Programmation d’automates (Siemens S7)',
        'Habilitation électrique',
        'Norme NF C 15-100',
        'Recherche de pannes',
        'Maintenance préventive',
        'Mesures électriques',
        'Photovoltaïque',
      ],
      hardSkills: [
        {
          label: 'Nommer sa spécialité',
          detail:
            'Résidentiel, tertiaire, maintenance industrielle ou automatisme : c’est le premier filtre appliqué à votre dossier.',
        },
        {
          label: 'Habilitations électriques',
          detail:
            'B1V, B2V, BR, BC, H0V, avec la date de recyclage. Elles conditionnent directement votre affectation et votre coefficient.',
        },
        {
          label: 'Automatismes',
          detail:
            'L’expérience en automates, notamment Siemens S7 / TIA Portal, est la plus grosse différence de taux horaire dans l’industrie.',
        },
        {
          label: 'Permis et mobilité',
          detail:
            'En intervention et en chantier, le permis B est une condition de fait. S’il manque au CV, on suppose que vous ne l’avez pas.',
        },
      ],
      softSkills: [
        'Rigueur de sécurité sans raccourcis',
        'Autonomie sur chantier',
        'Tenue face au client en site occupé',
        'Traçabilité propre des vérifications',
        'Fiabilité au sein de l’équipe',
      ],
      certifications: [
        'CAP ou Bac Pro MELEC',
        'BTS Électrotechnique',
        'Habilitations électriques (B1V, B2V, BR, BC)',
        'Formation automates Siemens TIA Portal',
      ],
      cvFocus: [
        {
          label: 'Nature des interventions',
          detail: 'Neuf, rénovation, maintenance industrielle ou dépannage chez le client : des quotidiens très différents.',
        },
        {
          label: 'Équipements et marques',
          detail: 'Citez les types d’installations et les automates ; les entreprises cherchent exactement cela.',
        },
        {
          label: 'Joindre les titres',
          detail: 'Diplôme et habilitations en pièce jointe : sans eux, aucune affectation n’est planifiable.',
        },
      ],
      coverLetterOpener:
        'Depuis six ans, je travaille en maintenance sur un site agroalimentaire en trois-huit : recherche de pannes sur des lignes de conditionnement pilotées par S7, vérifications périodiques et modifications d’armoires.',
      mistakes: [
        {
          label: 'N’écrire que « électricien »',
          detail: 'Sans la spécialité, une entreprise ne peut pas juger si vous correspondez au poste.',
        },
        {
          label: 'Omettre les habilitations',
          detail: 'C’est le contenu le plus important de la candidature et il fixe directement votre classification.',
        },
        {
          label: 'Une lettre trop longue',
          detail:
            'Dans le bâtiment, on lit vite. Une demi-page avec spécialité, expérience et disponibilité suffit largement.',
        },
      ],
      faq: [
        {
          question: 'Une lettre de motivation est-elle utile dans le bâtiment ?',
          answer:
            'Une version courte, oui : elle répond à « pourquoi cette entreprise » et « à partir de quand ». Beaucoup décident sur le CV et les titres, mais une candidature sans lettre paraît envoyée au hasard.',
        },
        {
          question: 'Peut-on candidater sans diplôme achevé ?',
          answer:
            'Oui, comme aide ou monteur, en indiquant votre expérience et votre intention de valider le diplôme. Beaucoup d’entreprises forment lorsque la fiabilité et le réflexe sécurité sont visibles — citez des tâches concrètes pour le montrer.',
        },
        {
          question: 'Le titre de chef d’équipe change-t-il quelque chose ?',
          answer:
            'Pour l’encadrement, la responsabilité des vérifications et la création d’entreprise, il est décisif. Pour un poste d’exécution ou de montage, les habilitations et l’expérience des installations comptent davantage.',
        },
      ],
    },
    interview: {
      slug: 'electricien',
      metaTitle: 'Entretien d’électricien : questions fréquentes et réponses',
      metaDescription:
        'Entretien dans l’électricité : sécurité, recherche de pannes et habilitations — ce qui est évalué et quoi demander à l’entreprise.',
      heading: 'Entretien d’embauche d’électricien',
      intro:
        'L’entretien est le plus souvent mené directement par le chef d’entreprise ou le chef d’équipe, court et concret. On interroge les installations que vous connaissez, votre méthode de dépannage et surtout votre rapport aux règles de sécurité sous contrainte de temps.',
      questions: [
        {
          question: 'Comment procédez-vous face à une panne inconnue ?',
          why: 'La question centrale : on cherche une réduction méthodique, pas des essais successifs.',
          tip: 'Relever le symptôme, consigner l’installation, remonter de l’alimentation vers le récepteur, mesurer plutôt que supposer, tracer.',
        },
        {
          question: 'Quelles habilitations détenez-vous ?',
          why: 'Cela détermine directement l’affectation et la classification.',
          tip: 'Citez tous les titres valides avec leur date et apportez les attestations.',
        },
        {
          question: 'Que faites-vous si l’on vous demande de sauter une étape de sécurité pour tenir un délai ?',
          why: 'La question d’attitude la plus importante du métier.',
          tip: 'Soyez net : la consignation ne se négocie pas. Proposez une alternative plutôt que de refuser seulement.',
        },
        {
          question: 'Avec quels automates avez-vous travaillé ?',
          why: 'Cela fixe le temps d’intégration en industrie.',
          tip: 'Marque, gamme et ce que vous y faisiez réellement — lire, modifier ou programmer.',
        },
        {
          question: 'Comment gérez-vous la relation avec le client sur site ?',
          why: 'En dépannage, l’électricien est le visage de l’entreprise.',
          tip: 'Un exemple : expliquer ce que vous faites, respecter le rendez-vous, laisser la zone propre.',
        },
        {
          question: 'Comment tracez-vous vos interventions ?',
          why: 'Les procès-verbaux et attestations ont une portée réglementaire.',
          tip: 'Décrivez précisément ce que vous consignez et dans quel outil.',
        },
      ],
      redFlags: [
        'Laisser entendre que la sécurité se négocie quand le chantier prend du retard.',
        'Annoncer des habilitations qu’on ne peut pas justifier.',
        'Ne poser aucune question sur l’organisation des chantiers ou les astreintes.',
      ],
      askThem: [
        'Comment le travail se répartit-il entre chantier, atelier et dépannage client ?',
        'Y a-t-il des astreintes, et comment sont-elles rémunérées ?',
        'Quelles formations l’entreprise accompagne-t-elle ?',
      ],
      faq: [
        {
          question: 'Faut-il apporter ses attestations ?',
          answer:
            'Oui — diplôme, habilitations et attestations de vérification, en original ou en copie. Beaucoup d’entreprises décident sur place, et une pièce manquante repousse simplement la proposition.',
        },
        {
          question: 'Y a-t-il un essai pratique ?',
          answer:
            'Dans certaines entreprises, généralement court et en atelier : une mesure, un schéma, une petite recherche de panne. On évalue la méthode et le réflexe sécurité, pas la vitesse.',
        },
      ],
    },
  },

  'warehouse-logistics': {
    name: 'Agent logistique',
    application: {
      slug: 'agent-logistique',
      metaTitle: 'Candidature logistique : lettre, CV et CACES',
      metaDescription:
        'Candidature en logistique : quels CACES et systèmes citer, ce qui doit figurer dans la lettre, exemple d’accroche et erreurs fréquentes.',
      heading: 'Rédiger une candidature d’agent logistique',
      intro:
        'En logistique, les décisions se prennent vite, souvent en quelques jours. CACES, disponibilité horaire et système de gestion d’entrepôt utilisé sont les trois éléments recherchés en premier.',
      atsKeywords: [
        'Logistique',
        'Préparation de commandes',
        'Réception marchandises',
        'Expédition',
        'Inventaire',
        'CACES R489',
        'Chariot élévateur',
        'Système de gestion d’entrepôt (WMS)',
        'SAP EWM',
        'Gestion des stocks',
        'Matières dangereuses (ADR)',
        'Filmage et palettisation',
      ],
      hardSkills: [
        {
          label: 'CACES et autorisations',
          detail:
            'CACES R489 catégories 1, 3 et 5, ADR, avec les dates de validité. Sans eux, aucune affectation n’est possible.',
        },
        {
          label: 'Système de gestion d’entrepôt',
          detail:
            'SAP EWM, Reflex, Generix, terminaux embarqués, préparation vocale : la maîtrise du système fixe votre temps d’intégration.',
        },
        {
          label: 'Le poste dans l’entrepôt',
          detail:
            'Réception, préparation, expédition ou gestion des stocks sont des profils distincts avec des exigences distinctes.',
        },
        {
          label: 'Des chiffres de performance',
          detail: 'Lignes par heure, taux d’erreur, colis par équipe : les indicateurs du métier.',
        },
      ],
      softSkills: [
        'Endurance physique en horaires postés',
        'Rigueur à cadence élevée',
        'Travail d’équipe sous contrainte de délai',
        'Ponctualité et fiabilité',
        'Vigilance sur la sécurité',
      ],
      certifications: [
        'Titre professionnel Préparateur de commandes ou Agent magasinier',
        'CACES R489 (catégories 1, 3, 5)',
        'Formation ADR matières dangereuses',
        'Formation arrimage et calage des charges',
      ],
      cvFocus: [
        {
          label: 'Type et taille de l’entrepôt',
          detail:
            'Entrepôt grande hauteur, froid négatif, e-commerce ou pièces détachées : le rythme et les exigences varient fortement.',
        },
        {
          label: 'Le rythme de travail',
          detail: 'Deux-huit, trois-huit, nuit, week-end : c’est souvent le critère décisif.',
        },
        {
          label: 'Mettre les CACES en évidence',
          detail: 'Un bloc dédié tout en haut, pas noyé entre les expériences.',
        },
      ],
      coverLetterOpener:
        'Depuis quatre ans, je travaille en trois-huit dans une plateforme de distribution d’environ 12 000 emplacements palettes — préparation sur terminal embarqué sous SAP EWM, CACES 1, 3 et 5 depuis 2019, et formation à l’arrimage des charges.',
      mistakes: [
        {
          label: 'Ne citer les CACES qu’en pièce jointe',
          detail: 'Ils sont le premier critère de sélection et doivent figurer dès la première page.',
        },
        {
          label: 'Laisser la disponibilité horaire dans le flou',
          detail: 'Quand l’information manque, on suppose une indisponibilité et le dossier s’élimine de lui-même.',
        },
        {
          label: 'Tout résumer par « travail en entrepôt »',
          detail: 'Réception et expédition sont des postes différents avec des indicateurs différents : distinguez-les.',
        },
      ],
      faq: [
        {
          question: 'Peut-on candidater sans CACES ?',
          answer:
            'Oui, et beaucoup d’entreprises le financent — indiquez explicitement que vous êtes prêt à le passer. Sur les postes où la conduite est le cœur du métier, il reste de fait une condition d’entrée.',
        },
        {
          question: 'Quel niveau de français est attendu ?',
          answer:
            'Assez pour suivre les consignes de sécurité et travailler sur le système, en général un niveau intermédiaire. Indiquez votre niveau ouvertement : beaucoup de sites sont multilingues et valorisent la fiabilité avant l’aisance.',
        },
        {
          question: 'L’intérim est-il un handicap ?',
          answer:
            'Non, c’est en logistique la voie d’entrée habituelle vers un CDI. Listez les sites où vous avez été délégué : ils attestent précisément des systèmes et des types d’entrepôts recherchés.',
        },
      ],
    },
    interview: {
      slug: 'agent-logistique',
      metaTitle: 'Entretien en logistique : questions fréquentes et réponses',
      metaDescription:
        'Entretien en entrepôt : horaires, précision, sécurité et systèmes — ce qui est évalué et quoi demander en retour.',
      heading: 'Entretien d’embauche en logistique',
      intro:
        'L’entretien est généralement court et concret, mené par le chef d’équipe ou le responsable d’exploitation. Il inclut souvent une visite de l’entrepôt — et cette visite fait partie de l’évaluation, car on observe ce que vous remarquez et ce que vous demandez.',
      questions: [
        {
          question: 'Quels horaires pouvez-vous assurer ?',
          why: 'En pratique la question la plus importante ; elle décide souvent à elle seule.',
          tip: 'Répondez clairement et honnêtement. Poser une contrainte maintenant vaut mieux qu’un désistement après deux semaines.',
        },
        {
          question: 'Comment garantissez-vous une préparation sans erreur ?',
          why: 'Le taux d’erreur est l’indicateur qualité central de tout site.',
          tip: 'Citez une routine concrète : scanner plutôt que vérifier à l’œil, contrôle au poste d’emballage, demander en cas de doute.',
        },
        {
          question: 'Que faites-vous si un stock ne correspond pas au système ?',
          why: 'On teste si vous signalez ou si vous corrigez en silence.',
          tip: 'Recompter, signaler, tracer la régularisation dans le système — jamais d’ajustement hors écriture.',
        },
        {
          question: 'Quels systèmes et équipements connaissez-vous ?',
          why: 'Cela détermine le temps d’intégration.',
          tip: 'Citez le système, l’équipement et la tâche — par exemple préparation sur terminal embarqué sous SAP EWM.',
        },
        {
          question: 'Comment gérez-vous la pression avant la clôture des expéditions ?',
          why: 'Le point de tension quotidien de l’entrepôt.',
          tip: 'Prioriser, alerter tôt si ce sera juste, et ne pas raccourcir sur la sécurité.',
        },
        {
          question: 'À quoi faites-vous attention en matière de sécurité ?',
          why: 'Les accidents sont le premier poste de coût du secteur.',
          tip: 'Citez du concret : allées piétonnes, arrimage, visibilité en manœuvre, équipements de protection.',
        },
      ],
      redFlags: [
        'Accepter des horaires qu’on ne pourra pas tenir.',
        'Présenter un écart de stock comme un détail.',
        'Paraître indifférent pendant la visite de l’entrepôt.',
      ],
      askThem: [
        'Quel est le rythme de travail, et comment les majorations sont-elles calculées ?',
        'Quels indicateurs sont suivis par personne ?',
        'Comment se déroule l’intégration, et qui l’encadre ?',
      ],
      faq: [
        {
          question: 'Le CACES est-il vérifié pendant l’entretien ?',
          answer:
            'L’attestation est contrôlée, et certains sites ajoutent un court essai de conduite. Apportez-la systématiquement : sans justificatif, vous ne pouvez pas conduire, quelle que soit votre expérience.',
        },
        {
          question: 'Comment expliquer des missions d’intérim rapprochées ?',
          answer:
            'Factuellement : les missions sont fixées par l’agence, pas par vous. Citez les sites et ce que vous y faisiez — cela se lit comme une largeur d’expérience, pas comme de l’instabilité.',
        },
      ],
    },
  },
};
