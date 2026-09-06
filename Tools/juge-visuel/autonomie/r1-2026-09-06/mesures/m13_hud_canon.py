# m13 — le manometre deborde-t-il du bandeau DANS LE CANON DU HUD ? (autorite du chrome, cf dossier)
from PIL import Image
p='/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png'
im=Image.open(p).convert('RGB'); px=im.load()
print('OUVERT',p,im.size)
xc=im.width//2
ys=[]
for y in range(0,int(im.height*0.25)):
    for x in range(xc-100,xc+100):
        r,g,b=px[x,y]
        if r>130 and r-b>60 and 60<g<200: ys.append(y); break
seg=[];cur=ys[0];prev=ys[0]
for y in ys[1:]:
    if y-prev>4: seg.append((cur,prev)); cur=y
    prev=y
seg.append((cur,prev))
print('  anneau du manometre : segments y =',seg)
# bas du bandeau : la regle orange, hors du disque (x 0.85w..0.98w)
print('  regle orange du bandeau (x %d..%d) :'%(int(im.width*.85),int(im.width*.98)))
for y in range(0,int(im.height*0.2)):
    q=list(im.crop((int(im.width*.85),y,int(im.width*.98),y+1)).getdata()); n=len(q)
    c=tuple(sorted(t[k] for t in q)[n//2] for k in range(3))
    if c[0]>c[2]+25: print('     y=%4d %s'%(y,str(c)))
