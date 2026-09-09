# m35 — hauteur de CAPITALE comparee, meme instrument : on isole la 1re majuscule de chaque libelle
# (colonne la plus a gauche du bloc d'encre) et on mesure sa hauteur a mi-alpha.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m35 hauteurs de capitale comparees (mi-alpha) ===')
def capitale(px, x0,x1,y0,y1, sc, nom, prem=True):
    """alpha = (L(pixel)-L(fond))/(L(encre)-L(fond)) estime par la luminance normalisee"""
    fond=med([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    hi=sorted(vals)[int(len(vals)*0.995)]
    seuil=(fond+hi)/2.0
    cols={}
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>=seuil]
        if ys: cols[x]=(min(ys),max(ys))
    if not cols: print('   %-30s : rien'%nom); return
    xs=sorted(cols)
    grp=[]; cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1]<=1: cur.append(x)
        else: grp.append(cur); cur=[x]
    grp.append(cur)
    g = grp[0] if prem else max(grp,key=len)
    t=min(cols[x][0] for x in g); b=max(cols[x][1] for x in g)
    hs=sorted((cols[x][1]-cols[x][0]+1) for x in xs)
    print('   %-30s : 1er glyphe x %4d..%4d  hauteur %4.1f px = %5.2f CSS ; hauteur mediane des colonnes %4.1f px = %5.2f CSS ; %d glyphes'
          % (nom,g[0],g[-1],b-t+1,(b-t+1)/sc, med(hs), med(hs)/sc, len(grp)))

imd=ouvrir(DIST,'district2400'); pd=imd.load()
imf=ouvrir(F1920,'fiche1920'); pf=imf.load()
imc=ouvrir(CANON,'canon'); pc=imc.load()
print('  -- libelles de type du district (jeu) --')
capitale(pd,455,520,1038,1056,SC_CAPT,'B01 "Laboratoire"')
capitale(pd,86,175,1036,1056,SC_CAPT,'B07 "Commerce-ecran"')
capitale(pd,735,825,1858,1878,SC_CAPT,'B02 "Cache" (y 1858)')
print('  -- reperes d\'echelle (jeu) --')
capitale(pd,270,400,2294,2320,SC_CAPT,'libelle du dock 2 (FAMILLE)')
capitale(pd,2,120,232,262,SC_CAPT,'nom de district "La Lisiere"')
capitale(pf,560,700,1268,1292,SC_CAPT,'sous-titre fiche OPERATIONNEL')
print('  -- reperes d\'echelle (canon) --')
capitale(pc,290,420,1968,1992,SC_CANON,'libelle du dock FAMILLE')
capitale(pc,80,180,140,175,SC_CANON,'lib ARGENT')
