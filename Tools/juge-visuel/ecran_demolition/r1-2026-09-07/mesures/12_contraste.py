# -*- coding: utf-8 -*-
"""Contraste WCAG encre/fond, encre prise sur le COEUR des glyphes (percentile 98 de la distance au fond).
Controle POSITIF : REF .dm-fiche (encre #2a2a22 sur #e9e4d4) doit rendre ~12:1 ; blanc pur sur noir pur = 21:1.
Controle NEGATIF : encre==fond doit rendre 1,00:1."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def L(c):
    def f(u):
        u=u/255.0
        return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def ratio(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+.05)/(lb+.05)
def fond_de(px,box):
    x0,y0,x1,y1=box; R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1): p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B))
def encre(px,box,fond,q=0.98):
    x0,y0,x1,y1=box; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; pts.append((sum(abs(p[i]-fond[i]) for i in range(3)),p))
    pts.sort(key=lambda t:t[0])
    k=int(q*len(pts)); sel=[p for d,p in pts[k:]]
    return (med([p[0] for p in sel]),med([p[1] for p in sel]),med([p[2] for p in sel]))
R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load()
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load()
print("OUVERT ref %s / cap %s"%(R.size,C.size))
print("CONTROLE  blanc/noir = %.2f:1   identique = %.2f:1"%(ratio((255,255,255),(0,0,0)),ratio((30,30,30),(30,30,30))))
print()
jobs=[
 ("REF","fiche .l u (petit)",pr,(105,780,700,805),(700,760,900,780)),
 ("REF","h3 titre (grand)",pr,(46,478,700,515),(700,455,1000,478)),
 ("REF","p sous-titre (petit)",pr,(46,538,760,568),(700,455,1000,478)),
 ("REF","dm-dit (petit)",pr,(46,1820,1000,1855),(700,1795,900,1808)),
 ("REF","geste libelle (grand)",pr,(90,1972,600,2004),(600,1965,900,2010)),
 ("CAP","h3 titre (grand)",pc,(44,276,700,316),(700,250,1000,278)),
 ("CAP","p sous-titre (petit)",pc,(44,338,760,368),(700,250,1000,278)),
 ("CAP","dm-titron (petit)",pc,(44,655,400,680),(700,640,900,700)),
 ("CAP","glob .gros (grand)",pc,(96,498,220,545),(900,470,1020,530)),
 ("CAP","glob .q b (grand)",pc,(232,480,500,505),(900,470,1020,530)),
 ("CAP","glob .q i (petit)",pc,(236,524,1000,548),(900,470,1020,530)),
 ("CAP","rangee titre (grand)",pc,(80,756,400,788),(650,760,850,830)),
 ("CAP","rangee sous (petit)",pc,(80,800,600,824),(650,760,850,830)),
 ("CAP","rangee statut (petit)",pc,(930,776,1012,800),(650,760,850,830)),
 ("CAP","statut 'travaille' or",pc,(700,1120,1010,1160),(650,1100,700,1180)),
 ("CAP","dm-dit (petit)",pc,(44,1850,1000,1902),(700,1900,900,1930)),
 ("CAP","geste libelle (grand)",pc,(85,1988,860,2022),(600,1990,900,2030)),
 ("CAP","geste small (petit)",pc,(810,1990,1010,2050),(600,1990,900,2030)),
]
for src,lab,px,bx,bf in jobs:
    f=fond_de(px,bf); e=encre(px,bx,f)
    r=ratio(e,f)
    seuil=3.0 if "grand" in lab else 4.5
    print("  %-4s %-24s encre=(%3d,%3d,%3d) fond=(%3d,%3d,%3d)  contraste=%5.2f:1  seuil=%.1f  %s"
          %(src,lab,e[0],e[1],e[2],f[0],f[1],f[2],r,seuil,"OK" if r>=seuil else "SOUS LE SEUIL"))
