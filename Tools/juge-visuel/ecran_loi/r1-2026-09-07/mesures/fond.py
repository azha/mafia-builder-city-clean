# Le fond du panneau : degrade (maquette) ou aplat (capture) ?
# CSS .parl6{background:linear-gradient(180deg,#1b1f24,#14181d 58%,#101317)}
#     .pl-tete{background:#1a1f26 ; border-bottom:1px solid #333c46}
# Controle positif : la reference doit rendre #1a1f26 dans .pl-tete et un fond qui DESCEND
#   vers #101317 en bas du panneau. Controle negatif : si l instrument rendait la meme valeur
#   partout sur la reference, il ne mesurerait pas le degrade.
from PIL import Image
import statistics as st
def med(im,x0,y0,x1,y1):
    px=im.load(); r=[];g=[];b=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; r.append(c[0]); g.append(c[1]); b.append(c[2])
    return (int(st.median(r)),int(st.median(g)),int(st.median(b)))
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('REFERENCE, colonne de fond x 900..1000 (hors encre) :')
for y in [440,470,560,620,900,1450,1550,1650,1700,1740]:
    c=med(ref,900,y,1000,y+12); print('   y=%4d  %s  #%02x%02x%02x'%(y,c,*c))
print('   .pl-bas y=1780..1800 :', med(ref,900,1780,1000,1800))
print()
print('CAPTURE, colonne de fond x 900..1000 :')
for y in [150,300,470,600,1300,1500,1700,1900,2100,2160]:
    c=med(cap,900,y,1000,y+12); print('   y=%4d  %s  #%02x%02x%02x'%(y,c,*c))
print()
print('CAPTURE : y ou le fond cesse d etre (13,13,13) vers le bas (plaque du dock ?)')
px=cap.load()
prev=None
for y in range(1900,2400):
    c=med(cap,20,y,60,y+1)
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>2:
        print('   y=%4d %s'%(y,c)); prev=c
