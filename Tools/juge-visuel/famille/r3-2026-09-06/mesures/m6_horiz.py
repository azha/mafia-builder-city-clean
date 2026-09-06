# m6 — bords horizontaux : don-rang, rangs, boites vides, boite Recruter. Mediane de COLONNE sur la
# bande verticale interieure de chaque objet (robuste au texte).
# Controle positif : largeur CSS du rang attendue 489,07 (=560-2*22,4-26,13) sur la REFERENCE.
# Controle negatif : la boite vide est plus etroite (margin-left 48,53 sur .equipe).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0
FR=2.0
FONDC=(22,22,28); FONDR=(22,25,27)

def medcol(px,x,y0,y1):
    v=[[],[],[]]
    for y in range(y0,y1+1):
        p=px[x,y]
        for i in range(3): v[i].append(p[i])
    return tuple(sorted(k)[len(k)//2] for k in v)

def bornes(px,y0,y1,x0,x1,fond,s=3):
    xs=[x for x in range(x0,x1) if max(abs(medcol(px,x,y0,y1)[i]-fond[i]) for i in range(3))>s]
    return (min(xs),max(xs)) if xs else None

def rap(nom,px,y0,y1,fond,orig,f,xa,xb):
    b=bornes(px,y0,y1,xa,xb,fond)
    if not b: print(nom,"rien"); return
    print("  %-22s px %d..%d  CSS %.2f..%.2f  largeur %.2f"%(nom,b[0],b[1],(b[0]-orig)/f,(b[1]-orig)/f,(b[1]-b[0]+1)/f))

print("\n== REFERENCE ==")
rap("don-rang",r,290,450,FONDR,0,FR,0,1119)
rap("rang1",r,270*2//2+0,0,FONDR,0,FR,0,1119) if False else None
rap("rang1",r,520,700,FONDR,0,FR,0,1119)
rap("rang2",r,925,1110,FONDR,0,FR,0,1119)
rap("rang3",r,1275,1460,FONDR,0,FR,0,1119)
rap("vide1",r,380,430,FONDR,0,FR,0,1119)
rap("vide3",r,755,805,FONDR,0,FR,0,1119)
rap("recruter",r,845,895,FONDR,0,FR,0,1119)

print("\n== CAPTURE ==")
rap("don-rang",c,500,650,FONDC,CX0,FC,13,1065)
rap("rang1",c,700,880,FONDC,CX0,FC,13,1065)
rap("rang2",c,1080,1265,FONDC,CX0,FC,13,1065)
rap("rang3",c,1460,1645,FONDC,CX0,FC,13,1065)
rap("vide1",c,375,0,FONDC,CX0,FC,13,1065) if False else None
rap("vide1",c,375+0,0+0,FONDC,CX0,FC,13,1065) if False else None
rap("vide1",c,380,425,FONDC,CX0,FC,13,1065)
rap("vide3",c,1780,1830,FONDC,CX0,FC,13,1065)
rap("recruter",c,1870,1965,FONDC,CX0,FC,13,1065)
