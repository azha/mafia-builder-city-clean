# -*- coding: utf-8 -*-
"""08 — LE FOND ET LES VOILES.
(a) Profil du FOND de l'écran le long de la bande de marge gauche (entre le cerne et les blocs),
    et le long de l'axe central dans les gouttières entre blocs. La maquette y pose
    `linear-gradient(178deg, carte 0%, fond 54%, fond2 100%)` + un radial DORÉ en haut (22 %)
    + un radial CYAN en bas (96 %).
(b) Les voiles internes (`box-shadow: inset`) : .elast (#00000099 sur 22 px), .pann (#00000066
    sur 18 px), .fen (glow cyan 1f sur 10 px) — mesurés comme un ÉCART centre/bord dans la
    MÊME image, donc insensibles à l'échelle et à l'espace de composition.
Contrôle positif : le bord du cerne (or_filet opaque) vaut (176,141,62) dans les deux images.
Contrôle négatif : dans la référence, centre et bord de .elast DOIVENT différer (voile de 22 px
à 60 % de noir) ; s'ils sortaient égaux, la sonde serait mal placée."""
from PIL import Image
def med(im,x0,y0,x1,y1):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    return tuple(sorted(p[i] for p in ps)[len(ps)//2] for i in range(3))
def lum(p): return round(.2126*p[0]+.7152*p[1]+.0722*p[2],1)
REFp='/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png'
CAPp='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'
REF=Image.open(REFp).convert('RGB'); CAP=Image.open(CAPp).convert('RGB')
print(REFp.split('/')[-1],REF.size,'|',CAPp.split('/')[-1],CAP.size)
print('\n(a1) FOND — bande de marge gauche, du haut au bas du cerne (10 sondes, % de hauteur)')
print('  %5s  %-18s %-18s %s'%('%h','REF','CAP','Δ(CAP-REF)'))
for k in range(10):
    ry=377+int((1730-377)*(k+.5)/10); cy=19+int((1900-19)*(k+.5)/10)
    r=med(REF,26,ry-8,40,ry+8); c=med(CAP,26,cy-8,42,cy+8)
    print('  %4d%%  %-18s %-18s %s'%(int((k+.5)*10),str(r),str(c),str(tuple(a-b for a,b in zip(c,r)))))
print('\n(a2) FOND — gouttières horizontales (axe central), là où aucun bloc ne couvre')
GOUT=[('sous le cerne / au-dessus de l enseigne',(380,398),(22,44)),
      ('enseigne -> compteurs',(560,583),(232,259)),
      ('compteurs -> .elast',(680,706),(379,407)),
      ('.elast -> .pann',(1344,1368),(1370,1399)),
      ('.pann -> .cta6',(1600,1624),(1669,1698)),
      ('.cta6 -> bas du cerne',(1707,1727),(1791,1896))]
for nom,(a,b),(c,d) in GOUT:
    r=med(REF,380,a,520,b); q=med(CAP,460,c,620,d)
    print('  %-42s REF %-16s CAP %-16s Δ %s'%(nom,str(r),str(q),str(tuple(x-y for x,y in zip(q,r)))))
print('\n(b) VOILES INTERNES — centre vs bord, DANS la même image (lum)')
def voile(nom,im,cx,bx,sc):
    c=med(im,*cx); b=med(im,*bx)
    print('  %-28s centre %-16s bord %-16s Δlum=%+.1f'%(nom,str(c),str(b),lum(c)-lum(b)))
print(' REF :')
voile('.elast (fond2 + 22px noir)',REF,(560,1240,760,1320),(500,1320,760,1338),3.0)
voile('.pann (carte + 18px noir)',REF,(300,1470,600,1490),(60,1374,840,1382),3.0)
voile('.fen1 (creux + glow cyan)',REF,(180,610,260,640),(146,589,290,594),3.0)
print(' CAP :')
voile('.elast (fond2 + 22px noir)',CAP,(600,1150,900,1300),(560,1340,1000,1362),3.6)
voile('.pann (carte + 18px noir)',CAP,(300,1490,700,1520),(60,1407,1020,1416),3.6)
voile('.fen1 (creux + glow cyan)',CAP,(200,290,320,330),(180,267,350,273),3.6)
print('\n(b2) contrôle négatif de la sonde (b) : REF .elast centre vs bord doit DIFFÉRER -> ci-dessus')
