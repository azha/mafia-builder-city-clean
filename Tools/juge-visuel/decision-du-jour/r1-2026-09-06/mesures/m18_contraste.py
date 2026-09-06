#!/usr/bin/env python3
"""m18 - CONTRASTE texte/fond de chaque texte principal, contre les planchers de doctrine du
dossier (>=3:1 grands textes, >=4,5:1 petits). Encre = mediane des px les plus contrastes de la
ligne ; fond = mediane d'une fenetre voisine SANS encre (a >=3 px de tout glyphe).
Controle positif : le meme calcul sur la REFERENCE doit passer les planchers (l'image ratifiee).
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def rl(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def K(a,b):
    l1,l2=rl(a),rl(b)
    if l1<l2: l1,l2=l2,l1
    return (l1+0.05)/(l2+0.05)

ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def mesure(im,label,quoi,tx0,tx1,ty0,ty1,fx0,fx1,fy0,fy1,clair_sur_sombre,hcap_px,pct=6):
    px=im.load()
    vals=[px[x,y] for y in range(ty0,ty1) for x in range(tx0,tx1)]
    vals.sort(key=L, reverse=clair_sur_sombre)
    k=max(1,len(vals)*pct//100)
    coeur=vals[:k]
    encre=(round(statistics.median(p[0] for p in coeur)),round(statistics.median(p[1] for p in coeur)),round(statistics.median(p[2] for p in coeur)))
    f=[px[x,y] for y in range(fy0,fy1) for x in range(fx0,fx1)]
    fond=(round(statistics.median(p[0] for p in f)),round(statistics.median(p[1] for p in f)),round(statistics.median(p[2] for p in f)))
    k_=K(encre,fond)
    grand = hcap_px >= 3.6*14   # >=14 CSS ~ grand texte
    plancher = 3.0 if grand else 4.5
    verdict = 'OK' if k_>=plancher else 'SOUS LE PLANCHER'
    print(f"[{label}] {quoi:34s} encre={str(encre):16s} fond={str(fond):16s} "
          f"contraste={k_:6.2f}:1  (hcap={hcap_px}px -> plancher {plancher}:1)  {verdict}")
    return k_

print("\n--- REFERENCE (controle positif : l'image ratifiee doit passer) ---")
mesure(ref,'REF',"titre carte (Des rapports...)",  248,840,  975,1170,  300,700, 1240,1270, False, 60)
mesure(ref,'REF',"sourcil CE QUI PESE",            145,900,  905,935,   300,700, 1240,1270, False, 20)
mesure(ref,'REF',"TACTIQUE",                       112,240,  860,890,   300,700, 1240,1270, False, 16)
mesure(ref,'REF',"legende italique Tactique -",    110,970, 1560,1600,   50,100, 1520,1550, True,  22)
mesure(ref,'REF',"CTA2 titre LAISSER SUR LE ZINC", 320,760, 1660,1700,  150,250, 1640,1660, True,  27)
mesure(ref,'REF',"CTA1 titre LES LIRE MAINTENANT", 205,870, 1860,1900,  120,190, 1840,1860, False, 33)
mesure(ref,'REF',"CTA1 sous-titre (petit)",         96,985, 1930,2010,  120,190, 1840,1860, False, 22)
mesure(ref,'REF',"LIBRE",                          780,975, 1380,1420,  770,800, 1440,1460, True,  22)

print("\n--- CAPTURE ---")
mesure(cap,'CAP',"titre carte (AUTONOMY REPORTS)",  70,660, 1435,1545,  330,600, 1290,1320, True,  60)
mesure(cap,'CAP',"sourcil CE QUI PESE",             62,570, 1385,1415,  330,600, 1290,1320, True,  20)
mesure(cap,'CAP',"tactique",                       105,270, 1315,1360,  330,600, 1290,1320, True,  16)
mesure(cap,'CAP',"legende Tactique -",              60,1000,1715,1750,   60,120, 1690,1710, True,  22)
mesure(cap,'CAP',"CTA2 titre Laisser sur le zinc", 370,710, 1795,1840,  150,250, 1795,1840, True,  27)
mesure(cap,'CAP',"CTA1 titre LES LIRE MAINTENANT", 190,900, 1970,2010,  120,180, 1950,1970, True,  33)
mesure(cap,'CAP',"CTA1 sous-titre (petit)",        110,970, 2020,2090,  120,180, 1950,1970, True,  22)
mesure(cap,'CAP',"libre",                          720,800, 1600,1640,  700,760, 1660,1680, True,  22)
