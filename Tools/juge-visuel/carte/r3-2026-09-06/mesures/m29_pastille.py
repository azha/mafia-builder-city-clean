# m29 - la pastille "Chaleur : affichee" (ARBITRAGE user : sa presence ne se compte pas,
# sa FORME se mesure). Geometrie, couleurs, angles, liseré, et ce qu'elle recouvre.
from PIL import Image
import statistics
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
w=Image.open('ref_warp.png').convert('RGB'); W_=w.load()
print('cap',cap.size,'ref',ref.size)
# 1. pixels blanc pur dans la zone de contenu
blancs=[(x,y) for y in range(232,2152) for x in range(1080) if C[x,y]==(255,255,255)]
print('pixels EXACTEMENT (255,255,255) dans le contenu du jeu :',len(blancs))
if blancs:
    xs=[p[0] for p in blancs]; ys=[p[1] for p in blancs]
    print('   bbox x %d..%d  y %d..%d'%(min(xs),max(xs),min(ys),max(ys)))
blancs_ref=[(x,y) for y in range(219,2102) for x in range(1080) if R[x,y]==(255,255,255)]
print('pixels EXACTEMENT (255,255,255) dans la maquette :',len(blancs_ref))
# 2. la plaque : balayage autour
print('\nplaque : coupe verticale x=60 et horizontale y=2120')
for y in range(2095,2150): 
    if y%3==0: print('   y=%d %s'%(y,C[60,y]))
print()
row=[]
prev=None
for x in range(0,260):
    p=C[x,2120]
    if prev is None or max(abs(p[i]-prev[i]) for i in range(3))>10:
        print('   x=%d %s'%(x,p)); prev=p
# 3. ce que la plaque recouvre dans la maquette recalee
zone=[(x,y) for y in range(2100,2145) for x in range(10,200)]
lm=[0.299*W_[x,y][0]+0.587*W_[x,y][1]+0.114*W_[x,y][2] for x,y in zone]
print('\n  sous la plaque, la maquette recalee : L median %.1f  p95 %.1f  max %.1f'%(statistics.median(lm),sorted(lm)[int(len(lm)*0.95)],max(lm)))
