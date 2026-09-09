# m33 — boite de la fiche par DIFFERENCE district(fermee) / fiche(ouverte) a 2400 ; rayon des coins ; filet haut.
# Controle : hors plaque, les deux planches doivent etre identiques (sinon la difference ne mesure pas la plaque).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m33 boite de la fiche (par difference) ===')
ia=ouvrir(DIST,'district 2400 (fiche fermee)'); pa=ia.load()
ib=ouvrir(F2400,'fiche 2400 (fiche ouverte)'); pb=ib.load()
W,H=ia.size
diff=set()
for y in range(H):
    for x in range(W):
        if dist_rgb(pa[x,y],pb[x,y])>3: diff.add((x,y))
print('   %d px differents sur %d (%.2f %%)' % (len(diff),W*H,100.0*len(diff)/(W*H)))
# composantes
vus=set(); comps=[]
for p in diff:
    if p in vus: continue
    pile=[p]; vus.add(p); c=[]
    while pile:
        q=pile.pop(); c.append(q)
        for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            n=(q[0]+d[0],q[1]+d[1])
            if n in diff and n not in vus: vus.add(n); pile.append(n)
    comps.append(c)
comps.sort(key=len,reverse=True)
print('   %d composantes ; les 5 plus grosses :' % len(comps))
for c in comps[:5]:
    xs=[p[0] for p in c]; ys=[p[1] for p in c]
    print('      %7d px  bbox px (%4d,%4d)-(%4d,%4d) = CSS (%7.2f,%7.2f)-(%7.2f,%7.2f)  taille %.2f x %.2f CSS'
          % (len(c),min(xs),min(ys),max(xs),max(ys),min(xs)/SC_CAPT,min(ys)/SC_CAPT,max(xs)/SC_CAPT,max(ys)/SC_CAPT,
             (max(xs)-min(xs)+1)/SC_CAPT,(max(ys)-min(ys)+1)/SC_CAPT))
# rayon des coins : retrait du bord gauche/droit sur les 18 premieres lignes de la plaque
c=comps[0]; xs=[p[0] for p in c]; ys=[p[1] for p in c]
x0,y0,x1,y1=min(xs),min(ys),max(xs),max(ys)
lignes={}
for x,y in c: lignes.setdefault(y,[]).append(x)
print('   retraits (coins arrondis) — plaque x %d..%d :' % (x0,x1))
for k in range(18):
    y=y0+k
    if y in lignes:
        g=min(lignes[y])-x0; d=x1-max(lignes[y])
        print('      ligne %2d : gauche %5.2f CSS  droite %5.2f CSS' % (k,g/SC_CAPT,d/SC_CAPT))
