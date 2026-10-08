#!/usr/bin/env python3
"""Garde : chaque indice de cadre cité par Tools/juge-visuel/INDEX.md désigne TOUJOURS le même cadre (08/10/2026, f2).

Pourquoi : les indices de l'INDEX sont des positions (ordre d'apparition du littéral exact `<div class="cadre">`, la
numérotation de `Tools/rendre-tel.py` et de `poser-ecran.py`). Une rangée insérée au milieu d'une page de l'atelier décale
tous les cadres suivants, et l'INDEX continue d'afficher des nombres plausibles qui désignent les mauvais écrans. Rien ne
rougissait : la dérive ne se voyait qu'en ouvrant le PNG.

Méthode : pour chaque indice cité, l'ÉTIQUETTE du cadre (`<div class="etiquette">…</div>`) est épinglée dans
`indices-cadres.json`. Le contrôle relit la page de l'atelier et exige, indice par indice, la même étiquette. Un cadre
AJOUTÉ EN FIN de page ne change rien (c'est la règle de pose de l'atelier) ; un cadre inséré avant un indice cité le fait
rougir, avec l'indice où l'étiquette épinglée se trouve désormais.

    python3 verifier-indices-cadres.py                     # contrôle contre ~/project/atelier3d-mafia (master)
    python3 verifier-indices-cadres.py --atelier <dossier> # contrôle contre un autre arbre de l'atelier
    python3 verifier-indices-cadres.py --epingler          # réécrit l'épingle (après une renumérotation VOULUE et l'INDEX corrigé)
    python3 verifier-indices-cadres.py --controle          # contrôle positif : une dérive injectée DOIT rougir

Sortie non nulle si défaut.
"""
import json, os, pathlib, re, sys, tempfile, shutil

ICI = pathlib.Path(__file__).resolve().parent
INDEX = ICI / 'INDEX.md'
EPINGLE = ICI / 'indices-cadres.json'
ATELIER = pathlib.Path.home() / 'project' / 'atelier3d-mafia'


def citations(texte):
    """{page: set(indices)} — chaque groupe « `page.html` 3, 4, 5 » de l'INDEX."""
    out = {}
    for page, nums in re.findall(r'`([a-z0-9-]+\.html)` ((?:\d+)(?:, \d+)*)', texte):
        out.setdefault(page, set()).update(int(n) for n in nums.split(', '))
    return out


def etiquettes(html):
    """Étiquette de chaque cadre, dans l'ordre du littéral exact `<div class="cadre">`."""
    out = []
    for m in re.finditer(r'<div class="cadre">', html):
        e = re.match(r'\s*<div class="etiquette">(.*?)</div>', html[m.end():m.end() + 2000], re.S)
        out.append(re.sub(r'\s+', ' ', e.group(1)).strip() if e else '(sans étiquette)')
    return out


def lire(atelier, page):
    return etiquettes((atelier / page).read_text(encoding='utf-8', errors='replace'))


def epingler(atelier):
    cit = citations(INDEX.read_text(encoding='utf-8'))
    ep = {}
    for page, idx in sorted(cit.items()):
        et = lire(atelier, page)
        manquants = [i for i in idx if i >= len(et)]
        if manquants:
            sys.exit('⛔ %s : indices %s au-delà des %d cadres — l\'INDEX cite un cadre qui n\'existe pas' % (page, manquants, len(et)))
        ep[page] = {str(i): et[i] for i in sorted(idx)}
    EPINGLE.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('épingle écrite : %s (%s)' % (EPINGLE.name, ', '.join('%s %d indices' % (p, len(v)) for p, v in ep.items())))


def controler(atelier, ep=None, bavard=True):
    ep = ep if ep is not None else json.loads(EPINGLE.read_text(encoding='utf-8'))
    cit = citations(INDEX.read_text(encoding='utf-8'))
    defauts = []
    for page, idx in sorted(cit.items()):
        for i in sorted(idx):
            if str(i) not in ep.get(page, {}):
                defauts.append('%s %d : cité par l\'INDEX mais pas épinglé (relancer --epingler APRÈS avoir vérifié le cadre)' % (page, i))
    for page, attendu in sorted(ep.items()):
        et = lire(atelier, page)
        for i, lib in attendu.items():
            i = int(i)
            vu = et[i] if i < len(et) else None
            if vu != lib:
                ou = [k for k, e in enumerate(et) if e == lib]
                defauts.append('%s %d : épinglé « %s », la page porte « %s »%s' % (
                    page, i, lib, vu, ' — l\'étiquette épinglée est maintenant en %s (dérive %+d)' % (ou, ou[0] - i) if ou else ''))
    if bavard:
        n = sum(len(v) for v in ep.values())
        print('%s — %d indices épinglés, %d défaut(s) (atelier : %s)' % ('VERT' if not defauts else 'ROUGE', n, len(defauts), atelier))
        for d in defauts[:40]:
            print('  ⛔', d)
    return defauts


def controle_positif(atelier):
    ep = json.loads(EPINGLE.read_text(encoding='utf-8'))
    if controler(atelier, ep, bavard=False):
        sys.exit('⛔ contrôle positif impossible : la page réelle est déjà rouge')
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        for page in ep:
            shutil.copy(atelier / page, t / page)
        page = 'ecrans-brennar-6.html' if 'ecrans-brennar-6.html' in ep else sorted(ep)[0]
        h = (t / page).read_text(encoding='utf-8', errors='replace')
        k = h.index('<div class="cadre">')
        # une rangée d'un cadre insérée AVANT tous les indices cités : la dérive que la garde doit voir
        h = h[:k] + '<div class="cadre"><div class="etiquette">INJECTÉ PAR LE CONTRÔLE</div><div class="tel"></div></div>' + h[k:]
        (t / page).write_text(h, encoding='utf-8')
        d = controler(t, ep, bavard=False)
    if not d:
        sys.exit('⛔ CONTRÔLE POSITIF ÉCHOUÉ : un cadre injecté en tête de %s n\'a rien fait rougir' % page)
    print('contrôle positif : un cadre injecté en tête de %s ⇒ %d défaut(s), ROUGE comme attendu ; page réelle VERTE' % (page, len(d)))


if __name__ == '__main__':
    a = sys.argv[1:]
    atelier = pathlib.Path(a[a.index('--atelier') + 1]) if '--atelier' in a else ATELIER
    if '--epingler' in a:
        epingler(atelier)
    elif '--controle' in a:
        controle_positif(atelier)
    else:
        sys.exit(1 if controler(atelier) else 0)
