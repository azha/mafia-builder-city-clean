# -*- coding: utf-8 -*-
"""Contrôle d'arithmétique de la table de couverture — ㉚ « les routes » + les deux gestes (maquette).

Mandat §5 : |clés B| + |éléments M non appariés| = nombre de lignes.
Mode maquette -> pas de colonne F, donc pas de |F sans source|.

Usage :
    python3 -I controle-arithmetique.py            # contrôle POSITIF  -> rc 0
    python3 -I controle-arithmetique.py --negatif  # contrôle NÉGATIF  -> rc 2 (doit rougir)

Chaque ligne est (B, M) : B = la clé projetée (None si la maquette dessine sans clé),
M = l'identifiant de l'élément de maquette (None si la clé n'est pas dessinée).
"""
import sys

# ── Périmètre de B, déclaré ───────────────────────────────────────────────────
# B = les corps RÉELLEMENT mesurés des routes qui servent CET écran et SES deux gestes :
#   GET /v1/supply-chain/graph · GET /v1/me/buildings · POST …/legs/:legId/maintain
#   POST /v1/operational/routes/:id/rebuild · POST /v1/session/open (structural_budget seul).
# HORS périmètre, déclaré : GET /v1/operational/routes (ligne brute — aucun cadre ne la lit ;
# son contenu est rapporté comme CONSTAT R2.2, pas comme des lignes B de cet écran) ; la barre
# de HUD (ARGENT / CHALEUR / JOUR) — chrome global, hors domaine ㉚.

LIGNES = [
    # ── appariées (B ● M ●) ────────────────────────────────────────────────────
    ("graph.nodes[].bucket",                        "M46 état du maillon"),
    ("graph.nodes[].has_arrow",                     "M47 « ↳ refoule vers »"),
    ("graph.nodes[].arrow_to_building_id",          "M47b cible du refoulement"),
    ("graph.legs[].origin_building_id",             "M30a nom d'origine de la liaison"),
    ("graph.legs[].destination_building_id",        "M30b nom de destination de la liaison"),
    ("graph.legs[].debt_bucket",                    "M49 état de la liaison"),
    ("graph.legs[].bypassed",                       "M50 « contournée »"),
    ("graph.routes[].origin_building_id",           "M02 nom d'origine de la route"),
    ("graph.routes[].destination_building_id",      "M03 nom de destination de la route"),
    ("graph.routes[].sinuosity_stress_bucket",      "M04 bande de sinuosité"),
    ("graph.routes[].time_to_collapse_bucket",      "M05 bande d'effondrement"),
    ("graph.routes[].state",                        "M06 état de la route"),
    ("graph.routes[].rebuilding",                   "M07 « En reconstruction »"),
    ("buildings[].name_i18n",                       "M08 libellé « Enseigne — District, îlot N »"),
    ("buildings[].block_id",                        "M09 « îlot 1501 »"),
    ("buildings[].district_name",                   "M10 « La Lisière »"),
    ("session_open.structural_budget.cap_reached",  "M24 option structurelle ÉTEINTE"),
    ("maintain.mode",                               "M11 le mode d'entretien choisi"),
    ("rebuild.mode",                                "M28 le mode de reconstruction choisi"),
    # ── B disponible, NI dessinée (● – –) : « passé à côté ? » ─────────────────
    ("graph.nodes[].building_id",                   None),
    ("graph.legs[].leg_id",                         None),
    ("graph.routes[].route_id",                     None),
    ("buildings[].building",                        None),
    ("buildings[].district_id",                     None),
    ("buildings[].operational_type",                None),
    ("buildings[].purchased_type",                  None),
    ("buildings[].convertible_types",               None),
    ("buildings[].lieutenant_ids",                  None),
    ("maintain.leg_id",                             None),
    ("maintain.maintenance_completes_at_tick",      None),
    ("maintain.next_stressed_leg",                  None),
    ("rebuild.routeId",                             None),
    ("rebuild.version",                             None),
    ("rebuild.rebuildCompletesAtTick",              None),
    ("session_open.structural_budget.used",         None),
    # ── M dessinée SANS clé B (– ● –) ──────────────────────────────────────────
    (None, "M01 titre de section « Les routes »"),
    (None, "M12 ordre des lignes de routes (état -> effondrement -> origine)"),
    (None, "M13 cardinal : 5 routes"),
    (None, "M14 titre de feuille « Entretenir la liaison »"),
    (None, "M15 titre de feuille « Reconstruire la route »"),
    (None, "M16 libellé de mode « Rafistoler »"),
    (None, "M17 glose « quelques minutes · l'usure retombe, sans disparaître »"),
    (None, "M18 coût « 50 € » (rafistoler)"),
    (None, "M19 libellé de mode « Renforcer »"),
    (None, "M20 glose « plus longtemps · l'usure est effacée »"),
    (None, "M21 coût « 300 € » (renforcer)"),
    (None, "M22 marque « votre grande décision du jour » (Renforcer)"),
    (None, "M23 libellé de mode « Contourner »"),
    (None, "M25 glose « tout de suite · la liaison se repose… »"),
    (None, "M26 coût « 50 € » (contourner)"),
    (None, "M27 « ça part du compte tout de suite »"),
    (None, "M29 « Annuler »"),
    (None, "M31 refus « Pas assez d'argent pour ça. »"),
    (None, "M32 refus « Un entretien est en cours sur place. Il s'achèvera de lui-même. »"),
    (None, "M33 phrase du cap « Votre décision de structure d'aujourd'hui est prise. Reprenez demain. »"),
    (None, "M34 marque « en entretien » sur la liaison"),
    (None, "M35 avertissement « Pendant les travaux, plus rien ne passe sur cette route. »"),
    (None, "M36 libellé de mode « Petit détour »"),
    (None, "M37 glose « on contourne ce qui gêne, au plus près »"),
    (None, "M38 coût « 100 € »"),
    (None, "M39 libellé de mode « Remaniement »"),
    (None, "M40 glose « on redessine une bonne partie du trajet »"),
    (None, "M41 coût « 400 € »"),
    (None, "M42 libellé de mode « Remise à plat »"),
    (None, "M43 glose « on repart d'un trajet droit, sans tenir compte de l'usure »"),
    (None, "M44 coût « 1 000 € »"),
    (None, "M45 marque « votre grande décision du jour » (Remise à plat)"),
    (None, "M48 refus « Une reconstruction est déjà en cours. Attendez qu'elle s'achève. »"),
    (None, "M51 refus « Vous avez confié cette catégorie à un lieutenant. … »"),
    (None, "M52 entête « La chaîne » + sous-titre"),
    (None, "M53 titre « Les maillons »"),
    (None, "M54 titre « Les liaisons »"),
]

NEGATIF = [
    # Contrôle négatif : une ligne sans B ET sans M (une ligne qui ne compte nulle part)
    # -> la somme ne retombe plus sur le nombre de lignes.
    (None, None),
]


def controle(lignes):
    bs = [b for (b, _m) in lignes if b is not None]
    ms_non_apparies = [m for (b, m) in lignes if b is None and m is not None]
    doublons = sorted({b for b in bs if bs.count(b) > 1})
    nb_b = len(set(bs))
    nb_m = len(ms_non_apparies)
    total = len(lignes)
    print("|clés B|                 = %d" % nb_b)
    print("|éléments M non appariés| = %d" % nb_m)
    print("somme                    = %d" % (nb_b + nb_m))
    print("nombre de lignes         = %d" % total)
    if doublons:
        print("ÉCHEC : clé B en double -> %s" % doublons)
        return 2
    if nb_b + nb_m != total:
        print("ÉCHEC : la somme ne retombe pas sur le nombre de lignes "
              "(écart %d — une ligne qui ne porte ni B ni M, ou une clé B comptée deux fois)"
              % (total - nb_b - nb_m))
        return 2
    print("OK : |B| + |M non appariés| = lignes")
    return 0


if __name__ == "__main__":
    negatif = "--negatif" in sys.argv
    lignes = LIGNES + (NEGATIF if negatif else [])
    print("=== contrôle %s ===" % ("NÉGATIF (DOIT rougir)" if negatif else "POSITIF"))
    sys.exit(controle(lignes))
