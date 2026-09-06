# -- m22 : ENCRES. Mode (couleur la plus frequente) des pixels du COEUR des glyphes (>=3 px de tout bord),
#    obtenu par erosion : on ne garde que les pixels dont les 8 voisins passent aussi le seuil.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def encre(key, box, seuil_lum=90, exclure=None, label=""):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    M={}
    def bright(x,y):
        p=d[x,y]; 
        if exclure and exclure(p): return False
        return lum(p)>=seuil_lum
    cnt={}
    tot=0
    for yp in range(Y0+1,Y1-1):
        for xp in range(X0+1,X1-1):
            if not bright(xp,yp): continue
            if all(bright(xp+dx,yp+dy) for dx in(-1,0,1) for dy in(-1,0,1)):
                p=d[xp,yp]; cnt[p]=cnt.get(p,0)+1; tot+=1
    if not tot: return None
    top=sorted(cnt.items(), key=lambda t:-t[1])[:4]
    print("  %-4s %-28s n(coeur)=%5d  dominantes : %s"%(key,label,tot," · ".join("%s %.0f%%"%(str(c),100*n/tot) for c,n in top)))
    return top[0][0]

print("=== encre du libelle principal du manometre (canon 37% / jeu Brulant) ===")
encre('ref',(184,31,208,45),110,label="37%")
encre('c19',(177,39,215,53),110,label="Brulant")
encre('c24',(177,39,215,53),110,label="Brulant")
print("=== encre du sous-libelle (HEAT / CHALEUR) ===")
encre('ref',(185,50,206,56),90,label="HEAT")
encre('c24',(179,58,214,64),90,label="CHALEUR")
print()
print("=== aile DROITE : libelle (JOUR) et VALEUR (21:40 / Aube) ===")
encre('ref',(275,10,378,20),90,label="JOUR 12 . SOIREE")
encre('ref',(275,22,378,40),110,label="21:40 (valeur)")
encre('c19',(300,12,378,22),90,label="JOUR 50")
encre('c19',(300,23,378,42),110,label="Aube (valeur)")
encre('c24',(300,23,378,42),110,label="Aube (valeur)")
print()
print("=== aile GAUCHE : libelle ARGENT et VALEUR ===")
encre('ref',(15,8,80,18),80,label="ARGENT (canon)")
encre('ref',(15,20,145,40),110,label="$ 24 850 (canon)")
encre('c19',(60,8,130,20),80,label="ARGENT (jeu)")
encre('c19',(60,22,230,42),110,label="9 627 820,00 EUR (jeu)")
