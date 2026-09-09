# Marges du contenu, detectees comme ECART au fond LOCAL (median de la bande),
# en ignorant le liseré du .tel de la maquette (3 px a gauche/droite : x<6 ou x>1073).
# Controle positif : .pl-body de la maquette = padding 13 CSS x3,6 = 46,8 px depuis le bord
#   interieur du .tel (x=3) -> attendu x0 ~= 50. Controle negatif : le titron .pl-titron
#   est dans .pl-body -> meme x0 que les items.
from PIL import Image
import statistics as st
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def bornes(im,y0,y1,marge=6,delta=8):
    px=im.load(); w,h=im.size
    vals=[lum(px[x,y]) for y in range(y0,y1+1) for x in range(marge,w-marge,3)]
    fond=st.median(vals)
    x0=None;x1=None
    for x in range(marge,w-marge):
        col=[lum(px[x,y]) for y in range(y0,y1+1)]
        if max(col)>fond+delta or min(col)<fond-delta:
            x0=x; break
    for x in range(w-marge-1,marge-1,-1):
        col=[lum(px[x,y]) for y in range(y0,y1+1)]
        if max(col)>fond+delta or min(col)<fond-delta:
            x1=x; break
    return fond,x0,x1
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('--- REFERENCE ---')
for nom,(a,b) in [('h3 titre',(455,500)),('p sous-titre',(535,560)),
                  ('vitre bord haut',(643,645)),('titron',(925,950)),
                  ('item1 bord haut',(961,963)),('item1 texte',(985,1010)),
                  ('pl-bas bord haut',(1746,1750)),('pl-dit l1',(1770,1800)),
                  ('pl-geste bord haut',(1904,1906))]:
    f,x0,x1=bornes(ref,a,b); print('  %-20s y=%4d..%4d fond=%5.1f x0=%s x1=%s largeur=%s'%(nom,a,b,f,x0,x1,(x1-x0+1) if x0 is not None else None))
print('--- CAPTURE ---')
for nom,(a,b) in [('titre',(293,352)),('sous-titre',(403,437)),('VOS AVOCATS',(487,510)),
                  ('vous n avez',(536,568)),('QUI PEUT',(613,645)),
                  ('carte1 bord haut',(670,673)),('carte1 texte',(700,760)),
                  ('carte2 bord haut',(851,854)),('carte3 bord haut',(1032,1035)),
                  ('para filiere',(1216,1279)),('AFFAIRES',(1329,1352)),
                  ('aucune affaire',(1378,1403)),('une affaire nait',(1429,1450))]:
    f,x0,x1=bornes(cap,a,b,marge=0); print('  %-20s y=%4d..%4d fond=%5.1f x0=%s x1=%s largeur=%s'%(nom,a,b,f,x0,x1,(x1-x0+1) if x0 is not None else None))
