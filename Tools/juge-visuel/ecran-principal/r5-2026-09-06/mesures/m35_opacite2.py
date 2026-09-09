# Test decisif : le panneau laisse-t-il passer l'art ? On compare, sur la MEME ligne, l'art HORS panneau
# et le fond DANS le panneau, a des endroits ou l'art hors panneau est tres different.
from common import *
def paire(im,y,xa0,xa1,xb0,xb1,scale,label):
    a=med(im,xa0,y,xa1,y+14); b=med(im,xb0,y,xb1,y+14)
    print(f'  {label} y={y} ({y/scale:.1f} CSS) : art HORS {a} L={lum(a):5.1f}  |  fond DANS {b} L={lum(b):5.1f}')
    return a,b
c=op(C19)
print('  CAP1920 — panneau x 33..1046 px')
for y in (1140,1230,1300,1380,1450,1520,1570):
    paire(c,y,5,28,40,70,CAP_S,'gauche')
print()
for y in (1140,1230,1300,1380,1450,1520,1570):
    paire(c,y,1052,1075,1010,1040,CAP_S,'droite')
print()
r=op(REF)
print('  REF — panneau x 39..1140 px')
for y in (1300,1400,1500,1620,1700,1760):
    paire(r,y,8,34,46,80,REF_S,'gauche')
