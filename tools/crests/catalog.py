#!/usr/bin/env python3
"""Opponent crest catalogue builder (SCD:ASSET RESEARCH_REAL_ASSET / KEEP_ENHANCE).

Rebuilds config/scd-opponent-crests.v1.json and the crest entries of config/scd-assets.v1.json from:
  * the official calendar snapshot (apps/superapp/src/data/calendario-snapshot-20261010.json): every
    distinct opponent and the fixture ids it appears in;
  * ORIGINALS: the real crest files collected from the club's own Drive or the opponent's official page
    (kept outside the repo, passed with --originals-root);
  * TUTTOCAMPO: team pages found with web search (tuttocampo blocks automated download, URL kept as reference).

Rules: a crest is never drawn, generated, traced or recoloured. The only transform is the KEEP_ENHANCE one
already used for the first batch: crop a uniform white/transparent frame (never the artwork, 4% padding kept),
downscale to max 256 px, encode as LOSSLESS WebP (format_policy: no lossy re-encode of marks). When no real
file is available the entry stays MISSING and the app shows the neutral initials shield.

Usage: python3 -I tools/crests/catalog.py --originals-root <dir> [--check]
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import OrderedDict

from PIL import Image, ImageChops

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = "apps/superapp/src/data/calendario-snapshot-20261010.json"
CREST_REGISTRY = "config/scd-opponent-crests.v1.json"
ASSET_REGISTRY = "config/scd-assets.v1.json"
OUT_DIR = "apps/superapp/public/media/crests"
TODAY = "2026-10-13"
LICENCE = "club trademark, used nominatively in fixture lists"
TRANSFORM = ("KEEP_ENHANCE: crop uniform white/transparent frame only (4% padding), downscale to max 256 px, "
             "lossless WebP; no redraw, no colour change")
DRIVE_FOLDER = "SCD Drive: ufficio stampa/LOGHI SQUADRE CAMPIONATI"

# Calendar rows that are tournaments/events, not opponent clubs.
NOT_A_CLUB = re.compile(r"MEMORIAL|TORNEO|TROFEO|COPPA ", re.I)

FB = "https://www.facebook.com/"

# slug -> original file (relative to --originals-root), public source, source kind.
ORIGINALS = {
    # first batch (official Facebook page pictures, 2026-10-13)
    "casati-arcore": ("crests-dl/casati-arcore.fb.img", None, None),
    "alto-lario": ("crests-dl/alto-lario.fb.img", None, None),
    "ardita-cittadella": ("crests-dl/ardita-cittadella.fb.img", None, None),
    "ardor-lazzate": ("crests-dl/ardor-lazzate.fb.img", None, None),
    "ars-rovagnate": ("crests-dl/ars-rovagnate.fb.img", None, None),
    "aurora-pro-patria": ("crests-dl/aurora-pro-patria.fb.img", None, None),
    "aurora-san-francesco": ("crests-dl/aurora-san-francesco.fbprof.img", None, None),
    "bulgaro": ("crests-dl/bulgaro.fb.img", None, None),
    "cob-91": ("crests-dl/cob-91.fb.img", None, None),
    "calcio-canegrate": ("crests-dl/calcio-canegrate.fb.img", None, None),
    "calcio-lecco": ("crests-dl/calcio-lecco.fb.img", None, None),
    "cantu-san-paolo": ("crests-dl/cantu-san-paolo.fb.img", None, None),
    "casatese-merate": ("crests-dl/casatese-merate.fb.img", None, None),
    "cassina-rizzardi": ("crests-dl/cassina-rizzardi.fb.img", None, None),
    "castellanzese": ("crests-dl/castellanzese.fb.img", None, None),
    "chiavennese": ("crests-dl/chiavennese.fb.img", None, None),
    "cisanese": ("crests-dl/cisanese.fb.img", None, None),
    "cortenova": ("crests-dl/cortenova.fb.img", None, None),
    "cosio-valtellino": ("crests-dl/cosio-valtellino.fb.img", None, None),
    "costamasnaga": ("crests-dl/costamasnaga.fb.img", None, None),
    "delebio": ("crests-dl/delebio.fb.img", None, None),
    "grentarcadia": ("crests-dl/grentarcadia.fb.img", None, None),
    "gso-ballabio": ("crests-dl/gso-ballabio.fb.img", None, None),
    "lentatese": ("crests-dl/lentatese.fb.img", None, None),
    "leon": ("crests-dl/leon.fb.img", None, None),
    "luciano-manara": ("crests-dl/luciano-manara.fb.img", None, None),
    "mariano-calcio": ("crests-dl/mariano.fb.img", None, None),
    "meda-1913": ("crests-dl/meda.fb.img", None, None),
    "mese": ("crests-dl/ac-mese.fb.img", None, None),
    "nuova-sondrio": ("crests-dl/nuova-sondrio.fb.img", None, None),
    "osgb-merate": ("crests-dl/osgb-merate.fb.img", None, None),
    "olginatese": ("crests-dl/olginatese.fb.img", None, None),
    "olympic-morbegno": ("crests-dl/olympic-morbegno.fb.img", None, None),
    "piantedo": ("crests-dl/piantedo.fb.img", None, None),
    "pol-mandello": ("crests-dl/pol-mandello.fb.img", None, None),
    "real-milano": ("crests-dl/real-milano.fb.img", None, None),
    "sala-galbiate": ("crests-dl/sala-galbiate.fb.img", None, None),
    "sirtorese": ("crests-dl/sirtorese.fb.img", None, None),
    "varese": ("crests-dl/varese-fc.fb.img", None, None),
    "varesina": ("crests-dl/varesina-sport.fb.img", None, None),
    "vibe-ronchese": ("crests-dl/vibe-ronchese.fb.img", None, None),
    "vigor-milano": ("crests-dl/vigor-milano.fb.img", None, None),
    "vis-nova-giussano": ("crests-dl/vis-nova-giussano.fb.img", None, None),
    # second batch: club's own Drive
    "penta-piateda": ("dl/penta-piateda.jpg",
                      f"{DRIVE_FOLDER}/A.S.D. Penta Piateda.jpg (1Vp27_eBQdRZ_59nrQzBwFvhSlTSNhq6j)", "SCD_DRIVE"),
    "alta-brianza-tavernerio": ("dl/alta-brianza-tavernerio.jpg",
                                f"{DRIVE_FOLDER}/ALTA BRIANZA TAVERNERIO.jpg (1Jl2F6-OXCr8pTqQVj9h9Mh4eKRQTq0jJ)", "SCD_DRIVE"),
    # second batch: official Facebook page pictures (Graph picture by page id)
    "biassono": ("crests-dl2/biassono.fb.img", FB + "acbiassono", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "rovinata": ("crests-dl2/rovinata-b.fb.img", FB + "p/ASD-POL-ROVINATA-100070857826861/", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "pontelambrese": ("crests-dl2/pontelambrese-b.fb.img", FB + "p/ASD-Pontelambrese-100046242326365/", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "lesmo": ("crests-dl2/lesmo-b.fb.img", FB + "p/FC-Lesmo-Monza-e-Brianza-100082565132404/", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "arcellasco-citta-di-erba": ("crests-dl2/a2.fb.img", FB + "gsdarcellasco", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "di-po": ("crests-dl2/di1.fb.img", FB + "dipovimercatesecalcio", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "dubino": ("crests-dl2/du1.fb.img", FB + "usdubino", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "valmadrera-cg": ("crests-dl2/valmadrera.fb.img", FB + "1676879909208866", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    "valmadrera": ("crests-dl2/valmadrera.fb.img", FB + "1676879909208866", "OFFICIAL_FACEBOOK_PAGE_PICTURE"),
    # third batch (2026-10-15): official club websites; composite images only had the crest area cut out
    "lissone-calcio": ("crests3/lissone-logo.png", "https://www.aclissone.it/prima-squadra/", "OFFICIAL_CLUB_WEBSITE"),
    "la-dominante": ("crests3/la-dominante.png", "https://ladominante1929.wixsite.com/calcio", "OFFICIAL_CLUB_WEBSITE"),
    "gso-missaglia": ("crests3/gso-missaglia.png", "https://chiesadimissaglia.it/attivita/sport.html", "OFFICIAL_CLUB_WEBSITE"),
    "cinisello": ("crests3/cinisello.png", "https://www.fccinisello1945.it/societa.aspx", "OFFICIAL_CLUB_WEBSITE"),
    # fourth batch (2026-10-15): files supplied by the SCD Direzione (no public URL); overrides earlier keys
    "rovellasca": ("direzione-20261015/1633/stemmi/rovellasca.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): rovellasca.png", "SCD_DIREZIONE_SUPPLIED"),
    "civate": ("direzione-20261015/1633/stemmi/civate.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): civate.png", "SCD_DIREZIONE_SUPPLIED"),
    "base-96": ("direzione-20261015/1633/stemmi/base96.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): base96.png", "SCD_DIREZIONE_SUPPLIED"),
    "castello-citta-di-cantu": ("direzione-20261015/1633/stemmi/castello-cantu.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): castello-cantu.png", "SCD_DIREZIONE_SUPPLIED"),
    "grentarcadia": ("direzione-20261015/1633/stemmi/grentarcadia.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): grentarcadia.png", "SCD_DIREZIONE_SUPPLIED"),
    "vibe-ronchese": ("direzione-20261015/1633/stemmi/vibe-ronchese.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): vibe-ronchese.png", "SCD_DIREZIONE_SUPPLIED"),
    "lesmo": ("direzione-20261015/1633/stemmi/lesmo.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:33 (fornito dalla Direzione SCD 15/10/2026): lesmo.png", "SCD_DIREZIONE_SUPPLIED"),
    "speranza-agrate": ("direzione-20261015/1634/stemmi/speranza-agrate.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): speranza-agrate.png", "SCD_DIREZIONE_SUPPLIED"),
    "san-pellegrino": ("direzione-20261015/1634/stemmi/san-pellegrino.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): san-pellegrino.png", "SCD_DIREZIONE_SUPPLIED"),
    "tritium": ("direzione-20261015/1634/stemmi/tritium.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): tritium.png", "SCD_DIREZIONE_SUPPLIED"),
    "lemine-almenno": ("direzione-20261015/1634/stemmi/lemine-almenno.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): lemine-almenno.png", "SCD_DIREZIONE_SUPPLIED"),
    "fiorente-colognola": ("direzione-20261015/1634/stemmi/fiorente-colognola.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): fiorente-colognola.png", "SCD_DIREZIONE_SUPPLIED"),
    "aurora-seriate": ("direzione-20261015/1634/stemmi/aurora-seriate.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): aurora-seriate.png", "SCD_DIREZIONE_SUPPLIED"),
    "arcellasco-citta-di-erba": ("direzione-20261015/1634/stemmi/arcellasco.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): arcellasco.png", "SCD_DIREZIONE_SUPPLIED"),
    "alta-brianza-tavernerio": ("direzione-20261015/1634/stemmi/alta-brianza.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): alta-brianza.png", "SCD_DIREZIONE_SUPPLIED"),
    "citta-di-albino": ("direzione-20261015/1634/stemmi/citta-di-albino.png",
        "Supplied by the SCD Direzione on 2026-10-15 16:34 (fornito dalla Direzione SCD 15/10/2026): citta-di-albino.png", "SCD_DIREZIONE_SUPPLIED"),
}

NOTES = {
    "biassono": "Page 'ACD Biassono' (A.C.D. Biassono 1950).",
    "rovinata": "Page 'A.S.D. POL ROVINATA' (Oratorio di Germanedo), page id 190186824359036.",
    "pontelambrese": "Page 'ASD Pontelambrese' (1974), page id 1422382228024547; same crest also in SCD Drive (pontambrese.png).",
    "lesmo": "Page 'FC Lesmo Monza e Brianza', page id 103121329109348.",
    "arcellasco-citta-di-erba": "Page 'Gsd Arcellasco - Città di Erba' (1978); same crest also in SCD Drive.",
    "di-po": "Page 'DI.PO. Calcio' (Dipo Vimercatese 1945).",
    "dubino": "Page 'US Dubino' (1975).",
    "valmadrera-cg": "Page 'Polisportiva Valmadrera 1974' = Polisportiva Centro Giovanile Valmadrera; picture is the badge on its own background, used as published.",
    "valmadrera": "INFERRED same club as 'VALMADRERA C.G. POL.' (the only FIGC club of Valmadrera, tuttocampo ValmadreraCG 67527).",
    "penta-piateda": "Logo collected by the SCD press office.",
    "alta-brianza-tavernerio": "Logo collected by the SCD press office (a larger PNG is also in the same folder).",
    "academy-casatese-merate": "Crest present in SCD Drive but not imported here (file too large for this environment's transfer); export it at 256 px and add it.",
    "castello-citta-di-cantu": "Crest present in SCD Drive but not imported here (file too large for this environment's transfer); official site castellocittadicantu.it only shows it inside a banner.",
    "bellagina": "Official page 'U.S. Bellagina' (page id 260878517323776) has no picture; SCD Drive has an unlabelled 'BELLAGIO.jpg' to be confirmed by the Direzione.",
    "futura-zanetti": "Only 'A.S.D. Zanetti' (ZANETTI 1948) page found, name differs and picture is cropped: not used. "
                      "2026-10-15: club born in 2026 from the Pol. Futura 96 + Osvaldo Zanetti merger; no official site or crest published yet.",
    "lissone-calcio": "Official site 'WeAreACLISSONE' (aclissone.it): header crest AC-L_logo.png 2432x2432 RGBA, used as published. "
                      "Identity: its 'Partite promozione' calendar lists the ColicoDerviese fixtures; golee.it lists 'Lissone Calcio SSD A.R.L.' under the AC Lissone club page.",
    "la-dominante": "Calcio site of ASD La Dominante Monza (linked from ladominante.it). The crest is the left element of the site header banner "
                    "(1080x168 JPEG); only the crest area was cut out of the banner, the crest itself is untouched. Small original (about 94x124 px): "
                    "replace with a larger official file when available.",
    "gso-missaglia": "Page 'Gruppo Sportivo Oratori Missaglia - GSOM' on the parish site that hosts the club (Via Roma 3, Missaglia). The crest is the left "
                     "element of the club letterhead image GSO.jpg (680x160); only the crest area was cut out, the crest itself is untouched. "
                     "Small original (about 128x120 px).",
    "cinisello": "Official site of FC Cinisello Calcio 1945 (Via Cilea 50, plays at Stadio Gaetano Scirea, the venue of the calendar fixture). "
                 "The crest is the left element of the site title image (343x104 RGBA); only the crest area was cut out. The site is old "
                 "(Eccellenza-era pages) and the original is small (68x80 px): the Direzione should confirm it is still the current crest.",
    "san-giorgio": "FIGC Lecco lists two clubs: 'GSO SAN GIORGIO' (Casatenovo) and 'SAN GIORGIO' (San Giorgio Molteno / Pol. D. San Giorgio MoltenoBrongio). "
                   "The calendar name matches the second; its only crest pages found (Facebook, accademiacalciocomo.com) are not readable by the web tools. "
                   "Do NOT use the GSO San Giorgio Casatenovo crest.",
    "fucina-di-muggio": "Club renamed back to F.C.D. Muggio (bepitv.it 'La Fucina cambia volto: nasce l'F.C.D. Muggio'): crest to confirm for 2026/27; "
                        "no official site found, Instagram/Facebook not readable.",
    "vercurago": "Calcio Vercurago A.S.D. (CONI registry 53816): no official website found; Facebook/Instagram not readable by the web tools.",
    "rogeno": "Gruppo Sportivo Rogeno (Oratorio Pio XI): no official website found; Facebook not readable by the web tools.",
    "accademia-varesina": "A.S.D. Accademia Varesina (CONI registry 22643) is a club distinct from Varesina Sport (derby reported on varesinacalcio.it): "
                          "do not reuse the Varesina crest; no official site found.",
    # fourth batch (2026-10-15), Direzione-supplied files
    "rovellasca": "S.C. Rovellasca 1910.",
    "civate": "A.S.D. Civate 2014.",
    "base-96": "Base 96.",
    "castello-citta-di-cantu": "G.S.O. Castello Città di Cantù 1999; file supplied by the Direzione (was MISSING).",
    "grentarcadia": "Replaced 2026-10-15 (same crest, higher-quality file); previous file came from https://www.facebook.com/asdgrentarcadia.",
    "vibe-ronchese": "Full crest with the 'VIBE RONCHESE' ring; the earlier Facebook picture was a crop of the same mark. Replaced 2026-10-15 (same crest, higher-quality file); previous file came from https://www.facebook.com/viberonchese.",
    "lesmo": "Page 'FC Lesmo Monza e Brianza', page id 103121329109348. Replaced 2026-10-15 (same crest, higher-quality file); previous file came from https://www.facebook.com/p/FC-Lesmo-Monza-e-Brianza-100082565132404/.",
    "speranza-agrate": "Speranza Agrate 1972.",
    "san-pellegrino": "U.S. Calcio San Pellegrino 1922. Small original (200x200 px): replace with a larger official file when available.",
    "tritium": "Tritium 1908.",
    "lemine-almenno": "Lemine Almenno Calcio A.S.D.",
    "fiorente-colognola": "Fiorente 1946 Colognola (Bergamo). Badge on its own light background, used as supplied.",
    "aurora-seriate": "Aurora Seriate 1967.",
    "arcellasco-citta-di-erba": "G.S.D. Arcellasco Città di Erba 1978; the earlier Facebook picture showed the same crest on a red circle. White background kept as supplied. Replaced 2026-10-15 (same crest, higher-quality file); previous file came from https://www.facebook.com/gsdarcellasco.",
    "alta-brianza-tavernerio": "Alta Brianza Calcio 1951 (Tavernerio); the earlier Drive JPEG had the bottom of the crest cut off. Replaced 2026-10-15 (same crest, higher-quality file); previous file came from https://drive.google.com/file/d/1Jl2F6-OXCr8pTqQVj9h9Mh4eKRQTq0jJ/view.",
    "citta-di-albino": "CDA Città di Albino 2024.",
}

# Crest files the club's press office already holds (for provenance / manual import).
DRIVE_FILES = {
    "casati-arcore": "A.CASATI CALCIO ARCORE U.S..png (1ysmPo2pfVKQVVXxz6BrecoM6_sJcfQoB)",
    "cisanese": "CISANESE A.S.D..jpg (19-_3dl56O8lE7J1ex-D06vR5AqLA1Jcg)",
    "sala-galbiate": "A.S.D. Sala Galbiate 1974.jpg (1lNZK8h52L66TTx8Fv2pXxD7bfGrydewX)",
    "meda-1913": "A.C. Meda 1913 A.S.D..png (1W96ws2crfCAkh9g2N9irU7CaJ0REJc5p)",
    "vibe-ronchese": "VIBE RONCHESE A.S.D..png (10z5XAkFDPbUXHu38HrxtFRIRarvwAuy5)",
    "ars-rovagnate": "ARS ROVAGNATE.png (1DW61S-ZsfUufVIZQecbNFNaoR7LVzigE)",
    "luciano-manara": "LUCIANO MANARA.png (1bM_bvfqEMhV1akemJq3BMYMydx00kshF)",
    "nuova-sondrio": "Nuova Sondrio Calcio.png (1D3tFpwanXj8O9nS6-fXWyc9e0cJmgNzI)",
    "cortenova": "Cortenova A.S.D..png (1QOIOumo7wMq5LOySeBZOixmzc5RFTVHa)",
    "olginatese": "olginatese.jpg (1MNzBak0mrJ5yHtu67cGdRmjSCED4JVdi)",
    "olympic-morbegno": "ASR    OLYMPIC MORBEGNO.png (1P7y_xJH750fl7CKuzn-mytaf61lsaADQ, folder Loghi Promozione Coppa Lombarda)",
    "academy-casatese-merate": "ACADEMY CASATESE MERATE U.S.D..png (1NtZ5AvlR1Lm1XnTqm3k7Khj7EhEIceoh)",
    "arcellasco-citta-di-erba": "G.S.D. Arcellasco Città di Erba.png (1pyKAqgcrGpAgX_dkuqWRqU0ZX5fC2hzk)",
    "castello-citta-di-cantu": "CASTELLO CITTA DI CANTU ASDGSO.png (10PJ9ewD0a5p0Vigbxn-3pEEs2d6H7Q-z)",
    "pontelambrese": "pontambrese.png (1Ui4j9JdREZ6WnrGsjCECtKbk0SV_Gy_a)",
    "alta-brianza-tavernerio": "ALTA BRIANZA TAVERNERIO.png (169FIwa0CDtt-NfC8p17Uxqkm2IseTIjt)",
    "penta-piateda": "A.S.D. Penta Piateda.jpg (1Vp27_eBQdRZ_59nrQzBwFvhSlTSNhq6j)",
}

TC = "https://www.tuttocampo.it/"
TUTTOCAMPO = {
    "academy-casatese-merate": "Lombardia/AllieviRegionaliU17/GironeC/Squadra/AcademyCasateseMerate/1137724/Scheda",
    "accademia-varesina": "Lombardia/Pulcini7c7/Girone33Primavera1AnnoVarese/Squadra/AccademiaVaresina/1026850/Scheda",
    "alta-brianza-tavernerio": "Lombardia/Eccellenza/GironeA/Squadra/AltabrianzaTavernerio/675772/Scheda",
    "alto-lario": "Lombardia/PrimaCategoria/GironeF/Squadra/AltoLarioCalcio/935536/Scheda",
    "arcellasco-citta-di-erba": "Lombardia/Esordienti9c9/GironeAUnder12PrimaverileComo/Squadra/ArcellascoCittaDiErba/1181616/Scheda",
    "ardita-cittadella": "Lombardia/PrimaCategoria/GironeA/Squadra/ArditaCittadella1934/81718/Scheda",
    "ardor-lazzate": "Lombardia/JunioresEliteU19/GironeB/Squadra/ArdorLazzate/1000914/Scheda",
    "ars-rovagnate": "Lombardia/Allievi/GironeAProvincialiFasePrimaverileLecco/Squadra/ArsRovagnate/1050660/Scheda",
    "aurora-pro-patria": "Lombardia/Pulcini7c7/Girone281Anno/Squadra/AuroraProPatria1919/1145889/Scheda",
    "aurora-san-francesco": "Lombardia/SecondaCategoria/GironeLLegnano/Squadra/AuroraSanFrancesco/74448/Scheda",
    "bellagina": "Lombardia/PrimaCategoria/GironeC/Squadra/Bellagina/6000/Scheda",
    "biassono": "Lombardia/Promozione/GironeD/Squadra/Biassono/3850/Scheda",
    "bulgaro": "Lombardia/PrimaCategoria/GironeB/Squadra/Bulgaro/675327/Scheda",
    "calcio-canegrate": "Lombardia/Promozione/GironeC/Squadra/CalcioCanegrate/917291/Scheda",
    "calcio-lecco": "Italia/Juniores/GironeBNazionali/Squadra/CalcioLecco1912/1001127/Scheda",
    "cantu-san-paolo": "Lombardia/Promozione/GironeB/Squadra/CantuSanPaolo/1136055/Scheda",
    "casati-arcore": "Squadra/CasatiArcore/675757/Scheda",
    "casatese-merate": "Italia/SerieD/GironeB/Squadra/CasateseMerate/71198/Stadio",
    "cassina-rizzardi": "Lombardia/PrimaCategoria/GironeA/Squadra/CassinaRizzardi/1000652/Scheda",
    "castellanzese": "Italia/SerieD/GironeD/Squadra/Castellanzese1921/930022/Scheda",
    "castello-citta-di-cantu": "Lombardia/Esordienti9c9/GironeAComo/Squadra/CastelloCittaDiCantu/1098438/Scheda",
    "chiavennese": "Lombardia/PrimaCategoria/GironeF/Squadra/Chiavennese/12680/Scheda",
    "cinisello": "Squadra/Cinisello/80965/Scheda",
    "cisanese": "Lombardia/Eccellenza/GironeB/Squadra/Cisanese/13060/Scheda",
    "cob-91": "Lombardia/PrimaCategoria/GironeM/Squadra/Cob91/79921/Scheda",
    "cortenova": "Lombardia/SecondaCategoria/GironeUSondrio/Squadra/Cortenova/81790/Scheda",
    "cosio-valtellino": "Lombardia/SecondaCategoria/GironeVSondrio/Squadra/CosioValtellino/64565/Scheda",
    "costamasnaga": "Lombardia/PrimaCategoria/GironeD/Squadra/Costamasnaga/1000639/Scheda",
    "delebio": "Squadra/Delebio/15280/Scheda",
    "di-po": "Lombardia/PrimaCategoria/GironeC/Squadra/DiPoVimercatese/73305/Scheda",
    "dubino": "Lombardia/SecondaCategoria/GironeXSondrio/Squadra/Dubino/76265/Scheda",
    "fucina-di-muggio": "Lombardia/Promozione/GironeB/Squadra/Muggio/1000435/Scheda",
    "futura-zanetti": "Lombardia/TerzaCategoria/GironeALecco/Squadra/OZanetti/675349/Scheda",
    "grentarcadia": "Lombardia/Promozione/GironeB/Squadra/Grentarcadia/1163797/Scheda",
    "gso-ballabio": "Lombardia/GiovanissimiProvincialiU15/GironeALecco/Squadra/GsoBallabio/1165206/Scheda",
    "la-dominante": "Lombardia/GiovanissimiRegionaliU15/GironeB/Squadra/LaDominante/1051076/Scheda",
    "lentatese": "Lombardia/Eccellenza/GironeA/Squadra/Lentatese/26060/Scheda",
    "leon": "Italia/SerieD/GironeB/Squadra/Leon/68303/Scheda",
    "lesmo": "Lombardia/Promozione/GironeB/Squadra/Lesmo/1057148/Scheda",
    "lissone-calcio": "Lombardia/Promozione/GironeD/Squadra/Lissone/62922/Scheda",
    "luciano-manara": "Lombardia/Eccellenza/GironeB/Squadra/LucianoManara/28710/Scheda",
    "mariano-calcio": "Lombardia/Promozione/GironeD/Squadra/MarianoCalcio/64834/Scheda",
    "meda-1913": "Lombardia/Promozione/GironeB/Squadra/Meda1913/932494/Scheda",
    "mese": "Lombardia/GiovanissimiProvincialiU15/GironeUnicoSondrio/Squadra/Mese/1008090/Scheda",
    "nuova-sondrio": "Lombardia/GiovanissimiRegionaliU15/GironeC/Squadra/NuovaSondrioCalcio/1137682/Scheda",
    "olginatese": "Lombardia/Eccellenza/GironeB/Squadra/Olginatese/60228/Scheda",
    "olympic-morbegno": "Lombardia/PrimaCategoria/GironeC/Squadra/OlympicMorbegno/1034432/Scheda",
    "osgb-merate": "Lombardia/GiovanissimiProvincialiU15/GironeCLecco/Squadra/OSGBMerate/1124800/Scheda",
    "penta-piateda": "Lombardia/SecondaCategoria/GironeUSondrio/Squadra/PentaPiateda/1022954/Scheda",
    "piantedo": "Lombardia/SecondaCategoria/GironeVSondrio/Squadra/Piantedo/930010/Scheda",
    "pol-mandello": "Lombardia/SecondaCategoria/GironeLLegnano/Squadra/Mandello/64292/Scheda",
    "pontelambrese": "Lombardia/Promozione/GironeB/Squadra/Pontelambrese/675011/Scheda",
    "real-milano": "Lombardia/PrimaCategoria/GironeL/Squadra/RealMilano/917106/Stadio",
    "rovinata": "Lombardia/SecondaCategoria/GironeJLecco/Squadra/Rovinata/675271/Scheda",
    "sala-galbiate": "Lombardia/AllieviRegionaliU17/GironeCoppaLombardiaAllievi/Squadra/SalaGalbiate1974/1100304/Scheda",
    "sirtorese": "Lombardia/SecondaCategoria/GironeLLecco/Squadra/Sirtorese/73987/Scheda",
    "valmadrera": "Squadra/ValmadreraCG/67527/Scheda",
    "valmadrera-cg": "Squadra/ValmadreraCG/67527/Scheda",
    "varese": "Italia/SerieD/GironeA/Squadra/VareseFC/1097763/Scheda",
    "varesina": "Italia/SerieD/GironeD/Squadra/Varesina/932361/Scheda",
    "vercurago": "Lombardia/TerzaCategoria/GironeALecco/Squadra/Vercurago/206432/Scheda",
    "vibe-ronchese": "Lombardia/Promozione/GironeC/Squadra/VibeRonchese/1000423/Scheda",
    "vigor-milano": "Lombardia/AllieviRegionaliU17/GironeB/Squadra/VigorMilano/1138665/Scheda",
    "vis-nova-giussano": "Lombardia/Eccellenza/GironeA/Squadra/VisNovaGiussano/675786/Scheda",
}

# Normalisation mirrored from apps/superapp/src/lib/crests.ts (normalizeOpponentName).
SUFFIX_RE = re.compile(r"\b(?:A\.?\s?S\.?\s?D\.?C?|S\.?\s?S\.?\s?D\.?(?:\s?A\s?R\s?L|ARL)?|S\.?\s?R\.?\s?L\.?|U\.?\s?S\.?\s?D\.?|A\.?\s?C\.?\s?D\.?|G\.?\s?S\.?\s?D\.?|A\.?\s?D\.?|POL\.?|SSDARL|ASD|SSD|ARL)\b\.?")
SQUAD_RE = re.compile(r"\s*(?:[-–·]\s*)?\bSQ\.?\s?[A-Z]\b\.?")


def normalize(raw):
    s = unicodedata.normalize("NFD", raw or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"SQ\.?\s?B\b", " SQ.B", s)
    s = SQUAD_RE.sub(" ", s)
    s = SUFFIX_RE.sub(" ", s)
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def trim_uniform_border(im, tol=18):
    """Crop only a uniform white/transparent frame (never the artwork); keep 4% padding."""
    if im.mode == "RGBA":
        bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox is None:
            return im
    else:
        if min(im.getpixel((0, 0))) < 235:
            return im
        diff = ImageChops.difference(im, Image.new(im.mode, im.size, (255, 255, 255))).convert("L")
        bbox = diff.point(lambda v: 255 if v > tol else 0).getbbox()
        if bbox is None:
            return im
    w, h = im.size
    pad = int(max(w, h) * 0.04)
    l, t, r, b = bbox
    l, t, r, b = max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad)
    if (r - l) < w * 0.4 or (b - t) < h * 0.4:
        return im
    return im.crop((l, t, r, b))


def render(src_path, out_path):
    im = Image.open(src_path)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if has_alpha else "RGB")
    im = trim_uniform_border(im)
    im.thumbnail((256, 256), Image.LANCZOS)
    im.save(out_path, "WEBP", lossless=True, quality=100, method=6, exact=True)
    return im.size


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def git_blob(path):
    return subprocess.check_output(["git", "hash-object", path], cwd=REPO, text=True).strip()


def dump(path, data):
    with open(os.path.join(REPO, path), "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--originals-root", required=True)
    args = ap.parse_args()

    snap = json.load(open(os.path.join(REPO, SNAPSHOT), encoding="utf-8"))
    reg = json.load(open(os.path.join(REPO, CREST_REGISTRY), encoding="utf-8"))
    entries = reg["entries"]
    by_alias = {}
    for e in entries:
        for a in e["aliases"]:
            by_alias[normalize(a)] = e

    # 1. opponents and fixtures from the official calendar snapshot
    unmatched = []
    for e in entries:
        e["fixtures"] = []
    for ev in sorted(snap["events"], key=lambda x: (x["date"], x.get("time", ""), x["id"])):
        opp = (ev.get("opponent") or "").strip()
        if not opp or NOT_A_CLUB.search(opp):
            continue
        e = by_alias.get(normalize(opp))
        if e is None:
            unmatched.append(opp)
            continue
        if opp not in e["aliases"]:
            e["aliases"].append(opp)
        e["fixtures"].append(ev["id"])
    if unmatched:
        sys.exit("opponents without registry entry: " + ", ".join(sorted(set(unmatched))))

    # 2. files
    out_dir = os.path.join(REPO, OUT_DIR)
    asset_entries = []
    for e in entries:
        slug = e["slug"]
        e["tuttocampoUrl"] = TC + TUTTOCAMPO[slug] if slug in TUTTOCAMPO else None
        if slug in DRIVE_FILES:
            e["scdDriveFile"] = f"{DRIVE_FOLDER}/{DRIVE_FILES[slug]}"
        if slug in NOTES:
            e["note"] = NOTES[slug]
        if slug in ORIGINALS:
            rel, source, kind = ORIGINALS[slug]
            src = os.path.join(args.originals_root, rel)
            out = os.path.join(out_dir, f"{slug}.webp")
            w, h = render(src, out)
            e["status"] = "VERIFIED_FILE"
            e["file"] = f"/media/crests/{slug}.webp"
            e["width"], e["height"] = w, h
            e["verifiedAt"] = TODAY
            if source:
                drive_id = re.search(r"\(([A-Za-z0-9_-]{25,})\)$", source)
                e["sourceUrl"] = source if source.startswith("http") else (
                    f"https://drive.google.com/file/d/{drive_id.group(1)}/view" if drive_id else None)
                e["source"] = source
                e["sourceKind"] = kind
            else:
                e["source"] = e.get("sourceUrl")
            e["originalSha256"] = sha256(src)
            repo_path = f"{OUT_DIR}/{slug}.webp"
            asset_entries.append(OrderedDict([
                ("path", repo_path),
                ("class", "OPPONENT_CREST"),
                ("status", "VERIFIED"),
                ("source", f"{e['displayName']}: {e['source']}"),
                ("git_blob_sha", git_blob(repo_path)),
                ("derived_from", f"{e['source']} (original sha256 {e['originalSha256'][:16]})"),
                ("transform", TRANSFORM),
                ("vector_status", "RESEARCH_REAL_ASSET"),
            ]))
        else:
            e["status"] = "MISSING"
            e["file"] = None
            e["verifiedAt"] = None
            e.setdefault("source", None)
            for k in ("width", "height", "originalSha256"):
                e.pop(k, None)
        e["licenceNote"] = LICENCE

    order = ["slug", "displayName", "aliases", "status", "file", "source", "sourceUrl", "sourceKind",
             "tuttocampoUrl", "scdDriveFile", "verifiedAt", "licenceNote", "width", "height", "originalSha256",
             "note", "fixtures"]
    reg["entries"] = [OrderedDict((k, e[k]) for k in order if k in e) for e in sorted(entries, key=lambda x: x["slug"])]
    reg["version"] = "1.1.0"
    reg["generatedAt"] = TODAY
    reg["statuses"] = ["VERIFIED_FILE", "MISSING"]
    reg["calendarSource"] = SNAPSHOT
    reg["generator"] = "tools/crests/catalog.py"
    dump(CREST_REGISTRY, reg)

    # 3. asset registry: one OPPONENT_CREST entry per served crest file
    assets = json.load(open(os.path.join(REPO, ASSET_REGISTRY), encoding="utf-8"))
    fp = assets["format_policy"]
    fp["class_rules"]["OPPONENT_CREST"] = "VECTOR_MARK"
    assets["runtime_assets"] = [a for a in assets["runtime_assets"] if a.get("class") != "OPPONENT_CREST"] + asset_entries
    if not any(r.get("subject", "").startswith("Opponent club crests") for r in assets["vector_research"]):
        assets["vector_research"].append(OrderedDict([
            ("subject", "Opponent club crests (third-party marks, nominative use in fixture lists)"),
            ("raster_paths", [f"{OUT_DIR}/"]),
            ("decision", "RESEARCH_REAL_ASSET"),
            ("where_to_look", ["SCD Drive ufficio stampa/LOGHI SQUADRE CAMPIONATI", "opponent club official site or page",
                               "tuttocampo team page (manual download by the Direzione)"]),
            ("note", "never redraw or trace; registry config/scd-opponent-crests.v1.json"),
        ]))
    dump(ASSET_REGISTRY, assets)

    served = {f"{e['slug']}.webp" for e in reg["entries"] if e["status"] == "VERIFIED_FILE"}
    stray = sorted(set(os.listdir(out_dir)) - served)
    print(json.dumps({
        "opponents": len(reg["entries"]),
        "verified": len(served),
        "missing": [e["displayName"] for e in reg["entries"] if e["status"] == "MISSING"],
        "tuttocampo": sum(1 for e in reg["entries"] if e.get("tuttocampoUrl")),
        "stray_files": stray,
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
