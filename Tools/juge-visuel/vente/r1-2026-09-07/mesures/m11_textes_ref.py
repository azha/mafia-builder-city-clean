# m11 — REFERENCE : hauteurs de capitale et couleurs des textes homologues.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT reference-1080x2102.png', im.size)
def mesure(nom,x0,x1,y0,y1,seuil=70,capw=26):
    xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if lum(p)>seuil: xs.append(x);ys.append(y);cols.append(p)
    if not xs: print(f'  {nom:32s} : AUCUNE ENCRE (seuil {seuil})'); return
    cols.sort(key=lum); hi=cols[int(len(cols)*0.92)]
    x0m=min(xs)
    cap=[y for y in range(y0,y1) if any(lum(px[x,y])>seuil for x in range(x0m,x0m+capw))]
    print(f'  {nom:32s} : bbox x={min(xs)}..{max(xs)} y={min(ys)}..{max(ys)} h={max(ys)-min(ys)+1}px  CAPITALE={max(cap)-min(cap)+1}px ({(max(cap)-min(cap)+1)/3.6:.2f} CSS)  couleur={hi}')
# enseigne
mesure('titre "La vente"',60,1020,495,580,90,26)
mesure('sous-titre enseigne',60,1020,585,618,90,20)
# compteurs (fen 1 : y679..792)
mesure('compteur b "03"',60,380,690,760,90,40)
mesure('compteur span "AU TRAVAIL"',60,380,760,790,60,20)
# rangee Oskar y854..970
mesure('nom "Oskar"',180,560,865,915,90,26)
mesure('ligne "La Lisiere..."',180,700,915,960,60,20)
mesure('statut "AU TRAVAIL"',760,1030,865,900,60,20)
# CTA y1902..1995
mesure('CTA "AFFECTER UN DEALER"',100,1000,1910,1990,90,24)
# note6
mesure('note du pied',100,1000,2000,2070,50,18)
print()
print('couleurs exactes attendues : titre #f2c96b · sous-titre #b9ad92 · compteur #7fd4d9 ·')
print('  span #8a979c · nom #eae0c8 · small #8a979c · statut vert #7db36a · CTA #f2c96b · note #8a979c')
