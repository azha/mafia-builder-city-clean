# m17 — normalisation : positions exprimees en % du RECT LIBRE (doctrine : aligner haut du contenu
# sur le bas du bandeau, bas du contenu sur le haut du dock ; jamais le pixel absolu).
# Rect libre REFERENCE = le .cfl6 : y 434..2098 (1664 px). Rect libre CAPTURE : y 143..2160 (2017 px).
# Controle positif : le haut du rect libre doit rendre 0,0 % et le bas 100,0 % dans les deux.
# Controle negatif : une valeur hors [0,100] signalerait une violation de gouttiere.
R0,R1=434,2098; C0,C1=143,2160
def pr(y): return 100*(y-R0)/(R1-R0)
def pc(y): return 100*(y-C0)/(C1-C0)
print(f"REFERENCE rect libre {R0}..{R1} = {R1-R0} px = {(R1-R0)/3.6:.1f} CSS")
print(f"CAPTURE   rect libre {C0}..{C1} = {C1-C0} px = {(C1-C0)/3.6:.1f} CSS")
print(f"CONTROLE POSITIF : bornes -> {pr(R0):.1f} % / {pr(R1):.1f} %   et   {pc(C0):.1f} % / {pc(C1):.1f} %")
print("\n  repere                                REF %      CAP %")
lignes=[("haut du rect libre",R0,C0),
        ("1er pixel d'encre du contenu",480,293),
        ("titron des familles",1037,529),
        ("haut de la 1re carte",1084,666),
        ("bas de la 4e carte",1787,1408),
        ("dernier pixel d'encre",2043,1643),
        ("bas du rect libre",R1,C1)]
for n,a,b in lignes: print(f"  {n:36s} {pr(a):6.1f} %   {pc(b):6.1f} %")
print("\n  PART DU RECT LIBRE occupee par les blocs ABSENTS de la capture :")
print(f"    .ordre (serviette)  677..1003 = {326} px = {100*326/(R1-R0):.1f} % du rect libre de la reference")
print(f"    .bas (replique+CTA) 1790..2098 = {308} px = {100*308/(R1-R0):.1f} %")
print(f"    total                          = {100*634/(R1-R0):.1f} %")
print("\n  VIDE terminal :")
print(f"    REFERENCE : {R1-2043} px = {100*(R1-2043)/(R1-R0):.1f} % du rect libre")
print(f"    CAPTURE   : {C1-1643} px = {100*(C1-1643)/(C1-C0):.1f} % du rect libre   ({(C1-1643)/3.6:.1f} CSS, {100*(C1-1643)/2400:.1f} % de la hauteur d'ecran)")
