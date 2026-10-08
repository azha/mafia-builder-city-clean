import sys
from PIL import Image
J='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
C='/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-mots/'
def m(p):
    im=Image.open(p).convert('RGB'); w,h=im.size; px=im.load()
    a={'FEUTRINE':0,'KRAFT':0,'VOILE':0}; tot=0
    for y in range(0,h,4):
        for x in range(0,w,4):
            r,g,b=px[x,y]; tot+=1; mm=(r+g+b)/3
            if g>r+18 and g>b+12 and g>45: a['FEUTRINE']+=1
            elif r>95 and r-b>38 and g<r: a['KRAFT']+=1
            elif 36<=mm<=60 and abs(r-b)<14: a['VOILE']+=1
    print(f'{p.split("/")[-1]:48s} {w}x{h} FEUTR {100*a["FEUTRINE"]/tot:5.1f} KRAFT {100*a["KRAFT"]/tot:5.1f} VOILE {100*a["VOILE"]/tot:5.1f}')
for p in [J+'police/reference-⑮-1080x2102.png',J+'police/r2-⑮-2026-09-22/etats/cadre-31-tableau.png',J+'police/r2-⑮-2026-09-22/etats/cadre-33-signalement.png',J+'police/r2-⑮-2026-09-22/etats/cadre-34-retour-de-baton.png',
 J+'ecran_distribution/reference-1080x2102.png']+[J+f'ecran_distribution/r-groupe-2026-10-07/ref/cadre-{i}.png' for i in range(54,59)]+[J+'decision-du-jour/reference-1080x2102.png',J+'compression/reference-1080x2102.png',J+'compression/v4-29.png',
 C+'E04_Distribution_1080x2400.png',C+'E09_Inspections_1080x2400.png',C+'E08_Lasemaine_1080x2400.png',C+'E11_DecisionDetail_1080x2400.png']:
    m(p)
