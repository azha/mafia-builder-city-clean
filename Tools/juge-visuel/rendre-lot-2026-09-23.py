#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le lot de rendus du 2026-09-23 (second passage) — UNE commande, à lancer au tour que donne f2, jamais avant.

Pourquoi il est dû : le chrome des séries 4 et 6 porte désormais les décisions ratifiées (argent « 24 850 € », « Tiède / CHALEUR » —
atelier `9ee6783`, `maj-chrome-canon-2026-09-23.py`) : TOUTES les références changent. Et deux maquettes neuves attendent leur rendu :
⑦ (`ecrans-brennar-7-lieutenant.html`, 3 cadres) et ④ (`ecrans-brennar-accueil.html`, 4 cadres).
Ordre : (0) la machine libre ; (1) les 28 nominales + INDEX (`construire-dossiers.py`) ; (2) les 11 nommées (`extras`) ; (3) les 9 canons v4
(série 4, ×3) ; (4) le canon de ① (`rendre-canon-1-2026-09-23.py`) ; (5) les 7 cadres des maquettes neuves, rangés à côté des dossiers
comme MAQUETTES À RATIFIER (jamais comme références : `accueil/maquette-2026-09-23/`, `famille/maquette-7-2026-09-23/`).
Chaque étape est chronométrée ; la sortie donne l'heure de fin du navigateur (pour rendre la porte). Le tri suit en statique :
`trier-references-dejavu.py`.
Usage : python3 Tools/juge-visuel/rendre-lot-2026-09-23.py"""
import datetime, importlib.util, os, re, subprocess, sys, time
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
heure = lambda: datetime.datetime.now().strftime('%H:%M:%S')

def machine_libre():
    d = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True).stdout
    if any(n.startswith('mcc-e2e') for n in d.split()): return 'conteneurs de gate'
    p = os.path.expanduser('~/project/mafia-clean-city/scripts/creneau-unity.sh')
    if os.path.exists(p):
        t = (subprocess.run([p, 'status'], capture_output=True, text=True).stdout.strip().splitlines() or [''])[0]
        if t != 'LIBRE': return 'porte Unity : ' + t
    return None

def etape(nom, cmd):
    t0 = time.time(); r = subprocess.run(cmd, cwd=RACINE, capture_output=True, text=True)
    print(f'  {nom} : {time.time() - t0:5.1f} s — {(r.stdout.strip().splitlines() or [""])[-1][:110]}')
    if r.returncode: print(r.stdout[-400:], r.stderr[-400:]); sys.exit(f'⛔ {nom} a échoué : lot arrêté')

def main():
    occ = machine_libre()
    if occ: sys.exit(f'⛔ machine occupée ({occ}) : rien lancé')
    print(f'DÉBUT {heure()}')
    etape('28 nominales + INDEX', [sys.executable, 'Tools/juge-visuel/construire-dossiers.py'])
    spec = importlib.util.spec_from_file_location('cd', os.path.join(ICI, 'construire-dossiers.py'))
    cd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cd)
    extras = [(f, int(re.match(r'cadre (\d+)', n).group(1))) for r in cd.TABLE + cd.HORS_APPSHELL for f, n in r.get('extras', [])]
    for f, idx in extras:
        etape(f'nommée S6 #{idx}', [sys.executable, 'Tools/rendre-tel.py', os.path.join(ATELIER, 'ecrans-brennar-6.html'), str(idx),
                                   os.path.join('Tools/juge-visuel', f), '3.6'])
    etape('9 canons v4', [sys.executable, 'Tools/juge-visuel/rendre-references-serie4-2026-09-22.py', '--echelle', '3.0'])
    etape('canon de ①', [sys.executable, 'Tools/juge-visuel/rendre-canon-1-2026-09-23.py'])
    for page, dossier, n in (('ecrans-brennar-7-lieutenant.html', 'famille/maquette-7-2026-09-23', 3),
                             ('ecrans-brennar-accueil.html', 'accueil/maquette-2026-09-23', 4)):
        os.makedirs(os.path.join(ICI, dossier.split('/')[0], dossier.split('/')[1]), exist_ok=True)
        for i in range(n):
            etape(f'maquette {page} #{i}', [sys.executable, 'Tools/rendre-tel.py', os.path.join(ATELIER, page), str(i),
                                             os.path.join('Tools/juge-visuel', dossier, f'cadre-{i}-1080x2102.png'), '3.6'])
    print(f'FIN DU NAVIGATEUR {heure()}')

if __name__ == '__main__':
    main()
