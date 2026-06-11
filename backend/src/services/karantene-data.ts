/**
 * Static registry of Karantenenemnda decisions scraped from regjeringen.no.
 * Each person maps to their PDF decision links.
 * Source: https://www.regjeringen.no/no/dep/dfd/org/styrer-rad-og-utvalg-under-digitaliserings-og-forvaltningsdepartementet/karantenenemnda/avgjorelser-fra-karantenenemnda/id2472135/
 */

const PDF_BASE = 'https://www.regjeringen.no/contentassets/e2f33ba75573435e9c739d61b6b5e879';

export interface KaranteneEntry {
  date: string;
  title: string;
  pdfUrl: string;
}

export interface KaranteneDecision {
  id: string;
  personName: string;
  date: string;
  previousRole: string;
  previousDepartment: string;
  newRole: string;
  newOrganization: string;
  quarantineMonths: number;
  restrictionMonths: number;
  reasoning: string;
  pdfUrl: string;
  year: number;
  classification: 'B';
}

// Static registry: normalized name -> entries
const KARANTENE_REGISTRY: Record<string, KaranteneEntry[]> = {
  'Tom Kalsås': [
    { date: '2026-02-16', title: 'Tom Kalsås II', pdfUrl: `${PDF_BASE}/2026/tomkalsas_ll.pdf` },
    { date: '2026-01-19', title: 'Tom Kalsås', pdfUrl: `${PDF_BASE}/2026/tomkalsas.pdf` },
  ],
  'Per Olav Hopsø': [
    { date: '2026-02-13', title: 'Per Olav Hopsø', pdfUrl: `${PDF_BASE}/2026/perolavhopso.pdf` },
  ],
  'Ole Austevoll': [
    { date: '2026-02-02', title: 'Ole Austevoll', pdfUrl: `${PDF_BASE}/2026/oleaustevoll.pdf` },
  ],
  'Anne Marie Aanerud': [
    { date: '2025-11-26', title: 'Anne Marie Aanerud II - klargjøring av saksforbud', pdfUrl: `${PDF_BASE}/2025/annemarieaanerud_ii-klargjoring_saksforbud.pdf` },
    { date: '2025-11-18', title: 'Anne Marie Aanerud II', pdfUrl: `${PDF_BASE}/2025/annemarieaanerud_ii.pdf` },
    { date: '2025-07-08', title: 'Anne Marie Aanerud - ny vurdering', pdfUrl: `${PDF_BASE}/2025/annemarieaanerud_ny_vurdering.pdf` },
    { date: '2025-06-30', title: 'Anne Marie Aanerud', pdfUrl: `${PDF_BASE}/2025/annemarieaanerud.pdf` },
  ],
  'Henrik Nordtun Gjertsen': [
    { date: '2025-11-13', title: 'Henrik Nordtun Gjertsen II', pdfUrl: `${PDF_BASE}/2025/henriknordtungjertsen_ii.pdf` },
    { date: '2025-03-19', title: 'Henrik Nordtun Gjertsen', pdfUrl: `${PDF_BASE}/2025/henriknordtungjertsen.pdf` },
  ],
  'Kjetil Skeide Edvardsen': [
    { date: '2025-11-10', title: 'Kjetil Skeide Edvardsen', pdfUrl: `${PDF_BASE}/2025/kjetilskeideedvardsen.pdf` },
  ],
  'Ingunn Trosholmen': [
    { date: '2025-10-14', title: 'Ingunn Trosholmen', pdfUrl: `${PDF_BASE}/2025/ingunntrosholmen.pdf` },
  ],
  'Signe Bjotveit': [
    { date: '2025-10-10', title: 'Signe Bjotveit', pdfUrl: `${PDF_BASE}/2025/signebjotveit.pdf` },
  ],
  'Siri Holland': [
    { date: '2025-10-09', title: 'Siri Holland', pdfUrl: `${PDF_BASE}/2025/siriholland.pdf` },
  ],
  'Ellen Bakken': [
    { date: '2025-09-01', title: 'Ellen Bakken - ny dato for tiltredelse', pdfUrl: `${PDF_BASE}/2025/ellenbakken_endret_tiltredelsesdato.pdf` },
    { date: '2025-08-18', title: 'Ellen Bakken', pdfUrl: `${PDF_BASE}/2025/ellenbakken.pdf` },
  ],
  'Tomas Norvoll': [
    { date: '2025-08-19', title: 'Tomas Norvoll - presisering', pdfUrl: `${PDF_BASE}/2025/tomasnorvoll_presisering.pdf` },
    { date: '2025-08-05', title: 'Tomas Norvoll', pdfUrl: `${PDF_BASE}/2025/tomasnorvoll.pdf` },
  ],
  'Erling Laugsand': [
    { date: '2025-07-03', title: 'Erling Laugsand', pdfUrl: `${PDF_BASE}/2025/erlinglaugsand.pdf` },
  ],
  'Marie Lamo Vikanes': [
    { date: '2025-06-23', title: 'Marie Lamo Vikanes', pdfUrl: `${PDF_BASE}/2025/marielamovikanes.pdf` },
  ],
  'Even Aleksander Hagen': [
    { date: '2025-06-05', title: 'Even Aleksander Hagen II', pdfUrl: `${PDF_BASE}/2025/evenaleksanderhagen_ii.pdf` },
    { date: '2025-05-15', title: 'Even Aleksander Hagen', pdfUrl: `${PDF_BASE}/2025/evenaleksanderhagen.pdf` },
  ],
  'Gunn Karin Gjul': [
    { date: '2025-03-26', title: 'Gunn Karin Gjul', pdfUrl: `${PDF_BASE}/2025/gunnkaringjul.pdf` },
  ],
  'Kjersti Bjørnstad': [
    { date: '2025-03-12', title: 'Kjersti Bjørnstad', pdfUrl: `${PDF_BASE}/2025/kjerstibjornstad.pdf` },
  ],
  'Lars Erik Bartnes': [
    { date: '2025-03-05', title: 'Lars Erik Bartnes', pdfUrl: `${PDF_BASE}/2025/larserikbartnes.pdf` },
  ],
  'Erlend Grimstad': [
    { date: '2025-02-20', title: 'Erlend Grimstad', pdfUrl: `${PDF_BASE}/2025/erlendgrimstad.pdf` },
  ],
  'Skjalg Erik Fjellheim': [
    { date: '2025-02-12', title: 'Skjalg Erik Fjellheim', pdfUrl: `${PDF_BASE}/2025/skjalg-erik-fjellheim-helse-nord-rhf.pdf` },
  ],
  'John-Erik Vika': [
    { date: '2025-02-06', title: 'John-Erik Vika', pdfUrl: `${PDF_BASE}/2025/john-erikvika.pdf` },
  ],
  'Anne Marit Bjørnflaten': [
    { date: '2025-02-05', title: 'Anne Marit Bjørnflaten', pdfUrl: `${PDF_BASE}/2025/annemaritbjornflaten.pdf` },
    { date: '2024-06-19', title: 'Anne Marit Bjørnflaten V', pdfUrl: `${PDF_BASE}/2024/annemaritbjornflaten_v.pdf` },
    { date: '2024-06-05', title: 'Anne Marit Bjørnflaten IV', pdfUrl: `${PDF_BASE}/2024/annemaritbjornflaten_iv.pdf` },
    { date: '2024-06-05', title: 'Anne Marit Bjørnflaten III', pdfUrl: `${PDF_BASE}/2024/annemaritbjornflaten_iii.pdf` },
    { date: '2024-05-28', title: 'Anne Marit Bjørnflaten II', pdfUrl: `${PDF_BASE}/2024/annemaritbjornflatenii.pdf` },
    { date: '2024-05-27', title: 'Anne Marit Bjørnflaten', pdfUrl: `${PDF_BASE}/2024/annemaritbjornflaten.pdf` },
  ],
  'Stein Mathisen': [
    { date: '2025-01-07', title: 'Stein Mathisen', pdfUrl: `${PDF_BASE}/2025/steinmathisen.pdf` },
  ],
  'Vidar Ulriksen': [
    { date: '2024-12-16', title: 'Vidar Ulriksen II', pdfUrl: `${PDF_BASE}/2024/vidarulriksen_ii.pdf` },
    { date: '2023-12-22', title: 'Vidar Ulriksen', pdfUrl: `${PDF_BASE}/2023/vidarulriksen.pdf` },
  ],
  'Sigrun Wiggen Prestbakmo': [
    { date: '2024-11-25', title: 'Sigrun Wiggen Prestbakmo', pdfUrl: `${PDF_BASE}/2024/sigrunwiggenprestbakmo.pdf` },
  ],
  'Mari Hansen Ingleson': [
    { date: '2024-10-23', title: 'Mari Hansen Ingleson', pdfUrl: `${PDF_BASE}/2024/marihanseningleson.pdf` },
  ],
  'Jorid Juliussen Nordmelan': [
    { date: '2024-10-16', title: 'Jorid Juliussen Nordmelan', pdfUrl: `${PDF_BASE}/2024/joridjuliussennordmelan.pdf` },
  ],
  'Lars Ravn Vangen': [
    { date: '2024-08-29', title: 'Lars Ravn Vangen - ny vurdering', pdfUrl: `${PDF_BASE}/2024/larsravnvangen-ny_vurdering.pdf` },
    { date: '2024-08-21', title: 'Lars Ravn Vangen', pdfUrl: `${PDF_BASE}/2024/larsravnvangen.pdf` },
  ],
  'Finn Henrik Thune': [
    { date: '2024-07-01', title: 'Finn Henrik Thune', pdfUrl: `${PDF_BASE}/2024/finn-henrik-thune-vedtak-2024.pdf` },
    { date: '2023-12-29', title: 'Finn Henrik Thune', pdfUrl: `${PDF_BASE}/2023/finnhenrikthune.pdf` },
    { date: '2022-12-21', title: 'Finn Henrik Thune', pdfUrl: `${PDF_BASE}/2022/finnhenrikthune.pdf` },
  ],
  'Ole Henrik Krat Bjørkholt': [
    { date: '2024-05-08', title: 'Ole Henrik Krat Bjørkholt', pdfUrl: `${PDF_BASE}/2024/olehenrikkratbjorkholt.pdf` },
  ],
  'Gabriel Qvigstad Trampe': [
    { date: '2024-01-25', title: 'Gabriel Qvigstad Trampe', pdfUrl: `${PDF_BASE}/2024/gabrielqvigstadtrampe.pdf` },
  ],
  'Eirin Kristin Kjær': [
    { date: '2023-12-05', title: 'Eirin Kristin Kjær', pdfUrl: `${PDF_BASE}/2023/eirinkristinkjaer.pdf` },
  ],
  'Øyvind Bosnes Engen': [
    { date: '2023-11-21', title: 'Øyvind Bosnes Engen', pdfUrl: `${PDF_BASE}/2023/oyvindbosnesengen.pdf` },
  ],
  'Samra Akhtar': [
    { date: '2023-11-20', title: 'Samra Akhtar', pdfUrl: `${PDF_BASE}/2023/samraakhtar.pdf` },
  ],
  'Jakob Bjelland': [
    { date: '2023-11-09', title: 'Jakob Bjelland', pdfUrl: `${PDF_BASE}/2023/jakobbjelland.pdf` },
  ],
  'Nancy Lystad Herz': [
    { date: '2023-10-03', title: 'Nancy Lystad Herz III', pdfUrl: `${PDF_BASE}/2023/nancylystadherz_iii.pdf` },
    { date: '2023-06-27', title: 'Nancy Lystad Herz II', pdfUrl: `${PDF_BASE}/2023/nancylystadherz_ii.pdf` },
    { date: '2023-06-05', title: 'Nancy Herz', pdfUrl: `${PDF_BASE}/2023/nancyherz.pdf` },
  ],
  'Truls Wickholm': [
    { date: '2023-02-01', title: 'Truls Wickholm II', pdfUrl: `${PDF_BASE}/2023/trulswickholm_ii.pdf` },
    { date: '2022-04-28', title: 'Truls Wickholm', pdfUrl: `${PDF_BASE}/2022/trulswickholm.pdf` },
  ],
  'Mette Gundersen': [
    { date: '2023-01-27', title: 'Mette Gundersen II', pdfUrl: `${PDF_BASE}/2023/mettegundersen_ii.pdf` },
    { date: '2022-11-24', title: 'Mette Gundersen', pdfUrl: `${PDF_BASE}/2022/mettegundersen.pdf` },
  ],
  'Odd Roger Enoksen': [
    { date: '2023-01-16', title: 'Odd Roger Enoksen II', pdfUrl: `${PDF_BASE}/2023/oddrogerenoksen_ii.pdf` },
    { date: '2022-09-29', title: 'Odd Roger Enoksen', pdfUrl: `${PDF_BASE}/2022/oddrogerenoksen.pdf` },
  ],
  'Kristin Holm Jensen': [
    { date: '2023-01-06', title: 'Kristin Holm Jensen II', pdfUrl: `${PDF_BASE}/2023/kristinholmjensenii.pdf` },
    { date: '2021-10-15', title: 'Kristin Holm Jensen', pdfUrl: `${PDF_BASE}/2021/kristinholmjensen.pdf` },
    { date: '2019-12-17', title: 'Kristin Holm Jensen', pdfUrl: `${PDF_BASE}/2019/kristinholmjensen2.pdf` },
    { date: '2019-01-22', title: 'Kristin Holm Jensen', pdfUrl: `${PDF_BASE}/2019/kristinholmjensen.pdf` },
  ],
  'Lotte Grepp Knutsen': [
    { date: '2022-12-07', title: 'Lotte Grepp Knutsen', pdfUrl: `${PDF_BASE}/2022/lottegreppknutsen.pdf` },
  ],
  'Paul Chaffey': [
    { date: '2022-09-07', title: 'Paul Chaffey IV', pdfUrl: `${PDF_BASE}/2022/paulchaffey_iv.pdf` },
    { date: '2022-01-06', title: 'Paul Chaffey III', pdfUrl: `${PDF_BASE}/2022/paulchaffey_iii.pdf` },
    { date: '2021-11-16', title: 'Paul Chaffey II', pdfUrl: `${PDF_BASE}/2021/paulchaffey-ii.pdf` },
    { date: '2021-11-16', title: 'Paul Chaffey I', pdfUrl: `${PDF_BASE}/2021/paulchaffey-i.pdf` },
  ],
  'Audun Halvorsen': [
    { date: '2022-05-27', title: 'Audun Halvorsen III', pdfUrl: `${PDF_BASE}/2022/audunhalvorsen_iii.pdf` },
    { date: '2022-05-12', title: 'Audun Halvorsen II', pdfUrl: `${PDF_BASE}/2022/audunhalvorsen_ii.pdf` },
    { date: '2022-01-07', title: 'Audun Halvorsen', pdfUrl: `${PDF_BASE}/2022/audunhalvorsen.pdf` },
  ],
  'Iselin Nybø': [
    { date: '2022-05-25', title: 'Iselin Nybø III', pdfUrl: `${PDF_BASE}/2022/iselinnybo_iii.pdf` },
    { date: '2022-03-18', title: 'Iselin Nybø II', pdfUrl: `${PDF_BASE}/2022/iselinnybo_ii.pdf` },
    { date: '2022-01-10', title: 'Iselin Nybø - ny vurdering', pdfUrl: `${PDF_BASE}/2022/iselinnybo-ny_vurdering.pdf` },
    { date: '2021-12-01', title: 'Iselin Nybø', pdfUrl: `${PDF_BASE}/2021/iselinnybo.pdf` },
  ],
  'Torbjørn Røe Isaksen': [
    { date: '2022-02-09', title: 'Torbjørn Røe Isaksen - ny vurdering', pdfUrl: `${PDF_BASE}/2022/torbjornroeisaksen-ny_vurdering.pdf` },
    { date: '2022-01-13', title: 'Torbjørn Røe Isaksen', pdfUrl: `${PDF_BASE}/2022/torbjornroeisaksen.pdf` },
  ],
  'Knut Arild Hareide': [
    { date: '2022-01-31', title: 'Knut Arild Hareide', pdfUrl: `${PDF_BASE}/2022/knutarildhareide.pdf` },
  ],
  'Monica Mæland': [
    { date: '2021-12-01', title: 'Monica Mæland - ny vurdering', pdfUrl: `${PDF_BASE}/2021/monicamaeland-ny_vurdering.pdf` },
    { date: '2021-11-09', title: 'Monica Mæland', pdfUrl: `${PDF_BASE}/2021/monicamaeland.pdf` },
  ],
  'John-Ragnar Aarset': [
    { date: '2022-04-26', title: 'John-Ragnar Aarset IV', pdfUrl: `${PDF_BASE}/2022/john-ragnaraarset_iv.pdf` },
    { date: '2022-03-18', title: 'John-Ragnar Aarset III', pdfUrl: `${PDF_BASE}/2022/john-ragnaraarset_iii.pdf` },
    { date: '2022-03-01', title: 'John-Ragnar Aarset II', pdfUrl: `${PDF_BASE}/2022/john-ragnaraarset_ii.pdf` },
    { date: '2021-12-01', title: 'John-Ragnar Aarset', pdfUrl: `${PDF_BASE}/2021/john-ragnaraarset.pdf` },
  ],
  'Odd Emil Ingebrigtsen': [
    { date: '2022-03-14', title: 'Odd Emil Ingebrigtsen VI', pdfUrl: `${PDF_BASE}/2022/oddemilingebrigtsen_vi.pdf` },
    { date: '2022-03-09', title: 'Odd Emil Ingebrigtsen V', pdfUrl: `${PDF_BASE}/2022/oddemilingebrigtsen_v.pdf` },
    { date: '2022-01-13', title: 'Odd Emil Ingebrigtsen IV', pdfUrl: `${PDF_BASE}/2022/oddemilingebrigtsen_iv.pdf` },
    { date: '2022-01-13', title: 'Odd Emil Ingebrigtsen III', pdfUrl: `${PDF_BASE}/2022/oddemilingebrigtsen_iii.pdf` },
    { date: '2022-01-10', title: 'Odd Emil Ingebrigtsen II - ny vurdering', pdfUrl: `${PDF_BASE}/2022/oddemilingebrigtsen_ii_ny_vurdering.pdf` },
    { date: '2021-12-14', title: 'Odd Emil Ingebrigtsen II', pdfUrl: `${PDF_BASE}/2021/oddemilingebrigtsen_ii.pdf` },
    { date: '2021-12-14', title: 'Odd Emil Ingebrigtsen', pdfUrl: `${PDF_BASE}/2021/oddemilingebrigtsen.pdf` },
  ],
  'Terje Søviknes': [
    { date: '2021-08-31', title: 'Terje Søviknes', pdfUrl: `${PDF_BASE}/2021/terjesoviknes.pdf` },
    { date: '2020-08-24', title: 'Terje Søviknes', pdfUrl: `${PDF_BASE}/2020/terjesoviknes.pdf` },
  ],
  'Per Sandberg': [
    { date: '2019-01-16', title: 'Per Sandberg - ny vurdering', pdfUrl: `${PDF_BASE}/2019/persandberg-nyvurdering160119.pdf` },
    { date: '2018-12-19', title: 'Per Sandberg', pdfUrl: `${PDF_BASE}/2018/persandberg191218.pdf` },
    { date: '2018-09-20', title: 'Per Sandberg', pdfUrl: `${PDF_BASE}/2018/persandberg.pdf` },
  ],
  'Ketil Solvik-Olsen': [
    { date: '2018-12-06', title: 'Ketil Solvik-Olsen IV', pdfUrl: `${PDF_BASE}/2018/ketilsolvikolseniv.pdf` },
    { date: '2018-11-30', title: 'Ketil Solvik-Olsen III', pdfUrl: `${PDF_BASE}/2018/ketilsolvikolseniii.pdf` },
    { date: '2018-11-16', title: 'Ketil Solvik-Olsen II', pdfUrl: `${PDF_BASE}/2018/ketilsolvikolsenii.pdf` },
    { date: '2018-11-05', title: 'Ketil Solvik-Olsen I', pdfUrl: `${PDF_BASE}/2018/ketilsolvikolsen.pdf` },
  ],
  'Vidar Helgesen': [
    { date: '2021-08-31', title: 'Vidar Helgesen', pdfUrl: `${PDF_BASE}/2021/vidarhelgesen.pdf` },
  ],
  'Anniken Hauglie': [
    { date: '2021-06-24', title: 'Anniken Hauglie', pdfUrl: `${PDF_BASE}/2021/annikenhauglie.pdf` },
    { date: '2020-04-03', title: 'Anniken Hauglie', pdfUrl: `${PDF_BASE}/2020/annikenhauglie.pdf` },
  ],
  'Trine Skei Grande': [
    { date: '2020-10-14', title: 'Trine Skei Grande II', pdfUrl: `${PDF_BASE}/2020/trineskeigrande_ii.pdf` },
    { date: '2020-09-03', title: 'Trine Skei Grande', pdfUrl: `${PDF_BASE}/2020/trineskeigrande.pdf` },
  ],
  'Tor Mikkel Wara': [
    { date: '2020-01-17', title: 'Tor Mikkel Wara II', pdfUrl: `${PDF_BASE}/2020/tormikkelwaraii.pdf` },
    { date: '2019-04-12', title: 'Tor Mikkel Wara', pdfUrl: `${PDF_BASE}/2019/tormikkelwara.pdf` },
  ],
  'Børge Brende': [
    { date: '2017-09-29', title: 'Børge Brende', pdfUrl: `${PDF_BASE}/2017/borgebrende.pdf` },
  ],
  'Tord Lien': [
    { date: '2017-02-13', title: 'Tord Lien', pdfUrl: `${PDF_BASE}/2017/lien.pdf` },
  ],
  'Thorhild Widvey': [
    { date: '2016-11-28', title: 'Thorhild Widvey III', pdfUrl: `${PDF_BASE}/2016/widvey3.pdf` },
    { date: '2016-07-01', title: 'Thorhild Widvey II', pdfUrl: `${PDF_BASE}/2016/karantenenemnda_thorhild_widvey_2.pdf` },
    { date: '2016-04-28', title: 'Thorhild Widvey I', pdfUrl: `${PDF_BASE}/2016/karantenenemnda_thorhild_widvey.pdf` },
  ],
  'Robert Eriksson': [
    { date: '2016-07-13', title: 'Robert Eriksson II', pdfUrl: `${PDF_BASE}/2016/karantenenemnda_roberteriksson2.pdf` },
    { date: '2016-04-15', title: 'Robert Eriksson', pdfUrl: `${PDF_BASE}/2016/karantenenemnda_robert_eriksson_ny.pdf` },
  ],
  'Sigbjørn Aanes': [
    { date: '2018-04-05', title: 'Sigbjørn Aanes - ny vurdering', pdfUrl: `${PDF_BASE}/2018/sigbjornaanes-ny_vurdering.pdf` },
    { date: '2018-03-22', title: 'Sigbjørn Aanes', pdfUrl: `${PDF_BASE}/2018/sigbjornaanes.pdf` },
  ],
  'Jøran Kallmyr': [
    { date: '2020-03-09', title: 'Jøran Kallmyr', pdfUrl: `${PDF_BASE}/2020/jorankallmyr.pdf` },
    { date: '2016-03-09', title: 'Jøran Kallmyr', pdfUrl: `${PDF_BASE}/2016/karantenenemnda_kallmyr.pdf` },
  ],
  'Harald Tom Nesvik': [
    { date: '2021-06-24', title: 'Harald Tom Nesvik', pdfUrl: `${PDF_BASE}/2021/haraldtomnesvik.pdf` },
    { date: '2020-02-14', title: 'Harald Tom Nesvik', pdfUrl: `${PDF_BASE}/2020/haraldtomnesvik.pdf` },
  ],
  'Fabian Stang': [
    { date: '2021-07-01', title: 'Fabian Stang', pdfUrl: `${PDF_BASE}/2021/fabianstang.pdf` },
  ],
  'Thor Kleppen Sættem': [
    { date: '2022-02-01', title: 'Thor Kleppen Sættem', pdfUrl: `${PDF_BASE}/2022/thorkleppensaettem.pdf` },
  ],
  'Lars Jacob Hiim': [
    { date: '2022-01-13', title: 'Lars Jacob Hiim', pdfUrl: `${PDF_BASE}/2022/larsjacobhiim.pdf` },
  ],
  'Marianne Hagen': [
    { date: '2022-04-05', title: 'Marianne Hagen V', pdfUrl: `${PDF_BASE}/2022/mariannehagen_v.pdf` },
    { date: '2021-08-09', title: 'Marianne Hagen IV', pdfUrl: `${PDF_BASE}/2021/mariannehageniv.pdf` },
    { date: '2021-08-09', title: 'Marianne Hagen III', pdfUrl: `${PDF_BASE}/2021/mariannehageniii.pdf` },
    { date: '2021-03-08', title: 'Marianne Hagen II', pdfUrl: `${PDF_BASE}/2021/mariannehagenii.pdf` },
    { date: '2021-01-29', title: 'Marianne Hagen I', pdfUrl: `${PDF_BASE}/2021/mariannehageni.pdf` },
  ],
  'Gunhild Berge Stang': [
    { date: '2021-10-12', title: 'Gunhild Berge Stang V', pdfUrl: `${PDF_BASE}/2021/gunhildbergestang_v.pdf` },
    { date: '2021-05-06', title: 'Gunhild Berge Stang IV', pdfUrl: `${PDF_BASE}/2021/gunhildbergestang_klargjoring.pdf` },
    { date: '2021-04-16', title: 'Gunhild Berge Stang III', pdfUrl: `${PDF_BASE}/2021/gunhildbergestang_iii.pdf` },
    { date: '2021-04-26', title: 'Gunhild Berge Stang II', pdfUrl: `${PDF_BASE}/2021/gunhildbergestang_ii.pdf` },
    { date: '2021-03-25', title: 'Gunhild Berge Stang I', pdfUrl: `${PDF_BASE}/2021/gunhildbergestang.pdf` },
  ],
  'Ingvil Smines Tybring-Gjedde': [
    { date: '2020-04-29', title: 'Ingvil Smines Tybring-Gjedde II', pdfUrl: `${PDF_BASE}/2020/ingvilsminestybring-gjedde_ii.pdf` },
    { date: '2020-04-03', title: 'Ingvil Smines Tybring-Gjedde - ny vurdering', pdfUrl: `${PDF_BASE}/2020/ingvilsminestybring-gjedde_ny_vurdering.pdf` },
    { date: '2020-03-19', title: 'Ingvil Smines Tybring-Gjedde', pdfUrl: `${PDF_BASE}/2020/ingvilsminestybring-gjedde.pdf` },
  ],
  'Geir-Inge Sivertsen': [
    { date: '2020-04-24', title: 'Geir-Inge Sivertsen II', pdfUrl: `${PDF_BASE}/2020/geiringesivertsenii.pdf` },
    { date: '2020-04-17', title: 'Geir-Inge Sivertsen', pdfUrl: `${PDF_BASE}/2020/geiringesivertsen.pdf` },
  ],
};

// Build a normalized lookup map for case-insensitive matching
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const NORMALIZED_MAP = new Map<string, { name: string; entries: KaranteneEntry[] }>();
for (const [name, entries] of Object.entries(KARANTENE_REGISTRY)) {
  NORMALIZED_MAP.set(normalize(name), { name, entries });
}

export function getKaranteneForPerson(personName: string): KaranteneEntry[] {
  const key = normalize(personName);
  return NORMALIZED_MAP.get(key)?.entries ?? [];
}

function slugify(input: string): string {
  return normalize(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Kept for backward compatibility with the route
export async function getKaranteneDecisions(filters?: { year?: number; person?: string; org?: string }): Promise<KaranteneDecision[]> {
  const results: KaranteneDecision[] = [];
  for (const [name, entries] of Object.entries(KARANTENE_REGISTRY)) {
    if (filters?.person && !normalize(name).includes(normalize(filters.person))) continue;
    for (const entry of entries) {
      const year = parseInt(entry.date.slice(0, 4), 10);
      if (filters?.year && year !== filters.year) continue;
      results.push({
        id: `karantene-${slugify(name)}-${entry.date}`,
        personName: name,
        date: entry.date,
        previousRole: '',
        previousDepartment: '',
        newRole: '',
        newOrganization: '',
        quarantineMonths: 0,
        restrictionMonths: 0,
        reasoning: '',
        pdfUrl: entry.pdfUrl,
        year,
        classification: 'B',
      });
    }
  }
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getKaranteneDecisionsByPersonId(personId: string): Promise<KaranteneDecision[]> {
  // personId is like "person-torbjorn-roe-isaksen" — extract the name part
  const namePart = personId.replace(/^person-/, '').replace(/-/g, ' ');
  return getKaranteneDecisions({ person: namePart });
}
