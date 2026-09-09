# m23 : hauteurs de CAPITALE et epaisseur de trait des textes principaux.
# Controle positif : "Le miroir" (titre) doit sortir a la meme hauteur des deux cotes (r15 : 45/45).
# Controle negatif : le corps du paragraphe (petit) doit sortir NETTEMENT plus bas que le titre.
import sys; sys.path.insert(0,'.')
from lib import *

def cap(nom, x0,x1, y0,y1, seuil=90, etiq=''):
    im=Image.open(DOSSIER+'/'+nom).convert('RGB'); px=im.load()
    ys=[y for y in range(y0,y1) if any(lum(px[x,y])>seuil for x in range(x0,x1))]
    if not ys: return None
    xs=[x for x in range(x0,x1) if any(lum(px[x,y])>seuil for y in range(y0,y1))]
    return (max(ys)-min(ys)+1, min(ys),max(ys), min(xs),max(xs))

def trait(nom,x0,x1,y,seuil=None,etiq=''):
    """epaisseur du run median a mi-hauteur sur une rangee"""
    im=Image.open(DOSSIER+'/'+nom).convert('RGB'); px=im.load()
    row=[lum(px[x,y]) for x in range(x0,x1)]
    lo=mediane(row); hi=max(row); s=0.5*(lo+hi)
    runs=[];cur=0
    for v in row:
        if v>s: cur+=1
        elif cur: runs.append(cur); cur=0
    if cur: runs.append(cur)
    return (mediane(runs) if runs else None, len(runs))

print("== hauteurs de capitale ==")
# 'L' de "Le miroir" : ref x~325..360 y~490..545 ; 2400 x~285..320 y~455..510
T=[("titre 'Le miroir' (le L)", ('reference-1080x2102.png',322,362,485,555), ('capture-1080x2400.png',330,370,545,610), ('capture-1080x1920.png',330,370,312,378)),
   ("sous-titre 'UN LIEUTENANT' (le U)", ('reference-1080x2102.png',140,175,586,615), ('capture-1080x2400.png',134,170,620,650), ('capture-1080x1920.png',155,190,388,420)),
   ("titre bas 'Rien n'a...' (le R)", ('reference-1080x2102.png',88,130,1720,1775), ('capture-1080x2400.png',72,115,1650,1710), ('capture-1080x1920.png',82,126,1420,1480)),
   ("libelle CTA (le D)", ('reference-1080x2102.png',228,262,1985,2015), ('capture-1080x2400.png',196,232,1912,1945), None),
   ("compteur : libelle 'REGLES' (le R)", ('reference-1080x2102.png',85,115,780,805), ('capture-1080x2400.png',72,102,804,830), ('capture-1080x1920.png',80,112,570,598)),
   ("'Pas encore' (le P)", ('reference-1080x2102.png',536,575,878,925), ('capture-1080x2400.png',530,570,908,952), ('capture-1080x1920.png',534,574,676,720)),
   ("'Il vous ecoute' (le I)", ('reference-1080x2102.png',176,196,1428,1470), ('capture-1080x2400.png',172,192,1450,1495), ('capture-1080x1920.png',180,204,1218,1262)),
  ]
for lab,r,a,b in T:
    out=[]
    for tag,spec in (('ref',r),('2400',a),('1920',b)):
        if spec is None: out.append("%s=—"%tag); continue
        c=cap(*spec)
        out.append("%s=%s px (y%d..%d, x%d..%d)"%((tag,)+c) if c else "%s=rien"%tag)
    print("   %-38s %s" % (lab, " | ".join(out)))
