#!/usr/bin/env python3
"""Rayon d'arrondi mesure: pour chaque ligne pres du coin haut-gauche d'une boite, l'abscisse
du 1er pixel de bordure -> le retrait decroit sur ~rayon lignes.
Controle positif : .sv-plaque a border-radius:2px CSS = 7,2 px -> le retrait doit s'annuler
en ~7 lignes en REFERENCE. Controle negatif : une boite SANS coin (le filet .sv-bas, pleine
largeur) doit rendre un retrait nul des la 1re ligne."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def retrait(im,ytop,xgauche,n,seuil):
    p=im.load(); out=[]
    for k in range(n):
        y=ytop+k
        xs=[x for x in range(xgauche-6,xgauche+60) if lum(p[x,y])>=seuil]
        out.append((y, xs[0]-xgauche if xs else None))
    return out
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
for nom,im,y,x,s in (("REF plaque1 (radius CSS 2px=7,2px)",ref,851,53,50),
                     ("CAP plaque1",cap,616,50,50),
                     ("REF jeton   (radius CSS 3px=10,8px)",ref,643,53,58),
                     ("CAP jeton",cap,435,50,58),
                     ("REF CTA     (radius CSS 3px=10,8px)",ref,1938,53,58),
                     ("CAP CTA",cap,1994,50,45)):
    r=retrait(im,y,x,14,s)
    print(f"  {nom:36s} retraits = {[v for _,v in r]}")
    zs=[k for k,(_,v) in enumerate(r) if v is not None and v<=1]
    print(f"      -> retrait nul a la ligne {zs[0] if zs else 'jamais'}  (= rayon apparent en px)")
print("\n  CONTROLE NEGATIF (filet .sv-bas REF, pleine largeur, sans coin) :")
r=retrait(ref,1780,10,6,40)
print("     retraits =",[v for _,v in r])
