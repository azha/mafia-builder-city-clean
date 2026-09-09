#!/usr/bin/env python3
# m12 — reprise des trois mesures de m11 dont la FENETRE etait mal posee
#       (medaillon .av de la reference, contrastes, haut du dock) + bord des fiches.
# Controle positif : le medaillon .av de la REFERENCE doit sortir ROND (taux ~0,785)
#       et la rangee de la capture CARREE (taux ~1,00) -- l'instrument doit separer.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def lin(v):
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def Lrel(c): return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2])
def contraste(a,b):
    la,lb=Lrel(a),Lrel(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

print("\n--- (1) MEDAILLON .av : fenetre corrigee ---")
def rondeur(im,x0,y0,x1,y1,fond,nom):
    px=im.load(); n=0; xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>10:
                n+=1; xs.append(x);ys.append(y)
    if not xs: print(f"  {nom}: rien"); return
    bb=(min(xs),min(ys),max(xs),max(ys)); w=bb[2]-bb[0]+1; h=bb[3]-bb[1]+1
    t=n/(w*h)
    print(f"  {nom:42s} bbox={bb} {w}x{h} px = {w/3.6:.1f}x{h/3.6:.1f} CSS  taux={t:.3f}  -> {'ROND' if t<0.86 else 'CARRE'}")
rondeur(REF, 30,1700, 190,1860, (20,26,33), "REF .av (attendu ROND 34 CSS)")
rondeur(CAP, 40,1700, 165,1825, (13,13,13), "CAP medaillon")
rondeur(CAP, 50,1250, 210,1350, (13,13,13), "CTRL- CAP rangee (attendu CARRE)")
# contenu du medaillon : combien de teintes ?
def teintes(im,x0,y0,x1,y1,nom):
    px=im.load(); s=set()
    for y in range(y0,y1):
        for x in range(x0,x1): s.add(px[x,y])
    print(f"  {nom} : {len(s)} teinte(s) distincte(s) dans la boite")
teintes(REF, 70,1750, 145,1830, "REF interieur du medaillon (silhouette attendue)")
teintes(CAP, 70,1730, 140,1800, "CAP interieur du medaillon")

print("\n--- (2) CONTRASTES : encre = 5e percentile / 95e percentile DANS la bbox du texte ---")
def ctr_bbox(im,x0,y0,x1,y1,clair,nom):
    px=im.load(); v=[]
    for y in range(y0,y1):
        for x in range(x0,x1): v.append((L(px[x,y]),px[x,y]))
    v.sort(key=lambda t:t[0])
    fond = v[len(v)//10][1] if clair else v[-len(v)//10][1]
    encre= v[-3][1] if clair else v[2][1]
    print(f"  {nom:46s} encre=#%02x%02x%02x fond=#%02x%02x%02x  contraste={contraste(encre,fond):6.2f}:1"%(encre+fond))
ctr_bbox(REF, 48,478,470,514, True,  "REF titre sur #20180f")
ctr_bbox(CAP, 48,290,470,342, True,  "CAP titre sur #0d0d0d")
ctr_bbox(REF, 48,540,700,570, True,  "REF sous-titre #9a8a6a sur #20180f")
ctr_bbox(CAP, 48,400,700,440, True,  "CAP sous-titre sur #0d0d0d")
ctr_bbox(REF, 48,1472,215,1500,True, "REF .lecture u sur #1a1108")
ctr_bbox(CAP, 48, 982,215,1006,True, "CAP .lecture u sur #0d0d0d")
ctr_bbox(REF,690,1472,1035,1503,True,"REF .lecture b sur #1a1108")
ctr_bbox(CAP,630, 982,1030,1018,True,"CAP .lecture b sur #0d0d0d")
ctr_bbox(REF, 85,1974,185,2004,True, "REF .geste (or sur #241c11)")
ctr_bbox(CAP,110,1952,640,1990,False,"CAP CTA (sombre sur or)")
ctr_bbox(CAP,760,1108,1030,1140,True,"CAP 'tient' sur #0d0d0d")
ctr_bbox(REF,600,1598,1035,1632,True,"REF ligne 3 valeur sur #1a1108")
ctr_bbox(CAP, 48,2062,470,2098,True, "CAP legende sous CTA")
ctr_bbox(REF,615,1975,995,2005,True, "REF .geste small (dans le bouton)")

print("\n--- (3) DOCK : premiere ligne des ronds ---")
px=CAP.load()
haut=None
for y in range(2100,2400):
    on=[x for x in range(40,1040) if px[x,y][2]>px[x,y][0]+5 and px[x,y][2]>26]
    if len(on)>=20:
        haut=y; break
bas=None
for y in range(2399,2100,-1):
    on=[x for x in range(40,1040) if px[x,y][2]>px[x,y][0]+5 and px[x,y][2]>26]
    if len(on)>=20: bas=y; break
print(f"  ronds du dock : y {haut}..{bas}  (diametre {bas-haut+1} px = {(bas-haut+1)/3.6:.1f} CSS)")
# libelles du dock
for y in range(bas+1,2400):
    n=sum(1 for x in range(40,1040) if L(px[x,y])>=70)
    if n>10: print(f"  premiere ligne des LIBELLES du dock : y={y}"); break
# dernier pixel de CONTENU (hors dock)
for y in range(haut-1, 1500, -1):
    n=sum(1 for x in range(40,1040) if abs(px[x,y][0]-13)+abs(px[x,y][1]-13)+abs(px[x,y][2]-13)>14)
    if n>8: print(f"  dernier pixel de CONTENU au-dessus du dock : y={y}  -> gouttiere basse = {haut-y} px = {(haut-y)/3.6:.1f} CSS"); break

print("\n--- (4) BORD des fiches (.fiche border:1px solid #cbbfa4) ---")
def bord_fiche(im,x,y0,y1,nom):
    px=im.load()
    print(f"  {nom} x={x} :", " ".join("%d:#%02x%02x%02x"%((y,)+px[x,y]) for y in range(y0,y1)))
bord_fiche(REF, 400, 803, 815, "REF bas de la fiche gauche")
bord_fiche(CAP, 400, 691, 703, "CAP bas de la fiche haute ")
bord_fiche(REF, 400, 694, 706, "REF haut de la fiche gauche")
bord_fiche(CAP, 400, 569, 581, "CAP haut de la fiche haute ")
