# -*- coding: utf-8 -*-
"""CHROME jugé contre le CANON HUD (`hud-canon-1176.png`, 1176 px = 392 CSS, x3) — la capture est
a 1080 px = 392 CSS, x2,755. Rapport capture / canon = 1080/1176 = 0,91837 : toute grandeur du canon
se multiplie par ce facteur avant comparaison.
CONTROLE POSITIF : la largeur des deux images rapportee au meme repere CSS doit valoir 392 des deux
                   cotes -> 1176*0,91837 = 1080. CONTROLE NEGATIF : les hauteurs (2091 vs 2400) ne
                   sont PAS homothetiques (aspects 9:16 vs 9:20) et ne servent a rien."""
from PIL import Image
K=1080/1176.0
def m(v): v=sorted(v); return v[len(v)//2]
def lig(px,W,y,step=3):
    R=[];G=[];B=[]
    for x in range(0,W,step):
        p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (m(R),m(G),m(B))
def hx(c): return "#%02x%02x%02x"%c
CAN="../hud-canon-1176.png"; CAP="../capture-1080x2400.png"
ic=Image.open(CAN).convert("RGB"); Wc,Hc=ic.size; pc=ic.load()
ia=Image.open(CAP).convert("RGB"); Wa,Ha=ia.size; pa=ia.load()
print("OUVERT %s %dx%d | %s %dx%d | facteur canon->capture = %.5f"%(CAN,Wc,Hc,CAP,Wa,Ha,K))
print("  CONTROLE POSITIF : 1176 x %.5f = %.1f (attendu 1080)"%(K,1176*K))
print("  CONTROLE NEGATIF : 2091 x %.5f = %.1f, la capture fait 2400 -> hauteurs NON homothetiques\n"%(K,2091*K))

print("--- BANDEAU : filet du bas ---")
def filet(px,W,H,cible,tol):
    out=[]
    for y in range(0,300):
        c=lig(px,W,y)
        if max(abs(c[i]-cible[i]) for i in range(3))<tol: out.append((y,c))
    return out
lai=filet(pc,Wc,Hc,(176,141,62),55)   # laiton du canon (calme)
bra=filet(pa,Wa,Ha,(224,102,74),35)   # braise de la capture (chaud)
print("  canon   (calme, filet laiton)  : lignes %s  couleur %s"%([y for y,_ in lai],hx(lai[0][1]) if lai else None))
print("  capture (chaud, filet braise)  : lignes %s  couleur %s"%([y for y,_ in bra],hx(bra[0][1]) if bra else None))
if lai and bra:
    yc=lai[0][0]; ya=bra[0][0]
    print("  hauteur de bandeau : canon %d px -> attendu en capture %.1f px ; mesure %d px  (ecart %+.1f px = %+.1f%%)"
          %(yc,yc*K,ya,ya-yc*K,100*(ya-yc*K)/(yc*K)))

print("\n--- MEDAILLON : anneau, diametre, centre ---")
def anneau(px,W,cible,tol,y0,y1,exclure):
    pts=[(x,y) for y in range(y0,y1) for x in range(W)
         if max(abs(px[x,y][i]-cible[i]) for i in range(3))<tol and y not in exclure]
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return min(xs),max(xs),min(ys),max(ys)
ac=anneau(pc,Wc,(176,141,62),60,0,260,set(y for y,_ in lai))
aa=anneau(pa,Wa,(224,102,74),45,0,260,set(y for y,_ in bra))
print("  canon   : x %d..%d  y %d..%d  diametre %d  centre x %.1f"%(ac[0],ac[1],ac[2],ac[3],ac[1]-ac[0]+1,(ac[0]+ac[1])/2))
print("  capture : x %d..%d  y %d..%d  diametre %d  centre x %.1f"%(aa[0],aa[1],aa[2],aa[3],aa[1]-aa[0]+1,(aa[0]+aa[1])/2))
dc=(ac[1]-ac[0]+1); da=(aa[1]-aa[0]+1)
print("  diametre : canon %d -> attendu %.1f ; mesure %d  (ecart %+.1f px = %+.1f%%)"%(dc,dc*K,da,da-dc*K,100*(da-dc*K)/(dc*K)))
print("  centrage : canon %.1f/%d = %.4f ; capture %.1f/%d = %.4f"%((ac[0]+ac[1])/2,Wc,(ac[0]+ac[1])/2/Wc,(aa[0]+aa[1])/2,Wa,(aa[0]+aa[1])/2/Wa))

print("\n--- BARRE SOUS ARGENT (canon : segment or + reliquat gris) ---")
def barre(px,W,y0,y1,x0,x1):
    seg={}
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if p[0]>140 and p[1]>100 and p[2]<110 and p[0]-p[2]>60: seg.setdefault("or",[]).append(x)
            elif 60<p[0]<130 and 70<p[1]<140 and 90<p[2]<170 and p[2]>p[0]: seg.setdefault("gris",[]).append(x)
    return {k:(min(v),max(v),len(set(v))) for k,v in seg.items()}
print("  canon   y=120..135 x=40..320 :",barre(pc,Wc,118,136,40,320))
print("  capture y=110..125 x=40..300 :",barre(pa,Wa,108,126,40,300))

print("\n--- AILE DROITE : bandes d'encre ---")
def bandes(px,W,x0,x1,y0,y1,fond,seuil=40):
    out=[];s=None
    for y in range(y0,y1):
        c=sum(1 for x in range(x0,x1) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil)
        if c>2 and s is None: s=y
        elif c<=2 and s is not None: out.append((s,y-1)); s=None
    if s is not None: out.append((s,y1))
    res=[]
    for a,b in out:
        xs=[x for y in range(a,b+1) for x in range(x0,x1) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil]
        res.append((a,b,min(xs),max(xs)))
    return res
print("  canon   x 820..1170 :",bandes(pc,Wc,820,1170,10,150,(20,26,40)))
print("  capture x 760..1075 :",bandes(pa,Wa,760,1075,10,140,(13,18,27)))

print("\n--- COIN GAUCHE : la capture porte-t-elle quelque chose que le canon n'a pas ? ---")
print("  canon   x 0..120, y 20..130 : encre =",sum(1 for y in range(20,131) for x in range(0,120)
      if max(abs(pc[x,y][i]-(20,26,40)[i]) for i in range(3))>40),"px")
print("  capture x 0..120, y 20..130 : encre =",sum(1 for y in range(20,131) for x in range(0,120)
      if max(abs(pa[x,y][i]-(13,18,27)[i]) for i in range(3))>40),"px")

print("\n--- DOCK ---")
def dock(px,W,H,fond):
    prem=None
    for y in range(int(H*0.75),H):
        c=sum(1 for x in range(0,W,2) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>16)
        if c>25: prem=y; break
    ym=prem+70
    cols=[x for x in range(W) if max(abs(px[x,ym][i]-fond[i]) for i in range(3))>16]
    g=[];s=None;p=None
    for x in cols:
        if s is None: s=x
        elif x-p>12: g.append((s,p)); s=x
        p=x
    if s is not None: g.append((s,p))
    return prem,g
pcd=dock(pc,Wc,Hc,(13,16,26)); pad=dock(pa,Wa,Ha,(13,13,13))
print("  canon   : 1re ligne encree y=%d (soit %.3f de la hauteur) ; %d ronds %s"%(pcd[0],pcd[0]/Hc,len(pcd[1]),pcd[1]))
print("  capture : 1re ligne encree y=%d (soit %.3f de la hauteur) ; %d ronds %s"%(pad[0],pad[0]/Ha,len(pad[1]),pad[1]))
if pcd[1] and pad[1]:
    dcn=pcd[1][0][1]-pcd[1][0][0]+1; dca=pad[1][0][1]-pad[1][0][0]+1
    print("  diametre du 1er rond : canon %d -> attendu %.1f ; mesure %d (ecart %+.1f%%)"%(dcn,dcn*K,dca,100*(dca-dcn*K)/(dcn*K)))
    print("  entraxe : canon %d -> attendu %.1f ; capture %d"%(pcd[1][1][0]-pcd[1][0][0],(pcd[1][1][0]-pcd[1][0][0])*K,pad[1][1][0]-pad[1][0][0]))
