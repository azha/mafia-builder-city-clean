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
MOI = 'mafia-blender'    # le détenteur légitime de cette porte pour ce script

# (index, étiquette ATTENDUE à cet index, sortie, pourquoi ce rendu est dû)
DUS = [
    (131, 'Le dossier — trois pistes qui ne se mélangent pas',
     'screen_b7/reference-1080x2102.png',
     "E1 : ce cadre attribuait au JOUEUR un palier qui est celui d'UN LIEUTENANT "
     "(`lifestyle_audit_state` porte player_id ET lieutenant_id). Le générateur était corrigé, "
     "la PAGE ne l'était pas — sans re-pose, cette référence montrait encore le défaut"),
    (143, 'Les douze crans, tous',
     'screen_b7/reference-vocabulaire-1080x2102.png',
     "E2 : les cadres d'état ne montrent que 6 des 12 crans ; le juge a classé NON APPROUVÉ sur "
     "« l'échelle de chaque piste a disparu ». Ce témoin dessine l'énumération entière"),
    (144, 'Il a pris, pas encore de quoi le lire',
     'reputation/reference-indetermine-1080x2102.png',
     "F12 : l'état `indeterminate` AVEC de l'absorbé n'avait aucune ligne, et le client en avait "
     "inventé une qui parlait du joueur au lieu du lieutenant"),
    (145, 'Les onze crans, tous',
     'screen_c1/reference-vocabulaire-1080x2102.png',
     "`fading` et `lingering` sont servis par le back et n'avaient aucun dessin"),
]


def machine_occupee():
    """Tout ce qui rend la machine à quelqu'un d'autre — des faits physiques, jamais un `pgrep`
    sur le nom du script (il se matche lui-même et rend un PID pour rien).

    ⛔ ANGLE MORT PAYÉ LE 2026-09-06 : cette garde ne regardait QUE les conteneurs de gate. Elle
       est passée au vert pendant qu'une session voisine tenait la porte Unity pour un run
       batchmode — je l'avais écrite contre le gate E2E, et je l'ai lue comme « la machine est
       libre ». Une garde qui vérifie UNE des raisons de s'abstenir rassure sur les autres.
       (Les rendus n'ont duré que 2 s et rien n'a été mesuré comme cassé — mais la garde, elle,
       était fausse, et c'est ça qu'on répare.)
    """
    occupants = []
    # ── 1. LA PORTE UNITY — le signal OFFICIEL, et le seul qui dise l'intention d'un voisin.
    #    Un `ps` ne voit qu'un run DÉJÀ commencé ; la porte dit « je vais en lancer un ».
    #    C'est le critère que ma garde n'avait pas, et pourquoi elle est passée au vert le
    #    2026-09-06 alors qu'une session la tenait depuis 94 minutes.
    porte = os.path.expanduser('~/project/mafia-clean-city/scripts/creneau-unity.sh')
    if os.path.exists(porte):
        d = subprocess.run([porte, 'status'], capture_output=True, text=True)
        premiere = (d.stdout or '').strip().splitlines()[:1]
        # ⛔ La porte tenue PAR MOI n'est pas une occupation : c'est l'autorisation. Sans cette
        #    distinction la garde devient impossible à satisfaire autrement qu'en la contournant
        #    — prendre la porte comme le protocole l'exige la ferait refuser. Une garde qu'on ne
        #    peut satisfaire qu'en cassant ce qu'elle protège se corrige, elle ne se contourne pas.
        if premiere and premiere[0].startswith('PRIS') and MOI not in premiere[0]:
            occupants.append('porte-unity: ' + premiere[0][:70])
    else:
        occupants.append('porte-unity: SCRIPT INTROUVABLE — impossible d’affirmer qu’elle est libre')

    r = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True)
    if r.returncode != 0:
        return None                      # docker illisible : on ne prétend pas savoir
    occupants += ['gate:' + n for n in r.stdout.split() if n.startswith('mcc-e2e-')]

    # Unity en BATCHMODE tient la porte ; `unityhub-bin` qui traîne à 0 % ne la tient PAS —
    # les confondre ferait refuser tous les rendus pour toujours.
    p = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True)
    if p.returncode == 0:
        for ligne in p.stdout.splitlines():
            if '-batchmode' in ligne and 'unityhub' not in ligne.lower():
                occupants.append('unity-batchmode:' + ligne.split()[0])
    return occupants


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
        print('⛔ la machine est à quelqu’un d’autre : %s' % ', '.join(occupee[:4]))
        print('   Un rendu headless pendant un gate OU un run Unity batchmode charge la machine')
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
