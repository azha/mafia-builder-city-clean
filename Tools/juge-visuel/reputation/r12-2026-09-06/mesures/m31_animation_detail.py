import sys; sys.path.insert(0,'.')
from lib import *
print("=== m31 : ou exactement la paire T/T+1s differe, et de combien l'image se decale ===")
a=ouvrir('../capture-ecran-seul-1080x1920-T.png'); b=ouvrir('../capture-ecran-seul-1080x1920-T+1s.png')
pa,pb=px(a),px(b); W,H=a.size
# etendue en x des pixels qui bougent
xs=[x for x in range(W) if any(max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))>8 for y in range(H))]
print(f"  colonnes qui bougent : x {min(xs)}..{max(xs)}  ({len(xs)} colonnes)")
print(f"  (la carte portrait occupe x 78..500 ; la colonne des tuiles x 539..1001)")
n_droite=sum(1 for x in xs if x>=530)
print(f"  colonnes qui bougent au-dela de x=530 (colonne des tuiles) : {n_droite}")
# decalage vertical du buste : correlation du profil de peau
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
def prof(p):
    return [sum(1 for x in range(140,420) if peau(p[x,y])) for y in range(800,1300)]
PA, PB = prof(pa), prof(pb)
best=None
for d in range(-40,41):
    s=0;n=0
    for i in range(len(PA)):
        j=i+d
        if 0<=j<len(PB): s+=abs(PA[i]-PB[j]); n+=1
    v=s/n
    if best is None or v<best[1]: best=(d,v)
print(f"  decalage vertical du buste qui minimise l'ecart de profil : {best[0]:+d} px (residu moyen {best[1]:.2f})")
# bbox du visage dans chaque
for nom,p in (('T',pa),('T+1s',pb)):
    bb=bbox_masque(a if nom=='T' else b, peau, 140,800,420,1300)
    print(f"    {nom} : peau bbox y {bb[1]}..{bb[3]}  x {bb[0]}..{bb[2]}")
# le libelle
def lignes(p,x0,y0,x1,y1):
    out=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(p[x,y])>90)
        if n>=3: cur=[y,y] if cur is None else [cur[0],y]
        else:
            if cur and cur[1]-cur[0]>=3: out.append(tuple(cur))
            cur=None
    if cur: out.append(tuple(cur))
    return out
print(f"  libelle de la carte : T -> {lignes(pa,90,690,495,780)} ; T+1s -> {lignes(pb,90,690,495,780)}")
