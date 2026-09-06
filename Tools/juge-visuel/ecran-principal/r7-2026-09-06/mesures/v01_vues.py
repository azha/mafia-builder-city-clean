import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
from PIL import Image
# vues d'ensemble, ramenees a la MEME echelle CSS (1 px vue = 1 CSS)
for k in ['ref','c19','c24','d24','t24']:
    im = img(k); s = sc(k)
    w = int(im.width/s); h = int(im.height/s)
    im.resize((w,h), Image.LANCZOS).save(D+"mesures/vue_%s.png"%k)
    print("vue_%s.png %dx%d CSS"%(k,w,h))
