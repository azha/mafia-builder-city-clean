#!/usr/bin/env python3
"""m12 - LA GOUTTIERE, chiffree, aux deux resolutions.
Bornes retenues (convention de bord NOMINALE, mi-alpha : un pixel appartient au
trait des que sa couleur a franchi la moitie du chemin fond -> coeur) :
  bas du bandeau  = derniere rangee du filet or plein largeur du haut, +1
  haut du dock    = premiere rangee portant de l'encre de dock (m03)
  cadre           = premiere / derniere rangee du filet or du cadre (m01),
                    prolonge sous le bandeau par la position mesuree au 2400 -480
Controle positif : la hauteur du cadre doit etre la MEME aux deux resolutions.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a=Image.open(os.path.join(D,'capture-1080x1920.png')).convert('RGB'); pa=a.load()
print('capture 1920 :', a.size)
print('  x=19, y=0..12 :', [f'{y}:{pa[19,y]}' for y in range(0,13)])
print('  x=540 hors medaillon? x=900, y=0..12 :', [f'{y}:{pa[900,y]}' for y in range(0,13)])
b=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); pb=b.load()
print('capture 2400 :', b.size)
print('  x=19, y=478..492 :', [f'{y}:{pb[19,y]}' for y in range(478,493)])

TAB=[('1080x1920',1920,2,1629,143,1699),('1080x2400',2400,482,2109,143,2179)]
print()
print(' resolution | haut cadre | bas cadre | bas bandeau | haut dock | gouttiere HAUTE | gouttiere BASSE | hauteur cadre')
for nom,H,ct,cb,bb,dt in TAB:
    print(f' {nom} | {ct:>10} | {cb:>9} | {bb:>11} | {dt:>9} | {ct-bb:>+15} | {dt-cb:>+15} | {cb-ct+1:>13}')
print()
print(' zone libre entre bandeau et dock :')
for nom,H,ct,cb,bb,dt in TAB:
    print(f'   {nom} : {dt-bb} px  (cadre {cb-ct+1} px + gouttiere basse 70 -> il faut {cb-ct+1+70} px)')
