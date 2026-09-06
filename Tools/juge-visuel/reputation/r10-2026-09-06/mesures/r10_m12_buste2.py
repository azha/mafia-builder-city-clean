# r10-m12 : geometrie du buste, masques nettoyes (marge de 14 px depuis le bord dore de la carte).
# Controle positif : le fond de carte n'appartient a aucun masque ; le liseré dore (158,158,126)
#   est exclu (marge) -> imprime la valeur u max du masque peau, qui doit etre << bord de carte.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080)),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074))}
def peau(p): r,g,b=p; return r>150 and g>140 and b>110 and r>b+20 and (r-g)<40
def creme(p): r,g,b=p; return r>205 and g>198 and b>168
def encre(p): r,g,b=p; return r<32 and g<32 and b<32
OUT={}
for k,(p,x0,y0,(cu0,cv0,cu1,cv1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n=== {k}  taille={im.size}  carte u[{cu0},{cu1}] v[{cv0},{cv1}] centre_u={(cu0+cu1)/2:.1f}")
    M={}
    for n,f in (("peau",peau),("creme",creme),("encre",encre)):
        pts=[(u,v) for v in range(cv0+14,cv1-13) for u in range(cu0+14,cu1-13) if f(px[x0+u,y0+v])]
        M[n]=pts
        us=[a for a,_ in pts]; vs=[b for _,b in pts]
        print(f"  {n:6s} n={len(pts):6d} u[{min(us)},{max(us)}] (l={max(us)-min(us)+1}) "
              f"v[{min(vs)},{max(vs)}] (h={max(vs)-min(vs)+1}) centre_u={sum(us)/len(us):.1f}")
    # largeur de la peau par ligne -> ligne la plus large (largeur du visage)
    from collections import defaultdict
    byv=defaultdict(list)
    for u,v in M["peau"]: byv[v].append(u)
    larg=[(max(us)-min(us)+1,v,min(us),max(us)) for v,us in byv.items()]
    larg.sort(reverse=True)
    print(f"  visage : ligne de peau la plus large = {larg[0][0]} px a v={larg[0][1]} (u {larg[0][2]}..{larg[0][3]})")
    # cou = peau sous le visage : lignes ou la largeur < 60% du max
    m=larg[0][0]
    cou=[(v,max(us)-min(us)+1,min(us),max(us)) for v,us in sorted(byv.items()) if (max(us)-min(us)+1)<0.6*m]
    if cou:
        print(f"  cou    : v {cou[0][0]}..{cou[-1][0]}  largeur {cou[len(cou)//2][1]} px  "
              f"centre_u={(cou[len(cou)//2][2]+cou[len(cou)//2][3])/2:.1f}")
    # visage seul (lignes larges)
    vis=[(v,min(us),max(us)) for v,us in sorted(byv.items()) if (max(us)-min(us)+1)>=0.6*m]
    print(f"  visage : v {vis[0][0]}..{vis[-1][0]}  h={vis[-1][0]-vis[0][0]+1}  "
          f"centre_u={sum((a+b)/2 for _,a,b in vis)/len(vis):.1f}")
    # col creme
    byv2=defaultdict(list)
    for u,v in M["creme"]: byv2[v].append(u)
    ks=sorted(byv2)
    print(f"  col    : v {ks[0]}..{ks[-1]}  largeur haut={max(byv2[ks[0]])-min(byv2[ks[0]])+1} "
          f"bas={max(byv2[ks[-1]])-min(byv2[ks[-1]])+1}  aire={len(M['creme'])} "
          f"remplissage={len(M['creme'])/((max(u for u,_ in M['creme'])-min(u for u,_ in M['creme'])+1)*(ks[-1]-ks[0]+1)):.3f}")
    OUT[k]=M
import pickle; pickle.dump(OUT,open("/tmp/buste2.pkl","wb"))
