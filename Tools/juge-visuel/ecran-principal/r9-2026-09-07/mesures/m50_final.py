# m50 — derniers chiffres : jour VISIBLE montant<->medaillon ; epaisseur du filet ; contraste des libelles de dock
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m50 finitions ===')
imc=ouvrir(CANON,'canon'); pc=imc.load()
imd=ouvrir(DIST,'district2400'); pd=imd.load()
print('  1) jour VISIBLE entre le dernier pixel du montant et la premiere lueur du cerclage')
for nom,px,sc,cx,cy,xfin,yband in (('canon',pc,SC_CANON,587.49,116.52,int(77.00*SC_CANON),(int(22.33*SC_CANON),int(33.00*SC_CANON))),
                                   ('jeu',pd,SC_CAPT,539.50,109.67,int(161.88*SC_CAPT),(int(26.13*SC_CAPT),int(35.21*SC_CAPT)))):
    ym=(yband[0]+yband[1])//2
    fond=medrgb(px,xfin+int(6*sc),ym-3,xfin+int(14*sc),ym+4)
    x=xfin+1; prem=None
    while x < cx:
        c=px[x,ym]
        if dist_rgb(c,fond)>10: prem=x; break
        x+=1
    print('     %-5s : montant finit x=%.2f CSS ; premiere colonne differente du fond (>10/255) a x=%s CSS -> jour VISIBLE %s CSS'
          % (nom, xfin/sc, ('%.2f'%(prem/sc)) if prem else 'aucune', ('%.2f'%((prem-xfin)/sc)) if prem else '>'+('%.2f'%((cx-xfin)/sc))))
print('  2) epaisseur du filet du bandeau (lignes chromatiques consecutives, colonne 60..140 CSS)')
for nom,px,sc,W in (('canon',pc,SC_CANON,1176),('jeu',pd,SC_CAPT,1080)):
    ys=[y for y in range(int(46*sc),int(58*sc)) if max(medrgb(px,int(60*sc),y,int(140*sc),y+1))-min(medrgb(px,int(60*sc),y,int(140*sc),y+1))>30]
    print('     %-5s : lignes %s -> epaisseur %.2f CSS, y %.2f..%.2f CSS' % (nom,ys,(len(ys))/sc,min(ys)/sc,max(ys)/sc) if ys else '     %s : aucune'%nom)
print('  3) libelles du dock : encre / fond / contraste')
for nom,px,sc,y0,y1 in (('canon',pc,SC_CANON,2010,2032),('jeu',pd,SC_CAPT,2322,2343)):
    W=1176 if nom=='canon' else 1080
    fond=medrgb(px,0,y0,W,y1)
    pts=[px[x,y] for y in range(y0,y1) for x in range(W) if lum(px[x,y])>lum(fond)+0.02]
    if pts:
        pts.sort(key=lambda c:-lum(c)); top=pts[:max(4,len(pts)//4)]
        enc=tuple(int(med([c[i] for c in top])) for i in range(3))
        print('     %-5s : %d px ; encre %s ; fond %s ; contraste %.2f:1 ; ecart a --creme-2 %d'
              % (nom,len(pts),str(enc),str(tuple(int(v) for v in fond)),contraste(enc,fond),dist_rgb(enc,TOK['creme2'])))
