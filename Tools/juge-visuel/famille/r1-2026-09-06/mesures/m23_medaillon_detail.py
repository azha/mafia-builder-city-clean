# m23 — halo du medaillon du Don (box-shadow 0 0 14.93px #d9ab4e33) + bbox de la silhouette.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def profil_h(im,y,x0,x1,label,S):
    px=im.load(); print(' %s (y=%d, de l exterieur vers l anneau)'%(label,y))
    print('   ',' '.join('%s'%(px[x,y],) for x in range(x0,x1)))
# REF medl don bbox (84,302,225,442) -> centre y=372, bord gauche x=84
profil_h(ref,372,64,90,'REF halo don (gauche de l anneau)',2.0)
# CAP medl don bbox (90,540,223,672) -> centre y=606, bord gauche x=90
profil_h(cap,606,71,95,'CAP halo don (gauche de l anneau)',1.88036)
print()
# temoin : le medaillon d un LIEUTENANT n a pas de halo
profil_h(ref,606,111,137,'REF (temoin) bord gauche medl rang1 — sans halo',2.0)
profil_h(cap,824,116,142,'CAP (temoin) bord gauche medl rang1 — sans halo',1.88036)
print('\n--- silhouette : bbox de l encre claire (#cfc4a6) dans le medaillon ---')
bt=lambda p: p[0]>140 and p[1]>130 and p[2]>110 and abs(p[0]-p[1])<40
def bb(im,x0,y0,x1,y1,label,S,mx0,my0,mx1,my1):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if bt(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print('  %s RIEN'%label); return
    b=(min(xs),min(ys),max(xs),max(ys))
    dw=mx1-mx0+1; dh=my1-my0+1
    print('  %-28s bbox=%-24s | en %% du medaillon : x %5.1f%%..%5.1f%%  y %5.1f%%..%5.1f%%  (l=%.1f%% h=%.1f%%)'%(
        label,str(b),100*(b[0]-mx0)/dw,100*(b[2]-mx0)/dw,100*(b[1]-my0)/dh,100*(b[3]-my0)/dh,
        100*(b[2]-b[0]+1)/dw,100*(b[3]-b[1]+1)/dh))
bb(ref,86,304,224,441,'REF buste don',2.0,84,302,225,442)
bb(cap,92,542,222,671,'CAP buste don',1.88036,90,540,223,672)
bb(ref,133,537,271,675,'REF buste lieutenant',2.0,131,535,272,676)
bb(cap,138,759,267,889,'CAP buste lieutenant',1.88036,136,757,268,890)
