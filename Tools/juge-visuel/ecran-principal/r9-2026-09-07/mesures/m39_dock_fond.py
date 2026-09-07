# m39 — le dock laisse-t-il voir l'art ? (canon : degrade transparent -> #070b12d8 a 40 %)
# Instrument : a 1920 le dock couvre les lignes d'art 1614..1894 ; ces memes lignes d'art sont NUES
# sur la planche district 2400 aux lignes 1854..2134. Correlation ligne a ligne.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m39 opacite du dock + coutures de l art a 2400 ===')
i19=ouvrir(F1920,'fiche 1920'); p19=i19.load()
idi=ouvrir(DIST,'district 2400 (art nu)'); pdi=idi.load()
# controle de premisse : lignes d'art 1400..1600 visibles des deux cotes ? a 1920 elles sont sous la fiche -> non.
# on prend 1000..1180 (art) : a 1920 -> y 1000..1180 ; a 2400 -> 1240..1420 (art nu, hors fiche)
n=0; ok=0
for y in range(1000,1180,3):
    for x in range(0,1080,7):
        n+=1
        if dist_rgb(p19[x,y], pdi[x,y+240])<=2: ok+=1
print('   premisse (art 1000..1180 nu des deux cotes) : %.2f %% identiques (n=%d)' % (100.0*ok/n,n))
print('   ligne d art | ecart-type de l art nu | correlation art nu <-> pixel du dock a 1920 | L(dock) L(art)')
for a in range(1600,1900,20):
    X=[]; Y=[]
    for x in range(0,1080,3):
        u=pdi[x,a+240]; v=p19[x,a]
        X.append(lum(u)); Y.append(lum(v))
    mx=sum(X)/len(X); my=sum(Y)/len(Y)
    sxy=sum((X[i]-mx)*(Y[i]-my) for i in range(len(X)))
    sxx=sum((X[i]-mx)**2 for i in range(len(X))); syy=sum((Y[i]-my)**2 for i in range(len(Y)))
    r = sxy/math.sqrt(sxx*syy) if sxx>0 and syy>0 else 0
    pente = sxy/sxx if sxx>0 else 0
    print('      %4d       ecart-type %.4f            r=%+.3f  pente=%.3f (=1-alpha)      L dock %.4f  L art %.4f'
          % (a, math.sqrt(sxx/len(X)), r, pente, my, mx))
print()
print('   COUTURES de l art a 2400 (planche district) : luminance mediane par ligne')
for y in list(range(232,250))+list(range(2152,2170)):
    c=medrgb(pdi,0,y,1080,y+1)
    print('      y=%4d  %s  L=%.4f' % (y,str(tuple(int(v) for v in c)),lum(c)))
