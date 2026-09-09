# m28 - RESOLUTION 1080x1920 : la carte respecte-t-elle la gouttiere ?
# Methode : recalage de la reference sur la capture 1920 par le meme cout que m06, puis
# (a) ou commence / finit le contenu, (b) que voit-on SOUS le bandeau et SOUS le dock.
# CONTROLE : le meme cout applique a la capture 2400 doit retrouver s=1,0221 / ty=+8 (m06).
from PIL import Image, ImageChops
import json
ref=Image.open('../reference-1080x2102.png').convert('RGB')
c19=Image.open('../capture-1080x1920.png').convert('RGB')
c24=Image.open('../capture-1080x2400.png').convert('RGB')
print('ref',ref.size,'cap1920',c19.size,'cap2400',c24.size)
def maxband(im):
    r,g,b=im.split()
    return ImageChops.lighter(ImageChops.lighter(r,g),b)
def cout(cap,CROP,s,tx,ty,thr=8):
    w=ref.transform(cap.size,Image.AFFINE,(1/s,0,-tx/s,0,1/s,-ty/s),resample=Image.BILINEAR).crop(CROP)
    d=maxband(ImageChops.difference(w,cap.crop(CROP)))
    h=d.histogram(); return sum(h[thr+1:])/sum(h)
def cale(cap,CROP,sr,txr,tyr):
    best=None
    for s in sr:
        for tx in txr:
            for ty in tyr:
                c=cout(cap,CROP,s,tx,ty)
                if best is None or c<best[0]: best=(c,s,tx,ty)
    return best
print('\nCONTROLE : recalage sur la capture 2400 (attendu s~1,0221 tx~-12 ty~+8)')
b=cale(c24,(20,300,1060,2100),[1.014+0.002*k for k in range(9)],[-20+2.0*k for k in range(9)],[0+2.0*k for k in range(9)])
print('   ',[round(v,4) for v in b])
print('\nRECALAGE sur la capture 1920 (zone centrale, hors chrome)')
b19=cale(c19,(30,400,1050,1500),[0.78+0.01*k for k in range(14)],[-30+6.0*k for k in range(11)],[-60+8.0*k for k in range(16)])
print('   grossier',[round(v,4) for v in b19])
c,s,tx,ty=b19
for it in range(4):
    st=(0.002/(2**it),1.0/(2**it))
    imp=True
    while imp:
        imp=False
        for ds in (-st[0],0,st[0]):
            for dx in (-st[1],0,st[1]):
                for dy in (-st[1],0,st[1]):
                    if ds==0==dx==dy: continue
                    cc=cout(c19,(30,400,1050,1500),s+ds,tx+dx,ty+dy)
                    if cc<c-1e-7: c,s,tx,ty=cc,s+ds,tx+dx,ty+dy; imp=True
print(f'   FIN  s={s:.5f} tx={tx:.2f} ty={ty:.2f} cout={c:.4f}')
print(f'   -> la reference (contenu y 219..2101) occuperait y {219*s+ty:.1f} .. {2101*s+ty:.1f} dans la capture 1920')
print(f'   -> x : ref 0 -> {tx:.1f} ; ref 1079 -> {1079*s+tx:.1f}')
print('\n--- ce qui est SOUS le chrome a 1920 : le bandeau (0..143 px) et le dock ---')
px=c19.load()
# le bandeau du HUD fait 52 CSS-HUD = 143 px ; le dock : mesure sur l'image
print('   contenu attendu sous le bandeau (y=0..143) : la peinture doit etre absente si la gouttiere est respectee')
import statistics
for y in (20,60,100,130,140):
    row=[px[x,y] for x in range(0,1080,17)]
    print(f'    y={y:4d} L median {statistics.median(0.299*p[0]+0.587*p[1]+0.114*p[2] for p in row):6.1f}  ecart-type {statistics.pstdev([0.299*p[0]+0.587*p[1]+0.114*p[2] for p in row]):6.1f}')
print('   bas de l ecran :')
for y in (1700,1760,1800,1850,1880,1900):
    row=[px[x,y] for x in range(0,1080,17)]
    print(f'    y={y:4d} L median {statistics.median(0.299*p[0]+0.587*p[1]+0.114*p[2] for p in row):6.1f}  ecart-type {statistics.pstdev([0.299*p[0]+0.587*p[1]+0.114*p[2] for p in row]):6.1f}')
