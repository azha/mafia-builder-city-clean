# m34 — INVENTAIRE EXHAUSTIF DES BLOCS DE TEXTE de la feuille, des deux cotes : toute encre claire
# (L>90) groupee en lignes (vide vertical >= 4 CSS) puis en blocs (vide horizontal >= 12 CSS).
# But : compter les fentes d'information, et verifier qu'aucune n'est presente d'un cote et pas de
# l'autre. CONTROLE : le nombre de blocs doit etre >= 1 par ligne visible (sinon le seuil est faux).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
ZONE={'REF':(0.0,910.0),'JEU':(0.0,946.0)}
for S in (R,C):
    y0,y1=ZONE[S['nom']]; im=S['im'].load()
    a=P(S,0,y0); b=P(S,560,y1)
    lignes=[]; cur=None
    for Y in range(int(a[1]),int(b[1])):
        xs=[X for X in range(int(a[0]),int(b[0])) if lum(im[X,Y])>90]
        if xs:
            if cur is None: cur=[Y,Y,list(xs)]
            else: cur[1]=Y; cur[2].extend(xs)
        else:
            if cur is not None and Y-cur[1]>=int(4*S['f']): lignes.append(cur); cur=None
    if cur: lignes.append(cur)
    print(f'\n===== {S["nom"]} — {len(lignes)} bandes de texte/encre claire =====')
    for L in lignes:
        xs=sorted(set(L[2])); blocs=[]; s=xs[0]; p=xs[0]
        for X in xs[1:]:
            if X-p>=int(12*S['f']): blocs.append((s,p)); s=X
            p=X
        blocs.append((s,p))
        cy0=toCSS(S,0,L[0])[1]; cy1=toCSS(S,0,L[1]+1)[1]
        desc=' | '.join(f'x {toCSS(S,g,0)[0]:6.1f}..{toCSS(S,d+1,0)[0]:6.1f}' for g,d in blocs)
        print(f'  y {cy0:6.1f}..{cy1:6.1f} (h {cy1-cy0:5.1f})  {len(blocs)} bloc(s) : {desc}')
