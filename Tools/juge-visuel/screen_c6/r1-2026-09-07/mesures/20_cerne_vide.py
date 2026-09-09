# -*- coding: utf-8 -*-
"""(a) presence du .cerne (cadre or interieur, inset 5 CSS) ; (b) taille du VIDE dans la liste.
CONTROLE POSITIF : sur la REFERENCE le cerne doit etre trouve (>=2 colonnes or continues sur >=1000 px de haut).
CONTROLE NEGATIF : la meme sonde, restreinte a la moitie CENTRALE de l'image, ne doit rien trouver
   (le cerne n'existe qu'aux bords)."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def isor(p):
    r,g,b=p
    return r>g>b and r>=90 and (r-b)>=35 and (g-b)>=12
def colonnes_or(im,y0,y1,x0=0,x1=None):
    px=im.load(); w,h=im.size; x1=x1 or w
    out=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1,4) if isor(px[x,y]))
        f=n/len(range(y0,y1,4))
        if f>=0.85: out.append((x,round(f,2)))
    return out

ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
cap2=Image.open(os.path.join(R,"capture-1080x2400.png")).convert("RGB")
print("ref",ref.size,"cap",cap.size,"cap_chrome",cap2.size)
print("\n(a) COLONNES OR continues (>=85%) sur la hauteur du panneau")
print("   REFERENCE  y=470..2060 :", colonnes_or(ref,470,2060))
print("   CAPTURE    y=290..2090 :", colonnes_or(cap,290,2090))
print("   CAPTURE(chrome) y=290..2090 :", colonnes_or(cap2,290,2090))
print("   CONTROLE NEGATIF ref, moitie centrale x=300..800 :", colonnes_or(ref,470,2060,300,800))

print("\n(b) VIDE dans la boite liste (.elast)")
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def vide(im,x0,y0,x1,y1,tag):
    px=im.load()
    lignes=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1,2) if lum(px[x,y])>lum(px[x0-0,y0])+6)
        lignes.append(n)
    # bande basse continue a zero
    z=0
    for n in reversed(lignes):
        if n==0: z+=1
        else: break
    print("   %-28s boite y=%d..%d (h=%d px = %.1f CSS) ; bande BASSE strictement vide = %d px = %.1f CSS = %.0f%% de la boite"
          % (tag,y0,y1,y1-y0+1,(y1-y0+1)/S,z,z/S,100.0*z/(y1-y0+1)))
    # premier y non vide
    nz=[y0+i for i,n in enumerate(lignes) if n>0]
    if nz: print("        contenu de %d a %d (%.1f CSS de haut), soit %.0f%% de la boite"
                 % (nz[0],nz[-1],(nz[-1]-nz[0]+1)/S, 100.0*(nz[-1]-nz[0]+1)/(y1-y0+1)))
vide(cap,60,682,1020,1817,"CAPTURE .elast etat vide")
vide(ref,60,829,1020,1864,"REFERENCE .elast (4 cartes)")
