# m12 - sondes couleur nommees. Mediane d'une fenetre 5x5, a >=3px de tout bord.
# Controle positif attendu : peau, fond de carte, or du CTA.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
REF=(D+"reference/m-120.png",18,376,3.0)
CAP=(S+"screen_b3_reputation_1080x1920.png",18,18,3.6)
# sondes en px CSS relatives au coin haut-gauche du cadre : (nom, x, y)
SONDES=[
 ("fond cadre (hors panneau)",           4,   64),
 ("plaque titre - fond",                 20,  20),
 ("plaque titre - bordure gauche",       8.7, 30),
 ("trait dore sous le titre",            150, 59.3),
 ("tuile1 bordure gauche",               8.7, 95),
 ("tuile1 fond",                         20,  95),
 ("tuile2 bordure gauche",               102.4,95),
 ("tuile2 fond",                         115, 95),
 ("tuile3 bordure gauche",               196, 95),
 ("tuile3 fond",                         210, 95),
 ("panneau portrait - fond",             150, 290),
 ("carte portrait - bordure gauche",     17.6,200),
 ("panneau verdict - fond",              150, 340),
 ("CTA - bordure haute",                 150, 417.5),
 ("CTA - fond",                          150, 430),
]
def med5(px,x,y):
    v=[px[x+dx,y+dy] for dx in range(-2,3) for dy in range(-2,3)]
    return tuple(sorted(c[i] for c in v)[12] for i in range(3))
out={}
for k,(f,ox,oy,sc) in (("REF",REF),("CAP",CAP)):
    im=Image.open(f).convert("RGB"); print(f"{k}: {f.split('/')[-1]} size={im.size}")
    px=im.load(); out[k]={}
    for n,cx,cy in SONDES:
        out[k][n]=med5(px,int(round(ox+cx*sc)),int(round(oy+cy*sc)))
print(f"{'sonde':38s} {'REF':>16s} {'CAP':>16s}   delta/canal")
for n,_,_ in SONDES:
    a,b=out["REF"][n],out["CAP"][n]
    d=tuple(b[i]-a[i] for i in range(3))
    flag="  <-- HORS TOLERANCE (>6/255)" if max(abs(x) for x in d)>6 else ""
    print(f"{n:38s} {str(a):>16s} {str(b):>16s}  {str(d):>16s}{flag}")
