// profile-data.jsx — single source of truth for the demo profile shown
// across all three variants. Plain JS object exported on window so each
// variant <script> can read it without re-defining.

window.PROFILE = {
  name: "John Demo",
  role: "Senior Full-Stack Developer",
  status: "Bewerber · offen für neue Rollen",
  location: "Duisburg, Deutschland",
  address: "Musterstraße 123, 47057 Duisburg",
  email: "demo@smartapply.com",
  phone: "+49 201 555 0123",
  linkedin: "linkedin.com/in/johndemo",
  website: "johndemo.dev",
  about:
    "Full-Stack Entwickler mit über 5 Jahren Erfahrung im Aufbau skalierbarer Web-Applikationen. Fokus auf saubere Architektur, Cloud-Native Deployments und produktorientierte Zusammenarbeit mit Design- und Produktteams.",
  strength: 100,
  experience: [
    {
      role: "Senior Full-Stack Developer",
      company: "Tech Innovations Inc.",
      period: "März 2021 – heute",
      duration: "5 J. 2 Mon.",
      description:
        "Lead Developer einer Enterprise-SaaS-Plattform mit über 10.000 aktiven Nutzer:innen. Verantwortlich für die Architektur, das Frontend-Team und die Migration auf eine event-driven Backend-Struktur.",
      stack: ["TypeScript", "React", "NestJS", "PostgreSQL", "Azure"],
    },
    {
      role: "Full-Stack Developer",
      company: "StartupXYZ",
      period: "Jan. 2019 – Feb. 2021",
      duration: "2 J. 2 Mon.",
      description:
        "MVP und Kernfunktionen einer B2B-Analytics-Plattform aufgebaut. Direkte Zusammenarbeit mit Founder und Designteam, von Discovery bis Production-Rollout.",
      stack: ["Node.js", "React", "PostgreSQL", "Docker"],
    },
  ],
  education: [
    {
      school: "Stanford University",
      degree: "M.Sc. Software Engineering",
      period: "2018 – 2020",
      detail: "Thesis: Scalable Microservices Architecture for Cloud-Native Applications.",
    },
    {
      school: "University of California, Berkeley",
      degree: "B.Sc. Computer Science",
      period: "2014 – 2018",
      detail: "Schwerpunkt Software Engineering & Distributed Systems. Dean's List 2016–2018.",
    },
  ],
  skills: [
    { label: "TypeScript", level: 5 },
    { label: "JavaScript", level: 5 },
    { label: "React",      level: 5 },
    { label: "Node.js",    level: 4 },
    { label: "NestJS",     level: 4 },
    { label: "PostgreSQL", level: 4 },
    { label: "Docker",     level: 3 },
    { label: "Azure",      level: 3 },
  ],
  languages: [
    { label: "Deutsch",  level: "Muttersprache" },
    { label: "Englisch", level: "Fließend (C1)" },
  ],
  projects: [
    {
      title: "E-commerce Platform",
      summary: "Online-Store mit Payment-Integration und Inventory-Management. Gebaut für einen Mittelständler in der DACH-Region.",
    },
    {
      title: "Smart Apply",
      summary: "AI-gestützter Bewerbungs-Assistent, der Lebensläufe und Anschreiben pro Stellenanzeige passgenau generiert.",
    },
  ],
  certificates: [
    { title: "Azure Developer Associate", issuer: "Microsoft", date: "Jan. 2023" },
    { title: "AWS Certified Developer",   issuer: "Amazon Web Services", date: "Juni 2022" },
  ],
};
