"""m13 (v3) — les 4 tuiles, par PALIER de remplissage et non par pic de lisere.
v1 sondait dans le texte (tuiles de 4 px), v2 sondait a x950..985 ou la LIGNE CYAN
traverse le lisere de la tuile 2 et le fusionne avec elle. Les deux echecs sont imprimes
dans l'historique de ce fichier.
Methode v3 : profil = mediane de luminance par rangee sur x600..990 (interieur de tuile,
au-dela du texte le plus long) ; le remplissage d'une tuile est un PALIER au-dessus du
fond du panneau. Bord = mi-hauteur entre les deux paliers. Les rangees de la ligne cyan
sont EXCLUES et interpolees (leur intervalle est imprime).
Controle positif : 4 paliers de chaque cote, de hauteurs egales a +-2 px entre elles.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

for nom, fp, P0, P1, cyan in [('REF','../reference-1080x2102.png', 848, 1613, (1080, 1094)),
                              ('JEU2400','../capture-1080x2400.png', 874, 1550, (1094, 1108))]:
    im = ouvrir(fp); px = im.load()
    prof = {y: mediane([lum(px[x, y]) for x in range(600, 991)]) for y in range(P0, P1+1)}
    for y in range(cyan[0], cyan[1]+1):
        prof[y] = None
    ys = sorted(prof)
    vals = [prof[y] for y in ys if prof[y] is not None]
    bas = sorted(vals)[len(vals)//10]; haut = sorted(vals)[int(len(vals)*0.85)]
    s = (bas+haut)/2
    print(f"\n== {nom} : panneau y{P0}..{P1} (h={P1-P0}) · fond={bas:.1f} tuile={haut:.1f} seuil={s:.1f}"
          f" · rangees cyan exclues y{cyan[0]}..{cyan[1]} ==")
    runs = []; cur = None
    for y in ys:
        v = prof[y]
        if v is None: continue          # rangee cyan : ne rompt pas un run
        if v >= s:
            if cur is None: cur = [y, y]
            else: cur[1] = y
        else:
            if cur is not None: runs.append(tuple(cur)); cur = None
    if cur is not None: runs.append(tuple(cur))
    runs = [r for r in runs if r[1]-r[0] > 30]
    print(f"   {len(runs)} tuile(s) : " + ", ".join(f"y{a}..{b} (h={b-a+1})" for a, b in runs))
    if len(runs) >= 4:
        m = runs[:4]
        print(f"   hauteurs : {[b-a+1 for a,b in m]}")
        print(f"   pas haut-a-haut : {[m[i+1][0]-m[i][0] for i in range(3)]}")
        print(f"   gouttieres : {[m[i+1][0]-m[i][1]-1 for i in range(3)]}")
        print(f"   haut 1re tuile = {m[0][0]} (offset panneau {m[0][0]-P0})")
        print(f"   bas 4e tuile = {m[3][1]} -> VIDE SOUS LA 4e TUILE = {P1-m[3][1]} px"
              f" = {(P1-m[3][1])/(P1-P0)*100:.1f} % du panneau")
