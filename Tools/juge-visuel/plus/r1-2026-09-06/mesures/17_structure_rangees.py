#!/usr/bin/env python3
"""Contenu d'une rangee : y a-t-il de l'encre A GAUCHE (medaillon d'icone), A DROITE (badge/chevron),
et une 2e ligne (sous-titre) ? Compare rangee par rangee, capture ET reference.
Controle positif : sur la REFERENCE, chaque carte doit rendre de l'encre a gauche (icone) ET a droite (chevron).
Controle negatif : une bande de fond de la reference (y 1160..1180, hors carte) doit rendre 0 partout."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"ouvre reference {R.size} / capture {C.size}")
rp,cp=R.load(),C.load()
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
# REFERENCE : encre = sombre sur creme, dans les bornes de carte x 68..1012
def ref_zone(a,b,x0,x1):
    return sum(1 for y in range(a,b) for x in range(x0,x1) if Lu(rp[x,y])<120)
CART=[(548,677,'Le registre du matin'),(696,825,'La planche d ordres'),(843,972,'Les telegrammes'),
      (1234,1363,'Les inspections'),(1381,1510,'Les commissariats'),(1529,1658,'Le zinc'),
      (1748,1877,'Le coffre-fort'),(1896,2025,'Aide . A propos')]
print("\n[REF] encre par zone de carte (gauche 80..200 = icone | centre 200..800 | droite 800..1010 = badge/chevron)")
for a,b,nom in CART:
    print(f"   {nom:22s} G={ref_zone(a,b,80,200):5d}  C={ref_zone(a,b,200,800):6d}  D={ref_zone(a,b,800,1010):5d}")
print("   CONTROLE NEGATIF bande de fond y1160..1180 :",
      ref_zone(1160,1180,80,200), ref_zone(1160,1180,200,800), ref_zone(1160,1180,800,1010))
# CAPTURE : encre = claire sur ardoise
def cap_zone(a,b,x0,x1):
    return sum(1 for y in range(a,b) for x in range(x0,x1) if Lu(cp[x,y])>95)
RANG=[(266,374,'LA REVUE DU JOUR'),(389,497,'LA VENTE'),(512,619,'LA VITRINE'),(634,742,'LES INSPECTIONS'),
      (757,865,'LE COMMISSARIAT'),(879,987,'LA SEMAINE'),(1002,1110,'LE DOSSIER'),(1125,1233,'LE JOURNAL & LA RUE'),
      (1247,1355,'LA FILIERE'),(1370,1478,'LA PREMIERE FOIS'),(1493,1600,'VOTRE PROFIL'),(1615,1723,'LES REGLAGES'),
      (1738,1846,"L'HORIZON DES POSSIBLES"),(1860,1968,'CE QUE VOUS AVEZ CONFIE'),(1983,2091,"LA CHAINE D'APPRO")]
print("\n[JEU] encre par zone de rangee (memes bornes x)")
for a,b,nom in RANG:
    print(f"   {nom:24s} G={cap_zone(a,b,80,200):5d}  C={cap_zone(a,b,200,800):6d}  D={cap_zone(a,b,800,1010):5d}")
print(f"\n   somme G sur les 15 rangees = {sum(cap_zone(a,b,80,200) for a,b,_ in RANG)}")
print(f"   somme D sur les 15 rangees = {sum(cap_zone(a,b,800,1010) for a,b,_ in RANG)}")

# --- CORRECTIF DE CONTROLE ---
# Le "controle negatif" ci-dessus est INVALIDE : hors carte le fond acajou est sombre (lum<120),
# donc le masque "encre" attrape TOUT le fond. Il ne prouve rien. Le masque n'a de sens QUE dans
# les bornes d'une carte (fond creme, lum 216). Controle negatif correct : une fenetre VIDE
# A L'INTERIEUR d'une carte.
print("\n[CORRECTIF] controle negatif VALIDE : fenetre vide a l'interieur d'une carte (x 700..800, y 560..600) =",
      ref_zone(560,600,700,800), " (attendu 0)")
print("            controle positif apparie : fond de carte lu a (750,580) =", rp[750,580], "lum=%.0f"%Lu(rp[750,580]))
