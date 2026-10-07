# m20 — de quelle NATURE est l'ecart de fond ? gain (multiplicatif) ou plancher (additif) ?
# Regression affine JEU -> REF sur les pixels apparies : REF ~ a*JEU + b, par canal.
# Controle positif : la regression du JEU sur LUI-MEME doit rendre a=1, b=0.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
JS={'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",1.0910,-48,3,(170,746)),
    'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",None,None,None,None)}
ir=Image.open(R).convert('RGB'); pxr=ir.load()
def fit(X,Y):
    n=len(X); sx=sum(X); sy=sum(Y); sxx=sum(v*v for v in X); sxy=sum(X[i]*Y[i] for i in range(n))
    d=n*sxx-sx*sx
    a=(n*sxy-sx*sy)/d; b=(sy-a*sx)/n
    res=(sum((Y[i]-a*X[i]-b)**2 for i in range(n))/n)**0.5
    return a,b,res
ij=Image.open(JS['J1920'][0]).convert('RGB'); pxj=ij.load()
s,dx,dy,(ya,yb)=JS['J1920'][1],JS['J1920'][2],JS['J1920'][3],JS['J1920'][4]
print("REF",ir.size,"JEU",ij.size)
C={0:'R',1:'G',2:'B'}
for i in range(3):
    X=[];Y=[]
    for y in range(ya,yb,2):
        for x in range(60,1020,3):
            Xc=int(s*x+dx); Yc=int(s*y+dy)
            if 0<=Xc<ir.width and 0<=Yc<ir.height:
                X.append(pxj[x,y][i]); Y.append(pxr[Xc,Yc][i])
    a,b,res=fit(X,Y)
    print(f"  canal {C[i]} : REF = {a:.3f} * JEU + {b:+.2f}   (residu {res:.2f}/255, n={len(X)})")
    if i==0:
        a2,b2,_=fit(X,X); print(f"     controle positif (JEU sur lui-meme) : a={a2:.3f} b={b2:+.3f}")
