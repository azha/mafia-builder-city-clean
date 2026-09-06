from common import *
from txt import *
print('--- 1) corps du montant : hauteur d un CHIFFRE isole ---')
def chiffres(im,box,scale,label):
    cols,base=colonnes(im,box,40)
    lt=segments(cols,gap=1,minw=2)
    hs=[]
    for s in lt:
        ys=[y for x,yy in cols for y in yy if s[0]<=x<=s[1]]
        hs.append(((max(ys)-min(ys)+1)/scale, s))
    hs.sort()
    print(f'  {label} : {len(hs)} traits, hauteurs {[round(h,2) for h,_ in hs]}')
    if hs: print(f'     -> MEDIANE {sorted(h for h,_ in hs)[len(hs)//2]:.2f} CSS ; MODE haut {hs[-1][0]:.2f}')
r=op(REF); chiffres(r,(55,58,240,110),REF_S,'REF "$ 24 850"')
c=op(C24); chiffres(c,(110,82,420,118),CAP_S,'CAP "9 627 820,00"')
t=op(T24); chiffres(t,(44,68,310,105),CAP_S,'TEMOIN "9 627 820,00"')
print('--- 2) fond du boitier du medaillon (F15), loin de l arc et du texte ---')
print('  REF  haut-gauche',med(r,530,55,552,72),' bas-droite',med(r,625,165,645,182))
print('  CAP  haut-gauche',med(c,470,50,492,68),' bas-droite',med(c,600,195,620,212))
print('--- 3) gouttiere 1080x1920 : bas de fiche vs haut du dock ---')
c19=op(C19); px=c19.load()
for y in range(1580,1720,4):
    row=[lum(px[x,y]) for x in range(0,1080)]
    print(f'    y={y} ({y/CAP_S:6.2f} CSS) L median {sorted(row)[540]:6.1f}  min {min(row):5.1f} max {max(row):5.1f}')
print('--- 4) panneau du dock : opacite (canon = degrade vers transparent) ---')
print('  REF dock : L a 3 hauteurs, x=60 (hors ronds) :')
for y in (1830,1900,1970,2030,2080): print(f'     y={y} ({y/REF_S:6.2f} CSS) {r.getpixel((60,y))}')
print('  CAP2400 dock : x=60 :')
for y in (2150,2200,2260,2320,2380): print(f'     y={y} ({y/CAP_S:6.2f} CSS) {c.getpixel((60,y))}')
