from common import *
c=op(C24); px=c.load()
base=21
print('  CAP2400 aile gauche, x 100..470 px : nb de pixels encre (L>fond+40) par ligne')
for y in range(25,165):
    n=sum(1 for x in range(100,470) if lum(px[x,y])-base>40)
    xs=[x for x in range(100,470) if lum(px[x,y])-base>40]
    print(f'    y={y:3d} ({y/CAP_S:6.2f} CSS) n={n:4d}' + (f'  x {min(xs)}..{max(xs)}' if xs else ''))
