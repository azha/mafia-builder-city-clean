# m12b — bbox du DISQUE du manometre, resserre : on suit l anneau sur la colonne centrale.
from PIL import Image
def ring(path,label,xc,xw=90):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    ys=[]
    for y in range(0,500):
        for x in range(xc-xw,xc+xw):
            r,g,b=px[x,y]
            if r>130 and r-b>60 and 60<g<200: ys.append(y); break
    # segments continus
    seg=[];cur=ys[0];prev=ys[0]
    for y in ys[1:]:
        if y-prev>4: seg.append((cur,prev)); cur=y
        prev=y
    seg.append((cur,prev))
    print('  %s anneau sur x%d..%d : segments y = %s'%(label,xc-xw,xc+xw,seg))
    return seg
print('=== CAPTURE (centre x=540) ==='); sc=ring('../capture-1080x2400.png','capture',540)
print('=== REFERENCE (centre x=540) ==='); sr=ring('../reference-1080x2102.png','reference',540)
print()
print('CAPTURE  : bandeau bas y=142 ; anneau descend a y=%d  => le manometre deborde de %d px SOUS le bandeau'%(sc[-1][1], sc[-1][1]-142))
print('REFERENCE: bandeau bas y=228 ; anneau descend a y=%d  => debordement %d px'%(sr[-1][1], sr[-1][1]-228))
