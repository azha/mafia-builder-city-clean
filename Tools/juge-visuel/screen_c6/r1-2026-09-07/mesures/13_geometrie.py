# -*- coding: utf-8 -*-
"""Geometrie complete : pour chaque boite, bords gauche/droit detectes par colonne, remplissage median,
couleur de bord. Exprime tout en px ET en CSS (÷3,6) ET en % de la largeur d'ecran (1080).
CONTROLE POSITIF : la largeur d'ecran vaut 1080 px des deux cotes (echelle 1,00 posee par dossier.md).
CONTROLE NEGATIF : le fond du .pann (#111823=(17,24,35)) doit DIFFERER du fond du .fen (#0a0e16=(10,14,22))
                   sur la REFERENCE — si l'instrument rend les deux egaux, il ne discrimine pas."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6

def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)

def bords_v(im,y0,y1,fond,seuil=18):
    """colonnes dont la mediane sur [y0,y1) s'ecarte du fond de plus de seuil"""
    px=im.load(); w,h=im.size; res=[]
    for x in range(w):
        vals=[px[x,y] for y in range(y0,y1,3)]
        m=tuple(sorted(v[i] for v in vals)[len(vals)//2] for i in range(3))
        d=max(abs(m[i]-fond[i]) for i in range(3))
        res.append((d,m))
    bandes=[];cur=None
    for x,(d,m) in enumerate(res):
        if d>=seuil:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: bandes.append(tuple(cur)); cur=None
    if cur: bandes.append(tuple(cur))
    return bandes

def fiche(im,nom,y0,y1,fond_ecran):
    b=bords_v(im,y0+4,y1-4,fond_ecran)
    b=[x for x in b if x[1]-x[0]<=14]   # les bords fins seulement
    g = b[0] if b else None; d = b[-1] if b else None
    print("  %-16s y=%4d..%4d (h=%4d / %6.1f CSS)  x=%s..%s (l=%s / %s CSS)" % (
        nom, y0,y1, y1-y0+1, (y1-y0+1)/S,
        g[0] if g else "?", d[1] if d else "?",
        (d[1]-g[0]+1) if (g and d) else "?",
        "%.1f"%((d[1]-g[0]+1)/S) if (g and d) else "?"))
    if g and d:
        xin0, xin1 = g[1]+8, d[0]-8
        print("                   bord G rgb%s  bord D rgb%s  fond rgb%s" % (
            med(im,g[0],y0+6,g[1]+1,y1-6), med(im,d[0],y0+6,d[1]+1,y1-6),
            med(im,xin0,y0+8,min(xin0+120,xin1),y0+8+min(30,(y1-y0)//3))))
    return g,d

print("=== REFERENCE (cadre #113 NOMINAL) — 1080x2102 ===")
ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
fond_ref = med(ref,500,470,560,478)
print("  fond .hrz6 (haut, y=470..478) rgb%s   (CSS attendu #111823 = (17,24,35))" % (fond_ref,))
print("  fond .hrz6 (bas,  y=2050..2065) rgb%s (CSS attendu #0d0f10 = (13,15,16))" % (med(ref,500,2050,560,2065),))
for nom,y0,y1 in [("cerne",452,2078),("enseigne",481,646),("compteurs",668,760),
                  ("elast",818,1866),("cta6",1902,1995)]:
    fiche(ref,nom,y0,y1,fond_ref)

print()
print("=== CAPTURE etat-vide, ecran SEUL — 1080x2400 ===")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
fond_cap = med(cap,500,200,560,240)
print("  fond ecran (y=200..240) rgb%s" % (fond_cap,))
print("  fond ecran (y=2200..2260) rgb%s" % (med(cap,500,2200,560,2260),))
for nom,y0,y1 in [("enseigne",279,461),("compteurs",495,645),("elast",678,1819),("pann",1853,2104)]:
    fiche(cap,nom,y0,y1,fond_cap)

print()
print("CONTROLE POSITIF largeur ecran ref=%d cap=%d (attendu 1080/1080)" % (ref.size[0],cap.size[0]))
print("CONTROLE NEGATIF ref : fond .pann/.ct rgb%s  vs fond .fen rgb%s  (doivent differer)" % (
      med(ref,300,1120,600,1160), med(ref,120,700,260,730)))
