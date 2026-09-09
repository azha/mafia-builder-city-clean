# m18 — inventaire géométrique des blocs de la CAPTURE (sous chrome) et de leurs homologues en RÉF.
# Convention de bord : épaisseur = nb de px consécutifs de la couleur du liseré sur un profil
# perpendiculaire pris au MILIEU du côté (jamais dans un coin).
from util import *
print("== m18 blocs ==")
cap=ouvrir(CAP); pc=cap.load()
ref=ouvrir(REF); pr=ref.load()

def bbox_non_fond(im,fen,fond,seuil=18):
    px=im.load(); x0,y0,x1,y1=fen; mnx,mny,mxx,mxy,n=10**9,10**9,-1,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>seuil:
                n+=1;mnx=min(mnx,x);mxx=max(mxx,x);mny=min(mny,y);mxy=max(mxy,y)
    return (mnx,mny,mxx,mxy,n) if n else None

# --- CAP : bulle (panneau gris sombre) ---
b=bbox_non_fond(cap,(200,1620,1080,1810),(13,13,13))
print(f"  CAP panneau 'bulle' bbox=({b[0]},{b[1]})-({b[2]},{b[3]}) {b[2]-b[0]+1}x{b[3]-b[1]+1} rempl={mediane_fenetre(cap,(b[0]+b[2])//2,b[1]+20,5)}")
print(f"     coins = {[pc[b[0],b[1]],pc[b[2],b[1]],pc[b[0],b[3]],pc[b[2],b[3]]]}")
print(f"     profil horizontal y={(b[1]+b[3])//2} autour du bord gauche : {[(x,pc[x,(b[1]+b[3])//2]) for x in range(b[0]-6,b[0]+7)]}")
# queue de bulle ? colonnes entre le carré saumon (fin x=185) et le panneau (début b[0])
print(f"     entre le carré saumon (x≤185) et le panneau (x={b[0]}) : px non-fond ? "
      f"{sum(1 for y in range(b[1],b[3]) for x in range(186,b[0]) if abs(pc[x,y][0]-13)+abs(pc[x,y][1]-13)+abs(pc[x,y][2]-13)>18)} px  (queue attendue en réf)")

# --- CAP : carré 'parle' ---
c=bbox_non_fond(cap,(0,1620,200,1810),(13,13,13))
print(f"  CAP carré 'parle' bbox=({c[0]},{c[1]})-({c[2]},{c[3]}) {c[2]-c[0]+1}x{c[3]-c[1]+1} rempl={mediane_fenetre(cap,(c[0]+c[2])//2,(c[1]+c[3])//2,5)} coins={[pc[c[0],c[1]],pc[c[2],c[1]],pc[c[0],c[3]],pc[c[2],c[3]]]}")

# --- CAP : filet archives ---
f=bbox_non_fond(cap,(0,1995,1080,2130),(13,13,13))
print(f"  CAP filet archives bbox=({f[0]},{f[1]})-({f[2]},{f[3]}) {f[2]-f[0]+1}x{f[3]-f[1]+1} rempl={mediane_fenetre(cap,60,(f[1]+f[3])//2,5)} coins={[pc[f[0],f[1]],pc[f[2],f[1]],pc[f[0],f[3]],pc[f[2],f[3]]]}")
print(f"     profil horizontal y={(f[1]+f[3])//2} bord gauche : {[(x,pc[x,(f[1]+f[3])//2]) for x in range(f[0]-4,f[0]+8)]}")

# --- RÉF : bulle ---
# la bulle est le rectangle bleuté à droite ; on la trouve par sa couleur de fond (~ (20,29,45))
print(f"  RÉF bulle : médiane intérieure (700,1300) = {mediane_fenetre(ref,700,1300,6)}")
bb=bbox_non_fond(ref,(280,1180,1080,1580),(8,12,19),26)
print(f"  RÉF bulle bbox≈({bb[0]},{bb[1]})-({bb[2]},{bb[3]}) {bb[2]-bb[0]+1}x{bb[3]-bb[1]+1}")
print(f"     profil horizontal y=1300 bord gauche : {[(x,pr[x,1300]) for x in range(292,312,2)]}")
# --- RÉF : filet ---
ff=bbox_non_fond(ref,(0,1930,1080,2070),(8,12,19),22)
print(f"  RÉF filet bbox≈({ff[0]},{ff[1]})-({ff[2]},{ff[3]}) {ff[2]-ff[0]+1}x{ff[3]-ff[1]+1}")
print(f"     profil horizontal y=2000 bord gauche : {[(x,pr[x,2000]) for x in range(36,60,2)]}")
