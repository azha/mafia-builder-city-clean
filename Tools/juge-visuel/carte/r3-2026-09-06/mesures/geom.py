# geom.py - repere commun. Conventions declarees :
#  * repere image : x vers la DROITE, y vers le BAS, origine coin haut-gauche.
#  * ANGLE : 0 deg = horizontale ; positif = HORAIRE a l'ecran (meme sens que rotate(+n) de SVG).
#  * BORD  : un pixel appartient a l'encre si sa luminance L=0.299R+0.587G+0.114B depasse le
#            seuil declare par la mesure ; les mesures de bbox/centroide sont faites sur ce
#            masque binaire, la frange d'anti-crenelage est donc exclue des deux cotes a l'identique.
#  * RECALAGE (m06, deux chemins concordants) : cap_horschrome = s*ref + (tx,ty)
S, TX, TY = 1.02215, -11.94, 8.17
def r2c(x,y): return x*S+TX, y*S+TY
def c2r(x,y): return (x-TX)/S, (y-TY)/S
# SVG (viewBox 0 0 300 520, slice) -> px de la reference : ajuste au temps 1, verifie par les ancres
SVG_K, SVG_OX, SVG_OY = 3.618, 540.0, 210.0
def svg2ref(x,y): return SVG_K*(x-150.0)+SVG_OX, SVG_K*y+SVG_OY
def L(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
NOMS=[  # (nom, x_svg, y_svg_baseline, angle_source)
 ('LES BASSINS',48.9,72.5,-10),('QUAI-NORD',152.8,71.6,-10),('SARNES',253.9,67.0,-10),
 ('LA COLONNE',52.4,133.8,3),('HAUTES-MARCHES',161.0,132.2,3),('VERRIER',258.7,126.4,3),
 ('SAINT-BRAND',53.2,197.1,3),('LES ENTREPOTS',158.8,197.8,7),('DEPOT-EST',255.5,196.4,7),
 ('LE TREILLIS',48.3,321.6,0),('MARNE-BASSE',153.2,326.6,0),('LE VERRE',254.9,323.0,18),
 ('ORSEL',44.9,396.8,0),('PLACE DES COMPTES',147.2,398.9,18),('LA LISIERE',252.3,393.1,-7),
 ('LA CHANCELLERIE',48.0,472.5,18),('LES FRICHES',146.9,472.8,-7),('PONT-GRIS',248.9,468.0,-7),
]
