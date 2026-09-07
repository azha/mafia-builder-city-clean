# m06b — TITRES (corrige : le cerne or a x=21/1058 polluait la bbox ; on borne x a l'interieur)
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def est_or(p):
    r,g,b=p
    return r>120 and g>90 and b<150 and (r-b)>45 and (r-g)>=8 and (g-b)>20
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT reference-1080x2102.png', im.size)
# titre : y 490..630 (au-dessus de la ligne laiton 640), x 60..1020 (interieur du cerne)
xs=[];ys=[]
for y in range(490,632):
    for x in range(60,1020):
        if est_or(px[x,y]): xs.append(x); ys.append(y)
print('REF titre : %d px or, bbox=(%d,%d,%d,%d)'%(len(xs),min(xs),min(ys),max(xs),max(ys)))
print('  hauteur encre = %d px (%.1f CSS)  largeur = %d px (%.1f CSS)'%(max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/3.6,max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/3.6))
print('  centre x = %.1f (ecran 540)'%((min(xs)+max(xs))/2))
# hauteur de capitale : le "L" est la 1re lettre, colonnes min(xs)..min(xs)+22
L=[y for y in range(490,632) if any(est_or(px[x,y]) for x in range(min(xs),min(xs)+22))]
print('  CAPITALE "L" : y=%d..%d -> %d px (%.2f CSS)'%(min(L),max(L),max(L)-min(L)+1,(max(L)-min(L)+1)/3.6))
# sous-titre (b9ad92, gris chaud) : bande entre le titre et la ligne laiton
def est_gris_chaud(p):
    r,g,b=p; return abs(r-0xb9)<45 and abs(g-0xad)<45 and abs(b-0x92)<45
ys2=[y for y in range(min(L)+10,640) if sum(1 for x in range(60,1020) if est_gris_chaud(px[x,y]))>10]
print('  SOUS-TITRE (gris chaud #b9ad92) : lignes y=%s..%s (h=%d)'%(min(ys2),max(ys2),max(ys2)-min(ys2)+1) if ys2 else '  SOUS-TITRE : ABSENT')
xs2=[x for x in range(60,1020) if any(est_gris_chaud(px[x,y]) for y in range(min(ys2),max(ys2)+1))]
print('    largeur sous-titre = %d px (x %d..%d)'%(max(xs2)-min(xs2)+1,min(xs2),max(xs2)))

print()
im2=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px2=im2.load()
print('OUVERT capture-1080x2400.png', im2.size)
xs=[];ys=[]
for y in range(240,335):
    for x in range(0,1080):
        if est_or(px2[x,y]): xs.append(x); ys.append(y)
print('CAP titre : %d px or, bbox=(%d,%d,%d,%d)'%(len(xs),min(xs),min(ys),max(xs),max(ys)))
print('  hauteur encre = %d px (%.1f CSS)  largeur = %d px (%.1f CSS)'%(max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/3.6,max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/3.6))
print('  centre x = %.1f (ecran 540)'%((min(xs)+max(xs))/2))
L2=[y for y in range(240,335) if any(est_or(px2[x,y]) for x in range(min(xs),min(xs)+22))]
print('  CAPITALE "L" : y=%d..%d -> %d px (%.2f CSS)'%(min(L2),max(L2),max(L2)-min(L2)+1,(max(L2)-min(L2)+1)/3.6))
# sous-titre sur la capture ?
ys3=[y for y in range(305,345) if sum(1 for x in range(60,1020) if est_gris_chaud(px2[x,y]))>10]
print('  SOUS-TITRE gris chaud sous le titre (y305..345) : %s'%('lignes '+str(min(ys3))+'..'+str(max(ys3)) if ys3 else 'AUCUN'))
# ligne laiton sous le titre ?
lg=[y for y in range(305,360) if sum(1 for x in range(200,900,4) if est_or(px2[x,y]))>150]
print('  LIGNE LAITON sous le titre : %s'%(lg if lg else 'AUCUNE'))
