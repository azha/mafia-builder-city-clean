#!/usr/bin/env python3
# m07 — gabarit vertical : rect de contenu (entre bandeau et dock), part de chaque
#       zone, gouttiere. Et confirmation qu'AUCUN separateur pointille n'existe
#       dans le bloc lecture de la capture (balayage complet, pas 2 fenetres).
# Controle positif : le bandeau de la capture doit finir sur le filet BRAISE
#       (224,102,74) -- valeur ecrite dans hud-brennar.html pour .tel.chaud.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def hexs(c): return "#%02x%02x%02x"%tuple(c)

print("\n--- CONTROLE POSITIF : filet du bandeau de la capture ---")
px=CAP.load()
for y in range(138,150):
    vals=[px[x,y] for x in range(200,900,7)]
    f=lambda i:sorted(v[i] for v in vals)[len(vals)//2]
    c=(f(0),f(1),f(2)); print(f"    y={y} {c} {hexs(c)}")

print("\n--- DOCK de la capture : premiere ligne non-noire en partant du bas ---")
for y in range(2399, 2100, -1):
    vals=[px[x,y] for x in range(60,1020,5)]
    n=sum(1 for v in vals if abs(v[0]-13)+abs(v[1]-13)+abs(v[2]-13)>14)
    if n>len(vals)*0.10:
        print(f"    bas du contenu non-noir : y={y} ({n}/{len(vals)} px allumes)"); break
# ronds du dock : cercles sombres bleutes
ys=[]
for y in range(2050,2400):
    vals=[px[x,y] for x in range(60,1020,3)]
    n=sum(1 for v in vals if v[2]>v[0]+6 and v[2]>25)
    if n>20: ys.append((y,n))
if ys: print(f"    ronds du dock (px bleutes) : y {ys[0][0]}..{ys[-1][0]}  (hauteur {ys[-1][0]-ys[0][0]+1} px = {(ys[-1][0]-ys[0][0]+1)/3.6:.1f} CSS)")

print("\n--- BALAYAGE COMPLET : un separateur pointille existe-t-il dans la CAPTURE ? ---")
def cherche_pointille(im, y0,y1, x0,x1, fond, nom):
    px=im.load(); trouve=[]
    for y in range(y0,y1):
        vals=[px[x,y] for x in range(x0,x1)]
        n=sum(1 for v in vals if abs(v[0]-fond[0])+abs(v[1]-fond[1])+abs(v[2]-fond[2])>18)
        frac=n/len(vals)
        if 0.30<=frac<=0.75:
            # alternance : compte les changements allume/eteint
            etat=[abs(v[0]-fond[0])+abs(v[1]-fond[1])+abs(v[2]-fond[2])>18 for v in vals]
            chg=sum(1 for i in range(1,len(etat)) if etat[i]!=etat[i-1])
            if chg>=30: trouve.append((y,frac,chg))
    print(f"  {nom} : {len(trouve)} ligne(s) au profil POINTILLE (30-75% allume, >=30 alternances)")
    for t in trouve[:8]: print(f"      y={t[0]} frac={t[1]:.2f} alternances={t[2]}")
cherche_pointille(REF, 1430,1672, 60,1020, (26,17,8), "REFERENCE bloc lecture (1430..1672)")
cherche_pointille(CAP,  960,1240, 60,1020, (13,13,13), "CAPTURE bloc lecture (960..1240)")
cherche_pointille(CAP,  143,2100, 60,1020, (13,13,13), "CAPTURE ecran ENTIER (143..2100)")

print("\n--- GABARIT VERTICAL compare (en % de la zone de CONTENU) ---")
ref_top, ref_bot = 434, 2102          # .lieg6 : de la fin du bandeau au bas du .tel
cap_top, cap_bot = 143, 2126          # bandeau -> haut du dock (mesure ci-dessus)
Hr, Hc = ref_bot-ref_top, cap_bot-cap_top
print(f"  REFERENCE contenu : y {ref_top}..{ref_bot}  H={Hr} px = {Hr/3.6:.1f} CSS")
print(f"  CAPTURE   contenu : y {cap_top}..{cap_bot}  H={Hc} px = {Hc/3.6:.1f} CSS")
zones_ref = [("entete",434,604),("planche",604,1425),("lecture",1425,1673),("bas",1673,2102)]
zones_cap = [("entete(titre+ss-titre)",143,524),("planche",524,956),("lecture",956,1240),
             ("VOS COURRIERS + bouton",1240,1690),("bas(perso+CTA+legende)",1690,2126)]
print("  REFERENCE :")
for n,a,b in zones_ref: print(f"    {n:26s} {b-a:5d} px  {(b-a)/3.6:6.1f} CSS  {100*(b-a)/Hr:5.1f} %")
print("  CAPTURE :")
for n,a,b in zones_cap: print(f"    {n:26s} {b-a:5d} px  {(b-a)/3.6:6.1f} CSS  {100*(b-a)/Hc:5.1f} %")

print("\n--- LARGEURS ET MARGES ---")
print("  REF planche : x 4..1076  -> largeur 1072 px = 297.8 CSS  (marge G/D = 1,1 CSS : PLEIN BORD)")
print("  CAP planche : x 58..1022 -> largeur  964 px = 267.8 CSS  (marge G/D = 16,1 CSS)")
def bords(im,y,seuil=25):
    px=im.load(); W,_=im.size; o=[]
    for x in range(1,W):
        a=px[x-1,y]; b=px[x,y]
        if abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])>=seuil: o.append(x)
    return o
print("  CAP rangee courrier 1 (y=1300) bords :", bords(CAP,1300)[:8])
print("  CAP bouton ACHETER    (y=1620) bords :", bords(CAP,1620)[:8])
print("  CAP CTA               (y=1970) bords :", bords(CAP,1970)[:8])
print("  REF geste             (y=1990) bords :", bords(REF,1990)[:8])
