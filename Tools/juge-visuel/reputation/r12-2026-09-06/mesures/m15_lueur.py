import sys; sys.path.insert(0,'.')
from lib import *
print("=== m15 : lueur autour des chiffres cyan — exces de luminance par distance de Chebyshev ===")
# boites des compteurs : REF x 78..315 (1er), y 703..813 ; JEU x 78..315, y 729..839
def analyse(im, x0,y0,x1,y1, nom):
    p=px(im)
    # encre = pixels tres clairs
    vals=sorted(lum(p[x,y]) for y in range(y0,y1) for x in range(x0,x1))
    fond=vals[len(vals)//4]; haut=vals[-20]
    seuil=fond+0.7*(haut-fond)
    encre=set((x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>=seuil)
    if not encre: print(f"  {nom}: pas d'encre"); return
    # distance de Chebyshev a l'encre
    import collections
    dist={}
    frontier=set(encre)
    seen=set(encre)
    d=0
    while d<20 and frontier:
        nxt=set()
        for (x,y) in frontier:
            for dx in(-1,0,1):
                for dy in(-1,0,1):
                    q=(x+dx,y+dy)
                    if q in seen: continue
                    if not (x0<=q[0]<x1 and y0<=q[1]<y1): continue
                    nxt.add(q)
        d+=1
        for q in nxt: dist[q]=d
        seen |= nxt
        frontier = nxt
    # fond de reference : pixels a d>=18 ou hors zone -> on prend le 25e centile
    base = fond
    print(f"  {nom}: fond={fond:.1f} encre_seuil={seuil:.1f} n_encre={len(encre)}")
    out=[]
    for dd in (2,4,6,8,10,12,14,16):
        px_ = [q for q,v in dist.items() if v==dd]
        if not px_: out.append((dd,None,0)); continue
        m = sum(lum(p[q[0],q[1]]) for q in px_)/len(px_)
        out.append((dd, round(m-base,2), len(px_)))
    print("     exces (d, moyenne-fond, n) : " + " ".join(f"d{d}:{v}({n})" for d,v,n in out))
    return out

ref=ouvrir('../reference-1080x2102.png')
cap=ouvrir('../capture-1080x2400.png')
print("-- compteur 1 « 00 » (REGLES DONNEES) --")
analyse(ref, 120,700,280,760, 'REF')
analyse(cap, 120,626,280,686, 'JEU')
print("-- compteur 3 (ENFREINTES) --")
analyse(ref, 760,700,920,760, 'REF')
analyse(cap, 760,626,920,686, 'JEU')
