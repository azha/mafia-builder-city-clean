"""06 - Lignes de texte : segmentation par comptage d'encre par ligne, dans une region donnee.
Rend pour chaque ligne : y0..y1 (hauteur d'encre), x0..x1, et la couleur mediane des px les
plus encres (= couleur du texte, pas de la frange).
Hauteur de CAPITALE : mesuree sur une sous-fenetre x limitee a une capitale connue.
Controle positif : sur la reference, le filet or de l'enseigne (7 px) doit ressortir comme
une 'ligne' pleine largeur -- une forme dont on connait la hauteur (2px CSS x3,6 = 7,2)."""
from PIL import Image
from statistics import median

def load(p):
    im=Image.open(p).convert('RGB'); print(f"  ouvre {p}: {im.size}"); return im

def lignes(im, x0,y0,x1,y1, fond, tol=30, minpx=3):
    p=im.load(); rows=[]
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if max(abs(p[x,y][i]-fond[i]) for i in range(3))>tol]
        rows.append(xs)
    out=[]; cur=None
    for i,xs in enumerate(rows):
        if len(xs)>=minpx:
            if cur is None: cur=[y0+i,y0+i,min(xs),max(xs),[]]
            cur[1]=y0+i; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
            cur[4].extend([p[x,y0+i][:3] for x in xs])
        else:
            if cur: out.append(cur); cur=None
    if cur: out.append(cur)
    res=[]
    for a,b,xa,xb,cols in out:
        cols.sort(key=lambda c: -(c[0]+c[1]+c[2]))
        top=cols[:max(1,len(cols)//6)]
        res.append((a,b,xa,xb,(int(median([c[0] for c in top])),int(median([c[1] for c in top])),int(median([c[2] for c in top])))))
    return res

def show(nom, im, box, fond, tol=30):
    print(f"\n-- {nom}  region={box} fond={fond}")
    for a,b,xa,xb,c in lignes(im,*box,fond,tol):
        print(f"     y {a:4d}..{b:4d} (h={b-a+1:3d})  x {xa:4d}..{xb:4d} (l={xb-xa+1:4d})  couleur={c}")

ref=load('../reference-1080x2102.png'); cap=load('../capture-1080x2400.png')
print("\n### CONTROLE POSITIF : filet or de l'enseigne (attendu h=7, pleine largeur du panneau)")
for a,b,xa,xb,c in lignes(ref,60,655,1020,680,(14,20,30),tol=40):
    print(f"     y {a}..{b} (h={b-a+1})  x {xa}..{xb}  couleur={c}")

show("REF enseigne (titre+sous-titre)", ref,(60,460,1020,660),(16,22,32),40)
show("REF compteurs",                  ref,(90,700,990,822),(10,15,22),30)
show("REF piste 1 (comptabilite)",     ref,(90,880,368,1200),(17,24,35),30)
show("REF pann",                       ref,(85,1595,1000,1860),(17,24,35),28)
show("REF cta + note",                 ref,(60,1900,1020,2085),(22,25,27),35)

show("CAP losange + titre",            cap,(40,150,1040,470),(22,22,28),30)
show("CAP carte 1",                    cap,(50,495,1030,730),(22,22,28),30)
show("CAP carte 2",                    cap,(50,755,1030,990),(22,22,28),30)
show("CAP carte 3",                    cap,(50,1014,1030,1248),(22,22,28),30)
show("CAP panneau bas",                cap,(50,1605,1030,2105),(22,22,28),28)
