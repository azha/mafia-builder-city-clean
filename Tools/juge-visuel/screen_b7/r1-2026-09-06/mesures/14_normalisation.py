"""14 - Rythme NORMALISE : chaque partie en % de la zone de contenu (dossier.md : haut du
contenu = bas du bandeau, bas du contenu = haut du dock).
REF zone de contenu (.dos6, sous la barre) : y 434..2082  -> H=1649 px  (mesure script 07/08)
CAP zone de contenu (sous le bandeau, au-dessus du dock) : y 143..2193 -> H=2051 px (script 07)
Largeurs : REF corps d'ecran x 4..1075 (1072 px) ; CAP ecran x 0..1079 (1080 px).
Controle positif : la marge laterale des panneaux doit sortir a ~4,4 % des deux cotes."""
R0,R1=434,2082; C0,C1=143,2193
HR,HC=R1-R0,C1-C0
WR,WC=1072.0,1080.0
def r(y): return 100.0*(y-R0)/HR
def c(y): return 100.0*(y-C0)/HC
print(f"REF zone de contenu H={HR} px ; CAP H={HC} px ; rapport {HC/HR:.3f}")
print()
print("REFERENCE                              y_abs        % zone     hauteur %")
for nom,a,b in [(".enseigne (titre)",459,669),(".compteurs (3 fenetres)",695,824),
                (".elast (panneau pistes)",845,1560),("   dont .pistes (3 colonnes)",877,1200),
                ("   dont vide elastique",1201,1555),(".pann (pourquoi)",1576,1871),
                (".cta6 ACHETER",1882,2009),(".note6 (pied)",2018,2041)]:
    print(f"  {nom:34s} {a:5d}..{b:5d}  {r(a):6.2f}..{r(b):6.2f}  {100.0*(b-a)/HR:5.2f}")
print()
print("CAPTURE                                y_abs        % zone     hauteur %")
for nom,a,b in [("losange (en trop)",215,231),("panneau titre",282,464),
                ("carte 1 (audit)",501,724),("carte 2 (rejets)",761,983),
                ("carte 3 (train de vie)",1020,1242),("vide",1243,1610),
                ("panneau bas (ne peut pas dire)",1611,2100)]:
    print(f"  {nom:34s} {a:5d}..{b:5d}  {c(a):6.2f}..{c(b):6.2f}  {100.0*(b-a)/HC:5.2f}")
print()
print("LARGEURS (en % de la largeur d'ecran)")
print(f"  REF panneaux x 50..1029 : marge g {100*46/WR:.2f}%  largeur {100*980/WR:.2f}%")
print(f"  CAP panneaux x 39..1040 : marge g {100*39/WC:.2f}%  largeur {100*1002/WC:.2f}%")
print(f"  REF cran (barre)  245 px = {100*245/WR:.2f}% ; CAP filet 932 px = {100*932/WC:.2f}%")
print(f"  REF colonne .pi   298 px = {100*298/WR:.2f}% ; CAP carte 1002 px = {100*1002/WC:.2f}%")
