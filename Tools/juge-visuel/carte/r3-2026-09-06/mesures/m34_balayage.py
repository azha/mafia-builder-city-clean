# m34 - BALAYAGE "en trop / absent" : amas de residu (|jeu - maquette recalee| par canal max)
# regroupes en cellules 20x20, seuil 40/255, puis agglomeres. Chaque amas est etiquete par le
# SIGNE moyen (jeu plus CLAIR = en trop ; jeu plus SOMBRE = absent), et sa position en px de
# la reference (pour retrouver l'element dans la maquette).
# CONTROLE : les amas attendus de la couche d'ETAT (6 ecussons, 2 nappes, disque or, drapeau,
# legende) doivent sortir en tete ; s'ils n'y sont pas, l'instrument est faux.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import statistics
w=Image.open('ref_warp.png').convert('RGB'); W_=w.load()
c=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=c.load()
print('ref_warp',w.size,'cap',c.size)
CELL=20
cells={}
for cy in range(232,2152,CELL):
    for cx in range(0,1080,CELL):
        d=[];sg=[]
        for y in range(cy,min(cy+CELL,2152)):
            for x in range(cx,min(cx+CELL,1080)):
                a=W_[x,y]; b=C[x,y]
                dd=max(abs(a[i]-b[i]) for i in range(3))
                d.append(dd); sg.append(L(b)-L(a))
        d.sort()
        if d[int(len(d)*0.7)]>40: cells[(cx,cy)]=(d[int(len(d)*0.7)],statistics.mean(sg))
print('cellules 20x20 au residu p70 > 40/255 :',len(cells),'sur',(1920//CELL)*(1080//CELL))
seen=set(); amas=[]
for k in cells:
    if k in seen: continue
    pile=[k]; seen.add(k); grp=[]
    while pile:
        p=pile.pop(); grp.append(p)
        for dx in (-CELL,0,CELL):
            for dy in (-CELL,0,CELL):
                q=(p[0]+dx,p[1]+dy)
                if q in cells and q not in seen: seen.add(q); pile.append(q)
    xs=[p[0] for p in grp]; ys=[p[1] for p in grp]
    sg=statistics.mean(cells[p][1] for p in grp)
    amas.append((len(grp),min(xs),min(ys),max(xs)+CELL,max(ys)+CELL,sg))
amas.sort(reverse=True)
print(f"{'cells':>6s} {'bbox capture':>28s} {'bbox reference':>28s} {'signe L(jeu-maq)':>17s}")
for n,x0,y0,x1,y1,sg in amas[:28]:
    r0=c2r(x0,y0); r1=c2r(x1,y1)
    print(f'{n:6d} {f"({x0},{y0})-({x1},{y1})":>28s} {f"({r0[0]:.0f},{r0[1]:.0f})-({r1[0]:.0f},{r1[1]:.0f})":>28s} {sg:+17.1f}')
print('\n  total de cellules en amas :',sum(a[0] for a in amas))
