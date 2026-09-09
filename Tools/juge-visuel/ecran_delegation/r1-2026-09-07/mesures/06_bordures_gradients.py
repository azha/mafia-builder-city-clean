#!/usr/bin/env python3
"""(a) BORDURES: mediane d'une bande de 1 px de haut x 121 px de large (jamais 9 px: une
    fenetre plus haute que la bordure mesure le fond -- piege paye au 05).
(b) GRADIENTS: profil vertical median (bande 121 px de large) a l'INTERIEUR d'une boite.
Controle positif: la bordure haute de plaque1 en REFERENCE doit valoir #38434e a <=6.
Controle negatif: une ligne 6 px SOUS la bordure doit en differer de >6."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def bande(im,y,x0,x1):
    px=im.load(); vs=[px[x,y] for x in range(x0,x1)]
    vs.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2]); return vs[len(vs)//2]
def hx(c): return "#%02x%02x%02x"%c
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
def H(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)

print("\n=== (a) BORDURES (bande 1px de haut, x=600..720, hors texte) ===")
B=[("plaque1 bord HAUT",ref,(851,853),cap,(616,619),"#38434e"),
   ("plaque1 bord BAS", ref,(984,986),cap,(743,745),"#38434e"),
   ("jeton bord HAUT",  ref,(643,645),cap,(435,437),"#5a4a2a"),
   ("sv-tete bord BAS", ref,(604,606),cap,(395,397),"#333c46"),
   ("sv-bas bord HAUT", ref,(1780,1786),cap,(1854,1862),"#2c3640"),
   ("CTA bord HAUT",    ref,(1938,1940),cap,(1994,1996),None),
  ]
for nom,ia,(ya0,ya1),ib,(yb0,yb1),css in B:
    a=max((bande(ia,y,600,720) for y in range(ya0,ya1+1)),key=lambda p:sum(p))
    b=max((bande(ib,y,600,720) for y in range(yb0,yb1+1)),key=lambda p:sum(p))
    t=f"  CSS {css} ecartREF={d(a,H(css))}" if css else ""
    print(f"  {nom:20s} REF {hx(a)} {a!s:16s} CAP {hx(b)} {b!s:16s} d(REF,CAP)={d(a,b):3d}{t}")

print("\n=== (b) PROFIL VERTICAL DANS LA PLAQUE 1 (x=600..720, hors texte) ===")
print("  REF (haut 855 -> bas 982)                CAP (haut 621 -> bas 741)")
for k in range(9):
    yr=855+int(k*(982-855)/8); yc=621+int(k*(741-621)/8)
    a=bande(ref,yr,600,720); b=bande(cap,yc,600,720)
    print(f"   y={yr:5d} {hx(a)} {a!s:16s}      y={yc:5d} {hx(b)} {b!s:16s}")
ra=bande(ref,857,600,720); rb=bande(ref,980,600,720)
ca=bande(cap,623,600,720); cb=bande(cap,739,600,720)
print(f"  amplitude du degrade  REF: d(haut,bas)={d(ra,rb)}   CAP: d(haut,bas)={d(ca,cb)}")

print("\n=== (b') PROFIL DANS LA BOITE CTA (x=760..860, entre libelle et small) ===")
for k in range(6):
    yr=1943+int(k*(2037-1943)/5); yc=1999+int(k*(2092-1999)/5)
    print(f"   REF y={yr:5d} {hx(bande(ref,yr,300,380))}      CAP y={yc:5d} {hx(bande(cap,yc,300,380))}")

print("\n=== (c) FOND .serv6 : degrade 180deg #1d2229 -> #161a20 (58%) -> #121519 ===")
for f in (0.05,0.25,0.5,0.75,0.95):
    yr=int(434+f*(2098-434)); yc=int(143+f*(2152-143))
    print(f"   {f*100:4.0f}%  REF y={yr:5d} {hx(bande(ref,yr,300,420))}   CAP y={yc:5d} {hx(bande(cap,yc,300,420))}")

print("\nCONTROLE POSITIF bordure plaque1 REF vs #38434e :", hx(bande(ref,852,600,720)), "ecart", d(bande(ref,852,600,720),H("#38434e")))
print("CONTROLE NEGATIF ligne 6px sous la bordure       :", hx(bande(ref,860,600,720)), "ecart", d(bande(ref,860,600,720),H("#38434e")))

print("\n=== (b'') SECOND CHEMIN : le meme profil de plaque sur d'AUTRES x et une AUTRE plaque ===")
print("   (une conclusion tiree d'une seule fenetre est un seul chemin de mesure)")
for x0,x1 in ((460,560),(430,530)):
    print(f"   --- x={x0}..{x1} ---")
    print(f"     REF plaque4 haut/bas : {bande(ref,1322,x0,x1)} / {bande(ref,1441,x0,x1)}")
    print(f"     CAP plaque4 haut/bas : {bande(cap,1066,x0,x1)} / {bande(cap,1181,x0,x1)}")
