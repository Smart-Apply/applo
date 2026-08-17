import type { ProfessionCatalog } from '../types';

/**
 * Portuguese profession content (pt-PT, matching the rest of the catalogs) —
 * adapted to Portuguese hiring conventions: carta de apresentação, Ordem dos
 * Enfermeiros, SNC, certificação DGERT/CAP, concursos de professores.
 */
export const professionsPt: ProfessionCatalog = {
  'software-developer': {
    name: 'Programador de software',
    application: {
      slug: 'programador-de-software',
      metaTitle: 'Candidatura de programador: carta de apresentação e CV',
      metaDescription:
        'O que precisa uma candidatura de programador: palavras-chave ATS, competências, certificações, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de programador de software',
      intro:
        'Nas vagas de programação, a carta raramente decide sozinha: recrutadores e sistemas de triagem procuram primeiro a stack, a dimensão dos projetos e o impacto mensurável. Enumerar tecnologias coloca-o ao lado de centenas de perfis idênticos; dizer o que assumiu e o que mudou, não.',
      atsKeywords: [
        'Desenvolvimento de software',
        'TypeScript',
        'Java',
        'Python',
        'API REST',
        'Microsserviços',
        'CI/CD',
        'Docker',
        'Kubernetes',
        'Git',
        'Revisão de código',
        'Agile / Scrum',
        'Testes unitários',
        'Cloud (AWS/Azure)',
      ],
      hardSkills: [
        {
          label: 'Uma stack escrita como no anúncio',
          detail:
            'Linguagem, framework, base de dados e cloud, escritos exatamente como aparecem no anúncio: «TypeScript» e «JavaScript» são duas palavras diferentes para um parser.',
        },
        {
          label: 'Desenho de sistemas',
          detail:
            'A partir de três anos de experiência espera-se que desenhe interfaces e justifique decisões, não apenas que feche tarefas.',
        },
        {
          label: 'Prática de testes e entregas',
          detail:
            'Testes unitários e de integração, pipelines, revisão de código: a parte do seu trabalho que mostra se o código continuará manutenível daqui a seis meses.',
        },
        {
          label: 'Impacto mensurável',
          detail:
            'Tempo de carregamento reduzido para metade, menos erros, implantações semanais convertidas em diárias. Um número do seu dia a dia vale mais do que qualquer adjetivo.',
        },
      ],
      softSkills: [
        'Explicar decisões técnicas a interlocutores não técnicos',
        'Dar retorno útil em revisões de código',
        'Autonomia em equipas distribuídas',
        'Priorizar sob pressão de prazos',
        'Disponibilidade para ler código alheio',
      ],
      certifications: [
        'AWS Certified Developer – Associate',
        'Microsoft Certified: Azure Developer Associate',
        'Certified Kubernetes Application Developer (CKAD)',
        'Professional Scrum Developer (PSD I)',
      ],
      cvFocus: [
        {
          label: 'Projetos, não listas de tarefas',
          detail:
            'Dois ou três projetos por função, com contexto: dimensão da equipa, o seu papel, tecnologias, resultado.',
        },
        {
          label: 'Um perfil de GitHub apresentável',
          detail:
            'Um repositório cuidado com um README a sério substitui um parágrafo de autodescrição. Um perfil abandonado custa mais do que não pôr ligação.',
        },
        {
          label: 'Competências agrupadas por nível',
          detail:
            'Separe o que usa diariamente do que experimentou uma vez: a entrevista técnica vai exatamente a essa fronteira.',
        },
      ],
      coverLetterOpener:
        'O vosso anúncio refere a separação de um monólito em serviços: foi precisamente o que conduzi na [Empresa] para uma equipa de oito pessoas, levando a frequência de implantação de semanal a diária.',
      mistakes: [
        {
          label: 'Uma carta que repete a stack',
          detail:
            'O CV já a enumera. A carta tem de explicar porquê este produto, de uma forma que nenhum outro candidato consiga copiar.',
        },
        {
          label: 'Afirmar senioridade em vez de a demonstrar',
          detail:
            '«Sénior» não convence ninguém. Conduzir uma migração, sustentar o processo de revisão ou integrar novos colegas, sim.',
        },
        {
          label: 'Enviar a mesma candidatura para toda a parte',
          detail:
            'Sem referência ao produto, o perfil é substituível. Uma única frase concreta sobre o domínio deles tira-o da pilha.',
        },
      ],
      faq: [
        {
          question: 'A carta de apresentação ainda é necessária?',
          answer:
            'Em Portugal, em consultoras e empresas grandes, sim. Em produto e startups costuma bastar o CV com o perfil de GitHub. Meia página é o equilíbrio: se faltar, a candidatura parece incompleta; se for mais longa, não é lida.',
        },
        {
          question: 'As certificações contam tanto como os projetos?',
          answer:
            'Os projetos ganham quase sempre. As certificações cloud servem sobretudo para entrar num ambiente onde ainda não tem produção para mostrar: abrem a primeira porta, não substituem referências.',
        },
        {
          question: 'Devo incluir fotografia no CV?',
          answer:
            'Continua a ser comum em Portugal, mas nunca é obrigatória e no setor tecnológico a sua ausência não penaliza. Se enviar o CV para fora, é preferível omiti-la.',
        },
      ],
    },
    interview: {
      slug: 'programador-de-software',
      metaTitle: 'Entrevista de programador: perguntas frequentes e respostas',
      metaDescription:
        'As perguntas habituais numa entrevista de programação, o que avaliam de facto, como estruturar a resposta e os erros que custam a vaga.',
      heading: 'Entrevista de emprego para programador de software',
      intro:
        'Um processo de programação tem normalmente três partes: motivação, profundidade técnica e um exercício de código ao vivo ou para casa. Raramente se falha no exercício: falha-se resolvendo-o em silêncio, quando o que está a ser avaliado é o raciocínio.',
      questions: [
        {
          question: 'Fale-me de um problema técnico difícil que tenha resolvido.',
          why: 'Avalia-se se sabe delimitar um problema e se percebeu a causa real ou apenas mudou coisas até funcionar.',
          tip: 'Quatro passos: o sintoma, como o delimitou, a causa real, o que mudou para não voltar a acontecer.',
        },
        {
          question: 'Porque escolheu essa arquitetura?',
          why: 'Não há resposta certa: querem saber se conhece as alternativas e se consegue nomear as desvantagens.',
          tip: 'Refira a opção descartada e o motivo. Quem não encontra nenhum defeito na própria solução não a pôs à prova.',
        },
        {
          question: 'Como garante que o seu código se mantém manutenível?',
          why: 'Verifica se pensa para além do merge: testes, revisões, documentação, nomes.',
          tip: 'Descreva o que a sua última equipa fazia realmente, não princípios de manual.',
        },
        {
          question: 'Como aborda código que não escreveu?',
          why: 'O dia a dia é código herdado. Querem saber se lhe toca com cuidado ou se propõe reescrever.',
          tip: 'Descreva a rede de segurança que constrói primeiro: acrescentar testes, passos pequenos, implantar cedo.',
        },
        {
          question: 'Conte-me um desacordo numa revisão de código.',
          why: 'Pergunta comportamental: consegue sustentar uma posição técnica sem danificar a relação de trabalho?',
          tip: 'Termine com o resultado e o que retirou dali, também quando foi você a ceder.',
        },
        {
          question: 'O que faz quando uma estimativa deixa de ser realista?',
          why: 'É sobre comunicação com produto e com os interessados, não sobre técnica.',
          tip: 'Avisar cedo e oferecer opções — âmbito, data, qualidade — em vez de transmitir apenas o problema.',
        },
      ],
      redFlags: [
        'Programar em silêncio durante o exercício: o que é pontuado é o raciocínio.',
        'Falar mal de equipas ou bases de código anteriores.',
        'Responder «sim» de forma vaga a «conhece X?» em vez de situar o seu nível com honestidade.',
      ],
      askThem: [
        'Como é o caminho do merge até produção e quanto tempo demora?',
        'Que parte de um sprint é dedicada a dívida técnica?',
        'Quem decide o que é construído e qual é aí o papel de quem desenvolve?',
      ],
      faq: [
        {
          question: 'Como me preparo para o exercício de código?',
          answer:
            'Treine pensar em voz alta, não apenas resolver. Pegue num exercício de dificuldade média e explique cada passo como se alguém estivesse sentado ao seu lado: essa verbalização é o que é pontuado em quase todos os processos.',
        },
        {
          question: 'Posso usar ferramentas de IA num teste para casa?',
          answer:
            'Pergunte. Muitas empresas já o permitem explicitamente e depois questionam as suas decisões na revisão. Usá-la em silêncio e não saber explicar o resultado é o pior cenário possível.',
        },
      ],
    },
  },

  nurse: {
    name: 'Enfermeiro',
    application: {
      slug: 'enfermeiro',
      metaTitle: 'Candidatura de enfermagem: carta, CV e documentação',
      metaDescription:
        'Candidatura em enfermagem: que documentação é indispensável, que especialidade destacar, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de enfermagem',
      intro:
        'Em enfermagem o mercado joga a seu favor, mas a candidatura continua a decidir em que serviço entra e em que condições. Documentação completa e uma especialidade claramente indicada pesam aqui mais do que qualquer construção de estilo.',
      atsKeywords: [
        'Enfermagem',
        'Cuidados gerais',
        'Plano de cuidados',
        'Administração de terapêutica',
        'Tratamento de feridas',
        'Cuidados intensivos (UCI)',
        'Urgência',
        'Cuidados paliativos',
        'Registo clínico eletrónico',
        'Controlo de infeção',
        'Registos de enfermagem',
        'Orientação de estudantes',
      ],
      hardSkills: [
        {
          label: 'Cédula profissional e inscrição na Ordem',
          detail:
            'A licenciatura em Enfermagem e o número de cédula da Ordem dos Enfermeiros são verificados antes de tudo o resto.',
        },
        {
          label: 'A especialidade, não «enfermagem»',
          detail:
            'Cuidados intensivos, urgência, bloco operatório, oncologia, geriatria ou cuidados de saúde primários: é o primeiro filtro aplicado ao seu processo.',
        },
        {
          label: 'Registo clínico eletrónico',
          detail:
            'Indique o sistema que utilizou (SClínico, Glintt, Soarian): reduz diretamente o tempo de integração.',
        },
        {
          label: 'Formação especializada',
          detail:
            'Especialidade reconhecida pela Ordem, pós-graduações em feridas crónicas ou cuidados paliativos: determinam função e remuneração.',
        },
      ],
      softSkills: [
        'Resistência ao trabalho por turnos',
        'Comunicação com famílias em situação crítica',
        'Trabalho com a equipa médica e de reabilitação',
        'Serenidade perante uma degradação clínica',
        'Empatia sem desgaste pessoal',
      ],
      certifications: [
        'Licenciatura em Enfermagem e cédula da Ordem dos Enfermeiros',
        'Título de enfermeiro especialista (Ordem dos Enfermeiros)',
        'Pós-graduação em feridas e viabilidade tecidular',
        'Suporte avançado de vida (SAV)',
      ],
      cvFocus: [
        {
          label: 'Tipo de instituição e dimensão do serviço',
          detail:
            'Hospital central, hospital distrital, lar, cuidados de saúde primários — e o número de camas. Diz mais do que qualquer lista de tarefas.',
        },
        {
          label: 'Documentação completa',
          detail:
            'Certificado de habilitações, cédula, vacinação e certificados de formação. É a principal causa de um processo ficar parado.',
        },
        {
          label: 'Disponibilidade e horário',
          detail: 'Horário pretendido, disponibilidade para noites e fins de semana e data de início, na primeira página.',
        },
      ],
      coverLetterOpener:
        'Depois de quatro anos numa unidade de cuidados intensivos polivalente com doze camas, procuro integrar uma equipa de cuidados paliativos — a área que conheci durante a pós-graduação e que quero exercer a tempo inteiro.',
      mistakes: [
        {
          label: 'Prometer enviar a documentação mais tarde',
          detail:
            'Sem habilitação verificável não é possível formalizar a contratação. Os processos incompletos ficam de lado em vez de serem recusados.',
        },
        {
          label: 'Deixar a especialidade em aberto',
          detail: '«Sou polivalente» lê-se como «não sei o que quero» e acaba na lista de espera.',
        },
        {
          label: 'Escrever apenas sobre a carga de trabalho',
          detail:
            'Todas as instituições a conhecem. Explicar em que condições ficaria transmite critério, não esgotamento.',
        },
      ],
      faq: [
        {
          question: 'Como me candidato com um curso obtido noutro país?',
          answer:
            'Junte o reconhecimento da Ordem dos Enfermeiros ou, se o processo estiver a decorrer, o comprovativo com o estado do pedido. Muitas instituições contratam antes da decisão final, mas precisam do estado por escrito.',
        },
        {
          question: 'Devo indicar o número de cédula profissional?',
          answer:
            'Sim: a inscrição na Ordem é obrigatória para exercer e é um dado verificável que se espera encontrar. Omiti-lo acrescenta apenas uma troca de emails antes de alguém poder tratar do processo.',
        },
        {
          question: 'Devo indicar pretensões salariais?',
          answer:
            'No setor público não é necessário, porque se aplica a tabela remuneratória: detalhe com precisão o tempo de serviço e a formação especializada. No privado espera-se um intervalo.',
        },
      ],
    },
    interview: {
      slug: 'enfermeiro',
      metaTitle: 'Entrevista de enfermagem: perguntas frequentes e respostas',
      metaDescription:
        'Perguntas habituais numa entrevista de enfermagem, o que avaliam, como responder e o que perguntar à chefia do serviço.',
      heading: 'Entrevista de emprego em enfermagem',
      intro:
        'A entrevista é normalmente conduzida pela enfermeira-chefe do serviço, por vezes com um enfermeiro de referência. Avaliam-se menos conhecimentos do que atitudes: como prioriza sob carga, como fala com as famílias e se vai integrar-se na equipa do turno.',
      questions: [
        {
          question: 'Como prioriza quando não consegue chegar a todos os doentes?',
          why: 'A pergunta central da profissão. Procura-se triagem clínica, não resistência.',
          tip: 'Descreva a sua ordem de avaliação, quando alerta e como regista, não que «consegue sempre fazer tudo».',
        },
        {
          question: 'Conte-me uma conversa difícil com uma família.',
          why: 'Os conflitos com familiares desgastam os serviços. Procura-se capacidade de desescalar.',
          tip: 'Ouvir, explicar a situação clínica, colocar um limite, encaminhar — por esta ordem.',
        },
        {
          question: 'O que faz se cometer um erro?',
          why: 'Cultura de segurança: uma instituição que pergunta abertamente quer ouvir que se notifica.',
          tip: 'Garantir a segurança do doente, notificar de imediato, registar, participar o evento adverso. Um caso real pesa mais do que uma intenção.',
        },
        {
          question: 'Porque quer sair do serviço atual?',
          why: 'Verifica-se se está a fugir de algo ou a caminhar para algo.',
          tip: 'Diga o que procura — especialidade, formação, previsibilidade da escala — não o que o empregador anterior fez mal.',
        },
        {
          question: 'Como encara as noites e os fins de semana?',
          why: 'Pura organização: uma resposta honesta poupa um período experimental falhado.',
          tip: 'Diga com clareza o que consegue sustentar. Colocar um limite agora é melhor do que desistir depois.',
        },
        {
          question: 'Como mantém a sua prática atualizada?',
          why: 'As normas mudam e as instituições exigentes perguntam expressamente.',
          tip: 'Refira formação concreta dos últimos dois anos e como a transmite ao serviço.',
        },
      ],
      redFlags: [
        'Falar de colegas ou doentes de um modo que quebre o sigilo profissional.',
        'Afirmar que nunca se sente sobrecarregado.',
        'Não fazer nenhuma pergunta sobre o serviço, a escala ou a integração.',
      ],
      askThem: [
        'Qual é o rácio real de pessoal na manhã, na tarde e na noite?',
        'Quanto dura a integração e quem a acompanha?',
        'Que estabilidade tem a escala e com que frequência se chama pessoal fora do turno?',
      ],
      faq: [
        {
          question: 'São avaliados conhecimentos clínicos?',
          answer:
            'Frequentemente, mas sob a forma de caso prático e não de exame: uma situação aguda cuja abordagem deve descrever. Reconhecer os limites e dizer quando chama o médico conta mais do que uma resposta de manual.',
        },
        {
          question: 'Posso perguntar pelos rácios e pela substituição de ausências?',
          answer:
            'Sem dúvida: é a pergunta mais informativa de que dispõe. Serviços com um plano de substituição a funcionar respondem em concreto; uma resposta evasiva é, por si só, informação.',
        },
      ],
    },
  },

  'project-manager': {
    name: 'Gestor de projeto',
    application: {
      slug: 'gestor-de-projeto',
      metaTitle: 'Candidatura de gestor de projeto: carta, CV e indicadores',
      metaDescription:
        'Candidatura em gestão de projetos: que números convencem, que certificações contam, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de gestor de projeto',
      intro:
        'A gestão de projetos é a profissão em que mais se afirma e menos se demonstra. Indicar orçamento, dimensão da equipa, duração e resultado de cada projeto coloca-o à frente da maioria antes mesmo de escrever uma linha sobre metodologia.',
      atsKeywords: [
        'Gestão de projetos',
        'Coordenação de projetos',
        'Gestão de partes interessadas',
        'Responsabilidade orçamental',
        'Gestão de risco',
        'Scrum',
        'Kanban',
        'PRINCE2',
        'Planeamento e marcos',
        'Gestão de recursos',
        'Jira',
        'MS Project',
        'Gestão da mudança',
        'Comité de acompanhamento',
      ],
      hardSkills: [
        {
          label: 'Os números do projeto',
          detail:
            'Orçamento, dimensão da equipa, duração e número de áreas envolvidas: quatro números que tornam uma descrição imediatamente credível.',
        },
        {
          label: 'Metodologia com evidência',
          detail:
            'Preditivo, ágil ou híbrido: diga o que conduziu de facto e onde estava o limite. «Ambos» sem exemplo não vale nada.',
        },
        {
          label: 'Ferramentas',
          detail: 'Jira, Confluence, MS Project, Smartsheet, Asana: os filtros ATS procuram literalmente estes nomes.',
        },
        {
          label: 'A quem reportava',
          detail:
            'Um comité de acompanhamento ou a administração como interlocutor diz mais sobre o seu nível do que qualquer designação.',
        },
      ],
      softSkills: [
        'Liderar sem autoridade hierárquica',
        'Mediar entre áreas de negócio',
        'Decidir em situação de incerteza',
        'Apresentar perante a administração',
        'Dizer não a alargamentos de âmbito',
      ],
      certifications: [
        'PMP (Project Management Professional)',
        'PRINCE2 Practitioner',
        'Professional Scrum Master (PSM I/II)',
        'IPMA nível C/D',
      ],
      cvFocus: [
        {
          label: 'Uma lista de projetos à parte',
          detail:
            'Três a cinco projetos de referência com setor, volume, papel e resultado, separados do percurso cronológico.',
        },
        {
          label: 'Justificar uma mudança de setor',
          detail:
            'A gestão de projetos é dita transferível e raramente lida assim. Diga o que se transpõe do seu setor.',
        },
        {
          label: 'Resultado, não atividade',
          detail: '«Entregue no prazo e 8 % abaixo do orçamento» em vez de «responsável pela coordenação».',
        },
      ],
      coverLetterOpener:
        'Durante dois anos conduzi a implementação do ERP na [Empresa]: 1,4 M€ de orçamento, seis instalações, 40 pessoas envolvidas — e uma entrada em produção sem paragem da linha.',
      mistakes: [
        {
          label: 'Um catálogo de métodos em vez de resultados',
          detail:
            'Uma lista de referenciais prova leituras, não capacidade de entrega. Um projeto com números pesa mais.',
        },
        {
          label: 'Diluir o próprio papel',
          detail: '«Implementámos» deixa em aberto se conduzia ou participava. Diga o que assumiu.',
        },
        {
          label: 'Esconder os projetos falhados',
          detail:
            'Entrevistadores experientes perguntam por um deliberadamente. Um projeto parado com uma lição soa mais maduro do que um histórico impecável.',
        },
      ],
      faq: [
        {
          question: 'Vale a pena a certificação PMP ou PRINCE2?',
          answer:
            'Ajuda sobretudo em grandes empresas, setor público e concursos, onde por vezes é requisito formal. Em organizações de produto pesam muito mais os projetos de referência. Quem mais ganha são os perfis com pouco historial documentado.',
        },
        {
          question: 'Como descrevo projetos sujeitos a confidencialidade?',
          answer:
            'Anonimize o cliente e indique setor, ordem de grandeza e resultado: «fornecedor automóvel, 250 M€ de faturação, migração de 14 sistemas». É admissível e mais informativo do que um nome conhecido sem contexto.',
        },
        {
          question: 'Como passo de perfil técnico a gestor de projeto?',
          answer:
            'Torne visíveis as coordenações de pacote de trabalho, os papéis de ligação e as substituições como linhas próprias. A maioria das transições acontece internamente ou dentro do mesmo setor, onde o conhecimento do negócio compensa o historial em falta.',
        },
      ],
    },
    interview: {
      slug: 'gestor-de-projeto',
      metaTitle: 'Entrevista de gestor de projeto: perguntas e respostas',
      metaDescription:
        'Perguntas de entrevista em gestão de projetos: escalamento, alargamento de âmbito e projetos falhados — o que avaliam e como responder.',
      heading: 'Entrevista de emprego para gestor de projeto',
      intro:
        'Quase todas as perguntas a um gestor de projeto são comportamentais. Não se esperam conhecimentos metodológicos, mas um caso real, contado numa estrutura que alguém de fora consiga acompanhar.',
      questions: [
        {
          question: 'Conte-me um projeto que lhe fugiu ao controlo.',
          why: 'A pergunta mais importante. Querem saber se corrige cedo ou se descobre no marco.',
          tip: 'Quando percebeu, por que sinal, o que mudou e qual foi o resultado. Escolha um real, não o mais benigno.',
        },
        {
          question: 'Como gere o alargamento de âmbito?',
          why: 'Verifica se conduz os pedidos ou apenas os transmite.',
          tip: 'Descreva o seu processo de alteração: avaliar, quantificar o impacto em prazo e orçamento, levar a decisão a quem decide — não recusar sozinho.',
        },
        {
          question: 'Como lidera uma equipa sem autoridade hierárquica?',
          why: 'O núcleo da função: ouve-se influência por transparência e fiabilidade.',
          tip: 'Dê um exemplo em que ganhou alguém que objetivamente não tinha tempo para o seu projeto.',
        },
        {
          question: 'Quando escala um problema, e como?',
          why: 'Cedo demais parece fragilidade, tarde demais imprudência. Querem o seu limiar.',
          tip: 'Defina o gatilho — prazo, orçamento ou qualidade insustentáveis — e escale com uma opção, não com um problema.',
        },
        {
          question: 'Como decide entre dois interlocutores do mesmo nível?',
          why: 'Verifica se leva a decisão ao sítio certo.',
          tip: 'Tornar os critérios visíveis, fazer decidir em conjunto, deixar registo.',
        },
        {
          question: 'Como mede o sucesso de um projeto?',
          why: 'Distingue a lógica de entrega da lógica de valor.',
          tip: 'Para além de prazo, orçamento e âmbito, nomeie o benefício após a entrada em produção: adoção, horas poupadas, incidentes evitados.',
        },
      ],
      redFlags: [
        'Apresentar apenas projetos bem-sucedidos.',
        'Atribuir cada atraso ao negócio, aos sistemas ou ao fornecedor.',
        'Não conseguir dar um único número sobre o próprio projeto quando é perguntado.',
      ],
      askThem: [
        'Quem decide aqui a prioridade dos projetos e com que frequência muda a ordem?',
        'Como se articulam a organização por projetos e a hierárquica?',
        'Que projeto falhou mais recentemente e o que mudou a empresa depois?',
      ],
      faq: [
        {
          question: 'Devo recomendar uma metodologia na entrevista?',
          answer:
            'Apenas com um raciocínio retirado do contexto deles. «Aqui iria para híbrido, porque a entrega de hardware tem datas fixas enquanto o software admite iteração» demonstra critério. Um compromisso genérico com «o ágil» soa pouco examinado.',
        },
        {
          question: 'Como abordo um caso prático?',
          answer:
            'Pergunte antes de planear. Os avaliadores pontuam quase sempre as perguntas de enquadramento acima do plano acabado: desenhar um cronograma logo à partida é a forma mais comum de perder o exercício.',
        },
      ],
    },
  },

  'sales-representative': {
    name: 'Comercial',
    application: {
      slug: 'comercial',
      metaTitle: 'Candidatura comercial: carta, CV e números de vendas',
      metaDescription:
        'Candidatura de comercial: que números destacar, que palavras-chave passam os filtros, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de comercial',
      intro:
        'Em vendas a candidatura é a primeira amostra de trabalho: quem não se sabe vender a si próprio não venderá mais nada. Por isso é lida com dureza, e é lida primeiro à procura de números.',
      atsKeywords: [
        'Vendas',
        'Angariação de clientes',
        'Gestão de carteira',
        'Venda B2B',
        'Responsabilidade sobre faturação',
        'Cumprimento de objetivos',
        'CRM (Salesforce, HubSpot)',
        'Gestão do funil',
        'Negociação de contratos',
        'Venda cruzada',
        'Grandes contas',
        'Qualificação de oportunidades',
      ],
      hardSkills: [
        {
          label: 'Objetivo e cumprimento',
          detail:
            'Objetivo anual, cumprimento real e posição na equipa. «112 % sobre um objetivo de 1,8 M€» é a linha mais forte da sua candidatura.',
        },
        {
          label: 'Tipo de venda e ciclo',
          detail:
            'Inbound ou outbound, angariação ou carteira, B2B ou B2C, valor médio e duração do ciclo: cada um destes pontos filtra.',
        },
        {
          label: 'Disciplina no CRM',
          detail:
            'Indique a ferramenta e o que geria nela. As direções comerciais perguntam quase sempre pela manutenção do funil.',
        },
        {
          label: 'Setor e produto',
          detail:
            'Vender bens de equipamento complexos é outra profissão que não a venda transacional rápida. Situe-se com clareza.',
        },
      ],
      softSkills: [
        'Encaixar a recusa em ciclos longos',
        'Ouvir em vez de apresentar',
        'Negociar até ao fecho',
        'Organizar-se sozinho em deslocação',
        'Construir relações ao longo de anos',
      ],
      certifications: [
        'Curso técnico superior profissional em gestão comercial',
        'Salesforce Certified Administrator',
        'Formação em MEDDIC ou SPIN Selling',
        'Formação em negociação (método Harvard)',
      ],
      cvFocus: [
        {
          label: 'Números em cada função',
          detail: 'Objetivo, cumprimento, faturação gerida e número de contas — em cada posição, não apenas na última.',
        },
        {
          label: 'Zona e disponibilidade para deslocações',
          detail: 'Região, percentagem de deslocação e carta de condução devem estar visíveis na primeira página.',
        },
        {
          label: 'Explicar as passagens curtas',
          detail:
            'As mudanças são frequentes em vendas e mesmo assim são contadas. Meia frase sobre o motivo evita a suposição óbvia.',
        },
      ],
      coverLetterOpener:
        'Em três anos levei a zona sul de 1,2 para 2,1 M€ de faturação anual, sobretudo com clientes novos do setor industrial e um ciclo médio de fecho de sete meses.',
      mistakes: [
        {
          label: 'Nenhum número',
          detail: 'Um CV comercial sem objetivos lê-se como sinal de alarme: quem tem bons números publica-os.',
        },
        {
          label: 'Adjetivos em vez de cultura de venda',
          detail: '«Orientado para o cliente e com forte capacidade de fecho» aparece em uma de cada duas candidaturas e não diz nada.',
        },
        {
          label: 'Nenhuma referência ao que vendem',
          detail:
            'As direções comerciais verificam expressamente se percebeu o produto e a quem se dirige.',
        },
      ],
      faq: [
        {
          question: 'E se não atingi os meus objetivos?',
          answer:
            'Indique-os na mesma, com contexto: mercado em queda, mudança de gama, zona criada de raiz. Os números omitidos aparecem na entrevista; os números explicados mostram que domina o seu funil.',
        },
        {
          question: 'Posso indicar clientes na candidatura?',
          answer:
            'As referências públicas, sim. Para o resto basta uma descrição: «três empresas do PSI 20 na área da logística» é seguro e produz o mesmo efeito.',
        },
        {
          question: 'Como trato a questão da comissão?',
          answer:
            'Na candidatura apenas se pedirem pretensões, e então como pacote: fixo, variável e sobre o que era calculado o variável. A proporção fixo/variável discute-se na entrevista, não na carta.',
        },
      ],
    },
    interview: {
      slug: 'comercial',
      metaTitle: 'Entrevista comercial: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista de vendas: objeções, funil, negócios perdidos e simulação — o que é avaliado e como responder com números.',
      heading: 'Entrevista de emprego para comercial',
      intro:
        'Uma entrevista comercial é ela própria uma entrevista de venda e é pontuada como tal. Quase todas incluem uma ronda de números e muitas uma breve simulação em que tem de apresentar ou rebater uma objeção.',
      questions: [
        {
          question: 'Quais foram os seus números nos últimos três anos?',
          why: 'A pergunta de abertura: avaliam-se os números, mas também se traz os seus próprios indicadores de cor.',
          tip: 'Objetivo, cumprimento e posição na equipa — ano a ano. Hesitar aqui é a pior resposta.',
        },
        {
          question: 'Venda-me este produto.',
          why: 'Verifica-se se pergunta antes de falar.',
          tip: 'Comece com três perguntas de diagnóstico. Enumerar características logo à partida faz perder o exercício.',
        },
        {
          question: 'Como rebate a objeção «é demasiado caro»?',
          why: 'Verifica se raciocina em valor ou em desconto.',
          tip: 'Pergunte com o que está a comparar e construa o valor. Descontar como primeira reação é interpretado como fragilidade.',
        },
        {
          question: 'Como está o seu funil neste momento?',
          why: 'Avalia-se o método: quantos negócios, em que fase e com que probabilidade.',
          tip: 'Descreva as suas fases e o rácio de funil sobre objetivo — o habitual é um fator de 3 a 4.',
        },
        {
          question: 'Conte-me um negócio perdido.',
          why: 'Autoconhecimento: quem nunca perde vende pouco ou não está a ser franco.',
          tip: 'O motivo, o que viu tarde demais e o que faz de diferente desde então.',
        },
        {
          question: 'Como angaria clientes sem oportunidades inbound?',
          why: 'Determina se sabe prospetar a sério.',
          tip: 'Descreva a sua cadência em concreto: pesquisa, primeiro contacto, seguimento — com números da sua semana.',
        },
      ],
      redFlags: [
        'Não conhecer os próprios números ou responder de forma evasiva.',
        'Falar em vez de perguntar durante a simulação.',
        'Atribuir cada êxito ao produto ou ao mercado.',
      ],
      askThem: [
        'Como é definido o objetivo e quantas pessoas da equipa o atingiram no ano passado?',
        'Qual é a proporção entre fixo e variável e quando é liquidado?',
        'De onde vêm as oportunidades e quanta prospeção é esperada?',
      ],
      faq: [
        {
          question: 'Como me preparo para a simulação?',
          answer:
            'Estude o produto e o cliente-alvo deles e leve cinco boas perguntas de diagnóstico. O exercício quase nunca avalia conhecimento de produto, mas a condução da conversa: perguntas primeiro, valor depois.',
        },
        {
          question: 'Devo «fechar» na entrevista?',
          answer:
            'Sim, no sentido que se espera em vendas: pergunte com clareza pelos próximos passos e pelos prazos no final. Uma tentativa agressiva de fecho sobre a própria vaga, pelo contrário, soa encenada.',
        },
      ],
    },
  },

  accountant: {
    name: 'Contabilista',
    application: {
      slug: 'contabilista',
      metaTitle: 'Candidatura de contabilista: carta, CV e software',
      metaDescription:
        'Candidatura em contabilidade: que software e habilitações destacar, que palavras-chave filtram, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de contabilista',
      intro:
        'Em contabilidade raramente se filtra por personalidade e quase sempre por três pontos: que software domina, até onde vai sozinho no fecho e sob que normativo. Sem resposta nas primeiras linhas, a candidatura é descartada.',
      atsKeywords: [
        'Contabilidade geral',
        'Contas a receber',
        'Contas a pagar',
        'Fecho mensal',
        'Encerramento de contas',
        'SNC',
        'IFRS',
        'Declaração periódica de IVA',
        'IES / Modelo 22',
        'SAP FI',
        'Primavera / Sage / PHC',
        'Ativos fixos',
        'Reconciliações bancárias',
        'Apoio à auditoria',
      ],
      hardSkills: [
        {
          label: 'Até onde fecha em autonomia',
          detail:
            'Fecho mensal, trimestral ou encerramento anual completo — em autonomia ou como apoio. É o critério de seleção decisivo.',
        },
        {
          label: 'Software e módulo',
          detail:
            'SAP FI, Primavera, PHC, Sage, Moloni — e o módulo. Um nome de produto sem módulo diz muito pouco.',
        },
        {
          label: 'Normativo contabilístico',
          detail:
            'SNC, IFRS ou ambos. As candidaturas a grupos falham muitas vezes por faltar a referência às IFRS.',
        },
        {
          label: 'Fiscalidade e obrigações declarativas',
          detail:
            'IVA, IES, Modelo 22, autoliquidação e operações intracomunitárias: indispensável assim que há atividade internacional.',
        },
      ],
      softSkills: [
        'Rigor com volumes elevados de documentos',
        'Cumprimento dos prazos de fecho',
        'Relação com o revisor oficial de contas e com a AT',
        'Discrição com dados salariais e financeiros',
        'Paciência perante os pedidos de outras áreas',
      ],
      certifications: [
        'Inscrição na Ordem dos Contabilistas Certificados (OCC)',
        'Licenciatura em Contabilidade, Gestão ou Economia',
        'Pós-graduação em Fiscalidade',
        'Certificação em SAP FI ou Primavera',
      ],
      cvFocus: [
        {
          label: 'Dimensão da empresa e volume',
          detail:
            'Uma PME de 40 pessoas ou um grupo com 12 sociedades: esse contexto determina como toda a sua experiência é lida.',
        },
        {
          label: 'Nomear com precisão os trabalhos de fecho',
          detail: '«Apoio ao encerramento» e «elaboração do encerramento» são duas funções diferentes.',
        },
        {
          label: 'O software num bloco próprio',
          detail: 'Ferramentas, módulos e anos de utilização em forma de tabela: é assim que é realmente lido.',
        },
      ],
      coverLetterOpener:
        'Há cinco anos que elaboro o fecho mensal em SNC para três sociedades com cerca de 1 800 documentos por mês e preparo o encerramento de contas de forma autónoma em SAP FI.',
      mistakes: [
        {
          label: 'Indicar apenas «contabilidade»',
          detail:
            'Clientes, fornecedores, ativos fixos e fecho são perfis distintos. Sem diferenciar, não corresponde exatamente a nenhum anúncio.',
        },
        {
          label: 'Declarar software sem profundidade',
          detail: '«Conhecimentos de SAP» é verificado na entrevista. Indique módulos e tarefas ou parecerá inflacionado.',
        },
        {
          label: 'Omitir a formação recente',
          detail:
            'A legislação fiscal muda todos os anos. Sem formação recente, presume-se que trabalha com critérios antigos.',
        },
      ],
      faq: [
        {
          question: 'Preciso de estar inscrito na Ordem dos Contabilistas Certificados?',
          answer:
            'Para assinar as contas é obrigatório e é a maior alavanca salarial da profissão. Para funções de contas a pagar e a receber não é necessário — pesam mais o volume e a fluência com o software.',
        },
        {
          question: 'A experiência em gabinete conta dentro de uma empresa?',
          answer:
            'Sim, é lida como base ampla, cobrindo muitos clientes e formas jurídicas. Acrescente que setores e que trabalhos de fecho cobriu, ou ficará demasiado genérica para ser valorizada.',
        },
        {
          question: 'Devo indicar pretensões salariais?',
          answer:
            'Se o anúncio o pedir, sim — omitir dá a sensação de candidatura incompleta. Ajuste o valor à dimensão da empresa e ao nível de responsabilidade de fecho, não apenas aos anos de experiência.',
        },
      ],
    },
    interview: {
      slug: 'contabilista',
      metaTitle: 'Entrevista de contabilista: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista em contabilidade: autonomia de fecho, divergências, erros e software — o que é avaliado e o que perguntar.',
      heading: 'Entrevista de emprego para contabilista',
      intro:
        'As entrevistas de contabilidade são mais técnicas do que a média: costuma estar presente a direção financeira, que verifica com casos concretos a sua autonomia real. Uma parte técnica curta é a regra, não a exceção.',
      questions: [
        {
          question: 'Que fechos realiza de forma autónoma?',
          why: 'A pergunta de classificação: determina a função e a faixa salarial.',
          tip: 'Seja exato: fecho mensal em autonomia, encerramento como apoio. Exagerar deteta-se no primeiro fecho.',
        },
        {
          question: 'Como trata uma divergência numa reconciliação?',
          why: 'Avalia-se o método, não a memória.',
          tip: 'Descreva o processo: delimitar por período e conta, verificar os lançamentos, localizar o documento, documentar a correção.',
        },
        {
          question: 'Que experiência tem com o SNC e com as IFRS?',
          why: 'Determina se é empregável num ambiente de grupo.',
          tip: 'Refira diferenças concretas com que tenha trabalhado, por exemplo provisões ou locações.',
        },
        {
          question: 'Conte-me um erro que tenha cometido.',
          why: 'Mais importante aqui do que noutros perfis: procura-se alguém que comunique em vez de corrigir em silêncio.',
          tip: 'Erro, impacto, a quem avisou, correção, controlo implementado — por esta ordem.',
        },
        {
          question: 'Como se mantém a par das alterações fiscais?',
          why: 'Avalia-se a iniciativa numa profissão cujo enquadramento muda todos os anos.',
          tip: 'Refira fontes e formação concretas, não «documentação profissional».',
        },
        {
          question: 'Como trabalha sob a pressão do fecho?',
          why: 'A semana de fecho é a prova de esforço da profissão.',
          tip: 'Descreva a sua sequência e como obtém a tempo a informação de outras áreas.',
        },
      ],
      redFlags: [
        'Declarar conhecimentos de software que a parte técnica não confirma.',
        'Apresentar os erros como culpa de outro departamento.',
        'Não conseguir referir nenhuma formação recente.',
      ],
      askThem: [
        'Quantas sociedades e que volume trata a equipa e como se reparte o trabalho?',
        'Como decorre o fecho e quantos dias úteis exige atualmente?',
        'Que sistemas estão em uso e há migrações previstas?',
      ],
      faq: [
        {
          question: 'Há prova técnica?',
          answer:
            'Com frequência, e costuma ser curta: alguns lançamentos, uma especialização ou uma questão de IVA. Procura-se à-vontade de base, não nível de exame — espere casos padrão da própria função.',
        },
        {
          question: 'Como explico a passagem do gabinete para a empresa?',
          answer:
            'Como procura de profundidade em vez de variedade: acompanhar uma sociedade todo o ano em vez de muitos processos em paralelo. É a razão aceite — evite sustentar a explicação apenas na carga de trabalho.',
        },
      ],
    },
  },

  'marketing-manager': {
    name: 'Responsável de marketing',
    application: {
      slug: 'responsavel-de-marketing',
      metaTitle: 'Candidatura de marketing: carta, CV e indicadores',
      metaDescription:
        'Candidatura de responsável de marketing: que KPI convencem, que canais e ferramentas indicar, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de responsável de marketing',
      intro:
        'As candidaturas de marketing raramente falham pelo design e quase sempre pela ausência de números. Se indicar canal, orçamento e resultado, é lido como responsável; se enumerar campanhas, como executante.',
      atsKeywords: [
        'Marketing digital',
        'Gestão de campanhas',
        'SEO',
        'SEA / Google Ads',
        'Marketing de conteúdos',
        'Email marketing',
        'Redes sociais',
        'Automação de marketing (HubSpot)',
        'Google Analytics 4',
        'Taxa de conversão',
        'CAC / ROAS',
        'Responsabilidade orçamental',
        'Gestão de marca',
        'Teste A/B',
      ],
      hardSkills: [
        {
          label: 'KPI com ponto de partida',
          detail:
            '«CAC reduzido de 180 € para 120 €» diz mais do que qualquer percentagem sem base. Dê sempre os dois valores.',
        },
        {
          label: 'Profundidade de canal antes de listas',
          detail:
            'Dois canais que gere a sério valem mais do que oito em que passou. Indique o orçamento que geria.',
        },
        {
          label: 'Ferramentas e dados',
          detail: 'GA4, HubSpot, Salesforce Marketing Cloud, Looker Studio: os filtros procuram literalmente estes nomes.',
        },
        {
          label: 'B2B ou B2C',
          detail:
            'Ciclos longos com maturação de oportunidades é outra profissão que não o marketing de resultados em comércio eletrónico.',
        },
      ],
      softSkills: [
        'Trabalhar com vendas e com produto',
        'Gerir agências e colaboradores externos',
        'Priorizar com orçamento limitado',
        'Defender resultados perante a administração',
        'Critério editorial',
      ],
      certifications: [
        'Certificações Google Ads (Search, Performance Max)',
        'Certificação Google Analytics 4',
        'HubSpot Inbound Marketing / Marketing Software',
        'Pós-graduação em Marketing Digital',
      ],
      cvFocus: [
        {
          label: 'Um resultado por função',
          detail: 'Um indicador que se moveu de forma demonstrável graças ao seu trabalho. É suficiente.',
        },
        {
          label: 'Orçamento e dimensão da equipa',
          detail: 'Ter gerido 30 000 € ou 3 M€ determina o nível de função para o qual é lido.',
        },
        {
          label: 'Ligar um portefólio',
          detail:
            'Duas ou três campanhas com objetivo, execução e resultado, em página ou PDF. Uma ligação substitui uma página de descrição.',
        },
      ],
      coverLetterOpener:
        'Na [Empresa] geri um orçamento de aquisição de 40 000 € mensais e baixei o custo por oportunidade de 94 € para 61 € em dois trimestres, sem degradar a taxa de fecho da equipa comercial.',
      mistakes: [
        {
          label: 'Criatividade sem efeito',
          detail: 'Uma campanha bem executada mas sem resultado não convence nenhuma administração. Nomeie sempre o objetivo.',
        },
        {
          label: 'Declarar canais a mais',
          detail: 'Ser especialista em tudo lê-se como não o ser em nada, e desfaz-se depressa na entrevista.',
        },
        {
          label: 'Sobredesenhar a candidatura',
          detail:
            'As maquetas complexas costumam ficar ilegíveis ao passar por um ATS. Um CV claro e um portefólio ligado é a via segura.',
        },
      ],
      faq: [
        {
          question: 'Preciso de portefólio em marketing?',
          answer:
            'Para perfis de conteúdo e criatividade sim; para perfis de aquisição e analítica vale mais um resumo de indicadores. Em ambos os casos basta uma ligação: anexos com mais de 5 MB são rejeitados por muitos servidores de correio.',
        },
        {
          question: 'Como trato KPI confidenciais?',
          answer:
            'Use valores relativos: «taxa de conversão aumentada em 34 %» em vez da faturação absoluta. Cumpre a confidencialidade e é perfeitamente suficiente para avaliar o seu trabalho.',
        },
        {
          question: 'Esperam-se competências em IA?',
          answer:
            'Cada vez mais, mas como ferramenta e não como fim. O que convence é descrever que processo acelerou e como continua a garantir a qualidade.',
        },
      ],
    },
    interview: {
      slug: 'responsavel-de-marketing',
      metaTitle: 'Entrevista de marketing: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista de responsável de marketing: campanhas, KPI, orçamento e insucessos — o que é avaliado e como estruturar a resposta.',
      heading: 'Entrevista de emprego para responsável de marketing',
      intro:
        'Uma entrevista de marketing desmonta quase sempre uma campanha ao detalhe. Espera-se que separe com clareza objetivo, público, orçamento, resultado e o seu próprio contributo — e é aí que a maioria tropeça.',
      questions: [
        {
          question: 'Fale-me de uma campanha de que se orgulha.',
          why: 'Avalia-se se raciocina em objetivos ou em ações.',
          tip: 'Objetivo, público, canal, orçamento, resultado e a sua parte — por esta ordem, em dois minutos.',
        },
        {
          question: 'Que campanha falhou e porquê?',
          why: 'O marketing é iterativo: quem nunca parou uma campanha nunca testou a sério.',
          tip: 'Nomeie a hipótese, o que a refutou e o que mudou depois.',
        },
        {
          question: 'Que indicador acompanha diariamente?',
          why: 'Distingue a gestão operacional do relatório de fim de mês.',
          tip: 'Refira um e justifique porque representa melhor o negócio.',
        },
        {
          question: 'Como melhoraria o nosso marketing?',
          why: 'Avalia-se a preparação: quase todos os candidatos respondem em geral.',
          tip: 'Duas observações concretas do site ou dos anúncios deles, com raciocínio.',
        },
        {
          question: 'Como trabalha com a equipa comercial?',
          why: 'A linha de atrito mais comum em B2B.',
          tip: 'Descreva definições de oportunidade partilhadas e retorno sobre a qualidade, não apenas passagens.',
        },
        {
          question: 'Como reparte um orçamento limitado?',
          why: 'Avaliam-se a priorização e a cultura de teste.',
          tip: 'Descreva uma repartição entre o consolidado e os testes, com um critério de corte.',
        },
      ],
      redFlags: [
        'Referir indicadores que depois não se sabe reconstruir.',
        'Atribuir-se todos os êxitos e culpar o orçamento por todos os insucessos.',
        'Não ter visto o produto da empresa antes da entrevista.',
      ],
      askThem: [
        'Que indicador decide aqui se o marketing está a funcionar?',
        'Como se reparte o orçamento entre marca e aquisição?',
        'Como colaboram marketing e vendas na definição de oportunidade?',
      ],
      faq: [
        {
          question: 'Devo preparar um caso prático por iniciativa própria?',
          answer:
            'Se não for pedido nenhum, bastam duas observações concretas sobre o marketing deles. Transmite preparação sem ser presunçoso — um plano completo não solicitado soa muitas vezes mal informado.',
        },
        {
          question: 'Como respondo sobre ferramentas que não conheço?',
          answer:
            'Situe-se com honestidade e refira o equivalente: «HubSpot não usei, mas usei Marketo na mesma função». As ferramentas aprendem-se; uma afirmação falsa descobre-se na primeira semana.',
        },
      ],
    },
  },

  'data-analyst': {
    name: 'Analista de dados',
    application: {
      slug: 'analista-de-dados',
      metaTitle: 'Candidatura de analista de dados: carta, CV e competências',
      metaDescription:
        'Candidatura de data analyst: que ferramentas e métodos indicar, como demonstrar impacto, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de analista de dados',
      intro:
        'Um analista não é contratado pelas ferramentas mas porque a sua análise mudou uma decisão. Toda a gente declara SQL; a diferença está em conseguir dizer o que se passou a fazer de forma diferente depois do seu trabalho.',
      atsKeywords: [
        'Análise de dados',
        'SQL',
        'Python',
        'R',
        'Power BI',
        'Tableau',
        'Looker',
        'Visualização de dados',
        'ETL',
        'Armazém de dados',
        'dbt',
        'Teste A/B',
        'Relatórios de KPI',
        'Estatística',
      ],
      hardSkills: [
        {
          label: 'SQL com profundidade real',
          detail:
            'Funções de janela, CTE, otimização de consultas. Quase todos os processos incluem um teste de SQL, e o nível superficial nota-se de imediato.',
        },
        {
          label: 'Uma ferramenta de BI a sério',
          detail:
            'Power BI, Tableau ou Looker — incluindo a modelação de dados, não apenas gráficos sobre uma tabela já feita.',
        },
        {
          label: 'Critério estatístico',
          detail: 'Significância, confiança, dimensão da amostra: a fronteira entre reportar e analisar.',
        },
        {
          label: 'Conhecimento do setor',
          detail:
            'Comércio eletrónico, finanças, logística ou saúde: conhecer os indicadores do setor torna-o útil desde o primeiro dia.',
        },
      ],
      softSkills: [
        'Explicar conclusões a públicos não analíticos',
        'Transformar perguntas vagas em perguntas respondíveis',
        'Desconfiar do próprio resultado',
        'Documentar os pressupostos com clareza',
        'Comunicar um resultado incómodo',
      ],
      certifications: [
        'Microsoft Certified: Power BI Data Analyst Associate',
        'Tableau Desktop Specialist',
        'Google Data Analytics Professional Certificate',
        'AWS Certified Data Engineer – Associate',
      ],
      cvFocus: [
        {
          label: 'Decisões, não painéis',
          detail:
            '«A análise de cancelamentos levou a redesenhar o acolhimento; cancelamentos menos 18 %» em vez de «criação de painéis».',
        },
        {
          label: 'Volume e fontes de dados',
          detail: 'A ordem de grandeza e o número de sistemas ligados mostram em que ambiente trabalha.',
        },
        {
          label: 'Um exemplo de trabalho público',
          detail: 'Um notebook ou um painel público com uma pergunta e uma resposta substitui muitas afirmações.',
        },
      ],
      coverLetterOpener:
        'A minha análise de coortes na [Empresa] mostrou que 60 % dos cancelamentos ocorrem nos primeiros 30 dias; o redesenho do acolhimento que se seguiu reduziu a perda de clientes em 18 % no trimestre seguinte.',
      mistakes: [
        {
          label: 'Uma lista de ferramentas em vez de uma pergunta',
          detail: 'Todos os candidatos têm SQL e Python. Quase nenhum escreve a pergunta que respondeu com elas.',
        },
        {
          label: 'Confundir analista com cientista de dados',
          detail:
            'Declarar modelos que nunca chegaram a produção leva diretamente a perguntas incómodas na parte técnica.',
        },
        {
          label: 'Argumentar sem ligação ao negócio',
          detail: 'Uma análise metodologicamente limpa mas sem uso visível não convence nenhuma área.',
        },
      ],
      faq: [
        {
          question: 'É preciso um curso de estatística ou informática?',
          answer:
            'Não: as mudanças de carreira são comuns em analítica. O que decide é uma amostra de trabalho sólida: uma pergunta real, bem resolvida e bem apresentada. Sem formação específica, a amostra pesa mais, não o comprimento da candidatura.',
        },
        {
          question: 'Como demonstro experiência se os dados são confidenciais?',
          answer:
            'Descreva pergunta, método e impacto sem valores absolutos, e acrescente um projeto com dados públicos. Essa combinação de prática descrita e ofício verificável é a via habitual.',
        },
        {
          question: 'Como me preparo para o teste de SQL?',
          answer:
            'Treine joins, agregações, funções de janela e CTE sobre um conjunto de dados real e com tempo limitado. Quase todos os processos incluem um, e é o principal ponto de eliminação.',
        },
      ],
    },
    interview: {
      slug: 'analista-de-dados',
      metaTitle: 'Entrevista de analista de dados: perguntas e respostas',
      metaDescription:
        'Entrevista de data analyst: teste de SQL, caso prático e perguntas comportamentais — o que é avaliado e como responder.',
      heading: 'Entrevista de emprego para analista de dados',
      intro:
        'O processo costuma ter três fases: teste de SQL, caso prático com pergunta aberta e conversa com a área de negócio. A maioria cai no caso prático — não pela análise, mas por calcular antes de perguntar.',
      questions: [
        {
          question: 'Um indicador caiu 30 % de um dia para o outro. Como procede?',
          why: 'A pergunta de diagnóstico clássica: avalia método, não intuição.',
          tip: 'Excluir primeiro um problema de dados, depois segmentar — região, dispositivo, canal, coorte — e só então testar hipóteses.',
        },
        {
          question: 'Como apresenta um resultado que o negócio não quer ouvir?',
          why: 'Avaliam-se ao mesmo tempo firmeza e comunicação.',
          tip: 'Resultado, método, incerteza, opções. Um exemplo real é o que mais pesa aqui.',
        },
        {
          question: 'Como garante que os seus números estão certos?',
          why: 'A qualidade dos dados é o núcleo da função.',
          tip: 'Verificações de coerência, cruzamento com uma segunda fonte, pressupostos documentados — nomeie-os em concreto.',
        },
        {
          question: 'Explique um teste A/B a alguém sem formação estatística.',
          why: 'Avalia-se a capacidade de traduzir.',
          tip: 'Sem jargão, e com um exemplo retirado do produto deles.',
        },
        {
          question: 'Em que trabalhou que tenha mudado uma decisão?',
          why: 'Distingue reportar de analisar.',
          tip: 'Nomeie a decisão e quem a tomou, não o painel.',
        },
        {
          question: 'Como prioriza pedidos que competem entre si?',
          why: 'Um analista é chamado por todas as áreas: priorizar é tarefa diária.',
          tip: 'Priorizar pela relevância para a decisão e pelo prazo, e passar o recorrente a autosserviço.',
        },
      ],
      redFlags: [
        'Começar a calcular no caso prático sem clarificar a pergunta.',
        'Apresentar uma correlação como causa.',
        'Assumir pressupostos sem os enunciar.',
      ],
      askThem: [
        'Quem usa as análises e que decisões dependem delas?',
        'Como está montada a arquitetura de dados e que fiabilidade têm as fontes?',
        'A função é mais de habilitar autosserviço ou de análise em profundidade?',
      ],
      faq: [
        {
          question: 'Que nível costuma ter o teste de SQL?',
          answer:
            'Normalmente intermédio e com tempo limitado: vários joins, uma agregação e alguma função de janela. Mais frequente do que a dificuldade é a armadilha de não verificar a coerência do resultado — isso também é pontuado.',
        },
        {
          question: 'O que me espera no caso prático?',
          answer:
            'Uma pergunta de negócio aberta, do tipo «porque está a descer a recompra?». Esperam-se perguntas de enquadramento, uma abordagem e pressupostos enunciados — não um número fechado.',
        },
      ],
    },
  },

  teacher: {
    name: 'Professor',
    application: {
      slug: 'professor',
      metaTitle: 'Candidatura de professor: carta de apresentação e documentação',
      metaDescription:
        'Candidatura na docência: concurso nacional, contratação de escola e ensino privado, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de professor',
      intro:
        'Na docência coexistem vias que se leem de forma muito diferente: o concurso nacional, onde contam o grupo de recrutamento e a graduação profissional, e a contratação de escola ou o ensino privado, onde conta o encaixe no projeto educativo.',
      atsKeywords: [
        'Docência',
        'Grupo de recrutamento',
        'Profissionalização em serviço',
        'Concurso nacional de professores',
        'Planificação didática',
        'Diferenciação pedagógica',
        'Gestão da sala de aula',
        'Avaliação das aprendizagens',
        'Necessidades educativas especiais',
        'Direção de turma',
        'Relação com as famílias',
        'Tecnologias educativas',
      ],
      hardSkills: [
        {
          label: 'Grupo de recrutamento e ciclo',
          detail:
            'O grupo de recrutamento e os ciclos lecionados determinam quase tudo. Ambos devem constar na primeira linha.',
        },
        {
          label: 'Habilitação profissional',
          detail:
            'Licenciatura, mestrado em ensino e habilitação profissional para a docência; para diplomas estrangeiros, o reconhecimento.',
        },
        {
          label: 'Experiência letiva fora do estágio',
          detail:
            'Substituições, apoio ao estudo, explicações, formação de adultos: tudo o que demonstre que sustenta uma turma.',
        },
        {
          label: 'Qualificações complementares',
          detail:
            'Ensino bilingue, educação especial, tecnologias educativas: exatamente o que as direções de escola procuram.',
        },
      ],
      softSkills: [
        'Autoridade sem confronto',
        'Reuniões difíceis com encarregados de educação',
        'Trabalho no grupo disciplinar',
        'Paciência perante turmas heterogéneas',
        'Fiabilidade na vida da escola',
      ],
      certifications: [
        'Mestrado em Ensino (habilitação profissional para a docência)',
        'Formação em educação especial',
        'Certificação em competências digitais docentes',
        'Formação contínua creditada pelo CCPFC',
      ],
      cvFocus: [
        {
          label: 'Tipo de escola e níveis',
          detail: 'Agrupamento público, colégio privado ou escola profissional, e os níveis efetivamente lecionados.',
        },
        {
          label: 'Envolvimento para além das aulas',
          detail:
            'Clubes, visitas, projetos, coordenações: no ensino privado e na contratação de escola é muitas vezes o fator decisivo.',
        },
        {
          label: 'Referência ao projeto educativo',
          detail:
            'Ensino bilingue, percursos profissionais, projetos de inovação: uma frase basta para se distinguir da candidatura padrão.',
        },
      ],
      coverLetterOpener:
        'A vossa secção bilingue no 3.º ciclo corresponde exatamente ao meu perfil de inglês e história: durante dois períodos lecionei história em inglês a uma turma heterogénea de 8.º ano.',
      mistakes: [
        {
          label: 'A mesma carta para o concurso e para a escola',
          detail:
            'O concurso espera dados formais; a direção da escola espera encaixe no projeto. São precisos dois textos.',
        },
        {
          label: 'Princípios pedagógicos em vez de prática',
          detail:
            'Meia página de filosofia educativa não é lida. Uma sequência didática descrita com o seu resultado, sim.',
        },
        {
          label: 'Documentação incompleta',
          detail:
            'Certificados de habilitações, registo criminal e certificados de formação: se faltar um, a colocação atrasa-se semanas.',
        },
      ],
      faq: [
        {
          question: 'Como entro na docência vindo de outra profissão?',
          answer:
            'Com o mestrado em ensino que confere habilitação profissional, e depois pelo concurso nacional ou por contratação de escola. O que decide a via é a correspondência entre a sua formação e um grupo de recrutamento; informática, matemática e as áreas técnicas do ensino profissional têm as melhores perspetivas.',
        },
        {
          question: 'Candidato-me ao concurso nacional ou diretamente às escolas?',
          answer:
            'Normalmente a ambos: o concurso para o público, a candidatura direta para colégios privados e para horários incompletos. A via direta é mais rápida, mas só onde existe vaga publicada.',
        },
        {
          question: 'Quanto pesa a graduação profissional?',
          answer:
            'No concurso nacional é determinante, porque a ordenação depende dela. Numa vaga de escola concreta, o encaixe no projeto e as qualificações complementares pesam bastante mais.',
        },
      ],
    },
    interview: {
      slug: 'professor',
      metaTitle: 'Entrevista de professor: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista na docência: gestão da sala, diferenciação, famílias e projeto educativo — o que é avaliado e o que perguntar.',
      heading: 'Entrevista de emprego para professor',
      intro:
        'No ensino privado e na contratação de escola a entrevista é conduzida pela direção, muitas vezes com a coordenação pedagógica. Pergunta-se quase sempre por situações concretas, e com frequência há uma aula observada que pesa mais do que a conversa.',
      questions: [
        {
          question: 'Como gere uma turma que não se acalma?',
          why: 'A gestão da sala é a competência central: procuram-se estruturas, não volume de voz.',
          tip: 'Descreva as rotinas e regras que estabelece antes, não apenas a sua reação no momento.',
        },
        {
          question: 'Como diferencia numa turma heterogénea?',
          why: 'O dia a dia de qualquer ciclo. Espera-se prática, não teoria.',
          tip: 'Detalhe uma aula com tarefas graduadas: materiais, sequência, resultado.',
        },
        {
          question: 'Conte-me uma reunião difícil com um encarregado de educação.',
          why: 'A relação com as famílias consome muito tempo e desgasta as equipas.',
          tip: 'Ouvir, separar os factos da emoção, acordar uma ação, deixar registo.',
        },
        {
          question: 'Porquê a nossa escola?',
          why: 'A pergunta decisiva em qualquer vaga concreta.',
          tip: 'Apoie-se no projeto educativo, no caráter próprio ou num programa específico da escola.',
        },
        {
          question: 'Como usa a tecnologia na sala de aula?',
          why: 'Verifica-se se a ferramenta é justificada didaticamente e não usada por si mesma.',
          tip: 'Um exemplo em que a ferramenta permitiu algo impossível de outro modo.',
        },
        {
          question: 'O que traria para além das suas aulas?',
          why: 'As escolas contratam colegas que sustentam a vida da escola.',
          tip: 'Seja concreto — uma atividade, uma coordenação, um projeto — e honesto quanto à sua disponibilidade.',
        },
      ],
      redFlags: [
        'Atribuir os problemas de comportamento apenas aos alunos ou às famílias.',
        'Não ter lido o projeto educativo da escola.',
        'Falar só em fórmulas pedagógicas sem um único exemplo.',
      ],
      askThem: [
        'Como está organizado o acolhimento de novos professores?',
        'Quais são as prioridades da escola para os próximos dois anos letivos?',
        'Como se coordena o trabalho dentro do grupo disciplinar?',
      ],
      faq: [
        {
          question: 'Como é uma aula observada?',
          answer:
            'Costuma ser uma aula reduzida com uma turma que não conhece, com o tema comunicado antecipadamente e uma conversa posterior. Valoriza-se mais a sua análise do que funcionou e do que não funcionou do que uma aula sem falhas.',
        },
        {
          question: 'Posso lecionar sem colocação no concurso?',
          answer:
            'Sim, por contratação de escola no público ou com contrato em colégios privados, e é uma via de entrada comum. A estabilidade é menor, mas permite acumular tempo de serviço que depois conta na graduação.',
        },
      ],
    },
  },

  'office-administrator': {
    name: 'Assistente administrativo',
    application: {
      slug: 'assistente-administrativo',
      metaTitle: 'Candidatura administrativa: carta de apresentação e CV',
      metaDescription:
        'Candidatura de assistente administrativo: que tarefas e software indicar, exemplo de abertura e os erros que tornam um CV substituível.',
      heading: 'Como escrever uma candidatura de assistente administrativo',
      intro:
        'As funções administrativas recebem mais candidaturas do que quase todas as outras, e a maioria é substituível. Descrever o seu âmbito real em vez de «tarefas administrativas gerais» já o coloca no primeiro terço.',
      atsKeywords: [
        'Gestão administrativa',
        'Administração de vendas',
        'Conferência de faturas',
        'Gestão de agendas',
        'Despesas de deslocação',
        'Correspondência',
        'Microsoft Office / Excel',
        'ERP',
        'Introdução e manutenção de dados',
        'Elaboração de orçamentos',
        'Receção e central telefónica',
        'Gestão documental',
      ],
      hardSkills: [
        {
          label: 'O seu âmbito real',
          detail:
            'Administração de vendas, faturação, gestão de pessoal ou apoio à direção: funções muito diferentes sob a mesma designação.',
        },
        {
          label: 'Excel para além do básico',
          detail:
            'PROCV/PROCX, tabelas dinâmicas, filtros: é a competência mais verificada nesta família.',
        },
        {
          label: 'ERP e software de gestão',
          detail:
            'SAP, Primavera, PHC, Sage ou Moloni, pelo nome: o tempo de adaptação é um custo direto para a empresa.',
        },
        {
          label: 'Números de volume',
          detail:
            'Encomendas por semana, faturas por mês, instalações apoiadas: é o que torna concreta a «gestão administrativa».',
        },
      ],
      softSkills: [
        'Priorizar sem supervisão próxima',
        'Manter a cordialidade com interlocutores difíceis',
        'Cumprir prazos de forma fiável',
        'Discrição com dados de pessoal e contratos',
        'Antecipar para além da própria tarefa',
      ],
      certifications: [
        'Curso técnico profissional em Técnico de Secretariado ou Gestão',
        'Certificação em Excel avançado',
        'Formação em contabilidade ou processamento salarial',
        'Certificação em software de gestão (Primavera, PHC)',
      ],
      cvFocus: [
        {
          label: 'Setor e dimensão da empresa',
          detail: 'Oficina, escritório profissional, indústria ou administração pública: o dia a dia não se parece em nada.',
        },
        {
          label: 'O software num bloco próprio',
          detail: 'Uma lista curta com o nível de utilização é lida; um parágrafo não é.',
        },
        {
          label: 'Um percurso sem lacunas por explicar',
          detail: 'No recrutamento administrativo a cronologia é analisada ao detalhe. Explique brevemente as interrupções.',
        },
      ],
      coverLetterOpener:
        'Na minha função atual trato cerca de 120 encomendas de clientes por semana em Primavera — desde o registo da encomenda e o acompanhamento de prazos até à faturação.',
      mistakes: [
        {
          label: '«Tarefas administrativas gerais»',
          detail: 'A fórmula mais frequente do setor e a que menos informa.',
        },
        {
          label: '«Bons conhecimentos de Microsoft Office»',
          detail: 'Toda a gente escreve isso. Diga o que constrói realmente em Excel e distingue-se de imediato.',
        },
        {
          label: 'Uma carta-tipo sem referência',
          detail: 'Com tantos candidatos, decide a frase que demonstra que leu o anúncio.',
        },
      ],
      faq: [
        {
          question: 'Como me destaco entre muitos candidatos?',
          answer:
            'Com concretização: volumes, software e âmbito exato. A maioria das candidaturas do setor fica-se pelo genérico, por isso três dados precisos já parecem acima da média.',
        },
        {
          question: 'Como explico um regresso após uma pausa longa?',
          answer:
            'Com naturalidade e brevidade na carta, sem justificações, e uma linha sobre a atualização — um curso de informática ou de contabilidade. Uma lacuna calada gera mais perguntas do que uma lacuna nomeada.',
        },
        {
          question: 'A candidatura espontânea vale a pena?',
          answer:
            'Sim, sobretudo na área administrativa, onde muitas vagas são preenchidas internamente ou por indicação. Indique a área concreta: uma candidatura espontânea sem direção raramente é reencaminhada.',
        },
      ],
    },
    interview: {
      slug: 'assistente-administrativo',
      metaTitle: 'Entrevista administrativa: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista de assistente administrativo: organização, Excel, priorização e confidencialidade — o que é avaliado e o que perguntar.',
      heading: 'Entrevista de emprego para assistente administrativo',
      intro:
        'A entrevista reúne normalmente a chefia direta e alguém dos recursos humanos. Sondam-se a organização pessoal, o rigor e a resistência à carga com exemplos concretos, e muitos processos incluem um teste breve de Excel ou de redação.',
      questions: [
        {
          question: 'Como se organiza quando várias coisas são urgentes ao mesmo tempo?',
          why: 'O núcleo da função: espera-se um critério reproduzível, não resistência.',
          tip: 'Priorizar por prazo e consequência, avisar quando algo vai atrasar — com um exemplo.',
        },
        {
          question: 'Como evita cometer erros?',
          why: 'O rigor é o primeiro critério na área administrativa.',
          tip: 'Descreva a sua rotina de controlo: dupla verificação, lista de conferência, revisão antes de enviar.',
        },
        {
          question: 'Que funções de Excel usa regularmente?',
          why: 'A competência mais sobrevalorizada nos CV administrativos.',
          tip: 'Refira funções concretas e para que as usa. Seja honesto: costuma haver teste.',
        },
        {
          question: 'Como lida com uma chamada de alguém irritado?',
          why: 'Avaliam-se a desescalada e a fiabilidade do compromisso.',
          tip: 'Deixar terminar, reformular, comprometer-se com um passo concreto e cumpri-lo.',
        },
        {
          question: 'Como trata documentação confidencial?',
          why: 'As funções administrativas tocam em dados de pessoal, contratos e salários.',
          tip: 'Refira prática concreta: permissões de acesso, arquivo fechado, nenhuma cedência sem autorização.',
        },
        {
          question: 'O que faz se a sua chefia estiver indisponível e for preciso decidir?',
          why: 'Avaliam-se autonomia e bom senso.',
          tip: 'Marque o limite: o que decide, o que faz validar e como deixa registado.',
        },
      ],
      redFlags: [
        'Declarar um nível de Excel que o teste não confirma.',
        'Responder às perguntas de organização apenas com «sou muito organizado».',
        'Falar mal de chefias ou colegas anteriores.',
      ],
      askThem: [
        'Como se reparte o trabalho entre as pessoas da equipa?',
        'Que software é usado e quanto dura a formação inicial?',
        'Quais seriam as prioridades dos primeiros três meses?',
      ],
      faq: [
        {
          question: 'Há teste?',
          answer:
            'Com frequência: um exercício curto de Excel, uma prova de redação ou uma carta-modelo. Raramente ultrapassam os 30 minutos e procuram à-vontade de base, não conhecimentos especializados.',
        },
        {
          question: 'Posso perguntar pelo teletrabalho e pelo horário?',
          answer:
            'Sim, mais adiante na conversa: são questões práticas legítimas. Pergunte pelo que a equipa faz de facto em vez do que diz a política, e obterá a resposta útil.',
        },
      ],
    },
  },

  'customer-service-agent': {
    name: 'Assistente de apoio ao cliente',
    application: {
      slug: 'apoio-ao-cliente',
      metaTitle: 'Candidatura de apoio ao cliente: carta, CV e indicadores',
      metaDescription:
        'Candidatura de apoio ao cliente: que indicadores e ferramentas indicar, exemplo de abertura e erros que banalizam um perfil.',
      heading: 'Como escrever uma candidatura de apoio ao cliente',
      intro:
        'No apoio ao cliente interessa menos o percurso do que a prova de que sustenta uma conversa sob pressão. Indique canal, volume e indicadores de qualidade e é situado de imediato; os restantes acabam na pilha geral.',
      atsKeywords: [
        'Apoio ao cliente',
        'Serviço ao cliente',
        'Suporte de primeira linha',
        'Suporte de segunda linha',
        'Gestão de reclamações',
        'Gestão de escalamentos',
        'CRM (Salesforce, Zendesk)',
        'Sistema de tickets',
        'Chamadas de entrada / saída',
        'Satisfação do cliente (CSAT)',
        'Resolução no primeiro contacto',
        'Acordo de nível de serviço',
      ],
      hardSkills: [
        {
          label: 'Canal e volume',
          detail:
            'Telefone, email, chat ou redes sociais — e quantos contactos por dia. 80 chamadas é outra função que não 20 casos complexos.',
        },
        {
          label: 'Indicadores de serviço',
          detail:
            'CSAT, resolução no primeiro contacto, tempo médio de atendimento e cumprimento do nível de serviço: a língua de qualquer direção de serviço.',
        },
        {
          label: 'Ferramentas',
          detail: 'Zendesk, Freshdesk, Salesforce Service Cloud, Intercom — pelo nome.',
        },
        {
          label: 'Profundidade de produto',
          detail:
            'Suporte técnico, seguros, energia ou comércio eletrónico: o conhecimento de produto determina adaptação e faixa salarial.',
        },
      ],
      softSkills: [
        'Manter a calma com clientes irritados',
        'Escuta ativa',
        'Explicar com clareza e sem jargão',
        'Resistência à cadência elevada',
        'Cumprir o que foi prometido',
      ],
      certifications: [
        'Curso técnico profissional em apoio à gestão e serviço ao cliente',
        'Salesforce Service Cloud Consultant',
        'ITIL Foundation (suporte técnico)',
        'Certificações de línguas (B2/C1)',
      ],
      cvFocus: [
        {
          label: 'Indicadores em cada função',
          detail: 'Contactos por dia, CSAT e resolução no primeiro contacto: é o primeiro que se lê.',
        },
        {
          label: 'Línguas com nível',
          detail: 'Em serviço internacional cada língua adicional é uma alavanca salarial direta.',
        },
        {
          label: 'Disponibilidade horária',
          detail: 'Muitos serviços funcionam por turnos: esclarecê-lo cedo poupa tempo a ambas as partes.',
        },
      ],
      coverLetterOpener:
        'No setor da energia atendo cerca de 60 contactos diários por telefone e chat, com 84 % de resolução no primeiro contacto e um CSAT de 4,6 em 5.',
      mistakes: [
        {
          label: 'Apenas «simpático e comunicativo»',
          detail: 'Aparece em praticamente todas as candidaturas do setor. Um indicador vale mais do que qualquer adjetivo.',
        },
        {
          label: 'Nenhum dado de volume',
          detail: 'Sem número de contactos não se sabe se aguenta a carga, que é a pergunta central da função.',
        },
        {
          label: 'Esconder a experiência em reclamações',
          detail: 'Saber gerir um escalamento é a competência mais valiosa da área, não um defeito.',
        },
      ],
      faq: [
        {
          question: 'A experiência em restauração ou comércio conta?',
          answer:
            'Sim, e costuma ser subvalorizada. Traduza-a para a linguagem do serviço: clientes por turno, reclamações tratadas, incidentes resolvidos — assim encaixa diretamente na função.',
        },
        {
          question: 'Como abordo o teletrabalho?',
          answer:
            'O apoio ao cliente é uma das funções mais organizadas em remoto, por isso a pergunta é esperada. Coloque-a na entrevista e não na carta, e pergunte pelo modelo real da equipa.',
        },
        {
          question: 'As línguas pesam mais do que a experiência setorial?',
          answer:
            'Em serviço internacional muitas vezes sim: uma segunda língua em B2/C1 abre vagas que de outro modo ficam fechadas. Em suporte técnico pesa mais o conhecimento de produto.',
        },
      ],
    },
    interview: {
      slug: 'apoio-ao-cliente',
      metaTitle: 'Entrevista de apoio ao cliente: perguntas e respostas',
      metaDescription:
        'Entrevista de apoio ao cliente: escalamentos, carga e indicadores, normalmente com simulação — o que é avaliado e como responder.',
      heading: 'Entrevista de emprego em apoio ao cliente',
      intro:
        'As entrevistas de serviço incluem quase sempre uma simulação: é-lhe apresentado um cliente irritado e tem de conduzir a conversa. Não se pontua a solução, mas o facto de ouvir primeiro e só depois assumir um compromisso que consiga cumprir.',
      questions: [
        {
          question: 'Um cliente está furioso e tem razão. O que faz?',
          why: 'A situação de referência da função.',
          tip: 'Deixar terminar, reconhecer a falha, propor solução, comprometer um prazo e fazer seguimento. Sem justificar a empresa.',
        },
        {
          question: 'Um cliente exige algo que não pode conceder. Como reage?',
          why: 'Avalia-se se sabe sustentar um limite com cordialidade.',
          tip: 'Não à exigência, sim à necessidade: explique o que é possível e ofereça a alternativa em concreto.',
        },
        {
          question: 'Como lida com um volume elevado de chamadas?',
          why: 'A rotatividade no setor é alta; procura-se uma autoavaliação realista.',
          tip: 'Descreva com honestidade como recupera entre chamadas e que cadência sustentou de facto.',
        },
        {
          question: 'Qual foi o seu escalamento mais difícil?',
          why: 'Avalia-se experiência real, não teoria.',
          tip: 'Situação, os seus passos, resultado e o que mudou depois.',
        },
        {
          question: 'Como explica algo complexo a um cliente impaciente?',
          why: 'A clareza é a verdadeira competência técnica da área.',
          tip: 'Curto, sem jargão e com uma confirmação de que ficou claro.',
        },
        {
          question: 'Como sabe que teve um bom dia?',
          why: 'Mostra se trabalha com indicadores em mente.',
          tip: 'Refira um indicador de qualidade e outro de volume, e porque andam juntos.',
        },
      ],
      redFlags: [
        'Propor uma solução na simulação antes de ter ouvido.',
        'Falar com desprezo dos clientes difíceis.',
        'Comprometer-se com o que não conseguirá cumprir.',
      ],
      askThem: [
        'Quantos contactos atende aqui um assistente por dia?',
        'Quanto dura a formação inicial e como se constrói o conhecimento de produto?',
        'Como é medido o desempenho: por volume, por qualidade ou por ambos?',
      ],
      faq: [
        {
          question: 'Como funciona a simulação?',
          answer:
            'Costumam ser cinco a dez minutos com uma reclamação simulada. Pontuam-se a escuta, a reformulação e a firmeza do compromisso — não o facto de saber a solução correta.',
        },
        {
          question: 'Posso perguntar pelos subsídios de turno?',
          answer:
            'Sim, é completamente habitual no setor e é respondido com naturalidade. Pergunte em conjunto com o planeamento de turnos e resolve as duas coisas de uma vez.',
        },
      ],
    },
  },

  electrician: {
    name: 'Eletricista',
    application: {
      slug: 'eletricista',
      metaTitle: 'Candidatura de eletricista: carta, CV e certificações',
      metaDescription:
        'Candidatura de eletricista: que certificações destacar, como nomear a especialidade, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de eletricista',
      intro:
        'No setor elétrico as candidaturas são lidas e decididas depressa. Especialidade, certificações e carta de condução vêm à frente de tudo: uma carta longa não compensa uma credencial em falta.',
      atsKeywords: [
        'Eletricista',
        'Instalações elétricas de baixa tensão',
        'Manutenção industrial',
        'Automação',
        'Montagem de quadros elétricos',
        'Programação de autómatos (Siemens S7)',
        'Regras técnicas de instalações elétricas (RTIEBT)',
        'Segurança em trabalhos elétricos',
        'Deteção de avarias',
        'Manutenção preventiva',
        'Medições elétricas',
        'Fotovoltaico',
      ],
      hardSkills: [
        {
          label: 'Nomeie a sua especialidade',
          detail:
            'Residencial, terciário, manutenção industrial ou automação: é o primeiro filtro aplicado ao seu perfil.',
        },
        {
          label: 'Certificações e credenciais',
          detail:
            'Certificação de técnico responsável pela DGEG, formação em segurança em trabalhos elétricos, média tensão — com datas de validade.',
        },
        {
          label: 'Automação',
          detail:
            'A experiência em autómatos, sobretudo Siemens S7 / TIA Portal, é a maior diferença salarial no ambiente industrial.',
        },
        {
          label: 'Carta de condução e mobilidade',
          detail:
            'Em obra e em assistência técnica a carta B é requisito de facto. Se faltar no CV, presume-se que não a tem.',
        },
      ],
      softSkills: [
        'Rigor de segurança sem atalhos',
        'Autonomia em obra',
        'Trato com o cliente em instalações ocupadas',
        'Registo cuidado das verificações',
        'Fiabilidade dentro da equipa',
      ],
      certifications: [
        'Curso profissional de Técnico de Eletrotecnia (nível 4)',
        'Certificação de técnico responsável por instalações elétricas (DGEG)',
        'Formação em segurança em trabalhos elétricos',
        'Formação em autómatos Siemens TIA Portal',
      ],
      cvFocus: [
        {
          label: 'Tipo de intervenção',
          detail: 'Obra nova, remodelação, manutenção industrial ou assistência ao cliente: dias muito diferentes.',
        },
        {
          label: 'Instalações e fabricantes',
          detail: 'Indique tipos de instalação e autómatos concretos; as empresas procuram exatamente isso.',
        },
        {
          label: 'Anexe as credenciais',
          detail: 'Certificado e credenciais em anexo: sem elas não é possível planear a sua entrada nos trabalhos.',
        },
      ],
      coverLetterOpener:
        'Há seis anos que trabalho em manutenção numa unidade alimentar a três turnos: deteção de avarias em linhas de enchimento comandadas por S7, verificações periódicas e alterações de quadros.',
      mistakes: [
        {
          label: 'Escrever apenas «eletricista»',
          detail: 'Sem a especialidade, uma empresa não consegue avaliar se encaixa na vaga.',
        },
        {
          label: 'Omitir as credenciais',
          detail: 'São o conteúdo mais importante da candidatura e fixam diretamente a sua categoria.',
        },
        {
          label: 'Uma carta demasiado longa',
          detail:
            'No setor lê-se depressa. Meia página com especialidade, experiência e disponibilidade é mais do que suficiente.',
        },
      ],
      faq: [
        {
          question: 'É preciso carta de apresentação no setor?',
          answer:
            'Uma versão breve sim: responde a porquê esta empresa e a partir de quando pode entrar. Muitas decidem com o CV e as credenciais, mas uma candidatura sem carta parece enviada ao acaso.',
        },
        {
          question: 'Posso candidatar-me sem o curso concluído?',
          answer:
            'Sim, como ajudante, indicando a sua experiência e a intenção de concluir. Muitas empresas formam quando a fiabilidade e o critério de segurança são visíveis — refira tarefas concretas para o demonstrar.',
        },
        {
          question: 'Quanto pesa a certificação de técnico responsável?',
          answer:
            'Para assinar instalações, assumir responsabilidade e trabalhar por conta própria é decisiva. Para funções de execução e montagem pesam mais as credenciais de segurança e a experiência com instalações.',
        },
      ],
    },
    interview: {
      slug: 'eletricista',
      metaTitle: 'Entrevista de eletricista: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista no setor elétrico: segurança, deteção de avarias e credenciais — o que é avaliado e o que perguntar à empresa.',
      heading: 'Entrevista de emprego para eletricista',
      intro:
        'A entrevista é normalmente conduzida pelo encarregado de obra ou pelo próprio empresário, e é curta e prática. Pergunta-se pelas instalações que conhece, pelo seu método perante uma avaria e, sobretudo, pela sua relação com as regras de segurança sob pressão de prazos.',
      questions: [
        {
          question: 'Como atua perante uma avaria que não conhece?',
          why: 'A pergunta central: procura-se delimitação sistemática, não tentativa e erro.',
          tip: 'Recolher o sintoma, colocar a instalação em condições seguras, ir da alimentação ao recetor, medir em vez de supor, registar.',
        },
        {
          question: 'Que credenciais possui?',
          why: 'Determina diretamente o planeamento e a categoria.',
          tip: 'Refira todas as válidas com a respetiva data e leve os certificados.',
        },
        {
          question: 'O que faz se lhe pedirem para saltar um passo de segurança por causa do prazo?',
          why: 'A pergunta de atitude mais importante da profissão.',
          tip: 'Seja inequívoco: as regras de segurança não se negoceiam. Ofereça uma alternativa em vez de apenas recusar.',
        },
        {
          question: 'Com que autómatos trabalhou?',
          why: 'Fixa o tempo de adaptação num ambiente industrial.',
          tip: 'Fabricante, gama e o que fazia realmente: ler, alterar ou programar.',
        },
        {
          question: 'Como lida com o cliente na instalação dele?',
          why: 'Em assistência técnica o eletricista é a cara da empresa.',
          tip: 'Um exemplo: explicar o que está a fazer, cumprir a marcação, deixar a zona limpa.',
        },
        {
          question: 'Como documenta as suas intervenções?',
          why: 'Os certificados e as fichas têm valor regulamentar.',
          tip: 'Descreva com precisão o que regista e em que sistema.',
        },
      ],
      redFlags: [
        'Dar a entender que a segurança se negoceia quando a obra está atrasada.',
        'Declarar credenciais que não se conseguem comprovar.',
        'Não perguntar nada sobre o planeamento dos trabalhos ou as escalas de prevenção.',
      ],
      askThem: [
        'Como se reparte o trabalho entre obra, oficina e assistência ao cliente?',
        'Há escalas de prevenção e como são remuneradas?',
        'Que formação a empresa acompanha?',
      ],
      faq: [
        {
          question: 'Devo levar os certificados?',
          answer:
            'Sim — certificado do curso, credenciais e comprovativos de formação em segurança, em original ou cópia. Muitas empresas decidem no momento e uma credencial em falta apenas adia a proposta.',
        },
        {
          question: 'Há prova prática?',
          answer:
            'Nalgumas empresas sim, normalmente curta e na oficina: uma medição, um esquema, uma pequena deteção de avaria. Avaliam-se o método e o critério de segurança, não a velocidade.',
        },
      ],
    },
  },

  'warehouse-logistics': {
    name: 'Operador logístico',
    application: {
      slug: 'operador-logistico',
      metaTitle: 'Candidatura em logística: CV, carta de empilhador e sistemas',
      metaDescription:
        'Candidatura de operador logístico: que credenciais e sistemas indicar, o que deve constar na carta, exemplo de abertura e erros frequentes.',
      heading: 'Como escrever uma candidatura de operador logístico',
      intro:
        'Em logística decide-se depressa, muitas vezes em poucos dias. Certificado de condução de empilhador, disponibilidade de turnos e o sistema de gestão de armazém utilizado são os três dados procurados primeiro.',
      atsKeywords: [
        'Logística de armazém',
        'Preparação de encomendas',
        'Receção de mercadoria',
        'Expedição',
        'Inventário',
        'Certificado de empilhador',
        'Empilhador retrátil e contrabalançado',
        'Sistema de gestão de armazém (WMS)',
        'SAP EWM',
        'Controlo de stock',
        'Mercadorias perigosas (ADR)',
        'Paletização e cintagem',
      ],
      hardSkills: [
        {
          label: 'Certificados e habilitações',
          detail:
            'Certificado de condutor de empilhador, porta-paletes, retrátil, ADR — com data de validade. Sem eles não é possível planear a sua entrada.',
        },
        {
          label: 'Sistema de gestão de armazém',
          detail:
            'SAP EWM, Mecalux Easy WMS, terminais de radiofrequência, picking por voz: o domínio do sistema fixa o tempo de adaptação.',
        },
        {
          label: 'A função dentro do armazém',
          detail:
            'Receção, preparação, expedição ou controlo de stock são perfis distintos com exigências distintas.',
        },
        {
          label: 'Números de desempenho',
          detail: 'Linhas por hora, taxa de erro, volumes por turno: os indicadores do setor.',
        },
      ],
      softSkills: [
        'Resistência física em trabalho por turnos',
        'Rigor a cadência elevada',
        'Trabalho em equipa sob pressão de prazos',
        'Pontualidade e fiabilidade',
        'Atenção à segurança',
      ],
      certifications: [
        'Curso profissional de Técnico de Logística',
        'Certificado de condução de empilhador',
        'Formação ADR de mercadorias perigosas',
        'Formação em estiva e acondicionamento de cargas',
      ],
      cvFocus: [
        {
          label: 'Tipo e dimensão do armazém',
          detail:
            'Armazém de grande altura, câmara de frio, comércio eletrónico ou peças: o ritmo e as exigências mudam muito.',
        },
        {
          label: 'Regime de turnos',
          detail: 'Dois turnos, três turnos, noite, fim de semana: costuma ser o critério decisivo.',
        },
        {
          label: 'Credenciais bem visíveis',
          detail: 'Um bloco próprio na parte superior, não escondidas entre as experiências.',
        },
      ],
      coverLetterOpener:
        'Há quatro anos que trabalho a três turnos numa plataforma de distribuição com cerca de 12 000 posições de palete — preparação com terminal de radiofrequência em SAP EWM, certificado de empilhador desde 2019 e formação em acondicionamento de cargas.',
      mistakes: [
        {
          label: 'Referir as credenciais só no anexo',
          detail: 'São o primeiro critério de seleção e devem aparecer na primeira página.',
        },
        {
          label: 'Deixar a disponibilidade de turnos por concretizar',
          detail: 'Quando o dado falta, presume-se indisponibilidade e a candidatura elimina-se sozinha.',
        },
        {
          label: 'Resumir tudo como «trabalho em armazém»',
          detail: 'Receção e expedição são funções distintas com indicadores distintos: diferencie-as.',
        },
      ],
      faq: [
        {
          question: 'Posso candidatar-me sem certificado de empilhador?',
          answer:
            'Sim, e muitas empresas financiam-no — indique expressamente que está disponível para o tirar. Em funções onde conduzir é o núcleo do trabalho, é na prática um requisito.',
        },
        {
          question: 'Que nível de português é esperado?',
          answer:
            'O suficiente para seguir as instruções de segurança e trabalhar com o sistema, normalmente um nível intermédio. Indique o seu nível com naturalidade: muitas plataformas são multilingues e valorizam antes a fiabilidade do que a fluência.',
        },
        {
          question: 'O trabalho temporário prejudica a candidatura?',
          answer:
            'Não, em logística é a via habitual para o contrato efetivo. Enumere as plataformas onde esteve colocado: comprovam exatamente os sistemas e tipos de armazém que são procurados.',
        },
      ],
    },
    interview: {
      slug: 'operador-logistico',
      metaTitle: 'Entrevista em logística: perguntas frequentes e respostas',
      metaDescription:
        'Entrevista em armazém: turnos, precisão, segurança e sistemas — o que é avaliado e o que perguntar.',
      heading: 'Entrevista de emprego em logística',
      intro:
        'A entrevista costuma ser curta e prática, com o chefe de turno ou o responsável de armazém. Inclui muitas vezes uma visita à instalação — e essa visita faz parte da avaliação, porque se observa aquilo em que repara e o que pergunta.',
      questions: [
        {
          question: 'Que turnos consegue cobrir?',
          why: 'Na prática a pergunta mais importante; muitas vezes decide sozinha.',
          tip: 'Responda com clareza e honestidade. Colocar um limite agora é melhor do que sair ao fim de duas semanas.',
        },
        {
          question: 'Como garante que prepara sem erros?',
          why: 'A taxa de erro é o indicador de qualidade central de qualquer plataforma.',
          tip: 'Refira uma rotina concreta: ler o código em vez de conferir à vista, controlo no posto de embalagem, perguntar na dúvida.',
        },
        {
          question: 'O que faz se o stock não corresponder ao sistema?',
          why: 'Avalia-se se comunica ou se corrige em silêncio.',
          tip: 'Recontar, comunicar, registar a regularização no sistema — nunca acertar sem movimento.',
        },
        {
          question: 'Que sistemas e equipamentos conhece?',
          why: 'Determina o tempo de adaptação.',
          tip: 'Refira sistema, equipamento e tarefa — por exemplo preparação com radiofrequência em SAP EWM.',
        },
        {
          question: 'Como gere a pressão antes do fecho das expedições?',
          why: 'O ponto de tensão diário do armazém.',
          tip: 'Priorizar, avisar cedo se vai ficar apertado e não cortar na segurança.',
        },
        {
          question: 'A que presta atenção em matéria de segurança?',
          why: 'Os acidentes são a maior rubrica de custo do setor.',
          tip: 'Refira coisas concretas: corredores pedonais, acondicionamento de cargas, visibilidade nas manobras, equipamento de proteção.',
        },
      ],
      redFlags: [
        'Aceitar turnos que depois não conseguirá sustentar.',
        'Apresentar uma divergência de stock como algo menor.',
        'Mostrar-se indiferente durante a visita ao armazém.',
      ],
      askThem: [
        'Qual é o regime de turnos e como são calculados os subsídios?',
        'Que indicadores são medidos por pessoa?',
        'Como é a formação inicial e quem a acompanha?',
      ],
      faq: [
        {
          question: 'O certificado de empilhador é verificado na entrevista?',
          answer:
            'O certificado é conferido e algumas plataformas acrescentam uma prova curta de condução. Leve-o sempre: sem comprovativo não pode conduzir, por muita experiência que tenha.',
        },
        {
          question: 'Como explico missões curtas e seguidas de trabalho temporário?',
          answer:
            'Com naturalidade: as missões são definidas pela empresa de trabalho temporário, não por si. Refira as plataformas e o que fazia em cada uma — lê-se como amplitude de experiência, não como instabilidade.',
        },
      ],
    },
  },
};
