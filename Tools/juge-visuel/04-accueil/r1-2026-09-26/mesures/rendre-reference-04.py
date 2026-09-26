#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend les cadres de ④ (page `ecrans-brennar-accueil.html` de l'atelier) en références 1080x2102.

Pourquoi ce script existe : l'INDEX du 2026-09-22 dit « ④ : aucune maquette de série 4/6 », et
c'est vrai de la série 4/6 — la maquette de ④ vit sur une PAGE À PART, `ecrans-brennar-accueil.html`,
créée/étendue les 24 et 26/09 (atelier : ac9b54a, d196e8a, 0021d5a, d4b0379). Aucune référence
n'était rendue dans le dossier du juge. Le juge la rend donc lui-même, avec la même discipline que
`rendre-references-dues.py` : INDEX APPARIÉ À SON ÉTIQUETTE avant tout rendu, machine libre,
taille relue sur le fichier écrit.

Contrôle positif : l'appariement index ↔ étiquette imprime les 5 cadres ; un index qui glisse fait
rougir le script au lieu de rendre l'écran d'à côté.
"""
import os, re, struct, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.abspath(os.path.join(ICI, '..', 'reference'))
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGE = os.path.join(ATELIER, 'ecrans-brennar-accueil.html')
RENDRE = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/rendre-tel.py')
ECHELLE = '3.6'          # 300 px CSS -> 1080 px : la resolution de travail des juges (DA-3)
TAILLE = (1080, 2102)

DUS = [
    (0, "④ L’ouverture — rien à trancher", 'cadre-0-rien-a-trancher.png'),
    (1, None, 'cadre-1-carte-de-tete.png'),          # etiquette longue : appariement par prefixe
    (2, "④ L’ouverture — des rapports à lire (l’entrée du rapport)", 'cadre-2-rapports-a-lire.png'),
    (3, "④ L’ouverture — la file sous pression", 'cadre-3-file-sous-pression.png'),
    (4, "④ L’ouverture — un joueur neuf, sans carte de tête : la suite (PROPOSÉ)",
        'cadre-4-la-suite.png'),
]
PREFIXE_1 = "④ L’ouverture — une carte de tête"


def etiquettes(page):
    t = open(page, encoding='utf8', errors='replace').read()
    return re.findall(r'<div class="etiquette">(.*?)</div>', t)


def machine_libre():
    occ = []
    r = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True)
    if r.returncode == 0:
        occ += ['gate:' + n for n in r.stdout.split() if n.startswith('mcc-e2e-')]
    p = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True)
    if p.returncode == 0:
        for l in p.stdout.splitlines():
            if '-batchmode' in l and 'unityhub' not in l.lower():
                occ.append('unity-batchmode:' + l.split()[0])
    porte = os.path.expanduser('~/project/mafia-clean-city/scripts/creneau-unity.sh')
    if os.path.exists(porte):
        d = subprocess.run([porte, 'status'], capture_output=True, text=True)
        pr = (d.stdout or '').strip().splitlines()[:1]
        if pr and pr[0].startswith('PRIS'):
            occ.append('porte-unity:' + pr[0][:60])
    return occ


def main():
    etq = etiquettes(PAGE)
    print('page   : %s' % PAGE)
    print('cadres : %d' % len(etq))
    rouges = []
    for i, attendue, _ in DUS:
        if i >= len(etq):
            rouges.append('index %d hors page' % i); continue
        ok = (etq[i] == attendue) if attendue else etq[i].startswith(PREFIXE_1)
        print('  cadre %-2d %s  « %s »' % (i, 'OK ' if ok else 'KO ', etq[i][:90]))
        if not ok:
            rouges.append('cadre %d : etiquette inattendue' % i)
    if rouges:
        print('\n'.join(rouges)); sys.exit(1)
    occ = machine_libre()
    print('machine : %s' % (', '.join(occ) if occ else 'LIBRE'))
    if occ:
        print('rien rendu'); sys.exit(1)
    os.makedirs(SORTIE, exist_ok=True)
    for i, _, nom in DUS:
        dest = os.path.join(SORTIE, nom)
        r = subprocess.run([sys.executable, RENDRE, PAGE, str(i), dest, ECHELLE])
        if r.returncode != 0:
            print('rendu en echec cadre %d' % i); sys.exit(1)
        with open(dest, 'rb') as fh:
            w, h = struct.unpack('>II', fh.read(24)[16:24])
        print('  -> %s : %dx%d %s' % (nom, w, h, 'OK' if (w, h) == TAILLE else 'TAILLE INATTENDUE'))
        if (w, h) != TAILLE:
            sys.exit(1)


if __name__ == '__main__':
    main()
