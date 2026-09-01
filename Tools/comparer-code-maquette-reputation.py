#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㊲ La réputation — ALIGNER ce que le CODE déclare sur ce que la MAQUETTE déclare.

⚠️ CE QUE CET INSTRUMENT N'EST PAS : le juge visuel. Le juge compare une CAPTURE EN JEU à
   l'image de référence, à deux résolutions, et il est un agent NEUF. Il reste dû, entier.
   Ici on compare deux TEXTES : les constantes du contrôleur C# et les règles du générateur de
   la maquette. Ça n'atteste rien du rendu — mais ça attrape, avant toute compilation, la classe
   d'écarts qui coûte le plus cher au juge : une valeur recopiée de travers, une couleur prise
   pour une autre, un bloc oublié.

⇒ La règle qu'il applique : **on compare le CONTENU, jamais la taille ou le nom**. Un écart de
   valeur entre deux fichiers qui se déclarent la même chose est un défaut, même quand les deux
   côtés sont cohérents lus séparément.

Usage : python3 Tools/comparer-code-maquette-reputation.py
"""
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
ATELIER = Path.home() / "project" / "atelier3d-mafia"
# ⚠️ Chemin mis à jour après le `git mv` du 2026-08-30 (les fichiers ont quitté leur
# stationnement `Tools/prepare-screen-b3/` pour `Assets/`). L'instrument sort en ERREUR si le
# répertoire manque, au lieu de rendre « 0 écart » sur un corpus vide — un comparateur qui ne
# trouve rien à comparer doit crier, jamais réussir.
CODE = RACINE / "Assets" / "Scripts" / "Operational" / "Reputation"

GEN = ATELIER / "generateur-reputation.py"
CHASSIS = ATELIER / "chassis6.py"
CTRL = CODE / "ReputationScreenController.cs"
RESOLVERS = CODE / "ReputationResolvers.cs"
PORTRAIT = CODE / "ReputationPortrait.cs"


def lire(p):
    if not p.exists():
        sys.exit(f"ABSENT : {p}")
    return p.read_text()


def css_valeurs(css, selecteur, prop):
    """Extrait `prop` d'un bloc `.selecteur{...}` — rend la liste des valeurs trouvées."""
    out = []
    for m in re.finditer(r'\.%s\s*\{([^}]*)\}' % re.escape(selecteur), css):
        for mm in re.finditer(r'(?:^|;)\s*%s\s*:\s*([^;]+)' % re.escape(prop), m.group(1)):
            out.append(mm.group(1).strip())
    return out


def font_size(css, selecteur):
    """`font:700 17px/1 'DejaVu Serif'` ou `font-size:14px` → 17.0 / 14.0

    ⚠️ `selecteur` porte DÉJÀ son point de tête (« .enseigne b ») : ne pas en rajouter un.
    La première version de cette fonction préfixait `\\.` systématiquement et produisait
    `\\.\\.enseigne b` — un motif qui ne matche jamais. Résultat : **10 tailles sur 10
    déclarées « non vérifiées » et un bilan de 0 ÉCART**, c'est-à-dire le résultat rassurant
    d'un instrument qui ne regardait rien. C'est le mode d'échec que ce dépôt paie le plus
    souvent : *un motif qui rend le résultat espéré est le moment de le durcir, pas de
    conclure.*"""
    for m in re.finditer(r'%s\s*\{([^}]*)\}' % re.escape(selecteur), css):
        bloc = m.group(1)
        mm = re.search(r'font\s*:\s*(?:\d+\s+)?(?:italic\s+)?([\d.]+)px', bloc)
        if mm:
            return float(mm.group(1))
        mm = re.search(r'font-size\s*:\s*([\d.]+)px', bloc)
        if mm:
            return float(mm.group(1))
    return None


def cs_const(src, nom):
    m = re.search(r'const\s+float\s+%s\s*=\s*([\d.]+)f' % re.escape(nom), src)
    return float(m.group(1)) if m else None


def cs_const_est_employee(sources, nom):
    """⛔ UNE CONSTANTE JUSTE MAIS INEMPLOYÉE EST UNE VALEUR MORTE, ET LA VALIDER EST PIRE QUE
    DE NE RIEN VALIDER — c'est le « tunable sans consommateur » du socle, retourné contre
    l'instrument censé le détecter.

    Mesuré ici même le 2026-08-30 : cinq constantes (`CssVoyantSens`, `CssVoyantDiam`,
    `CssVoyantPadY`, `CssVoyantPadX`, `CssEcartBloc`) étaient déclarées avec la BONNE valeur,
    validées « concordantes » par ce comparateur… et employées NULLE PART. Le rendu réel
    utilisait les mêmes nombres EN DUR dans une autre classe, que la garde ne regardait pas.
    Deux sources pour une valeur : le jour où la maquette bouge, l'une suit et l'autre pas.

    ⇒ On compte les occurrences sur TOUT le code de l'écran, pas seulement le fichier qui
    déclare : une constante peut légitimement être employée par une classe voisine. Le seuil
    est 2 — une seule occurrence, c'est la déclaration qui se regarde elle-même."""
    total = sum(len(re.findall(r'\b%s\b' % re.escape(nom), s)) for s in sources)
    return total >= 2, total


def main():
    gen = lire(GEN)
    chassis = lire(CHASSIS)
    ctrl = lire(CTRL)
    resolvers = lire(RESOLVERS)
    portrait = lire(PORTRAIT)
    css = chassis + "\n" + gen

    ecarts, ok, nonverif = [], [], []

    # ═══ 1. LES CORPS DE TEXTE ════════════════════════════════════════════════════════════
    # (constante C#, sélecteur CSS, ce que ça désigne)
    tailles = [
        ("CssTitreCorps",     "%(p)s .enseigne b",  "titre « Le miroir »"),
        ("CssSousTitre",      "%(p)s .enseigne i",  "sous-titre de l'enseigne"),
        ("CssCompteurNombre", "%(p)s .fen b",       "le nombre d'un compteur"),
        ("CssCompteurLib",    "%(p)s .fen>span",    "le libellé d'un compteur"),
        ("CssVoyantTitre",    "%(p)s .tl b",        "le libellé d'un voyant"),
        ("CssVoyantSens",     "%(p)s .tl small",    "la signification d'un voyant"),
        ("CssPannSurTitre",   "%(p)s .pann i",      "le sur-titre du panneau"),
        ("CssPannTitre",      "%(p)s .pann b",      "le titre du panneau"),
        ("CssPannTexte",      "%(p)s .pann small",  "le texte du panneau"),
        ("CssCtaCorps",       "%(p)s .cta6",        "le libellé du CTA"),
    ]
    toutes_sources = [ctrl, resolvers, portrait]
    for nom, sel, quoi in tailles:
        attendu = font_size(css, sel.replace("%(p)s ", "").replace(">", ">"))
        obtenu = cs_const(ctrl, nom)
        if attendu is None:
            nonverif.append(f"{nom} ({quoi}) : sélecteur `{sel}` introuvable dans le CSS")
        elif obtenu is None:
            ecarts.append(f"{nom} ({quoi}) : ABSENTE du contrôleur, maquette = {attendu}px")
        elif abs(attendu - obtenu) > 0.01:
            ecarts.append(f"{nom} ({quoi}) : code {obtenu}px ≠ maquette {attendu}px")
        else:
            employee, n = cs_const_est_employee(toutes_sources, nom)
            if not employee:
                ecarts.append(f"{nom} ({quoi}) : valeur JUSTE ({obtenu}px) mais INEMPLOYÉE "
                              f"({n} occurrence) — le rendu utilise donc autre chose, "
                              "et cette concordance ne certifie rien")
            else:
                ok.append(f"{nom} = {obtenu}px (employée {n}×)")

    # Les constantes de MESURE (pas de corps de texte) : mêmes règles, mais leur valeur se lit
    # dans une propriété CSS et non dans un `font:`. On ne vérifie ici que l'EMPLOI — leur valeur
    # est contrôlée à la lecture du CSS par les blocs plus bas.
    for nom in ("CssVoyantPadY", "CssVoyantPadX", "CssVoyantDiam", "CssVoyantEcart",
                "CssPortraitLarg", "CssMargeH", "CssPannPadX", "CssPannPadY", "CssCtaPad"):
        if cs_const(ctrl, nom) is None:
            continue
        employee, n = cs_const_est_employee(toutes_sources, nom)
        if not employee:
            ecarts.append(f"{nom} : constante de mesure INEMPLOYÉE ({n} occurrence) — "
                          "une valeur morte à côté d'un littéral vivant")
        else:
            ok.append(f"{nom} employée {n}×")

    # ═══ 2. LES COULEURS ══════════════════════════════════════════════════════════════════
    # Toute couleur du code doit venir de la palette de la maquette (T de chassis6).
    palette = dict(re.findall(r"'(\w+)':\s*'(#[0-9a-fA-F]{6})'", chassis))
    hex_palette = {v.lower(): k for k, v in palette.items()}

    # (a) les 4 locales du code sont-elles bien dans la palette ?
    for m in re.finditer(r'Hex\(0x([0-9a-fA-F]{2}),\s*0x([0-9a-fA-F]{2}),\s*0x([0-9a-fA-F]{2})\)',
                         resolvers):
        h = ("#" + m.group(1) + m.group(2) + m.group(3)).lower()
        if h in hex_palette:
            ok.append(f"couleur locale {h} = jeton `{hex_palette[h]}` de la maquette")
        else:
            ecarts.append(f"couleur locale {h} : ABSENTE de la palette de la maquette — inventée ?")

    # (b) contrôle positif du parseur de palette
    if len(palette) < 15:
        nonverif.append(f"palette parsée = {len(palette)} jetons — parseur suspect, "
                        "les verdicts couleur ci-dessus ne valent rien")
    else:
        ok.append(f"palette de la maquette : {len(palette)} jetons lus (contrôle positif)")

    # ═══ 3. LA POLARITÉ DES TELLS — l'écart É2, celui qui a fait refaire la maquette ══════
    actif_maq = dict(re.findall(r"'(\w+)':\s*'(\w+)'",
                                re.search(r'TELLS_ACTIF\s*=\s*\{([^}]*)\}', gen).group(1)))
    # ⚠️ `case Pose.Collar:` — SANS le préfixe `UniformTellsDto.`, puisqu'on est DANS la classe.
    # La première version l'exigeait et rendait 0 correspondance sur les 4 : la garde la plus
    # importante de cet instrument (l'écart É2, celui qui a fait refaire la maquette) était
    # silencieusement inerte.
    actif_code = dict(re.findall(r'case Pose\.(\w+):\s*return \w+\s*==\s*"(\w+)"',
                                 lire(CODE / "ReputationDtos.cs")))
    corr = {"Collar": "collar", "Sleeves": "sleeves", "Watch": "watch", "Gloves": "gloves"}
    for pose_cs, cle in corr.items():
        a = actif_maq.get(cle)
        b = actif_code.get(pose_cs)
        if a is None or b is None:
            nonverif.append(f"polarité {cle} : non extraite (maquette={a}, code={b})")
        elif a != b:
            ecarts.append(f"POLARITÉ {cle} : code « {b} » ≠ maquette « {a} » — "
                          "c'est l'écart É2, celui qui a fait refaire la maquette")
        else:
            ok.append(f"polarité {cle} : actif = « {a} » des deux côtés")

    # ═══ 4. LES POSTURES — libellés et inclinaisons ═══════════════════════════════════════
    post_maq = dict((m.group(1), float(m.group(3))) for m in re.finditer(
        r"'(\w+)':\s*\('([^']*)',\s*T\['\w+'\],\s*(-?[\d.]+)\)", gen))
    for posture, deg in post_maq.items():
        m = re.search(r'case "%s":\s*return ([\d.]+)f;' % posture,
                      resolvers[resolvers.find("PostureInclinaisonDeg"):])
        if not m:
            nonverif.append(f"inclinaison {posture} : non extraite du code")
        elif abs(float(m.group(1)) - deg) > 0.01:
            ecarts.append(f"inclinaison {posture} : code {m.group(1)}° ≠ maquette {deg}°")
        else:
            ok.append(f"inclinaison {posture} = {deg}°")

    # ═══ 5. LE REGARD — décalages par posture ════════════════════════════════════════════
    regard_maq = dict((k, float(v)) for k, v in re.findall(
        r"'(\w+)':\s*(-?[\d.]+)", re.search(r"dx = \{([^}]*)\}", gen).group(1)))
    for posture, dx in regard_maq.items():
        m = re.search(r'case "%s":\s*return (-?[\d.]+)f;' % posture,
                      portrait[portrait.find("DecalageRegard"):])
        if not m:
            nonverif.append(f"regard {posture} : non extrait du code")
        elif abs(float(m.group(1)) - dx) > 0.01:
            ecarts.append(f"regard {posture} : code {m.group(1)} ≠ maquette {dx}")
        else:
            ok.append(f"regard {posture} = {dx}")

    # ═══ 6. LA STRUCTURE — les blocs de la maquette ont-ils un constructeur ? ═════════════
    blocs = {"enseigne": "ConstruireEnseigne", "compteurs": "ConstruireCompteurs",
             "elast": "ConstruireMiroir", "pann": "ConstruirePanneau", "pied": "ConstruirePied",
             "cerne": "ConstruireCerne"}
    for classe, methode in blocs.items():
        if ('class="%s' % classe) not in css and ('.%s' % classe) not in chassis:
            nonverif.append(f"bloc `{classe}` : introuvable dans la maquette")
        elif methode not in ctrl:
            ecarts.append(f"bloc `{classe}` de la maquette : AUCUN constructeur `{methode}` dans le code")
        else:
            ok.append(f"bloc `{classe}` → {methode}()")

    # ═══ Rapport ═════════════════════════════════════════════════════════════════════════
    print("=" * 78)
    print("㊲ CODE ↔ MAQUETTE — comparaison des VALEURS (pas des pixels)")
    print("=" * 78)
    print(f"\n✓ CONCORDANTS : {len(ok)}")
    for l in ok:
        print("   ", l)
    print(f"\n✗ ÉCARTS : {len(ecarts)}")
    for l in ecarts:
        print("   ", l)
    print(f"\n? NON VÉRIFIÉ : {len(nonverif)}")
    for l in nonverif:
        print("   ", l)

    print("\n" + "-" * 78)
    if not ok:
        print("⚠️ AUCUN concordant : l'instrument ne mesure probablement RIEN.")
        print("   Un résultat uniforme est le premier signe qu'on mesure autre chose.")
        return 2
    print(f"Bilan : {len(ok)} concordants · {len(ecarts)} écarts · {len(nonverif)} non vérifiés.")
    print("⚠️ Ceci ne remplace PAS le juge visuel ⊥ : aucun pixel n'a été comparé.")
    return 1 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
