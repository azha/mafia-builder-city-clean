# -- m30 : la plaque laisse-t-elle passer l'ART ? EXPERIENCE A UNE VARIABLE :
#    la MEME plaque, le MEME contenu, a deux positions differentes sur le MEME art (1920 vs 2400).
#    Si la plaque est OPAQUE, les deux interieurs sont identiques ; sinon ils different la ou l'art differe.
#    Controle positif : le filet dore du haut de la plaque doit etre identique dans les deux.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
# reperer le filet dore superieur de la plaque dans chaque capture
def top_filet(key, ysearch):
    s=sc(key); im=img(key); d=im.load()
    best=None
    for yp in range(int(ysearch[0]*s),int(ysearch[1]*s)):
        n=0
        for xp in range(int(30*s),int(360*s)):
            p=d[xp,yp]
            if abs(p[0]-176)<30 and abs(p[1]-141)<30 and abs(p[2]-62)<40: n+=1
        if best is None or n>best[1]: best=(yp,n)
    return best[0], best[0]/s, best[1]
for key,ys in [('c19',(415,440)),('c24',(590,615))]:
    yp,yc,n=top_filet(key,ys); print("  %s : filet superieur de la plaque a y=%.3f CSS (px %d), %d px dores"%(key,yc,yp,n))
y19=top_filet('c19',(415,440))[1]; y24=top_filet('c24',(590,615))[1]
print("  decalage vertical de la plaque entre les deux captures : %.3f CSS"%(y24-y19))
im19=img('c19'); im24=img('c24'); s=sc('c19')
dy=int(round((y24-y19)*s))
print("  decalage en px : %d"%dy)
a=im19.crop((int(15*s),int(y19*s),int(378*s),int((y19+165)*s)))
b=im24.crop((int(15*s),int(y24*s),int(378*s),int((y24+165)*s)))
print("  fenetres :",a.size,b.size)
da=a.load(); db=b.load(); W,H=a.size
diff=0; big=0; mx=0; hist={}
for y in range(H):
    for x in range(W):
        p=da[x,y]; q=db[x,y]
        e=max(abs(p[c]-q[c]) for c in range(3))
        if e>0: diff+=1
        if e>6: big+=1
        mx=max(mx,e)
        hist[min(e,20)]=hist.get(min(e,20),0)+1
n=W*H
print("  pixels differents : %d / %d (%.1f %%) ; ecart max %d ; > 6/255 : %d (%.1f %%)"%(diff,n,100*diff/n,mx,big,100*big/n))
print("  histogramme de l'ecart max-canal :", " ".join("%d:%d"%(k,hist[k]) for k in sorted(hist)))
