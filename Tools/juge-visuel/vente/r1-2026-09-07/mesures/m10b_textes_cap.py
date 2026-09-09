# m10b — CAPTURE : fenetres corrigees ("Moderate", "Standard", "RAMASSER") + hauteur de CAPITALE
#        mesuree sur la PREMIERE lettre (majuscule) de chaque libelle.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def relL(p):
    def f(c):
        c/=255.0
        return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def contraste(a,b):
    la,lb=relL(a),relL(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load()
print('OUVERT capture-1080x2400.png', im.size)
FOND=(13,13,13)
def mesure(nom,x0,x1,y0,y1,seuil=26,capw=26):
    xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if lum(p)>seuil: xs.append(x);ys.append(y);cols.append(p)
    if not xs: print(f'  {nom:30s} : AUCUNE ENCRE'); return
    cols.sort(key=lum); hi=cols[int(len(cols)*0.92)]
    h=max(ys)-min(ys)+1
    x0m=min(xs)
    cap=[y for y in range(y0,y1) if any(lum(px[x,y])>seuil for x in range(x0m,x0m+capw))]
    print(f'  {nom:30s} : bbox x={min(xs)}..{max(xs)} y={min(ys)}..{max(ys)} h_total={h}px  CAPITALE={max(cap)-min(cap)+1}px ({(max(cap)-min(cap)+1)/3.6:.2f} CSS)  couleur={hi} contraste={contraste(hi,FOND):.2f}:1')
mesure('titre LES POINTS DE VENTE',100,980,260,310,26,26)
mesure('nom Brindle (serif)',175,300,368,420,26,26)
mesure('statut AU POSTE',860,1030,375,412,26,20)
mesure('libelle Caisse',65,185,430,470,26,20)
mesure('valeur Moderate',375,515,430,470,26,20)
mesure('libelle Marge',65,185,478,516,26,22)
mesure('valeur Standard',335,470,478,516,26,20)
mesure('CTA RAMASSER',425,660,548,586,26,22)
mesure('sous-libelle CTA',250,830,588,618,26,16)
print()
print('== jeton du titre : mediane des 200 px les plus clairs ==')
c=[px[x,y] for y in range(268,304) for x in range(176,903) if lum(px[x,y])>120]
c.sort(key=lum); print('  n=%d  p50=%s  p90=%s  max=%s'%(len(c),c[len(c)//2],c[int(len(c)*0.9)],c[-1]))
print('  jeton maquette du titre #f2c96b=(242,201,107) ; jeton secondaire #d9ab4e=(217,171,78)')
