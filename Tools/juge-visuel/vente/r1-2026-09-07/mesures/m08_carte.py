# m08 — CAPTURE : geometrie et regularite du cadre de la CARTE ; comparaison au temoin
# REFERENCE = une rangee .dl (bord #2a3648, fond #111823 sur elast #0d0f10).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load()
print('OUVERT capture-1080x2400.png', im.size)
# bord haut : luminance max dans y343..352 par colonne
vals=[]
for x in range(40,1040,20):
    m=max(lum(px[x,y]) for y in range(340,356)); vals.append((x,round(m,1)))
print('CARTE bord HAUT, luminance max par colonne (pas 20px) :')
print('  ',vals)
print('  min=%.1f max=%.1f'%(min(v[1] for v in vals),max(v[1] for v in vals)))
# bords lateraux
print('CARTE bords lateraux a y=500 : gauche', px[35,500], px[36,500],' droite',px[1043,500],px[1044,500])
# geometrie
cols=[x for x in range(0,1080) if any(lum(px[x,y])>20 for y in range(340,672))]
rows=[y for y in range(320,700) if any(lum(px[x,y])>20 for x in range(20,1060))]
print('CARTE bbox : x=%d..%d (w=%d px = %.1f CSS)  y=%d..%d (h=%d px = %.1f CSS)'%(
  min(cols),max(cols),max(cols)-min(cols)+1,(max(cols)-min(cols)+1)/3.6,
  min(rows),max(rows),max(rows)-min(rows)+1,(max(rows)-min(rows)+1)/3.6))
# epaisseur du trait a gauche
xs=[x for x in range(20,80) if lum(px[x,500])>20]
print('  epaisseur trait gauche : colonnes',xs,'-> %d px (%.2f CSS)'%(len(xs),len(xs)/3.6))
# rayon d'arrondi : a quelle hauteur le bord gauche commence-t-il
prem=None
for y in range(330,420):
    if lum(px[35,y])>20: prem=y; break
print('  bord gauche x=35 commence a y=%d ; haut du cadre y=%d -> rayon apparent ~%d px (%.1f CSS)'%(prem,min(rows),prem-min(rows),(prem-min(rows))/3.6))
# fond de la carte vs fond de page
def med(x0,x1,y0,y1):
    v=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]; v.sort(key=lum); return v[len(v)//2]
print('  fond DANS la carte  (x760..1000 y560..600) =',med(760,1000,560,600))
print('  fond HORS la carte  (x400..700 y900..940) =',med(400,700,900,940))
print('  fond HORS la carte  (x400..700 y1800..1840) =',med(400,700,1800,1840))
print()
print('== TEMOIN REFERENCE : une rangee .dl (Oskar, y854..970) ==')
im2=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); q=im2.load()
def med2(x0,x1,y0,y1):
    v=[q[x,y] for y in range(y0,y1) for x in range(x0,x1)]; v.sort(key=lum); return v[len(v)//2]
print('  bord .dl (x=94,y=910) =',q[94,910],'  (jeton #2a3648 = (42,54,72))')
print('  fond .dl  (x=700..900 y=880..940) =',med2(700,900,880,940),'  (jeton #111823 = (17,24,35))')
print('  fond .elast (x=700..900 y=1600..1660) =',med2(700,900,1600,1660),'  (jeton #0d0f10 = (13,15,16))')
print('  fond .vnt6 hors elast (x=60..1010 y=800..820) =',med2(60,1010,800,820))
