#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle d'arithmétique du juge données ⊥ — TD-823 « les voix » — mode maquette.

Mandat §5 : |clés B| + |éléments M non appariés| = nombre de lignes de la table.
En mode maquette la colonne F n'existe pas, donc |F sans source| = 0.

Lancement :
    python3 -I controle-arithmetique.py           # run réel   -> exit 0 attendu
    python3 -I controle-arithmetique.py --negatif # faute injectée -> exit != 0 attendu

La table est saisie ici sous sa forme MINIMALE (id, appariement), pas recopiée en prose :
ce fichier est l'instrument, `../rapport.md` porte le texte.
"""
import sys

# ── B : clés du back qui peuvent porter une voix ou son déclencheur, sur les routes
#    des trois écrans. « M » = mesuré sur la pile (X-Server-Build 8d0184a4),
#    « D » = DÉDUIT du design approuvé 949e5613 (pas encore servi).
B = [
    # ㉛ Loi — GET /v1/me/legal (mesuré : 2 clés de racine)
    ("B1",  "activeCases",                          "M"),
    ("B2",  "activeCases[].caseId",                 "M"),
    ("B3",  "activeCases[].defendantLabel",         "M"),
    ("B4",  "activeCases[].chargeSeverity",         "M"),
    ("B5",  "activeCases[].daysRemaining",          "M"),
    ("B6",  "activeCases[].leak",                   "M"),
    ("B7",  "lawyerRoster",                         "M"),
    ("B8",  "me/legal.speaker{id,name}",            "D"),
    # ㉝ Démolition — GET /v1/friction/state (mesuré : 5 clés de racine)
    ("B9",  "friction_bucket",                      "M"),
    ("B10", "penalty_active",                       "M"),
    ("B11", "friction_node_count",                  "M"),
    ("B12", "perimeter_site_count",                 "M"),
    ("B13", "last_evaluated_tick",                  "M"),
    ("B14", "friction/state.speaker{id,name}",      "D"),
    # ㉝ fiche — GET /v1/friction/nodes/:buildingId (mesuré : 5 clés)
    ("B15", "friction/nodes.(4 bandes + neighbor_count)", "M"),
    # ㉓ Boutique
    ("B16", "marks_balance",                        "M"),
    ("B17", "me/iap/entitlements.skus",             "M"),
    # le NOM du locuteur, là où il vit aujourd'hui
    ("B18", "lieutenants[].name",                   "M"),
    ("B19", "buildings[].lieutenant_ids",           "M"),
    # le TEXTE des répliques (registre i18n, servi par le back)
    ("B20", "demolition.dit.* (4 cles x 2 locales)", "M"),
    ("B21", "loi.dit.* (3 cles)",                   "D"),
    ("B22", "boutique.dit.* + boutique.locuteur.* (5 cles)", "D"),
]

# ── M : éléments porteurs d'information des BANDES DE VOIX des 3 écrans.
#    appariement = l'id B auquel la ligne se fusionne, ou None si NON APPARIÉ.
M = [
    # ㉛ Loi — 6 cadres .pl-dit (cadres #67..#72)
    ("M1",  "nom d'orateur « Lt. Rin » (x6)",                       "B8"),
    ("M2",  "replique « Pour l'instant il n'a rien dit... »",        "B21"),
    ("M3",  "replique « Le commis d'office ne coute rien... »",      None),
    ("M4",  "replique « Il a donne la planque et le nom de Lt. Hara... »", "B21"),
    ("M5",  "replique « Il a tout vide... »",                        "B21"),
    ("M6",  "replique « A vous de dire. L'accord ferme... »",        None),
    ("M7",  "replique « Je ne peux pas vous dire s'il va tenir... »", None),
    ("M8",  "l'element fuite nomme : « la planque »",                None),
    ("M9",  "le second lieutenant nomme : « Lt. Hara »",             None),
    # ㉝ Démolition — 7 cadres .dm-dit (cadres #79..#84 + #149)
    ("M10", "nom d'orateur « Lt. Rin » (x5)",                        "B14"),
    ("M11", "replique « On a trop de choses au meme endroit... » (x2)", "B20"),
    ("M12", "replique « Celui-la, on le garde par habitude... »",    "B20"),
    ("M13", "replique « Deux propositions... »",                     "B20"),
    ("M14", "replique « Trop tard pour celle-la. »",                 "B20"),
    ("M15", "narration sans orateur « Une fois rase, on ne le remet pas... »", None),
    ("M16", "narration sans orateur « Vous avez deja tranche... »",  None),
    # ㉓ Boutique — 3 cadres .voix (cadres #98..#100)
    ("M17", "nom du locuteur « Wexler » (x3)",                       "B22"),
    ("M18", "ligne de role « derriere le comptoir » (x3)",           "B22"),
    ("M19", "buste #buste-homburg, portrait du locuteur (x3)",       None),
    ("M20", "replique « Ce qui est la est a vendre... »",            "B22"),
    ("M21", "replique « Les Marks, c'est dehors qu'on les achete... »", None),
    ("M22", "replique « Vous avez tout claque d'un coup... »",       "B22"),
    ("M23", "l'etagere affichee (onglet extras / Marks)",            None),
    ("M24", "le solde en Marks affiche dans la bande (50/50/0)",     "B16"),
    ("M25", "la pastille ACQUIS (cadre #100)",                       "B17"),
]

LIGNES_TABLE = 32  # nombre de lignes de « Table de couverture complète » de ../rapport.md


def compter(b, m, lignes):
    nb = len(b)
    non_apparies = [x for x in m if x[2] is None]
    nm = len(non_apparies)
    nf = 0  # mode maquette : pas de colonne F
    return nb, nm, nf, nb + nm + nf, lignes


def main(argv):
    negatif = "--negatif" in argv
    b, m, lignes = list(B), list(M), LIGNES_TABLE
    if negatif:
        # FAUTE INJECTÉE : un élément M non apparié est déclaré apparié (M23 -> B16).
        # La somme tombe à 31 alors que la table en porte 32 ⇒ la garde DOIT rougir.
        m = [(i, t, "B16" if i == "M23" else a) for (i, t, a) in m]

    nb, nm, nf, somme, lg = compter(b, m, lignes)
    # anti-vacuité : une table vide ne doit jamais rendre vert
    assert nb > 0 and len(m) > 0, "ANTI-VACUITE : B ou M est vide"
    # contrôle d'appariement : tout appariement cite un id B qui existe
    ids = {x[0] for x in b}
    orphelins = sorted({a for (_, _, a) in m if a is not None and a not in ids})
    print(f"|B|                 = {nb}")
    print(f"|M non apparies|    = {nm}   (sur {len(m)} elements M)")
    print(f"|F sans source|     = {nf}   (mode maquette : pas de colonne F)")
    print(f"somme               = {somme}")
    print(f"lignes de la table  = {lg}")
    print(f"appariements orphelins = {orphelins if orphelins else 'aucun'}")
    ok = (somme == lg) and not orphelins
    print("VERDICT ARITHMETIQUE :", "OK" if ok else "ROUGE")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
