# -*- coding: utf-8 -*-
"""ORACLE DE FORME v2 — decoupes corrigees (v1 avait deux decoupes fausses : desaccord ~0,7 pour
TOUTES les fontes, signature d'une decoupe qui ne contient pas la chaine, pas d'un signal de fonte).
Meme principe : gabarit binarise, etire sur la bbox de l'encre -> la chasse est neutralisee, la FORME reste.
CONTROLES POSITIFS (5, police DECLAREE par la CSS de ecrans-brennar-6.html) : 3 serif, 2 sans.
L'instrument n'est recevable que si les 5 sont elus correctement."""
from PIL import Image, ImageDraw, ImageFont
D="/usr/share/fonts/truetype/dejavu/"
FONTS={"SerifBold":D+"DejaVuSerif-Bold.ttf","SansBold":D+"DejaVuSans-Bold.ttf",
       "SerifBook":D+"DejaVuSerif.ttf","SansBook":D+"DejaVuSans.ttf",
       "SansItal":D+"DejaVuSans-Oblique.ttf","SerifItal":D+"DejaVuSerif-Italic.ttf",
       "SansBoldItal":D+"DejaVuSans-BoldOblique.ttf","SerifBoldItal":D+"DejaVuSerif-BoldItalic.ttf"}
N=(400,140)
def masque_image(path,xa,xb,ya,yb,fond,seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load()
    m=Image.new("1",(xb-xa+1,yb-ya+1),0); mp=m.load()
    for y in range(ya,yb+1):
        for x in range(xa,xb+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: mp[x-xa,y-ya]=1
    bb=m.getbbox()
    return m.crop(bb).resize(N,Image.NEAREST) if bb else None
GAB={}
def masque_fonte(k,s,taille=180):
    if (k,s) in GAB: return GAB[(k,s)]
    f=ImageFont.truetype(FONTS[k],taille)
    im=Image.new("L",(int(taille*len(s)*1.5)+600,int(taille*3)),0)
    ImageDraw.Draw(im).text((200,200),s,fill=255,font=f)
    bb=im.getbbox(); im=im.crop(bb)
    GAB[(k,s)]=im.point(lambda v:255 if v>110 else 0).convert("1").resize(N,Image.NEAREST)
    return GAB[(k,s)]
def des(a,b):
    ap=a.load(); bp=b.load(); x=0; u=0
    for y in range(N[1]):
        for i in range(N[0]):
            p=ap[i,y]!=0; q=bp[i,y]!=0
            if p or q: u+=1
            if p!=q: x+=1
    return x/u if u else 1.0
REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
print("OUVERT",REF,Image.open(REF).size,"|",CAP,Image.open(CAP).size)
PAPR=(239,231,214);PAPC=(234,224,200);ENT=(30,27,22);NOIR=(13,13,13);BAS=(20,26,33);GESTE=(36,28,17);OR=(217,171,77)
CAS=[
 ("CTRL+","REF titre 'Commander'      [CSS 700 DejaVu Serif]","Commander",REF,51,353,477,522,ENT,"SerifBold"),
 ("CTRL+","REF bon  'Pyralin'         [CSS 700 DejaVu Serif]","Pyralin",REF,91,232,683,720,PAPR,"SerifBold"),
 ("CTRL+","REF cit. 'vide.'           [CSS ital DejaVu Serif]","vide.",REF,474,545,1823,1862,BAS,"SerifItal"),
 ("CTRL+","REF s-titre 'fournisseur,' [CSS 400 DejaVu Sans]","fournisseur,",REF,515,661,540,572,ENT,"SansBook"),
 ("CTRL+","REF bon  'pour le brindle' [CSS 700 DejaVu Sans]","pour le brindle",REF,741,989,764,802,PAPR,"SansBold"),
 ("MES  ","CAP titre 'Commander'","Commander",CAP,60,496,288,348,NOIR,None),
 ("MES  ","CAP bon  'Pyralin'","Pyralin",CAP,105,308,648,708,PAPC,None),
 ("MES  ","CAP cit. 'vide.'","vide.",CAP,473,546,1269,1312,NOIR,None),
 ("MES  ","CAP s-titre 'fournisseur,'","fournisseur,",CAP,755,975,478,522,NOIR,None),
 ("MES  ","CAP bon  'pour le brindle'","pour le brindle",CAP,698,977,731,776,PAPC,None),
 ("MES  ","REF libelle 'PRIX'","PRIX",REF,136,196,903,935,PAPR,None),
 ("MES  ","CAP libelle 'PRIX'","PRIX",CAP,147,205,886,925,PAPC,None),
 ("MES  ","REF CTA 'COMMANDER'","COMMANDER",REF,165,438,1968,2010,GESTE,None),
 ("MES  ","CAP CTA 'COMMANDER'","COMMANDER",CAP,189,493,1418,1468,OR,None),
]
ok=True
for tag,nom,s,path,xa,xb,ya,yb,fond,att in CAS:
    m=masque_image(path,xa,xb,ya,yb,fond)
    sc=sorted((des(m,masque_fonte(k,s)),k) for k in FONTS)
    v=sc[0][1]; marge=(sc[1][0]-sc[0][0])/sc[0][0]*100
    fam = "SERIF" if v.startswith("Serif") else "SANS"
    verdict=""
    if att:
        good = (v==att)
        if not good: ok=False
        verdict = "  OK" if good else "  *** ECHEC (attendu %s) ***"%att
    print("%s %-45s -> %-13s [%s]  desaccord=%.3f  2e=%s %.3f  marge=%3.0f%%%s"
          %(tag,nom,v,fam,sc[0][0],sc[1][1],sc[1][0],marge,verdict))
print("\nINSTRUMENT RECEVABLE (5/5 controles) :", ok)
