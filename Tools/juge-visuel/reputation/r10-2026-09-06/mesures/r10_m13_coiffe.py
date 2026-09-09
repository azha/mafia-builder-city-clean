# r10-m13 : LA MESURE DUE sur la calotte/coiffe.
#  (a) largeur de calotte / largeur de tete ; (b) hauteur d'attache (ou la calotte rejoint le
#  visage) en % de la hauteur du visage ; (c) epaisseur laterale, cote gauche et cote droit.
# Controle positif : la largeur du VISAGE remesuree ici doit valoir celle de m12 (126 / 138).
from PIL import Image
from collections import defaultdict
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080)),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074))}
def peau(p): r,g,b=p; return r>150 and g>140 and b>110 and r>b+20 and (r-g)<40
def encre(p): r,g,b=p; return r<32 and g<32 and b<32
for k,(p,x0,y0,(cu0,cv0,cu1,cv1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    P=defaultdict(list); E=defaultdict(list)
    for v in range(cv0+14,cv1-13):
        for u in range(cu0+14,cu1-13):
            c=px[x0+u,y0+v]
            if peau(c): P[v].append(u)
            elif encre(c): E[v].append(u)
    lmax=max(max(us)-min(us)+1 for us in P.values())
    vis=[v for v,us in P.items() if max(us)-min(us)+1>=0.6*lmax]
    vtop,vbot=min(vis),max(vis); hvis=vbot-vtop+1
    print(f"\n=== {k} taille={im.size}")
    print(f"  CONTROLE POSITIF largeur visage = {lmax} px (m12 : REF 126 / CAP 138)")
    print(f"  visage v[{vtop},{vbot}] h={hvis}")
    # (a) largeur de calotte = extension max de l'encre AU-DESSUS du sommet du visage
    au=[ (v, min(us), max(us), max(us)-min(us)+1) for v,us in sorted(E.items()) if v<vtop ]
    lc=max(a[3] for a in au); vlc=[a for a in au if a[3]==lc][0]
    print(f"  calotte : sommet v={au[0][0]}  hauteur au-dessus du visage={vtop-au[0][0]} px")
    print(f"  (a) LARGEUR DE CALOTTE = {lc} px (a v={vlc[0]}, u {vlc[1]}..{vlc[2]})"
          f"   ->  calotte/visage = {lc/lmax:.3f}")
    # (b) hauteur d'attache : derniere ligne (la plus basse) ou de l'encre existe A GAUCHE
    #     ET A DROITE de la peau, en % de la hauteur du visage a partir du sommet
    attg=attd=None
    for v in range(vtop,vbot+1):
        if v not in P or v not in E: continue
        pu0,pu1=min(P[v]),max(P[v])
        g=[u for u in E[v] if u<pu0 and u>pu0-60]
        d=[u for u in E[v] if u>pu1 and u<pu1+60]
        if g: attg=(v,len(g),max(g))
        if d: attd=(v,len(d),min(d))
    print(f"  (b) ATTACHE gauche : v={attg[0]} = {100*(attg[0]-vtop)/hvis:5.1f} % de la hauteur du visage")
    print(f"      ATTACHE droite : v={attd[0]} = {100*(attd[0]-vtop)/hvis:5.1f} %")
    # (c) epaisseur laterale a 3 hauteurs (25/50/75 % du visage)
    for f in (0.15,0.30,0.50):
        v=int(vtop+f*hvis)
        if v in P and v in E:
            pu0,pu1=min(P[v]),max(P[v])
            g=[u for u in E[v] if u<pu0 and u>pu0-70]; d=[u for u in E[v] if u>pu1 and u<pu1+70]
            print(f"  (c) a {int(f*100):3d} % du visage (v={v}) : epaisseur G={len(g):3d} px  D={len(d):3d} px"
                  f"   (peau u {pu0}..{pu1})")
        else:
            print(f"  (c) a {int(f*100):3d} % du visage (v={v}) : pas de peau/encre")
