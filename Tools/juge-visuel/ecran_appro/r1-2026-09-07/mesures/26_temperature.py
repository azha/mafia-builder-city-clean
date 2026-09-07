# -*- coding: utf-8 -*-
"""TEMPERATURE (R-B) et LUMINANCE de chaque paire reference/capture, par partie.
Sert a dire si le glissement chaud->froid est SYSTEMATIQUE et OU il l'est.
CONTROLE POSITIF : #efe7d6 doit rendre R-B = +25 (calcul direct depuis l'hex).
CONTROLE NEGATIF : un gris pur (#808080) doit rendre R-B = 0."""
def hx(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
P=[("fond, haut de panneau","1a1815","0d0d0d","sur fond sombre"),
   ("fond, milieu","151310","0d0d0d","sur fond sombre"),
   ("fond, bas","131212","0d0d0d","sur fond sombre"),
   ("titre","f0dfc4","eef1f2","sur fond sombre"),
   ("sous-titre","9a8f78","8a979c","sur fond sombre"),
   ("citation","cdd6e0","8a979c","sur fond sombre"),
   ("nom du lieutenant","eef3f9","8a979c","sur fond sombre"),
   ("titron (CSS ref)","8a8069","8a979c","sur fond sombre"),
   ("papier du bon","efe7d6","eae0c8","sur le papier"),
   ("libelle de ligne","887c6f","c0b59a","sur le papier"),
   ("etiquette BON DE COMMANDE","8a7f6b","b9ad92","sur le papier"),
   ("valeur noire","2a2118","221600","sur le papier"),
   ("valeur rouge","a8402f","ff5a4d","sur le papier")]
print("  %-28s %-22s %-22s %8s %8s  %s"%("partie","reference","capture","d(R-B)","d(L)","zone"))
froid=0; total=0
for n,a,b,z in P:
    A,B=hx(a),hx(b); ta,tb=A[0]-A[2],B[0]-B[2]
    print("  %-28s #%s R-B=%+4d L=%5.1f  #%s R-B=%+4d L=%5.1f  %+8d %+8.1f  %s"%(n,a,ta,lum(A),b,tb,lum(B),tb-ta,lum(B)-lum(A),z))
    if z=="sur fond sombre": total+=1; froid += 1 if tb-ta<0 else 0
print("\n  sur FOND SOMBRE : %d/%d parties refroidissent (d(R-B) < 0)"%(froid,total))
chauds=[(n,a,b) for n,a,b,z in P if z=="sur le papier"]
print("  sur le PAPIER : d(R-B) = %s"%[ (n, (hx(b)[0]-hx(b)[2])-(hx(a)[0]-hx(a)[2])) for n,a,b in chauds])
print("\n  CONTROLE POSITIF #efe7d6 : R-B = %+d (attendu +25)"%(hx("efe7d6")[0]-hx("efe7d6")[2]))
print("  CONTROLE NEGATIF #808080 : R-B = %+d (attendu 0)"%(hx("808080")[0]-hx("808080")[2]))
