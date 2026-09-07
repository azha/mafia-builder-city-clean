# Marges laterales du CONTENU (gouttiere) : premier/dernier x porteur d'encre par bande.
# Controle positif : la reference doit rendre 13 CSS x3,6 = 46,8 px a gauche pour .pl-body
#                    (le CSS l'ecrit : .parl6 .pl-body{padding:10px 13px 0}).
# Controle negatif : la bande du titre h3 est dans .pl-tete (padding 13px aussi) -> meme x.
from PIL import Image
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def bornes(im, y0, y1, seuil):
    px=im.load(); w,h=im.size
    xs=[]
    for y in range(y0,y1+1):
        for x in range(w):
            if lum(px[x,y])>seuil: xs.append(x); break
    xs2=[]
    for y in range(y0,y1+1):
        for x in range(w-1,-1,-1):
            if lum(px[x,y])>seuil: xs2.append(x); break
    return (min(xs) if xs else None, max(xs2) if xs2 else None)

ref = Image.open('../reference-1080x2102.png').convert('RGB'); print('reference', ref.size)
cap = Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ', cap.size)

print('--- REFERENCE (fond du panneau ~ L20-28 ; seuil 40) ---')
for nom,(a,b) in [('h3 titre',(590,630)),('p sous-titre',(660,700)),
                  ('vitre (bord)',(643,646)),('titron CE QU IL SAIT',(925,950)),
                  ('item 1 (bord)',(961,964)),('pl-bas bord haut',(1745,1751)),
                  ('pl-dit',(1770,1800)),('pl-geste (bord)',(1904,1907))]:
    print('  %-22s y=%4d..%4d  x0=%s x1=%s' % ((nom,a,b)+bornes(ref,a,b,40)))

print('--- CAPTURE (fond 13,13,13 ; seuil 40) ---')
for nom,(a,b) in [('titre Le parloir',(293,352)),('sous-titre',(403,437)),
                  ('VOS AVOCATS',(487,510)),('vous n avez...',(536,568)),
                  ('QUI PEUT VOUS DEFENDRE',(613,645)),
                  ('carte 1',(670,829)),('carte 2',(851,1010)),('carte 3',(1032,1190)),
                  ('paragraphe filiere',(1216,1279)),('AFFAIRES EN COURS',(1329,1352)),
                  ('aucune affaire',(1378,1403)),('une affaire nait',(1429,1450))]:
    print('  %-22s y=%4d..%4d  x0=%s x1=%s' % ((nom,a,b)+bornes(cap,a,b,40)))
# les cartes ont un fond (34,42,46) : seuil bas pour trouver leur bord
print('--- CAPTURE cartes, seuil 20 (fond 13) ---')
for nom,(a,b) in [('carte 1',(700,760)),('carte 2',(880,940)),('carte 3',(1060,1120))]:
    print('  %-22s y=%4d..%4d  x0=%s x1=%s' % ((nom,a,b)+bornes(cap,a,b,20)))
