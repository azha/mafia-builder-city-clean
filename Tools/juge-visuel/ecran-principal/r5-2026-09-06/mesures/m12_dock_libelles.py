# Grandeur : hauteur de capitale et chasse des libelles du dock (EMPIRE / FAMILLE / PLUS).
# Controle positif : REF EMPIRE doit rendre chasse 35,67 CSS et capitale 6,00 CSS (r3 grandeurs 22-23).
from txt import *
def mot(im,box,scale,label):
    cols,base=colonnes(im,box)
    segs=segments(cols,gap=6,minw=3)
    if not segs: print(f'  {label}: rien'); return
    x0=segs[0][0]; x1=segs[-1][1]
    ys=[y for x,yy in cols for y in yy if x0<=x<=x1]
    h=max(ys)-min(ys)+1
    print(f'  {label}: chasse x {x0}..{x1} = {x1-x0+1} px = {(x1-x0+1)/scale:6.2f} CSS ; capitale {h} px = {h/scale:5.2f} CSS ; y {min(ys)}..{max(ys)} = {min(ys)/scale:.2f}..{(max(ys)+1)/scale:.2f} CSS ; {len(segs)} groupes')
r=op(REF)
mot(r,(200,2000,400,2035),REF_S,'REF EMPIRE')
mot(r,(400,2000,600,2035),REF_S,'REF FAMILLE')
mot(r,(830,2000,990,2035),REF_S,'REF PLUS')
c=op(C24)
mot(c,(130,2310,290,2350),CAP_S,'CAP2400 EMPIRE')
mot(c,(350,2310,515,2350),CAP_S,'CAP2400 FAMILLE')
mot(c,(800,2310,950,2350),CAP_S,'CAP2400 PLUS')
t=op(T24)
mot(t,(190,2310,330,2350),CAP_S,'TEMOIN EMPIRE')
mot(t,(375,2310,520,2350),CAP_S,'TEMOIN FAMILLE')
mot(t,(760,2310,900,2350),CAP_S,'TEMOIN PLUS')
