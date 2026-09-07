# -*- coding: utf-8 -*-
"""Medianes de fenetres (aplats) + couleur d'ENCRE (glyphes) par ecart au fond.
Controle POSITIF  : sur la REFERENCE, chaque aplat doit retrouver le hex de la CSS a <=6/255.
Controle NEGATIF  : deux jetons connus differents (#e9e4d4 fiche vs #8c2f36 verdict) doivent sortir differents.
Aucun echantillon a moins de 3 px d'un bord (fenetres choisies au coeur des aplats)."""
from PIL import Image

def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2

def fen(px,box):
    x0,y0,x1,y1=box; R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B)),len(R)

def encre(px,box,fond):
    """mediane des pixels du DECILE le plus eloigne du fond (coeur des glyphes)"""
    x0,y0,x1,y1=box; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            d=sum(abs(p[i]-fond[i]) for i in range(3))
            pts.append((d,p))
    pts.sort(key=lambda t:-t[0])
    k=max(1,len(pts)//10)
    top=[p for d,p in pts[:k]]
    return (med([p[0] for p in top]),med([p[1] for p in top]),med([p[2] for p in top])),len(pts),pts[0][0]

def hx(c): return "#%02x%02x%02x"%c
def dd(a,b): return tuple(a[i]-b[i] for i in range(3))
def maxabs(a,b): return max(abs(a[i]-b[i]) for i in range(3))

REF=Image.open("reference-1080x2102.png").convert('RGB'); pr=REF.load()
CAP=Image.open("capture-1080x2400.png").convert('RGB'); pc=CAP.load()
print("OUVERT reference %s / capture %s"%(REF.size,CAP.size))
print()
print("=== CONTROLE POSITIF sur la REFERENCE (jeton CSS attendu vs mesure) ===")
ctrl=[
 ("dm-tete fond",       "#1e1f1b", (700,455,1000,480)),
 ("dm-body fond haut",  "#20211d", (20,620,60,700)),
 ("dm-fiche fond",      "#e9e4d4", (700,760,900,780)),
 ("dm-fiche filet g.",  "#8c7a3f", (176,900,190,1000)),
 ("dm-verdict fond",    "#8c2f36", (700,1250,900,1290)),
 ("dm-bas fond",        "#141a21", (700,1800,900,1830)),
 ("dm-bas filet haut",  "#2c3640", (300,1782,800,1786)),
 ("dm-geste.rouge fond","#241214", (600,1970,900,2010)),
 ("dm-geste.rouge bord","#5c2a2a", (400,1939,800,1942)),
]
ok=0
for nom,hexa,box in ctrl:
    att=tuple(int(hexa[i:i+2],16) for i in (1,3,5))
    m,n=fen(pr,box)
    e=maxabs(m,att); ok+= (e<=6)
    print("  %-22s attendu %s=%s  mesure %s=%s  ecart max/canal=%d  n=%d  %s"%(nom,hexa,att,hx(m),m,e,n,"OK" if e<=6 else "ECART"))
print("  -> %d/%d aplats de la reference retrouves a <=6/255"%(ok,len(ctrl)))
m1,_=fen(pr,(700,760,900,780)); m2,_=fen(pr,(700,1250,900,1290))
print("  CONTROLE NEGATIF fiche %s vs verdict %s -> ecart max/canal=%d (doit etre grand)"%(hx(m1),hx(m2),maxabs(m1,m2)))
print()
print("=== CAPTURE : aplats mesures, compares au jeton CSS du CHASSIS demo6 ===")
cap=[
 ("dm-tete fond",        "#1e1f1b", (700,250,1000,285)),
 ("dm-tete filet bas",   "#3a3c34", (300,395,800,398)),
 ("dm-body fond",        "#20211d", (12,470,34,600)),
 ("dm-glob fond",        "#232520", (900,470,1020,530)),
 ("dm-glob bord haut",   "#3c3e35", (300,436,800,439)),
 ("dm-bas fond",         "#141a21", (700,1900,900,1930)),
 ("dm-geste fond",       "#241c11", (600,1990,900,2030)),
 ("dm-geste bord haut",  "#5a4a2a", (400,1955,800,1958)),
 ("rangee fond",         "#232520", (650,760,850,830)),
 ("rangee bord haut",    "#3c3e35", (300,726,800,729)),
]
for nom,hexa,box in cap:
    att=tuple(int(hexa[i:i+2],16) for i in (1,3,5))
    m,n=fen(pc,box)
    e=maxabs(m,att)
    print("  %-22s jeton %s=%s  mesure %s=%s  ecart max/canal=%d  n=%d  %s"%(nom,hexa,att,hx(m),m,e,n,"EGAL" if e<=6 else "ECART"))
print()
print("=== ENCRE (couleur des glyphes) ===")
for lab,img,px,box,fond_box in [
 ("REF h3 titre",      "ref",pr,(50,455,700,500),(700,455,1000,480)),
 ("REF p sous-titre",  "ref",pr,(50,530,900,560),(700,455,1000,480)),
 ("CAP h3 titre",      "cap",pc,(45,275,600,320),(700,250,1000,285)),
 ("CAP p sous-titre",  "cap",pc,(45,340,900,370),(700,250,1000,285)),
 ("CAP glob .gros 13", "cap",pc,(80,470,220,540),(900,470,1020,530)),
 ("CAP glob .q b",     "cap",pc,(235,470,470,505),(900,470,1020,530)),
 ("CAP glob .q i",     "cap",pc,(235,515,1000,545),(900,470,1020,530)),
 ("CAP rangee titre",  "cap",pc,(80,745,340,785),(650,760,850,830)),
 ("CAP rangee sous",   "cap",pc,(80,795,560,825),(650,760,850,830)),
 ("CAP rangee statut", "cap",pc,(930,770,1010,800),(650,760,850,830)),
 ("CAP dm-dit",        "cap",pc,(45,1880,1000,1920),(700,1900,900,1930)),
 ("CAP geste libelle", "cap",pc,(80,1985,900,2020),(600,1990,900,2030)),
 ("CAP geste small",   "cap",pc,(800,1990,1000,2020),(600,1990,900,2030)),
 ("REF dm-dit",        "ref",pr,(45,1810,1000,1850),(700,1795,900,1808)),
 ("REF geste libelle", "ref",pr,(90,1970,600,2010),(600,1970,900,2010)),
]:
    f,_=fen(px,fond_box)
    c,n,dmax=encre(px,box,f)
    print("  %-20s fond=%s   encre=%s=%s   n=%d  dmax=%d"%(lab,hx(f),hx(c),c,n,dmax))
