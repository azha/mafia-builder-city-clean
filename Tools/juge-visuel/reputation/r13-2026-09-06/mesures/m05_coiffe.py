# m05 — LA COIFFE : les trois grandeurs du r12, avec la methode d'isolement DECLAREE.
#
# ISOLEMENT (declare, convention de bord = plus PROCHE nominal, ce qui bascule a mi-chemin
# entre deux teintes nominales — la « mi-alpha nominal » du r12) :
#   chaque px de la carte est classe par la plus courte distance euclidienne RGB parmi les
#   cinq matieres NOMINALES relevees a l'histogramme de la carte (m02) :
#       REF  fond(17,24,35) peau(185,173,146) contour(11,16,22) coiffe(22,25,27) creme(234,224,200)
#       JEU  fond(13,22,34) peau(185,173,146) contour(13,13,22) coiffe(22,22,28) creme(234,224,200)
#   SOMBRE := {contour, coiffe}.  Aucune frange n'est laissee « sans classe » : c'est ce qui faisait
#   rendre 0 a la marche laterale d'une premiere version de ce script (piege verifie ici meme).
#   VISAGE := la plus grande composante connexe de PEAU (le cou y est attache ; les rangees de
#   largeur >= 60 px sont le visage, le cou fait 54-56 px). Le libelle « LT. … » est une AUTRE
#   composante, plus petite -> ecarte sans reglage de seuil.
#   TETE := la composante connexe de (PEAU u SOMBRE) qui contient le visage, bornee au-dessus du menton.
# ⚠️ LA LIGNE DE BALAYAGE rend la coiffe (45,67,69)/(54,89,93) — plus proche du FOND que de la coiffe.
#   Ses rangees sont EXCLUES et imprimees. Elles ne touchent aucune des trois grandeurs (verifie).
#
# Controle positif : largeur max du visage ~126 px (REF) / ~137 px (JEU) — r12 m10 ; hauteur ~134/140.
# Controle negatif : la meme sonde sur une rangee du TORSE doit ne rendre que le cou (~54 px), pas le visage.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from collections import deque

NOM = {
 'REF': dict(fond=(17,24,35), peau=(185,173,146), contour=(11,16,22), coiffe=(22,25,27), creme=(234,224,200)),
 'JEU': dict(fond=(13,22,34), peau=(185,173,146), contour=(13,13,22), coiffe=(22,22,28), creme=(234,224,200)),
}
SOMBRE={'contour','coiffe'}

def classe_carte(im, carte, noms):
    p=px(im); cx0,cx1,cy0,cy1=carte
    items=list(noms.items())
    cl={}
    for y in range(cy0,cy1):
        for x in range(cx0,cx1):
            c=p[x,y]
            best=None
            for k,v in items:
                d=(c[0]-v[0])**2+(c[1]-v[1])**2+(c[2]-v[2])**2
                if best is None or d<best[1]: best=(k,d)
            cl[(x,y)]=best[0]
    return cl

def comp(cl, seeds, ok, carte):
    cx0,cx1,cy0,cy1=carte
    vu=set(); q=deque(seeds); vu.update(seeds)
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            n=(x+dx,y+dy)
            if n in vu: continue
            if not (cx0<=n[0]<cx1 and cy0<=n[1]<cy1): continue
            if cl.get(n) in ok: vu.add(n); q.append(n)
    return vu

def composantes(cl, carte, ok):
    cx0,cx1,cy0,cy1=carte
    vus=set(); res=[]
    for y in range(cy0,cy1):
        for x in range(cx0,cx1):
            if (x,y) in vus or cl[(x,y)] not in ok: continue
            c=comp(cl,[(x,y)],ok,carte); vus|=c; res.append(c)
    res.sort(key=len, reverse=True); return res

def etude(im, nom, cle, carte, ligne):
    print(f"\n=== {nom} — coiffe ===")
    noms=NOM[cle]; cl=classe_carte(im,carte,noms); cx0,cx1,cy0,cy1=carte
    ly0,ly1=ligne
    print(f"  carte interieure x {cx0}..{cx1}, y {cy0}..{cy1} ; rangees de balayage exclues {ly0}..{ly1}")
    cps=composantes(cl,carte,{'peau'})
    print(f"  composantes PEAU (5 plus grandes, en px) : {[len(c) for c in cps[:5]]}")
    visage=cps[0]
    lignes={}
    for (x,y) in visage: lignes.setdefault(y,[]).append(x)
    spans={y:(min(v),max(v),max(v)-min(v)+1) for y,v in lignes.items()}
    rf=sorted(y for y,s in spans.items() if s[2]>=60)
    yf0,yf1=rf[0],rf[-1]; Hf=yf1-yf0+1
    lmax=max(spans[y][2] for y in rf)
    print(f"  VISAGE : y {yf0}..{yf1} = {Hf} px ; largeur max {lmax} px   [controle positif]")
    # tete = composante (peau u sombre) contenant le visage
    tete=comp(cl,[next(iter(visage))],{'peau','contour','coiffe'},carte)
    lt={}
    for (x,y) in tete:
        if y<=yf1: lt.setdefault(y,[]).append(x)
    hs={y:(min(v),max(v),max(v)-min(v)+1) for y,v in lt.items()}
    ytop=min(hs)
    lg={y:w for y,(a,b,w) in hs.items() if not (ly0<=y<=ly1)}
    wmax=max(lg.values()); seuil=0.80*wmax
    prem=min(y for y,w in lg.items() if w>=seuil)
    print(f"  SOMMET de la tete y={ytop} ; largeur max {wmax} px ; 80 % ({seuil:.1f}) atteint a"
          f" y={prem}  ->  **{prem-ytop} px** sous le sommet")
    print("   pincement d px sous le sommet -> largeur (% du max) : " +
          " · ".join(f"{d}:{lg.get(ytop+d,'—')} ({100*lg[ytop+d]/wmax:.1f} %)" for d in (4,8,16,32) if ytop+d in lg))
    print("  EPAISSEUR LATERALE de sombre accolee a la peau (% de la hauteur du visage) :")
    ep={}
    for pct in (5,10,15,20,30,50):
        y=yf0+int(round(pct/100.0*Hf))
        if ly0<=y<=ly1 or y not in spans: print(f"    {pct:3d} % -> y={y} : [exclue]"); continue
        a,b,w=spans[y]
        g=0; x=a-1
        while x>cx0 and cl.get((x,y)) in SOMBRE: g+=1; x-=1
        d=0; x=b+1
        while x<cx1-1 and cl.get((x,y)) in SOMBRE: d+=1; x+=1
        ep[pct]=(g,d); print(f"    {pct:3d} % -> y={y} : gauche {g} px / droite {d} px")
    nu=[]
    for y in range(yf0, yf0+int(0.5*Hf)+1):
        if ly0<=y<=ly1 or y not in spans: continue
        a,b,w=spans[y]
        gn = cl.get((a-1,y))=='fond'
        dn = cl.get((b+1,y))=='fond'
        if gn or dn: nu.append((y,('G' if gn else '')+('D' if dn else '')))
    print(f"  RANGEES ou la peau touche le FOND sans contour (0..50 % du visage) : **{len(nu)}**")
    if nu:
        print(f"    y {nu[0][0]}..{nu[-1][0]} = {100*(nu[0][0]-yf0)/Hf:.0f} %..{100*(nu[-1][0]-yf0)/Hf:.0f} %"
              f" ; cotes {sorted(set(t[1] for t in nu))}")
    yt=yf1+120
    xs=[x for x in range(cx0,cx1) if cl.get((x,yt))=='peau']
    print(f"  [controle negatif] rangee du torse y={yt} : px de peau = {len(xs)} (le cou seul attendu)")
    return dict(Hf=Hf,lmax=lmax,sommet=prem-ytop,nu=len(nu),ep=ep,wmax=wmax,ytop=ytop,yf0=yf0,yf1=yf1)

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
R=etude(ref,'REFERENCE','REF',(85,502,880,1420),(1078,1095))
C=etude(cap,'CAPTURE 2400','JEU',(81,499,906,1450),(1093,1110))
print("\n--- RESUME (les trois grandeurs du r12) ---")
print(f"  1. epaisseur laterale a 15 %  : REF {R['ep'].get(15)} / JEU {C['ep'].get(15)}   (r12 : 19-20 -> 0)")
print(f"  2. sommet a 80 % de la largeur: REF {R['sommet']} px / JEU {C['sommet']} px      (r12 : 30 -> 17)")
print(f"  3. rangees de crane nu        : REF {R['nu']} / JEU {C['nu']}                    (r12 : 0 -> 8)")
print(f"  visage : REF {R['lmax']}x{R['Hf']} / JEU {C['lmax']}x{C['Hf']} ; tete large REF {R['wmax']} / JEU {C['wmax']}")
