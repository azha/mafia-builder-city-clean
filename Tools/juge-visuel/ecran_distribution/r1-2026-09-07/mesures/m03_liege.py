#!/usr/bin/env python3
# m03 — la MATIERE du liege : bords du panneau, cadre en bois (.cadre-b), texture
#       pointillee (radial-gradient 9px et 13px CSS = 32,4 et 46,8 px image),
#       degrade 158deg, ombre interne.
# Controle positif : sur la REFERENCE, le cadre-b (#4a3722) DOIT etre trouve
#       a inset 5 CSS = 18 px du bord du panneau, epaisseur 5 CSS = 18 px.
# Controle negatif : la meme sonde lancee sur une bande de FOND (#0d0d0d / #20180f)
#       ne doit trouver NI cadre NI texture (variance ~0).
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

def hexs(c): return "#%02x%02x%02x"%tuple(c)

def bords_h(im, y, seuil=25):
    """frontieres verticales le long de la ligne y"""
    px = im.load(); W,_ = im.size
    out=[]
    for x in range(1,W):
        a=px[x-1,y]; b=px[x,y]
        if abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])>=seuil: out.append(x)
    return out

print("\n--- bords VERTICAUX du panneau ---")
print("  REFERENCE  y=1000 :", bords_h(REF,1000)[:14])
print("  CAPTURE    y= 740 :", bords_h(CAP,740)[:14])
print("  CAPTURE    y= 940 :", bords_h(CAP,940)[:14])

def profil_x(im, y, xs):
    px=im.load()
    return [(x, px[x,y]) for x in xs]

print("\n--- CONTROLE POSITIF : le cadre-b sur la REFERENCE (y=1000) ---")
for x,c in profil_x(REF,1000,range(0,60,2)):
    print(f"    x={x:3d} {str(c):16s} {hexs(c)}")

print("\n--- CAPTURE : meme traverse (y=740) ---")
for x,c in profil_x(CAP,740,range(28,90,2)):
    print(f"    x={x:3d} {str(c):16s} {hexs(c)}")

def texture(im, x0,y0,x1,y1, nom):
    """nombre de teintes distinctes + ecart-type de luminance dans une fenetre d'aplat"""
    px=im.load(); vals=[]; couleurs=set()
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; couleurs.add(c)
            vals.append(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
    m=sum(vals)/len(vals)
    sd=math.sqrt(sum((v-m)**2 for v in vals)/len(vals))
    mn,mx=min(vals),max(vals)
    print(f"  {nom:38s} n={len(vals):6d} teintes={len(couleurs):6d} L moy={m:6.2f} ecart-type={sd:5.2f} min={mn:6.2f} max={mx:6.2f} amplitude={mx-mn:6.2f}")
    return sd, len(couleurs)

print("\n--- TEXTURE (fenetre d'aplat de 200x200 px, loin des fiches et du fil) ---")
sd_ref,_ = texture(REF, 120, 940, 320, 1140, "REF planche (liege)")
sd_cap,_ = texture(CAP,  70, 700, 270,  760, "CAP planche (brun plat) 200x60")
texture(REF, 120, 460, 320,  520, "CONTROLE NEG : REF entete #20180f")
texture(CAP, 120, 460, 320,  520, "CONTROLE NEG : CAP fond #0d0d0d")
print(f"  ==> discrimination liege/plat : ecart-type {sd_ref:.2f} contre {sd_cap:.2f}")

print("\n--- PERIODE de la texture : profil de luminance sur 100 px, REF vs CAP ---")
def ligne_L(im,y,x0,x1):
    px=im.load()
    return [round(0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2],1) for x in range(x0,x1)]
print("  REF y=1000 x=140..190 :", ligne_L(REF,1000,140,190))
print("  CAP y= 730 x=140..190 :", ligne_L(CAP, 730,140,190))

print("\n--- DEGRADE 158deg : luminance du liege en 3 points (haut-G, centre, bas-D) ---")
def L(im,x0,y0,x1,y1):
    px=im.load(); v=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; v.append(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
    v.sort(); return v[len(v)//2]
print(f"  REF  haut-G={L(REF,120,660,200,700):6.2f}  centre={L(REF,480,980,560,1040):6.2f}  bas-D={L(REF,880,1150,960,1200):6.2f}")
print(f"  CAP  haut-G={L(CAP, 70,540,150,570):6.2f}  centre={L(CAP,470,730,550,770):6.2f}  bas-D={L(CAP,850,910,930,945):6.2f}")
