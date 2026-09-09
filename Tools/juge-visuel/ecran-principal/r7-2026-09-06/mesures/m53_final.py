import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
print("=== A) CHALEUR : degagement au cerclage, restreint au disque du boitier (c19) ===")
C=(195.817,39.820); RIN=31.36
s=sc('c19'); im=img('c19'); d=im.load()
best=0;bp=None; xs=[];ys=[]
for yp in range(int(54*s),int(70*s)):
    for xp in range(int(165*s),int(228*s)):
        p=d[xp,yp]; x=xp/s; y=yp/s
        r=math.hypot(x-C[0],y-C[1])
        if r>RIN: continue
        if abs(p[0]-185)<26 and abs(p[1]-173)<26 and abs(p[2]-146)<30 and p[0]>p[2]+18:
            xs.append(x); ys.append(y)
            if r>best: best=r; bp=(x,y)
print("   c19 CHALEUR : bbox x %.2f..%.2f (l=%.2f) y %.2f..%.2f (h=%.2f) ; pixel le plus loin r=%.2f (%.3f Rint) ⇒ degagement %.2f CSS"
      %(min(xs),max(xs),max(xs)-min(xs),min(ys),max(ys),max(ys)-min(ys),best,best/RIN,RIN-best))
print()
print("=== B) 3e valeur de stats : couleur ===")
def mode(key,box,seuil=110):
    s=sc(key); im=img(key); d=im.load(); cnt={}
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            p=d[xp,yp]
            if lum(p)>=seuil and all(lum(d[xp+a,yp+b])>=seuil for a in(-1,0,1) for b in(-1,0,1)): cnt[p]=cnt.get(p,0)+1
    if not cnt: return None,0
    t=sorted(cnt.items(),key=lambda x:-x[1])[:3]; return t, sum(cnt.values())
for key,box,nom in [('ref',(280,492,340,510),'canon « 12% »'),('c19',(280,492,340,510),'jeu « Sain »'),('c24',(280,666,340,684),'jeu « Sain » 2400')]:
    t,n=mode(key,box)
    print("   %-4s %-20s n=%4d  %s"%(key,nom,n," · ".join("%s %.0f%%"%(str(c),100*k/n) for c,k in t) if t else "-"))
print()
print("=== C) separateurs de stats, a une hauteur SANS texte (y=512) ===")
for key,dy in [('ref',0.0),('c19',0.0),('c24',174.222)]:
    s=sc(key); im=img(key); d=im.load(); yp=int(round((512+dy)*s)); runs=[]
    for xp in range(int(120*s),int(280*s)):
        p=d[xp,yp]
        if lum(p)>34 and p[2]>p[0]+4:
            if runs and xp==runs[-1][1]+1: runs[-1][1]=xp
            else: runs.append([xp,xp])
    print("   %-4s : "%key + " · ".join("x %.2f (l=%.2f) %s"%((a+b)/2/s,(b+1-a)/s,str(d[(a+b)//2,yp])) for a,b in runs))
print()
print("=== D) fleche RETOUR : boite et couleur ===")
s=sc('c19'); im=img('c19'); d=im.load(); xs=[];ys=[];cols=[]
for yp in range(int(20*s),int(34*s)):
    for xp in range(int(24*s),int(44*s)):
        p=d[xp,yp]
        if lum(p)>150: xs.append(xp/s); ys.append(yp/s); cols.append(p)
m=tuple(sorted(v[c] for v in cols)[len(cols)//2] for c in range(3))
print("   c19 : x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)  couleur mediane %s"%(min(xs),max(xs)+1/s,max(xs)+1/s-min(xs),min(ys),max(ys)+1/s,max(ys)+1/s-min(ys),str(m)))
print("        jetons proches : --creme (234,224,200) distance %d ; blanc pur distance %d"%(max(abs(m[i]-(234,224,200)[i]) for i in range(3)), max(255-m[i] for i in range(3))))
