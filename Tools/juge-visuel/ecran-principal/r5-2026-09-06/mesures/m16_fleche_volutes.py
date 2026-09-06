# Grandeur : (a) bbox de la fleche retour et son contact avec le bord GAUCHE de l'ecran ;
#            (b) presence des volutes decoratives du canon (gauche x 5..28 CSS, droite x 364..392 CSS, y ~21..27 CSS).
# Controle NEGATIF pour (b) : la meme sonde DOIT trouver la volute sur la REFERENCE (sinon elle ne mesure rien).
from common import *
def bbox_clair(im,box,scale,label,seuil=45):
    px=im.load(); x0,y0,x1,y1=box
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    base=sorted(vals)[len(vals)//2]
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])-base>seuil]
    if not pts:
        print(f'  {label}: 0 pixel > fond({base:.0f})+{seuil}'); return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f'  {label}: {len(pts)} px ; x {min(xs)}..{max(xs)} = {min(xs)/scale:6.2f}..{(max(xs)+1)/scale:6.2f} CSS ; y {min(ys)}..{max(ys)} = {min(ys)/scale:6.2f}..{(max(ys)+1)/scale:6.2f} CSS ; L max={max(lum(px[x,y]) for x,y in pts):.0f} fond={base:.0f}')
    return min(xs),max(xs),min(ys),max(ys)
print('--- (a) fleche retour ---')
c=op(C24); bbox_clair(c,(0,60,90,140),CAP_S,'CAP2400 zone fleche (x 0..32.7 CSS)')
c19=op(C19); bbox_clair(c19,(0,60,90,140),CAP_S,'CAP1920 zone fleche')
print('--- (b) volutes : CONTROLE NEGATIF sur la reference ---')
r=op(REF)
bbox_clair(r,(10,55,90,85),REF_S,'REF volute GAUCHE (x 3.3..30 CSS, y 18.3..28.3)',20)
bbox_clair(r,(1085,55,1176,85),REF_S,'REF volute DROITE (x 361.7..392 CSS)',20)
print('--- (b) volutes dans les captures, MEME sonde, memes bornes CSS ---')
for nom,im in (('CAP2400',c),('CAP1920',c19),('TEMOIN',op(T24))):
    bbox_clair(im,(9,50,83,78),CAP_S,f'{nom} volute GAUCHE (3.3..30 CSS, 18.2..28.3)',20)
    bbox_clair(im,(996,50,1080,78),CAP_S,f'{nom} volute DROITE (361.7..392 CSS)',20)
