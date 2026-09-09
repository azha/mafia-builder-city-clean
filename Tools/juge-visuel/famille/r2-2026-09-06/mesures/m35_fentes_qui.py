# m35 — COMBIEN DE LIGNES D'INFORMATION dans la colonne "qui" (x 145..400 CSS) de chaque rang ?
# Une ligne = une bande d'encre claire (L>85) separee de la suivante par >= 3 CSS de vide.
# CONTROLE : le bloc "etat" (x 400..535), qui porte 2 lignes des deux cotes par construction,
# doit rendre 2 des deux cotes — sinon le seuil de separation est faux.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
RANGS={'REF':[('rang1',252.5,353.0),('rang2',454.5,553.5),('rang3',629.5,728.5)],
       'JEU':[('rang1',264.3,363.8),('rang2',465.9,565.3),('rang3',667.4,766.9)]}
def bandes(S,top,bot,x0,x1,seuil=85):
    im=S['im'].load(); a=P(S,x0,top+3); b=P(S,x1,bot-3)
    out=[];cur=None;vide=0
    for Y in range(int(a[1]),int(b[1])):
        n=sum(1 for X in range(int(a[0]),int(b[0])) if lum(im[X,Y])>seuil)
        if n>=2:
            if cur is None: cur=[Y,Y]
            else: cur[1]=Y
            vide=0
        else:
            vide+=1
            if cur is not None and vide>=int(3*S['f']): out.append(cur); cur=None
    if cur: out.append(cur)
    return [(round(toCSS(S,0,c[0])[1]-top,2), round(toCSS(S,0,c[1]+1)[1]-top,2)) for c in out]
print('\n=== colonne "qui" (x 145..400 CSS) ===')
for S in (R,C):
    for nom,top,bot in RANGS[S['nom']]:
        b=bandes(S,top,bot,145,400)
        print(f'  {S["nom"]} {nom}: {len(b)} ligne(s) — {b}')
print('\n=== CONTROLE : colonne "etat" (x 400..535 CSS), 2 lignes attendues des deux cotes ===')
for S in (R,C):
    for nom,top,bot in RANGS[S['nom']]:
        b=bandes(S,top,bot,400,535)
        ok='OK' if len(b)==2 else '*** CONTROLE RATE ***'
        print(f'  {S["nom"]} {nom}: {len(b)} ligne(s) — {b}  {ok}')
print('\n=== rang du Don (x 120..400 CSS), 2 lignes attendues des deux cotes ===')
for S,(top,bot) in ((R,(134.75,237.25)),(C,(148.25,249.0))):
    b=bandes(S,top,bot,120,400)
    print(f'  {S["nom"]} don: {len(b)} ligne(s) — {b}')
