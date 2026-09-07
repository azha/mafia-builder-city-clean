# -*- coding: utf-8 -*-
"""23 - Separateur de milliers : mesure des ESPACES entre colonnes de glyphes.
Methode : sur la bande d'un nombre, projeter l'encre en colonnes ; les 'blancs' entre chiffres
d'un meme groupe valent ~la chasse d'inter-lettre ; un separateur de milliers cree un blanc
NETTEMENT plus large.
CONTROLE POSITIF : '9 627 820,00 EUR' du bandeau de la CAPTURE doit montrer 2 blancs larges.
CONTROLE NEGATIF : '100' (carte 1) ne doit montrer AUCUN blanc large (pas de millier)."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def blancs(im,box,seuil,nom):
    px=im.load(); x0,y0,x1,y1=box
    col=[any(lum(px[x,y])>seuil for y in range(y0,y1)) for x in range(x0,x1)]
    tr=[];deb=None
    for i,v in enumerate(col):
        if not v and deb is None: deb=i
        if v and deb is not None: tr.append((deb+x0,i+x0-1,i-deb)); deb=None
    tr=[t for t in tr if t[2]>=2]
    if not tr: print("   %-40s aucun blanc"%nom); return
    larg=[t[2] for t in tr]
    print("   %-40s blancs (px) = %s   max=%d  median=%d"%(nom,larg,max(larg),sorted(larg)[len(larg)//2]))
C=ouvrir('../capture-1080x2400.png'); S=ouvrir('../etats/boutique-canon.png')
print()
blancs(C,(45,60,330,105),60,"CAP bandeau '9 627 820,00' (CP)")
blancs(C,(330,569,530,605),60,"CAP carte1 titre 'Pack'")
blancs(C,(383,569,530,605),60,"CAP carte1 '100' (CN)")
blancs(C,(383,1385,560,1420),60,"CAP carte3 '1400 Marks'")
blancs(C,(383,1600,560,1640),60,"CAP carte4 '3500 Marks'")
print()
blancs(S,(35,315,180,345),60,"CANON serie 2 '1 400 Marks'")
blancs(S,(35,392,180,422),60,"CANON serie 2 '3 500 Marks'")
blancs(S,(35,165,140,195),60,"CANON serie 2 '100 Marks' (CN)")

print()
print("=== reprises : fenetres recalees sur la bbox d'encre du titre ===")
def bbox(im,box,seuil):
    p=im.load();x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>seuil]
    if not pts: return None
    xs=[q[0] for q in pts];ys=[q[1] for q in pts]
    return (min(xs),min(ys),max(xs),max(ys))
for etiq,y0,y1 in [("carte1 'Pack - 100 Marks'",565,610),("carte2 'Pack - 600 Marks'",948,993),
                   ("carte3 'Pack - 1400 Marks'",1381,1426),("carte4 'Pack - 3500 Marks'",1814,1859)]:
    b=bbox(C,(120,y0,900,y1),60)
    print("   %-28s bbox=%s"%(etiq,b))
    if b: blancs(C,(b[0],b[1],b[2]+1,b[3]+1),60,"     blancs "+etiq)
print()
for etiq,y0,y1 in [("serie2 '100 Marks'",160,200),("serie2 '600 Marks'",232,272),
                   ("serie2 '1 400 Marks'",308,348),("serie2 '3 500 Marks'",384,424)]:
    b=bbox(S,(30,y0,300,y1),60)
    print("   %-24s bbox=%s"%(etiq,b))
    if b: blancs(S,(b[0],b[1],b[2]+1,b[3]+1),60,"     blancs "+etiq)
