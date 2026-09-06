# m19 : deplacement du nom entre maquette et jeu. Centroide de l'ENCRE des deux cotes,
# la reference reportee par X=1.0225x-12 ; Y=1.0225y+8. Tolerance du mandat : 2 px
# ou 1,5 % du parent (1080 -> 16 px).
from PIL import Image
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()
creme=lambda p: p[0]>150 and p[1]>135 and 18<=p[0]-p[2]<=70
blanc=lambda p: p[0]>190 and p[1]>190 and p[2]>190
def cen(px,x0,y0,x1,y1,pred):
    sx=sy=n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): sx+=x; sy+=y; n+=1
    return (sx/n,sy/n,n) if n else None
cas=[('LES BASSINS',(95,440,275,500),(80,485,252,515)),
     ('QUAI-NORD',(400,440,640,500),(464,481,636,510)),
     ('HAUTES-MARCHES',(430,668,725,712),(494,705,666,734)),
     ('SAINT-BRAND',(78,902,300,945),(96,945,268,973)),
     ('DEPOT-EST',(830,895,1006,945),(843,942,1015,971)),
     ('MARNE-BASSE',(435,1378,662,1404),(465,1423,637,1452)),
     ('LES FRICHES',(390,1895,630,1935),(442,1962,614,1991))]
print(f"\n{'nom':16s} {'centre REF (repere cap)':>26} {'centre CAP':>18}  {'dx':>7} {'dy':>7}")
for nom,(a,b,c,d),(e,f,g,h) in cas:
    r=cen(rp,a,b,c,d,creme); k=cen(cp,e,f,g,h,blanc)
    if r and k:
        RX,RY=S*r[0]+DX, S*r[1]+DY
        print(f"{nom:16s} {RX:12.1f},{RY:12.1f} {k[0]:8.1f},{k[1]:8.1f}  {k[0]-RX:+7.1f} {k[1]-RY:+7.1f}")
    else: print(f"{nom:16s} REF={r} CAP={k}")
