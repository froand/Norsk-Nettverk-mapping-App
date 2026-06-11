/**
 * Norsk Nettverk v2 — Norwegian strings.
 * Mirror this to `en.ts` later if English support is added.
 */
export const strings = {
  brand: "NORSK NETTVERK",
  search: {
    placeholder: "Søk politikere eller selskaper...",
  },
  tabs: {
    dashboard: "Dashboard",
    network: "Nettverk",
    directory: "Katalog",
    alerts: "Varsler",
  },
  dashboard: {
    intelligenceHeading: "Global intelligence",
    investigations: "Undersøkelser",
    revolvingDoor: "Roterende dør",
    revolvingDoorFeed: "Roterende dør — siste hendelser",
    highConflict: "Høyeste konfliktnivå",
    sectorWatchlist: "Sektor-overvåking",
    newCases: "Nye saker",
    analyze: "Analyser",
    deltaVsLastMonth: "vs. forrige måned",
    badgeRevolvingDoor: "ROTERENDE DØR",
    badgePotentialConflict: "POTENSIELL KONFLIKT",
  },
  network: {
    title: "Nettverkskart",
    legend: "Tegnforklaring",
    liveFeed: "LIVE-UNDERSØKELSE",
    filter: {
      all: "Alle",
      energy: "Energi",
      parliament: "Storting",
      lobby: "Lobby",
    },
  },
  directory: {
    title: "Katalog",
    subtitle:
      "Overvåk forbindelser mellom folkevalgte og næringsliv. Spor karrieretrekk og potensielle interessekonflikter.",
    sortByName: "Navn: A–Z",
    sortByConflict: "Konfliktnivå",
    sortByRecent: "Nylig aktivitet",
    loadMore: "Last flere profiler",
    badgeRevolvingRisk: "ROTERENDE DØR-RISIKO",
    badgeClean: "REN PROFIL",
    badgeDisclosure: "TRENGER REGISTRERING",
  },
  alerts: {
    title: "Varsler",
    subtitle: "Live-feed av nyere overganger og karantenesaker.",
    watchlistEmpty: "Du følger ikke noen profiler ennå.",
    addToWatchlist: "Legg til overvåking",
  },
  profile: {
    conflictScore: "Konfliktnivå",
    connections: "Forbindelser",
    tenure: "Tjenestetid",
    boards: "Styreverv",
    pastRoles: "Tidligere roller",
    careerTrajectory: "Karriereforløp",
    knownConnections: "Kjente forbindelser",
    karantene: "Karantenenemnda",
  },
  common: {
    backToOverview: "Tilbake til oversikt",
    loading: "Laster…",
    error: "Noe gikk galt",
    retry: "Prøv igjen",
  },
};

export type Strings = typeof strings;
