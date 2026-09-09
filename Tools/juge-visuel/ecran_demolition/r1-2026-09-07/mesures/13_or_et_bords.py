# -*- coding: utf-8 -*-
"""Statut dore des rangees : famille de l'or + contraste. Et bord exact du .dm-tete de la capture.
Controle POSITIF : le montant du bandeau doit retomber sur hudMoneyGold #f2c96b (mesure deja faite : 242,201,106)."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def L(c):
    def f(u):
        u=u/255.0
        return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def ratio(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+.05)/(lb+.05)
def fond_de(px,box):
    x0,y0,x1,y1=box; R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1): p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B))
def encre(px,box,fond,q=0.98):
    x0,y0,x1,y1=box; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; pts.append((sum(abs(p[i]-fond[i]) for i in range(3)),p))
    pts.sort(key=lambda t:t[0]); k=int(q*len(pts)); sel=[p for d,p in pts[k:]]
    return (med([p[0] for p in sel]),med([p[1] for p in sel]),med([p[2] for p in sel]))
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load()
R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load()
print("OUVERT cap %s ref %s"%(C.size,R.size))
print()
print("=== bord haut exact du .dm-tete (capture) : mediane de ligne, x 700..1030 ===")
prev=None
for y in range(225,245):
    xs=range(700,1030,2)
    c=(med([pc[x,y][0] for x in xs]),med([pc[x,y][1] for x in xs]),med([pc[x,y][2] for x in xs]))
    mk="  <==" if prev and sum(abs(c[i]-prev[i]) for i in range(3))>=4 else ""
    print("   y=%d %s%s"%(y,c,mk)); prev=c
print()
print("=== statut dore d'une rangee (Reparation Ilm) ===")
f=fond_de(pc,(650,1340,850,1420))
for y0,y1,lab in [(1355,1400,"rangee 5"),(1503,1548,"rangee 6")]:
    e=encre(pc,(740,y0,1012,y1),f)
    print("   %s  fond=%s encre=%s  contraste=%.2f:1"%(lab,f,e,ratio(e,f)))
    for nom,tok in [("dm-geste #d9ab4e",(217,171,78)),("accentGold #ffd23f",(255,210,63)),("hudMoneyGold #f2c96b",(242,201,107))]:
        print("       vs %-22s ecart max/canal = %d"%(nom,max(abs(e[i]-tok[i]) for i in range(3))))
print()
print("=== REF fiche .l u  (libelle majuscule sur carton) ===")
f=fond_de(pr,(700,800,900,830)); e=encre(pr,(106,800,420,840),f)
print("   fond=%s encre=%s contraste=%.2f:1  (CSS #7f7a63 sur #e9e4d4 -> attendu ~3,4:1)"%(f,e,ratio(e,f)))
print()
print("=== densite d'encre et luminance moyenne (zone de CONTENU seulement) ===")
def globale(px,box,lab,pas=3):
    x0,y0,x1,y1=box; n=0; s=0.0; hist={}
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            p=px[x,y]; n+=1; s+=L(p)
            q=(p[0]//24*24,p[1]//24*24,p[2]//24*24); hist[q]=hist.get(q,0)+1
    top=sorted(hist.items(),key=lambda t:-t[1])[:6]
    print("   %s  n=%d  luminance moyenne=%.4f"%(lab,n,s/n))
    for c,k in top: print("      %s  %5.1f%%"%(str(c),100.0*k/n))
globale(pr,(4,434,1076,2097),"REFERENCE (contenu .demo6, cadre #80)")
globale(pc,(0,145,1080,2152),"CAPTURE  (contenu, sous bandeau / sur dock)")
