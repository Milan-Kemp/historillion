# Voorstel: 7 vragen voor controle (nog niet in de game)

Status bronnen: de lijstpagina's bij elke vraag bestaan (via zoekopdracht gecontroleerd). Ik heb de pagina's zelf nog niet helemaal gelezen. De feiten komen uit mijn kennis, jij controleert ze. Bronnen per antwoord vul ik aan na jouw akkoord op de vragen.

`prior_share` zijn mijn schattingen, jij past ze aan. Samen blijft het onder 1,0: de rest is de staart van zeldzame geldige antwoorden die niet in de lijst staan.

## Q1. Name a Roman emperor.
Bron: https://www.britannica.com/topic/list-of-Roman-emperors-2043294

| Antwoord | prior_share | Opmerking |
|---|---|---|
| Nero | 0.25 | |
| Augustus | 0.17 | eerste keizer, 27 v.Chr. |
| Caligula | 0.12 | |
| Constantine | 0.08 | alias: Constantine the Great |
| Marcus Aurelius | 0.07 | |
| Hadrian | 0.07 | |
| Trajan | 0.04 | |
| Claudius | 0.04 | |
| Commodus | 0.03 | |
| Diocletian | 0.02 | |
| Vespasian | 0.015 | |
| Tiberius | 0.015 | |
| Elagabalus | 0.01 | alias: Heliogabalus |

Valkuil: Julius Caesar was nooit keizer. Hij is waarschijnlijk het meest gegeven fout antwoord. Voorstel: 0 punten, met de uitleg "Caesar was a dictator, not an emperor".

## Q2. Name a republic of the Soviet Union.
Bron: https://www.britannica.com/place/Soviet-Union

| Antwoord | prior_share |
|---|---|
| Russia | 0.28 |
| Ukraine | 0.22 |
| Kazakhstan | 0.10 |
| Belarus (alias Belorussia, Byelorussia) | 0.08 |
| Georgia | 0.06 |
| Uzbekistan | 0.04 |
| Latvia | 0.03 |
| Lithuania | 0.03 |
| Estonia | 0.03 |
| Armenia | 0.025 |
| Azerbaijan | 0.02 |
| Moldova (alias Moldavia) | 0.015 |
| Kyrgyzstan (alias Kirgiziya) | 0.01 |
| Tajikistan | 0.01 |
| Turkmenistan | 0.01 |

Volledig: dit zijn alle 15 unierepublieken (vanaf 1956).

## Q3. Name a pharaoh of ancient Egypt.
Bron: https://www.britannica.com/topic/list-of-pharaohs-of-ancient-Egypt

| Antwoord | prior_share | Opmerking |
|---|---|---|
| Tutankhamun | 0.30 | aliases: King Tut, Tut |
| Ramesses II | 0.25 | aliases: Ramses II, Rameses the Great |
| Cleopatra | 0.15 | Cleopatra VII, Ptolemaeïsche periode, staat in de lijst |
| Khufu | 0.06 | alias: Cheops |
| Hatshepsut | 0.06 | |
| Akhenaten | 0.04 | |
| Thutmose III | 0.02 | |
| Seti I | 0.01 | |
| Djoser | 0.01 | alias: Zoser |

Valkuil: Nefertiti is niet opgenomen. Ze was koningin; of ze zelf farao was (als Neferneferuaten) is onder historici omstreden. Voorstel: weglaten en bij 0 punten uitleggen.

## Q4. Name a battle of World War II.
Bron: https://www.britannica.com/summary/World-War-II (aanvulling: https://en.wikipedia.org/wiki/List_of_World_War_II_battles)

| Antwoord | prior_share | Opmerking |
|---|---|---|
| Battle of Stalingrad | 0.22 | |
| D-Day / Battle of Normandy | 0.18 | aliases: Normandy, D-Day, Normandy landings |
| Battle of Britain | 0.08 | |
| Battle of Midway | 0.08 | |
| Pearl Harbor | 0.08 | een aanval, geen veldslag; Wikipedia noemt het "attack". Beslissen of dit telt |
| Battle of the Bulge | 0.05 | |
| Battle of Kursk | 0.04 | |
| Battle of Berlin | 0.04 | |
| Dunkirk | 0.04 | evacuatie, onderdeel van Battle of France |
| Iwo Jima | 0.04 | |
| El Alamein | 0.03 | |
| Guadalcanal | 0.015 | |
| Monte Cassino | 0.01 | |
| Okinawa | 0.01 | |

## Q5. Name a wife of Henry VIII.
Bron: https://www.britannica.com/topic/The-six-wives-of-Henry-VIII

| Antwoord | prior_share |
|---|---|
| Anne Boleyn | 0.40 |
| Catherine of Aragon | 0.25 |
| Jane Seymour | 0.12 |
| Anne of Cleves | 0.08 |
| Catherine Howard | 0.07 |
| Catherine Parr | 0.06 |

Let op voor de matching: "Catherine" alleen is dubbelzinnig (drie vrouwen), "Anne" ook (twee). Voorstel: geen alias voor alleen de voornaam, en 0 punten met melding "which one?". Dit is ook een goede test voor de fuzzy match.

## Q6. Name a Chinese dynasty.
Bron: https://www.britannica.com/video/226654/learn-about-Chinas-six-ruling-dynasties (wordt vervangen door een betere lijstpagina, deze is dun)

| Antwoord | prior_share |
|---|---|
| Ming | 0.28 |
| Qing | 0.18 (alias: Ch'ing, Manchu) |
| Han | 0.15 |
| Tang | 0.12 |
| Song | 0.07 (alias: Sung) |
| Qin | 0.05 (alias: Ch'in) |
| Zhou | 0.03 (alias: Chou) |
| Shang | 0.03 |
| Yuan | 0.03 |
| Xia | 0.01 |
| Sui | 0.01 |

Let op: "dynasty" erachter typen ("Ming dynasty") moet werken. Ik haal dat woord bij het normaliseren weg bij deze vraag, via een optioneel veld per vraag.

## Q7. Name an explorer from the Age of Discovery (c. 1400 to 1600).
Bron: https://www.britannica.com/topic/list-of-explorers-2031946

| Antwoord | prior_share | Opmerking |
|---|---|---|
| Christopher Columbus | 0.40 | |
| Ferdinand Magellan | 0.20 | |
| Vasco da Gama | 0.12 | |
| Amerigo Vespucci | 0.04 | |
| Bartolomeu Dias | 0.03 | |
| Pedro Alvares Cabral | 0.02 | |
| Vasco Nunez de Balboa | 0.02 | |
| John Cabot | 0.02 | |
| Jacques Cartier | 0.01 | |

Valkuil: Marco Polo (13e eeuw) en James Cook (18e eeuw) vallen buiten de periode. Ze krijgen 0 punten met uitleg. De afbakening "c. 1400 to 1600" staat daarom in de vraag.

## Dekking in tijd en plaats
Rome (1e tot 5e eeuw), Egypte (3000 v.Chr. tot 30 v.Chr.), Tudor Engeland (16e eeuw), Ontdekkingsreizen (15e-16e eeuw), China (2000 v.Chr. tot 1912), WOII (1939-1945), Sovjet-Unie (1922-1991). Veel Europa, 1 keer China. Zeg het als je meer spreiding wilt (Afrika, Amerika, Midden-Oosten ontbreken).
