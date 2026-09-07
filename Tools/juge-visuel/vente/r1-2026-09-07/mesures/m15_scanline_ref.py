# m15 — REFERENCE : le trait teal qui traverse la rangee "Mira" est-il l'artefact de l'animation
# `vnt6-scan` (.elast::after) fige au rendu ? Mesure : bande horizontale teal traversant la liste.
# Controle positif : le jeton teal #7fd4d9 = (127,212,217) doit etre reconnu.
# Controle negatif : aucune autre bande teal continue ne doit exister dans la liste.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT reference-1080x2102.png', im.size)
def teal(p):
    r,g,b=p; return b>60 and g>=b-25 and (g-r)>18 and (b-r)>18
print('CONTROLE POSITIF teal((127,212,217)) =',teal((127,212,217)),' teal((17,24,35)) =',teal((17,24,35)))
print('bandes teal continues dans la liste (y 830..1865, x 100..1000) :')
for y in range(830,1866):
    c=sum(1 for x in range(100,1000,3) if teal(px[x,y]))
    if c>150: print('  y=%d : %d px teal (sur 300 echantillons) rgb(x=700)=%s'%(y,c*3,px[700,y]))
print()
print('extension horizontale du trait a y=1040 :')
xs=[x for x in range(60,1030) if teal(px[x,1040])]
print('  x=%d..%d (%d px)'%(min(xs),max(xs),max(xs)-min(xs)+1) if xs else '  aucun')
print('la rangee Mira est y=982..1098 ; le trait tombe donc DANS la rangee, sur la ligne de texte.')
