# m43 — voile du dock : assombrissement mesure (art juste au-dessus vs sous le voile, meme x)
from lib import *
def profile(im,x,y0,y1,s,label,step=8):
    print(f"    {label} (x={x} px = {x/s:.1f} CSS)")
    for y in range(y0,y1,step):
        c=im.getpixel((x,y)); print(f"       y {y/s:7.2f} CSS  {c}  L={lum(c):6.1f}")
print("== m43 voile du dock ==")
r=load(REF); c=load(CAP19); d=load(DIS24)
profile(r,1000,1780,2091,S_REF,'REFERENCE x=333 CSS',24)
print()
profile(c,980,1600,1920,S_CAP,'JEU 1920 x=356 CSS',24)
print()
profile(d,980,2080,2400,S_CAP,'JEU district 2400 x=356 CSS',24)
