# -*- coding: utf-8 -*-
"""ORACLE DE FORME : gabarit de la MEME chaine rendue par chaque fonte DejaVu, binarise, etire
sur la bbox de l'encre reelle, puis desaccord pixel a pixel (XOR / union). La chasse est neutralisee
par l'etirement : ce qui reste est la FORME (empattements ou non).
CONTROLE POSITIF : sur la REFERENCE, 'Pyralin' (CSS: 700 'DejaVu Serif') DOIT elire DejaVuSerif-Bold
                   et 'pour le brindle' (CSS: 700 'DejaVu Sans') DOIT elire DejaVuSans-Bold.
Si l'un des deux echoue, l'instrument est NON RECEVABLE et rien n'est conclu."""
from PIL import Image, ImageDraw, ImageFont
D="/usr/share/fonts/truetype/dejavu/"
FONTS={"SerifBold":D+"DejaVuSerif-Bold.ttf","SansBold":D+"DejaVuSans-Bold.ttf",
       "SerifBook":D+"DejaVuSerif.ttf","SansBook":D+"DejaVuSans.ttf",
       "SansItal":D+"DejaVuSans-Oblique.ttf","SerifItal":D+"DejaVuSerif-Italic.ttf",
       "SansBoldItal":D+"DejaVuSans-BoldOblique.ttf"}
N=(360,120)

def masque_image(path,xa,xb,ya,yb,fond,seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load()
    m=Image.new("1",(xb-xa+1,yb-ya+1),0); mp=m.load()
    for y in range(ya,yb+1):
        for x in range(xa,xb+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: mp[x-xa,y-ya]=1
    bb=m.getbbox()
    return m.crop(bb).resize(N,Image.NEAREST) if bb else None

def masque_fonte(fpath,s,taille=180):
    f=ImageFont.truetype(fpath,taille)
    im=Image.new("L",(int(taille*len(s)*1.4)+600,int(taille*3)),0)
    ImageDraw.Draw(im).text((200,200),s,fill=255,font=f)
    bb=im.getbbox(); im=im.crop(bb)
    return im.point(lambda v:255 if v>110 else 0).convert("1").resize(N,Image.NEAREST)

def desaccord(a,b):
    ap=a.load(); bp=b.load(); xor=0; uni=0
    for y in range(N[1]):
        for x in range(N[0]):
            u=ap[x,y]!=0; v=bp[x,y]!=0
            if u or v: uni+=1
            if u!=v: xor+=1
    return xor/uni if uni else 1.0

REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
print("OUVERT",REF,Image.open(REF).size,"|",CAP,Image.open(CAP).size)
CAS=[
 ("CTRL+ REF 'Pyralin'        (CSS 700 DejaVu Serif)","Pyralin",       REF, 91,232, 683,718,(239,231,214),"SerifBold"),
 ("CTRL+ REF 'pour le brindle'(CSS 700 DejaVu Sans )","pour le brindle",REF,741,989, 766,800,(239,231,214),"SansBold"),
 ("CTRL+ REF 'Commander'      (CSS 700 DejaVu Serif)","Commander",     REF, 51,353, 477,520,(30,27,22),"SerifBold"),
 ("CTRL+ REF 'Sans elle,'     (CSS 400 DejaVu Sans )","Sans",          REF, 51,132, 543,564,(30,27,22),"SansBook"),
 ("MES   CAP 'Pyralin'",                              "Pyralin",       CAP,105,308, 650,705,(234,224,200),None),
 ("MES   CAP 'pour le brindle'",                      "pour le brindle",CAP,846,977, 733,772,(234,224,200),None),
 ("MES   CAP 'Commander'",                            "Commander",     CAP, 60,496, 288,345,(13,13,13),None),
 ("MES   CAP 'Sans'",                                 "Sans",          CAP, 60,150, 480,520,(13,13,13),None),
]
gab={}
recevable=True
for nom,s,path,xa,xb,ya,yb,fond,att in CAS:
    m=masque_image(path,xa,xb,ya,yb,fond)
    if m is None: print(nom,"-> aucune encre"); continue
    sc=[]
    for k,p in FONTS.items():
        if (s,k) not in gab: gab[(s,k)]=masque_fonte(p,s)
        sc.append((desaccord(m,gab[(s,k)]),k))
    sc.sort()
    verdict=sc[0][1]
    marge=(sc[1][0]-sc[0][0])/sc[0][0]*100
    ok="" 
    if att:
        ok = "  OK" if verdict==att else "  *** ECHEC DU CONTROLE (attendu %s) ***"%att
        if verdict!=att: recevable=False
    print("%-52s -> %-12s (desaccord %.3f ; 2e = %s %.3f ; marge %.0f%%)%s"
          %(nom,verdict,sc[0][0],sc[1][1],sc[1][0],marge,ok))
    print("      classement : "+", ".join("%s=%.3f"%(k,v) for v,k in sc))
print()
print("INSTRUMENT RECEVABLE :", recevable)
