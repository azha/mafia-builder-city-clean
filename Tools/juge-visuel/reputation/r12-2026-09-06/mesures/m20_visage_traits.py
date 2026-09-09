import sys; sys.path.insert(0,'.')
from lib import *
print("=== m20 : traits du visage — pixels sombres ENTOURES de peau (yeux, bouche) ===")
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
CAS=[('REF','../reference-1080x2102.png',(85,880),1099,1232),
     ('JEU','../capture-1080x2400.png',  (81,908),1118,1257)]
for nom,f,(ox,oy),ytop,ybot in CAS:
    im=ouvrir(f); p=px(im)
    interieur=set()
    for y in range(ytop,ybot+1):
        xs=[x for x in range(140,420) if peau(p[x,y])]
        if len(xs)<10: continue
        a,b=min(xs),max(xs)
        for x in range(a,b+1):
            if not peau(p[x,y]): interieur.add((x,y))
    # composantes connexes
    vus=set(); comps=[]
    for q in interieur:
        if q in vus: continue
        pile=[q]; vus.add(q); comp=[]
        while pile:
            c=pile.pop(); comp.append(c)
            for dx in(-1,0,1):
                for dy in(-1,0,1):
                    n=(c[0]+dx,c[1]+dy)
                    if n in interieur and n not in vus: vus.add(n); pile.append(n)
        if len(comp)>=40: comps.append(comp)
    comps.sort(key=lambda c: min(y for _,y in c))
    print(f"  {nom} : {len(comps)} traits internes")
    for c in comps:
        xs=[a for a,_ in c]; ys=[b for _,b in c]
        print(f"     x{min(xs)}..{max(xs)} ({max(xs)-min(xs)+1}) y{min(ys)}..{max(ys)} ({max(ys)-min(ys)+1}) n={len(c)}"
              f"  centre=({(min(xs)+max(xs))/2:.1f},{(min(ys)+max(ys))/2:.1f}) rel_carte=({(min(xs)+max(xs))/2-ox:.1f},{(min(ys)+max(ys))/2-oy:.1f})")
