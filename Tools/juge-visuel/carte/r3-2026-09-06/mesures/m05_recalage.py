# m05 - recalage affine isotrope reference -> capture (hors chrome, 2400)
# metrique : MEDIANE du max-canal |diff| sur une grille de points du contenu.
# La mediane est robuste a la couche d'ETAT de la maquette (ecussons, nappes, disque or) qui
# est ABSENTE de la capture : elle occupe nettement moins de la moitie de l'aire.
# Controle positif  : le recalage optimal doit rendre une mediane tres inferieure a celle
#                     d'un decalage volontaire de 20 px.
# Controle negatif  : un facteur anisotrope doit degrader.
from PIL import Image
import statistics

ref=Image.open('../reference-1080x2102.png').convert('RGB')
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('ref',ref.size,'cap',cap.size)
R=ref.load(); C=cap.load()
RW,RH=ref.size; CW,CH=cap.size

# grille de points dans la REFERENCE, zone de contenu large (on evite le bandeau et la legende)
PTS=[(x,y) for y in range(240,2060,9) for x in range(6,1074,9)]
print('points de grille :',len(PTS))

def cost(s,tx,ty,sy=None):
    sy = s if sy is None else sy
    acc=[]
    for (x,y) in PTS:
        cx=x*s+tx; cy=y*sy+ty
        ix=int(cx+0.5); iy=int(cy+0.5)
        if ix<0 or ix>=CW or iy<232 or iy>2151: continue
        a=R[x,y]; b=C[ix,iy]
        acc.append(max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2])))
    if not acc: return 999,0
    return statistics.median(acc), len(acc)

best=None
for s in [1.010+0.002*k for k in range(13)]:
    for tx in range(-30,15,3):
        for ty in range(-10,40,3):
            c,n=cost(s,tx,ty)
            if best is None or c<best[0]: best=(c,s,tx,ty,n)
print('grossier :',best)
c,s,tx,ty,n=best
for _ in range(4):
    improved=True
    step_s, step_t = 0.0005, 1.0
    while improved:
        improved=False
        for ds in (-step_s,0,step_s):
            for dtx in (-step_t,0,step_t):
                for dty in (-step_t,0,step_t):
                    cc,nn=cost(s+ds,tx+dtx,ty+dty)
                    if cc<c-1e-9:
                        c,s,tx,ty,n=cc,s+ds,tx+dtx,ty+dty; improved=True
    step_s/=2; step_t/=2
print(f'RECALAGE  s={s:.4f}  tx={tx:.2f}  ty={ty:.2f}  mediane={c:.2f}/255  n={n}')
print('controle positif  : decalage +20 px en x ->', cost(s,tx+20,ty)[0])
print('controle positif  : decalage +20 px en y ->', cost(s,tx,ty+20)[0])
print('controle negatif (anisotropie +0,5%) : sy=s*1.005 ->', cost(s,tx,ty,s*1.005)[0])
print('controle negatif (anisotropie -0,5%) : sy=s*0.995 ->', cost(s,tx,ty,s*0.995)[0])
import json
json.dump({'s':s,'tx':tx,'ty':ty,'median':c}, open('recalage.json','w'))
