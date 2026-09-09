import sys; sys.path.insert(0,'.')
from lib import *
print("=== m16 : halo des compteurs — encre, halo, centres, profil radial ===")
def etude(im, x0,y0,x1,y1, nom):
    p=px(im)
    L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//10]; haut=plat[-10]
    s_encre = fond+0.75*(haut-fond)
    s_halo  = fond+0.10*(haut-fond)
    encre=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>=s_encre]
    halo =[(x,y) for y in range(y0,y1) for x in range(x0,x1) if s_halo<=lum(p[x,y])<s_encre]
    def bb(s): 
        xs=[a for a,_ in s]; ys=[b for _,b in s]; return (min(xs),max(xs),min(ys),max(ys))
    def cen(s):
        return (sum(a for a,_ in s)/len(s), sum(b for _,b in s)/len(s))
    print(f"  {nom}: fond={fond:.1f} pic={haut:.1f} | seuil encre={s_encre:.1f} halo={s_halo:.1f}")
    print(f"     ENCRE n={len(encre)} bbox x{bb(encre)[0]}..{bb(encre)[1]} y{bb(encre)[2]}..{bb(encre)[3]} centre=({cen(encre)[0]:.1f},{cen(encre)[1]:.1f})")
    print(f"     HALO  n={len(halo)}  bbox x{bb(halo)[0]}..{bb(halo)[1]} y{bb(halo)[2]}..{bb(halo)[3]} centre=({cen(halo)[0]:.1f},{cen(halo)[1]:.1f})")
    ce=cen(encre); ch=cen(halo)
    print(f"     DECENTRAGE du halo par rapport a l'encre : dx={ch[0]-ce[0]:+.1f} px  dy={ch[1]-ce[1]:+.1f} px")
    ee=bb(encre); hh=bb(halo)
    print(f"     debord du halo : gauche {ee[0]-hh[0]:+d}, droite {hh[1]-ee[1]:+d}, haut {ee[2]-hh[2]:+d}, bas {hh[3]-ee[3]:+d} px")
    # profil : exces moyen par distance de Chebyshev a l'encre
    E=set(encre); dist={}; frontier=set(E); seen=set(E); d=0
    while d<26 and frontier:
        nxt=set()
        for (x,y) in frontier:
            for dx in(-1,0,1):
                for dy in(-1,0,1):
                    q=(x+dx,y+dy)
                    if q in seen or not (x0<=q[0]<x1 and y0<=q[1]<y1): continue
                    nxt.add(q)
        d+=1
        for q in nxt: dist[q]=d
        seen|=nxt; frontier=nxt
    prof=[]
    for dd in (2,4,6,8,10,12,16,20,24):
        s=[q for q,v in dist.items() if v==dd]
        prof.append((dd, round(sum(lum(p[q[0],q[1]]) for q in s)/len(s)-fond,2) if s else None, len(s)))
    print("     exces sur le fond, par distance : " + " ".join(f"d{d}:{v}(n={n})" for d,v,n in prof))
    return prof

ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
print("-- compteur 1 « 00 » --")
a=etude(ref, 60,706,338,800,'REF')
b=etude(cap, 56,732,332,826,'JEU')
print("-- compteur 3 (ENFREINTES : « 00 » en REF, « — » en JEU) --")
etude(ref, 692,706,970,800,'REF')
etude(cap, 690,732,966,826,'JEU')
