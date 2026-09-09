# m05 — profil horizontal au centre du 1er rond du dock : cerclage + remplissage
from lib import *
r=load(REF); c=load(CAP19)

def prof(im,y,x0,x1,s,label):
    print(f"  {label}  (y={y} px = {y/s:.2f} CSS)")
    out=[]
    for x in range(x0,x1):
        p=im.getpixel((x,y)); out.append((x,p,lum(p)))
    # imprime tous les 3 px
    line=[]
    for x,p,l in out:
        line.append(f"{(x/s):6.1f}:{l:5.1f}")
    for i in range(0,len(line),8):
        print('    '+' '.join(line[i:i+8]))
    return out

print("== m05 profil du rond 1 du dock ==")
prof(r,1920,200,370,S_REF,'REFERENCE rond 1')
print()
prof(c,1760,180,340,S_CAP,'JEU 1080x1920 rond 1')
