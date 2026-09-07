# -*- coding: utf-8 -*-
"""ORACLE DE POLICE : rend chaque chaine avec les fontes DejaVu presentes sur la machine
(fc-list les donne) et compare le rapport LARGEUR D'ENCRE / HAUTEUR DE CAPITALE a celui mesure
sur les deux images. Aucune fenetre, aucun navigateur : PIL.ImageFont seulement.
CONTROLE POSITIF : 'Pyralin' de la REFERENCE est declare 700 'DejaVu Serif' par la CSS
                   -> l'oracle DOIT elire DejaVuSerif-Bold.
CONTROLE NEGATIF : 'pour le brindle' de la REFERENCE est declare 700 'DejaVu Sans'
                   -> l'oracle DOIT elire DejaVuSans-Bold (et donc discriminer)."""
from PIL import Image, ImageDraw, ImageFont
D="/usr/share/fonts/truetype/dejavu/"
FONTS={
 "SerifBold":D+"DejaVuSerif-Bold.ttf",
 "SansBold" :D+"DejaVuSans-Bold.ttf",
 "SerifBook":D+"DejaVuSerif.ttf",
 "SansBook" :D+"DejaVuSans.ttf",
 "SansItal" :D+"DejaVuSans-Oblique.ttf",
 "SerifItal":D+"DejaVuSerif-Italic.ttf",
 "SansCondBold":D+"DejaVuSansCondensed-Bold.ttf",
}
def ratio(fpath, s, taille=200):
    f=ImageFont.truetype(fpath, taille)
    im=Image.new("L",(int(taille*len(s)*1.4)+400,int(taille*2.2)),0)
    d=ImageDraw.Draw(im); d.text((100,100),s,fill=255,font=f)
    bb=im.getbbox()
    if bb is None: return None
    larg=bb[2]-bb[0]
    # hauteur de capitale = bbox de 'H'
    im2=Image.new("L",(taille*3,taille*3),0)
    ImageDraw.Draw(im2).text((100,100),"H",fill=255,font=f)
    b2=im2.getbbox(); cap=b2[3]-b2[1]
    return larg/cap, larg, cap

CHAINES=[
 ("Pyralin",        142,27, 204,39, "REF declare DejaVu Serif Bold"),
 ("pour le brindle",117,None, 131,None, "REF declare DejaVu Sans Bold"),
 ("Commander",      303,33, 437,50, "REF declare DejaVu Serif Bold (titre h3)"),
 (u"matière",  192,33, 276,50, "REF declare DejaVu Serif Bold (titre h3)"),
 ("la",              44,33,  56,50, "REF declare DejaVu Serif Bold (titre h3)"),
 ("de",              56,33,  85,50, "REF declare DejaVu Serif Bold (titre h3)"),
]
print("ORACLE — rapport largeur d'encre / hauteur de capitale, par fonte")
print("%-12s | %s"%("chaine"," | ".join("%-10s"%k for k in FONTS)))
tab={}
for s,wr,cr,wc,cc,note in CHAINES:
    row=[]
    for k,p in FONTS.items():
        r=ratio(p,s); row.append(r[0]); tab[(s,k)]=r[0]
    print("%-12s | %s"%(s," | ".join("%-10.3f"%v for v in row)))
print()
print("MESURE sur les images (largeur d'encre / hauteur de capitale de la MEME chaine) :")
for s,wr,cr,wc,cc,note in CHAINES:
    if cr is None: continue
    mr=wr/cr; mc=wc/cc
    def elu(m):
        best=min(FONTS,key=lambda k:abs(tab[(s,k)]-m)); return best,abs(tab[(s,best)]-m)/m*100
    er,dr=elu(mr); ec,dc=elu(mc)
    print("  %-10s  REF %5.3f -> %-12s (ecart %4.1f%%)   |   CAP %5.3f -> %-12s (ecart %4.1f%%)   [%s]"
          %(s,mr,er,dr,mc,ec,dc,note))
