# -- m50 : le `.bandeau-alerte` du canon (390x33,81 a (1 ; 79)) existe-t-il dans le jeu ?
#    Sonde = pixels d'ENCRE (creme / creme-2 / or) dans la bande y 79..113, x 10..380.
#    Controle de CAPACITE : la meme sonde, appliquee au canon, doit trouver le texte de l'alerte ;
#    et appliquee au bandeau du jeu (y 6..20), doit trouver « ARGENT » ⇒ elle n'est pas aveugle sur les captures.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
encre = lambda p: (p[0]>150 and p[1]>140 and p[2]>110 and p[0]-p[2]<95 and abs(p[0]-p[1])<35)
def sonde(key,box,nom):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    n=0; xs=[];ys=[]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            if encre(d[xp,yp]): n+=1; xs.append(xp/s); ys.append(yp/s)
    if n: print("   %-4s %-40s n=%5d px  x %.1f..%.1f  y %.1f..%.1f"%(key,nom,n,min(xs),max(xs),min(ys),max(ys)))
    else: print("   %-4s %-40s AUCUN pixel d'encre"%(key,nom))
print("=== bande du `.bandeau-alerte` (y 79..113 CSS) ===")
sonde('ref',(10,79,380,113),'canon (attendu : le texte de l alerte)')
sonde('c19',(10,79,380,113),'jeu 1920')
sonde('c24',(10,79,380,113),'jeu 2400')
sonde('d24',(10,79,380,113),'jeu 2400, district seul')
print("=== CONTROLE DE CAPACITE de la sonde sur les memes images ===")
sonde('ref',(10,6,120,20),'canon, ARGENT')
sonde('c19',(55,6,120,20),'jeu 1920, ARGENT')
sonde('c24',(55,6,120,20),'jeu 2400, ARGENT')
sonde('d24',(55,6,120,20),'jeu 2400 district seul, ARGENT')
