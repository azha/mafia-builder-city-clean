# m33 — le "0 px d'or dans le contenu" est une assertion de ZÉRO : elle se refait EXHAUSTIVEMENT
# (pas=1, tous les px) et avec un critère ÉLARGI (seuils abaissés), sinon le zéro peut venir du
# pas d'échantillonnage ou d'un seuil trop étroit.
# Contrôle positif obligatoire : le même balayage élargi sur le BANDEAU doit rendre > 0.
from util import *
import colorsys
print("== m33 or : zéro exhaustif ==")
def compte(im,fen,hmin,hmax,smin,vmin):
    px=im.load(); x0,y0,x1,y1=fen; n=0;t=0;ex=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; t+=1
            h,s,v=colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255)
            if hmin/360<=h<=hmax/360 and s>=smin and v>=vmin:
                n+=1
                if len(ex)<3: ex.append(c)
    return n,t,ex
cap=ouvrir(CAP); ref=ouvrir(REF)
jeux=[("strict  h33-58 s.30 v.30",33,58,.30,.30),
      ("élargi  h25-70 s.18 v.18",25,70,.18,.18),
      ("très large h20-75 s.10 v.12",20,75,.10,.12)]
for lbl,a,b,s,v in jeux:
    n1,t1,e1=compte(cap,(0,0,1080,143),a,b,s,v)
    n2,t2,e2=compte(cap,(0,1280,1080,2130),a,b,s,v)
    n3,t3,e3=compte(ref,(0,216,1080,2100),a,b,s,v)
    print(f"  {lbl}")
    print(f"     CAP bandeau (contrôle +) : {n1}/{t1} = {n1/t1*100:.3f} %  ex={e1}")
    print(f"     CAP contenu dessiné      : {n2}/{t2} = {n2/t2*100:.3f} %  ex={e2}")
    print(f"     RÉF contenu              : {n3}/{t3} = {n3/t3*100:.3f} %  ex={e3}")
