# m51 — les 11 marqueurs sont-ils IDENTIQUES ? Comparaison deux a deux du disque (r<=8 px) au marqueur B01.
# Controle NEGATIF : le meme instrument compare aussi un marqueur a un marqueur de LIEUTENANT (doit differer).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m51 identite des marqueurs de batiment ===')
im=ouvrir(DIST,'district2400'); px=im.load()
M=[(490,783),(803,855),(296,883),(905,911),(576,946),(305,947),(136,1027),(587,1102),(149,1222),(723,1480),(148,1496)]
LT=[(479,758),(495,758),(511,758)]   # marqueurs de lieutenant, estimes sur la vue z-3marqueurs2
def disque(R=8):
    return [(dx,dy) for dy in range(-R,R+1) for dx in range(-R,R+1) if dx*dx+dy*dy<=R*R]
D=disque()
ref=M[0]
print('   reference B01 (%d,%d) ; disque r=8 px, %d pixels' % (ref[0],ref[1],len(D)))
for i,(x,y) in enumerate(M):
    d=[dist_rgb(px[ref[0]+dx,ref[1]+dy], px[x+dx,y+dy]) for dx,dy in D]
    n_gros=sum(1 for v in d if v>24)
    print('      B%02d (%4d,%4d) : ecart median %3.0f/255 ; max %3d ; %3d px a plus de 24/255 (%.0f %%)'
          % (i+1,x,y,med(d),max(d),n_gros,100.0*n_gros/len(d)))
print('   CONTROLE NEGATIF : le meme disque compare a un marqueur de LIEUTENANT')
for x,y in LT:
    d=[dist_rgb(px[ref[0]+dx,ref[1]+dy], px[x+dx,y+dy]) for dx,dy in D]
    n=sum(1 for v in d if v>24)
    print('      LT (%4d,%4d) : ecart median %3.0f/255 ; max %3d ; %3d px a plus de 24/255 (%.0f %%)' % (x,y,med(d),max(d),n,100.0*n/len(d)))
