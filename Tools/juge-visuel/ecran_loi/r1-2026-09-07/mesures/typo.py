# Hauteur de CAPITALE : on isole une colonne de glyphe SANS jambage ni accent et on mesure
# du haut de la capitale a la ligne de base. Methode : profil de lignes d encre sur une
# fenetre choisie autour d une MAJUSCULE precise, bornee a gauche/droite.
# Controle positif : sur la REFERENCE, h3 = 12 CSS x3,6 = 43,2 px ; DejaVu/Noto Serif ont une
#   hauteur de capitale ~0,73 em -> attendu ~31 px. Si la sonde rend ~31, elle mesure bien.
# Controle negatif : la meme sonde sur une fenetre de FOND doit rendre 0 ligne d encre.
from PIL import Image
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def hauteur(im,x0,x1,y0,y1,fond,seuil=25):
    px=im.load(); ys=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if abs(lum(px[x,y])-lum(fond))>seuil)
        if n>0: ys.append(y)
    return (min(ys),max(ys),max(ys)-min(ys)+1) if ys else (None,None,0)
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('CONTROLE NEGATIF ref fond (x 700..900, y 1450..1500) ->', hauteur(ref,700,900,1450,1500,(20,24,29)))
print()
print('=== REFERENCE (fond du panneau) ===')
for nom,x0,x1,y0,y1,fond in [
  ('h3 "I" de Ils',        50,  78, 440, 520, (26,31,38)),
  ('h3 bande entiere',     50, 830, 440, 520, (26,31,38)),
  ('p sous-titre "I"',     50,  62, 525, 575, (26,31,38)),
  ('p sous-titre bande',   50, 845, 525, 575, (26,31,38)),
  ('titron "C" (CE QU IL)',50,  75, 895, 935, (23,27,32)),
  ('pl-qui b "Lt. Tull"',  268,300, 675, 720, (33,40,48)),
  ('pl-jours b "9"',       955,990, 675, 730, (30,37,45)),
  ('pl-item span "o"',     134,160, 980,1015, (30,36,43)),
  ('pl-dit "P" de Pour',   205,235,1765,1815, (20,26,33)),
  ('pl-geste "L" de LUI',   93,120,1940,1990, (36,28,17)),
]:
    a,b,h=hauteur(ref,x0,x1,y0,y1,fond); print('  %-26s y %s..%s  h=%s px  (=%.2f CSS)'%(nom,a,b,h,h/3.6))
print()
print('=== CAPTURE (fond 13,13,13 ; cartes 34,42,46) ===')
for nom,x0,x1,y0,y1,fond in [
  ('titre "L" de Le',       57,  95, 285, 365, (13,13,13)),
  ('titre bande entiere',   50, 400, 285, 365, (13,13,13)),
  ('sous-titre "V" de Vos', 57,  90, 395, 445, (13,13,13)),
  ('sous-titre bande',      50, 945, 395, 445, (13,13,13)),
  ('VOS AVOCATS "V"',       57,  80, 480, 515, (13,13,13)),
  ('QUI PEUT "Q"',          57,  85, 605, 650, (13,13,13)),
  ('carte1 b "C" Commis',   93, 125, 690, 745, (34,42,46)),
  ('carte1 i "g" gratuit',  93, 400, 760, 810, (34,42,46)),
  ('AFFAIRES "A"',          57,  82,1322,1358, (13,13,13)),
  ('aucune affaire "A"',    57,  90,1370,1410, (13,13,13)),
  ('une affaire nait "U"',  57,  85,1422,1456, (13,13,13)),
  ('para filiere "L"',      57,  85,1210,1250, (13,13,13)),
]:
    a,b,h=hauteur(cap,x0,x1,y0,y1,fond); print('  %-26s y %s..%s  h=%s px  (=%.2f CSS)'%(nom,a,b,h,h/3.6))
