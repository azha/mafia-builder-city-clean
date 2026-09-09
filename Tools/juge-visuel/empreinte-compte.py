#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""L'empreinte d'un compte de capture — assez large pour voir un RE-SEMIS, pas seulement une horloge.

⛔ POURQUOI ELLE EXISTE SOUS CETTE FORME. L'empreinte précédente ne lisait qu'une colonne :
   `city_sim_clock.game_minute`. Le 2026-09-06, un run a RE-SEMÉ `demo_capture` — les trois
   lieutenants ont changé d'identité (TD-642) — et l'écart n'a été vu que parce que l'horloge
   avait bougé AUSSI. Elle aurait pu ne pas bouger : un re-semis qui préserve la minute serait
   passé sous une empreinte qui ne regarde que la minute, et 240 corps auraient décrit un compte
   dont les planches montrent d'autres gens.
⇒ **Une empreinte doit couvrir ce qui IDENTIFIE le monde, pas seulement ce qui le date.**
   Les NOMS des lieutenants en font partie : c'est la colonne par laquelle le re-semis s'est vu.

Ce qu'elle lit, tout en LECTURE SEULE, scopé au joueur :
    horloge      city_sim_clock.game_minute
    lieutenants  nombre ET NOMS ordonnés (la colonne qui a manqué)
    bâtiments    nombre
    planques     nombre
    cartes       nombre de cartes de levier

Usage : empreinte-compte.py <player_id> [--json]
        exit 0 si tout est lisible ; 1 si une seule mesure manque (une empreinte partielle ne
        vaut rien : elle rassure sur les colonnes qu'elle a lues).
"""
import json
import subprocess
import sys

PROJET = "mafia-clean-city"

# nom → SQL scopé au joueur. ⛔ Chaque requête PORTE son `WHERE player_id` : une mesure non
#    scopée décrirait un autre monde, et c'est le défaut que cette empreinte existe pour éviter.
MESURES = {
    "horloge_game_minute": "SELECT game_minute FROM city_sim_clock WHERE player_id='%s'",
    "lieutenants_n":       "SELECT count(*) FROM lieutenant WHERE player_id='%s'",
    # ★ LA COLONNE QUI MANQUAIT — triée, pour que l'empreinte ne dépende pas de l'ordre de retour
    "lieutenants_noms":    ("SELECT string_agg(name, '·' ORDER BY name) FROM lieutenant "
                            "WHERE player_id='%s'"),
    "batiments_n":         "SELECT count(*) FROM buildings WHERE player_id='%s'",
    "planques_n":          "SELECT count(*) FROM safehouses WHERE player_id='%s'",
    "cartes_levier_n":     "SELECT count(*) FROM highest_leverage_cards WHERE player_id='%s'",
}


def psql(sql):
    r = subprocess.run(["docker", "compose", "-p", PROJET, "exec", "-T", "pg", "psql",
                        "-U", "mafia", "-d", "mafia_clean_city", "-tAc", sql],
                       capture_output=True, text=True)
    # ⛔ `psql -tAc` rend une CHAÎNE VIDE quand la commande ÉCHOUE : un échec est indiscernable
    #    d'une absence de ligne. Les distinguer, sinon l'empreinte porte un trou qui se lit
    #    comme un fait — ce dépôt a déjà payé ça (un `player_id` vide, 23 rouges en cascade).
    if r.returncode != 0:
        return None, "psql a échoué (%d) : %s" % (r.returncode, (r.stderr or "").strip()[:110])
    return r.stdout.strip(), None


def empreinte(player_id):
    if not player_id:
        return None, ["player_id absent — refus de mesurer un monde non scopé"]
    out, erreurs = {}, []
    for nom, sql in MESURES.items():
        v, err = psql(sql % player_id)
        if err:
            erreurs.append("%s : %s" % (nom, err))
        elif v == "":
            # une agrégation rend '' quand il n'y a AUCUNE ligne : c'est un fait, pas un échec —
            # mais on l'écrit comme un vide NOMMÉ plutôt que de le confondre avec une erreur.
            out[nom] = "(aucune ligne)"
        else:
            out[nom] = v
    return out, erreurs


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    emp, erreurs = empreinte(sys.argv[1])
    if erreurs:
        print("⛔ empreinte INCOMPLÈTE — elle ne vaut rien, elle rassurerait sur les colonnes lues :")
        for e in erreurs:
            print("   " + e)
        sys.exit(1)
    if "--json" in sys.argv:
        print(json.dumps(emp, ensure_ascii=False, sort_keys=True))
    else:
        for k in sorted(emp):
            print("  %-22s %s" % (k, emp[k]))
    sys.exit(0)


if __name__ == "__main__":
    main()
