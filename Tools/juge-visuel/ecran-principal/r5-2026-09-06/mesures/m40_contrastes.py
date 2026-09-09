# Grandeur : contrastes des textes principaux, mesures sur le FOND REEL a >=3 px du bord.
# Pour le nom de district, on mesure AUSSI l'anneau sombre (contour) : encre/contour et contour/ciel.
from common import *
import math
def anneau_autour(im,box,seuil_encre=200):
    """cherche, autour de l'encre, le pixel le PLUS SOMBRE a <=3 px : c'est le contour s'il existe"""
    px=im.load(); x0,y0,x1,y1=box
    enc=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>seuil_encre]
    if not enc: return None
    dark=None
    for x,y in enc:
        for dx in range(-3,4):
            for dy in range(-3,4):
                nx,ny=x+dx,y+dy
                if x0<=nx<x1 and y0<=ny<y1:
                    c=px[nx,ny]
                    if dark is None or lum(c)<lum(dark): dark=c
    return dark
c=op(C24); px=c.load()
enc=(234,224,200); ciel=med(c,200,282,260,302)
cont=anneau_autour(c,(15,282,130,304))
print(f'  nom de district : encre {enc} ; contour le + sombre {cont} ; ciel {ciel}')
print(f'     contraste encre/ciel   = {contrast(enc,ciel):5.2f}:1   (doctrine : >= 4,5 petit texte)')
print(f'     contraste encre/contour= {contrast(enc,cont):5.2f}:1')
print(f'     contraste contour/ciel = {contrast(cont,ciel):5.2f}:1')
print()
print('  contrastes du bandeau et de la fiche (capture) :')
tests=[('valeur ARGENT (or-vif)',(242,201,106),med(c,300,60,320,72)),
       ('libelle ARGENT (creme-2)',(185,173,146),med(c,300,35,320,45)),
       ('libelle JOUR (creme-2)',(185,173,146),med(c,960,35,990,45)),
       ('valeur JOUR (creme)',(234,224,200),med(c,960,120,1000,132)),
       ('"Brulant" (creme)',(234,224,200),med(c,470,175,490,185)),
       ('"CHALEUR" (creme-2)',(185,173,146),med(c,470,205,490,215)),
       ('libelles du dock (creme-2)',(185,173,146),med(c,300,2315,330,2325))]
for n,i,f in tests:
    print(f'     {n:28s} encre {i} fond {f} -> {contrast(i,f):5.2f}:1')
c19=op(C19)
tests2=[('titre de fiche (or-vif)',(242,201,106),med(c19,300,1160,330,1175)),
        ('valeur stat 1 (or-vif)',(242,201,106),med(c19,200,1320,230,1340)),
        ('valeur stat 3 (creme)',(234,224,200),med(c19,930,1320,960,1340)),
        ('libelles de stats (creme-2)',(185,173,146),med(c19,300,1380,330,1395)),
        ('COLLECTER (encre sur or)',(20,20,20),med(c19,120,1470,180,1500)),
        ('BLANCHIR (creme)',(234,224,200),med(c19,430,1470,470,1500))]
for n,i,f in tests2:
    print(f'     {n:28s} encre {i} fond {f} -> {contrast(i,f):5.2f}:1')
