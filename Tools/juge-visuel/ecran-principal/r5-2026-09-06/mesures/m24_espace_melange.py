# Hypothese a UNE variable : "l'arc et l'anneau sont la MEME couleur source a la MEME opacite,
# composee en sRGB (maquette) et en LINEAIRE (client)". On resout T depuis le canon pour chaque alpha,
# on recompose en lineaire, on compare au client. Un minimum net = erreur de MODELE, pas N erreurs.
from common import *
def s2l(v): 
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def l2s(v):
    v=max(0.0,min(1.0,v))
    return 255*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055)
def test(nom,bg_ref,c_ref,bg_cap,c_cap):
    print(f'  {nom}: canon {c_ref} sur {bg_ref} ; client {c_cap} sur {bg_cap}')
    best=None
    a=0.05
    while a<=1.0001:
        T=[bg_ref[i]+(c_ref[i]-bg_ref[i])/a for i in range(3)]
        if any(t<0 or t>255 for t in T): a+=0.01; continue
        lin=[l2s(s2l(bg_cap[i])+a*(s2l(T[i])-s2l(bg_cap[i]))) for i in range(3)]
        err=sum((lin[i]-c_cap[i])**2 for i in range(3))**0.5
        srgb=[bg_cap[i]+a*(T[i]-bg_cap[i]) for i in range(3)]
        errs=sum((srgb[i]-c_cap[i])**2 for i in range(3))**0.5
        if best is None or err<best[0]: best=(err,a,T,lin,errs,srgb)
    a+=0.01
    # (boucle corrigee ci-dessous)
    return best
def test2(nom,bg_ref,c_ref,bg_cap,c_cap):
    print(f'  {nom}: canon {c_ref} sur fond {bg_ref} ; client {c_cap} sur fond {bg_cap}')
    best=None
    for k in range(5,101):
        a=k/100.0
        T=[bg_ref[i]+(c_ref[i]-bg_ref[i])/a for i in range(3)]
        if any(t<0 or t>255 for t in T): continue
        lin=[l2s(s2l(bg_cap[i])+a*(s2l(T[i])-s2l(bg_cap[i]))) for i in range(3)]
        err=max(abs(lin[i]-c_cap[i]) for i in range(3))
        srgb=[bg_cap[i]+a*(T[i]-bg_cap[i]) for i in range(3)]
        errs=max(abs(srgb[i]-c_cap[i]) for i in range(3))
        if best is None or err<best[0]: best=(err,a,T,lin,errs,srgb)
    e,a,T,lin,es,sr=best
    print(f'     meilleur alpha={a:.2f} ; couleur source deduite T=({T[0]:.0f},{T[1]:.0f},{T[2]:.0f})')
    print(f'     prediction LINEAIRE ({lin[0]:.0f},{lin[1]:.0f},{lin[2]:.0f}) -> ecart max {e:.1f}/255')
    print(f'     prediction sRGB     ({sr[0]:.0f},{sr[1]:.0f},{sr[2]:.0f}) -> ecart max {es:.1f}/255')
r=op(REF); c=op(C24)
print('  fond du cadran : REF', med(r,570,60,600,75), ' CAP', med(c,520,55,560,72))
BGR=med(r,570,60,600,75); BGC=med(c,520,55,560,72)
test2('arc TEAL',   BGR,(70,103,114), BGC,(109,150,155))
test2('arc BRAISE', BGR,(133,71,62),  BGC,(180,102,89))
