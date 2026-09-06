# r10-m19 : chaque primitive du SVG (generateur-reputation.py:105-145) mesuree en UNITES SVG.
#  Echelle : le buste occupe 62 u de large pour w=96 CSS -> 1,5484 CSS/u -> 5,574 px/u a x3,6.
#  Ancrage : v du BAS du torse (y=78) et u du CENTRE de la figure (x=31), tous deux mesures.
# Controle positif : la HAUTEUR totale de l'encre doit rendre la meme echelle px/u des deux cotes.
from PIL import Image
from collections import defaultdict
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080)),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074))}
def peau(p): r,g,b=p; return r>150 and g>140 and b>110 and r>b+20 and (r-g)<40 and not(r>205 and g>198 and b>168)
def creme(p): r,g,b=p; return r>205 and g>198 and b>168
def encre(p): r,g,b=p; return r<32 and g<32 and b<32
def gant(p): r,g,b=p; return abs(r-35)<9 and abs(g-42)<9 and abs(b-45)<9
for k,(p,x0,y0,(cu0,cv0,cu1,cv1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    M={n:defaultdict(list) for n in ("peau","creme","encre","gant")}
    for v in range(cv0+14,cv1-13):
        for u in range(cu0+14,cu1-13):
            c=px[x0+u,y0+v]
            if gant(c): M["gant"][v].append(u)
            elif creme(c): M["creme"][v].append(u)
            elif peau(c): M["peau"][v].append(u)
            elif encre(c): M["encre"][v].append(u)
    ev=sorted(M["encre"]); etop,ebot=ev[0],ev[-1]
    eu=[u for us in M["encre"].values() for u in us]
    # echelle : encre = y de 10-0,9 a 78+1 (trait centre) = 68,9 u  (REF) ; on la MESURE
    ech=(ebot-etop+1)/68.9
    cu=(min(eu)+max(eu))/2
    print(f"\n=== {k} taille={im.size}")
    print(f"  encre v[{etop},{ebot}] h={ebot-etop+1} px  -> echelle mesuree = {ech:.3f} px/u"
          f"  (attendu 5,574)   centre_u encre = {cu:.1f}")
    v78 = ebot-1*ech   # y=78 = bas du torse (trait 2 centre -> +1 u)
    def U(x): return None
    def to_u(x_units, uref, ech): return uref + (x_units-31)*ech
    # visage : peau la plus large
    lp={v:(min(us),max(us)) for v,us in M["peau"].items() if len(us)>5}
    lmax=max(b-a+1 for a,b in lp.values())
    vw=[v for v,(a,b) in lp.items() if b-a+1==lmax][0]
    print(f"  VISAGE (ellipse rx=12,5 sw=2)   : remplissage {lmax} px = {lmax/ech:5.2f} u"
          f"   (trait CENTRE -> 23,0 u ; trait EXTERIEUR -> 25,0 u)   a v={vw}")
    # cou : rect 10 u de large, y 48..58 ; pris juste sous le menton
    vis=[v for v,(a,b) in lp.items() if b-a+1>=0.6*lmax]
    vbot=max(vis)
    ech_v=ech
    cand=[v for v in sorted(lp) if vbot+3<v<vbot+3+int(6*ech_v)]
    lc=[lp[v][1]-lp[v][0]+1 for v in cand]
    print(f"  COU (rect 10 u, sans trait)     : {sorted(lc)[len(lc)//2]} px = {sorted(lc)[len(lc)//2]/ech:5.2f} u"
          f"   (attendu 10,0 u)   sur {len(cand)} lignes v {cand[0]}..{cand[-1]}")
    # col creme : triangle 14 u de large en haut, 14 u de haut, sw=1,6
    cv=sorted(M["creme"]); a,b=min(M["creme"][cv[0]]),max(M["creme"][cv[0]])
    print(f"  COL (triangle 14 u, sw=1,6)     : largeur haut {b-a+1} px = {(b-a+1)/ech:5.2f} u"
          f"   hauteur {cv[-1]-cv[0]+1} px = {(cv[-1]-cv[0]+1)/ech:5.2f} u   (trait CENTRE -> ~11 u ; trait EXTERIEUR -> 14,0 u)")
    # torse
    print(f"  TORSE (path 50 u, sw=2)         : largeur {max(eu)-min(eu)+1} px = {(max(eu)-min(eu)+1)/ech:5.2f} u"
          f"   (trait CENTRE -> 52,0 u ; trait EXTERIEUR -> 54,0 u)")
    # gant : ellipse cx=12 cy=75 rx=5 ry=3,4 sw=1,2
    if M["gant"]:
        gv=sorted(M["gant"]); gu=[u for us in M["gant"].values() for u in us]
        gx=(min(gu)+max(gu))/2; gy=(gv[0]+gv[-1])/2
        print(f"  GANT (ellipse rx=5 ry=3,4)      : {max(gu)-min(gu)+1} x {gv[-1]-gv[0]+1} px "
              f"= {(max(gu)-min(gu)+1)/ech:.2f} x {(gv[-1]-gv[0]+1)/ech:.2f} u   (trait CENTRE -> 8,8 x 5,6 u ; EXT -> 11,2 x 8,0 u)")
        print(f"       centre : u={gx:.1f} -> x_svg={31+(gx-cu)/ech:5.2f} u (attendu 12,0)"
              f"   v={gy:.1f} -> y_svg={78+(gy-ebot)/ech+1:5.2f} u (attendu 75,0)")
        # combien du gant deborde du torse ? (pixels de gant a gauche du bord du torse)
        deb=0
        for v,us in M["gant"].items():
            eus=M["encre"].get(v,[])
            if eus:
                deb+=len([u for u in us if u<min(eus)])
        print(f"       pixels de gant A GAUCHE du bord d'encre du torse : {deb}")
