#!/usr/bin/env python3
# Controle d'arithmetique de la table de couverture ㉟ (mandat juge-donnees, temps 5) :
#   |cles B| + |elements M non apparies| + |rendus F sans source| = nombre de lignes
# Positif : rc=0. Negatif (--negatif) : on retire une ligne, la somme doit rompre, rc=2.
import sys

# ── B : les cles SERVIES, mesurees sur la pile (sauf mention DEDUIT) ───────────────────────────
B_LISTE = [  # GET /v1/operational/dealers et GET /v1/operational/dealer/:id — mesure 11-dealers-deux.json
    "dealer", "dealer_spot_id", "name_i18n", "activity_band", "cash_band", "substance",
    "margin_band", "addiction_loyalty_status", "withdrawn", "district_name", "lek_band", "lane_band",
]
B_COLLECT = [  # POST /v1/operational/dealer/:id/collect — corps de SUCCES non mesure (DEDUIT, voir rapport)
    "collect.dealer_id", "collect.safehouse_id", "collect.collected_band",
    "collect.remaining_band", "collect.dealer_name_i18n",
]

# ── M : porteurs d'information de la maquette qu'AUCUNE cle B du domaine ne fournit ────────────
# Maquette LUE AU SHA 73806af8 (cadres 107-112 + 171). Le « il s'est retire » du cadre 110 de
# a3e02c2a, dont l'appariement a `withdrawn` etait indecidable, est RETIRE par 73806af8 : la ligne
# correspondante disparait (18 -> 17).
M_NON_APPARIES = [
    "M-n1  compteur « NN/N au travail »",
    "M-n2  compteur « NN caisses pleines »",
    "M-n3  compteur « NN grilles »",
    "M-n4  note6 « deux caisses deja en haut de l'echelle »",
    "M-n5  rangee selectionnee .dl.pris",
    "M-n6  etat vide .rien « Aucun dealer sur un point de vente »",
    "M-n7  CTA « AFFECTER UN DEALER »",
    "M-n8  CTA « RAMASSER LA CAISSE »",
    "M-n9  CTA eteint « RAMASSER — IMPOSSIBLE » + raison",
    "M-n10 pann d'aide 111 « un point de vente et la case qu'il couvre »",
    "M-n11 enseigne titre « La vente »",
    "M-n12 enseigne sous-titre contextuel",
    "M-n13 barre shell ARGENT « 24 850 € »",
    "M-n14 barre shell CHALEUR « Tiede »",
    "M-n15 barre shell « JOUR 12 / Plein jour »",
    "M-n16 cadre 112 L2 « Savoir combien il y a dans la caisse »",
    "M-n17 cadre 112 L4 « Ce que devient la caisse d'un dealer grille »",
]

# ── F : rendus du front qui n'ont NI cle B NI element de maquette ──────────────────────────────
F_SANS_SOURCE = [
    "F-s1 libelle de cran « Caisse » (:418 → :534)",
    "F-s2 libelle de cran « Marge » (:425 → :534)",
    "F-s3 illustration d'etat vide (:677)",
    "F-s4 rangee d'achat « Vous n'avez aucun coin de vente » + cout (:489-493)",
    "F-s5 ligne de retour des gestes poster/acheter, actionTexte (:235-237, :261-263)",
    "F-s6 rangee « Coin de vente sans dealer » + son quartier (:476-479, me/buildings)",
]

LIGNES_ANNONCEES = 40

b = B_LISTE + B_COLLECT
lignes = len(b) + len(M_NON_APPARIES) + len(F_SANS_SOURCE)

if "--negatif" in sys.argv:
    M_NON_APPARIES = M_NON_APPARIES[:-1]   # on retire une ligne SANS toucher la somme annoncee
    lignes = len(b) + len(M_NON_APPARIES) + len(F_SANS_SOURCE)

print("|B| ................ %d  (%d cles de la projection + %d cles de la collecte)"
      % (len(b), len(B_LISTE), len(B_COLLECT)))
print("|M non apparies| ... %d" % len(M_NON_APPARIES))
print("|F sans source| .... %d" % len(F_SANS_SOURCE))
print("somme .............. %d" % lignes)
print("lignes annoncees ... %d" % LIGNES_ANNONCEES)

assert len(set(b)) == len(b), "cle B en double"
if lignes != LIGNES_ANNONCEES:
    print("ROUGE : la somme (%d) ne vaut pas le nombre de lignes annonce (%d)." % (lignes, LIGNES_ANNONCEES))
    sys.exit(2)
print("VERT : somme == lignes annoncees.")
sys.exit(0)
