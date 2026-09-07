"""m30 — ADDENDUM (v2) : regularite des positions.
m29 avait un instrument DEGENERE : minimiser le residu ABSOLU fait toujours gagner le plus
petit pas (tout reel est a moins de p/2 d'un multiple de p). Correction : on minimise le
residu NORMALISE r/p (un vrai pas donne r/p << 0,25 ; du bruit donne ~0,25), avec p >= 8 px,
et on compare a un controle negatif de meme taille.
Controle positif : serie batie sur 107,5 px  ->  doit rendre p = 107,5 et r/p = 0.
Controle negatif : 20 tirages uniformes      ->  r/p doit rester proche de 0,25.
"""
import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def pas(vals, pmin=8.0, pmax=400.0, step=1/64):
    best=None; p=pmin
    while p<=pmax:
        r=max(min(v%p, p-(v%p)) for v in vals)
        s=r/p
        if best is None or s<best[2]: best=(p,r,s)
        p+=step
    return best
def rapport(lab,vals):
    p,r,s=pas(vals)
    print(f"    {lab:44s} p={p:8.4f} px  residu={r:6.3f} px  r/p={s:.3f}")
    return p,r,s

CY=[483.465,511.884,690.023,727.974,839.799,875.366,904.383,998.126,1098.250,1101.254,
    1212.520,1320.068,1408.948,1548.954,1558.568,1585.001,1847.776,1883.469,1968.526,2107.523]
CX=[19.311,1059.689,79.500,500.896,47.411,359.002,383.849,719.998,1031.589]
TUILES=[998.126,1101.254,1212.520,1320.068]
print("  --- pas commun, residu NORMALISE (jeu 1080x2400) ---")
rapport("20 bords horizontaux (centres)",CY)
rapport("9 bords verticaux (centres)",CX)
rapport("4 bords hauts de tuile",TUILES)
random.seed(11)
print("  [ctrl positif] serie 107,5 :", [round(v,4) for v in pas([107.5*k for k in range(1,9)])])
print("  [ctrl negatif] 20 uniformes:", [round(v,4) for v in pas([random.uniform(400,2100) for _ in range(20)])])
print("  [ctrl negatif] 9 uniformes :", [round(v,4) for v in pas([random.uniform(10,1070) for _ in range(9)])])
print()
print("  --- parties fractionnaires (20 bords horizontaux) ---")
fr=sorted(round(v%1,3) for v in CY)
print("   ",fr)
proches=[v for v in CY if min(v%1,1-(v%1))<0.05 or abs((v%1)-0.5)<0.05]
print(f"    bords a moins de 0,05 px d'un ENTIER ou d'un DEMI : {len(proches)}/20 -> {[round(v,3) for v in proches]}")
print("    (attendu si les positions etaient quelconques : ~20 % soit 4/20)")
print()
print("  --- alignements exacts entre elements sans raison de partager une coordonnee ---")
noms=["cadre haut","panneau titre haut","filet enseigne","compteurs haut","compteurs bas",
      "elast. haut","carte haut","tuile1 haut","tuile1 bas","tuile2 haut","tuile3 haut",
      "tuile4 haut","tuile4 bas","elast. bas","carte bas","pann. bas haut","pann. bas bas",
      "CTA haut","CTA bas","cadre bas"]
for i in range(len(CY)):
    for j in range(i+1,len(CY)):
        d=abs(CY[i]-CY[j])
        if d<4.0:
            print(f"    {noms[i]} ({CY[i]:.3f})  ~  {noms[j]} ({CY[j]:.3f})   ecart {d:.3f} px")
