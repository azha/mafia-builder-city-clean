# -*- coding: utf-8 -*-
"""11 — (a) LE REFLET (.elast::after), sondé sur des colonnes d'APLAT (marge du cadre .prt et
gouttière entre .prt et les tuiles) ; (b) le BORD de l'enseigne, profil vertical.
Contrôle positif (a) : la position ASSUMÉE du reflet est 34,7 % d'une course -6 -> 190 px CSS,
soit 62,0 px CSS sous le haut de .elast.
Contrôle négatif (a) : la même sonde 40 px CSS plus bas doit ne RIEN trouver."""
from PIL import Image
def lum(p): return round(.2126*p[0]+.7152*p[1]+.0722*p[2],1)
R=Image.open('/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png').convert('RGB')
C=Image.open('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png').convert('RGB')
print('m-120.png',R.size,'| screen_b3_reputation_1080x1920.png',C.size)
print('\n(a) REFLET')
for nom,im,eh,eb,sc,cols in (('REF',R,708,1341,3.0,[85,440,860]),('CAP',C,410,1367,3.6,[90,515,1030])):
    px=im.load()
    for x in cols:
        base=lum(px[x,eh+int(100*sc)])
        ys=[y for y in range(eh+4,eh+int(110*sc)) if lum(px[x,y])-base>2]
        if not ys: print('   %s x=%-5d fond=%-6s : RIEN'%(nom,x,base)); continue
        print('   %s x=%-5d fond=%-6s : y=%d..%d | haut a %.1f CSS sous .elast | ep %.1f CSS | lum max %.1f | couleur %s'
              %(nom,x,base,min(ys),max(ys),(min(ys)-eh)/sc,(max(ys)-min(ys)+1)/sc,
                max(lum(px[x,y]) for y in ys), px[x,(min(ys)+max(ys))//2]))
    # controle negatif : 40 CSS plus bas
    x=cols[0]; base=lum(px[x,eh+int(100*sc)])
    zz=[y for y in range(eh+int(100*sc),eh+int(140*sc)) if lum(px[x,y])-base>2]
    print('   %s controle negatif (100..140 CSS sous .elast, x=%d) : %d px au-dessus du fond'%(nom,x,len(zz)))
print('\n(b) BORD DE L ENSEIGNE — profil vertical au bord gauche du bloc (x=60)')
for nom,im,y0,y1 in (('REF',R,394,410),('CAP',C,42,58)):
    px=im.load(); print('   %s :'%nom, [(y,px[60,y]) for y in range(y0,y1)])
print('   bord GAUCHE de l enseigne (profil horizontal) :')
for nom,im,y,x0,x1 in (('REF',R,470,36,52),('CAP',C,120,40,58)):
    px=im.load(); print('   %s y=%d :'%(nom,y), [(x,px[x,y]) for x in range(x0,x1)])
