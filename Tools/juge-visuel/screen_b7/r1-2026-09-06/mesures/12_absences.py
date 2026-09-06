"""12 - Absences : ce que la reference porte et que la capture ne porte pas.
Chaque absence est prouvee par un balayage de la CAPTURE ENTIERE avec un motif dont le
CONTROLE POSITIF est le meme balayage sur la REFERENCE (qui DOIT trouver la cible).
"""
from PIL import Image
def load(p):
    im=Image.open(p).convert('RGB'); print(f"ouvre {p}: {im.size}"); return im
ref=load('../reference-1080x2102.png'); cap=load('../capture-1080x2400.png')

def compte(im, pred, y0,y1,x0=0,x1=1080,pas=1):
    p=im.load(); return sum(1 for y in range(y0,y1,pas) for x in range(x0,x1,pas) if pred(p[x,y][:3]))

# --- 1. filet or (or_filet #b08d3e) en bordure verticale d'un cadre de contenu
orf = lambda c: abs(c[0]-176)<28 and abs(c[1]-141)<28 and abs(c[2]-62)<28
print("1) filet or #b08d3e sur les colonnes de bord (x 0..60 et 1020..1079), zone de contenu")
print("   REF  y434..2082 :", compte(ref, orf, 434,2082, 0,60), "+", compte(ref, orf, 434,2082, 1020,1080), "px")
print("   CAP  y143..2193 :", compte(cap, orf, 143,2193, 0,60), "+", compte(cap, orf, 143,2193, 1020,1080), "px")

# --- 2. liseré #2a3648 (bord de panneau) partout dans la zone de contenu
lis = lambda c: abs(c[0]-42)<9 and abs(c[1]-54)<9 and abs(c[2]-72)<9
print("2) lisere #2a3648 (bord de panneau) dans la zone de contenu")
print("   REF :", compte(ref, lis, 434,2082, 24,1056), "px")
print("   CAP :", compte(cap, lis, 143,2193, 0,1080), "px")

# --- 3. cyan #7fd4d9 des compteurs (chiffres), hors des 3 filets de la capture
cy = lambda c: abs(c[0]-127)<30 and abs(c[1]-212)<30 and abs(c[2]-217)<30
print("3) cyan #7fd4d9")
print("   REF zone compteurs y695..824 :", compte(ref, cy, 695,824, 24,1056), "px")
print("   CAP zone equivalente y143..1150 :", compte(cap, cy, 143,1150, 0,1080), "px")
print("   CAP total zone de contenu       :", compte(cap, cy, 143,2193, 0,1080), "px  (= les 3 filets ?)")
print("   CAP filet 3 seul y1158..1170    :", compte(cap, cy, 1158,1170, 0,1080), "px")

# --- 4. vert #7db36a (piste 'discret')
vt = lambda c: abs(c[0]-125)<30 and abs(c[1]-179)<30 and abs(c[2]-106)<30
print("4) vert #7db36a")
print("   REF :", compte(ref, vt, 434,2082, 24,1056), "px")
print("   CAP :", compte(cap, vt, 143,2193, 0,1080), "px")

# --- 5. barres horizontales pleines de >=200 px de large et 15..30 px de haut
def barres(im, y0,y1, fondtol=30):
    p=im.load(); out=[]
    for y in range(y0,y1):
        runs=[];a=None
        for x in range(0,1080):
            c=p[x,y][:3]
            plein = max(c)-min(c)>25 or sum(c)>250   # colore ou clair
            if plein:
                if a is None: a=x
            else:
                if a is not None and x-a>=200: runs.append((a,x-1))
                a=None
        if a is not None and 1080-a>=200: runs.append((a,1079))
        for r in runs: out.append((y,)+r)
    return out
rb=barres(ref,940,1100); cb=barres(cap,143,2193)
def group(rows):
    g=[];cur=None
    for y,a,b in rows:
        if cur and y==cur[1]+1 and abs(a-cur[2])<12: cur[1]=y
        else:
            if cur: g.append(cur)
            cur=[y,y,a,b]
    if cur: g.append(cur)
    return g
print("5) barres pleines >=200 px de large")
print("   REF y940..1100 :", [(f"y{a}..{b} h={b-a+1}", f"x{c}..{d} l={d-c+1}") for a,b,c,d in group(rb)])
print("   CAP y143..2193 :", [(f"y{a}..{b} h={b-a+1}", f"x{c}..{d} l={d-c+1}") for a,b,c,d in group(cb)])
