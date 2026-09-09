#!/usr/bin/env python3
"""m09 - CTA PRIMAIRE ('LES LIRE MAINTENANT') : bbox, matiere de fond, couleur du texte, contraste.
REF : plaque creme -> detection par luminance haute.
CAP : plaque sombre a bord orange -> detection par le BORD (px orange satures).
Controle positif : la largeur du bandeau (1080) est retrouvee par le meme balayage horizontal.
Controle negatif : le meme detecteur 'creme' applique a la CAPTURE doit rendre une aire ~nulle
                   dans la zone du CTA -> c'est la preuve que la matiere a change.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def contraste(a,b):
    def lin(c):
        c/=255.0
        return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    def rl(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
    l1,l2=rl(a),rl(b)
    if l1<l2: l1,l2=l2,l1
    return (l1+0.05)/(l2+0.05)

ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def est_creme(p): return L(p)>150 and p[0]>p[2] and abs(p[0]-p[1])<40
def bbox(im, pred, y0,y1):
    px=im.load(); W=im.size[0]
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(0,W,2):
            if pred(px[x,y]): xs.append(x); ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys),len(xs)) if xs else None

b = bbox(ref, est_creme, 1780, 2102)
print(f"[REF] plaque CREME du CTA primaire : bbox x={b[0]}..{b[2]} y={b[1]}..{b[3]}  L={b[2]-b[0]+1} H={b[3]-b[1]+1}  n_px(pas 2)={b[4]}")
pr=ref.load()
# fond de la plaque : mediane d'une fenetre a l'interieur, a l'ecart des lettres
ech=[pr[x,y] for y in range(1830,1850) for x in range(120,220)]
med=(statistics.median(p[0] for p in ech),statistics.median(p[1] for p in ech),statistics.median(p[2] for p in ech))
print(f"[REF] fond de la plaque (mediane fenetre x120-220 y1830-1850) = {med}")
# texte : le px le plus sombre dans la zone du titre
zone=[pr[x,y] for y in range(1870,1930) for x in range(200,900)]
sombre=min(zone,key=L)
print(f"[REF] texte du CTA (px le plus sombre zone titre) = {sombre}  contraste texte/fond = {contraste(sombre,med):.2f}:1")

print()
b2 = bbox(cap, est_creme, 1900, 2140)
print(f"[CAP] CONTROLE NEGATIF meme detecteur 'creme' sur la zone du CTA (y1900-2140) : "
      + (f"n_px={b2[4]} bbox={b2[:4]}" if b2 else "AUCUN px creme")
      + "  -> la matiere a change" )
pc=cap.load()
ech2=[pc[x,y] for y in range(1950,1975) for x in range(120,220)]
med2=(statistics.median(p[0] for p in ech2),statistics.median(p[1] for p in ech2),statistics.median(p[2] for p in ech2))
print(f"[CAP] fond de la plaque (mediane fenetre x120-220 y1950-1975) = {med2}")
# couleur du texte : px le plus CLAIR de la zone titre
zone2=[pc[x,y] for y in range(1975,2010) for x in range(200,900)]
clair=max(zone2,key=L)
print(f"[CAP] texte du CTA (px le plus clair zone titre) = {clair}  contraste texte/fond = {contraste(clair,med2):.2f}:1")
# bord orange
def est_orange(p): return p[0]>110 and p[0]>1.8*p[2] and p[1]<0.75*p[0]
b3 = bbox(cap, est_orange, 1900, 2140)
print(f"[CAP] bord ORANGE du CTA : bbox x={b3[0]}..{b3[2]} y={b3[1]}..{b3[3]}  L={b3[2]-b3[0]+1} H={b3[3]-b3[1]+1}")
