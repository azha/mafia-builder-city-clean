# m28 — PREMISSE du m27 : l'art de la planche 1920 et celui de la 2400 sont-ils le MEME, decale de +240 px ?
# Controle POSITIF : une bande juste sous le bandeau, hors fiche, hors badges. Controle NEGATIF : decalage 0.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m28 premisse du decalage +240 ===')
i19=ouvrir(F1920,'1920'); p19=i19.load()
i24=ouvrir(F2400,'2400'); p24=i24.load()
for dec in (240,0,239,241):
    for (x0,x1,y0,y1,lab) in [(600,1000,270,600,'bande droite y 270..600 (sous bandeau, hors fiche)'),
                              (0,1080,300,1000,'pleine largeur y 300..1000')]:
        n=0; ok=0; d1=0
        for y in range(y0,y1,3):
            for x in range(x0,x1,3):
                if y+dec>=2400: continue
                n+=1
                dd=dist_rgb(p19[x,y],p24[x,y+dec])
                if dd<=2: ok+=1
                if dd<=8: d1+=1
        print('   decalage %+4d  %-52s : %6.2f %% a <=2/255 ; %6.2f %% a <=8/255 (n=%d)' % (dec,lab,100.0*ok/n,100.0*d1/n,n))
    print()
