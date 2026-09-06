# m07 : HAUTEUR DE CAPITALE des marqueurs, mesuree en TRANCHES VERTICALES ETROITES
# (24 px) : sur un texte incline, une tranche etroite rend la hauteur du glyphe et
# non celle de la ligne inclinee. On garde la MEDIANE des tranches qui portent de l'encre.
# Controle positif : la meme methode appliquee au mot "LE THRENNY" (peint dans la TEXTURE,
# donc identique des deux cotes a l'echelle 1.0225 pres) doit rendre un rapport ~1.02.
from PIL import Image
import statistics
def Lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()

def hauteur(px,x0,y0,x1,y1,seuil,pas=24):
    hs=[]
    x=x0
    while x+pas<=x1:
        ys=[y for y in range(y0,y1) for xx in range(x,x+pas) if Lum(px[xx,y])>=seuil]
        if ys:
            ys=sorted(set(ys)); 
            # plus longue plage contigue
            best=(ys[0],ys[0]); cur=(ys[0],ys[0])
            for y in ys[1:]:
                if y-cur[1]<=2: cur=(cur[0],y)
                else:
                    if cur[1]-cur[0]>best[1]-best[0]: best=cur
                    cur=(y,y)
            if cur[1]-cur[0]>best[1]-best[0]: best=cur
            if best[1]-best[0]>=4: hs.append(best[1]-best[0]+1)
        x+=pas
    return hs

cas=[
 # nom,            ref (x0,y0,x1,y1,seuil),        cap (x0,y0,x1,y1,seuil)
 ('LES BASSINS',   (99,449,270,495,140),           (119,488,214,510,190)),
 ('QUAI-NORD',     (466,448,634,500,140),          (507,486,592,508,190)),
 ('LA COLONNE',    (86,680,283,708,140),           (132,716,227,738,190)),
 ('HAUTES-MARCHES',(433,674,720,705,140),          (512,710,649,732,190)),
 ('SAINT-BRAND',   (81,908,294,937,140),           (133,949,232,970,190)),
 ('LE TREILLIS',   (74,1362,265,1381,140),         (121,1409,207,1430,190)),
 ('MARNE-BASSE',   (437,1381,659,1400,140),        (499,1427,604,1448,190)),
 ('ORSEL',         (110,1635,204,1653,140),        (128,1686,175,1707,190)),
 ('PONT-GRIS',     (800,1898,1010,1930,140),       (865,1949,944,1970,190)),
]
print(f"\n{'nom':16s} {'ref tranches':>28} {'medH ref':>9} | {'cap tranches':>22} {'medH cap':>9} | cap/ref")
tot=[]
for nom,(rx0,ry0,rx1,ry1,rs),(cx0,cy0,cx1,cy1,cs) in cas:
    hr=hauteur(rp,rx0,ry0,rx1,ry1,rs); hc=hauteur(cp,cx0,cy0,cx1,cy1,cs)
    if hr and hc:
        mr,mc=statistics.median(hr),statistics.median(hc); tot.append(mc/mr)
        print(f"{nom:16s} {str(hr):>28} {mr:9.1f} | {str(hc):>22} {mc:9.1f} | {mc/mr:.3f}")
    else:
        print(f"{nom:16s} {hr} | {hc}")
print(f"\nMEDIANE du rapport de hauteur de capitale cap/ref : {statistics.median(tot):.3f}  (n={len(tot)})")

print("\n=== CONTROLE POSITIF : 'LE THRENNY', peint dans la texture (doit rendre ~1.02) ===")
hr=hauteur(rp,430,1122,700,1160,120); hc=hauteur(cp,430,1148,700,1190,120)
print(f"  ref tranches {hr} med {statistics.median(hr):.1f} | cap tranches {hc} med {statistics.median(hc):.1f} -> {statistics.median(hc)/statistics.median(hr):.3f}")
