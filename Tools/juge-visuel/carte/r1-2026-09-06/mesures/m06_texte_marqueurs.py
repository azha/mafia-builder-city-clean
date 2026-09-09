# m06 : encre des 18 marqueurs de nom -- bbox, hauteur de capitale, couleur, contraste.
# REF : texte grave sur la carte, encre creme (198,189,166) -> seuil L>=140 & desature.
# CAP : texte blanc dans la plaque grise -> seuil L>=190 a l'interieur du rect de plaque.
# Repere ref->cap : X = 1.0225*x - 12 ; Y = 1.0225*y + 8   (m04)
# Controle positif : la position des centroides doit coincider a quelques px pres.
from PIL import Image
import statistics
S,DX,DY = 1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB')
cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert reference-1080x2102.png -> {ref.size} ; capture-1080x2400.png -> {cap.size}")
rp,cp=ref.load(),cap.load()
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rl(p):  # luminance relative WCAG
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def contraste(a,b):
    la,lb=rl(a),rl(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)

plaques=[(835,462,1011,495),(462,479,638,512),(78,483,254,516),(853,682,1029,714),
(492,703,668,736),(91,709,267,742),(841,940,1017,973),(94,943,270,975),(484,945,660,978),
(76,1402,252,1435),(839,1406,1015,1440),(463,1421,639,1454),(829,1666,1005,1699),
(63,1680,240,1713),(441,1687,617,1720),(816,1943,993,1975),(75,1955,251,1992),(440,1960,616,1993)]
noms=['SARNES','QUAI-NORD','LES BASSINS','VERRIER','HAUTES-MARCHES','LA COLONNE','DEPOT-EST',
'SAINT-BRAND','LES ENTREPOTS','LE TREILLIS','LE VERRE','MARNE-BASSE','LA LISIERE','ORSEL',
'PLACE DES COMPTES','PONT-GRIS','LA CHANCELLERIE','LES FRICHES']

def bbox(px,x0,y0,x1,y1,pred):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): xs.append(x); ys.append(y)
    if not xs: return None
    return (min(xs),min(ys),max(xs),max(ys),len(xs))

encre_cap = lambda p: L(p)>=190 and max(p)-min(p)<40
encre_ref = lambda p: L(p)>=140 and max(p)-min(p)<55 and p[2]<p[0]

print(f"\n{'nom':18s} | {'CAP bbox encre':>26} {'l':>4} {'capH':>5} | {'REF bbox encre':>26} {'l':>4} {'capH':>5} | l cap/ref  capH cap/ref")
tot=[]
for (X0,Y0,X1,Y1),nom in zip(plaques,noms):
    bc=bbox(cp,X0+3,Y0+3,X1-2,Y1-2,encre_cap)
    # fenetre ref : image inverse du rect de plaque, elargie (le texte ref est plus long)
    rx0=int((X0+12)/S)-70; rx1=int((X1+12)/S)+70
    ry0=int((Y0-8)/S)-22;  ry1=int((Y1-8)/S)+22
    rx0=max(0,rx0); rx1=min(1080,rx1); ry0=max(0,ry0); ry1=min(2102,ry1)
    br=bbox(rp,rx0,ry0,rx1,ry1,encre_ref)
    if bc and br:
        lc=bc[2]-bc[0]+1; hc=bc[3]-bc[1]+1
        lr=br[2]-br[0]+1; hr=br[3]-br[1]+1
        tot.append((lc/lr,hc/hr))
        print(f"{nom:18s} | ({bc[0]:4d},{bc[1]:4d},{bc[2]:4d},{bc[3]:4d}) {lc:4d} {hc:5d} | ({br[0]:4d},{br[1]:4d},{br[2]:4d},{br[3]:4d}) {lr:4d} {hr:5d} | {lc/lr:8.2f} {hc/hr:10.2f}")
    else:
        print(f"{nom:18s} | {bc} | {br}")
print(f"\nmediane rapport largeur d'encre cap/ref : {statistics.median([t[0] for t in tot]):.3f}  (n={len(tot)})")
print(f"mediane rapport hauteur d'encre cap/ref : {statistics.median([t[1] for t in tot]):.3f}")
print("\n-- couleurs --")
print("  REF encre (pic mesure) (198,189,166) sur fond carte ; CAP plaque (140,140,148)")
fondref=[rp[x,y] for y in range(500,512) for x in range(300,340)]
med=tuple(int(statistics.median([q[k] for q in fondref])) for k in range(3))
print(f"  fond carte REF pres de LES BASSINS = {med}   contraste encre/fond = {contraste((198,189,166),med):.2f}:1")
# encre capture : mediane des pixels encre d'une plaque
enc=[cp[x,y] for y in range(486,514) for x in range(81,252) if encre_cap(cp[x,y])]
mede=tuple(int(statistics.median([q[k] for q in enc])) for k in range(3))
print(f"  encre CAP mediane = {mede} sur plaque (140,140,148) -> contraste = {contraste(mede,(140,140,148)):.2f}:1")
fondcap=[cp[x,y] for y in range(486,514) for x in range(300,340)]
medc=tuple(int(statistics.median([q[k] for q in fondcap])) for k in range(3))
print(f"  fond carte CAP au meme endroit = {medc} -> contraste plaque/fond = {contraste((140,140,148),medc):.2f}:1")
