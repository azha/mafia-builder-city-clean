# m14 — disque-icone isole, filet du bandeau hors medaillon, dock, contraste du filet.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load(); w,h=im.size
print('OUVERT capture-1080x2400.png', im.size)
# disque
xs=[x for x in range(55,140) if any(lum(px[x,y])>60 for y in range(365,425))]
ys=[y for y in range(365,425) if any(lum(px[x,y])>60 for x in range(55,140))]
cx,cy=(min(xs)+max(xs))//2,(min(ys)+max(ys))//2
print('DISQUE : x=%d..%d (%d px = %.2f CSS)  y=%d..%d (%d px = %.2f CSS)  centre=(%d,%d) rgb=%s'%(
  min(xs),max(xs),max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/3.6,min(ys),max(ys),max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/3.6,cx,cy,px[cx,cy]))
print('  profil horizontal au centre :',[(x,px[x,cy]) for x in range(min(xs),max(xs)+1,6)])
print('  (temoin reference : .dl svg = 19x19 CSS = 68x68 px, glyphe de PRODUIT colore, pas un disque)')
print()
# filet du bandeau, hors medaillon
print('FILET du bandeau, y=141 et 142, hors medaillon :')
for y in [140,141,142,143,144]:
    ech=[px[x,y] for x in [100,200,300,800,900,1000]]
    print('  y=%d : %s'%(y,ech))
print('  jeton braise attendu si .chaud = (224,102,74) ; laiton calme = (176,141,62)')
print()
# dock
prem=None
for y in range(2050,h):
    if any(lum(px[x,y])>18 for x in range(0,w,3)): prem=y; break
print('DOCK : haut y=%d  hauteur=%d px (%.1f CSS-ecran, %.1f CSS-HUD a x2,755)'%(prem,h-prem,(h-prem)/3.6,(h-prem)/2.755))
print('  fond du dock (x=540,y=2250)=',px[540,2250],'  fond ecran (x=540,y=2100)=',px[540,2100])
# ronds du dock
ys2=[y for y in range(2180,2320) if any(lum(px[x,y])>22 for x in range(100,1000))]
print('  ronds du dock : y=%d..%d'%(min(ys2),max(ys2)))
xs2=[x for x in range(0,w) if any(lum(px[x,y])>22 for y in range(2190,2320))]
segs=[];deb=xs2[0];prev=xs2[0]
for x in xs2[1:]:
    if x-prev>3: segs.append((deb,prev)); deb=x
    prev=x
segs.append((deb,prev))
print('  %d ronds : %s'%(len(segs),segs))
print('  interieur d\'un rond (x=%d,y=2250) = %s  (ARBITRAGE user connu : aucune icone)'%((segs[0][0]+segs[0][1])//2, px[(segs[0][0]+segs[0][1])//2,2250]))
print()
# bandeau : est-il ALIMENTE ?
print('CHROME ALIMENTE ? : ARGENT="9 627 820,00 €" (or, mesure m10) ; JOUR="JOUR 50" ; medaillon="Brulant/CHALEUR"')
print('  -> aucune valeur "Unknown" ni tiret sur ARGENT/JOUR ; la PHASE de l\'aile droite est un tiret (voulu hors district).')
