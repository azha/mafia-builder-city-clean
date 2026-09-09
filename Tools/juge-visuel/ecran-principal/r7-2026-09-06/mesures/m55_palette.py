# -- m55 : COUCHE GLOBALE, restreinte au CHROME et a la FICHE (la reference est de nuit, la capture de jour :
#    la palette de l'ART n'est pas comparable — consigne du dossier).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
from PIL import Image
DY={'ref':0.0,'c19':0.0,'c24':174.222}
def palette(key, box, nom, n=6, dy=0.0):
    s=sc(key); im=img(key)
    c=im.crop((int(box[0]*s),int((box[1]+dy)*s),int(box[2]*s),int((box[3]+dy)*s))).convert('RGB')
    q=c.quantize(colors=24, method=Image.MEDIANCUT).convert('RGB')
    cols=q.getcolors(1<<20); cols.sort(key=lambda t:-t[0]); tot=sum(k for k,_ in cols)
    Ls=[lum(p) for p in c.getdata()]
    print("   %-4s %-22s  L moyenne %.1f | densite d'encre (L>90) %.1f %% | dominantes : %s"
          %(key,nom,sum(Ls)/len(Ls),100*sum(1 for L in Ls if L>90)/len(Ls),
            " · ".join("%s %.1f%%"%(str(p),100*k/tot) for k,p in cols[:n])))
print("=== BANDEAU (y 0..52) ===")
for k in ['ref','c19','c24']: palette(k,(0,0,392,52),'bandeau',dy=0.0)
print("=== FICHE (plaque entiere) ===")
for k in ['ref','c19','c24']: palette(k,(12,425,380,595),'plaque',dy=DY[k])
print("=== DOCK (y 605..697) ===")
for k in ['ref','c19','c24']: palette(k,(0,605,392,696),'dock',dy=DY[k])
