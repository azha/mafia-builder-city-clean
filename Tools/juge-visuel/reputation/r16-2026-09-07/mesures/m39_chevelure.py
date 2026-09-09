# m39 : epaisseur LATERALE de la chevelure sombre, a plusieurs hauteurs du visage.
# Controle positif : la reference doit rendre une epaisseur non nulle a toutes les sondes.
import sys; sys.path.insert(0,'.')
from lib import *
PEAU=(185,173,146)
def est_peau(c,t=18): return all(abs(c[i]-PEAU[i])<=t for i in range(3))
CAS=[('ref','reference-1080x2102.png',(17,24,35),1099,1219),
     ('2400','capture-1080x2400.png',(13,22,34),1118,1250),
     ('1920','capture-1080x1920.png',(13,22,34),886,1020)]
for tag,nom,fond,ytop,ybot in CAS:
    im=ouvrir(nom); px=im.load(); Lf=lum(fond)
    h=ybot-ytop+1
    print("   %-5s visage y=%d..%d (h=%d)" % (tag,ytop,ybot,h))
    for frac in (0.10,0.15,0.25,0.40,0.55,0.70):
        y=int(ytop+frac*h)
        pxs=[x for x in range(150,460) if est_peau(px[x,y])]
        if not pxs: print("        %.0f%% : pas de peau"%(100*frac)); continue
        g=[x for x in range(max(90,min(pxs)-70),min(pxs)) if lum(px[x,y])<Lf-6]
        d=[x for x in range(max(pxs)+1,min(500,max(pxs)+71)) if lum(px[x,y])<Lf-6]
        print("        %3.0f%% (y=%4d) : peau x=%d..%d (l=%d) | chevelure gauche=%d px, droite=%d px"
              % (100*frac,y,min(pxs),max(pxs),max(pxs)-min(pxs)+1,len(g),len(d)))
