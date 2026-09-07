#!/usr/bin/env python3
"""11 - Le plan du haut est-il VIDE ou seulement SOMBRE ?
Deux mesures : (a) on releve fortement les basses lumieres et on regarde ;
(b) on compte, dans le haut, ce qui porte les signatures d'un batiment habite
(fenetre allumee = pixel chaud ; detail = amplitude locale), et on le compare
au MEME comptage sur un batiment temoin du coeur."""
from PIL import Image, ImageFilter, ImageChops
import os
D=os.path.dirname(__file__)
im=Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=im.size; p=im.load(); print("taille source : %d x %d"%(W,H))

# (a) releve des basses lumieres (gamma 0.38) sur la bande du haut
b=im.crop((0,142,1080,478))
lut=[min(255,int(255*((i/255.0)**0.38))) for i in range(256)]*3
b.point(lut).save(os.path.join(D,'11_haut_releve.png'))
print("ecrit 11_haut_releve.png (bande y142-478, gamma 0.38)")

L=im.convert('L')
amp=ImageChops.subtract(L.filter(ImageFilter.MaxFilter(9)),L.filter(ImageFilter.MinFilter(9))); pa=amp.load()
def z(nom,x0,y0,x1,y1):
    n=(x1-x0)*(y1-y0); chaud=det=0; s=0.0; mx=0
    for x in range(x0,x1):
        for y in range(y0,y1):
            r,g,bb=p[x,y]; s+=0.2126*r+0.7152*g+0.0722*bb
            if r-bb>=8: chaud+=1
            if pa[x,y]>=12: det+=1
            mx=max(mx,int(0.2126*r+0.7152*g+0.0722*bb))
    print("  %-34s n=%6d  L_moy=%5.1f  L_max=%3d  fenetres/lampes=%5.2f%%  detail=%5.1f%%"
          % (nom,n,s/n,mx,100*chaud/n,100*det/n))

print("\n== (b) SIGNATURE D'UN BATIMENT HABITE : haut de l'ecran vs coeur ==")
print("-- TEMOINS du coeur (batiments habites) --")
z("immeuble central (Laboratoire)",400,420,580,610)
z("tour gauche",230,470,350,640)
z("usine du quai",470,1180,790,1300)
print("-- HAUT DE L'ECRAN --")
z("bloc gris coin haut-DROIT",880,150,1080,340)
z("bloc gris coin haut-GAUCHE",0,142,300,240)
z("plan de sol, centre haut",300,300,800,470)
print("\n  lecture : un bloc a 0.00%% de fenetres et un detail effondre n'est pas 'sombre',")
print("            il est SANS FENETRES ET SANS DETAIL.")
