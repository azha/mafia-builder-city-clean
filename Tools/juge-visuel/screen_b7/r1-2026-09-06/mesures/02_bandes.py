"""02 - Detection des PANNEAUX : segmentation par couleur mediane de ligne (colonne centrale large).
Controle positif imprime : couleur du fond hors panneau (doit etre ~identique en haut et en bas).
Chaque script imprime la taille des images qu'il ouvre."""
from PIL import Image
from statistics import median

def med_row(p, y, x0, x1, step=3):
    R=[];G=[];B=[]
    for x in range(x0,x1,step):
        r,g,b = p[x,y][:3]; R.append(r);G.append(g);B.append(b)
    return (int(median(R)), int(median(G)), int(median(B)))

def seg(path, x0, x1, tol=6):
    im = Image.open(path).convert('RGB'); print(f"{path}: {im.size}")
    p = im.load(); w,h = im.size
    rows = [med_row(p,y,x0,x1) for y in range(h)]
    segs=[]; start=0; cur=rows[0]
    for y in range(1,h):
        c=rows[y]
        if max(abs(c[i]-cur[i]) for i in range(3))>tol:
            segs.append((start,y-1,cur)); start=y; cur=c
    segs.append((start,h-1,cur))
    for a,b,c in segs:
        if b-a>=3:
            print(f"   y {a:4d}..{b:4d}  (h={b-a+1:4d})  med={c}")
    print()

seg('../reference-1080x2102.png', 300, 780)
seg('../capture-1080x2400.png', 300, 780)
