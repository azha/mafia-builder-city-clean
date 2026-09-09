from util import *
print("== m10 pavés gris de la capture ==")
cap=ouvrir(CAP); px=cap.load()
for (x,y) in ((560,1430),(890,1430),(130,1700),(560,1400),(900,1400)):
    print(f"   médiane ({x},{y}) = {mediane_fenetre(cap,x,y,5)}")
# segmentation : tout ce qui n'est pas le fond (13,13,13) dans la bande 1350..1530
def comps(im,test,fen,minpx=2000):
    p=im.load(); x0,y0,x1,y1=fen; vus=set(); out=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if (x,y) in vus or not test(p[x,y]): continue
            pile=[(x,y)];vus.add((x,y));pts=[]
            while pile:
                a,b=pile.pop();pts.append((a,b))
                for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                    na,nb=a+da,b+db
                    if x0<=na<x1 and y0<=nb<y1 and (na,nb) not in vus and test(p[na,nb]):
                        vus.add((na,nb));pile.append((na,nb))
            if len(pts)>=minpx:
                xs=[q[0] for q in pts];ys=[q[1] for q in pts]
                out.append((min(xs),min(ys),max(xs),max(ys),len(pts)))
    out.sort(key=lambda t:t[0]);return out
nonfond=lambda c: abs(c[0]-13)+abs(c[1]-13)+abs(c[2]-13)>40
for nom,P,fen in (("SOUS chrome",CAP,(0,1350,1080,1530)),("SANS chrome",CAPSC,(0,1600,1080,1780))):
    im=ouvrir(P); p=im.load()
    cs=comps(im,nonfond,fen)
    print(f"  {nom}: {len(cs)} blocs ≥2000 px")
    for t in cs:
        w,h=t[2]-t[0]+1,t[3]-t[1]+1
        sub=im.crop((t[0]+2,t[1]+2,max(t[0]+4,t[2]-1),max(t[1]+4,t[3]-1)))
        print(f"     ({t[0]},{t[1]})-({t[2]},{t[3]}) {w}x{h} rempl={mediane_fenetre(im,(t[0]+t[2])//2,(t[1]+t[3])//2,6)} "
              f"coins={[p[t[0],t[1]],p[t[2],t[1]],p[t[0],t[3]],p[t[2],t[3]]]} teintes={len(sub.getcolors(1<<24))}")
