# m36 : silhouette du buste, filet or du titre, boite CTA, chrome (coherence avec le temoin).
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png','temoin-menu-plus-1080x2400.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B,T='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png','temoin-menu-plus-1080x2400.png'

print("\n== silhouette sombre du buste (plus sombre que le fond de la carte) ==")
for tag,f,ya,yb,fond in (('ref',R,1050,1530,(17,24,35)),('2400',A,940,1555,(13,22,34)),('1920',B,710,1322,(13,22,34))):
    px=PX[f]; Lf=lum(fond)
    rows=[]
    for y in range(ya,yb):
        xs=[x for x in range(85,500) if lum(px[x,y])<Lf-6]
        if len(xs)>4: rows.append((y,min(xs),max(xs),max(xs)-min(xs)+1))
    if not rows: print("   %-5s rien"%tag); continue
    w=max(r[3] for r in rows)
    print("   %-5s silhouette : y=%d..%d (h=%d) ; largeur max=%d px (a y=%d)"
          % (tag,rows[0][0],rows[-1][0],rows[-1][0]-rows[0][0]+1,w,[r[0] for r in rows if r[3]==w][0]))

print("\n== tete : chevelure sombre autour du visage ==")
PEAU=(185,173,146)
def est_peau(c,t=18): return all(abs(c[i]-PEAU[i])<=t for i in range(3))
for tag,f,ya,yb,fond in (('ref',R,1080,1200,(17,24,35)),('2400',A,1100,1220,(13,22,34)),('1920',B,870,990,(13,22,34))):
    px=PX[f]; Lf=lum(fond); n=0; tot=0
    for y in range(ya,yb):
        pxs=[x for x in range(150,450) if est_peau(px[x,y])]
        if not pxs: continue
        tot+=1
        g=[x for x in range(max(85,min(pxs)-60),min(pxs)) if lum(px[x,y])<Lf-6]
        d=[x for x in range(max(pxs)+1,min(500,max(pxs)+61)) if lum(px[x,y])<Lf-6]
        if len(g)<3 or len(d)<3: n+=1
    print("   %-5s rangees de PEAU sans flanc sombre des DEUX cotes : %d / %d" % (tag,n,tot))

print("\n== filet or sous le sous-titre : offset depuis le rail haut du cadre ==")
for tag,f,rail,filet in (('ref',R,452,(663,669)),('2400',A,482,(687,693)),('1920',B,250,(454,461))):
    print("   %-5s rail=%d filet=%d..%d -> offset %d..%d px" % (tag,rail,filet[0],filet[1],filet[0]-rail,filet[1]-rail))

print("\n== boite CTA ==")
for tag,f,box in (('ref',R,(1952,2047)),('2400',A,(1882,1971))):
    px=PX[f]; a,b=box
    y=(a+b)//2
    xs=[x for x in range(20,1060) if est_or(px[x,y])]
    print("   %-5s hauteur=%d px ; rails x=%d..%d (largeur %d px)" % (tag,b-a+1,min(xs),max(xs),max(xs)-min(xs)+1))

print("\n== chrome : coherence entre les 2 planches et le TEMOIN (le canon HUD n'est PAS dans le dossier) ==")
for tag,f in (('2400',A),('1920',B),('temoin',T)):
    px=PX[f]
    print("   %-7s filet du bandeau y=141 couleur=%s | medaillon (centre 540,110)=%s | 'JOUR' (990,35)=%s | soulignement PLUS"
          % (tag, mediane_fenetre(px,300,141,0), mediane_fenetre(px,540,110,1), mediane_fenetre(px,990,35,1)))
# soulignement de l'onglet actif
for tag,f,y in (('2400',A,2318),('1920',B,1838),('temoin',T,2318)):
    px=PX[f]
    xs=[x for x in range(600,900) if est_or(px[x,y])]
    print("   %-7s soulignement or a y=%d : x=%s" % (tag,y,("%d..%d (l=%d)"%(min(xs),max(xs),max(xs)-min(xs)+1)) if xs else 'aucun'))
