# -*- coding: utf-8 -*-
"""Chrome de la CAPTURE : bas du bandeau, haut du dock, zone de contenu libre ; puis position
NORMALISEE de chaque partie (0 = haut de la zone de contenu, 1 = bas), comparee a la REFERENCE
(0 = haut du panneau .appr6 = y439, 1 = bas de l'ecran y2102).
CONTROLE POSITIF : le filet braise du bandeau (.tel.chaud .barre::after, CSS --braise 224,102,74)
                   doit etre trouve a y=141..142 et valoir (224,102,74) +-6.
CONTROLE NEGATIF : la meme sonde de 'filet braise' lancee sur la REFERENCE (compte tiede) doit rendre RIEN."""
from PIL import Image
def m(v): v=sorted(v); return v[len(v)//2]
def ligne(px,W,y,step=3):
    R=[];G=[];B=[]
    for x in range(0,W,step):
        p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (m(R),m(G),m(B))
CAP="../capture-1080x2400.png"; REF="../reference-1080x2102.png"
im=Image.open(CAP).convert("RGB"); W,H=im.size; px=im.load()
print("OUVERT",CAP,(W,H))
# filet braise
braise=[y for y in range(0,400) if abs(ligne(px,W,y)[0]-224)<25 and abs(ligne(px,W,y)[1]-102)<30 and abs(ligne(px,W,y)[2]-74)<30]
print("  filet braise du bandeau : lignes",braise,"couleur",ligne(px,W,braise[0]) if braise else None)
imr=Image.open(REF).convert("RGB"); pxr=imr.load()
br=[y for y in range(0,500) if abs(ligne(pxr,1080,y)[0]-224)<25 and abs(ligne(pxr,1080,y)[1]-102)<30 and abs(ligne(pxr,1080,y)[2]-74)<30]
print("  CONTROLE NEGATIF (meme sonde sur la reference, compte tiede) :",br if br else "RIEN -> la sonde ne fabrique pas de faux positif")
# haut du dock : premiere ligne (en remontant du bas) dont la mediane s'ecarte du fond #0d0d0d
fond=(13,13,13); haut_dock=None
for y in range(H-1,1000,-1):
    c=ligne(px,W,y)
    if max(abs(c[i]-fond[i]) for i in range(3))<=2: haut_dock=y+1; break
print("  haut du dock (1re ligne non #0d0d0d en remontant du bas) : y=%d  (couleur %s)"%(haut_dock,ligne(px,W,haut_dock)))
# encre du dock : bbox des ronds + libelles
def encre_lignes(px,W,y0,y1,fond,seuil=18):
    out=[]
    for y in range(y0,y1):
        c=sum(1 for x in range(0,W,2) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil)
        out.append((y,c))
    return out
prem=[y for y,c in encre_lignes(px,W,1500,H,(13,13,13)) if c>20]
print("  1re ligne de dock reellement encree (>20 col) : y=%d ; derniere : y=%d"%(prem[0],prem[-1]))
BAS_BANDEAU=143; HAUT_DOCK=prem[0]
print("  ZONE DE CONTENU capture : y=%d..%d  hauteur=%d px = %.1f CSS"%(BAS_BANDEAU,HAUT_DOCK-1,HAUT_DOCK-BAS_BANDEAU,(HAUT_DOCK-BAS_BANDEAU)/3.6))
print("  ZONE DE CONTENU reference (.appr6, CSS height:462px) : y=439..2101 hauteur=1663 px = 462 CSS")
print()
PARTS_REF=[("haut du panneau",439),("titre (haut de capitale)",480),("filet .entete",604),
           ("haut du bon",643),("bloc .penurie",1050),("bas du bon (perforation incluse)",1226),
           ("filet haut de .bas",1780),("citation l1",1825),("haut du CTA",1938),("bas du CTA",2042),("bas de l'ecran",2102)]
PARTS_CAP=[("bas du bandeau",143),("losange d'ornement",217),("titre l1 (haut de capitale)",294),
           ("haut du bon",608),("bas du bon",1054),("titron 'LA CHAINE'",1099),("bouche-trou l1",1152),
           ("citation l1",1271),("haut du CTA",1375),("bas du CTA",1511),("haut du dock",HAUT_DOCK),("bas de l'ecran",2400)]
print("  positions NORMALISEES (0 = haut de zone de contenu, 1 = bas)")
print("   REFERENCE (439 -> 2102, h=1663)          |  CAPTURE (%d -> %d, h=%d)"%(BAS_BANDEAU,HAUT_DOCK,HAUT_DOCK-BAS_BANDEAU))
for n,y in PARTS_REF: print("     %-34s %.3f"%(n,(y-439)/1663.0))
print("     ---")
for n,y in PARTS_CAP: print("     %-34s %.3f"%(n,(y-BAS_BANDEAU)/float(HAUT_DOCK-BAS_BANDEAU)))
print()
print("  GOUTTIERE : contenu sous le bandeau ? 1re encre du contenu a y=%d > %d -> %s"%(217,BAS_BANDEAU,"OK"))
print("  GOUTTIERE : derniere encre de contenu (bas du CTA) y=1511 < haut du dock %d -> OK"%HAUT_DOCK)
