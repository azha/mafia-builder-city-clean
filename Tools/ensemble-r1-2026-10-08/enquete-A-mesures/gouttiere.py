from PIL import Image
J='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
C='/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-mots/'
def row(p,y,label):
    im=Image.open(p).convert('RGB'); w,h=im.size; px=im.load()
    kr=[x for x in range(w) if (lambda r,g,b: r>95 and r-b>38 and g<r)(*px[x,y])]
    print(f'{label:34s} {w}x{h} y={y}: kraft x={min(kr) if kr else None}..{max(kr) if kr else None}  marges G/D={min(kr) if kr else None}/{w-1-max(kr) if kr else None}  px(5,y)={px[5,y]} px(w/2,y)={px[w//2,y]}')
row(J+'ecran_distribution/reference-1080x2102.png',1000,'maquette 54 (nominal ㉘)')
row(C+'E04_Distribution_1080x2400.png',1000,'jeu E04')
row(J+'police/r2-⑮-2026-09-22/etats/cadre-31-tableau.png',1000,'maquette 31 (⑮ liège)')
row(J+'police/r2-⑮-2026-09-22/etats/cadre-33-signalement.png',1800,'maquette 33 (⑮ signalement) y=1800')
row(C+'E09_Inspections_1080x2400.png',1800,'jeu E09 y=1800')
# E04: premier pixel kraft sous le chrome, et couleur du bandeau attendu #20180f
im=Image.open(C+'E04_Distribution_1080x2400.png').convert('RGB'); px=im.load()
print('E04 jeu: pixels x=540 y=500..700 pas 20:',[px[540,y] for y in range(500,720,20)])
print('plaque Distribution attendue (32,24,15) ; ouverture du kraft au 1er y où kraft:', next(y for y in range(0,2400) if (lambda r,g,b: r>95 and r-b>38 and g<r)(*px[540,y])))
