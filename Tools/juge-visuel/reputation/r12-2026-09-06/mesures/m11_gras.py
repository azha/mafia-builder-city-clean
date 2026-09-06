import sys; sys.path.insert(0,'.')
from lib import *
from statistics import median

def futs(im, x0,y0,x1,y1, frac=0.60):
    """largeurs des runs horizontaux d'encre AU COEUR (>= frac de l'amplitude locale)"""
    p = px(im)
    L = [[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat = sorted(v for r in L for v in r)
    fond = plat[len(plat)//10]           # 10e centile = fond
    haut = plat[-max(1,len(plat)//50)]   # ~98e centile = encre
    seuil = fond + frac*(haut-fond)
    runs=[]
    for r in L:
        n=0
        for v in r:
            if v>=seuil: n+=1
            else:
                if n>0: runs.append(n)
                n=0
        if n>0: runs.append(n)
    runs=[r for r in runs if r>=2]
    return (round(fond,1), round(haut,1), round(seuil,1), len(runs), median(runs) if runs else None,
            sorted(runs)[len(runs)//4] if runs else None, sorted(runs)[3*len(runs)//4] if runs else None)

# zones homologues (x0,y0,x1,y1) en coordonnees ABSOLUES
Z = {
 # nom : (ref, c2400)
 'CTA caps'          : ((234,1960,844,1990), (237,1997,844,2027)),
 'chiffres 00 (g)'   : ((160,690,240,740),   (163,620,243,670)),
 'sous-titre caps'   : ((140,558,890,580),   (140,519,890,541)),
 'RÈGLES DONNÉES'    : ((78,742,315,762),    (78,672,315,692)),
 'col ouvert'        : ((594,973,740,996),   (615,847,761,870)),
 'titre serif panneau':((88,1638,672,1680),  (85,1758,669,1800)),
 'paragraphe (temoin)':((88,1700,940,1730),  (85,1820,940,1850)),
 'la comptabilite (temoin)':((594,1006,795,1026),(615,880,816,900)),
}
print("=== m11 : fut median du GRAS (planches POST-Bold) ===")
ref = ouvrir('../reference-1080x2102.png')
cap = ouvrir('../capture-1080x2400.png')
print(f"  {'zone':26s} {'fond/encre/seuil REF':24s} {'futs REF':>10s}   {'fond/encre/seuil JEU':24s} {'futs JEU':>10s}   delta")
for nom,(zr,zc) in Z.items():
    fr = futs(ref,*zr); fc = futs(cap,*zc)
    d = (fc[4]-fr[4])/fr[4]*100 if fr[4] else 0
    print(f"  {nom:26s} {str((fr[0],fr[1],fr[2])):24s} n={fr[3]:4d} med={fr[4]:4.1f}  {str((fc[0],fc[1],fc[2])):24s} n={fc[3]:4d} med={fc[4]:4.1f}  {d:+6.1f} %  (q1/q3 REF {fr[5]}/{fr[6]} JEU {fc[5]}/{fc[6]})")
