# m17 : zone du bas -- la legende de la capture est-elle EN TROP, et la ligne d'aide
# de la reference est-elle ABSENTE ? Deux fenetres, deux signes attendus opposes.
from PIL import Image, ImageFilter
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rr=ref.resize((int(1080*S),int(2102*S)),Image.LANCZOS)
canv=Image.new('RGB',(1080,2400)); canv.paste(rr,(DX,DY))
a=canv.filter(ImageFilter.GaussianBlur(3)).load(); b=cap.filter(ImageFilter.GaussianBlur(3)).load()
def delta(x0,y0,x1,y1,nom):
    s=[0,0,0]; n=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            p,q=a[x,y],b[x,y]
            for k in range(3): s[k]+=q[k]-p[k]
            n+=1
    print(f"  {nom:44s} dR={s[0]/n:+7.1f} dG={s[1]/n:+7.1f} dB={s[2]/n:+7.1f}")
delta(40,2108,500,2136,"bande de legende de la CAPTURE (en trop ?)")
delta(120,2015,960,2100,"ligne d'aide de la REFERENCE (absente ?)")
delta(40,2140,500,2150,"temoin : juste sous la legende")
