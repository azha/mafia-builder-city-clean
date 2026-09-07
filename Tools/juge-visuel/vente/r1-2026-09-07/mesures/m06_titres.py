# m06 — TITRES : bbox de l'encre or du titre, hauteur de CAPITALE, largeur du mot.
# Controle positif : sur la reference, la bande or du titre doit se situer DANS l'enseigne (y481..646).
# Controle negatif : la bande or du bandeau (chrome) ne doit PAS etre confondue avec le titre.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def est_or(p):
    r,g,b=p
    return r>120 and g>90 and b<150 and (r-b)>45 and (r-g)>=8 and (g-b)>20

def bbox_or(nom, y0,y1, x0=0,x1=None, seuil=1):
    im=Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load(); w,h=im.size
    if x1 is None: x1=w
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if est_or(px[x,y]): xs.append(x); ys.append(y)
    print(f'  {nom} {im.size} bande y={y0}..{y1} : {len(xs)} px or')
    if not xs: return None
    return (min(xs),min(ys),max(xs),max(ys))

print('== REFERENCE : titre "La vente" dans l\'enseigne (y481..646) ==')
b=bbox_or('reference-1080x2102.png', 484, 644)
print('  bbox or =',b,' -> hauteur encre =',b[3]-b[1]+1,'px  largeur =',b[2]-b[0]+1,'px')
print('  CONTROLE POSITIF bbox dans l\'enseigne (481..646) :', 481<=b[1] and b[3]<=646)

print('== REFERENCE : ligne laiton sous l\'enseigne (border-bottom 2px CSS = 7.2px) ==')
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
ys=[y for y in range(630,660) if sum(1 for x in range(200,900,4) if est_or(px[x,y]))>150]
print('  lignes laiton continues :', ys, ' epaisseur =', len(ys),'px')

print()
print('== CAPTURE : titre "LES POINTS DE VENTE" ==')
b2=bbox_or('capture-1080x2400.png', 250, 330)
print('  bbox or =',b2,' -> hauteur encre =',b2[3]-b2[1]+1,'px  largeur =',b2[2]-b2[0]+1,'px')
print('  centre x du titre =', (b2[0]+b2[2])/2, ' centre de l\'ecran = 540')
print('  CONTROLE NEGATIF : bande or du bandeau (y60..150) est distincte :', bbox_or('capture-1080x2400.png',60,150))

print()
print('== hauteur de CAPITALE : reference "L" de "La vente" (colonne la plus a gauche du mot) ==')
# la reference est en casse mixte : mesurer la colonne du L (premieres colonnes de l'encre)
xs0=b[0]
col=[y for y in range(484,644) if any(est_or(px[x,y]) for x in range(xs0, xs0+20))]
print('  colonnes x=%d..%d : y=%d..%d -> hauteur capitale = %d px (= %.1f CSS)'%(xs0,xs0+20,min(col),max(col),max(col)-min(col)+1,(max(col)-min(col)+1)/3.6))
im2=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px2=im2.load()
xs2=b2[0]
col2=[y for y in range(250,330) if any(est_or(px2[x,y]) for x in range(xs2, xs2+20))]
print('  capture x=%d..%d : y=%d..%d -> hauteur capitale = %d px (= %.1f CSS)'%(xs2,xs2+20,min(col2),max(col2),max(col2)-min(col2)+1,(max(col2)-min(col2)+1)/3.6))
