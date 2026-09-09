# -*- coding: utf-8 -*-
"""22 - Deux traits verticaux gris (106,106,106) a x=37 et x=1042, HORS du cadre de carte (64..1015).
Ont-ils un rail haut ou bas ? Quelle est leur extension verticale ?
CONTROLE POSITIF : le montant GAUCHE du cadre de carte (x=65) doit, lui, avoir un debut et une fin
qui coincident avec les rails mesures (536 et 886 pour la carte 1).
CONTROLE NEGATIF : x=500 (milieu de carte) ne doit pas etre un montant continu."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def segv(px,x,y0,y1,seuil=45,mini=8):
    s=[];deb=None
    for y in range(y0,y1):
        v=lum(px[x,y])>seuil
        if v and deb is None: deb=y
        if not v and deb is not None:
            if y-deb>=mini: s.append((deb,y-1))
            deb=None
    if deb is not None and y1-deb>=mini: s.append((deb,y1-1))
    return s
im=ouvrir('../capture-1080x2400.png'); px=im.load()
print()
for x in [37,65,500,1014,1042]:
    s=segv(px,x,330,2130)
    print("   x=%4d  couleur a y=1500 %-15s segments y = %s"%(x,str(px[x,1500]),s))
print()
print("   CN : x=500 (milieu de carte) ->", segv(px,500,330,2130))
print()
print("   Largeur du trait a x=36..39 (y=1500) :",[px[x,1500] for x in range(34,42)])
print("   Largeur du trait a x=1040..1045 (y=1500) :",[px[x,1500] for x in range(1039,1046)])

print()
print("--- couleurs des differents traits (capture) ---")
def coul(nom,x,y): print("   %-38s (%4d,%4d) = %s"%(nom,x,y,px[x,y]))
coul("cadre de carte, rail haut",500,536)
coul("cadre de carte, montant gauche",64,700)
coul("cadre de carte, montant droit",1015,700)
coul("cadre interne, rail haut",300,734)
coul("cadre interne, montant gauche",74,800)
coul("trait orphelin gauche",37,700)
coul("trait orphelin droit",1042,700)
coul("bord de la banniere, rail haut",500,353)
coul("bord de la banniere, montant gauche",58,430)
print()
print("--- profil transversal du montant gauche du cadre de CARTE (y=700) ---")
print("   ",[ (x,px[x,700]) for x in range(60,72) ])
