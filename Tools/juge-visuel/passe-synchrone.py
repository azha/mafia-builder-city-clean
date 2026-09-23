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

   Troisième régime (décision f2 du 2026-09-23 : « ne le demande pas à la main ») :
     --player-id-me       le `player_id` est DÉRIVÉ au lancement : `POST /v1/auth/signin` avec la paire, puis `GET /v1/me`
                          (`player_id`, S1-b). Ni l'un ni l'autre n'appelle `session/open` : signin établit une session
                          d'AUTH (`auth.service.ts:194`), `me` est une lecture (`auth.controller.ts:410`) — l'horloge du
                          monde ne bouge pas, l'empreinte « avant » reste celle du monde laissé par unity. Un paramètre
                          manuel est une occasion de viser le mauvais compte ; l'identité connectée, non.
                          Le `player_id` est imprimé par son EMPREINTE, jamais sa valeur.

Usage : passe-synchrone.py (--compte-env | --compte <email>) (--player-id-me | --player-id <uuid>)
        (--compte-env : l'identifiant vient de MAFIA_CAPTURE_IDENTIFIER, masqué partout ; mot de passe : MAFIA_CAPTURE_PASSWORD)
"""
import importlib.util
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

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
    if erreurs:   # psql peut recopier la requête dans son erreur : le player_id n'en sort que masqué
        return None, ' · '.join(erreurs).replace(player_id, _capteur().masquer(player_id))
    return emp, 'horloge · lieutenants (nombre ET NOMS) · bâtiments · planques · cartes'


def _capteur():
    spec = importlib.util.spec_from_file_location('ccr', CAPTURE)
    ccr = importlib.util.module_from_spec(spec); spec.loader.exec_module(ccr)
    return ccr


def player_id_par_me(compte, mdp, base):
    """signin + GET /v1/me — AUCUN session/open. Rend (player_id, None) ou (None, raison) ; la raison ne porte aucune valeur."""
    def appel(methode, route, corps=None, jeton=None):
        req = urllib.request.Request(base + route, method=methode, data=json.dumps(corps).encode() if corps is not None else None)
        req.add_header('Content-Type', 'application/json')
        if jeton: req.add_header('Authorization', 'Bearer ' + jeton)
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, json.loads(r.read().decode('utf-8', 'replace'))
        except urllib.error.HTTPError as e:
            return e.code, None
        except Exception as e:
            return None, type(e).__name__
    st, b = appel('POST', '/v1/auth/signin', {'identifier': compte, 'password': mdp})
    if st != 200 or not isinstance(b, dict):
        return None, f'signin : {st if st else b}'
    jeton = ((b.get('payload') or {}).get('data') or {}).get('access_token')
    st, b = appel('GET', '/v1/me', jeton=jeton)
    pid = (((b or {}).get('payload') or {}).get('data') or {}).get('player_id') if isinstance(b, dict) else None
    return (pid, None) if pid else (None, f'GET /v1/me : {st}, pas de player_id')


def arg(nom, defaut=None):
    return sys.argv[sys.argv.index(nom) + 1] if nom in sys.argv else defaut


def main():
    compte_env = '--compte-env' in sys.argv
    compte = (os.environ.get('MAFIA_CAPTURE_IDENTIFIER') or '').strip() if compte_env else arg('--compte')
    if compte_env and arg('--compte'):
        print('⛔ --compte-env et --compte s’excluent.'); sys.exit(2)
    if not compte:
        print('⛔ --compte-env (MAFIA_CAPTURE_IDENTIFIER) ou --compte <email> est obligatoire : cette passe ne tourne JAMAIS sur le compte')
        print('   par défaut. Le compte capturé doit être celui dont unity a pris les planches.')
        sys.exit(2)
    mdp = arg('--motdepasse')
    player_id = arg('--player-id')
    valeur = None
    par_me = '--player-id-me' in sys.argv
    if par_me and player_id:
        print('⛔ --player-id-me et --player-id s’excluent.'); sys.exit(2)
    ccr = _capteur()
    print('compte : %s (source : %s)' % (ccr.masquer(compte), 'MAFIA_CAPTURE_IDENTIFIER' if compte_env else '--compte'))

    # ⛔ Décision du 2026-09-22 : la paire du compte de capture n'existe que sous `MAFIA_CAPTURE_*`. `MAFIA_DEMO_*` posé dans le
    #    shell du créneau est une FAUTE : une suite fonctionnelle lancée dans ce shell effacerait et recruterait sur le compte
    #    connecté, et le compte gelé muterait. On refuse plutôt que de mesurer un monde que ce shell a pu déplacer.
    demo = [v for v in ('MAFIA_DEMO_IDENTIFIER', 'MAFIA_DEMO_PASSWORD') if os.environ.get(v)]
    if demo:
        print('⛔ FAUTE : %s posée(s) dans ce shell. La paire de capture ne vit que sous MAFIA_CAPTURE_* ;' % ', '.join(demo))
        print('   retirer MAFIA_DEMO_* (unset) avant la passe. Rien lancé.')
        sys.exit(2)
    if mdp:
        print('⚠️ --motdepasse : la valeur est visible dans la liste des processus ; préférer MAFIA_CAPTURE_PASSWORD.')
    else:
        # le mot de passe est résolu par le capteur, avec la MÊME fonction : on l'annonce ici par son NOM, jamais sa valeur
        valeur, source = ccr.resoudre_mot_de_passe(compte, os.environ)
        if valeur is None:
            print('⛔ ' + source.replace(compte, ccr.masquer(compte))); sys.exit(2)
        print('mot de passe : lu dans %s' % source)
        if not par_me:
            del valeur

    occupe = gate_en_cours()
    if occupe is None:
        print('⛔ docker illisible — impossible d’affirmer que la machine est libre.'); sys.exit(1)
    if occupe:
        print('⛔ un gate E2E tourne (%d conteneurs). Rien lancé.' % len(occupe)); sys.exit(1)

    if par_me:
        pid, raison = player_id_par_me(compte, mdp or valeur, ccr.BASE)
        valeur = None
        if not pid:
            print('⛔ `player_id` non dérivé (%s) — rien lancé.' % raison); sys.exit(1)
        player_id = pid
        print('RÉGIME : `player_id` DÉRIVÉ par GET /v1/me (signin + lecture, aucun session/open) : %s' % ccr.masquer(player_id))
    elif player_id:
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

    cmd = [sys.executable, CAPTURE] + (['--compte-env'] if compte_env else ['--compte', compte]) + (['--motdepasse', mdp] if mdp else [])
    print('\n── capture des corps : %s\n' % ' '.join(cmd).replace(compte, ccr.masquer(compte)).replace(mdp or '\0', '***'))
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
