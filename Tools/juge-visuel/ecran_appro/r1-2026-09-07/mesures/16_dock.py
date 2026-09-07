# -*- coding: utf-8 -*-
"""HAUT DU DOCK de la capture : premiere ligne, EN DESCENDANT depuis y=1600 (sous le CTA),
dont la mediane s'ecarte du fond #0d0d0d, ET premiere ligne reellement encree.
CONTROLE POSITIF : les quatre ronds du dock doivent etre trouves comme 4 groupes de colonnes.
CONTROLE NEGATIF : la meme sonde entre 1600 et 2100 (fond nu) doit rendre 0 groupe."""
from PIL import Image
def m(v): v=sorted(v); return v[len(v)//2]
def lig(px,W,y):
    R=[];G=[];B=[]
    for x in range(0,W,3):
        p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (m(R),m(G),m(B))
CAP="../capture-1080x2400.png"
im=Image.open(CAP).convert("RGB"); W,H=im.size; px=im.load(); print("OUVERT",CAP,(W,H))
fond=(13,13,13)
prem_med=None
for y in range(1600,H):
    c=lig(px,W,y)
    if max(abs(c[i]-fond[i]) for i in range(3))>=2: prem_med=y; break
print("  1re ligne dont la MEDIANE quitte #0d0d0d (en descendant de 1600) : y=%d  %s"%(prem_med,lig(px,W,prem_med)))
prem_encre=None
for y in range(1600,H):
    c=sum(1 for x in range(0,W,2) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>16)
    if c>25: prem_encre=y; break
print("  1re ligne ENCREE (>25 colonnes a plus de 16/255 du fond) : y=%d"%prem_encre)
# groupes de colonnes a mi-hauteur des ronds
ym=prem_encre+70
cols=[x for x in range(W) if max(abs(px[x,ym][i]-fond[i]) for i in range(3))>16]
grp=[];s=None;p=None
for x in cols:
    if s is None: s=x
    elif x-p>12: grp.append((s,p)); s=x
    p=x
if s is not None: grp.append((s,p))
print("  a y=%d : %d groupes de colonnes -> %s"%(ym,len(grp),grp))
neg=[y for y in range(1600,2100) if sum(1 for x in range(0,W,2) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>16)>25]
print("  CONTROLE NEGATIF (1600..2100) : %d ligne(s) encree(s) -> %s"%(len(neg),"OK, zone nue" if not neg else neg[:5]))
HD=prem_encre
print()
print("  ZONE DE CONTENU capture : y=143..%d  hauteur=%d px = %.1f CSS"%(HD-1,HD-143,(HD-143)/3.6))
print("  vide sous le CTA : y=1512..%d = %d px = %.1f CSS = %.1f%% de la zone de contenu"%(HD-1,HD-1512,(HD-1512)/3.6,100*(HD-1512)/(HD-143)))
print("  vide de la REFERENCE (entre bas du bon 1226 et filet .bas 1780) = %d px = %.1f CSS = %.1f%% du panneau"%(1780-1227,(1780-1227)/3.6,100*(1780-1227)/1663))
print("  vide de la CAPTURE au meme endroit (bas du bon 1054 -> titron 1099) = %d px = %.1f%%"%(1099-1055,100*(1099-1055)/(HD-143)))
print()
PARTS=[("bas du bandeau",143),("losange",217),("titre l1 cap",294),("sous-titre l1",483),
       ("haut du bon",608),("bas du bon",1054),("titron",1099),("bouche-trou l1",1152),
       ("citation l1",1271),("haut du CTA",1375),("bas du CTA",1511),("haut du dock",HD)]
print("  positions NORMALISEES capture (0 = bas du bandeau, 1 = haut du dock, h=%d)"%(HD-143))
for n,y in PARTS: print("    %-22s y=%4d  %.3f"%(n,y,(y-143)/float(HD-143)))
