# m16 — PROFIL RADIAL autour de chaque nom : ce que la reference et la capture font a la PEINTURE
#       autour de l'encre. Reference : .nomq a paint-order:stroke + stroke:#080d14 width 2.4 => un CONTOUR
#       SOMBRE. Capture : un halo radial declare (F5). Les deux se lisent sur la meme grandeur.
# METHODE : masque d'encre -> distance (BFS 8-connexe) -> mediane de luminance des px NON-encre par
#       anneau de distance d. Ligne de base = anneaux d=55..80 (peinture intacte).
# CONVENTION DE BORD : mi-alpha nominal (l'epaisseur d'un trait est prise entre les deux points ou le
#       profil traverse la moitie entre le fond et le coeur).
# CONTROLE POSITIF : "LE THRENNY", PEINT DANS LA TEXTURE, doit rendre le MEME profil des deux cotes.
# CONTROLE NEGATIF : une fenetre de peinture SANS texte doit rendre un profil PLAT.
from PIL import Image
import os, statistics, json
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); M=os.path.join(D,"mesures")
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def profil(px,W,H,box,encf,pad=90):
    x0,y0,x1,y1=box
    X0=max(0,x0-pad);Y0=max(0,y0-pad);X1=min(W-1,x1+pad);Y1=min(H-1,y1+pad)
    w=X1-X0+1;h=Y1-Y0+1
    ink=[[False]*w for _ in range(h)]
    for j in range(h):
        for i in range(w):
            x,y=X0+i,Y0+j
            if x0<=x<=x1 and y0<=y<=y1 and encf(px[x,y]): ink[j][i]=True
    n=sum(sum(r) for r in ink)
    if n<100: return None,0
    dist=[[-1]*w for _ in range(h)]; q=[]
    for j in range(h):
        for i in range(w):
            if ink[j][i]: dist[j][i]=0; q.append((i,j))
    head=0
    while head<len(q):
        i,j=q[head]; head+=1
        d=dist[j][i]
        if d>=100: continue
        for dj in(-1,0,1):
            for di in(-1,0,1):
                ni,nj=i+di,j+dj
                if 0<=ni<w and 0<=nj<h and dist[nj][ni]<0:
                    dist[nj][ni]=d+1; q.append((ni,nj))
    buck={}
    for j in range(h):
        for i in range(w):
            d=dist[j][i]
            if d>0: buck.setdefault(d,[]).append(L(px[X0+i,Y0+j]))
    return {d:statistics.median(v) for d,v in buck.items() if len(v)>=25}, n
def cream(p):
    R,G,B=p; l=L(p); return l>110 and 10<=(R-B)<=95 and G>100
def cold(p):
    R,G,B=p; return L(p)>120 and (B-R)>20
CAS=[("SAINT-BRAND",(87,931,278,986)),("DEPOT-EST",(848,925,1012,987)),
     ("LE TREILLIS",(80,1394,249,1442)),("MARNE-BASSE",(451,1413,652,1460)),
     ("LES ENTREPOTS",(460,926,684,996))]
print(f"{'nom':16s}{'img':5s}| " + "".join(f"d{d:<5d}" for d in (1,2,3,4,5,6,8,10,14,20,30)) + "| base(55-80) | delta au pic")
lignes=[]
for nom,cb in CAS:
    rb=(int((cb[0]-TX)/S),int((cb[1]-TY)/S),int((cb[2]-TX)/S),int((cb[3]-TY)/S))
    for tag,px,W,H,box in (("REF",RP,1080,2102,rb),("CAP",CP,1080,2400,cb)):
        pr,n=profil(px,W,H,box,cream)
        if not pr: print(f"{nom:16s}{tag:5s}| IMPOSSIBLE"); continue
        base=statistics.median([pr[d] for d in range(55,81) if d in pr])
        vals=[pr.get(d) for d in (1,2,3,4,5,6,8,10,14,20,30)]
        pic=max((pr[d]-base,d) for d in range(1,31) if d in pr)
        creux=min((pr[d]-base,d) for d in range(1,31) if d in pr)
        print(f"{nom:16s}{tag:5s}| " + "".join(f"{(v if v is not None else float('nan')):<6.1f}" for v in vals) +
              f"| {base:6.2f}      | max {pic[0]:+6.2f} a d={pic[1]:<3d} min {creux[0]:+6.2f} a d={creux[1]}")
        lignes.append({"nom":nom,"img":tag,"base":round(base,2),"prof":{d:round(pr[d],2) for d in sorted(pr) if d<=40}})
print("\nCTRL+ 'LE THRENNY' (peint DANS la texture, identique des deux cotes) — encre FROIDE")
for tag,px,W,H,box in (("REF",RP,1080,2102,(415,1122,660,1155)),("CAP",CP,1080,2400,(413,1155,658,1189))):
    pr,n=profil(px,W,H,box,cold,pad=70)
    if not pr: print(f"  {tag}: IMPOSSIBLE"); continue
    base=statistics.median([pr[d] for d in range(45,66) if d in pr])
    print(f"  {tag}: n={n:4d} encre  base={base:.2f}  d1={pr.get(1,0):.1f} d2={pr.get(2,0):.1f} d3={pr.get(3,0):.1f} d5={pr.get(5,0):.1f} d10={pr.get(10,0):.1f} d20={pr.get(20,0):.1f}")
print("\nCTRL- fenetre de peinture SANS texte (profil attendu PLAT) : autour d'un point d'or arbitraire")
for tag,px,W,H,box in (("REF",RP,1080,2102,(300,1000,340,1030)),("CAP",CP,1080,2400,(295,1030,336,1061))):
    pr,n=profil(px,W,H,box,lambda p: L(p)>150 and (p[0]-p[2])>90, pad=60)
    if not pr: print(f"  {tag}: pas d'encre trouvee (attendu si pas de point ici)"); continue
    base=statistics.median([pr[d] for d in range(40,56) if d in pr])
    print(f"  {tag}: base={base:.2f} d1={pr.get(1,0):.1f} d3={pr.get(3,0):.1f} d6={pr.get(6,0):.1f} d12={pr.get(12,0):.1f} d25={pr.get(25,0):.1f}")
json.dump(lignes,open(os.path.join(M,"halo_profils.json"),"w"),indent=1)
