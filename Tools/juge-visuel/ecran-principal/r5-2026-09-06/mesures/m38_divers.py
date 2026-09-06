# (a) nom de district : bbox, capitale, marge au bord, contraste sur le ciel reel
# (b) indicateur d'onglet actif du dock (canon : barre laiton 14x2 CSS a x=94, sous le rond)
#     CONTROLE NEGATIF : la meme sonde DOIT trouver la barre sur la reference.
# (c) pastille de notification sur FAMILLE (canon : rond or en haut a droite du rond)
from txt import *
print('--- (a) nom de district ---')
c=op(C24)
cols,base=colonnes(c,(0,275,300,315),40)
segs=segments(cols,gap=10,minw=2)
ys=[y for x,yy in cols for y in yy]
xs=[x for x,yy in cols if yy]
print(f'  CAP2400 "La Lisiere" : x {min(xs)}..{max(xs)} = {min(xs)/CAP_S:.2f}..{(max(xs)+1)/CAP_S:.2f} CSS ; y {min(ys)}..{max(ys)} = {min(ys)/CAP_S:.2f}..{(max(ys)+1)/CAP_S:.2f} CSS ; capitale {(max(ys)-min(ys)+1)/CAP_S:.2f} CSS ; marge gauche {min(xs)/CAP_S:.2f} CSS')
px=c.load()
enc=max(((x,y) for x,yy in cols for y in yy), key=lambda p: lum(px[p]))
fond=med(c,200,280,260,300)
print(f'  encre la + claire {px[enc]} ; ciel autour {fond} ; contraste {contrast(px[enc],fond):.2f}:1')
print('--- (b) indicateur d onglet actif ---')
def laiton_fenetre(im,box,scale,label,cible=(176,141,62),tol=45):
    px=im.load(); pts=[(x,y) for y in range(box[1],box[3]) for x in range(box[0],box[2])
                       if all(abs(px[x,y][i]-cible[i])<tol for i in range(3))]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print(f'  {label}: {len(pts)} px laiton ; x {min(xs)/scale:.2f}..{(max(xs)+1)/scale:.2f} CSS ; y {min(ys)/scale:.2f}..{(max(ys)+1)/scale:.2f} CSS')
    else:
        print(f'  {label}: 0 pixel laiton')
r=op(REF)
laiton_fenetre(r,(255,1955,310,1985),REF_S,'REF sous EMPIRE (CONTROLE NEGATIF, doit trouver)')
laiton_fenetre(c,(180,2270,240,2305),CAP_S,'CAP2400 sous EMPIRE (memes bornes CSS ~85..87 / 823..836)')
laiton_fenetre(c,(150,2255,280,2310),CAP_S,'CAP2400 sous EMPIRE (fenetre ELARGIE)')
c19=op(C19)
laiton_fenetre(c19,(150,1670,280,1730),CAP_S,'CAP1920 sous EMPIRE (fenetre elargie)')
print('--- (c) pastille FAMILLE ---')
laiton_fenetre(r,(520,1840,570,1880),REF_S,'REF pastille (CONTROLE NEGATIF)',(217,171,78),50)
laiton_fenetre(c,(470,2145,540,2200),CAP_S,'CAP2400 pastille (zone haut-droite du 2e rond)',(217,171,78),50)
