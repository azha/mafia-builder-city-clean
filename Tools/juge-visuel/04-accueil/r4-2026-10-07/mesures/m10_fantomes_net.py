# m10 — boutons fantomes, mesure propre : bords par scan de ligne/colonne depuis l'interieur connu.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def med(px,x0,y0,x1,y1):
    c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in c)
def bords(px,xc,yc,xmin,xmax,ymin,ymax):
    """depuis (xc,yc) a l'interieur, cherche le pic de luminance (le bord) dans les 4 directions"""
    def pic(pts):
        best=max(pts,key=lambda t:lum(px[t[0],t[1]]))
        return best
    g=pic([(x,yc) for x in range(xmin,xc)]);  d=pic([(x,yc) for x in range(xc,xmax)])
    h=pic([(xc,y) for y in range(ymin,yc)]);  b=pic([(xc,y) for y in range(yc,ymax)])
    return g[0],d[0],h[1],b[1]
CAS=[
 ('REF  VOIR LA VENTE', B+"r2-2026-10-07/reference/cadre-4-la-suite.png", 800,1204, 560,1060, 1100,1300, 500),
 ('REF  BLANCHIR',      B+"r2-2026-10-07/reference/cadre-4-la-suite.png", 870,1462, 650,1060, 1380,1540, 500),
 ('J1920 VOIR LA VENTE',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png", 850,1149, 640,1060, 1050,1240, 660),
 ('J1920 BLANCHIR',     B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png", 875,1344, 700,1060, 1250,1430, 700),
 ('J2400 VOIR LA VENTE',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png", 850,1556, 640,1060, 1460,1650, 660),
 ('J2400 BLANCHIR',     B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png", 875,1750, 700,1060, 1660,1840, 700),
]
for nom,ch,xc,yc,xmin,xmax,ymin,ymax,xfond in CAS:
    im=Image.open(ch).convert('RGB'); px=im.load()
    g,d,h,b=bords(px,xc,yc,xmin,xmax,ymin,ymax)
    print(f"\n--- {nom}  [{ch.split('/')[-1]} {im.size}]")
    print(f"   bbox bord=({g},{h})..({d},{b})  largeur={d-g+1} hauteur={b-h+1}")
    print(f"   bord G={px[g,yc]} D={px[d,yc]} H={px[xc,h]} B={px[xc,b]}")
    print(f"   interieur (coin haut-gauche, hors texte)={med(px,g+10,h+8,g+40,h+22)}")
    print(f"   fond du panneau a x={xfond} meme y          ={med(px,xfond-20,h+8,xfond+20,h+22)}")
    # rayon : retrait du bord gauche selon dy, bord = lum max local
    r=[]
    for dy in range(1,40):
        y=h+dy
        seg=[(x,lum(px[x,y])) for x in range(g-6,g+45)]
        xm=max(seg,key=lambda t:t[1])[0]
        r.append(xm-g)
    print(f"   retrait du bord gauche dy=1..20 : {r[:20]}")
