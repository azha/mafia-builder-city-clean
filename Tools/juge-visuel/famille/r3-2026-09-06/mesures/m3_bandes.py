# m3 — decoupage vertical : pour chaque ligne, nb de px differents du fond de feuille, dans la feuille.
# Repere : capture x 13..1065, y 232..2151, facteur 1053/560 ; reference 0..1119, 0..1849, facteur 2.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap = Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref = Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CAPX0,CAPX1,CAPY0,CAPY1 = 13,1065,232,2151
FC = 1053/560.0
FR = 2.0
FONDC=(22,22,28); FONDR=(22,25,27)

def profil(px,x0,x1,y0,y1,fond,seuil=6):
    out=[]
    for y in range(y0,y1+1):
        n=0
        for x in range(x0,x1+1):
            p=px[x,y]
            if max(abs(p[0]-fond[0]),abs(p[1]-fond[1]),abs(p[2]-fond[2]))>seuil: n+=1
        out.append(n)
    return out

pc=profil(c,CAPX0,CAPX1,CAPY0,CAPY1,FONDC)
pr=profil(r,0,1119,0,1849,FONDR)

def segments(p,y0,f,seuilN=3):
    segs=[];cur=None
    for i,n in enumerate(p):
        if n>seuilN:
            if cur is None: cur=i
        else:
            if cur is not None: segs.append((cur,i-1)); cur=None
    if cur is not None: segs.append((cur,len(p)-1))
    return [(a+y0,b+y0,round(a/f,2),round(b/f,2),b-a+1) for a,b in segs]

print("\n== CAPTURE : segments d'encre (y px abs, y CSS relatif au haut de feuille, hauteur px) ==")
for s in segments(pc,CAPY0,FC):
    print("  px %d..%d  CSS %.2f..%.2f  h=%d"%(s[0],s[1],(s[0]-CAPY0)/FC,(s[1]-CAPY0)/FC,s[4]))
print("\n== REFERENCE : segments d'encre ==")
for s in segments(pr,0,FR):
    print("  px %d..%d  CSS %.2f..%.2f  h=%d"%(s[0],s[1],s[0]/FR,s[1]/FR,s[4]))
