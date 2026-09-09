# m25 : bandes de lignes de texte (profil de rangees) dans 2 zones, puis capitale du 1er glyphe.
import sys; sys.path.insert(0,'.')
from lib import *
def bandes(nom,ya,yb,xa,xb,seuil):
    im=Image.open(DOSSIER+'/'+nom).convert('RGB'); px=im.load()
    ys=[y for y in range(ya,yb) if sum(1 for x in range(xa,xb) if lum(px[x,y])>seuil)>=2]
    g=[]
    for y in ys:
        if g and y-g[-1][-1]<=2: g[-1].append(y)
        else: g.append([y])
    return px,[(a[0],a[-1]) for a in g]
def cap1(px,ya,yb,xa,xb,seuil,idx=0):
    cols=[x for x in range(xa,xb) if any(lum(px[x,y])>seuil for y in range(ya,yb+1))]
    g=[]
    for x in cols:
        if g and x-g[-1][-1]<=2: g[-1].append(x)
        else: g.append([x])
    if idx>=len(g): return None
    gg=g[idx]
    ys=[y for y in range(ya,yb+1) if any(lum(px[x,y])>seuil for x in gg)]
    return max(ys)-min(ys)+1, gg[0],gg[-1]

print("== 'Pas encore jugeable' (colonne de droite du panneau) ==")
for nom,ya,yb,xa,xb in [('reference-1080x2102.png',870,960,530,760),('capture-1080x2400.png',895,975,530,760),('capture-1080x1920.png',663,743,530,760)]:
    px,b=bandes(nom,ya,yb,xa,xb,110)
    print("   %-28s bandes=%s" % (nom[:24],b))
    for (a,c) in b[:2]:
        print("        ligne y=%d..%d  hauteur=%d ; 1er glyphe : %s" % (a,c,c-a+1, cap1(px,a,c,xa,xb,110)))

print("\n== aparte 'ce qu'il a absorbe de vos regles' ==")
for nom,ya,yb,xa,xb in [('reference-1080x2102.png',870,960,790,1000),('capture-1080x2400.png',920,990,790,1035),('capture-1080x1920.png',688,758,790,1035)]:
    px,b=bandes(nom,ya,yb,xa,xb,70)
    print("   %-28s bandes=%s" % (nom[:24],b))

print("\n== tuile 1 : titre 'col ouvert' + sous-libelle ==")
for nom,ya,yb,xa,xb in [('reference-1080x2102.png',1010,1090,600,1000),('capture-1080x2400.png',1015,1085,600,1000),('capture-1080x1920.png',783,853,600,1000)]:
    px,b=bandes(nom,ya,yb,xa,xb,90)
    print("   %-28s bandes=%s" % (nom[:24],b))
    for (a,c) in b[:2]:
        print("        ligne y=%d..%d  hauteur=%d ; 1er glyphe : %s" % (a,c,c-a+1, cap1(px,a,c,xa,xb,90)))
