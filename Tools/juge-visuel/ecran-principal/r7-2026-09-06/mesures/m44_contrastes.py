# -- m44 : CONTRASTES (WCAG) des textes sur leur fond REEL. Encre = mode du coeur des glyphes ;
#    fond = mediane des pixels non-encre dans la boite du texte, echantillonnee a >=3 px des glyphes.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
def contraste(key, box, pred_encre, nom):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    enc={}; fondv=[]
    k=int(round(3*s/3))+1
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            p=d[xp,yp]
            if pred_encre(p):
                if all(pred_encre(d[xp+dx,yp+dy]) for dx in(-1,0,1) for dy in(-1,0,1)):
                    enc[p]=enc.get(p,0)+1
            else:
                if not any(pred_encre(d[min(max(xp+dx,0),im.width-1),min(max(yp+dy,0),im.height-1)]) for dx in range(-k,k+1) for dy in range(-k,k+1)):
                    fondv.append(p)
    if not enc or not fondv: print("   %-4s %-34s : donnees insuffisantes (encre %d, fond %d)"%(key,nom,len(enc),len(fondv))); return
    e=max(enc.items(),key=lambda t:t[1])[0]
    f=tuple(sorted(v[c] for v in fondv)[len(fondv)//2] for c in range(3))
    print("   %-4s %-34s encre %-16s fond %-16s  CONTRASTE = %.2f:1   (n encre %d, n fond %d)"%(key,nom,str(e),str(f),contrast(e,f),sum(enc.values()),len(fondv)))
creme2 = lambda p: abs(p[0]-185)<24 and abs(p[1]-173)<24 and abs(p[2]-146)<28 and p[0]>p[2]+20
creme  = lambda p: abs(p[0]-234)<20 and abs(p[1]-224)<20 and abs(p[2]-200)<26
orvif  = lambda p: abs(p[0]-242)<24 and abs(p[1]-201)<28 and abs(p[2]-107)<45 and p[0]-p[2]>90
print("=== DOCK : libelles (creme-2) ===")
contraste('ref',(70,672,120,684),creme2,'EMPIRE (canon)')
contraste('c19',(70,672,120,684),creme2,'EMPIRE (jeu 1920)')
contraste('c24',(70,846,120,858),creme2,'EMPIRE (jeu 2400)')
contraste('c19',(276,672,326,684),creme2,'PLUS (jeu 1920)')
contraste('c24',(276,846,326,858),creme2,'PLUS (jeu 2400)')
print("=== BANDEAU ===")
contraste('ref',(15,8,80,19),creme2,'ARGENT (canon)')
contraste('c19',(62,8,106,19),creme2,'ARGENT (jeu 1920)')
contraste('c24',(62,8,106,19),creme2,'ARGENT (jeu 2400)')
contraste('ref',(275,10,378,20),creme2,'JOUR ... (canon)')
contraste('c19',(338,9,378,20),creme2,'JOUR 50 (jeu 1920)')
contraste('c24',(338,9,378,20),creme2,'JOUR 50 (jeu 2400)')
contraste('ref',(14,19,150,38),orvif,'montant (canon)')
contraste('c19',(62,24,166,39),orvif,'montant (jeu 1920)')
contraste('c24',(62,24,166,39),orvif,'montant (jeu 2400)')
print("=== FICHE ===")
contraste('ref',(20,443,376,460),orvif,'titre (canon)')
contraste('c19',(20,443,376,460),orvif,'titre (jeu 1920)')
contraste('ref',(20,466,376,481),creme2,'sous-titre (canon)')
contraste('c19',(20,466,376,481),creme2,'sous-titre (jeu 1920)')
contraste('ref',(20,514,376,527),creme2,'libelles de stats (canon)')
contraste('c19',(20,514,376,527),creme2,'libelles de stats (jeu 1920)')
