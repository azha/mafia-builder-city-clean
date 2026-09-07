# -*- coding: utf-8 -*-
"""Bords VERTICAUX (colonnes) des cartes et bords HORIZONTAUX fins.
Controle POSITIF : sur la REFERENCE, la gouttiere .dm-body doit valoir 13 CSS x3,6 = 46,8 px
et la fiche doit occuper 300-2*13 = 274 CSS = 986,4 px de large.
Controle NEGATIF : la meme sonde sur une bande SANS carte doit ne trouver aucun bord."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def colmed(px,x,y0,y1,pas=2):
    ys=range(y0,y1,pas)
    return (med([px[x,y][0] for y in ys]),med([px[x,y][1] for y in ys]),med([px[x,y][2] for y in ys]))
def bords(px,W,y0,y1,seuil,lab):
    prof=[colmed(px,x,y0,y1) for x in range(W)]
    tr=[]
    for x in range(1,W):
        d=sum(abs(prof[x][c]-prof[x-1][c]) for c in range(3))
        if d>=seuil: tr.append((x,d,prof[x-1],prof[x]))
    grp=[]
    for t in tr:
        if grp and t[0]-grp[-1][-1][0]<=3: grp[-1].append(t)
        else: grp.append([t])
    print("  %s (bande y=%d..%d, seuil=%d) : %d bords"%(lab,y0,y1,seuil,len(grp)))
    for g in grp:
        b=max(g,key=lambda t:t[1])
        print("     x=%4d d=%3d  %s -> %s"%(b[0],b[1],b[2],b[3]))
    return [max(g,key=lambda t:t[1])[0] for g in grp]

R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load(); print("OUVERT ref",R.size)
print("REFERENCE")
b=bords(pr,1080,660,700,26,"fiche (bande sous le titre h4)")
b2=bords(pr,1080,1360,1420,20,"bande VIDE sous la fiche  [controle negatif]")
print("   -> gouttiere gauche mesuree = %s ; largeur fiche = %s"%(b[0] if b else "?", (b[-1]-b[0]) if len(b)>=2 else "?"))
print()
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load(); print("OUVERT cap",C.size)
print("CAPTURE")
bc=bords(pc,1080,470,600,20,"carte dm-glob")
bl=bords(pc,1080,760,840,20,"rangee 1 (Colis Kofi)")
bt=bords(pc,1080,1990,2060,20,"CTA dm-geste")
print()
print("=== bords HORIZONTAUX fins autour du haut de .dm-bas ===")
for lab,px,rng in [("REF",pr,range(1770,1800)),("CAP",pc,range(1845,1885))]:
    print("  %s :"%lab)
    for y in rng:
        c=(med([px[x,y][0] for x in range(600,1000,4)]),med([px[x,y][1] for x in range(600,1000,4)]),med([px[x,y][2] for x in range(600,1000,4)]))
        print("     y=%d %s"%(y,c))
