from PIL import Image
REF='../ecran-canon.png'; REF_S=3.0
C19='../capture-fiche-1080x1920.png'; CAP_S=1080/392.0
C24='../capture-district-1080x2400.png'
F24='../capture-fiche-sous-chrome-1080x2400.png'
T24='../temoin-chrome-famille-1080x2400.png'
def op(p):
    im=Image.open(p).convert('RGB'); print(f'  OPEN {p} {im.size}'); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def srgb_lin(v):
    v=v/255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def relL(c): return 0.2126*srgb_lin(c[0])+0.7152*srgb_lin(c[1])+0.0722*srgb_lin(c[2])
def contrast(a,b):
    la,lb=relL(a),relL(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(int(y0),int(y1)):
        for x in range(int(x0),int(x1)):
            c=px[x,y]
            for i in range(3): ch[i].append(c[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)
