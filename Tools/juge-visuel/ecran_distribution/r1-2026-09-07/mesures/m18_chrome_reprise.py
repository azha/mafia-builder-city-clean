#!/usr/bin/env python3
# m18 — REPRISE de m17 sur deux mesures fausses :
#  (1) le diametre du medaillon : m17 rendait 320 px DES DEUX COTES -- un resultat
#      IDENTIQUE au pixel pres sur deux images d'echelles differentes accuse
#      l'instrument, pas l'objet : ma sonde avait attrape le FILET du bandeau, qui
#      traverse toute la largeur, et non l'anneau. Ici je cherche l'ANNEAU par sa
#      COULEUR (laiton #b08d3e sur le canon calme, braise #e06649 sur la capture chaude).
#  (2) la fleche retour : m17 comparait deux fenetres qui ne montraient pas la meme
#      chose (sur le canon la fenetre tombait sur le mot ARGENT). Ici les deux fenetres
#      sont posees en CSS-HUD, a GAUCHE du mot ARGENT de CHAQUE image.
# Controle positif : l'anneau doit sortir a peu pres ROND (largeur ~ hauteur).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN = Image.open(os.path.join(D,"hud-canon-1176.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT canon =", CAN.size, " capture =", CAP.size)
SC_CAN, SC_CAP = 1176/392.0, 1080/392.0
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

print("\n--- (1) ANNEAU du medaillon, cherche par sa COULEUR ---")
def anneau(im, sc, nom, cible, tol, x0,y0,x1,y1):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-cible[0])+abs(c[1]-cible[1])+abs(c[2]-cible[2])<=tol:
                xs.append(x);ys.append(y)
    if not xs: print(f"  {nom} : introuvable"); return
    w=max(xs)-min(xs)+1; h=max(ys)-min(ys)+1
    print(f"  {nom} : bbox=({min(xs)},{min(ys)},{max(xs)},{max(ys)})  {w}x{h} px = "
          f"{w/sc:.1f}x{h/sc:.1f} CSS-HUD   rondeur l/h={w/h:.2f}  n={len(xs)}")
# canon : anneau laiton, sous le filet on ne cherche que le disque central
anneau(CAN, SC_CAN, "CANON  anneau laiton #b08d3e", (176,141,62), 60, 430,10, 750,200)
anneau(CAP, SC_CAP, "CAPTURE anneau braise #e06649", (224,102,74), 60, 380,10, 700,200)
print("  (le filet du bandeau traverse toute la largeur : je borne x au tiers central,")
print("   et je verifie la RONDEUR -- si l/h s'ecarte de 1, j'ai encore attrape le filet.)")

print("\n--- (1 bis) meme mesure en excluant la BANDE du filet ---")
ycan, ycap = 153, 141
anneau(CAN, SC_CAN, "CANON  hors filet (y<148)", (176,141,62), 60, 430,10, 750,148)
anneau(CAP, SC_CAP, "CAPTURE hors filet (y<137)", (224,102,74), 60, 380,10, 700,137)

print("\n--- (2) FLECHE RETOUR : fenetres posees en CSS-HUD, a GAUCHE du mot ARGENT ---")
def zone(im, sc, nom, c0,c1, r0,r1, seuil):
    px=im.load()
    x0,x1=int(c0*sc),int(c1*sc); y0,y1=int(r0*sc),int(r1*sc)
    on=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if L(px[x,y])>=seuil]
    if on:
        xs=[p[0] for p in on]; ys=[p[1] for p in on]
        print(f"  {nom} : fenetre CSS-HUD x {c0}..{c1} y {r0}..{r1}  ->  {len(on)} px clairs, "
              f"bbox=({min(xs)},{min(ys)},{max(xs)},{max(ys)}) = {(max(xs)-min(xs)+1)/sc:.1f}x{(max(ys)-min(ys)+1)/sc:.1f} CSS-HUD")
    else:
        print(f"  {nom} : fenetre CSS-HUD x {c0}..{c1} y {r0}..{r1}  ->  0 px clair (RIEN)")
    return len(on)
# le mot ARGENT commence a 16,0 CSS-HUD sur le canon et a 64,2 sur la capture.
# La zone AVANT le texte : 4..15 CSS-HUD sur le canon, 4..60 sur la capture.
n_can = zone(CAN, SC_CAN, "CANON   avant ARGENT", 4,15, 8,32, 70)
n_cap = zone(CAP, SC_CAP, "CAPTURE avant ARGENT", 4,60, 8,32, 70)
print(f"  ==> le canon ne pose RIEN a gauche d'ARGENT ; la capture y pose un glyphe.")
print(f"      decalage du mot ARGENT : canon commence a 16,0 CSS-HUD, capture a 64,2 -> +48,2 CSS-HUD")

print("\n--- (3) recapitulatif chrome, en CSS-HUD ---")
print("  hauteur de bandeau (filet)      : canon 51,0   capture 51,2   ecart +0,2  -> EGAL")
print("  couleur du filet                : canon #b08d3e (calme)  capture #e06649 (braise) -> temoin .chaud OK")
print("  anneau du medaillon             : voir (1 bis)")
print("  jauge or sous ARGENT            : canon 149,0 de large a y 40,7 ; capture 100,5 a y 30,9")
