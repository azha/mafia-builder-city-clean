#!/usr/bin/env python3
# m17 — le CHROME, juge contre le canon du HUD (hud-canon-1176.png), pas contre le
#   cadre de serie 6. Echelles differentes : canon 1176 px = 392 CSS-HUD (x3,000) ;
#   capture 1080 px = 392 CSS-HUD (x2,755). Toute grandeur est ramenee en CSS-HUD.
# ⚠️ Le canon est l'etat CALME (« 37 % ») ; la capture est BRULANT. Pour le filet du
#   bandeau, la valeur de l'aile droite, .heatpct et le boitier du medaillon, le temoin
#   est la CSS `.tel.chaud` (--braise 224,102,74), PAS ce PNG (regle du dossier).
# Controle positif : la largeur des deux images doit valoir 392 CSS-HUD une fois divisee
#   par son facteur (1176/3 = 392 ; 1080/2,755 = 392,0).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN = Image.open(os.path.join(D,"hud-canon-1176.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT canon =", CAN.size, " capture =", CAP.size)
SC_CAN, SC_CAP = 1176/392.0, 1080/392.0
print(f"CONTROLE POSITIF : canon {CAN.size[0]}/{SC_CAN:.3f} = {CAN.size[0]/SC_CAN:.1f} CSS-HUD ; "
      f"capture {CAP.size[0]}/{SC_CAP:.3f} = {CAP.size[0]/SC_CAP:.1f} CSS-HUD")
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

print("\n--- FILET du bandeau : ou est-il, de quelle couleur ? ---")
def filet(im, sc, nom, y0,y1):
    px=im.load(); W,_=im.size
    for y in range(y0,y1):
        vals=[px[x,y] for x in range(int(0.25*W),int(0.75*W),5)]
        f=lambda i: sorted(v[i] for v in vals)[len(vals)//2]
        c=(f(0),f(1),f(2))
        if L(c)>55 and c[0]>c[2]+18:
            print(f"  {nom} : y={y} = {y/sc:5.1f} CSS-HUD  couleur={c} #%02x%02x%02x"%c); return y
    print(f"  {nom} : pas de filet trouve dans y {y0}..{y1}"); return None
ycan=filet(CAN, SC_CAN, "CANON  (laiton attendu)", 120, 200)
ycap=filet(CAP, SC_CAP, "CAPTURE (braise attendue)", 100, 200)
if ycan and ycap:
    print(f"  ==> hauteur de bandeau : canon {ycan/SC_CAN:.1f} CSS-HUD  vs  capture {ycap/SC_CAP:.1f} CSS-HUD  "
          f"ecart {ycap/SC_CAP-ycan/SC_CAN:+.1f} CSS-HUD")

print("\n--- MEDAILLON : diametre du boitier ---")
def medaillon(im, sc, nom, y0,y1):
    px=im.load(); W,_=im.size
    best=None
    for y in range(y0,y1,3):
        on=[x for x in range(W//2-160,W//2+160) if L(px[x,y])>34]
        if on and (best is None or on[-1]-on[0]>best[1]-best[0]): best=(on[0],on[-1],y)
    print(f"  {nom} : largeur max = {best[1]-best[0]+1} px = {(best[1]-best[0]+1)/sc:5.1f} CSS-HUD (a y={best[2]})")
medaillon(CAN, SC_CAN, "CANON  ", 20, 170)
medaillon(CAP, SC_CAP, "CAPTURE", 10, 175)

print("\n--- AILE GAUCHE : libelle ARGENT et sa jauge or ---")
def aile(im, sc, nom, y0,y1,x0,x1):
    px=im.load()
    on=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if L(px[x,y])>=80]
    if not on: print(f"  {nom} : rien"); return
    xs=[p[0] for p in on]; ys=[p[1] for p in on]
    print(f"  {nom} : encre x {min(xs)}..{max(xs)} ({min(xs)/sc:.1f}..{max(xs)/sc:.1f} CSS-HUD) "
          f"y {min(ys)}..{max(ys)} ({min(ys)/sc:.1f}..{max(ys)/sc:.1f} CSS-HUD)")
aile(CAN, SC_CAN, "CANON  'ARGENT'", 25, 55, 30, 300)
aile(CAP, SC_CAP, "CAPTURE 'ARGENT'", 18, 48, 30, 300)
def jauge(im, sc, nom, y0,y1):
    px=im.load()
    for y in range(y0,y1):
        on=[x for x in range(20,500) if px[x,y][0]>150 and px[x,y][0]-px[x,y][2]>60]
        if len(on)>40:
            print(f"  {nom} : jauge or a y={y} ({y/sc:.1f} CSS-HUD), x {on[0]}..{on[-1]} "
                  f"= {(on[-1]-on[0]+1)/sc:.1f} CSS-HUD de large"); return
    print(f"  {nom} : pas de jauge trouvee")
jauge(CAN, SC_CAN, "CANON  ", 100, 140)
jauge(CAP, SC_CAP, "CAPTURE", 85, 125)

print("\n--- ELEMENTS DE CHROME PRESENTS DANS LA CAPTURE ET PAS DANS LE CANON ---")
px=CAP.load()
on=[(x,y) for y in range(45,95) for x in range(40,120) if L(px[x,y])>=70]
print(f"  fleche retour (coin haut-gauche, x 40..120 y 45..95) : {len(on)} px clairs "
      f"-> {'PRESENTE' if len(on)>150 else 'absente'}")
pc=CAN.load()
onc=[(x,y) for y in range(45,95) for x in range(40,130) if L(pc[x,y])>=70]
print(f"  meme zone sur le CANON (x 40..130 y 45..95)          : {len(onc)} px clairs "
      f"-> {'PRESENTE' if len(onc)>150 else 'ABSENTE'}")
on=[(x,y) for y in range(210,240) for x in range(500,580) if L(px[x,y])>=60]
print(f"  losange or sous le medaillon (capture, y 210..240)   : {len(on)} px clairs "
      f"-> {'PRESENT' if len(on)>60 else 'absent'}")

print("\n--- COULEUR du medaillon et de son texte (capture, etat BRULANT) ---")
def pic_zone(im,x0,y0,x1,y1,nom):
    p=im.load(); best=None
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=p[x,y]
            if best is None or (c[0]-min(c[1],c[2]))>(best[0]-min(best[1],best[2])): best=c
    print(f"  {nom} : plus rouge = {best} #%02x%02x%02x"%best)
pic_zone(CAP, 450,20, 640,180, "anneau du medaillon")
print("  temoin CSS .tel.chaud : --braise = (224, 102, 74)")
