#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Les maquettes DESSINENT-ELLES les valeurs que le back SERT vraiment ?

Deux écrans de suite ont montré la même faute (2026-09-06) : le compte de démo est dans un état
que la maquette ne dessine pas, donc le client a inventé une forme sans témoin — `glaring` servie
et jamais dessinée sur ㊴, « cohérence indéterminée + absorbé > 0 » sans cadre sur ㊲.
⇒ *Une maquette qui ne dessine pas la valeur que le monde réel sert laisse le client inventer.*
Plutôt que d'attendre le troisième, cet instrument les compte tous.

⛔ CE QU'IL MESURE, ET LA DISTINCTION QUI L'A D'ABORD FAIT MENTIR. Ma première version cherchait
   la valeur dans le CODE des générateurs et déclarait `glaring` « connue » — le contrôle positif
   l'a réfutée sur-le-champ. La valeur EST dans le générateur, avec son libellé, dans une table de
   vocabulaire ; ce que le juge constate est qu'AUCUN CADRE ne la montre. Deux questions
   différentes, et c'est la seconde qui compte :
     vocabulaire  = le générateur connaît la valeur et lui donne un libellé
     dessinée     = ce libellé apparaît dans une page RENDUE
   Une valeur servie, connue du vocabulaire, mais qu'aucun cadre ne dessine, est exactement le
   trou qui fait inventer le client.

⛔ ET LA SONDE ACCUSE AUTANT QU'ELLE TROUVE. Sa seconde version ne reconnaissait qu'une forme de
   table : 366 valeurs « hors vocabulaire » sur 376, un verdict à 96 % uniforme — donc un
   instrument qui mesure autre chose. Élargie aux deux formes, la couverture a bougé (vocabulaire
   115 → 321, dessinées 10 → 103) ; sans cette vérification l'élargissement aurait été décoratif.
   ★ Et elle a RETIRÉ deux accusations : `faint` était donné sans témoin sur deux écrans alors
   qu'il est membre de DEUX énumérations et que la seconde est bien dessinée.
   ⇒ **La sonde étroite fabriquait l'accusation autant que le trou.** Un balayage qu'on n'a pas
   élargi ne rend pas « moins de résultats » : il rend de FAUX résultats, dans les deux sens.

⛔ CONTRÔLE POSITIF OBLIGATOIRE, exécuté à chaque run : `glaring` DOIT ressortir « connue mais non
   dessinée ». S'il ressort autrement, l'instrument mesure autre chose et le run est refusé — un
   balayage dont on ne prouve pas qu'il sait trouver ce qu'on lui demande ne prouve rien.

Usage : confronter-valeurs-servies.py
"""
import collections
import glob
import json
import os
import re
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')

# une valeur d'énumération se reconnaît à la CLÉ qui la porte, pas à sa forme seule
INDIC = re.compile(r'band|state|status|tier|phase|level|kind|type|bucket|severity|categor'
                   r'|mode|stage|outcome|result|verdict', re.I)
VAL = re.compile(r'^[A-Za-z][A-Za-z0-9_]{2,30}$')
# les tables de vocabulaire des générateurs : ('ENUM', 'libellé en français')
# Deux formes coexistent dans les générateurs, et n'en voir qu'une fabriquait 96 % de bruit
# ET faisait rater les homonymes (`faint` est à la fois une visibilité et une gravité) :
#   forme TUPLE  ('ENUM', 'libellé')            — tables de vocabulaire en liste
#   forme DICT   'ENUM': ('libellé', n)  /  'ENUM': 'libellé'
PAIRE = re.compile(r"""\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*,\s*['"]([^'"]{3,60})['"]""")
PAIRE_DICT = re.compile(r"""['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*:\s*\(?\s*['"]([^'"]{3,60})['"]""")

TEMOIN = ('glaring', 'connue mais non dessinée')


def valeurs_servies():
    """Ce que le back rend RÉELLEMENT, lu dans les corps de §DA-4."""
    def marcher(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, str) and INDIC.search(k) and VAL.match(v):
                    yield v
                else:
                    yield from marcher(v)
        elif isinstance(o, list):
            for e in o[:20]:
                yield from marcher(e)

    par_dossier = collections.defaultdict(set)
    for p in sorted(glob.glob(os.path.join(ICI, '*', 'corps-reels', '*.json'))):
        if os.path.basename(p).startswith('_index'):
            continue
        j = json.load(open(p, encoding='utf8'))
        if not j.get('corps'):
            continue
        par_dossier[p.split(os.sep)[-3]].update(marcher(j['corps']))
    return par_dossier


def vocabulaire():
    """enum → libellés que les générateurs lui donnent."""
    voc = collections.defaultdict(set)
    for f in glob.glob(os.path.join(ATELIER, '*.py')):
        src = open(f, encoding='utf8', errors='replace').read()
        for motif in (PAIRE, PAIRE_DICT):
            for enum, lib in motif.findall(src):
                voc[enum].add(lib)
    return voc


def pages_rendues():
    t = ''
    for f in glob.glob(os.path.join(ATELIER, 'ecrans-brennar*.html')):
        t += open(f, encoding='utf8', errors='replace').read()
    return t


def classer(valeur, voc, pages):
    """dessinée · connue-non-dessinée · hors-vocabulaire."""
    libs = voc.get(valeur) or set()
    if not libs:
        # ⛔ PAS un défaut : la sonde ne reconnaît qu'UNE forme de table (`('ENUM', 'libellé')`).
        #    Les deux formes de table sont couvertes ; tout libellé CONSTRUIT (f-string,
        #    concaténation, libellé calculé) échappe encore. C'est un DÉNOMINATEUR non mesuré,
        #    publié comme tel — un compte qui le passerait pour un trou serait du bruit.
        return 'non couvert par la sonde'
    return 'dessinée' if any(l in pages for l in libs) else 'connue mais non dessinée'


def homonyme(valeur, voc):
    """Deux énumérations distinctes peuvent partager un membre — `faint` est à la fois une
    visibilité d'effluent et une gravité de journal. Une valeur homonyme ne peut PAS être
    attribuée à un écran par son seul nom : le dire plutôt que de trancher au hasard."""
    return len(voc.get(valeur) or ()) > 1


def main():
    servies = valeurs_servies()
    voc, pages = vocabulaire(), pages_rendues()
    if not servies or not voc or not pages:
        print('⛔ entrées manquantes (corps, générateurs ou pages) — rien conclu'); sys.exit(1)
    print('corps : %d dossiers · vocabulaire : %d valeurs · pages rendues : %d octets'
          % (len(servies), len(voc), len(pages)))

    # ── le contrôle positif d'abord : sans lui, aucun chiffre n'est opposable ──
    v, attendu = TEMOIN
    obtenu = classer(v, voc, pages)
    print('\nCONTRÔLE POSITIF · `%s` attendu « %s » → obtenu « %s »  %s'
          % (v, attendu, obtenu, '✅' if obtenu == attendu else '⛔'))
    if obtenu != attendu:
        print('   L’instrument ne retrouve pas le cas que le juge a mesuré à la main.')
        print('   Il mesure autre chose : aucun compte n’est publié.')
        sys.exit(1)

    compte = collections.Counter()
    trous = collections.defaultdict(set)
    for d, vals in servies.items():
        for val in vals:
            c = classer(val, voc, pages)
            if c == 'connue mais non dessinée' and homonyme(val, voc):
                c = 'ambigu (membre homonyme de deux énumérations)'
            compte[c] += 1
            if c != 'dessinée':
                trous[d].add((val, c))

    print('\n=== ce que le monde sert, vu par les maquettes ===')
    for c, n in compte.most_common():
        print('  %-26s %4d' % (c, n))
    print('\n=== par écran — ce que le client doit inventer faute de témoin ===')
    for d in sorted(trous, key=lambda x: -len(trous[x])):
        connues = sorted(v for v, c in trous[d] if c == 'connue mais non dessinée')
        ambigus = sorted(v for v, c in trous[d] if c.startswith('ambigu'))
        if not connues and not ambigus:
            continue
        print('  %-22s SANS TÉMOIN %d · ambigus %d' % (d, len(connues), len(ambigus)))
        if connues:
            print('      sans témoin : %s' % ', '.join(connues))
        if ambigus:
            print('      ambigus     : %s' % ', '.join(ambigus))
    print()
    print('⛔ CE QUE CE COMPTE NE DIT PAS, et il faut le lire avant de s’en servir :')
    print('   · « non couvert par la sonde » n’est PAS un trou de maquette — c’est l’angle mort')
    print('     de cet instrument : il reconnaît DEUX formes de table (tuple et dict), et tout')
    print('     libellé construit autrement lui échappe. Dénominateur publié, pas un défaut ;')
    print('     le réduire demande d’élargir la sonde, pas de corriger des écrans.')
    print('     (Mesure de l’élargissement du 2026-09-06 : vocabulaire 115 → 321, dessinées')
    print('      10 → 103, angle mort 366 → 264 — la couverture a bougé, il n’était pas décoratif.)')
    print('   · « ambigu » = deux énumérations partagent ce membre ; l’attribuer à un écran par')
    print('     son seul nom serait trancher au hasard. À lever à la main, sur la route servante.')
    print('   · seul « SANS TÉMOIN » est opposable : le monde sert la valeur, la maquette lui')
    print('     donne un libellé, et aucun cadre ne la montre ⇒ le client invente.')


if __name__ == '__main__':
    main()
