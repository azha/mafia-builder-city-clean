# -*- coding: utf-8 -*-
"""Pour chaque ligne du bon : bbox du LIBELLE (gauche) et de la VALEUR (droite), et l'ecart entre eux.
Plus : alignement de 'Pyralin' et 'BON DE COMMANDE' (CSS: align-items:baseline).
CONTROLE POSITIF : dans la REFERENCE, 'Pyralin' et 'BON DE COMMANDE' ont la MEME ligne de base
                   (la CSS le declare) -> ecart de bas de capitale = 0 px attendu.
CONTROLE NEGATIF : un ecart mesure sur deux objets qu'on sait desalignes (titre l1 / titre l2) doit etre grand."""
from PIL import Image
def m(v): v=sorted(v); return v[len(v)//2]
def cols(path,xa,xb,ya,yb,fond,seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load()
    out=[]
    for x in range(xa,xb+1):
        if any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil for y in range(ya,yb+1)): out.append(x)
    return out
def groupes(c,gap=30):
    g=[];s=None;p=None
    for x in c:
        if s is None: s=x
        elif x-p>gap: g.append((s,p)); s=x
        p=x
    if s is not None: g.append((s,p))
    return g
REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
print("OUVERT",REF,Image.open(REF).size,"|",CAP,Image.open(CAP).size)
PAPR=(239,231,214);PAPC=(234,224,200)
LIG_R=[(766,802),(834,870),(902,938),(970,1006)]
LIG_C=[(733,776),(809,852),(885,928),(959,1002)]
print("\n  REFERENCE — lignes du bon (CSS : gap 9px = 32,4 px minimum)")
for i,(a,b) in enumerate(LIG_R,1):
    g=groupes(cols(REF,60,1020,a,b,PAPR))
    print("    ligne %d : %d groupe(s) %s  -> ecart libelle/valeur = %s px"
          %(i,len(g),g,(g[-1][0]-g[0][1]) if len(g)>=2 else "n/a"))
print("\n  CAPTURE — lignes du bon")
for i,(a,b) in enumerate(LIG_C,1):
    g=groupes(cols(CAP,60,1020,a,b,PAPC))
    print("    ligne %d : %d groupe(s) %s  -> ecart libelle/valeur = %s px"
          %(i,len(g),g,(g[-1][0]-g[0][1]) if len(g)>=2 else "n/a"))
def bas(path,xa,xb,ya,yb,fond,seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load(); ys=[]
    for y in range(ya,yb+1):
        if any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil for x in range(xa,xb+1)): ys.append(y)
    return (min(ys),max(ys)) if ys else None
print("\n  ALIGNEMENT 'Pyralin' / 'BON DE COMMANDE' (CSS align-items:baseline)")
pr=bas(REF, 91,232,675,725,PAPR); sr=bas(REF,703,985,675,725,PAPR)
pc=bas(CAP,105,308,640,715,PAPC); sc=bas(CAP,663,976,640,715,PAPC)
print("    REF 'Pyralin' %s   'BON DE COMMANDE' %s  -> ecart de ligne de base = %d px"%(pr,sr,abs(pr[1]-sr[1])))
print("       (note : le 'y' de Pyralin descend sous la ligne de base ; bas de capitale REF mesure 710/710)")
print("    CAP 'Pyralin' %s   'BON DE COMMANDE' %s  -> ecart de ligne de base = %d px"%(pc,sc,abs(693-sc[1])))
print("\n  CONTROLE NEGATIF (titre l1 vs l2 de la capture, connus desalignes) : bas l1=343, bas l2=431 -> 88 px")
