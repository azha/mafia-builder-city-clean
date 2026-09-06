# m30 (v2, sonde a 25 % de la hauteur : a MI-hauteur c'est l'ERGOT qu'on lit, pas la bordure) — BORDURES des panneaux : couleur du bord gauche a mi-hauteur de chaque rang.
# La reference met son rang 1 en .actif (border #d9ab4e55, fond #101a2ae0) et les rangs 2-3 en
# normal (#ffffff24) : on verifie QUEL rang est le temoin homologue du jeu.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
RANGS={'REF':[('don',136.0,236.0,23.5),('rang1',252.5,353.0,48.5),('rang2',454.5,553.5,48.5),('rang3',629.5,728.5,48.5)],
       'JEU':[('don',150.0,247.3,23.9),('rang1',264.3,363.8,48.4),('rang2',465.9,565.3,48.4),('rang3',667.4,766.9,48.4)]}
for S in (R,C):
    print(f'\n===== {S["nom"]} — bord GAUCHE a mi-hauteur =====')
    im=S['im'].load()
    for nom,top,bot,x0 in RANGS[S['nom']]:
        ym=top+0.25*(bot-top); y=int(round(P(S,0,ym)[1]))
        vals=[]
        for xc in [x/4 for x in range(int(4*(x0-3)),int(4*(x0+5)))]:
            vals.append((round(xc,2), im[int(round(P(S,xc,0)[0])),y]))
        pic=max(vals,key=lambda t:lum(t[1]))
        fond_int=mediane(S,x0+8,ym-4,x0+16,ym+4)
        print(f'  {nom:6s} bord {pic[1]} a x {pic[0]:.2f} (lum {lum(pic[1]):.1f}) · interieur {fond_int} · '
              f'teinte du bord R-B {pic[1][0]-pic[1][2]:+3d}')
    # fond interne haut de chaque rang (le .actif a un fond different)
    print('  fond interne au sommet (5 % de la hauteur), colonne x=300 :')
    for nom,top,bot,x0 in RANGS[S['nom']]:
        print(f'    {nom:6s} {mediane(S,290,top+0.05*(bot-top)-1,320,top+0.05*(bot-top)+1)}')
