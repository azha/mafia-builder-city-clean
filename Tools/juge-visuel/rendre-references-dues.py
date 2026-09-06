#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend les références de juge DUES, et refuse de tourner si la machine ne lui appartient pas.

Pourquoi un script et pas deux lignes tapées au moment du top : les deux rendus dus attendent la
fin d'un gate E2E, donc ils seront lancés plus tard, par quelqu'un qui n'aura pas le contexte
sous les yeux. Un index de cadre tapé de mémoire est exactement la faute qui a coûté une rangée
en double le 2026-09-06 — ici l'index est APPARIÉ À SON ÉTIQUETTE et vérifié avant tout rendu.

⛔ GARDE MACHINE. Un rendu headless pendant un gate E2E charge la machine de l'user, et ce dépôt a
   mesuré quatre échecs d'environnement d'affilée chez un relecteur pour cette seule raison. Le
   script REFUSE de démarrer tant que des conteneurs de gate tournent — et il le dit.

Usage : rendre-references-dues.py [--verifier]     (--verifier : contrôle tout, ne rend rien)
"""
import os
import re
import subprocess
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGE = os.path.join(ATELIER, 'ecrans-brennar-6.html')
RENDRE = os.path.abspath(os.path.join(ICI, '..', 'rendre-tel.py'))
ECHELLE = '3.6'          # 300 px CSS → 1080 ; c'est la résolution de travail des juges (§DA-3)
TAILLE = (1080, 2102)

# (index, étiquette ATTENDUE à cet index, sortie, pourquoi ce rendu est dû)
DUS = [
    (137, 'La filière — où en est chaque étape', 'screen_c2/reference-1080x2102.png',
     'la référence rend encore la v1, dessinée sur une prémisse morte depuis le 2026-08-31 ; '
     'un juge qui en part jugerait contre une planche périmée'),
    (68, 'Lui trouver un avocat', 'ecran_loi/reference-avocat-1080x2102.png',
     'la référence du dossier montre l’arrestation (cadre 67) ; les cartes de choix d’avocat '
     'vivent au cadre 68 et n’ont AUCUNE référence — `Loi:339` est non vérifiable sans elle'),
]


def machine_occupee():
    """Les conteneurs de gate qui tournent. Un fait physique, pas un `pgrep` (qui se matche lui-même)."""
    r = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True)
    if r.returncode != 0:
        return None                      # docker illisible : on ne prétend pas savoir
    return [n for n in r.stdout.split() if n.startswith('mcc-e2e-')]


def etiquettes(page):
    return re.findall(r'<div class="etiquette">(.*?)</div>',
                      open(page, encoding='utf8', errors='replace').read())


def main():
    verifier_seul = '--verifier' in sys.argv
    rouges = []

    for chemin, quoi in ((PAGE, 'page de l’atelier'), (RENDRE, 'rendeur')):
        if not os.path.exists(chemin):
            rouges.append('⛔ %s introuvable : %s' % (quoi, chemin))
    if rouges:
        print('\n'.join(rouges)); sys.exit(1)

    # ── l'index doit porter l'étiquette attendue, sinon la page a bougé sous le script ──
    etq = etiquettes(PAGE)
    print('page : %d cadres' % len(etq))
    for idx, attendue, sortie, _ in DUS:
        if idx >= len(etq):
            rouges.append('⛔ index %d hors de la page (%d cadres)' % (idx, len(etq)))
        elif etq[idx] != attendue:
            rouges.append('⛔ cadre %d porte « %s », attendu « %s » — la page a bougé, '
                          'NE PAS rendre à cet index' % (idx, etq[idx], attendue))
        else:
            print('  cadre %-3d ↔ « %s »  ✅' % (idx, attendue))
    if rouges:
        print(); print('\n'.join(rouges)); sys.exit(1)

    occupee = machine_occupee()
    if occupee is None:
        print('⚠️ docker illisible — impossible d’affirmer que la machine est libre. Rien rendu.')
        sys.exit(1)
    print('conteneurs de gate en cours : %d' % len(occupee))

    if verifier_seul:
        print('\n--verifier : les %d rendus sont prêts, rien exécuté.' % len(DUS))
        return
    if occupee:
        print('⛔ un gate E2E tourne (%s…). Un rendu headless pendant un gate charge la machine'
              % ', '.join(occupee[:3]))
        print('   de l’user et fabrique des rouges chez les voisins. Rien rendu — relancer après.')
        sys.exit(1)

    for idx, _, sortie, pourquoi in DUS:
        dest = os.path.join(ICI, sortie)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        print('\n── cadre %d → %s\n   (%s)' % (idx, sortie, pourquoi))
        r = subprocess.run([sys.executable, RENDRE, PAGE, str(idx), dest, ECHELLE])
        if r.returncode != 0:
            print('⛔ rendu en échec pour le cadre %d' % idx); sys.exit(1)
        # le rendeur asserte déjà la taille ; on le RE-VÉRIFIE ici, sur le fichier écrit
        try:
            import struct
            with open(dest, 'rb') as fh:
                tete = fh.read(24)
            w, h = struct.unpack('>II', tete[16:24])
        except Exception as e:
            print('⛔ PNG illisible : %s' % e); sys.exit(1)
        if (w, h) != TAILLE:
            print('⛔ %s fait %d×%d, attendu %d×%d' % (sortie, w, h, *TAILLE)); sys.exit(1)
        print('   %s : %d×%d ✅' % (sortie, w, h))

    print('\n%d références rendues. Penser à inscrire la nouvelle ligne à l’INDEX.' % len(DUS))


if __name__ == '__main__':
    main()
