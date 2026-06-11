import type { GraphData, GraphNode, GraphLink } from '../types.js';

// Sample data representing Norwegian political/government figures and connections
// Sources: stortinget.no, regjeringen.no, proff.no (all public information)
// Focus: Mapping potential conflicts of interest and revolving door patterns

export interface PositionTimeline {
  personId: string;
  personName: string;
  positions: {
    orgId: string;
    orgName: string;
    role: string;
    category: 'board' | 'political' | 'government' | 'executive';
    sector?: string;
    startYear: number;
    endYear?: number; // undefined = current
  }[];
}

export interface ConflictOfInterest {
  personId: string;
  personName: string;
  politicalRole: string;
  politicalOrg: string;
  boardRole: string;
  boardOrg: string;
  sector: string;
  conflictType: 'revolving_door' | 'concurrent' | 'sector_overlap' | 'shared_network';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  classification?: 'A' | 'B' | 'C' | 'D';
  sources?: { label: string; url: string }[];
}

// Sector tags for organizations to detect regulatory conflicts
const ORG_SECTORS: Record<string, string[]> = {
  'org-equinor': ['energi', 'olje', 'klima'],
  'org-dnb': ['finans', 'bank'],
  'org-telenor': ['telekom', 'teknologi', 'digitalisering'],
  'org-norsk-hydro': ['energi', 'industri', 'aluminium'],
  'org-nho': ['næringsliv', 'arbeidsliv'],
  'org-mckinsey': ['konsulent', 'rådgivning', 'strategi'],
  'org-finansdepartementet': ['finans', 'skatt', 'økonomi'],
  'org-naringsdepartementet': ['næringsliv', 'industri', 'energi'],
  'org-utenriksdepartementet': ['utenriks', 'handel', 'bistand'],
  'org-helse-vest-rhf': ['helse', 'spesialisthelsetjeneste'],
  'org-finans-norge': ['finans', 'bank', 'forsikring'],
  'org-nho-logistikk-transport': ['transport', 'logistikk', 'næringsliv'],
  'org-nho-service-handel': ['handel', 'tjenester', 'næringsliv'],
  'org-norges-rederiforbund': ['shipping', 'maritim', 'næringsliv'],
  'org-okea': ['energi', 'olje', 'gass'],
  'org-forleggerforeningen': ['media', 'forlag', 'kultur'],
  'org-legemiddelindustrien': ['helse', 'legemiddel', 'industri'],
  'org-sjomat-norge': ['sjømat', 'eksport', 'næringsliv'],
  'org-utoya': ['utdanning', 'kultur', 'demokrati'],
  'org-wergelandsenteret': ['utdanning', 'kultur', 'menneskerettigheter'],
  'org-offshore-norge': ['olje', 'energi', 'næringsliv'],
  'org-solvtrans': ['sjømat', 'havbruk', 'maritim'],
  'org-raeder': ['jus', 'rådgivning'],
  'org-nbim': ['finans', 'kapitalforvaltning', 'oljefondet'],
};

// Timeline data showing when positions were held
const timelines: PositionTimeline[] = [
  {
    personId: 'person-monica-maeland',
    personName: 'Monica Mæland',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2005, endYear: 2013 },
      { orgId: 'org-naringsdepartementet', orgName: 'Nærings- og fiskeridepartementet', role: 'Næringsminister', category: 'government', sector: 'næringsliv', startYear: 2013, endYear: 2018 },
      { orgId: 'org-dnb', orgName: 'DNB ASA (Org.nr. 984 851 006)', role: 'Styremedlem', category: 'board', sector: 'finans', startYear: 2022 },
      { orgId: 'org-nho', orgName: 'NHO (Org.nr. 955 600 436)', role: 'Direktør for arbeidsliv', category: 'executive', sector: 'næringsliv', startYear: 2024 },
    ],
  },
  {
    personId: 'person-torbjorn-roe-isaksen',
    personName: 'Torbjørn Røe Isaksen',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2009, endYear: 2021 },
      { orgId: 'org-naringsdepartementet', orgName: 'Nærings- og fiskeridepartementet', role: 'Næringsminister', category: 'government', sector: 'næringsliv', startYear: 2018, endYear: 2020 },
      { orgId: 'org-nho-logistikk-transport', orgName: 'NHO Logistikk og Transport (Org.nr. 970 187 384)', role: 'Adm. direktør', category: 'executive', sector: 'næringsliv', startYear: 2022 },
    ],
  },
  {
    personId: 'person-nikolai-astrup',
    personName: 'Nikolai Astrup',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2009, endYear: 2021 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Klimaminister', category: 'government', sector: 'klima', startYear: 2018, endYear: 2019 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Digitaliseringsminister', category: 'government', sector: 'teknologi', startYear: 2019, endYear: 2020 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Kommunal- og distriktsminister', category: 'government', startYear: 2020, endYear: 2021 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Stortingsrepresentant', category: 'political', startYear: 2021 },
      { orgId: 'org-mckinsey', orgName: 'McKinsey & Company', role: 'Partner', category: 'executive', sector: 'konsulent', startYear: 2022 },
    ],
  },
  {
    personId: 'person-jan-tore-sanner',
    personName: 'Jan Tore Sanner',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2001, endYear: 2021 },
      { orgId: 'org-finansdepartementet', orgName: 'Finansdepartementet', role: 'Finansminister', category: 'government', sector: 'finans', startYear: 2020, endYear: 2021 },
      { orgId: 'org-norsk-hydro', orgName: 'Norsk Hydro ASA', role: 'Styremedlem', category: 'board', sector: 'energi', startYear: 2022 },
    ],
  },
  {
    personId: 'person-jonas-gahr-store',
    personName: 'Jonas Gahr Støre',
    positions: [
      { orgId: 'org-utenriksdepartementet', orgName: 'Utenriksdepartementet', role: 'Utenriksminister', category: 'government', startYear: 2005, endYear: 2012 },
      { orgId: 'org-arbeiderpartiet', orgName: 'Arbeiderpartiet', role: 'Partileder', category: 'political', startYear: 2014 },
      { orgId: 'org-statsministerens-kontor', orgName: 'Statsministerens kontor', role: 'Statsminister', category: 'government', startYear: 2021 },
    ],
  },
  {
    personId: 'person-erna-solberg',
    personName: 'Erna Solberg',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Partileder', category: 'political', startYear: 2004 },
      { orgId: 'org-statsministerens-kontor', orgName: 'Statsministerens kontor', role: 'Statsminister', category: 'government', startYear: 2013, endYear: 2021 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Stortingsrepresentant', category: 'political', startYear: 2021 },
    ],
  },
  {
    personId: 'person-anniken-huitfeldt',
    personName: 'Anniken Huitfeldt',
    positions: [
      { orgId: 'org-arbeiderpartiet', orgName: 'Arbeiderpartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 1997, endYear: 2023 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Leder utenriks- og forsvarskomiteen', category: 'political', startYear: 2017, endYear: 2021 },
      { orgId: 'org-utenriksdepartementet', orgName: 'Utenriksdepartementet', role: 'Utenriksminister', category: 'government', startYear: 2021, endYear: 2023 },
    ],
  },
  {
    personId: 'person-trygve-slagsvold-vedum',
    personName: 'Trygve Slagsvold Vedum',
    positions: [
      { orgId: 'org-senterpartiet', orgName: 'Senterpartiet', role: 'Partileder', category: 'political', startYear: 2014 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Stortingsrepresentant', category: 'political', startYear: 2005, endYear: 2021 },
      { orgId: 'org-finansdepartementet', orgName: 'Finansdepartementet', role: 'Finansminister', category: 'government', sector: 'finans', startYear: 2021 },
    ],
  },

  {
    personId: 'person-bent-hoie',
    personName: 'Bent Høie',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2001, endYear: 2021 },
      { orgId: 'org-helse-vest-rhf', orgName: 'Helse Vest RHF (Org.nr. 983 658 725)', role: 'Administrerende direktør', category: 'executive', sector: 'helse', startYear: 2023 },
    ],
  },
  {
    personId: 'person-per-sandberg',
    personName: 'Per Sandberg',
    positions: [
      { orgId: 'org-fremskrittspartiet', orgName: 'Fremskrittspartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 1997, endYear: 2017 },
      { orgId: 'org-sjomat-norge', orgName: 'Sjømat Norge (Org.nr. 984 736 278)', role: 'Næringsrådgiver', category: 'executive', sector: 'sjømat', startYear: 2021 },
    ],
  },
  {
    personId: 'person-linda-hofstad-helleland',
    personName: 'Linda Hofstad Helleland',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2001, endYear: 2021 },
      { orgId: 'org-first-house', orgName: 'First House AS (Org.nr. 993 810 660)', role: 'Seniorrådgiver', category: 'executive', sector: 'konsulent', startYear: 2022 },
    ],
  },
  {
    personId: 'person-ine-eriksen-soreide',
    personName: 'Ine Eriksen Søreide',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Stortingsrepresentant', category: 'political', startYear: 2001 },
      { orgId: 'org-utenriksdepartementet', orgName: 'Utenriksdepartementet', role: 'Utenriksminister', category: 'government', sector: 'utenriks', startYear: 2017, endYear: 2021 },
      { orgId: 'org-first-house', orgName: 'First House AS (Org.nr. 993 810 660)', role: 'Seniorrådgiver (permisjon)', category: 'executive', sector: 'konsulent', startYear: 2022, endYear: 2023 },
    ],
  },
  {
    personId: 'person-iselin-nybo',
    personName: 'Iselin Nybø',
    positions: [
      { orgId: 'org-venstre', orgName: 'Venstre', role: 'Stortingsrepresentant', category: 'political', startYear: 2013, endYear: 2021 },
      { orgId: 'org-naringsdepartementet', orgName: 'Nærings- og fiskeridepartementet', role: 'Næringsminister', category: 'government', sector: 'næringsliv', startYear: 2020, endYear: 2021 },
      { orgId: 'org-finans-norge', orgName: 'Finans Norge (Org.nr. 981 423 682)', role: 'Direktør for bank og kapitalmarked', category: 'executive', sector: 'finans', startYear: 2022 },
    ],
  },
  {
    personId: 'person-trine-skei-grande',
    personName: 'Trine Skei Grande',
    positions: [
      { orgId: 'org-venstre', orgName: 'Venstre', role: 'Partileder', category: 'political', startYear: 2010, endYear: 2020 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Stortingsrepresentant', category: 'political', startYear: 2001, endYear: 2021 },
      { orgId: 'org-forleggerforeningen', orgName: 'Den norske Forleggerforening (Org.nr. 970 169 330)', role: 'Administrerende direktør', category: 'executive', sector: 'media', startYear: 2020 },
    ],
  },
  {
    personId: 'person-anniken-hauglie',
    personName: 'Anniken Hauglie',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Statsråd', category: 'political', startYear: 2015, endYear: 2020 },
      { orgId: 'org-nho-service-handel', orgName: 'NHO Service og Handel (Org.nr. 977 041 707)', role: 'Administrerende direktør', category: 'executive', sector: 'næringsliv', startYear: 2021 },
    ],
  },
  {
    personId: 'person-bjarne-haakon-hanssen',
    personName: 'Bjarne Håkon Hanssen',
    positions: [
      { orgId: 'org-arbeiderpartiet', orgName: 'Arbeiderpartiet', role: 'Statsråd', category: 'political', startYear: 2000, endYear: 2009 },
      { orgId: 'org-first-house', orgName: 'First House AS (Org.nr. 993 810 660)', role: 'Partner', category: 'executive', sector: 'konsulent', startYear: 2010 },
    ],
  },
  {
    personId: 'person-karita-bekkemellem',
    personName: 'Karita Bekkemellem',
    positions: [
      { orgId: 'org-arbeiderpartiet', orgName: 'Arbeiderpartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 1989, endYear: 2009 },
      { orgId: 'org-legemiddelindustrien', orgName: 'Legemiddelindustrien (LMI) (Org.nr. 983 956 527)', role: 'Administrerende direktør', category: 'executive', sector: 'helse', startYear: 2013 },
    ],
  },
  {
    personId: 'person-knut-arild-hareide',
    personName: 'Knut Arild Hareide',
    positions: [
      { orgId: 'org-kristelig-folkeparti', orgName: 'Kristelig Folkeparti', role: 'Partileder', category: 'political', startYear: 2011, endYear: 2019 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Stortingsrepresentant', category: 'political', startYear: 2009, endYear: 2021 },
      { orgId: 'org-norges-rederiforbund', orgName: 'Norges Rederiforbund (Org.nr. 971 436 190)', role: 'Administrerende direktør', category: 'executive', sector: 'maritim', startYear: 2022 },
    ],
  },
  {
    personId: 'person-dagrun-eriksen',
    personName: 'Dagrun Eriksen',
    positions: [
      { orgId: 'org-kristelig-folkeparti', orgName: 'Kristelig Folkeparti', role: 'Stortingsrepresentant', category: 'political', startYear: 2005, endYear: 2017 },
      { orgId: 'org-nho-service-handel', orgName: 'NHO Service og Handel (Org.nr. 977 041 707)', role: 'Næringspolitisk direktør', category: 'executive', sector: 'næringsliv', startYear: 2020 },
    ],
  },
  {
    personId: 'person-ola-borten-moe',
    personName: 'Ola Borten Moe',
    positions: [
      { orgId: 'org-senterpartiet', orgName: 'Senterpartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 2001 },
      { orgId: 'org-naringsdepartementet', orgName: 'Nærings- og handelsdepartementet', role: 'Olje- og energiminister', category: 'government', sector: 'energi', startYear: 2011, endYear: 2013 },
      { orgId: 'org-okea', orgName: 'OKEA ASA (Org.nr. 915 419 062)', role: 'Styreleder', category: 'board', sector: 'energi', startYear: 2024 },
    ],
  },
  {
    personId: 'person-tord-lien',
    personName: 'Tord Lien',
    positions: [
      { orgId: 'org-fremskrittspartiet', orgName: 'Fremskrittspartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 2005, endYear: 2013 },
      { orgId: 'org-naringsdepartementet', orgName: 'Olje- og energidepartementet', role: 'Olje- og energiminister', category: 'government', sector: 'energi', startYear: 2013, endYear: 2016 },
      { orgId: 'org-okea', orgName: 'OKEA ASA (Org.nr. 915 419 062)', role: 'Direktør samfunnskontakt', category: 'executive', sector: 'energi', startYear: 2018 },
    ],
  },
  {
    personId: 'person-tor-mikkel-wara',
    personName: 'Tor Mikkel Wara',
    positions: [
      { orgId: 'org-fremskrittspartiet', orgName: 'Fremskrittspartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 1989, endYear: 1997 },
      { orgId: 'org-justisdepartementet', orgName: 'Justis- og beredskapsdepartementet', role: 'Justisminister', category: 'government', sector: 'justis', startYear: 2018, endYear: 2019 },
      { orgId: 'org-first-house', orgName: 'First House AS (Org.nr. 993 810 660)', role: 'Seniorrådgiver', category: 'executive', sector: 'konsulent', startYear: 2020 },
    ],
  },
  {
    personId: 'person-robert-eriksson',
    personName: 'Robert Eriksson',
    positions: [
      { orgId: 'org-fremskrittspartiet', orgName: 'Fremskrittspartiet', role: 'Stortingsrepresentant', category: 'political', startYear: 2009, endYear: 2017 },
      { orgId: 'org-naringsdepartementet', orgName: 'Arbeids- og sosialdepartementet', role: 'Arbeidsminister', category: 'government', sector: 'arbeidsliv', startYear: 2013, endYear: 2015 },
      { orgId: 'org-nho-service-handel', orgName: 'NHO Service og Handel (Org.nr. 977 041 707)', role: 'Administrerende direktør', category: 'executive', sector: 'næringsliv', startYear: 2018 },
    ],
  },
  {
    personId: 'person-kjell-borge-freiberg',
    personName: 'Kjell-Børge Freiberg',
    positions: [
      { orgId: 'org-fremskrittspartiet', orgName: 'Fremskrittspartiet', role: 'Olje- og energiminister', category: 'political', startYear: 2018, endYear: 2019 },
      { orgId: 'org-okea', orgName: 'OKEA ASA (Org.nr. 915 419 062)', role: 'Direktør myndighetskontakt', category: 'executive', sector: 'energi', startYear: 2022 },
    ],
  },
  {
    personId: 'person-terje-soviknes',
    personName: 'Terje Søviknes',
    positions: [
      { orgId: 'org-fremskrittspartiet', orgName: 'Fremskrittspartiet', role: 'Olje- og energiminister', category: 'political', startYear: 2016, endYear: 2018 },
      { orgId: 'org-okea', orgName: 'OKEA ASA (Org.nr. 915 419 062)', role: 'Styremedlem', category: 'board', sector: 'energi', startYear: 2021 },
    ],
  },
  {
    personId: 'person-kristin-clemet',
    personName: 'Kristin Clemet',
    positions: [
      { orgId: 'org-hoyre', orgName: 'Høyre', role: 'Utdanningsminister', category: 'political', startYear: 2001, endYear: 2005 },
      { orgId: 'org-nho', orgName: 'NHO (Org.nr. 955 600 436)', role: 'Direktør', category: 'executive', sector: 'næringsliv', startYear: 2006, endYear: 2013 },
      { orgId: 'org-first-house', orgName: 'First House AS (Org.nr. 993 810 660)', role: 'Styremedlem', category: 'board', sector: 'konsulent', startYear: 2016 },
    ],
  },
  {
    personId: 'person-kristin-halvorsen',
    personName: 'Kristin Halvorsen',
    positions: [
      { orgId: 'org-sosialistisk-venstreparti', orgName: 'Sosialistisk Venstreparti', role: 'Partileder', category: 'political', startYear: 1997, endYear: 2012 },
      { orgId: 'org-finansdepartementet', orgName: 'Finansdepartementet', role: 'Finansminister', category: 'government', sector: 'finans', startYear: 2005, endYear: 2009 },
      { orgId: 'org-finans-norge', orgName: 'Finans Norge (Org.nr. 981 423 682)', role: 'Styremedlem i bransjeråd', category: 'board', sector: 'finans', startYear: 2023 },
    ],
  },
  {
    personId: 'person-heikki-holmas',
    personName: 'Heikki Holmås',
    positions: [
      { orgId: 'org-sosialistisk-venstreparti', orgName: 'Sosialistisk Venstreparti', role: 'Stortingsrepresentant', category: 'political', startYear: 2001, endYear: 2013 },
      { orgId: 'org-utenriksdepartementet', orgName: 'Utenriksdepartementet', role: 'Utviklingsminister', category: 'government', sector: 'bistand', startYear: 2012, endYear: 2013 },
      { orgId: 'org-first-house', orgName: 'First House AS (Org.nr. 993 810 660)', role: 'Seniorrådgiver', category: 'executive', sector: 'konsulent', startYear: 2021 },
    ],
  },
  {
    personId: 'person-ola-elvestuen',
    personName: 'Ola Elvestuen',
    positions: [
      { orgId: 'org-venstre', orgName: 'Venstre', role: 'Stortingsrepresentant', category: 'political', startYear: 2013 },
      { orgId: 'org-klimadepartementet', orgName: 'Klima- og miljødepartementet', role: 'Klima- og miljøminister', category: 'government', sector: 'klima', startYear: 2018, endYear: 2020 },
      { orgId: 'org-finans-norge', orgName: 'Finans Norge (Org.nr. 981 423 682)', role: 'Styremedlem i bærekraftsforum', category: 'board', sector: 'finans', startYear: 2023 },
    ],
  },
  {
    personId: 'person-jan-christian-vestre',
    personName: 'Jan Christian Vestre',
    positions: [
      { orgId: 'org-vestre', orgName: 'Vestre AS (Org.nr. 923 470 565)', role: 'Daglig leder og 70% eier', category: 'executive', sector: 'møbler', startYear: 2014, endYear: 2021 },
      { orgId: 'org-arbeiderpartiet', orgName: 'Arbeiderpartiet', role: 'Sentralstyremedlem AUF', category: 'political', startYear: 2010, endYear: 2012 },
      { orgId: 'org-naeringsdep', orgName: 'Nærings- og fiskeridepartementet', role: 'Politisk rådgiver', category: 'government', sector: 'næring', startYear: 2013, endYear: 2013 },
      { orgId: 'org-naeringsdep', orgName: 'Nærings- og fiskeridepartementet', role: 'Næringsminister', category: 'government', sector: 'næring', startYear: 2021, endYear: 2024 },
      { orgId: 'org-helsedep', orgName: 'Helse- og omsorgsdepartementet', role: 'Helseminister', category: 'government', sector: 'helse', startYear: 2024 },
      { orgId: 'org-stortinget', orgName: 'Stortinget', role: 'Stortingsrepresentant', category: 'political', startYear: 2025 },
      { orgId: 'org-arbeiderpartiet', orgName: 'Arbeiderpartiet', role: 'Nestleder', category: 'political', startYear: 2023 },
    ],
  },
];

// Detected conflicts of interest (based on public analysis)
const conflicts: ConflictOfInterest[] = [
  {
    personId: 'person-torbjorn-roe-isaksen',
    personName: 'Torbjørn Røe Isaksen',
    politicalRole: 'Næringsminister (2018-2020)',
    politicalOrg: 'Nærings- og fiskeridepartementet',
    boardRole: 'Adm. direktør (2022-)',
    boardOrg: 'NHO Logistikk og Transport',
    sector: 'næringsliv',
    conflictType: 'revolving_door',
    description: 'Gikk fra å regulere næringslivet som minister til å lede en NHO-forening. Kort karantenetid mellom rollene.',
    severity: 'high',
  },
  {
    personId: 'person-monica-maeland',
    personName: 'Monica Mæland',
    politicalRole: 'Næringsminister (2013-2018)',
    politicalOrg: 'Nærings- og fiskeridepartementet',
    boardRole: 'Styremedlem (2022-)',
    boardOrg: 'DNB ASA',
    sector: 'finans',
    conflictType: 'revolving_door',
    description: 'Tidligere næringsminister med ansvar for statlig eierskap, nå i styret til statsdominert bank.',
    severity: 'medium',
  },
  {
    personId: 'person-nikolai-astrup',
    personName: 'Nikolai Astrup',
    politicalRole: 'Stortingsrepresentant, Tidl. minister (2018-2021)',
    politicalOrg: 'Stortinget / Regjeringen',
    boardRole: 'Partner (2022-)',
    boardOrg: 'McKinsey & Company',
    sector: 'konsulent',
    conflictType: 'concurrent',
    description: 'Sitter samtidig som stortingsrepresentant og partner i McKinsey — et konsulentselskap som rådgir stat og næringsliv. Dobbeltrolle med direkte tilgang til politisk makt og kommersielle interesser.',
    severity: 'high',
  },
  {
    personId: 'person-jan-tore-sanner',
    personName: 'Jan Tore Sanner',
    politicalRole: 'Finansminister (2020-2021)',
    politicalOrg: 'Finansdepartementet',
    boardRole: 'Styremedlem (2022-)',
    boardOrg: 'Norsk Hydro ASA',
    sector: 'energi',
    conflictType: 'revolving_door',
    description: 'Tidligere finansminister med budsjettansvar, raskt over i industristyret etter regjeringsskiftet.',
    severity: 'medium',
  },
  {
    personId: 'person-erna-solberg',
    personName: 'Erna Solberg',
    politicalRole: 'Statsminister (2013-2021)',
    politicalOrg: 'Statsministerens kontor',
    boardRole: 'Ektemannen Sindre Finnes handlet aksjer',
    boardOrg: 'Private aksjeinvesteringer',
    sector: 'finans',
    conflictType: 'concurrent',
    description: 'Ektemannen handlet omfattende i enkeltaksjer mens hun var statsminister. Kontrollkomiteen ga enstemmig sterk kritikk — hun kunne ha vært inhabil i flere saker.',
    severity: 'critical',
    classification: 'A',
    sources: [
      { label: 'Stortingets kontrollkomité Innst. 215 S (2023-2024)', url: 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2023-2024/inns-202324-215s/' },
    ],
  },
  {
    personId: 'person-anniken-huitfeldt',
    personName: 'Anniken Huitfeldt',
    politicalRole: 'Utenriksminister (2021-2023)',
    politicalOrg: 'Utenriksdepartementet',
    boardRole: 'Ektemannen Ola Flem handlet aksjer',
    boardOrg: 'Private aksjeinvesteringer',
    sector: 'finans',
    conflictType: 'concurrent',
    description: 'Deltok i saker uten å vite at ektefellens investeringer kunne gjøre henne inhabil. Kontrollkomiteen ga kritikk for brudd på habilitetsregelverket.',
    severity: 'high',
    classification: 'A',
    sources: [
      { label: 'Stortingets kontrollkomité Innst. 215 S (2023-2024)', url: 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2023-2024/inns-202324-215s/' },
    ],
  },
  {
    personId: 'person-bent-hoie',
    personName: 'Bent Høie',
    politicalRole: 'Helseminister (2013-2021)',
    politicalOrg: 'Helse- og omsorgsdepartementet',
    boardRole: 'Adm. direktør (2023-)',
    boardOrg: 'Helse Vest RHF',
    sector: 'helse',
    conflictType: 'revolving_door',
    description: 'Tidligere helseminister leder nå regionalt helseforetak i samme sektor.',
    severity: 'medium',
  },
  {
    personId: 'person-per-sandberg',
    personName: 'Per Sandberg',
    politicalRole: 'Fiskeriminister (2015-2018)',
    politicalOrg: 'Nærings- og fiskeridepartementet',
    boardRole: 'Konsulentvirksomhet innen sjømat',
    boardOrg: 'Egen virksomhet',
    sector: 'sjømat',
    conflictType: 'revolving_door',
    description: 'Karantenenemnda konkluderte i 2019 med at han hadde brutt karantenereglene etter avgang som fiskeriminister. Ga formell kritikk. Også habilitets- og sikkerhetsspørsmål knyttet til kjærestens forretningsinteresser innen sjømateksport.',
    severity: 'critical',
    classification: 'A',
    sources: [
      { label: 'Karantenenemnda årsmelding 2019', url: 'https://www.regjeringen.no/contentassets/9a71127c493e45e5a87c09f25ad2e18d/karantenenemnda_arsmelding2019.pdf' },
      { label: 'VG', url: 'https://www.vg.no/nyheter/i/WLK0z2/fiskeriministeren-paa-privat-iran-reise-med-eier-av-sjoemat-selskap' },
    ],
  },
  {
    personId: 'person-linda-hofstad-helleland',
    personName: 'Linda Hofstad Helleland',
    politicalRole: 'Statsråd (2015-2021)',
    politicalOrg: 'Regjeringen',
    boardRole: 'Seniorrådgiver (2022-)',
    boardOrg: 'First House AS',
    sector: 'konsulent',
    conflictType: 'revolving_door',
    description: 'Tidligere statsråd gikk over til rådgivning mot næringsliv og offentlig sektor.',
    severity: 'medium',
  },
  {
    personId: 'person-ine-eriksen-soreide',
    personName: 'Ine Eriksen Søreide',
    politicalRole: 'Stortingsrepresentant (2001-)',
    politicalOrg: 'Stortinget',
    boardRole: 'Seniorrådgiver (2022-2023)',
    boardOrg: 'First House AS',
    sector: 'konsulent',
    conflictType: 'concurrent',
    description: 'Kombinerte midlertidig politisk verv med rådgiverrolle i privat selskap.',
    severity: 'high',
  },
  {
    personId: 'person-iselin-nybo',
    personName: 'Iselin Nybø',
    politicalRole: 'Næringsminister (2020-2021)',
    politicalOrg: 'Nærings- og fiskeridepartementet',
    boardRole: 'Direktør (2022-)',
    boardOrg: 'Finans Norge',
    sector: 'finans',
    conflictType: 'revolving_door',
    description: 'Tidligere næringsminister gikk raskt over til finansnæringens interesseorganisasjon.',
    severity: 'medium',
  },
  {
    personId: 'person-knut-arild-hareide',
    personName: 'Knut Arild Hareide',
    politicalRole: 'Stortingsrepresentant (2009-2021)',
    politicalOrg: 'Stortinget',
    boardRole: 'Adm. direktør (2022-)',
    boardOrg: 'Norges Rederiforbund',
    sector: 'maritim',
    conflictType: 'revolving_door',
    description: 'Gikk fra nasjonal politikk til å lede en sentral bransjeorganisasjon.',
    severity: 'medium',
  },
  {
    personId: 'person-tord-lien',
    personName: 'Tord Lien',
    politicalRole: 'Olje- og energiminister (2013-2016)',
    politicalOrg: 'Olje- og energidepartementet',
    boardRole: 'Direktør samfunnskontakt (2018-)',
    boardOrg: 'OKEA ASA',
    sector: 'energi',
    conflictType: 'revolving_door',
    description: 'Tidligere energiminister gikk til ledende rolle i oljeselskap.',
    severity: 'high',
  },
  {
    personId: 'person-ola-borten-moe',
    personName: 'Ola Borten Moe',
    politicalRole: 'Forsknings- og høyere utdanningsminister (2021-2023)',
    politicalOrg: 'Kunnskapsdepartementet',
    boardRole: 'Aksjeeier og OKEA-grunnlegger',
    boardOrg: 'OKEA ASA / Kongsberg Gruppen',
    sector: 'olje/forsvar',
    conflictType: 'concurrent',
    description: 'Kjøpte og eide aksjer mens han deltok i regjeringsarbeid som kunne berøre selskapene. Erkjente feilvurderinger og gikk av i juli 2023.',
    severity: 'critical',
    classification: 'A',
    sources: [
      { label: 'Stortingets kontrollkomité', url: 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2023-2024/inns-202324-215s/' },
      { label: 'Kontrollhøring november 2023', url: 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Referater/Horinger/2023-2024/refh-202324-11-07/' },
    ],
  },
  {
    personId: 'person-tonje-brenna',
    personName: 'Tonje Brenna',
    politicalRole: 'Kunnskapsminister / Arbeidsminister',
    politicalOrg: 'Kunnskapsdepartementet',
    boardRole: 'Nære personer i tilskuddsmottakende organisasjoner',
    boardOrg: 'Utøya AS / Wergelandsenteret',
    sector: 'utdanning/kultur',
    conflictType: 'concurrent',
    description: 'Hadde ikke meldt fra og fratrådt alle relevante saker der nære personer hadde roller i tilskuddsmottakere. Kontrollkomiteen ga kritikk.',
    severity: 'medium',
    classification: 'A',
    sources: [
      { label: 'Stortingets kontrollkomité', url: 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2023-2024/inns-202324-215s/' },
    ],
  },
  {
    personId: 'person-anette-trettebergstuen',
    personName: 'Anette Trettebergstuen',
    politicalRole: 'Kultur- og likestillingsminister',
    politicalOrg: 'Kulturdepartementet',
    boardRole: 'Utnevnelser av nære venner til styrer',
    boardOrg: 'Offentlige styrer og verv',
    sector: 'kultur',
    conflictType: 'concurrent',
    description: 'Behandlet utnevnelser som berørte nære venner. Erkjente habilitetsbrudd og gikk av i juni 2023.',
    severity: 'critical',
    classification: 'A',
    sources: [
      { label: 'Stortinget referat 5. mars 2024', url: 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Referater/Stortinget/2023-2024/refs-202324-03-05/' },
    ],
  },
  {
    personId: 'person-robert-eriksson',
    personName: 'Robert Eriksson',
    politicalRole: 'Arbeidsminister (2013-2015)',
    politicalOrg: 'Arbeids- og sosialdepartementet',
    boardRole: 'Adm. direktør (2018-)',
    boardOrg: 'NHO Service og Handel',
    sector: 'arbeidsliv',
    conflictType: 'revolving_door',
    description: 'Tidligere arbeidsminister ble toppleder i arbeidsgiverorganisasjon.',
    severity: 'medium',
  },
  {
    personId: 'person-karita-bekkemellem',
    personName: 'Karita Bekkemellem',
    politicalRole: 'Stortingsrepresentant (1989-2009)',
    politicalOrg: 'Stortinget',
    boardRole: 'Adm. direktør (2013-)',
    boardOrg: 'Legemiddelindustrien (LMI)',
    sector: 'helse',
    conflictType: 'revolving_door',
    description: 'Tidligere helsepolitiker leder nå legemiddelindustriens interesseorganisasjon.',
    severity: 'medium',
  },
  {
    personId: 'person-sylvi-listhaug',
    personName: 'Sylvi Listhaug',
    politicalRole: 'Landbruksminister (2013-2015)',
    politicalOrg: 'Landbruksdepartementet',
    boardRole: 'Tidl. seniorrådgiver med hemmelig kundeliste',
    boardOrg: 'First House',
    sector: 'lobbyvirksomhet',
    conflictType: 'revolving_door',
    description: 'Ble vurdert som inhabil i departementets behandling av innsynskravet om egen tidligere kundeliste. Flere offentlige kunder ble senere offentliggjort.',
    severity: 'high',
    classification: 'A',
    sources: [
      { label: 'Aftenposten', url: 'https://www.aftenposten.no/norge/i/XwVPr/listhaug-inhabil-til-aa-behandle-krav-om-innsyn' },
    ],
  },
  {
    personId: 'person-anniken-hauglie',
    personName: 'Anniken Hauglie',
    politicalRole: 'Arbeids- og sosialminister',
    politicalOrg: 'Arbeids- og sosialdepartementet',
    boardRole: 'Adm. direktør',
    boardOrg: 'Offshore Norge (tidl. Norsk olje og gass)',
    sector: 'olje/energi',
    conflictType: 'revolving_door',
    description: 'Seks måneders karantene. Nemnda viste til hennes ansvar for arbeidslivspolitikken og Petroleumstilsynet, og at bransjeorganisasjonen kunne få nytte av hennes kunnskap og nettverk.',
    severity: 'high',
    classification: 'B',
    sources: [
      { label: 'Karantenenemnda vedtak', url: 'https://www.regjeringen.no/contentassets/e2f33ba75573435e9c739d61b6b5e879/2020/annikenhauglie.pdf' },
    ],
  },
  {
    personId: 'person-bjarne-haakon-hanssen',
    personName: 'Bjarne Håkon Hanssen',
    politicalRole: 'Helseminister / Arbeidsminister',
    politicalOrg: 'Helse- og omsorgsdepartementet',
    boardRole: 'Partner',
    boardOrg: 'First House',
    sector: 'lobbyvirksomhet',
    conflictType: 'revolving_door',
    description: 'Overgangen fra helseminister til kommersiell myndighetskontakt utløste karantene og sterk offentlig kritikk. Arbeidsforholdet så ut til å ha blitt forberedt mens han fortsatt var statsråd.',
    severity: 'critical',
    classification: 'B',
    sources: [
      { label: 'Bergens Tidende', url: 'https://www.bt.no/innenriks/i/ezQmK/burde-ha-vist-takknemlighet' },
    ],
  },
  {
    personId: 'person-harald-tom-nesvik',
    personName: 'Harald Tom Nesvik',
    politicalRole: 'Fiskeriminister',
    politicalOrg: 'Nærings- og fiskeridepartementet',
    boardRole: 'Kommunikasjonssjef',
    boardOrg: 'Sølvtrans',
    sector: 'sjømat/havbruk',
    conflictType: 'revolving_door',
    description: 'Seks måneders karantene. Nemnda mente brønnbåtrederiet kunne få særlige fordeler av kunnskapen hans fra sjømatforvaltningen.',
    severity: 'high',
    classification: 'B',
    sources: [
      { label: 'Karantenenemnda vedtak', url: 'https://www.regjeringen.no/contentassets/e2f33ba75573435e9c739d61b6b5e879/2020/haraldtomnesvik.pdf' },
    ],
  },
  {
    personId: 'person-joran-kallmyr',
    personName: 'Jøran Kallmyr',
    politicalRole: 'Justisminister',
    politicalOrg: 'Justisdepartementet',
    boardRole: 'Advokat og partner',
    boardOrg: 'Advokatfirmaet Ræder',
    sector: 'jus/rådgivning',
    conflictType: 'revolving_door',
    description: 'Seks måneders karantene og tolv måneders saksforbud. Nemnda viste til kontaktnett, fortrolig kunnskap og store offentlige anbud.',
    severity: 'high',
    classification: 'B',
    sources: [
      { label: 'Karantenenemnda vedtak', url: 'https://www.regjeringen.no/contentassets/e2f33ba75573435e9c739d61b6b5e879/2020/jorankallmyr.pdf' },
    ],
  },
  {
    personId: 'person-tor-mikkel-wara',
    personName: 'Tor Mikkel Wara',
    politicalRole: 'Justisminister',
    politicalOrg: 'Justisdepartementet',
    boardRole: 'Seniorrådgiver',
    boardOrg: 'First House',
    sector: 'lobbyvirksomhet',
    conflictType: 'revolving_door',
    description: 'Seks måneders karantene ved oppstart i eget konsulentselskap og tolv måneders saksforbud, videreført ved overgangen til First House.',
    severity: 'high',
    classification: 'B',
    sources: [
      { label: 'Karantenenemnda vedtak', url: 'https://www.regjeringen.no/contentassets/e2f33ba75573435e9c739d61b6b5e879/2020/tormikkelwaraii.pdf' },
    ],
  },
  {
    personId: 'person-jan-christian-vestre',
    personName: 'Jan Christian Vestre',
    politicalRole: 'Næringsminister (2021-2024)',
    politicalOrg: 'Nærings- og fiskeridepartementet',
    boardRole: 'Daglig leder og 70% eier (2014-2021)',
    boardOrg: 'Vestre AS',
    sector: 'møbler/offentlige anskaffelser',
    conflictType: 'concurrent',
    description: 'Eier 70% av Vestre AS som produserer møbler for offentlige rom. Ble næringsminister med ansvar for næringspolitikk og offentlige anskaffelser. Selskapet selger møbler til stat og kommune — spesifikasjoner for offentlige innkjøp ble utformet mens han var minister.',
    severity: 'critical',
    classification: 'C',
    sources: [
      { label: 'Regjeringen.no - Habilitetsvurdering', url: 'https://www.regjeringen.no/no/dokumenter/-6-vurdering-av-naringsminister-jan-christian-vestres-habilitet/id2928943/' },
    ],
  },
];

const politicalNodes: GraphNode[] = [
  { id: 'person-jonas-gahr-store', name: 'Jonas Gahr Støre', type: 'person', group: 'person' },
  { id: 'person-erna-solberg', name: 'Erna Solberg', type: 'person', group: 'person' },
  { id: 'person-trygve-slagsvold-vedum', name: 'Trygve Slagsvold Vedum', type: 'person', group: 'person' },
  { id: 'person-jan-tore-sanner', name: 'Jan Tore Sanner', type: 'person', group: 'person' },
  { id: 'person-anniken-huitfeldt', name: 'Anniken Huitfeldt', type: 'person', group: 'person' },
  { id: 'person-nikolai-astrup', name: 'Nikolai Astrup', type: 'person', group: 'person' },
  { id: 'person-monica-maeland', name: 'Monica Mæland', type: 'person', group: 'person' },
  { id: 'person-torbjorn-roe-isaksen', name: 'Torbjørn Røe Isaksen', type: 'person', group: 'person' },
  { id: 'person-siv-jensen', name: 'Siv Jensen', type: 'person', group: 'person' },
  { id: 'person-sylvi-listhaug', name: 'Sylvi Listhaug', type: 'person', group: 'person' },
  { id: 'person-bent-hoie', name: 'Bent Høie', type: 'person', group: 'person' },
  { id: 'person-abid-raja', name: 'Abid Raja', type: 'person', group: 'person' },
  { id: 'person-ketil-solvik-olsen', name: 'Ketil Solvik-Olsen', type: 'person', group: 'person' },
  { id: 'person-per-sandberg', name: 'Per Sandberg', type: 'person', group: 'person' },
  { id: 'person-linda-hofstad-helleland', name: 'Linda Hofstad Helleland', type: 'person', group: 'person' },
  { id: 'person-ine-eriksen-soreide', name: 'Ine Eriksen Søreide', type: 'person', group: 'person' },
  { id: 'person-iselin-nybo', name: 'Iselin Nybø', type: 'person', group: 'person' },
  { id: 'person-trine-skei-grande', name: 'Trine Skei Grande', type: 'person', group: 'person' },
  { id: 'person-anniken-hauglie', name: 'Anniken Hauglie', type: 'person', group: 'person' },
  { id: 'person-tonje-brenna', name: 'Tonje Brenna', type: 'person', group: 'person' },
  { id: 'person-anette-trettebergstuen', name: 'Anette Trettebergstuen', type: 'person', group: 'person' },
  { id: 'person-julie-brodtkorb', name: 'Julie Brodtkorb', type: 'person', group: 'person' },
  { id: 'person-manuela-ramin-osmundsen', name: 'Manuela Ramin-Osmundsen', type: 'person', group: 'person' },
  { id: 'person-tore-tonne', name: 'Tore Tønne', type: 'person', group: 'person' },
  { id: 'person-harald-tom-nesvik', name: 'Harald Tom Nesvik', type: 'person', group: 'person' },
  { id: 'person-joran-kallmyr', name: 'Jøran Kallmyr', type: 'person', group: 'person' },
  { id: 'person-bjarne-haakon-hanssen', name: 'Bjarne Håkon Hanssen', type: 'person', group: 'person' },
  { id: 'person-karita-bekkemellem', name: 'Karita Bekkemellem', type: 'person', group: 'person' },
  { id: 'person-knut-arild-hareide', name: 'Knut Arild Hareide', type: 'person', group: 'person' },
  { id: 'person-dagrun-eriksen', name: 'Dagrun Eriksen', type: 'person', group: 'person' },
  { id: 'person-ola-borten-moe', name: 'Ola Borten Moe', type: 'person', group: 'person' },
  { id: 'person-tord-lien', name: 'Tord Lien', type: 'person', group: 'person' },
  { id: 'person-tor-mikkel-wara', name: 'Tor Mikkel Wara', type: 'person', group: 'person' },
  { id: 'person-robert-eriksson', name: 'Robert Eriksson', type: 'person', group: 'person' },
  { id: 'person-kjell-borge-freiberg', name: 'Kjell-Børge Freiberg', type: 'person', group: 'person' },
  { id: 'person-terje-soviknes', name: 'Terje Søviknes', type: 'person', group: 'person' },
  { id: 'person-kristin-clemet', name: 'Kristin Clemet', type: 'person', group: 'person' },
  { id: 'person-kristin-halvorsen', name: 'Kristin Halvorsen', type: 'person', group: 'person' },
  { id: 'person-heikki-holmas', name: 'Heikki Holmås', type: 'person', group: 'person' },
  { id: 'person-ola-elvestuen', name: 'Ola Elvestuen', type: 'person', group: 'person' },
  { id: 'person-jan-christian-vestre', name: 'Jan Christian Vestre', type: 'person', group: 'person' },
  { id: 'person-nicolai-tangen', name: 'Nicolai Tangen', type: 'person', group: 'person' },
  { id: 'person-yngve-slyngstad', name: 'Yngve Slyngstad', type: 'person', group: 'person' },

  { id: 'org-arbeiderpartiet', name: 'Arbeiderpartiet', type: 'political_party', group: 'political' },
  { id: 'org-hoyre', name: 'Høyre', type: 'political_party', group: 'political' },
  { id: 'org-senterpartiet', name: 'Senterpartiet', type: 'political_party', group: 'political' },
  { id: 'org-fremskrittspartiet', name: 'Fremskrittspartiet', type: 'political_party', group: 'political' },
  { id: 'org-sosialistisk-venstreparti', name: 'Sosialistisk Venstreparti', type: 'political_party', group: 'political' },
  { id: 'org-venstre', name: 'Venstre', type: 'political_party', group: 'political' },
  { id: 'org-kristelig-folkeparti', name: 'Kristelig Folkeparti', type: 'political_party', group: 'political' },
  { id: 'org-rodt', name: 'Rødt', type: 'political_party', group: 'political' },
  { id: 'org-miljopartiet-de-gronne', name: 'Miljøpartiet De Grønne', type: 'political_party', group: 'political' },

  { id: 'org-statsministerens-kontor', name: 'Statsministerens kontor', type: 'government_body', group: 'government' },
  { id: 'org-finansdepartementet', name: 'Finansdepartementet', type: 'government_body', group: 'government' },
  { id: 'org-utenriksdepartementet', name: 'Utenriksdepartementet', type: 'government_body', group: 'government' },
  { id: 'org-naringsdepartementet', name: 'Nærings- og fiskeridepartementet', type: 'government_body', group: 'government' },
  { id: 'org-stortinget', name: 'Stortinget', type: 'government_body', group: 'government' },
  { id: 'org-kunnskapsdepartementet', name: 'Kunnskapsdepartementet', type: 'government_body', group: 'government' },
  { id: 'org-kulturdepartementet', name: 'Kulturdepartementet', type: 'government_body', group: 'government' },
  { id: 'org-justisdepartementet', name: 'Justis- og beredskapsdepartementet', type: 'government_body', group: 'government' },
  { id: 'org-barne-likestillingsdepartementet', name: 'Barne- og likestillingsdepartementet', type: 'government_body', group: 'government' },

  { id: 'org-dnb', name: 'DNB ASA (Org.nr. 984 851 006)', type: 'company', group: 'company' },
  { id: 'org-equinor', name: 'Equinor ASA (Org.nr. 923 609 016)', type: 'company', group: 'company' },
  { id: 'org-telenor', name: 'Telenor ASA (Org.nr. 982 463 718)', type: 'company', group: 'company' },
  { id: 'org-norsk-hydro', name: 'Norsk Hydro ASA (Org.nr. 914 778 271)', type: 'company', group: 'company' },
  { id: 'org-nho', name: 'NHO (Org.nr. 955 600 436)', type: 'company', group: 'company' },
  { id: 'org-mckinsey', name: 'McKinsey & Company Norway (Org.nr. 982 793 560)', type: 'company', group: 'company' },
  { id: 'org-first-house', name: 'First House AS (Org.nr. 993 810 660)', type: 'company', group: 'company' },
  { id: 'org-helse-vest-rhf', name: 'Helse Vest RHF (Org.nr. 983 658 725)', type: 'company', group: 'company' },
  { id: 'org-finans-norge', name: 'Finans Norge (Org.nr. 981 423 682)', type: 'company', group: 'company' },
  { id: 'org-nho-logistikk-transport', name: 'NHO Logistikk og Transport (Org.nr. 970 187 384)', type: 'company', group: 'company' },
  { id: 'org-nho-service-handel', name: 'NHO Service og Handel (Org.nr. 977 041 707)', type: 'company', group: 'company' },
  { id: 'org-norges-rederiforbund', name: 'Norges Rederiforbund (Org.nr. 971 436 190)', type: 'company', group: 'company' },
  { id: 'org-okea', name: 'OKEA ASA (Org.nr. 915 419 062)', type: 'company', group: 'company' },
  { id: 'org-forleggerforeningen', name: 'Den norske Forleggerforening (Org.nr. 956 609 046)', type: 'company', group: 'company' },
  { id: 'org-legemiddelindustrien', name: 'Legemiddelindustrien (LMI) (Org.nr. 983 956 527)', type: 'company', group: 'company' },
  { id: 'org-sjomat-norge', name: 'Sjømat Norge (Org.nr. 974 461 021)', type: 'company', group: 'company' },
  { id: 'org-vestre', name: 'Vestre AS (Org.nr. 923 470 565)', type: 'company', group: 'company' },
  { id: 'org-utoya', name: 'Utøya AS', type: 'company', group: 'company' },
  { id: 'org-wergelandsenteret', name: 'Wergelandsenteret', type: 'company', group: 'company' },
  { id: 'org-offshore-norge', name: 'Offshore Norge (tidl. Norsk olje og gass)', type: 'company', group: 'company' },
  { id: 'org-solvtrans', name: 'Sølvtrans', type: 'company', group: 'company' },
  { id: 'org-raeder', name: 'Advokatfirmaet Ræder', type: 'company', group: 'company' },
  { id: 'org-nbim', name: 'Norges Bank Investment Management (Oljefondet)', type: 'company', group: 'company' },
  { id: 'org-storebrand', name: 'Storebrand ASA (Org.nr. 911 106 396)', type: 'company', group: 'company' },
  { id: 'org-scatec', name: 'Scatec ASA (Org.nr. 990 918 546)', type: 'company', group: 'company' },
  { id: 'org-cloudberry', name: 'Cloudberry Clean Energy ASA (Org.nr. 821 820 362)', type: 'company', group: 'company' },
  { id: 'org-summa-equity', name: 'Summa Equity', type: 'company', group: 'company' },
];

const politicalLinks: GraphLink[] = [
  // Party membership/leadership
  { source: 'person-jonas-gahr-store', target: 'org-arbeiderpartiet', label: 'Partileder', category: 'political' },
  { source: 'person-erna-solberg', target: 'org-hoyre', label: 'Partileder', category: 'political' },
  { source: 'person-trygve-slagsvold-vedum', target: 'org-senterpartiet', label: 'Partileder', category: 'political' },
  { source: 'person-sylvi-listhaug', target: 'org-fremskrittspartiet', label: 'Partileder', category: 'political' },
  { source: 'person-jan-tore-sanner', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-anniken-huitfeldt', target: 'org-arbeiderpartiet', label: 'Medlem', category: 'political' },
  { source: 'person-nikolai-astrup', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-monica-maeland', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-torbjorn-roe-isaksen', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-siv-jensen', target: 'org-fremskrittspartiet', label: 'Tidl. Partileder', category: 'political' },
  { source: 'person-bent-hoie', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-abid-raja', target: 'org-venstre', label: 'Medlem', category: 'political' },
  { source: 'person-ketil-solvik-olsen', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-per-sandberg', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-linda-hofstad-helleland', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-ine-eriksen-soreide', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-iselin-nybo', target: 'org-venstre', label: 'Medlem', category: 'political' },
  { source: 'person-trine-skei-grande', target: 'org-venstre', label: 'Tidl. partileder', category: 'political' },
  { source: 'person-anniken-hauglie', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-tonje-brenna', target: 'org-arbeiderpartiet', label: 'Medlem', category: 'political' },
  { source: 'person-anette-trettebergstuen', target: 'org-arbeiderpartiet', label: 'Medlem', category: 'political' },
  { source: 'person-julie-brodtkorb', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-manuela-ramin-osmundsen', target: 'org-arbeiderpartiet', label: 'Statsråd i Ap-regjering', category: 'political' },
  { source: 'person-tore-tonne', target: 'org-arbeiderpartiet', label: 'Tidl. statsråd', category: 'political' },
  { source: 'person-harald-tom-nesvik', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-joran-kallmyr', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-bjarne-haakon-hanssen', target: 'org-arbeiderpartiet', label: 'Medlem', category: 'political' },
  { source: 'person-karita-bekkemellem', target: 'org-arbeiderpartiet', label: 'Medlem', category: 'political' },
  { source: 'person-knut-arild-hareide', target: 'org-kristelig-folkeparti', label: 'Tidl. partileder', category: 'political' },
  { source: 'person-dagrun-eriksen', target: 'org-kristelig-folkeparti', label: 'Medlem', category: 'political' },
  { source: 'person-ola-borten-moe', target: 'org-senterpartiet', label: 'Medlem', category: 'political' },
  { source: 'person-tord-lien', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-tor-mikkel-wara', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-robert-eriksson', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-kjell-borge-freiberg', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-terje-soviknes', target: 'org-fremskrittspartiet', label: 'Medlem', category: 'political' },
  { source: 'person-kristin-clemet', target: 'org-hoyre', label: 'Medlem', category: 'political' },
  { source: 'person-kristin-halvorsen', target: 'org-sosialistisk-venstreparti', label: 'Tidl. partileder', category: 'political' },
  { source: 'person-heikki-holmas', target: 'org-sosialistisk-venstreparti', label: 'Medlem', category: 'political' },
  { source: 'person-ola-elvestuen', target: 'org-venstre', label: 'Medlem', category: 'political' },
  { source: 'person-jan-christian-vestre', target: 'org-arbeiderpartiet', label: 'Nestleder', category: 'political' },

  // Government positions
  { source: 'person-jonas-gahr-store', target: 'org-statsministerens-kontor', label: 'Statsminister', category: 'government' },
  { source: 'person-trygve-slagsvold-vedum', target: 'org-finansdepartementet', label: 'Finansminister', category: 'government' },
  { source: 'person-anniken-huitfeldt', target: 'org-utenriksdepartementet', label: 'Tidl. Utenriksminister', category: 'government' },
  { source: 'person-erna-solberg', target: 'org-statsministerens-kontor', label: 'Tidl. Statsminister (2013-2021)', category: 'government' },
  { source: 'person-jan-tore-sanner', target: 'org-finansdepartementet', label: 'Tidl. Finansminister', category: 'government' },
  { source: 'person-monica-maeland', target: 'org-naringsdepartementet', label: 'Tidl. Næringsminister', category: 'government' },
  { source: 'person-siv-jensen', target: 'org-finansdepartementet', label: 'Tidl. Finansminister (2013-2020)', category: 'government' },
  { source: 'person-bent-hoie', target: 'org-naringsdepartementet', label: 'Tidl. Helseminister (2013-2021)', category: 'government' },
  { source: 'person-sylvi-listhaug', target: 'org-naringsdepartementet', label: 'Tidl. minister (flere dep.)', category: 'government' },
  { source: 'person-abid-raja', target: 'org-naringsdepartementet', label: 'Tidl. Kulturminister (2020-2021)', category: 'government' },
  { source: 'person-ketil-solvik-olsen', target: 'org-naringsdepartementet', label: 'Tidl. Samferdselsminister (2013-2018)', category: 'government' },
  { source: 'person-tonje-brenna', target: 'org-kunnskapsdepartementet', label: 'Tidl. Kunnskapsminister', category: 'government' },
  { source: 'person-anette-trettebergstuen', target: 'org-kulturdepartementet', label: 'Tidl. Kultur- og likestillingsminister', category: 'government' },
  { source: 'person-manuela-ramin-osmundsen', target: 'org-barne-likestillingsdepartementet', label: 'Tidl. statsråd', category: 'government' },
  { source: 'person-harald-tom-nesvik', target: 'org-naringsdepartementet', label: 'Tidl. Fiskeriminister', category: 'government' },
  { source: 'person-joran-kallmyr', target: 'org-justisdepartementet', label: 'Tidl. Justisminister', category: 'government' },
  { source: 'person-tor-mikkel-wara', target: 'org-justisdepartementet', label: 'Tidl. Justisminister', category: 'government' },
  { source: 'person-jan-christian-vestre', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },

  // Stortinget
  { source: 'person-erna-solberg', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-nikolai-astrup', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-jan-tore-sanner', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-anniken-huitfeldt', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-trygve-slagsvold-vedum', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-monica-maeland', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-torbjorn-roe-isaksen', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-siv-jensen', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-sylvi-listhaug', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-bent-hoie', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-abid-raja', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-ketil-solvik-olsen', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-per-sandberg', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-linda-hofstad-helleland', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-ine-eriksen-soreide', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-iselin-nybo', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-trine-skei-grande', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-knut-arild-hareide', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-dagrun-eriksen', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-ola-borten-moe', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },
  { source: 'person-tord-lien', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-robert-eriksson', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-kristin-halvorsen', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-heikki-holmas', target: 'org-stortinget', label: 'Tidl. Stortingsrepresentant', category: 'political' },
  { source: 'person-ola-elvestuen', target: 'org-stortinget', label: 'Stortingsrepresentant', category: 'political' },

  // Board/corporate positions (public information about revolving doors)
  { source: 'person-torbjorn-roe-isaksen', target: 'org-nho-logistikk-transport', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-monica-maeland', target: 'org-dnb', label: 'Styremedlem', category: 'board' },
  { source: 'person-nikolai-astrup', target: 'org-mckinsey', label: 'Partner (2022–)', category: 'executive' },
  { source: 'person-siv-jensen', target: 'org-norsk-hydro', label: 'Styremedlem NBIM (Oljefondet)', category: 'board' },
  { source: 'person-ketil-solvik-olsen', target: 'org-nho', label: 'Rådgiver, First House', category: 'executive' },
  { source: 'person-bent-hoie', target: 'org-helse-vest-rhf', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-monica-maeland', target: 'org-nho', label: 'Direktør for arbeidsliv', category: 'executive' },
  { source: 'person-per-sandberg', target: 'org-sjomat-norge', label: 'Næringsrådgiver', category: 'executive' },
  { source: 'person-linda-hofstad-helleland', target: 'org-first-house', label: 'Seniorrådgiver', category: 'executive' },
  { source: 'person-ine-eriksen-soreide', target: 'org-first-house', label: 'Seniorrådgiver (permisjon)', category: 'executive' },
  { source: 'person-iselin-nybo', target: 'org-finans-norge', label: 'Direktør', category: 'executive' },
  { source: 'person-trine-skei-grande', target: 'org-forleggerforeningen', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-anniken-hauglie', target: 'org-nho-service-handel', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-anniken-hauglie', target: 'org-offshore-norge', label: 'Karantenevurdert direktørrolle', category: 'executive' },
  { source: 'person-tonje-brenna', target: 'org-utoya', label: 'Habilitetssak: nære relasjoner', category: 'board' },
  { source: 'person-tonje-brenna', target: 'org-wergelandsenteret', label: 'Habilitetssak: nære relasjoner', category: 'board' },
  { source: 'person-julie-brodtkorb', target: 'org-first-house', label: 'Partner / rådgiver', category: 'executive' },
  { source: 'person-harald-tom-nesvik', target: 'org-solvtrans', label: 'Kommunikasjonssjef', category: 'executive' },
  { source: 'person-joran-kallmyr', target: 'org-raeder', label: 'Advokat og partner', category: 'executive' },
  { source: 'person-bjarne-haakon-hanssen', target: 'org-first-house', label: 'Partner', category: 'executive' },
  { source: 'person-karita-bekkemellem', target: 'org-legemiddelindustrien', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-knut-arild-hareide', target: 'org-norges-rederiforbund', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-dagrun-eriksen', target: 'org-nho-service-handel', label: 'Næringspolitisk direktør', category: 'executive' },
  { source: 'person-ola-borten-moe', target: 'org-okea', label: 'Styreleder', category: 'board' },
  { source: 'person-tord-lien', target: 'org-okea', label: 'Direktør samfunnskontakt', category: 'executive' },
  { source: 'person-tor-mikkel-wara', target: 'org-first-house', label: 'Seniorrådgiver', category: 'executive' },
  { source: 'person-robert-eriksson', target: 'org-nho-service-handel', label: 'Adm. direktør', category: 'executive' },
  { source: 'person-kjell-borge-freiberg', target: 'org-okea', label: 'Direktør myndighetskontakt', category: 'executive' },
  { source: 'person-terje-soviknes', target: 'org-okea', label: 'Styremedlem', category: 'board' },
  { source: 'person-kristin-clemet', target: 'org-first-house', label: 'Styremedlem', category: 'board' },
  { source: 'person-kristin-halvorsen', target: 'org-finans-norge', label: 'Styremedlem i bransjeråd', category: 'board' },
  { source: 'person-heikki-holmas', target: 'org-first-house', label: 'Seniorrådgiver', category: 'executive' },
  { source: 'person-ola-elvestuen', target: 'org-finans-norge', label: 'Styremedlem i bærekraftsforum', category: 'board' },
  { source: 'person-jan-christian-vestre', target: 'org-vestre', label: 'Tidl. Daglig leder og 70% eier (2014-2021)', category: 'executive' },
  { source: 'person-nicolai-tangen', target: 'org-nbim', label: 'Oljefondssjef', category: 'executive' },
  { source: 'person-yngve-slyngstad', target: 'org-nbim', label: 'Tidl. Oljefondssjef (2008-2020)', category: 'executive' },
  { source: 'person-yngve-slyngstad', target: 'org-aker-asa', label: 'Styremedlem (2021–)', category: 'board' },
  { source: 'person-yngve-slyngstad', target: 'org-storebrand', label: 'Styreleder (2021–)', category: 'board' },
  { source: 'person-yngve-slyngstad', target: 'org-scatec', label: 'Styreleder (2021–)', category: 'board' },
  { source: 'person-yngve-slyngstad', target: 'org-cloudberry', label: 'Styremedlem (2022–)', category: 'board' },
  { source: 'person-yngve-slyngstad', target: 'org-summa-equity', label: 'Rådgiver', category: 'executive' },
];

export function getPoliticalData(): GraphData {
  return {
    nodes: [...politicalNodes],
    links: [...politicalLinks],
  };
}

export function searchPoliticalPersons(query: string): GraphNode[] {
  const q = query.toLowerCase();
  return politicalNodes.filter(
    (n) => n.name.toLowerCase().includes(q)
  );
}

export function getPersonPoliticalNetwork(personId: string): GraphData {
  const relevantLinks = politicalLinks.filter(
    (l) => l.source === personId || l.target === personId
  );

  const nodeIds = new Set<string>();
  nodeIds.add(personId);
  relevantLinks.forEach((l) => {
    nodeIds.add(l.source);
    nodeIds.add(l.target);
  });

  const nodes = politicalNodes.filter((n) => nodeIds.has(n.id));
  return { nodes, links: relevantLinks };
}

export function getPersonTimeline(personId: string): PositionTimeline | null {
  return timelines.find((t) => t.personId === personId) || null;
}

export function getAllTimelines(): PositionTimeline[] {
  return timelines;
}

export function getConflictsForPerson(personId: string): ConflictOfInterest[] {
  return conflicts.filter((c) => c.personId === personId);
}

export function getAllConflicts(): ConflictOfInterest[] {
  return conflicts;
}

export function getOrgSectors(): Record<string, string[]> {
  return ORG_SECTORS;
}
