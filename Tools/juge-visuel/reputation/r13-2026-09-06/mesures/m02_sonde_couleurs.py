# m02 — sonde : couleurs des matieres du portrait (fond de carte, coiffe, contour, peau, torse)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from collections import Counter

def top(im, box, n=10):
    r = im.crop(box)
    c = Counter(r.getdata())
    tot = r.size[0]*r.size[1]
    return [(col, round(100*k/tot,2)) for col,k in c.most_common(n)]

ref = ouvrir('reference-1080x2102.png')
cap = ouvrir('capture-1080x2400.png')
print("REF carte portrait (x150..450, y960..1300) :")
for c,pc in top(ref,(150,960,450,1300)): print("   ",c,pc,"%")
print("CAP carte portrait (x140..440, y1000..1340) :")
for c,pc in top(cap,(140,1000,440,1340)): print("   ",c,pc,"%")
