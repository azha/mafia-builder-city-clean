# m09 — les "médaillons" de la CAPTURE : bbox, forme (coins), remplissage, présence d'un liseré,
#        présence d'une silhouette (variété interne).
# Contrôle positif : la largeur totale de l'image est 1080 (connue).
# Contrôle négatif : la variété interne du médaillon de la RÉFÉRENCE doit être ÉLEVÉE (rayons +
#        silhouette) — si la sonde rend "plat" des deux côtés, elle ne mesure rien.
from util import *
print("== m09 pavés de la capture ==")
def comps(im,test,fen,minpx=2000):
    px=im.load(); x0,y0,x1,y1=fen; vus=set(); out=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if (x,y) in vus or not test(px[x,y]): continue
            pile=[(x,y)]; vus.add((x,y)); pts=[]
            while pile:
                a,b=pile.pop(); pts.append((a,b))
                for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                    na,nb=a+da,b+db
                    if x0<=na<x1 and y0<=nb<y1 and (na,nb) not in vus and test(px[na,nb]):
                        vus.add((na,nb)); pile.append((na,nb))
            if len(pts)>=minpx:
                xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
                out.append((min(xs),min(ys),max(xs),max(ys),len(pts)))
    out.sort(key=lambda t:t[0]); return out

for nom,P,fen in (("SOUS chrome",CAP,(0,1340,1080,1530)),("SANS chrome",CAPSC,(0,1590,1080,1780))):
    im=ouvrir(P); px=im.load()
    pave=lambda c: (abs(c[0]-255)<12 and abs(c[1]-90)<14 and abs(c[2]-77)<14) or (abs(c[0]-154)<16 and abs(c[1]-166)<16 and abs(c[2]-172)<16)
    cs=comps(im,pave,fen)
    print(f"  {nom} : {len(cs)} pavés")
    for t in cs:
        w,h=t[2]-t[0]+1,t[3]-t[1]+1
        coins=[px[t[0],t[1]],px[t[2],t[1]],px[t[0],t[3]],px[t[2],t[3]]]
        # variété interne : nb de teintes distinctes dans le pavé (réduit)
        sub=im.crop((t[0]+4,t[1]+4,t[2]-3,t[3]-3))
        nteintes=len(sub.getcolors(1<<24))
        print(f"     bbox=({t[0]},{t[1]})-({t[2]},{t[3]}) {w}x{h} n={t[4]} remplissage={mediane_fenetre(im,(t[0]+t[2])//2,(t[1]+t[3])//2,6)}")
        print(f"       coins={coins}  teintes distinctes à l'intérieur={nteintes}  (aplat pur ⇒ 1)")
# contrôle négatif : variété interne des médaillons de la référence
ref=ouvrir(REF)
for (a,b,c2,d,lbl) in ((107,804,309,1006,"premier"),(409,830,561,982,"2e (B)"),(661,800,813,952,"3e")):
    sub=ref.crop((a+6,b+6,c2-5,d-5)); print(f"  RÉF contrôle négatif — médaillon {lbl}: teintes distinctes={len(sub.getcolors(1<<24))}")
