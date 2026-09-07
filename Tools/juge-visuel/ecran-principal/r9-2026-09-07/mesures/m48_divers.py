# m48 — filet de fiche (meme seuil), degrade angulaire du cadran, losange, bande du nom, ronds du dock
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m48 divers ===')
imc=ouvrir(CANON,'canon'); pc=imc.load()
imd=ouvrir(DIST,'district2400'); pd=imd.load()
imf=ouvrir(F2400,'fiche2400'); pf=imf.load()

print('  1) filet haut de la fiche, MEME seuil (dist a --laiton < 70)')
for nom,px,y,sc in (('canon',pc,1280,SC_CANON),('jeu',pf,1652,SC_CAPT)):
    xs=[x for x in range(px and 0, (1176 if nom=='canon' else 1080)) if dist_rgb(px[x,y],TOK['laiton'])<70]
    if xs: print('     %-6s y=%d : x %.2f..%.2f CSS (%d px, largeur %.2f CSS)'%(nom,y,min(xs)/sc,max(xs)/sc,len(xs),(max(xs)-min(xs)+1)/sc))
    else:  print('     %-6s y=%d : aucun'%(nom,y))

print('  2) degrade ANGULAIRE du cadran (anneau 0,58..0,72 R, encre et arcs exclus)')
for nom,px,mcx,mcy,mR,sc in (('canon',pc,587.49,116.52,93.94,SC_CANON),('jeu',pd,539.50,109.67,89.56,SC_CAPT)):
    sect={}
    for s in range(8):
        a0,a1=s*45,(s+1)*45
        v=[]
        for k in range(240):
            a=math.radians(a0+(a1-a0)*k/240.0)
            for rr in [0.58,0.62,0.66,0.70]:
                x=int(round(mcx+mR*rr*math.cos(a))); y=int(round(mcy-mR*rr*math.sin(a)))
                c=px[x,y]
                if max(c)-min(c)>34: continue   # exclut arcs colores
                if lum(c)>0.09: continue        # exclut encre claire
                v.append(c)
        if v: sect[s]=(int(med([c[0] for c in v])),int(med([c[1] for c in v])),int(med([c[2] for c in v])))
    if sect:
        amp=tuple(max(c[i] for c in sect.values())-min(c[i] for c in sect.values()) for i in range(3))
        Ls={s:L(c) for s,c in sect.items()}
        clair=max(Ls,key=lambda s:Ls[s])
        print('     %-6s secteurs : %s' % (nom,' '.join('%d:%s'%(s*45,str(c)) for s,c in sorted(sect.items()))))
        print('            amplitude RGB %s ; Delta L* %.1f ; secteur le plus clair %d..%d deg' % (str(amp),max(Ls.values())-min(Ls.values()),clair*45,(clair+1)*45))

print('  3) losange sous le medaillon, MEME seuil (dist a --laiton < 60), aire equivalente')
for nom,px,mcx,mcy,mR,sc in (('canon',pc,587.49,116.52,93.94,SC_CANON),('jeu',pd,539.50,109.67,89.56,SC_CAPT)):
    pts=[(x,y) for y in range(int(mcy+mR-1),int(mcy+mR+10*sc)) for x in range(int(mcx-9*sc),int(mcx+9*sc)) if dist_rgb(px[x,y],TOK['laiton'])<60]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print('     %-6s : %d px, bbox %.2f x %.2f CSS, centre x %.2f CSS, y %.2f..%.2f CSS, diagonale eq %.2f CSS'
              % (nom,len(pts),(max(xs)-min(xs)+1)/sc,(max(ys)-min(ys)+1)/sc,(min(xs)+max(xs))/2/sc,min(ys)/sc,max(ys)/sc, math.sqrt(2*len(pts))/sc))

print('  4) bande du nom de district (planche 2400) : boite et texte')
ys=[y for y in range(200,300) if dist_rgb(medrgb(pd,700,y,1000,y+1),(19,24,35))<6 or dist_rgb(medrgb(pd,700,y,1000,y+1),(23,35,52))<6]
print('     bande sombre (colonne 700..1000) : y %d..%d px = %.2f..%.2f CSS (hauteur %.2f CSS)'%(min(ys),max(ys),min(ys)/SC_CAPT,max(ys)/SC_CAPT,(max(ys)-min(ys)+1)/SC_CAPT))
from texte import metrique
metrique(pd,SC_CAPT, 0, 60, 84, 96, 'texte "La Lisiere"')

print('  5) ronds du dock')
for nom,px,y0,y1,sc,W in (('canon',pc,1840,1990,SC_CANON,1176),('jeu',pd,2185,2310,SC_CAPT,1080)):
    ym=(y0+y1)//2
    base=med([lum(px[x,ym]) for x in range(W)])
    runs=[];cur=None
    for x in range(W):
        on=lum(px[x,ym])>base*1.18+0.0015
        if on:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur and cur[1]-cur[0]>int(20*sc): runs.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>int(20*sc): runs.append(tuple(cur))
    print('     %-6s y=%d : %d ronds ; %s' % (nom,ym,len(runs),' | '.join('centre %.2f, D %.2f CSS'%(((a+b)/2)/sc,(b-a+1)/sc) for a,b in runs)))
