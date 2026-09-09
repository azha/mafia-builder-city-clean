# m17 — bas des deux images : la reference est-elle coupee ? le dock de la capture.
from PIL import Image
ref=Image.open('../reference-1080x2102.png').convert('RGB'); pr=ref.load()
cap=Image.open('../capture-1080x2400.png').convert('RGB'); pc=cap.load()
print('OUVERT reference',ref.size,' capture',cap.size)
print('--- REFERENCE : 4 rangees du pave (m6b) ---')
for i,(a,b) in enumerate([(1708,1784),(1809,1885),(1910,1986),(2011,2101)],1):
    print('   rangee %d : y %4d..%4d  h=%3d'%(i,a,b,b-a+1))
print('   pas entre rangees : %d, %d, %d px'%(1809-1708,1910-1809,2011-1910))
print('   => la 4e rangee devrait finir a 2011+76=2087 ; l image finit a 2101.')
# la touche du bas est-elle complete ? on regarde le fond sous y=2088
def med(im,x0,y0,x1,y1):
    p=list(im.crop((x0,y0,x1,y1)).getdata()); n=len(p)
    return tuple(sorted(q[c] for q in p)[n//2] for c in range(3))
for y in [2080,2085,2088,2092,2096,2100,2101]:
    print('   ref y=%4d med(x150..300)=%s'%(y,med(ref,150,y,300,y+1)))
print()
print('--- CAPTURE : dock (haut mesure a y=2179 en m2) ---')
FOND=(13,13,13)
def ink(p,t=8): return max(abs(p[i]-FOND[i]) for i in range(3))>t
cols=[x for x in range(cap.width) if any(ink(pc[x,y]) for y in range(2180,2400))]
print('   encre du dock : x %d..%d'%(min(cols),max(cols)))
rows=[y for y in range(2150,2400) if sum(1 for x in range(cap.width) if ink(pc[x,y]))>5]
print('   encre du dock : y %d..%d  (hauteur %d px)'%(min(rows),max(rows),max(rows)-min(rows)+1))
print('   => rect libre du contenu = y 143..%d, hauteur %d px'%(min(rows)-1,min(rows)-143))
