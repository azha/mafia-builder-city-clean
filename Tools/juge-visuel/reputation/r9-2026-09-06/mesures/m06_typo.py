# -*- coding: utf-8 -*-
"""m06 — typographie : sur des chaînes IDENTIQUES des deux cotes, hauteur de capitale
(hauteur d'encre d'une bande sans jambage) et LARGEUR d'encre (chasse totale).
Instrument : masque d'encre = pixel dont la distance au fond local depasse un seuil.
Contrôle positif : le filet or de l'enseigne (2 CSS = 7,2 px) mesure 7 px en REF (m01)
  et la largeur de .prt (118 CSS) mesure 424/425 px des deux cotes (m02).
Contrôle négatif : une fenetre prise dans un aplat vide doit rendre 0 encre.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d   CAP %dx%d'%(R.size+C.size))

def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def encre(im, box, seuil):
    """box=(x0,y0,x1,y1). Rend (ymin,ymax,xmin,xmax,n) de l'encre (lum >= seuil)."""
    px=im.load(); x0,y0,x1,y1=box
    ys=[];xs=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])>=seuil:
                ys.append(y);xs.append(x);n+=1
    if not n: return None
    return (min(ys),max(ys),min(xs),max(xs),n)

def cmp(nom, boxR, boxC, sR, sC):
    a=encre(R,boxR,sR); b=encre(C,boxC,sC)
    if a is None or b is None:
        print('%-34s  REF=%s  CAP=%s'%(nom,a,b)); return
    hR=a[1]-a[0]+1; hC=b[1]-b[0]+1
    wR=a[3]-a[2]+1; wC=b[3]-b[2]+1
    print('%-34s  h: REF %3d px (%5.2f CSS)  CAP %3d px (%5.2f CSS)  d=%+d px (%+.1f%%)   |  w: REF %4d  CAP %4d  d=%+d (%+.1f%%)'
          %(nom,hR,hR/3.6,hC,hC/3.6,hC-hR,100*(hC-hR)/hR,wR,wC,wC-wR,100*(wC-wR)/wR))

# --- contrôle négatif : aplat vide (fond du panneau .elast, sous les tuiles)
print('contrôle négatif (aplat vide) REF:',encre(R,(600,1470,900,1500),120),' CAP:',encre(C,(600,1200,900,1240),120))
print()
# titre "Le miroir" (or vif sur fond sombre)
cmp('enseigne b "Le miroir"', (200,470,900,560), (200,268,900,358), 110,110)
# sous-titre
cmp('enseigne i (sous-titre, 1re ligne)', (120,590,960,620), (150,380,940,410), 80,80)
# compteur 1 : "00"
cmp('fen b "00" (compteur 1)',(120,672,300,730),(120,470,290,530), 110,110)
# label compteur 1
cmp('fen span "REGLES DONNEES"',(80,770,340,800),(60,560,300,600), 70,70)
cmp('fen span "ABSORBEES"',(470,770,650,800),(400,560,600,600), 70,70)
cmp('fen span "ENFREINTES"',(790,770,970,800),(700,560,900,600), 70,70)
