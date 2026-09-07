# Hauteur d'X (x-height) sur des minuscules SANS jambage ni accent, pour les textes secondaires.
# Etalonnage : sur la REFERENCE, .pl-qui i est 6,6 CSS ; .pl-item span 7,6 CSS ; .pl-tete p 7 CSS.
#   L instrument doit rendre des x-heights dans ce MEME ordre (controle de discrimination).
# Controle negatif : une fenetre de fond doit rendre 0.
from PIL import Image
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def h(im,x0,x1,y0,y1,fond,seuil=25):
    px=im.load(); ys=[y for y in range(y0,y1) if any(abs(lum(px[x,y])-lum(fond))>seuil for x in range(x0,x1))]
    return (min(ys),max(ys),max(ys)-min(ys)+1) if ys else (None,None,0)
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('CONTROLE NEGATIF ref fond :', h(ref,700,900,1450,1500,(20,24,29)))
print()
print('=== REFERENCE : x-height (lettres sans jambage) ===')
for nom,x0,x1,y0,y1,fond,css in [
  ('.pl-tete p  "sait" (s,a,i)',      92, 150, 530, 575,(26,31,38),7.0),
  ('.pl-qui i   "un de" (u,n)',      262, 300, 730, 765,(33,40,48),6.6),
  ('.pl-item span "o" de "ou est"',  134, 152, 980,1012,(30,36,43),7.6),
  ('.pl-titron "C" capitale',         51,  72, 900, 930,(23,27,32),6.6),
]:
    a,b,hh=h(ref,x0,x1,y0,y1,fond); print('  %-32s CSS=%.1f  y %s..%s  h=%s px'%(nom,css,a,b,hh))
print()
print('=== CAPTURE : x-height homologues ===')
for nom,x0,x1,y0,y1,fond,css in [
  ('sous-titre "os" de Vos',          95, 150, 400, 445,(13,13,13),7.0),
  ('carte i "ra" de gratuit',        112, 165, 765, 810,(34,42,46),6.4),
  ('"ucune" de Aucune affaire',       88, 175,1372,1410,(13,13,13),None),
  ('titron "O" de VOS',               85, 115, 483, 515,(13,13,13),6.6),
]:
    a,b,hh=h(cap,x0,x1,y0,y1,fond); print('  %-32s CSS=%s  y %s..%s  h=%s px'%(nom,css,a,b,hh))
