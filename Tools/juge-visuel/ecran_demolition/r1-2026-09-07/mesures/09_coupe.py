# -*- coding: utf-8 -*-
"""Ou et comment la liste est coupee par .dm-bas ; presence du filet 2px du .dm-bas.
Controle POSITIF : sur la REFERENCE le meme balayage DOIT trouver le filet #2c3640 (44,54,64) sur 7 px.
Controle NEGATIF : le meme balayage sur une bande d'aplat de la capture ne doit trouver aucun filet."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def scan(px,y0,y1,x0,x1,lab,pas=2):
    print("  %s  (x %d..%d)"%(lab,x0,x1))
    prev=None
    for y in range(y0,y1):
        xs=range(x0,x1,pas)
        c=(med([px[x,y][0] for x in xs]),med([px[x,y][1] for x in xs]),med([px[x,y][2] for x in xs]))
        mk=""
        if prev and sum(abs(c[i]-prev[i]) for i in range(3))>=12: mk="  <=="
        if mk or y%5==0: print("     y=%4d %s%s"%(y,c,mk))
        prev=c

C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load(); print("OUVERT cap",C.size)
scan(pc,1786,1834,700,1020,"CAPTURE colonne DROITE (hors texte du bas)")
print()
print("  CAPTURE : recherche du filet (44,54,64) +-8 sur y=1780..1840, x=700..1020")
found=[]
for y in range(1780,1841):
    xs=range(700,1020,2)
    c=(med([pc[x,y][0] for x in xs]),med([pc[x,y][1] for x in xs]),med([pc[x,y][2] for x in xs]))
    if all(abs(c[i]-(44,54,64)[i])<=10 for i in range(3)): found.append((y,c))
print("     -> %d ligne(s) : %s"%(len(found),found))
print()
R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load(); print("OUVERT ref",R.size)
found=[]
for y in range(1760,1810):
    xs=range(700,1020,2)
    c=(med([pr[x,y][0] for x in xs]),med([pr[x,y][1] for x in xs]),med([pr[x,y][2] for x in xs]))
    if all(abs(c[i]-(44,54,64)[i])<=10 for i in range(3)): found.append(y)
print("  REFERENCE [controle positif] filet #2c3640 trouve sur %d lignes : y=%s"%(len(found),found))
found=[]
for y in range(900,960):
    xs=range(700,1020,2)
    c=(med([pc[x,y][0] for x in xs]),med([pc[x,y][1] for x in xs]),med([pc[x,y][2] for x in xs]))
    if all(abs(c[i]-(44,54,64)[i])<=10 for i in range(3)): found.append(y)
print("  CAPTURE [controle negatif, bande d'aplat y=900..960] : %d ligne(s)"%len(found))
print()
print("=== encre de la derniere rangee (Laverie) : ou s'arrete-t-elle ? ===")
def ink_rows(px,y0,y1,x0,x1,fond,seuil=45):
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            p=px[x,y]
            if sum(abs(p[i]-fond[i]) for i in range(3))>seuil: n+=1
        if n: print("     y=%4d  px d'encre=%3d"%(y,n))
ink_rows(pc,1790,1830,60,700,(34,38,34))
