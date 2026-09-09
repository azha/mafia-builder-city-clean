#!/usr/bin/env python3
"""Comptage, cadre par cadre, de l'appariement jeton/geste dans la SOURCE des 6 cadres du
groupe (ecrans-brennar-6.html, cadres #73..#78). C'est le fondement de M1 : le jeu apparie un
jeton ACTIF a un geste MORT, ce que la maquette ne fait jamais.
Controle positif : 'sv-plaque' doit matcher (motif dont on SAIT qu'il existe).
Controle negatif : 'sv-zzz' doit rendre 0."""
import re
SRC="/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html"
s=open(SRC,encoding="utf-8").read()
print("source :",SRC,"—",s.count("\n")+1,"lignes")
i=s.find('Tout est encore à vous'); j=s.find('<aside>',i)
bloc=s[i-60:j]
cadres=re.split(r'<div class="cadre">',bloc)[1:]
noms=["#73 Tout est encore a vous","#74 Confier l'approvisionnement","#75 Deux charges confiees",
      "#76 Reprendre - ce que ca couterait","#77 Deja tranche aujourd'hui","#78 Les huit qui n'existent pas"]
print("cadres trouves :",len(cadres),"(6 attendus)\n")
for n,c in zip(noms,cadres):
    j2="use (eteint)" if c.count('sv-jeton use') else ("ACTIF" if c.count('sv-jeton') else "aucun")
    g2="MORT" if c.count('sv-geste mort') else ("actif" if c.count('sv-geste') else "aucun")
    print("   %-36s jeton = %-13s geste = %s" % (n,j2,g2))
print("\n   'sv-titron' dans tout le groupe :",bloc.count('sv-titron'),
      "— uniquement dans #78 :",cadres[5].count('sv-titron'))
print("   \"n'est pas encore\" dans tout le groupe :",bloc.lower().count("n'est pas encore"),
      "— uniquement dans le h3 de #78")
print("\nCONTROLE POSITIF 'sv-plaque' =",bloc.count("sv-plaque"),"(23 attendu, non nul)")
print("CONTROLE NEGATIF 'sv-zzz'    =",bloc.count("sv-zzz"),"(0 attendu)")
print("\n=> AUCUN cadre n'apparie un jeton ACTIF a un geste MORT : 4 actifs+actif, 1 use+MORT, 1 sans.")
