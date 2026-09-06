# m06 — LE SOMMET DE LA COIFFE (grandeur 2 du r12) — instrument RANGEE PAR RANGEE (aucune connexite).
#
# Pourquoi un second instrument : dans m05 la ligne de balayage COUPE la silhouette (la coiffe eclairee
# par la ligne tombe du cote du fond) et la composante connexe repart d'en dessous -> sommet faux.
# Une premiere version de m06 a echoue AUTREMENT : le seuil « dist au fond > 12 » ne separe PAS la coiffe
# du fond de carte (JEU : coiffe (22,22,28) vs fond (13,22,34), Chebyshev = 9 ; contour (13,13,22) = 12)
#   -> silhouette VIDE au-dessus de la ligne, et le « sommet » trouve etait la ligne elle-meme.
#   Les deux echecs sont imprimes ici pour que le lecteur sache ce que l'instrument NE fait pas.
# Isolement retenu : classement au plus PROCHE nominal (m05), applique RANGEE PAR RANGEE dans une
#   fenetre x centree sur la tete ; SILHOUETTE := classe != 'fond'. Les rangees de la ligne de balayage
#   sont EXCLUES (pas de connexite a preserver, donc l'exclusion ne coute que ces rangees-la).
# Controle positif : largeur max de la silhouette de tete ~152-153 px (valeur de m05, autre instrument).
# Controle negatif : une rangee 3 px sous le filet bas de la carte doit rendre une silhouette VIDE.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

NOM = {
 'REF': dict(fond=(17,24,35), peau=(185,173,146), contour=(11,16,22), coiffe=(22,25,27), creme=(234,224,200)),
 'JEU': dict(fond=(13,22,34), peau=(185,173,146), contour=(13,13,22), coiffe=(22,22,28), creme=(234,224,200)),
}
def cls(c, noms):
    best=None
    for k,v in noms.items():
        d=(c[0]-v[0])**2+(c[1]-v[1])**2+(c[2]-v[2])**2
        if best is None or d<best[1]: best=(k,d)
    return best[0]

def etude(im, nom, cle, xfen, ycherche, bande, ycarte_bas):
    p=px(im); noms=NOM[cle]; fx0,fx1=xfen; b0,b1=bande
    print(f"\n=== {nom} — sommet ===   fenetre x {fx0}..{fx1} ; rangees de balayage exclues {b0}..{b1}")
    lg={}
    for y in range(*ycherche):
        if b0<=y<=b1: continue
        xs=[x for x in range(fx0,fx1) if cls(p[x,y],noms)!='fond']
        if xs: lg[y]=max(xs)-min(xs)+1
    ys=[y for y in sorted(lg) if lg[y]>=8]
    ytop=ys[0]; wmax=max(lg[y] for y in ys); seuil=0.80*wmax
    prem=min(y for y in ys if lg[y]>=seuil)
    print(f"  sommet y={ytop} ; largeur max {wmax} px [controle positif : m05 rend 152-153]")
    print(f"  80 % ({seuil:.1f}) atteint a y={prem}  ->  **{prem-ytop} px** sous le sommet")
    pr=[]
    for d in (4,8,16,32):
        y=ytop+d
        pr.append(f"{d} px:{lg[y]} ({100*lg[y]/wmax:.1f} %)" if y in lg else f"{d} px:[exclue]")
    print("  pincement : " + " · ".join(pr))
    print("  profil (d:largeur) : " + " ".join(f"{y-ytop}:{lg[y]}" for y in range(ytop,ytop+70,2) if y in lg))
    xs=[x for x in range(fx0,fx1) if cls(p[x,ycarte_bas],noms)!='fond']
    print(f"  [controle negatif] y={ycarte_bas} (sous la carte) : px de silhouette = {len(xs)}")
    return ytop,wmax,prem-ytop

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
R=etude(ref,'REFERENCE','REF',(180,410),(990,1240),(1078,1095),1526)
C=etude(cap,'CAPTURE 2400','JEU',(176,406),(1010,1266),(1093,1110),1554)
print(f"\n--- grandeur 2 : sommet a 80 % du max : REF **{R[2]} px** / JEU **{C[2]} px**  (r12 : 30 -> 17) ---")
