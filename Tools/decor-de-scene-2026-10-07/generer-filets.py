#!/usr/bin/env python3
"""Génère `Assets/Scripts/ShellContracts/DecorsDeSceneFilets.cs` depuis `mesure-filets.json` (design v5.1, §3.4, D6a).

    python3 Tools/decor-de-scene-2026-10-07/generer-filets.py              # écrit le fichier
    python3 Tools/decor-de-scene-2026-10-07/generer-filets.py --verifier   # exit 1 si le fichier commité diffère

UNE RECETTE = UN ÉLÉMENT BORDÉ de la maquette : ses côtés groupés par (épaisseur, style, couleur) — un `SpecFilet` par
groupe, d'où un `SpecFilet[]` (65 éléments ont des côtés hétérogènes : `border-bottom:2px` d'une enseigne, etc.) — et son
`border-radius`. Les recettes d'un écran sont celles de TOUS ses cadres dans l'INDEX (nominaux ET d'état : ㉛ `.pris`
au cadre 68). Nom : la classe CSS de l'élément en PascalCase ; une même classe à deux recettes ⇒ suffixe `_2`, `_3`…
dans l'ordre de leur premier cadre.

Teintes (§4.1, garde TD-612) : une couleur à d ≤ 4 d'un jeton (`teintes.json`, règle JETON) est écrite PAR LE JETON ;
`#000000` (absent de `teintes.json`) par `Color.black` ; les autres sont des littéraux admis.
"""
import json, os, re, sys
from collections import OrderedDict

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, '..', '..'))
SORTIE = os.path.join(RACINE, 'Assets/Scripts/ShellContracts/DecorsDeSceneFilets.cs')
CATALOGUE = os.path.join(RACINE, 'Assets/Scripts/ShellContracts/DecorsDeScene.cs')

COTES = {'T': 'Cotes.Haut', 'R': 'Cotes.Droite', 'B': 'Cotes.Bas', 'L': 'Cotes.Gauche'}
ORDRE_COTES = 'TRBL'
STYLES = {'solid': 'StyleFilet.Plein', 'dotted': 'StyleFilet.Pointille', 'dashed': 'StyleFilet.Tirete', 'double': 'StyleFilet.Double'}


def charger(n):
    with open(os.path.join(ICI, n), encoding='utf-8') as f:
        return json.load(f)


def ecrans_du_catalogue():
    """symbole → nom du champ dans `DecorsDeScene` (« ㊲ » → « Reputation »)."""
    src = open(CATALOGUE, encoding='utf-8').read()
    r = OrderedDict()
    for m in re.finditer(r'public static readonly SpecDecor (\w+) = (?:new SpecDecor|District)\(\s*"([^"]+)"', src):
        r[m.group(2)] = m.group(1)
    return r


def pascal(cls):
    mots = [m for m in re.split(r'[^0-9A-Za-z]+', cls) if m]
    n = ''.join(m[:1].upper() + m[1:] for m in mots) or 'Element'
    return n if not n[0].isdigit() else '_' + n


def flottant(x):
    s = ('%.4f' % float(x)).rstrip('0').rstrip('.')
    return (s if '.' in s else s + '.0') + 'f' if s else '0f'


def recette(el):
    groupes = OrderedDict()
    for c in el['cotes']:
        groupes.setdefault((c['w'], c['st'], c['col']), []).append(c['c'])
    g = tuple(sorted((''.join(sorted(cs, key=ORDRE_COTES.index)), w, st, col) for (w, st, col), cs in groupes.items()))
    return (g, el['rayon'])


def teinte(col, jetons):
    hexa, _, op = col.partition('@')
    op = float(op) if op else 1.0
    e = jetons.get(hexa.lower())
    if hexa.lower() == '#000000':
        return f'Teinte.Nommee("noir", Color.black, {flottant(op)})'
    if e and e['regle'] == 'JETON':
        j = e['jeton']
        return f'Teinte.Jeton("{j}", t => t.{j}, {flottant(op)})'
    if e is None:
        sys.exit(f'⛔ {hexa} absent de teintes.json : relancer teintes.py avant de générer')
    return f'Teinte.Hex("{hexa.lower()}", {flottant(op)})'


def generer():
    filets = charger('mesure-filets.json')
    index = charger('ecrans-index.json')
    jetons = {e['hex'].lower(): e for e in charger('teintes.json')}
    noms = ecrans_du_catalogue()
    if len(noms) != 26:
        sys.exit(f'⛔ {len(noms)} écrans lus dans DecorsDeScene.cs, 26 attendus : le motif ne mord plus')
    cadres_de = {}
    for e in index:
        if e[3] and e[3].get('cadres') and e[0] in noms:
            cadres_de[e[0]] = sorted(e[3]['cadres'])
    par_cadre = {r['i']: r['el'] for r in filets}

    L = ['// ⛔ GÉNÉRÉ par Tools/decor-de-scene-2026-10-07/generer-filets.py depuis mesure-filets.json — NE PAS ÉDITER.',
         '//    Régénérer (et `--verifier`) après toute nouvelle mesure ; la garde D6(a) compare ce fichier à la mesure.',
         'using UnityEngine;', '', 'namespace MafiaCleanCity.Shell', '{',
         '    public static partial class DecorsDeScene', '    {',
         '        /// <summary>L5 (§3.4) : les recettes de filets et bords d\'état de chaque écran, MESURÉES sur tous ses cadres',
         '        /// (Chromium, `mesure-filets.json`). Un contrôleur appelle `Filets.Poser(bloc, DecorsDeScene.Filets.<Ecran>.<Nom>)`',
         '        /// et ne porte ni couleur ni épaisseur de bord.</summary>',
         '        public static class Filets', '        {',
         '            private static SpecFilet F(Cotes cotes, float epaisseurCss, StyleFilet style, Teinte couleur, string couleurCss, string rayon)',
         '            {',
         '                bool pct = rayon.EndsWith("%");',
         '                float v = float.Parse(rayon.TrimEnd(\'%\', \'p\', \'x\'), System.Globalization.CultureInfo.InvariantCulture);',
         '                return new SpecFilet(cotes, epaisseurCss, style, couleur, rayon: pct ? 0f : v, rayonPct: pct ? v / 100f : 0f,',
         '                                     couleurCss: couleurCss);',
         '            }', '']
    total = 0
    for sym, nom in noms.items():
        cadres = cadres_de.get(sym, [])
        recettes = OrderedDict()   # clé → (cls, premier cadre, cadres)
        for c in cadres:
            for el in par_cadre.get(c, []):
                k = (el['cls'], recette(el))
                if k not in recettes:
                    recettes[k] = [c]
                elif c not in recettes[k]:
                    recettes[k].append(c)
        vus = {}
        L.append(f'            /// <summary>{sym} — cadres {", ".join(map(str, cadres))} : {len(recettes)} recette(s).</summary>')
        L.append(f'            public static class {nom}')
        L.append('            {')
        L.append(f'                public static readonly int[] Cadres = {{ {", ".join(map(str, cadres))} }};')
        for (cls, (groupes, rayon)), cs in sorted(recettes.items(), key=lambda kv: (kv[0][0], kv[1][0], repr(kv[0][1]))):
            base = pascal(cls)
            if base in (nom, 'Cadres', 'F'):   # CS0542 (membre = sa classe) ; `F` masquerait l'appel F(…)
                base += '_Bloc'
            vus[base] = vus.get(base, 0) + 1
            champ = base if vus[base] == 1 else f'{base}_{vus[base]}'
            parts = []
            for cotes, w, st, col in groupes:
                fl = ' | '.join(COTES[x] for x in cotes) if len(cotes) < 4 else 'Cotes.Tous'
                # la couleur MESURÉE sans son « # » : la garde TD-612 lit toute chaîne "#rrggbb" comme un littéral de couleur
                parts.append(f'F({fl}, {flottant(w)}, {STYLES[st]}, {teinte(col, jetons)}, "{col.lstrip("#")}", "{rayon}")')
            L.append(f'                /// <summary>`.{cls}` — cadres {", ".join(map(str, cs))}.</summary>')
            L.append(f'                public static readonly SpecFilet[] {champ} = {{ {", ".join(parts)} }};')
            total += 1
        L.append('            }')
        L.append('')
    L[-1:] = ['        }', '    }', '}', '']
    return '\n'.join(L), total


if __name__ == '__main__':
    texte, n = generer()
    if '--verifier' in sys.argv:
        actuel = open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else ''
        ok = actuel == texte
        print(f'{"OK" if ok else "⛔ ÉCART"} — {n} recettes ; {SORTIE} {"identique à" if ok else "DIFFÈRE de"} la régénération')
        sys.exit(0 if ok else 1)
    with open(SORTIE, 'w', encoding='utf-8') as f:
        f.write(texte)
    print(f'écrit {SORTIE} — {n} recettes (par écran, classe CSS)')
