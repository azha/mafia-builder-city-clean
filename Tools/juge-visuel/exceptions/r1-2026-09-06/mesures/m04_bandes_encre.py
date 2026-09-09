# m04 — bandes d'encre (lignes contenant autre chose que le fond) sur les 3 images.
# Convention : "encre" = |c - fond| L1 > 25, fond mesuré comme la couleur médiane de l'image.
from util import *
from collections import Counter
print("== m04 bandes d'encre ==")
def fond_dominant(im):
    q=im.resize((216,480)).getcolors(1<<24); q.sort(reverse=True); return q[0][1]
def bandes(im, seuil=25, minh=3):
    px=im.load(); W,H=im.size; F=fond_dominant(im)
    res=[]; cur=None
    for y in range(H):
        k=0
        for x in range(0,W,2):
            c=px[x,y]
            if abs(c[0]-F[0])+abs(c[1]-F[1])+abs(c[2]-F[2])>seuil: k+=1
        if k>0:
            if cur is None: cur=[y,y,k]
            else: cur[1]=y; cur[2]=max(cur[2],k)
        else:
            if cur and cur[1]-cur[0]>=minh: res.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>=minh: res.append(tuple(cur))
    return F,res
for nom,p in (("REF",REF),("CAP sous chrome",CAP),("CAP sans chrome",CAPSC)):
    im=ouvrir(p); F,b=bandes(im)
    print(f"  {nom}: fond dominant={F}  {len(b)} bandes")
    for t in b: print(f"     y {t[0]:4d}..{t[1]:4d} (h={t[1]-t[0]+1:4d})  max px/ligne={t[2]}")
