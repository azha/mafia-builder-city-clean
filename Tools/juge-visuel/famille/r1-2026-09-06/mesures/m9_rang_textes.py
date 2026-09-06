# m9 — TEMOIN : ref rang3 "Blanchiment" (rang PLAIN + chip .del cyan) vs cap rang3 (plain + chip cyan).
# Grandeurs : bbox d'encre, hauteur de capitale, chasse, couleur, pour nom / chip / etat-valeur / etat-libelle.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
SR,OXR,OYR=2.0,0,0
SC,OXC,OYC=1.88036,13,232
creme =lambda p: p[0]>150 and p[1]>140 and 15<=p[0]-p[2]<=70
cyan  =lambda p: p[2]>120 and p[2]-p[0]>35 and p[1]>110
def bb(im,x0,y0,x1,y1,pred,label,S,OX,OY):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print('  %-26s : RIEN'%label); return None
    b=(min(xs),min(ys),max(xs),max(ys))
    print('  %-26s px=%-26s | CSS x=%6.1f..%6.1f y=%6.1f..%6.1f  chasse=%5.1f  h=%5.2f  (n=%d)'%(
        label,str(b),(b[0]-OX)/S,(b[2]-OX)/S,(b[1]-OY)/S,(b[3]-OY)/S,(b[2]-b[0]+1)/S,(b[3]-b[1]+1)/S,len(xs)))
    return b
def col(im,x0,y0,x1,y1,pred,label,n=30):
    px=im.load(); ps=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if pred(p): ps.append((p[0]+p[1]+p[2],p))
    if not ps: print('  %-26s : RIEN'%label); return
    ps.sort(reverse=True); sel=[p for _,p in ps[:n]]
    print('  %-26s couleur=%s'%(label,tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3))))
print('\nREFERENCE rang3 (y 1259..1457) — "Blanchiment" / chip DELEGUE / Actif+ETAT')
bb(ref,290,1280,760,1360,creme,'nom Blanchiment',SR,OXR,OYR)
bb(ref,290,1360,760,1430,cyan ,'chip texte DELEGUE',SR,OXR,OYR)
col(ref,290,1280,760,1360,creme,"nom couleur")
col(ref,290,1360,760,1430,cyan ,"chip texte couleur")
bb(ref,850,1290,1070,1350,creme,'etat valeur Actif',SR,OXR,OYR)
bb(ref,850,1350,1070,1400,creme,'etat libelle ETAT',SR,OXR,OYR)
col(ref,850,1290,1070,1350,creme,'etat valeur couleur')
col(ref,850,1350,1070,1400,creme,'etat libelle couleur')
print('\nCAPTURE rang3 (y 1487..1674) — "Cuisinier" / chip RECENT / Repos+Etat')
bb(cap,240,1500,700,1580,creme,'nom Cuisinier',SC,OXC,OYC)
bb(cap,240,1580,700,1650,cyan ,'chip texte RECENT',SC,OXC,OYC)
col(cap,240,1500,700,1580,creme,'nom couleur')
col(cap,240,1580,700,1650,cyan ,'chip texte couleur')
bb(cap,700,1500,1010,1560,creme,'etat valeur Repos',SC,OXC,OYC)
bb(cap,700,1560,1010,1610,creme,'etat libelle Etat',SC,OXC,OYC)
col(cap,700,1500,1010,1560,creme,'etat valeur couleur')
col(cap,700,1560,1010,1610,creme,'etat libelle couleur')
