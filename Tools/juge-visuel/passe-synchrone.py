#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La fenêtre synchrone : empreinte → 240 corps → empreinte → comparaison. Dans cet ordre, sans rien entre.

`mafia-back` l'a dit nettement : la comparaison des deux empreintes est **le seul geste non
rattrapable** de la passe. Si l'horloge du compte a bougé pendant la capture, planches et corps ne
décrivent plus le même monde — et on l'apprend à la minute au lieu de le découvrir demain devant
un juge, sur une base entière à refaire. Un geste qu'on ne peut pas rattraper ne se tape pas à la
main dans une fenêtre courte : il s'exécute.

⛔ CE QUE CE SCRIPT NE FAIT PAS. Il ne sème rien, ne prend aucune planche, ne touche pas l'éditeur
   Unity. Il s'exécute APRÈS le top d'unity, quand le compte est semé et ses planches écrites.

⚠️ RÉGIME DÉCLARÉ — l'empreinte « avant » a besoin du `player_id`, et il y a deux façons de
   l'obtenir, qui ne se valent PAS :
     --player-id <uuid>   fourni par qui a semé le compte ⇒ AUCUNE session ouverte avant la
                          mesure : l'empreinte « avant » est celle du monde tel qu'unity l'a
                          laissé. C'est la forme JUSTE.
     (sans le drapeau)    le script se connecte pour lire `/v1/me` ⇒ il OUVRE UNE SESSION, et
                          `session/open` peut faire tiquer le monde. L'empreinte « avant » est
                          alors postérieure à cette session, et un écart avec l'empreinte
                          d'unity serait causé par LA MESURE ELLE-MÊME.
   Le script imprime laquelle des deux il emploie. Un dispositif qui ne déclare pas son régime
   ressemble trait pour trait à celui qui applique le bon.

Usage : passe-synchrone.py --compte <email> [--motdepasse <mdp>] [--player-id <uuid>]
"""
import os
import subprocess
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
CAPTURE = os.path.join(ICI, 'capturer-corps-reels.py')


def gate_en_cours():
    r = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return [n for n in r.stdout.split() if n.startswith('mcc-e2e-')]


def empreinte(player_id):
    """L'empreinte LARGE du compte — pas seulement l'horloge.

    ⛔ ÉLARGIE LE 2026-09-06, ET C'EST MON INSTRUMENT QUI AVAIT LE TROU. Elle ne lisait que
       `city_sim_clock.game_minute`. Un run a RE-SEMÉ `demo_capture` (TD-642) : les trois
       lieutenants ont changé d'identité, et l'écart n'a été vu que parce que l'horloge avait
       bougé AUSSI. Elle aurait pu ne pas bouger — un re-semis qui préserve la minute serait
       passé, et 240 corps auraient décrit un compte dont les planches montrent d'autres gens.
    ⇒ Une empreinte doit couvrir ce qui IDENTIFIE le monde, pas seulement ce qui le DATE.
    """
    import importlib.util as il
    sp = il.spec_from_file_location('e', os.path.join(ICI, 'empreinte-compte.py'))
    e = il.module_from_spec(sp)
    try:
        sp.loader.exec_module(e)
    except SystemExit:
        pass
    emp, erreurs = e.empreinte(player_id)
    if erreurs:
        return None, ' · '.join(erreurs)
    return emp, 'horloge · lieutenants (nombre ET NOMS) · bâtiments · planques · cartes'


def arg(nom, defaut=None):
    return sys.argv[sys.argv.index(nom) + 1] if nom in sys.argv else defaut


def main():
    compte = arg('--compte')
    if not compte:
        print('⛔ --compte <email> est obligatoire : cette passe ne tourne JAMAIS sur le compte')
        print('   par défaut. Le compte capturé doit être celui dont unity a pris les planches.')
        sys.exit(2)
    mdp = arg('--motdepasse')
    player_id = arg('--player-id')

    occupe = gate_en_cours()
    if occupe is None:
        print('⛔ docker illisible — impossible d’affirmer que la machine est libre.'); sys.exit(1)
    if occupe:
        print('⛔ un gate E2E tourne (%d conteneurs). Rien lancé.' % len(occupe)); sys.exit(1)

    if player_id:
        print('RÉGIME : `player_id` fourni ⇒ aucune session ouverte avant la mesure (forme juste)')
    else:
        print('⚠️ RÉGIME : `player_id` NON fourni ⇒ ce script va ouvrir une session pour le lire.')
        print('   `session/open` peut faire tiquer le monde : l’empreinte « avant » sera POSTÉRIEURE')
        print('   à cette session, et un écart avec celle d’unity pourrait venir de la mesure.')
        print('⛔ REFUS. La résolution automatique n’est pas implémentée, et c’est délibéré :')
        print('   un chemin qui ouvre une session sans que personne ne l’ait décidé fausserait')
        print('   la mesure même qu’il sert. Fournir --player-id (unity l’a en semant le compte).')
        sys.exit(2)

    avant, src = empreinte(player_id)
    print('\nEMPREINTE AVANT (%s) :' % src)
    for k in sorted(avant or {}):
        print('     %-22s %s' % (k, avant[k]))
    if avant is None:
        print('⛔ pas d’empreinte de départ ⇒ la comparaison finale ne prouverait rien. Rien lancé.')
        sys.exit(1)

    cmd = [sys.executable, CAPTURE, '--compte', compte] + (['--motdepasse', mdp] if mdp else [])
    print('\n── capture des corps : %s\n' % ' '.join(cmd))
    r = subprocess.run(cmd)
    code_capture = r.returncode

    apres, _ = empreinte(player_id)
    print('\nEMPREINTE APRÈS :')
    for k in sorted(apres or {}):
        print('     %-22s %s' % (k, apres[k]))

    if apres is None:
        print('⛔ empreinte finale illisible — l’écart ne peut pas être tranché.'); sys.exit(1)
    if apres != avant:
        print('\n⛔⛔ LE COMPTE A CHANGÉ PENDANT LA PASSE — colonne par colonne :')
        for k in sorted(set(avant) | set(apres)):
            a, b = avant.get(k, '(absent)'), apres.get(k, '(absent)')
            print('   %-22s %-28s %s %s' % (k, a, '→' if a != b else ' =', b if a != b else ''))
        print('   Quelque chose a écrit entre les deux mesures. Planches et corps ne décrivent')
        print('   PLUS le même monde : la base est à refaire, et on le sait à la minute.')
        sys.exit(1)
    print('\n✅ COMPTE INCHANGÉ sur les %d colonnes — corps et planches décrivent le même monde.'
          % len(avant))
    for k in sorted(avant):
        print('     %-22s %s' % (k, avant[k]))
    if code_capture != 0:
        print('⚠️ mais la capture a rendu %d — lire son log avant de conclure.' % code_capture)
        sys.exit(code_capture)


if __name__ == '__main__':
    main()
