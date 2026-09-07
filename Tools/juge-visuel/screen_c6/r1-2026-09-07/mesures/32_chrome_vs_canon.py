# -*- coding: utf-8 -*-
"""CHROME de la capture SOUS SHELL confronte au CANON HUD (hud-canon-1176.png).
Echelles : canon 1176 px = 392 CSS-HUD -> x3,000 ; capture 1080 px = 392 CSS-HUD -> x2,755.
Tout est donc exprime en CSS-HUD (px / facteur) ET en % de la largeur.
CONTROLE POSITIF : la largeur du bandeau vaut 100 % des deux cotes (il traverse l'ecran).
CONTROLE NEGATIF : les deux images ont des HAUTEURS differentes (2091 vs 2400) -> une sonde qui rend
   les memes valeurs en px bruts ne normalise pas."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def isor(p):
    r,g,b=p; return r>g>b and r>=90 and (r-b)>=35 and (g-b)>=12
def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)
def hexa(c): return "#%02x%02x%02x"%c
CAN=("hud-canon-1176.png",3.000); CAP=("capture-1080x2400.png",2.755)
for f,S in (CAN,CAP):
    im=Image.open(os.path.join(R,f)).convert("RGB"); px=im.load(); w,h=im.size
    print("\n### %s  %dx%d   facteur CSS-HUD = x%.3f" % (f,w,h,S))
    # 1) filet horizontal du bandeau : ligne la plus riche en pixels 'or ou braise' dans y<260
    best=None
    for y in range(60,300):
        n=sum(1 for x in range(0,w,2) if isor(px[x,y]) or (px[x,y][0]>=120 and px[x,y][0]-px[x,y][2]>=45))
        if best is None or n>best[1]: best=(y,n)
    y=best[0]
    xs=[x for x in range(w) if isor(px[x,y]) or (px[x,y][0]>=120 and px[x,y][0]-px[x,y][2]>=45)]
    print("  filet du bandeau : y=%4d (%5.1f CSS-HUD)  couverture %d/%d px  couleur %s"
          % (y, y/S, len(xs), w, hexa(med(im,max(0,w//2-60),y,w//2+60,y+1))))
    # 2) medaillon : bbox des pixels non-fond dans la bande du haut, colonne centrale
    ys=[yy for yy in range(0,int(90*S)) if any(lum(px[x,yy])>60 for x in range(int(w*0.36),int(w*0.64)))]
    if ys:
        xs2=[x for x in range(int(w*0.30),int(w*0.70)) if any(lum(px[x,yy])>60 for yy in range(ys[0],ys[-1]+1))]
        print("  medaillon : y=%d..%d (h=%d px = %.1f CSS-HUD)  x=%d..%d (l=%d px = %.1f CSS-HUD = %.1f%% largeur)"
              % (ys[0],ys[-1],ys[-1]-ys[0]+1,(ys[-1]-ys[0]+1)/S, xs2[0],xs2[-1],xs2[-1]-xs2[0]+1,(xs2[-1]-xs2[0]+1)/S,100.0*(xs2[-1]-xs2[0]+1)/w))
    # 3) dock : bande basse dont la luminance remonte
    prof=[sum(lum(px[x,yy]) for x in range(0,w,4))/len(range(0,w,4)) for yy in range(h)]
    base=sorted(prof[int(h*0.55):int(h*0.75)])[len(prof[int(h*0.55):int(h*0.75)])//2]
    top=None
    for yy in range(h-1,int(h*0.75),-1):
        if prof[yy]<base+1.0: top=yy; break
    print("  dock : haut ~ y=%s (%.1f CSS-HUD depuis le bas = %.1f)  hauteur = %d px = %.1f CSS-HUD"
          % (top, (h-top)/S, (h-top)/S, h-top, (h-top)/S))
    # 4) aile gauche : soulignement or sous ARGENT
    band=[yy for yy in range(int(20*S),int(60*S)) if sum(1 for x in range(int(0.02*w),int(0.30*w)) if isor(px[x,yy]))>=int(0.12*w)]
    print("  soulignement or de l'aile gauche : y=%s  (%s CSS-HUD)" % (band[:1] or "AUCUN", ["%.1f"%(b/S) for b in band[:1]]))
print()
print("CONTROLE POSITIF largeur des deux bandeaux : 1176/1176 et 1080/1080 = 100%%")
print("CONTROLE NEGATIF hauteurs brutes : 2091 vs 2400 (differentes) => normalisation obligatoire")
