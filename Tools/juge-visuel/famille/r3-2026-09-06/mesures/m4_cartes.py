# m4 — boites des cartes (don-rang, 3 rangs, 3 boites vides, boite Recruter) sur les deux images.
# Methode : balayage d'une colonne / d'une ligne, detection de l'ecart au fond de feuille.
# Controle positif : la largeur du rang de la REFERENCE doit valoir 489,07 CSS (CSS calculee
#   560 - 2*22,4 - 26,13) a moins de 1 px ; controle negatif : la boite vide, elle, est plus etroite.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC = 13,232,1053/560.0
RX0,RY0,FR = 0,0,2.0
FONDC=(22,22,28); FONDR=(22,25,27)

def dif(p,f): return max(abs(p[0]-f[0]),abs(p[1]-f[1]),abs(p[2]-f[2]))

def scan_col(px,x,y0,y1,fond,s=6):
    ys=[y for y in range(y0,y1) if dif(px[x,y],fond)>s]
    if not ys: return None
    # segments contigus
    segs=[];cur=ys[0];prev=ys[0]
    for y in ys[1:]:
        if y-prev>2: segs.append((cur,prev)); cur=y
        prev=y
    segs.append((cur,prev))
    return segs

def scan_row(px,y,x0,x1,fond,s=6):
    xs=[x for x in range(x0,x1) if dif(px[x,y],fond)>s]
    if not xs: return None
    segs=[];cur=xs[0];prev=xs[0]
    for x in xs[1:]:
        if x-prev>2: segs.append((cur,prev)); cur=x
        prev=x
    segs.append((cur,prev))
    return segs

def css(v,orig,f): return round((v-orig)/f,2)

print("\n== REFERENCE : colonne x=800 (dans les cartes, hors medaillon, hors rail) ==")
for s in scan_col(r,800,0,1849,FONDR):
    print("  px %d..%d  CSS %.2f..%.2f  h=%.2f"%(s[0],s[1],css(s[0],RY0,FR),css(s[1],RY0,FR),(s[1]-s[0]+1)/FR))
print("\n== CAPTURE : colonne x=%d (homologue : meme %% de la feuille) =="%(13+int(800/1120*1053)))
XC=13+int(800/1120.0*1053)
for s in scan_col(c,XC,232,2151,FONDC):
    print("  px %d..%d  CSS %.2f..%.2f  h=%.2f"%(s[0],s[1],css(s[0],CY0,FC),css(s[1],CY0,FC),(s[1]-s[0]+1)/FC))
