# m15 : la plaque VERRIER tronque-t-elle la rose des vents ?
# On mesure l'extension verticale du branchement SUD de l'etoile dans une bande
# etroite centree sur son axe, des deux cotes, et on compare via S=1.0225,dy=+8.
# Controle positif : le branchement NORD (au-dessus, non occulte) doit coincider.
from PIL import Image
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()
etoile=lambda p: p[0]>140 and p[1]>140 and p[2]>130 and max(p)-min(p)<45
# axe de l'etoile : on le trouve dans la reference (colonne au plus grand nombre de px)
best=(0,0)
for x in range(920,1060):
    n=sum(1 for y in range(520,680) if etoile(rp[x,y]))
    if n>best[1]: best=(x,n)
ax=best[0]; print(f"  axe de la rose (REF) x={ax} ({best[1]} px)")
AX=int(S*ax+DX); print(f"  axe attendu (CAP)   x={AX}")
def extent(px,x,y0,y1,h):
    ys=[y for y in range(y0,y1) for xx in (x-2,x-1,x,x+1,x+2) if 0<=y<h and etoile(px[xx,y])]
    return (min(ys),max(ys)) if ys else None
er=extent(rp,ax,500,700,2102); ec=extent(cp,AX,500,760,2400)
print(f"  REF etoile sur l'axe : y {er}  hauteur {er[1]-er[0]+1}")
print(f"  CAP etoile sur l'axe : y {ec}  hauteur {ec[1]-ec[0]+1}")
print(f"  attendu CAP haut = {S*er[0]+DY:.1f}  bas = {S*er[1]+DY:.1f}")
print(f"  ecart haut = {ec[0]-(S*er[0]+DY):+.1f} px   ecart bas = {ec[1]-(S*er[1]+DY):+.1f} px")
print(f"  hauteur attendue {(er[1]-er[0]+1)*S:.1f} ; obtenue {ec[1]-ec[0]+1} -> perte {(er[1]-er[0]+1)*S-(ec[1]-ec[0]+1):.1f} px")
print(f"  haut de la plaque VERRIER : y=682  ; bas de l'etoile obtenu : y={ec[1]}")
