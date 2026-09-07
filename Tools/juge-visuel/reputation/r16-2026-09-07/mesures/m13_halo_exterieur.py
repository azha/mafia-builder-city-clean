# m13 : le halo EXISTE-T-IL A L'EXTERIEUR du glyphe ? (les trous des "0" ne sont pas du rayonnement)
# Sonde : profil radial BRUT depuis le contour EXTERNE de l'encre, sans dilatation, en excluant
#         les pixels enclos par le glyphe (remplissage depuis le bord du domaine).
# Controle positif : la reference doit rendre une portee ~18 px. Controle negatif : le libelle creme
#         du meme compteur (texte sans halo declare) doit rendre une portee courte.
import sys; sys.path.insert(0,'.')
from lib import *
CYAN=(127,212,217)
def est_cyan(c,tol=28): return abs(c[0]-CYAN[0])<=tol and abs(c[1]-CYAN[1])<=tol and abs(c[2]-CYAN[2])<=tol

def profil_exterieur(nom,bx0,bx1,dy0,dy1,etiq,test=est_cyan):
    im=ouvrir(nom); px=im.load()
    W=bx1-bx0+1; H=dy1-dy0+1
    ink=[[test(px[bx0+x,dy0+y]) for x in range(W)] for y in range(H)]
    if not any(any(r) for r in ink):
        print("  == %s == aucune encre" % etiq); return
    # exterieur = composante connexe du fond touchant le bord du domaine (4-connexite)
    ext=[[False]*W for _ in range(H)]
    pile=[]
    for x in range(W):
        for y in (0,H-1):
            if not ink[y][x] and not ext[y][x]: ext[y][x]=True; pile.append((x,y))
    for y in range(H):
        for x in (0,W-1):
            if not ink[y][x] and not ext[y][x]: ext[y][x]=True; pile.append((x,y))
    while pile:
        x,y=pile.pop()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            i,j=x+dx,y+dy
            if 0<=i<W and 0<=j<H and not ink[j][i] and not ext[j][i]:
                ext[j][i]=True; pile.append((i,j))
    enclos=sum(1 for y in range(H) for x in range(W) if not ink[y][x] and not ext[y][x])
    # distance de Chebyshev a l'encre, restreinte a l'exterieur
    INF=10**6
    d=[[0 if ink[y][x] else INF for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if d[y][x]==0: continue
            m=INF
            for dy,dx in ((-1,-1),(-1,0),(-1,1),(0,-1)):
                j,i=y+dy,x+dx
                if 0<=j<H and 0<=i<W and d[j][i]+1<m: m=d[j][i]+1
            d[y][x]=min(d[y][x],m)
    for y in range(H-1,-1,-1):
        for x in range(W-1,-1,-1):
            if d[y][x]==0: continue
            m=d[y][x]
            for dy,dx in ((1,1),(1,0),(1,-1),(0,1)):
                j,i=y+dy,x+dx
                if 0<=j<H and 0<=i<W and d[j][i]+1<m: m=d[j][i]+1
            d[y][x]=m
    fond={y: mediane([lum(px[x,y]) for x in range(bx0,bx1+1)]) for y in range(dy0,dy1+1)}
    P={}
    for dd in range(1,31):
        v=[lum(px[bx0+x,dy0+y])-fond[dy0+y] for y in range(H) for x in range(W) if d[y][x]==dd and ext[y][x]]
        P[dd]=sum(v)/len(v) if v else None
    portee=max([k for k in P if P[k] is not None and P[k]>0.5] or [0])
    mi=None
    if P[1]:
        for k in range(1,31):
            if P.get(k) is not None and P[k]>=0.5*P[1]: mi=k
    print("  == %s ==  encre=%d px, pixels ENCLOS (trous des glyphes, exclus)=%d" % (etiq, sum(sum(1 for v in r if v) for r in ink), enclos))
    print("     P_ext(d) :", " ".join("d%d=%s"%(k,("%.2f"%P[k]) if P[k] is not None else "-") for k in range(1,21)))
    print("     PORTEE exterieure = %d px ; mi-valeur = %s px" % (portee, mi))
    # masse d'exces dans les trous ENCLOS (pour dire ou vit le peu qui existe)
    mtr=sum(max(0.0,lum(px[bx0+x,dy0+y])-fond[dy0+y]) for y in range(H) for x in range(W) if (not ink[y][x] and not ext[y][x]))
    mex=sum(max(0.0,lum(px[bx0+x,dy0+y])-fond[dy0+y]) for y in range(H) for x in range(W) if ext[y][x])
    print("     masse d'exces : dans les TROUS = %.0f pts | a l'EXTERIEUR = %.0f pts" % (mtr,mex))
    return P

print("### CONTROLE POSITIF — reference, compteur 1 ###")
profil_exterieur('reference-1080x2102.png',56,356,706,781,'ref c1')
print("\n### CAPTURE 2400 — compteur 1 ###")
profil_exterieur('capture-1080x2400.png',52,354,731,805,'jeu2400 c1')
print("\n### CAPTURE 1920 — compteur 1 ###")
profil_exterieur('capture-1080x1920.png',52,354,499,573,'jeu1920 c1')
print("\n### CAPTURE 2400 — compteur 2 (00/4) ###")
profil_exterieur('capture-1080x2400.png',388,690,731,805,'jeu2400 c2')
print("\n### CONTROLE NEGATIF — libelle creme 'REGLES DONNEES' (aucun halo attendu), reference ###")
CREME=(234,224,200)
def est_creme(c,tol=40): return all(abs(c[i]-CREME[i])<=tol for i in range(3))
profil_exterieur('reference-1080x2102.png',56,356,783,812,'ref libelle', test=est_creme)
