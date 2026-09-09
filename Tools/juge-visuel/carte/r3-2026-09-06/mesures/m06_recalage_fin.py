# m06 - recalage fin ref -> capture hors chrome (2400). Resampling par PIL (C), cout = part de
# pixels dont le max-canal |diff| depasse 6/255 sur une zone de contenu EXCLUANT les bords.
from PIL import Image, ImageChops
import json
ref=Image.open('../reference-1080x2102.png').convert('RGB')
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('ref',ref.size,'cap',cap.size)
CROP=(20,300,1060,2100)   # dans le repere CAPTURE
capc=cap.crop(CROP)
def warp(s,tx,ty,sy=None):
    sy=s if sy is None else sy
    return ref.transform(cap.size, Image.AFFINE, (1.0/s,0,-tx/s, 0,1.0/sy,-ty/sy), resample=Image.BILINEAR)
def maxband(im):
    r,g,b=im.split(); return ImageChops.lighter(ImageChops.lighter(r,g),b)
def cost(s,tx,ty,sy=None,thr=6):
    w=warp(s,tx,ty,sy).crop(CROP)
    d=maxband(ImageChops.difference(w,capc))
    h=d.histogram()
    tot=sum(h); bad=sum(h[thr+1:])
    return bad/tot
best=None
for s in [1.014+0.001*k for k in range(11)]:
    for tx in [-20+1.0*k for k in range(16)]:
        for ty in [6+1.0*k for k in range(18)]:
            c=cost(s,tx,ty)
            if best is None or c<best[0]: best=(c,s,tx,ty)
c,s,tx,ty=best
print(f'grossier  s={s:.4f} tx={tx:.2f} ty={ty:.2f} cout={c:.4f}')
ss,st=0.0004,0.5
for it in range(6):
    improved=True
    while improved:
        improved=False
        for ds in (-ss,0,ss):
            for dtx in (-st,0,st):
                for dty in (-st,0,st):
                    if ds==0==dtx==dty: continue
                    cc=cost(s+ds,tx+dtx,ty+dty)
                    if cc<c-1e-7: c,s,tx,ty=cc,s+ds,tx+dtx,ty+dty; improved=True
    ss/=2; st/=2
print(f'RECALAGE FIN  s={s:.5f}  tx={tx:.3f}  ty={ty:.3f}  cout={c:.4f}')
print('  controle positif dx=+8 :', round(cost(s,tx+8,ty),4))
print('  controle positif dy=+8 :', round(cost(s,tx,ty+8),4))
print('  controle negatif aniso sy=s*1.004 :', round(cost(s,tx,ty,s*1.004),4))
print('  controle negatif aniso sy=s*0.996 :', round(cost(s,tx,ty,s*0.996),4))
d=maxband(ImageChops.difference(warp(s,tx,ty).crop(CROP),capc))
h=d.histogram(); tot=sum(h); cum=0; qs={}
for v,cnt in enumerate(h):
    cum+=cnt
    for q in (0.5,0.75,0.9,0.99):
        if q not in qs and cum>=q*tot: qs[q]=v
print('  residu max-canal : mediane %d  p75 %d  p90 %d  p99 %d  (n=%d px)'%(qs[0.5],qs[0.75],qs[0.9],qs[0.99],tot))
json.dump({'s':s,'tx':tx,'ty':ty,'cost':c},open('recalage.json','w'))
print('-> recalage.json')
