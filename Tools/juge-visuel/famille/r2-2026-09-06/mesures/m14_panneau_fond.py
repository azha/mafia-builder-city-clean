# m14 — FOND DES PANNEAUX : sommet/pied du degrade, liseres internes haut et bas, ombre portee.
# Temoins homologues : rang 3 (REF, non .actif) et rang 1 (JEU). Colonne x=300 CSS (aucun texte).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
RANG={'REF':(629.5,728.5),'JEU':(264.3,363.8)}
for S in (R,C):
    top,bot=RANG[S['nom']]; h=bot-top
    im=S['im'].load()
    print(f'\n===== {S["nom"]} rang temoin ({top}..{bot}) — colonne x=300 CSS =====')
    print('  profil vertical (y rel : RGB) autour du bord HAUT :')
    for d in [x/2 for x in range(-8,13)]:
        x,y=P(S,300,top+d); print(f'    {d:+5.1f} {im[int(round(x)),int(round(y))]}')
    print(f'  sommet du degrade (5 % de h)  = {mediane(S,290,top+0.05*h-1,320,top+0.05*h+1)}')
    print(f'  pied du degrade  (95 % de h)  = {mediane(S,290,top+0.95*h-1,320,top+0.95*h+1)}')
    print('  profil vertical autour du bord BAS :')
    for d in [x/2 for x in range(-6,17)]:
        x,y=P(S,300,bot+d); print(f'    {d:+5.1f} {im[int(round(x)),int(round(y))]}')
    fondf = mediane(S,290,bot+14,320,bot+18)
    creux = min((lum(im[int(round(P(S,300,bot+d)[0])),int(round(P(S,300,bot+d)[1]))])-lum(fondf), d) for d in [x/4 for x in range(4,48)])
    print(f'  fond de feuille sous le rang = {fondf} ; creux d\'ombre le plus profond = {creux[0]:+.1f}/255 a {creux[1]:.2f} CSS sous le bord')
