# -*- coding: utf-8 -*-
"""CHROME de capture-1080x2400 (sous shell) : filet du bandeau, medaillon, ailes, dock ; et
zone entre le bas du bandeau et le haut du contenu.
Temoin pour le filet quand le compte est BRULANT : hud-brennar.html .tel.chaud -> --braise (224,102,74).
CONTROLE POSITIF : le filet doit exister (pixel le plus clair de la ligne y=141 >> fond).
CONTROLE NEGATIF : la meme ligne sur la capture ECRAN SEUL doit rendre le fond nu."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def top(im,x0,y0,x1,y1,q=0.98):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum); t=ps[int(len(ps)*q):]
    return tuple(sorted(p[i] for p in t)[len(t)//2] for i in range(3))
def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)
def hexa(c): return "#%02x%02x%02x"%c
cap=Image.open(os.path.join(R,"capture-1080x2400.png")).convert("RGB")
seul=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("cap",cap.size," seul",seul.size)
print("  filet bandeau y=140..144 x=150..950  pic :", hexa(top(cap,150,140,950,144)), top(cap,150,140,950,144),
      " (temoin .tel.chaud = --braise (224,102,74))")
print("  CONTROLE NEGATIF meme ligne sur ecran-seul :", hexa(top(seul,150,140,950,144)))
print("  fond bandeau (y=20..60, x=600..760) :", hexa(med(cap,600,20,760,60)), med(cap,600,20,760,60))
print("  zone entre bandeau et contenu (y=200..260, x=300..760) :", hexa(med(cap,300,200,760,260)))
print("  zone sous le pave, avant dock (y=2120..2170, x=300..760) :", hexa(med(cap,300,2120,760,2170)))
print("  fond dock (y=2300..2380, x=60..200) :", hexa(med(cap,60,2300,200,2380)))
print("  ARGENT libelle (y=25..55,x=30..250) encre :", hexa(top(cap,30,25,250,55)))
print("  ARGENT valeur  (y=60..100,x=30..330) encre :", hexa(top(cap,30,60,330,100)))
print("  soulignement or sous ARGENT (y=110..122,x=40..250) :", hexa(top(cap,40,110,250,122)))
print("  JOUR 50        (y=25..55,x=900..1050) encre :", hexa(top(cap,900,25,1050,55)))
print("  aile droite valeur/phase (y=60..100,x=950..1060) encre :", hexa(top(cap,950,60,1060,100)))
print("  medaillon 'Brulant' (y=120..140,x=460..620) encre :", hexa(top(cap,460,120,620,140)))
print("  medaillon 'CHALEUR' (y=155..180,x=470..620) encre :", hexa(top(cap,470,155,620,180)))
print("  losange or sous medaillon (y=210..230,x=520..560) :", hexa(top(cap,520,210,560,230)))
# dock : ronds et libelles
print("  dock libelle 'EMPIRE' (y=2320..2350,x=190..300) encre :", hexa(top(cap,190,2320,300,2350)))
px=cap.load()
n=sum(1 for y in range(2180,2300) for x in range(0,1080) if lum(px[x,y])>lum((13,13,13))+10)
print("  dock : %d px 'non-fond' entre y=2180 et 2300 (les 4 ronds)" % n)
