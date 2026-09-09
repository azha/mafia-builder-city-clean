# m28b - recalage 1920 : la plage de translation verticale du m28 etait trop etroite (+-60 px)
# alors que la carte est visiblement decalee de ~-200 px. Plage elargie a -320..+80.
from PIL import Image, ImageChops
ref=Image.open('../reference-1080x2102.png').convert('RGB')
c19=Image.open('../capture-1080x1920.png').convert('RGB')
print('ref',ref.size,'cap1920',c19.size)
def maxband(im):
    r,g,b=im.split(); return ImageChops.lighter(ImageChops.lighter(r,g),b)
CROP=(30,400,1050,1400)
def cout(s,tx,ty,thr=8):
    w=ref.transform(c19.size,Image.AFFINE,(1/s,0,-tx/s,0,1/s,-ty/s),resample=Image.BILINEAR).crop(CROP)
    d=maxband(ImageChops.difference(w,c19.crop(CROP)))
    h=d.histogram(); return sum(h[thr+1:])/sum(h)
best=None
for i in range(20):
    s=0.94+0.006*i
    for j in range(16):
        tx=-40+6.0*j
        for k in range(26):
            ty=-320+16.0*k
            c=cout(s,tx,ty)
            if best is None or c<best[0]: best=(c,s,tx,ty)
c,s,tx,ty=best
print('grossier',[round(v,4) for v in best])
for it in range(5):
    st=(0.003/(2**it),2.0/(2**it))
    imp=True
    while imp:
        imp=False
        for ds in (-st[0],0,st[0]):
            for dx in (-st[1],0,st[1]):
                for dy in (-st[1],0,st[1]):
                    if ds==0==dx==dy: continue
                    cc=cout(s+ds,tx+dx,ty+dy)
                    if cc<c-1e-7: c,s,tx,ty=cc,s+ds,tx+dx,ty+dy; imp=True
print(f'RECALAGE 1920 : s={s:.5f} tx={tx:.2f} ty={ty:.2f} cout={c:.4f}')
print('  controle positif dy=+10 :',round(cout(s,tx,ty+10),4),' dx=+10 :',round(cout(s,tx+10,ty),4))
print(f'  contenu de la reference (y 219..2101) -> y {219*s+ty:.1f} .. {2101*s+ty:.1f}')
print(f'  x : ref 0 -> {tx:.1f} ; ref 1079 -> {1079*s+tx:.1f}')
print(f'  echelle par rapport a la capture 2400 (s=1,0221) : {s/1.0221:.4f}')
