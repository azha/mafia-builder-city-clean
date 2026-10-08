#!/usr/bin/env python3
"""M16bis - HAUTEUR DE LA BANDE DE DECOR, mesure de remplacement.
(Le critere de texture de 16-hauteur-du-decor.py ne discrimine pas : les decors
sont trop sombres et trop plats, ecart-type < 7 sur presque tous. Ecarte.)
Ici : premiere ligne, sous le chrome (y >= 235), dont la MEDIANE horizontale
depasse 60/255 -- c'est-a-dire la premiere ligne de MATIERE CLAIRE (feuille,
kraft, plaque). Ce que le decor occupe avant elle est sa bande.
Donne la couleur de cette premiere ligne : elle dit QUELLE matiere suit le decor.
Controle : E03, ou la matiere qui suit est bien la plaque creme des deux cotes.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def premiere_matiere(path, nom, seuil=60, y0=235):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    for y in range(y0, h - 300):
        v = sorted(sum(px[x, y]) / 3 for x in range(12, w - 12, 6))
        if v[len(v) // 2] > seuil:
            print(f'  {nom:28s} 1re ligne de MATIERE CLAIRE a y={y}  '
                  f'=> bande de decor = {y} px = {100*y/h:.1f} % de la hauteur  '
                  f'couleur au centre = {px[540, y]}')
            return y
    print(f'  {nom:28s} aucune matiere claire : le corps reste sombre')
    return None


print('--- E09 : la feuille de listing suit-elle le decor ? ---')
premiere_matiere(CAP + 'E09_Inspections_1080x2400.png', 'JEU E09 2400')
premiere_matiere(CAP + 'E09_Inspections_1080x1920.png', 'JEU E09 1920')
premiere_matiere(RC + 'police/reference-⑮-1080x2102.png', 'REF E09 (cadre 31)')
print('--- E04 ---')
premiere_matiere(CAP + 'E04_Distribution_1080x2400.png', 'JEU E04 2400')
premiere_matiere(RC + 'ecran_distribution/reference-1080x2102.png', 'REF E04 (cadre 54)')
print('--- CONTROLE E03 : la plaque creme des deux cotes ---')
premiere_matiere(CAP + 'E03_Chanedappro_1080x2400.png', 'JEU E03 2400')
premiere_matiere(RC + 'ecran_appro/reference-1080x2102.png', 'REF E03 (cadre 48)')
