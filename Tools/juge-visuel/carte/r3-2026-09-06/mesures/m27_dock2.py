# m27 - dock, suite : geometrie des pastilles par coupe horizontale, libelles isoles du souligne.
from PIL import Image
import statistics
CAN=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
CAP=Image.open('../capture-1080x2400.png').convert('RGB')
KC=CAN.size[0]/392.; KP=CAP.size[0]/392.
def Lum(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
print('canon',CAN.size,'capture',CAP.size)
print('\n--- coupe horizontale au niveau du centre des pastilles : segments clairs (anneaux) ---')
def coupe(im,K,y,lab,seuil=10):
    px=im.load(); W,H=im.size
    base=statistics.median([Lum(px[x,y]) for x in range(0,W,7)])
    hits=[x for x in range(W) if Lum(px[x,y])>base+seuil]
    if not hits: print(f'  {lab} y={y} rien (base {base:.0f})'); return
    seg=[];s=hits[0];p=hits[0]
    for x in hits[1:]:
        if x<=p+3: p=x
        else: seg.append((s,p)); s=x; p=x
    seg.append((s,p))
    print(f'  {lab} y={y} ({y/K:.1f} CSS) base L={base:.0f} : '+' | '.join(f'{a/K:.1f}-{b/K:.1f}' for a,b in seg))
    return seg
# canon : centre des pastilles ~ y = 2091-250+90 = 1931
for y in (1920,1931,1945): coupe(CAN,KC,y,'canon  ')
for y in (2255,2265,2275): coupe(CAP,KP,y,'capture')
print('\n--- libelles du dock : bande de texte seule ---')
def texte(im,K,x0,x1,y0,y1,lab):
    px=im.load()
    pts=[(x,y,px[x,y]) for y in range(int(y0),int(y1)) for x in range(int(x0),int(x1)) if Lum(px[x,y])>105]
    if not pts: print('  ',lab,'rien'); return
    ys=sorted(set(p[1] for p in pts))
    # histogramme par ligne pour separer le souligne (une bande fine isolee) du texte
    h={}
    for p in pts: h[p[1]]=h.get(p[1],0)+1
    print(f'  {lab} lignes: '+' '.join(f'{y}:{h[y]}' for y in ys))
texte(CAN,KC,70*KC,135*KC,CAN.size[1]-90,CAN.size[1]-30,'canon   EMPIRE')
texte(CAP,KP,70*KP,135*KP,2290,2350,'capture EMPIRE')
