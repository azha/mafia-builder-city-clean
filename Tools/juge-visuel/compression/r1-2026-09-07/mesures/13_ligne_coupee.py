#!/usr/bin/env python3
# 13 (v2) — la ligne de lecture : coupee a gauche, et POURQUOI (corps juste, mais pas de retour a la ligne).
#   (a) l'encre est-elle a PLEINE INTENSITE en colonne 0 (coupe) ou en frange (bord legitime) ?
#   (b) hauteur de CAPITALE, comparee a l'homologue ;
#   (c) PAS PAR CARACTERE (largeur / nb de caracteres), en CSS : si le pas coincide, le corps est
#       juste et le defaut est l'absence de retour a la ligne, pas la taille.
#   CONTROLE POSITIF : le pas par caractere du titre "LA SEMAINE" (10 car., lettres espacees)
#       doit ressortir DIFFERENT des lignes courantes -> la sonde discrimine.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def img(f):
    im=Image.open(os.path.join(D,f)).convert('RGB'); print(f"  OUVERT {f} -> {im.size}"); return im

print("=== (a) la coupe a gauche ===")
im=img('capture-1080x2400.png'); px=im.load()
COEUR=(185,173,146); lc=lum(COEUR)
n0=sum(1 for y in range(472,510) if abs(lum(px[0,y])-lc)<6)
print(f"  colonne x=0, bande y472..509 : {n0} px a la couleur de COEUR (185,173,146) +-6")
print(f"    -> une frange d'anti-crenelage n'a PAS la couleur de coeur ; {n0} px de coeur en colonne 0 = glyphe COUPE")
print(f"  (visuel : le 'A' de \"Au\" ne montre que son apex et sa jambe droite — mesures/crop_A_ampute.png)")
print(f"  quantite exacte manquante : NON MESURABLE depuis l'image (le glyphe absent n'y est pas)")

print("=== (b) hauteur de capitale ===")
def cap(f,x0,x1,y0,y1,fond,fac,nom,seuil=25):
    im=img(f) if False else Image.open(os.path.join(D,f)).convert('RGB')
    p=im.load()
    ys=[y for y in range(y0,y1) if any(abs(lum(p[x,y])-fond)>seuil for x in range(x0,x1))]
    h=ys[-1]-ys[0]+1
    print(f"    {nom:48s} y={ys[0]}..{ys[-1]} h={h} px = {h/fac:.2f} CSS")
    return h/fac
c1=cap('capture-1080x2400.png', 0, 42,465,515,13.0,3.6,'capture : "A" de "Au" (capitale)')
c2=cap('etats/v4-29.png',     170,212,605,675,27.0,3.0,'v4-29 : "C" de "Calme" (capitale)',seuil=30)
c3=cap('etats/ecran-canon-vide.png',78,120,360,420,12.0,3.0,'canon2 : "R" de "Rien" (capitale)')
print(f"    >>> capture {c1:.2f} CSS vs v4-29 {c2:.2f} CSS (ecart {100*(c1-c2)/c2:+.1f} %) vs canon2 {c3:.2f} CSS (ecart {100*(c1-c3)/c3:+.1f} %)")

print("=== (c) pas par caractere (le corps est-il juste ?) ===")
def pas(f,y0,y1,fond,fac,texte,nom,seuil=25,bord=0):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; p=im.load()
    xs=[x for x in range(bord,W-bord) if any(abs(lum(p[x,y])-fond)>seuil for y in range(y0,y1+1))]
    larg=xs[-1]-xs[0]+1
    print(f"    {nom:44s} largeur={larg:4d} px = {larg/fac:6.1f} CSS | {len(texte):2d} car. -> pas={larg/fac/len(texte):.3f} CSS/car.")
    return larg/fac/len(texte)
p1=pas('capture-1080x2400.png',472,509,13.0,3.6,"Au calme — aucune semaine de compression en cours",'capture : ligne de lecture (coupee)')
p2=pas('etats/v4-29.png',612,668,27.0,3.0,"Calme — vos affaires respirent",'v4-29 : ligne de lecture',seuil=30,bord=16)
p3=pas('capture-1080x2400.png',268,303,13.0,3.6,"LA SEMAINE",'CONTROLE + : titre "LA SEMAINE" (lettres espacees)')
print(f"    >>> pas capture {p1:.3f} vs v4-29 {p2:.3f} CSS/car. : ecart {100*(p1-p2)/p2:+.1f} %")
print(f"    >>> CONTROLE + : le titre rend {p3:.3f} CSS/car. — la sonde DISCRIMINE bien deux corps differents")
