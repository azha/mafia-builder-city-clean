# m24 — CASSE du libelle d'etat : profil de hauteur d'encre colonne par colonne.
# Un mot TOUT EN CAPITALES a un profil PLAT (toutes les lettres a la meme hauteur) ;
# un mot en casse mixte a des creux (les bas-de-casse montent moins haut).
# CONTROLE POSITIF : le sous-titre "3 LIEUTENANTS", en capitales des DEUX cotes, doit rendre un
# profil plat des deux cotes. CONTROLE NEGATIF : le nom de rang, en casse mixte des deux cotes,
# doit rendre un profil creuse des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def profil(S,x0,y0,x1,y1,test,nom):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    cols=[]
    for x in range(int(a[0]),int(b[0])):
        ys=[y for y in range(int(a[1]),int(b[1])) if test(im[x,y])]
        if ys: cols.append((toCSS(S,x,0)[0], toCSS(S,0,ys[0])[1], toCSS(S,0,ys[-1]+1)[1]))
    if not cols: print(f'  {S["nom"]} {nom}: rien'); return
    hauts=[c[1] for c in cols]
    haut_min=min(hauts); haut_max=max(hauts)
    # part des colonnes dont le sommet est a plus de 2 CSS sous le sommet global
    bas=[c for c in cols if c[1]>haut_min+2.0]
    print(f'  {S["nom"]} {nom:22s} : {len(cols):3d} colonnes · sommet {haut_min:.2f}..{haut_max:.2f} '
          f'(amplitude {haut_max-haut_min:.2f} CSS) · colonnes >2 CSS sous le sommet : {100*len(bas)/len(cols):.0f} %')
    return cols
creme=lambda c: c[0]>165 and c[1]>150 and c[2]>120
cr2  =lambda c: c[0]>135 and c[1]>120 and 5<c[0]-c[2]<75
print('\n=== SUJET : libelle d\'etat ("ETAT" en reference) ===')
profil(R,470,684,525,704,cr2,'libelle d\'etat')
profil(C,470,313,525,336,cr2,'libelle d\'etat')
print('\n=== CONTROLE POSITIF : sous-titre "3 LIEUTENANTS" (capitales des deux cotes) ===')
profil(R,100,76,255,95,cr2,'sous-titre')
profil(C,100,70,265,90,cr2,'sous-titre')
print('\n=== CONTROLE NEGATIF : nom de rang (casse mixte des deux cotes) ===')
profil(R,152,653,285,680,creme,'nom rang3 "Blanchiment"')
profil(C,152,287,258,312,creme,'nom rang1 "Lt. Oster"')
print('\n=== texte de puce (capitales des deux cotes : DELEGUE / RECENT) ===')
cy=lambda c: c[2]>140 and c[2]-c[0]>40
profil(R,164,685,240,704,cy,'puce reference')
profil(C,164,321,238,341,cy,'puce jeu')
