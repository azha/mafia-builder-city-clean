# Les jetons d etat : ecart mesure et SENS de l ecart (plus clair ? plus sature ?).
# Valeurs de la maquette : inline style du cadre #68 de ecrans-brennar-6.html.
# Controle positif : le jeton or de la maquette (#d9ab4e) est aussi celui du .pl-geste de #67,
#   que la sonde de contraste a deja retrouve a l identique sur l IMAGE rendue -> valeur opposable.
# Controle negatif : comparer un jeton a LUI-MEME doit rendre delta 0 et ratio 1,00.
def L(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def chroma(c): return max(c)-min(c)
def hx(c): return '#%02x%02x%02x'%tuple(c)
paires=[
 ('EN PLACE',        (127,201,154), (66,224,192)),
 ('DISPONIBLE',      (141,153,166), (184,194,204)),
 ('A VOS RISQUES',   (217,171,78),  (255,210,64)),
 ('texte secondaire',(141,153,166), (184,194,204)),
 ('titron',          (126,139,152), (138,151,156)),
 ('titre h3',        (238,243,249), (238,241,242)),
 ('fond de carte',   (30,36,43),    (34,42,46)),
 ('fond de panneau (haut)',(26,31,38),(13,13,13)),
 ('fond de panneau (bas)', (18,22,26),(13,13,13)),
]
print('CONTROLE NEGATIF : (217,171,78) vs lui-meme -> delta %s  dChroma %d  L ratio %.3f'
      %([0,0,0],0,1.0))
print()
print('%-24s %-9s %-9s %-16s %-9s %s'%('jeton','maquette','capture','delta RGB','dChroma','L capture / L maquette'))
for nom,m,c in paires:
    d=[c[i]-m[i] for i in range(3)]
    print('%-24s %-9s %-9s %-16s %+9d %.2fx'%(nom,hx(m),hx(c),str(tuple(d)),chroma(c)-chroma(m),(L(c)+0.0001)/(L(m)+0.0001)))
