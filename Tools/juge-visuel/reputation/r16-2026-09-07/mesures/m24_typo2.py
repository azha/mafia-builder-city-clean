# m24 : hauteur de capitale, mesuree sur le PREMIER glyphe de la ligne (groupe de colonnes isole).
import sys; sys.path.insert(0,'.')
from lib import *

def ligne(nom, ya, yb, xa, xb, seuil):
    im=Image.open(DOSSIER+'/'+nom).convert('RGB'); px=im.load()
    colonnes=[x for x in range(xa,xb) if any(lum(px[x,y])>seuil for y in range(ya,yb))]
    if not colonnes: return None
    g=[]
    for x in colonnes:
        if g and x-g[-1][-1]<=2: g[-1].append(x)
        else: g.append([x])
    return px,g

def capglyphe(nom, ya,yb,xa,xb,seuil,idx=0):
    r=ligne(nom,ya,yb,xa,xb,seuil)
    if not r: return None
    px,g=r
    if idx>=len(g): return None
    gg=g[idx]
    ys=[y for y in range(ya,yb) if any(lum(px[x,y])>seuil for x in gg)]
    return (max(ys)-min(ys)+1, gg[0],gg[-1], min(ys),max(ys), len(g))

CAS=[
 ("titre 'Le miroir' — le L", [('reference-1080x2102.png',480,580,300,760,110,0),
                               ('capture-1080x2400.png',530,620,300,760,110,0),
                               ('capture-1080x1920.png',300,390,300,760,110,0)]),
 ("titre bas 'Rien...' — le R", [('reference-1080x2102.png',1710,1790,80,900,110,0),
                                 ('capture-1080x2400.png',1645,1720,70,900,110,0),
                                 ('capture-1080x1920.png',1415,1490,70,900,110,0)]),
 ("'Pas encore' — le P", [('reference-1080x2102.png',880,930,530,740,110,0),
                          ('capture-1080x2400.png',900,960,530,740,110,0),
                          ('capture-1080x1920.png',668,728,530,740,110,0)]),
 ("libelle CTA — le D", [('reference-1080x2102.png',1975,2020,220,860,110,0),
                         ('capture-1080x2400.png',1905,1950,190,880,110,0)]),
 ("sous-titre — le U", [('reference-1080x2102.png',580,615,130,950,90,0),
                        ('capture-1080x2400.png',615,655,120,960,90,0),
                        ('capture-1080x1920.png',385,420,120,960,90,0)]),
 ("libelle compteur 1 — le R", [('reference-1080x2102.png',775,805,80,320,90,0),
                                ('capture-1080x2400.png',800,830,70,320,90,0),
                                ('capture-1080x1920.png',568,598,70,320,90,0)]),
 ("'Il vous ecoute' — le I", [('reference-1080x2102.png',1425,1465,160,420,90,0),
                              ('capture-1080x2400.png',1455,1495,160,420,90,0),
                              ('capture-1080x1920.png',1222,1262,160,420,90,0)]),
 ("tuile 1 'col ouvert' — le c", [('reference-1080x2102.png',1020,1060,610,1000,90,0),
                                  ('capture-1080x2400.png',1020,1060,530,1000,90,0),
                                  ('capture-1080x1920.png',788,828,530,1000,90,0)]),
]
for lab,specs in CAS:
    out=[]
    for s in specs:
        c=capglyphe(*s)
        out.append("%s: h=%d px (x%d..%d, y%d..%d, %d groupes)"%((s[0][:4],)+c) if c else "%s: rien"%s[0][:4])
    print("  %-32s" % lab)
    for o in out: print("      ", o)
