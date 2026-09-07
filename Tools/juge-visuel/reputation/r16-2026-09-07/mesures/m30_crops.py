# m30 : decoupes cote a cote (meme echelle 1:1, le contenu est a x3,6 des deux cotes).
import sys; sys.path.insert(0,'.')
from lib import *
R=ouvrir('reference-1080x2102.png'); A=ouvrir('capture-1080x2400.png'); B=ouvrir('capture-1080x1920.png')
def duo(nom, boite_r, boite_a, sortie):
    a=R.crop(boite_r); b=A.crop(boite_a)
    W=a.size[0]+b.size[0]+20; H=max(a.size[1],b.size[1])
    out=Image.new('RGB',(W,H),(255,0,255))
    out.paste(a,(0,0)); out.paste(b,(a.size[0]+20,0))
    out.save(sortie); print("   %-22s ref%s + jeu%s -> %s %s" % (nom,boite_r,boite_a,sortie,out.size))
duo('portrait',      (78,877,510,1540), (74,903,506,1566), 'crop_portrait.png')
duo('compteurs',     (40,695,1040,830), (36,720,1036,855), 'crop_compteurs.png')
duo('tuiles+aparte', (500,870,1060,1400),(496,900,1056,1430),'crop_tuiles.png')
# le bord droit a 1920 (barre) contre le meme bord a 2400
a=B.crop((900,250,1080,1640)); b=A.crop((900,482,1080,1872))
out=Image.new('RGB',(a.size[0]+b.size[0]+20, max(a.size[1],b.size[1])),(255,0,255))
out.paste(a,(0,0)); out.paste(b,(a.size[0]+20,0)); out.save('crop_barre.png')
print("   bord droit 1920 | 2400 -> crop_barre.png", out.size)
