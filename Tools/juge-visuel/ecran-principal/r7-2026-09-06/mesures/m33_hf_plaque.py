# -- m33 : contraste HAUTE FREQUENCE du fond de la plaque (ce qui rend une structure LISIBLE),
#    = ecart-type de L apres retrait d'une tendance lisse (moyenne glissante 20 CSS).
#    Controle positif : la meme sonde sur l'ART hors plaque doit rendre une valeur bien plus grande.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
def hf(key, box, nom, k_css=20.0, seuil=48):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    W=X1-X0; H=Y1-Y0
    L=[[lum(d[X0+x,Y0+y]) for x in range(W)] for y in range(H)]
    k=int(round(k_css*s))
    # moyenne glissante separable
    def blur(M,k):
        H_=len(M); W_=len(M[0])
        T=[[0.0]*W_ for _ in range(H_)]
        for y in range(H_):
            acc=0.0; row=M[y]
            for x in range(W_):
                acc+=row[x]
                if x>=k: acc-=row[x-k]
                T[y][x]=acc/min(x+1,k)
        O=[[0.0]*W_ for _ in range(H_)]
        for x in range(W_):
            acc=0.0
            for y in range(H_):
                acc+=T[y][x]
                if y>=k: acc-=T[y-k][x]
                O[y][x]=acc/min(y+1,k)
        return O
    Bl=blur(L,k)
    vals=[]
    for y in range(k,H-k):
        for x in range(k,W-k):
            if L[y][x]<seuil: vals.append(L[y][x]-Bl[y][x])
    n=len(vals); m=sum(vals)/n
    sd=math.sqrt(sum((v-m)**2 for v in vals)/n)
    vs=sorted(vals)
    print("  %-4s %-34s n=%6d  ecart-type HF = %.2f L   p2=%.1f p98=%.1f (etendue %.1f)"%(key,nom,n,sd,vs[int(0.02*n)],vs[int(0.98*n)],vs[int(0.98*n)]-vs[int(0.02*n)]))
    return sd
print("=== fond de la plaque de fiche ===")
a=hf('ref',(16,428,377,591),'plaque (canon)')
b=hf('c19',(16,428,377,591),'plaque (jeu 1920)')
c=hf('c24',(16,602,377,765),'plaque (jeu 2400)')
print("  ⇒ rapport jeu/canon : x%.2f (1920) · x%.2f (2400)"%(b/a,c/a))
print("=== CONTROLE POSITIF : art du district hors plaque (structure pleine) ===")
hf('ref',(16,250,377,410),'art (canon)')
hf('c19',(16,250,377,410),'art (jeu 1920)')
