import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
crop_css('ref',160,2,232,80,scale=7).save(D+"mesures/z_med_ref.png")
crop_css('c19',160,2,232,80,scale=7).save(D+"mesures/z_med_c19.png")
crop_css('c24',160,2,232,80,scale=7).save(D+"mesures/z_med_c24.png")
print("ok")
