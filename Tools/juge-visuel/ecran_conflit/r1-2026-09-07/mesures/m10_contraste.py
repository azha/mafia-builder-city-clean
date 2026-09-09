# m10 — couleurs d'encre et contrastes WCAG des textes de la CAPTURE (et de la REFERENCE en regard).
# Controle positif : sur la REFERENCE, .fam .id b doit rendre #efe6d4 (239,230,212) -> jeton CSS exact.
# Controle negatif : une bande sans texte doit rendre None.
from PIL import Image
def encre(im,box,bg,frac=0.06):
    px=im.load();pool=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            pool.append(px[x,y])
    # on prend les pixels les plus ELOIGNES du fond
    pool.sort(key=lambda p:-max(abs(p[i]-bg[i]) for i in range(3)))
    k=max(8,int(len(pool)*frac)); top=pool[:k]
    R=sorted(p[0] for p in top);G=sorted(p[1] for p in top);B=sorted(p[2] for p in top);n=len(R)//2
    return (R[n],G[n],B[n])
def rl(c):
    c=c/255.0
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(p): return 0.2126*rl(p[0])+0.7152*rl(p[1])+0.0722*rl(p[2])
def ratio(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def bbox(im,box,bg,tol=25):
    px=im.load();xs=[];ys=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            p=px[x,y]
            if max(abs(p[i]-bg[i]) for i in range(3))>tol: xs.append(x);ys.append(y)
    return None if not xs else (min(xs),min(ys),max(xs),max(ys))

ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)

print("\n== REFERENCE (controles positifs sur jetons CSS) ==")
R=[("h3 titre",(48,478,600,522),(32,24,15),"#f0dfc4"),
   ("p sous-titre",(48,540,900,570),(32,24,15),"#9a8a6a"),
   ("titron",(48,1035,700,1060),(30,22,16),"#8a7f6b"),
   ("fam .id b",(207,1315,360,1345),(36,28,20),"#efe6d4"),
   ("fam .id i",(207,1355,500,1382),(36,28,20),"#8a7f6b"),
   ("fam .hist.jamais b",(875,1315,945,1350),(36,28,20),"#6f6350"),
   ("ordre .phrase",(300,730,600,770),(242,236,224),"#2a2118"),
   ("geste (CTA)",(120,1975,700,2005),(36,28,17),"#d9ab4e")]
for n,b,bg,jeton in R:
    e=encre(ref,b,bg); print(f"   {n:20s} encre {str(e):18s} jeton {jeton:9s} contraste {ratio(e,bg):5.2f}:1")

print("\n== CAPTURE ==")
C=[("titre 'Le conflit'",(56,290,420,345),(13,13,13)),
   ("sous-titre l.1",(56,405,1030,440),(13,13,13)),
   ("titron LES QUATRE FAMILLES",(56,525,470,560),(13,13,13)),
   ("mention 'Dessinees...'",(56,585,1040,615),(13,13,13)),
   ("fam nom",(88,885,260,918),(34,42,46)),
   ("fam ligne 2",(88,928,460,962),(34,42,46)),
   ("fam ligne 3",(88,968,420,1006),(34,42,46)),
   ("titron QUI PART CE SOIR",(56,1452,420,1488),(13,13,13)),
   ("message vide (gras)",(56,1518,1040,1552),(13,13,13)),
   ("explication l.1",(56,1585,1030,1615),(13,13,13))]
for n,b,bg in C:
    e=encre(cap,b,bg); print(f"   {n:28s} encre {str(e):18s} contraste {ratio(e,bg):5.2f}:1   bbox {bbox(cap,b,bg)}")
print("\n   CONTROLE NEGATIF (bande vide 1750..1800) :",bbox(cap,(56,1750,1040,1800),(13,13,13)))
