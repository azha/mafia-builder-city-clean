"""§F-4 — le critère arbitré, et POURQUOI IL N'EST PAS DÉCIDABLE PAR CE FICHIER.

⛔⛔ LIRE CECI AVANT D'UTILISER LA SORTIE. Le critère arbitré (7f, 2026-09-04) est : « une suite
dont le SEUL produit est un PNG — aucune assertion de comportement — sort du filtre ; une suite qui
asserte une propriété et écrit accessoirement une planche reste au juge ». Cet instrument l'a
approché par « la méthode contient-elle un `Assert.` ». **Il rend un verdict UNIFORME : 15 sur 15
« reste au juge », zéro hors filtre.** Et ses contrôles disent pourquoi : `PhotoManquants` et
`PhotoVitrine` — des suites-photo PURES, exclues de longue date pour cette raison même — comptent
elles aussi une assertion chacune.

⇒ C'est mécanique, pas accidentel : **ce dépôt EXIGE qu'une capture asserte.** La règle est écrite
au socle — « une capture n'asserte que ce qui rendrait l'image mensongère » (locataire monté, écran
réellement entré, contenu réellement rendu), sinon une capture d'écran vide passe pour une
réussite. Donc TOUTE suite de capture correcte porte des assertions, et « contient un `Assert.` »
ne peut pas séparer les deux populations.

⇒ La grandeur qui discriminerait n'est pas la PRÉSENCE d'une assertion mais son OBJET : porte-t-elle
sur la validité de l'image (anti-vacuité) ou sur une propriété de l'écran ? Cela ne se lit pas par
un motif — c'est un jugement sur chaque assertion. **Le critère est juste et n'est pas statiquement
décidable ici.**

★ Ce qui a rendu le trou visible est le VERDICT UNIFORME, et rien d'autre : la sortie « 15/15 »
était trop propre pour être vraie, exactement comme les 188 puis 486 d'un autre instrument de ce
dépôt. *Un instrument qui explique tout mesure autre chose.* Les deux contrôles ont été ajoutés
POUR ça, et ce sont eux qui parlent.

CE QUI RESTE VALIDE ET UTILISABLE dans cette sortie : la colonne `écrit` — quelles catégories
produisent des images, donc quel arbre il faudra restaurer après le run. Elle, elle est
statiquement décidable.
"""
import re, pathlib, sys
# Critère ARBITRÉ (7f) : suite dont le SEUL produit est un PNG → hors filtre ; une suite qui
# asserte une propriété et écrit accessoirement une planche RESTE au juge. Appliqué par MÉTHODE.
#
# ⛔ CE QUI A CASSÉ LA v1, ET C'EST LA LEÇON : je lisais les catégories DANS le bloc d'attribut du
#   test, avec un repli sur une fenêtre voisine « si rien n'est trouvé ». Or ce fichier déclare
#   `[Category("X")]` sur sa PROPRE LIGNE, et sa CLASSE porte déjà une catégorie — donc `cats`
#   n'était jamais vide, donc le repli ne s'est JAMAIS déclenché, et cinq catégories réelles sont
#   sorties « ABSENTES ». *Un repli conditionné à l'absence est masqué par la présence d'autre
#   chose.* On ne replie plus : on REMONTE toujours le bloc d'attributs contigu au-dessus.
racine = pathlib.Path('Assets/Tests/PlayMode')
TEST   = re.compile(r'^[ \t]*\[(?:[^\]]*\b(?:UnityTest|Test)\b[^\]]*)\]', re.M)
CAT    = re.compile(r'Category\(\s*"([^"]+)"\s*\)')
ASSERT = re.compile(r'\bAssert\.|\bAssume\.|\bStringAssert\.|\bCollectionAssert\.|\bthrow new\b')
ECRIT  = re.compile(r'EncodeToPNG|WriteAllBytes|CapturerLocataire|CapturerA|ScreenCapture')
COMM   = re.compile(r'^[ \t]*(//|///|\*|/\*)')

def corps(src, i):
    j = src.find('{', i)
    if j < 0: return ''
    d = 0
    for k in range(j, len(src)):
        if src[k] == '{': d += 1
        elif src[k] == '}':
            d -= 1
            if d == 0: return src[j:k+1]
    return src[j:]

par_cat = {}
n = 0
for f in sorted(racine.rglob('*.cs')):
    src = f.read_text(encoding='utf-8')
    lignes = src.split('\n')
    prem = TEST.search(src)
    # catégories de la CLASSE : hors commentaire, avant le premier attribut de test
    cats_classe = {c for l in src[:prem.start()].split('\n') if not COMM.match(l)
                     for c in CAT.findall(l)} if prem else set()
    for m in TEST.finditer(src):
        n += 1
        no = src[:m.start()].count('\n')
        cats = set(cats_classe)
        # ⇒ on REMONTE le bloc d'attributs contigu, toujours, sans condition
        k = no - 1
        while k >= 0 and (lignes[k].strip().startswith('[') or not lignes[k].strip()):
            if lignes[k].strip().startswith('['): cats |= set(CAT.findall(lignes[k]))
            k -= 1
        cats |= set(CAT.findall(m.group(0)))
        # ⇒ et on DESCEND aussi : `[UnityTest]` peut précéder `[Category]`
        # ⛔ LA DESCENTE DOIT TRAVERSER LES COMMENTAIRES. Mesuré : ce fichier écrit
        #   `[UnityTest]` AU-DESSUS de la docstring et `[Category(...)]` EN DESSOUS — une
        #   marche qui s'arrête au premier `///` ne voit jamais la catégorie. C'est ce qui a
        #   fait sortir CINQ catégories RÉELLES comme « absentes ».
        #   *Une contiguïté d'attributs n'est pas une contiguïté de lignes.*
        k = no + 1
        while k < len(lignes):
            t = lignes[k].strip()
            if t.startswith('['):
                cats |= set(CAT.findall(lignes[k])); k += 1
            elif t.startswith('//') or t.startswith('*') or not t:
                k += 1
            else:
                break
        b = corps(src, m.end())
        for c in (cats or {'<sans catégorie>'}):
            e = par_cat.setdefault(c, {'n':0,'a':0,'w':0,'f':set()})
            e['n'] += 1; e['f'].add(f.name)
            if ASSERT.search(b): e['a'] += 1
            if ECRIT.search(b):  e['w'] += 1

cible = ['Screenshot','CaptureDetail','CaptureExceptions','CaptureFiche','CaptureSousChrome',
         'MutationDeCarte','CaptureHorizon','CaptureForensic',
         'EcranLoi','EcranConflit','Ecran10','I18n','I18nReseau','BundleReel','JUGE']
manque = [c for c in cible if c not in par_cat]
assert not manque, f"⛔ ENCORE absentes : {manque} — l'instrument ment"
print(f"méthodes balayées : {n}   (v1 en voyait {459}, et ratait 5 catégories réelles)\n")
print(f"{'catégorie':22s} {'tests':>5s} {'assert':>7s} {'écrit':>6s}  verdict")
horsFiltre = []
for c in cible:
    e = par_cat[c]
    seul = e['a'] == 0
    if seul: horsFiltre.append(c)
    print(f"{c:22s} {e['n']:5d} {e['a']:7d} {e['w']:6d}  {'HORS FILTRE (seul produit = PNG)' if seul else 'RESTE AU JUGE'}")
print(f"\n⇒ à MESURER puis inscrire : {len(cible)-len(horsFiltre)} · hors filtre par le critère : {len(horsFiltre)} {horsFiltre}")
for c in ('Charpente','PhotoManquants','PhotoVitrine'):
    e = par_cat.get(c)
    if e: print(f"[contrôle] {c:16s} {e['n']:3d} tests · {e['a']} assertifs · {e['w']} écrivains")
