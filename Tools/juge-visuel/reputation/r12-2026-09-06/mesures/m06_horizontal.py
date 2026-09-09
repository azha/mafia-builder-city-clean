import sys; sys.path.insert(0,'.')
from lib import *

def pics_colonne(im, ys, x0, x1, dl=3.0):
    p = px(im)
    prof=[]
    for x in range(x0,x1):
        v = sum(lum(p[x,y]) for y in ys)/len(ys)
        prof.append(v)
    out=[]
    for i in range(2,len(prof)-2):
        if prof[i]-min(prof[i-2],prof[i+2])>dl and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]:
            if out and x0+i-out[-1][0]<=4: continue
            out.append((x0+i, round(prof[i],1)))
    return out

# bandes horizontales (en coordonnees ABSOLUES) ou couper
CAS = [
 ('REF   ','../reference-1080x2102.png', 452, 1626),
 ('C2400 ','../capture-1080x2400.png',   482, 1627),
 ('C1920 ','../capture-1080x1920.png',   250, 1379),
 ('S2400 ','../capture-ecran-seul-1080x2400.png', 730, 1379),
]
print("=== m06 : geometrie horizontale, par bande ===")
for nom,f,ct,h in CAS:
    im = ouvrir(f)
    print(f"  --- {nom} (cadre top={ct}, h={h}) ---")
    # bande compteurs (rel 280..340)
    ys = range(ct+280, ct+340)
    print(f"    compteurs   : {pics_colonne(im, ys, 20, 1070)}")
    # bande tuiles : rel 610..640  (une tuile)
    ys = range(ct+560, ct+600)
    print(f"    tuile 1     : {pics_colonne(im, ys, 20, 1070)}")
    # bande carte portrait : rel 430..470
    ys = range(ct+430, ct+470)
    print(f"    carte+col.d : {pics_colonne(im, ys, 20, 1070)}")
