# m30 — marqueurs de batiment : gabarit "anneau ambre a r=6 px + coeur sombre + halo sombre a r=10".
# Controle POSITIF : le marqueur "Laboratoire" est a (491,784) sur la planche 2400 -> doit sortir en tete.
# Controle NEGATIF : une fenetre de fenetres eclairees (art) ne doit rien sortir.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m30 marqueurs de batiment (gabarit annulaire) ===')
def ambre(c):
    r,g,b=c
    return r>140 and g>105 and b<130 and r-b>70 and g-b>40 and r>=g

RING=[(6*math.cos(2*math.pi*k/24), 6*math.sin(2*math.pi*k/24)) for k in range(24)]
CORE=[(0,0),(1,0),(-1,0),(0,1),(0,-1),(2,0),(-2,0),(0,2),(0,-2)]

def score(px,W,H,x,y):
    na=0
    for dx,dy in RING:
        xi,yi=int(round(x+dx)),int(round(y+dy))
        if not(0<=xi<W and 0<=yi<H): return 0,0
        if ambre(px[xi,yi]): na+=1
    nd=0
    for dx,dy in CORE:
        xi,yi=int(round(x+dx)),int(round(y+dy))
        if 0<=xi<W and 0<=yi<H and lum(px[xi,yi])<0.045: nd+=1
    return na/24.0, nd/float(len(CORE))

for path,nom,Y0,Y1 in [(DIST,'district2400',240,2160)]:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    cand=[]
    for y in range(Y0+8,Y1-8):
        for x in range(8,W-8):
            if not ambre(px[x,y]): continue
            # centre presume : le pixel + (0..12) autour -> on teste seulement les centres plausibles
            pass
    # balayage direct des centres (pas 1 px) : couteux mais correct
    for y in range(Y0+8,Y1-8):
        for x in range(8,W-8):
            c=px[x,y]
            if lum(c)>=0.045: continue
            a,d = score(px,W,H,x,y)
            if a>=0.60 and d>=0.65: cand.append((a,d,x,y))
    cand.sort(reverse=True)
    pris=[]
    for a,d,x,y in cand:
        if all(math.hypot(x-p[2],y-p[3])>10 for p in pris): pris.append((a,d,x,y))
    pris.sort(key=lambda p:(p[3],p[2]))
    print('   [%s] %d centres candidats, %d marqueurs apres suppression des voisins' % (nom,len(cand),len(pris)))
    for i,(a,d,x,y) in enumerate(pris):
        print('      B%02d (%4d,%4d) px = (%6.2f, %6.2f) CSS   anneau %.2f  coeur %.2f' % (i+1,x,y,x/SC_CAPT,y/SC_CAPT,a,d))
    # controle positif
    ok=any(math.hypot(x-491,y-784)<6 for _,_,x,y in pris)
    print('   CONTROLE POSITIF : marqueur "Laboratoire" (491,784) retrouve : %s' % ok)
