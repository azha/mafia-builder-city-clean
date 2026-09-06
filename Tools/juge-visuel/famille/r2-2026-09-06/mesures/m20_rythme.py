# m20 — RYTHME VERTICAL : les grandes frontieres, en CSS depuis le haut de la feuille, et la derive cumulee.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
REPERES={
 'REF':[('haut de feuille',0.0),('titre haut',38.0),('sous-titre haut',79.0),('filet',115.0),
        ('don-rang haut',136.0),('don-rang bas',236.0),('rang1 haut',252.5),('rang1 bas',353.0),
        ('boite1 haut',368.5),('boite1 bas',439.0),('rang2 haut',454.5),('rang2 bas',553.5),
        ('rang3 haut',629.5),('rang3 bas',728.5)],
 'JEU':[('haut de feuille',0.0),('titre haut',33.5),('sous-titre haut',72.9),('filet',128.75),
        ('don-rang haut',150.0),('don-rang bas',247.3),('rang1 haut',264.3),('rang1 bas',363.8),
        ('boite1 haut',380.0),('boite1 bas',450.5),('rang2 haut',465.9),('rang2 bas',565.3),
        ('rang3 haut',667.4),('rang3 bas',766.9)]}
print(f'{"repere":22s} {"REF":>8} {"JEU":>8} {"delta":>8}')
for (n,a),(m,b) in zip(REPERES['REF'],REPERES['JEU']):
    print(f'{n:22s} {a:8.1f} {b:8.1f} {b-a:+8.1f}')
print('\nPAS interne (independant de la derive de tete) :')
def pas(L,i,j): return L[j][1]-L[i][1]
for i,j,nom in ((4,6,'bas don-rang -> haut rang1'),(6,8,'bas rang1 -> haut boite1'),(8,10,'bas boite1 -> haut rang2'),
                (4,4,'')):
    if not nom: continue
    a=pas(REPERES['REF'],i+1,j); b=pas(REPERES['JEU'],i+1,j)
    print(f'  {nom:32s} REF {a:6.1f}  JEU {b:6.1f}  delta {b-a:+5.1f}')
print(f'  pas rang1->rang2 (haut a haut)     REF {454.5-252.5:6.1f}  JEU {465.9-264.3:6.1f}  delta {(465.9-264.3)-(454.5-252.5):+5.1f}')
print(f'  pas rang2->rang3 (haut a haut)     REF {629.5-454.5:6.1f}  JEU {667.4-465.9:6.1f}  delta {(667.4-465.9)-(629.5-454.5):+5.1f}  [REF rang2 porte une PUCE "Voir l\'equipe", pas une boite -> non homologue]')
