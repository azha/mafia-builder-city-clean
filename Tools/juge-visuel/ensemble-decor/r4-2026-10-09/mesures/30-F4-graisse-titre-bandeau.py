#!/usr/bin/env python3
"""F4 (mesure demandée par f2 avant classement) : la graisse du TITRE du bandeau de titre, référence vs capture.
Grandeur : épaisseur médiane des hampes verticales (longueur des plages d'encre horizontales dans le tiers médian de la
bande de texte) rapportée à la hauteur de bande (ascendantes→descendantes) = invariante d'échelle.
Contrôle positif : la MÊME mesure sur ㉝ (indemne d'après le juge) doit être égale ; négatif : le sous-titre (DejaVu Sans) doit donner un autre rapport.
Chaque image ouverte imprime sa taille."""
import statistics, sys
from PIL import Image
PAIRS = [('㉚','reference/E03-cadre-48.png','captures/E03_Chanedappro_1080x2400.png'),
         ('㉘','reference/E04-cadre-54.png','captures/E04_Distribution_1080x2400.png'),
         ('㉛','reference/E05-cadre-67.png','captures/E05_Loi_1080x2400.png'),
         ('㉞','reference/E02-cadre-85.png','captures/E02_Carnet_1080x2400.png'),
         ('㉝','reference/E06-cadre-79.png','captures/E06_Dmolition_1080x2400.png')]
def creme(p): r,g,b=p; return r>200 and g>185 and b>150 and (r-b)<75
def bande_titre(im, y0=250, y1=1100):
    W,H=im.size; px=im.load(); rows=[]
    for y in range(y0,min(y1,H)):
        n=sum(1 for x in range(0,W,2) if creme(px[x,y]))
        rows.append((y,n))
    # première bande de ≥ 14 lignes consécutives avec ≥ 12 pixels crème (sous-échantillonnés)
    run=[]; 
    for y,n in rows:
        if n>=12: run.append(y)
        else:
            if len(run)>=14: break
            run=[]
    return (run[0],run[-1]) if len(run)>=14 else None
def stems(im, band):
    W,H=im.size; px=im.load(); y0,y1=band; h=y1-y0+1
    ym=range(y0+h//3, y0+2*h//3); runs=[]
    for y in ym:
        l=0
        for x in range(W):
            if creme(px[x,y]): l+=1
            else:
                if 1<=l<=40: runs.append(l)
                l=0
    return statistics.median(runs), h
for nom,ref,cap in PAIRS:
    out=[]
    for tag,f in (('réf',ref),('jeu',cap)):
        im=Image.open(f).convert('RGB'); print(f'  [{nom} {tag}] {f} {im.size}')
        b=bande_titre(im); 
        if not b: out.append(None); print('    bande de titre non trouvée'); continue
        s,h=stems(im,b); out.append(s/h); print(f'    bande y={b[0]}..{b[1]} (h={h}px) · hampe médiane {s:.1f}px · hampe/hauteur = {s/h:.4f}')
    if all(out): print(f'  => {nom}: jeu/réf = {out[1]/out[0]:.3f}')
