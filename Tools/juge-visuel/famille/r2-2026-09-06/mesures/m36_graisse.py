# m36 — GRAISSE de la valeur d'etat : largeur des deux jambages du 'A' initial (meme lettre des deux
# cotes : "Actif" / "Au repos"), lue a 35 % sous le sommet de la capitale.
# CONTROLE : la meme mesure sur le 'A' du sous-titre "3 LIEUTENANTS" (poids NORMAL des deux cotes)
# doit rendre un trait plus fin que celui de la valeur d'etat, des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def runs(S,y,x0,x1,test):
    im=S['im'].load(); Y=int(round(P(S,0,y)[1])); out=[];prev=False
    for xc in [t/8 for t in range(int(8*x0),int(8*x1))]:
        on=test(im[int(round(P(S,xc,0)[0])),Y])
        if on and not prev: s=xc
        if (not on) and prev: out.append(round(xc-s,2))
        prev=on
    return out
creme=lambda c: c[0]>165 and c[1]>150 and c[2]>120
cr2  =lambda c: 135<c[0]<215 and c[1]>120
print('\n=== jambages du A de la VALEUR d\'etat (poids 600 en reference) ===')
print('  REF "Actif"   A: sommet 661.5 -> sonde a 667.3 :', runs(R,667.3,466,486,creme))
print('  JEU "Au repos" A: sommet 297.3 -> sonde a 302.8 :', runs(C,302.8,415,436,creme))
print('\n=== CONTROLE : A du sous-titre "3 LIEUTENANTS" (poids normal) ===')
print('  REF sonde a 84.0 :', runs(R,84.0,183,205,cr2))
print('  JEU sonde a 78.0 :', runs(C,78.0,190,215,cr2))
print('\n=== jambages du A de la valeur, sonde plus basse (70 % de la capitale) ===')
print('  REF a 673.0 :', runs(R,673.0,464,488,creme))
print('  JEU a 309.0 :', runs(C,309.0,413,438,creme))
