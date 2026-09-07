# -*- coding: utf-8 -*-
"""ENCRE et CONTRASTE : couleur de l'encre = mediane des pixels du DECILE SUPERIEUR de luminance
dans la fenetre (le median simple rend le fond). Contraste WCAG encre/fond.
CONTROLE POSITIF : l'encre du titre de la REFERENCE doit tomber sur #f2c96b (242,201,107) a +-12/canal
   (jeton .enseigne b). CONTROLE NEGATIF : l'encre du sous-titre (#b9ad92) doit en DIFFERER de >=25/canal."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rl(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def ratio(a,b):
    la,lb=rl(a)+0.05,rl(b)+0.05
    return max(la,lb)/min(la,lb)
def encre(im,x0,y0,x1,y1,q=0.90):
    px=im.load()
    ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum)
    top=ps[int(len(ps)*q):]
    return tuple(sorted(p[i] for p in top)[len(top)//2] for i in range(3))
def fond(im,x0,y0,x1,y1,q=0.25):
    px=im.load()
    ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum)
    lo=ps[:max(1,int(len(ps)*q))]
    return tuple(sorted(p[i] for p in lo)[len(lo)//2] for i in range(3))
def hexa(c): return "#%02x%02x%02x"%c
def ligne(im,tag,fen,jeton=None):
    e=encre(im,*fen); f=fond(im,*fen); r=ratio(e,f)
    j = "  jeton attendu %s" % jeton if jeton else ""
    print("   %-34s encre %s %s  fond %s %s  contraste %5.2f:1%s" % (tag,e,hexa(e),f,hexa(f),r,j))
    return e,f,r

ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("ref",ref.size,"cap",cap.size)
print("\n--- REFERENCE #113 ---")
e_t,_,_=ligne(ref,"titre 'L’horizon'",        (330,513,740,560),"#f2c96b (242,201,107)")
e_s,_,_=ligne(ref,"sous-titre",               (205,585,865,612),"#b9ad92 (185,173,146)")
ligne(ref,"compteur '02'",                    (150,700,222,740),"#7fd4d9 (127,212,217)")
ligne(ref,"libelle 'A PORTEE'",               (138,755,270,773),"#8a979c (138,151,156)")
ligne(ref,"CTA",                              (324,1933,755,1966),"#f2c96b")
ligne(ref,"note bas",                         (362,2018,720,2040),"#8a979c")
print("\n--- CAPTURE etat-vide ---")
ligne(cap,"titre \"L'horizon\"",              (330,330,752,380),"#f2c96b (242,201,107)")
ligne(cap,"sous-titre",                       (225,393,855,418),"#b9ad92 (185,173,146)")
ligne(cap,"compteur '00'",                    (150,538,258,582),"#7fd4d9 (127,212,217)")
ligne(cap,"libelle 'A PORTEE'",               (137,588,270,610),"#8a979c (138,151,156)")
ligne(cap,"titre bloc 'L'ECHELLE DES PALIERS'",(118,740,530,775))
ligne(cap,"item 'Palier 2'",                  (150,793,280,823))
ligne(cap,"sous-ligne 'le serveur ne dit…'",  (158,843,930,877))
ligne(cap,"pave i 'CE QUE LE SERVEUR…'",      (82,1883,655,1905))
ligne(cap,"pave b 'Rien a l'horizon'",        (83,1923,500,1965))
ligne(cap,"pave small",                       (83,1998,976,2062))
print()
print("CONTROLE POSITIF titre REF =",e_t,hexa(e_t),"attendu (242,201,107) ecart max/canal =",max(abs(e_t[i]-(242,201,107)[i]) for i in range(3)))
print("CONTROLE NEGATIF sous-titre REF =",e_s,hexa(e_s),"ecart au titre =",max(abs(e_t[i]-e_s[i]) for i in range(3)))
