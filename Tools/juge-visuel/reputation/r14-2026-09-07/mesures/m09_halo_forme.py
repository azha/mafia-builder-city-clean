"""m09 — LA FORME du halo, chiffres SEULS (le libelle est retire de la population).

Pourquoi : en m08 l'encre etait bimodale (chiffres + libelle), donc son barycentre ne
peut pas repondre a "le halo est-il centre sur le glyphe ?". Ici la boite d'analyse est
reduite aux rangees du CHIFFRE plus une marge symetrique de 24 rangees en haut et en bas,
bornee de facon a ne jamais toucher la bande du libelle.

  bande chiffre : REF y724..762 · JEU y748..786   (bandes a f=0,20, m07)
  bande libelle : REF y783..797 · JEU y809..823
  marge symetrique retenue : 20 rangees  -> REF y704..782 · JEU y728..806
  (la marge basse s'arrete a 1 rangee du libelle des deux cotes : symetrie conservee)

Grandeurs :
  1. barycentre de l'exces (>1 pt) vs barycentre de l'encre du chiffre — l'ECART VERTICAL
     est la grandeur qui distingue une ombre de texte (0) d'un disque pose derriere (=/=0).
  2. lumiere totale AU-DESSUS du chiffre vs AU-DESSOUS (bandes de 20 rangees symetriques).
     Une ombre de texte symetrique donne un rapport ~1 ; un disque decale donne >>1 ou <<1.
  3. profil vertical de l'exces le long de la colonne du barycentre (moyenne sur 40 col.).
CONTROLE POSITIF : cote reference, le rapport dessous/dessus doit etre proche de 1 et
  l'ecart de barycentre petit — c'est un `text-shadow`. Sinon mon instrument est faux.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

CAS = [
 ('REF',     '../reference-1080x2102.png', 704, 782, 724, 762, [(58,353),(392,687),(726,1021)]),
 ('JEU2400', '../capture-1080x2400.png',   728, 806, 748, 786, [(57,349),(394,685),(730,1022)]),
]
NOMS = ['1 REGLES DONNEES', '2 ABSORBEES', '3 ENFREINTES']

for nom, f, Y0, Y1, dy0, dy1, boites in CAS:
    im = ouvrir(f); px = im.load()
    for i, (X0, X1) in enumerate(boites):
        p10 = {}
        for y in range(Y0, Y1+1):
            v = sorted(lum(px[x, y]) for x in range(X0, X1+1))
            p10[y] = v[len(v)//10]
        tous = [lum(px[x, y]) for y in range(dy0, dy1+1) for x in range(X0, X1+1)]
        P995 = sorted(tous)[int(0.995*len(tous))]
        base = mediane(list(p10.values()))
        seuil = base + 0.50*(P995 - base)
        E = [(x, y) for y in range(dy0, dy1+1) for x in range(X0, X1+1) if lum(px[x, y]) >= seuil]
        if not E: print(f"  {nom} c{i+1}: aucune encre"); continue
        cx = sum(p[0] for p in E)/len(E); cy = sum(p[1] for p in E)/len(E)
        Eset = set(E)
        hx = hy = hw = 0.0
        for y in range(Y0, Y1+1):
            for x in range(X0, X1+1):
                if (x, y) in Eset: continue
                v = lum(px[x, y]) - p10[y]
                if v > 1.0: hx += x*v; hy += y*v; hw += v
        # lumiere au-dessus / au-dessous du chiffre
        haut = sum(max(0.0, lum(px[x, y]) - p10[y])
                   for y in range(dy0-20, dy0) for x in range(X0, X1+1))
        bas = sum(max(0.0, lum(px[x, y]) - p10[y])
                  for y in range(dy1+1, dy1+21) for x in range(X0, X1+1))
        print(f"\n  {nom} · compteur {NOMS[i]}  (chiffre y{dy0}..{dy1}, encre {len(E)} px, seuil {seuil:.0f})")
        print(f"     barycentre chiffre y={cy:.1f} · barycentre halo y={hy/hw:.1f}"
              f" · ECART VERTICAL = {hy/hw - cy:+.1f} px   (x : {hx/hw - cx:+.1f} px)")
        print(f"     lumiere 20 rangees AU-DESSUS = {haut:8.0f}   AU-DESSOUS = {bas:8.0f}"
              f"   dessous/dessus = {bas/haut if haut else float('inf'):.2f}")
        # profil vertical sur 40 colonnes centrees
        c = int(round(cx)); a, b = max(X0, c-20), min(X1, c+20)
        print("     profil vertical (moyenne exces sur 40 col. centrees) :")
        s = ""
        for y in range(Y0, Y1+1):
            v = sum(max(0.0, lum(px[x, y]) - p10[y]) for x in range(a, b+1))/(b-a+1)
            s += f"{y}:{v:5.1f} "
            if len(s) > 108: print("       " + s); s = ""
        if s: print("       " + s)
