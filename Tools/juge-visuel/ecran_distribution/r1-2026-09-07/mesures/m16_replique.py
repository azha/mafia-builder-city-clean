#!/usr/bin/env python3
# m16 — la replique du lieutenant (.dit) : indentation et guillemets.
# La CSS met .dit DANS le bloc flex, a droite du medaillon (.perso{display:flex;gap:9px}),
# et les cadres #54 et #56 encadrent tous deux le texte par « ... ».
# Controle positif : sur la REFERENCE, l'encre de la replique doit commencer a la
#   MEME abscisse que le nom "Lt. Rin" (meme colonne du flex) -- si ce n'est pas le
#   cas, la sonde ne lit pas ce que je crois.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def x_encre(im,y0,y1,x0,x1,seuil,nom):
    px=im.load()
    on=[x for x in range(x0,x1) if any(L(px[x,y])>=seuil for y in range(y0,y1))]
    if not on: print(f"  {nom}: rien"); return None
    # groupes de colonnes contigues (les 3 premiers = les 3 premiers signes)
    grp=[[on[0]]]
    for x in on[1:]:
        if x-grp[-1][-1]<=3: grp[-1].append(x)
        else: grp.append([x])
    print(f"  {nom:38s} premiere encre x={on[0]:4d} ({on[0]/3.6:5.1f} CSS) ; "
          f"3 premiers groupes = {[(g[0],g[-1],g[-1]-g[0]+1) for g in grp[:3]]}")
    return on[0], grp

print("\n--- CONTROLE POSITIF : nom et replique partent-ils de la meme colonne ? (REFERENCE) ---")
a,_=x_encre(REF,1720,1747,150,1040,90,"REF nom 'Lt. Rin'")
b,g=x_encre(REF,1818,1850,150,1040,90,"REF replique, 1re ligne")
print(f"    ecart nom -> replique = {b-a:+d} px = {(b-a)/3.6:+.1f} CSS  -> {'MEME COLONNE' if abs(b-a)<12 else 'DECALE'}")

print("\n--- CAPTURE ---")
c,_=x_encre(CAP,1723,1752,150,1040,90,"CAP nom 'Dima'")
d,g2=x_encre(CAP,1845,1876,20,1040,90,"CAP replique")
print(f"    ecart nom -> replique = {d-c:+d} px = {(d-c)/3.6:+.1f} CSS  -> {'MEME COLONNE' if abs(d-c)<12 else 'DECALE'}")
print(f"    la replique commence-t-elle a GAUCHE du medaillon (x=57) ? {'OUI' if d<57 else 'NON'}  (x={d})")

print("\n--- GUILLEMETS : hauteur du 1er groupe d'encre vs celle du 2e ---")
def haut_groupe(im,y0,y1,x0,x1,seuil,nom):
    px=im.load()
    ys=[y for y in range(y0,y1) if any(L(px[x,y])>=seuil for x in range(x0,x1))]
    if not ys: return None
    print(f"    {nom:34s} x {x0}..{x1} : encre y {ys[0]}..{ys[-1]}  h={ys[-1]-ys[0]+1} px")
    return (ys[0],ys[-1])
# REFERENCE : le 1er groupe doit etre le guillemet ouvrant (bas, court, en haut de x-height)
for i,gr in enumerate(g[:3]):
    haut_groupe(REF,1810,1855,gr[0],gr[-1]+1,90,f"REF groupe {i+1} (x {gr[0]}..{gr[-1]})")
print()
for i,gr in enumerate(g2[:3]):
    haut_groupe(CAP,1838,1882,gr[0],gr[-1]+1,90,f"CAP groupe {i+1} (x {gr[0]}..{gr[-1]})")
print("\n  Lecture : un guillemet ouvrant francais est un signe COURT (2 chevrons) place")
print("  en partie HAUTE de l'x-height ; une capitale occupe toute la hauteur de capitale.")
