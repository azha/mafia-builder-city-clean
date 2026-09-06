# m34 — (a) "poids" typographique : fraction d encre dans la bbox du mot (invariant d echelle) ;
#       (b) bordure or du don-rang : energie normalisee, controle positif = separateur de tete.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def poids(im,x0,y0,x1,y1,seuil,label,S):
    px=im.load(); xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if px[x,y][0]>seuil: xs.append(x);ys.append(y);n+=1
    if not xs: print('  %s RIEN'%label); return
    w=max(xs)-min(xs)+1; h=max(ys)-min(ys)+1
    print('  %-30s encre=%d px, bbox=%dx%d, remplissage=%.1f%%  (bbox CSS %.1fx%.1f)'%(
        label,n,w,h,100.0*n/(w*h),w/S,h/S))
print('\nPOIDS de "Repos" (rang2)')
poids(ref,910,970,1050,1020,120,'REF Repos',2.0)
poids(cap,855,1165,1000,1210,120,'CAP Repos',1.88036)
print('\nPOIDS du libelle etat')
poids(ref,940,1018,1050,1050,110,'REF "ETAT"',2.0)
poids(cap,900,1208,1000,1240,110,'CAP "Etat"',1.88036)
print('\nPOIDS du sous-titre "3 LIEUTENANTS"')
poids(ref,200,152,510,188,110,'REF sous-titre',2.0)
poids(cap,200,363,515,398,110,'CAP sous-titre',1.88036)
print('\nPOIDS du titre "LA FAMILLE"')
poids(ref,200,70,610,118,140,'REF titre',2.0)
poids(cap,200,290,600,335,140,'CAP titre',1.88036)
print('\nBORDURE OR du don-rang : energie normalisee sur le bord GAUCHE (coupe horizontale)')
def energie_h(im,ys,x0,x1,bg,S,label):
    px=im.load(); vals=[]
    for y in ys:
        vals.append(sum(max(0,px[x,y][0]-bg[0]) for x in range(x0,x1)))
    vals.sort(); m=vals[len(vals)//2]
    print('  %-28s energie R/px-CSS = %.1f  (min %d max %d)'%(label,m/S,vals[0],vals[-1]))
energie_h(ref,range(330,420),42,54,(22,25,27),2.0,'REF bord gauche don-rang')
energie_h(cap,range(575,650),51,63,(22,22,28),1.88036,'CAP bord gauche don-rang')
print('  (controle positif, trait opaque)')
def energie_v(im,xs,y0,y1,bg,S,label):
    px=im.load(); vals=[]
    for x in xs:
        vals.append(sum(max(0,px[x,y][0]-bg[0]) for y in range(y0,y1)))
    vals.sort(); m=vals[len(vals)//2]
    print('  %-28s energie R/px-CSS = %.1f'%(label,m/S))
energie_v(ref,range(350,750),226,236,(22,25,27),2.0,'REF separateur de tete')
energie_v(cap,range(350,750),470,480,(24,24,29),1.88036,'CAP separateur de tete')
