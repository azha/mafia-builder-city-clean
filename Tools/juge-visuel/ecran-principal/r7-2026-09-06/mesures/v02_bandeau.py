import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
crop_css('ref',0,0,392,72,scale=2.4).save(D+"mesures/z_bandeau_ref.png")
crop_css('c19',0,0,392,72,scale=2.4).save(D+"mesures/z_bandeau_c19.png")
crop_css('c24',0,0,392,72,scale=2.4).save(D+"mesures/z_bandeau_c24.png")
print("ok")
