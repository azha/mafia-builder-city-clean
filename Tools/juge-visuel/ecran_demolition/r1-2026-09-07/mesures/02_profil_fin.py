# -*- coding: utf-8 -*-
"""Profil fin de lignes sur des plages choisies + medianes de fenetres.
Controle positif REF : .dm-tete = #1e1f1b (30,31,27) ; .dm-bas = #141a21 (20,26,33) ; fiche = #e9e4d4 (233,228,212).
Controle negatif  : le fond de .dm-verdict #8c2f36 (140,47,54) doit sortir DIFFERENT du fond de fiche."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def wmed(px,x0,y0,x1,y1):
    R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B)), (x1-x0)*(y1-y0)
def rowmed(px,y,x0,x1,pas=4):
    xs=range(x0,x1,pas)
    return (med([px[x,y][0] for x in xs]),med([px[x,y][1] for x in xs]),med([px[x,y][2] for x in xs]))

for path,plages in [
    ("capture-1080x2400.png",[(140,420,6),(1830,1980,3),(2130,2400,8)]),
    ("reference-1080x2102.png",[(420,650,6),(1760,1960,4),(2060,2102,3)]),
]:
    im=Image.open(path).convert('RGB'); W,H=im.size; px=im.load()
    print("OUVERT %s taille=%dx%d"%(path,W,H))
    for (a,b,s) in plages:
        print("  --- plage y=%d..%d ---"%(a,b))
        prev=None
        for y in range(a,min(b,H),s):
            c=rowmed(px,y,20,1060)
            mark=""
            if prev and sum(abs(c[i]-prev[i]) for i in range(3))>=10: mark="  <== saut"
            print("    y=%4d %s%s"%(y,c,mark)); prev=c
    print()

# controle positif / negatif sur la REFERENCE
im=Image.open("reference-1080x2102.png").convert('RGB'); px=im.load()
print("CONTROLE REF  dm-tete fond  attendu #1e1f1b=(30,31,27) mesure",wmed(px,700,450,900,470)[0])
print("CONTROLE REF  dm-bas  fond  attendu #141a21=(20,26,33) mesure",wmed(px,700,1800,900,1830)[0])
print("CONTROLE REF  fiche   fond  attendu #e9e4d4=(233,228,212) mesure",wmed(px,700,760,900,780)[0])
print("CONTROLE-NEG REF verdict fond attendu #8c2f36=(140,47,54) mesure",wmed(px,700,1250,900,1290)[0])
