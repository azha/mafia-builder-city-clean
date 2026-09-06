import sys; sys.path.insert(0,'.')
from lib import *
print("=== m30 : ANIMATION — paire T / T+1 s (ecran SEUL, 1080x1920, meme run) ===")
a=ouvrir('../capture-ecran-seul-1080x1920-T.png')
b=ouvrir('../capture-ecran-seul-1080x1920-T+1s.png')
pa,pb=px(a),px(b)
W,H=a.size
tot=W*H
comptes={s:0 for s in (1,2,4,8,16,32)}
par_ligne=[0]*H
mx=0; pire=None
for y in range(H):
    for x in range(W):
        d=max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))
        if d>0:
            par_ligne[y]+=1
            for s in comptes:
                if d>=s: comptes[s]+=1
            if d>mx: mx=d; pire=(x,y,pa[x,y],pb[x,y])
print(f"  taille {W}x{H} = {tot} px")
for s in sorted(comptes):
    print(f"    px dont un canal differe de >= {s:2d}/255 : {comptes[s]:8d}  ({100*comptes[s]/tot:.5f} %)")
print(f"  ecart maximal = {mx}/255 en {pire[:2] if pire else None} : {pire[2] if pire else None} -> {pire[3] if pire else None}")
if any(par_ligne):
    g=[]
    for y,n in enumerate(par_ligne):
        if n>0:
            if g and y-g[-1][-1]<=2: g[-1].append(y)
            else: g.append([y])
    print(f"  bandes de lignes ou quelque chose bouge : {[(x[0],x[-1]) for x in g][:20]}")
else:
    print("  AUCUN pixel ne bouge : les deux planches sont IDENTIQUES a l'octet.")
print()
print("  CONTROLE POSITIF de l'instrument : meme comparaison entre T et la planche SOUS CHROME")
c=ouvrir('../capture-1080x1920.png'); pc=px(c)
n=sum(1 for y in range(0,H,3) for x in range(0,W,3) if max(abs(pa[x,y][i]-pc[x,y][i]) for i in range(3))>0)
print(f"    px differents (echantillon 1/9) : {n} -> l'instrument DISCRIMINE (non nul).")
import hashlib
for f in ('../capture-ecran-seul-1080x1920-T.png','../capture-ecran-seul-1080x1920-T+1s.png'):
    print(f"    sha256 {f} = {hashlib.sha256(open(f,'rb').read()).hexdigest()[:24]}")
