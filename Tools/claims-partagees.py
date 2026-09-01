#!/usr/bin/env python3
"""Détecte les CLAIMS vivant VERBATIM dans deux artefacts du lot « redimensionnement ».

⛔ POURQUOI (mesuré 2026-08-31, revues ⊥ v17 puis v18) : la règle « une affirmation, UN producteur ;
   partout ailleurs on cite » a été posée en v15 pour la borne, puis re-violée à chaque tour — et
   **toujours de la même façon** : le correctif fermait les INSTANCES que le relecteur nommait, sans
   repasser la CLASSE sur la population. La v17 l'a appliquée à un détecteur, pas aux autres. La v18
   a ÉNUMÉRÉ trois claims partagées, en a fermé deux, et a laissé la troisième. La v19 a corrigé
   celle-là — et a laissé, huit lignes plus haut, une instance que ce balayage a trouvée.
   ⇒ *Une classe ne se ferme pas en corrigeant ses instances connues : il faut un instrument qui
   ré-énumère la population à chaque tour.* C'est ce que ce script est.

⚠️ CE QU'IL TROUVE : une séquence de N mots identique (normalisée : casse, accents, ponctuation et
   blancs neutralisés) présente dans deux artefacts.
⚠️ CE QU'IL NE TROUVE PAS : une claim PARAPHRASÉE. C'est la même limite que le détecteur de borne,
   et pour la même raison — aucun motif sur de la prose ne couvre une proposition. **La classe reste
   ARBITRÉE EN REVUE** ; cet instrument en retire seulement la part mécanique.
⚠️ ET IL NE JUGE PAS LA DIRECTION : un artefact qui CITE légitimement son producteur ressort comme
   un artefact qui le REDIT. La sortie est une liste à trancher, pas un verdict — d'où l'absence de
   sortie non nulle par défaut (voir --strict).

⛔ LA SORTIE DÉSIGNE LES CLAIMS PAR INDEX ET NE LES RECOPIE JAMAIS EN ENTIER (socle §7 : coller la
   sortie d'un contrôle réintroduit le motif qu'il mesure ; ici, recopier une claim partagée dans un
   rapport ferait du rapport un producteur de plus). Seuls les premiers mots sont imprimés, pour
   permettre de la RETROUVER — jamais assez pour la redire.
"""
import pathlib, re, sys, itertools

# ⛔⛔ LA POPULATION EST DÉRIVÉE, PLUS JAMAIS ÉNUMÉRÉE (BLOCKING B2, revue ⊥ du 2026-09-01).
#    La v1 portait une liste de 5 fichiers écrite à la main. Le lot en a SEPT — et les deux
#    manquants étaient exactement ceux arrivés avec la version qui commitait ce script. Mesuré :
#    l'instrument publiait 3 claims partagées ; la population complète en porte 17, dont NEUF entre
#    un rapport et l'instrument qui produit ses nombres.
#    ⇒ **C'est le défaut que le script frère énonce dans sa propre docstring** — « un jeu explicite
#    est une allowlist, et son trou tombe là où le document bouge » — reproduit un instrument plus
#    loin, DANS LE MÊME COMMIT. Écrire la règle ne l'installe pas chez son auteur ; seule une
#    dérivation la tient.
RACINE = pathlib.Path(__file__).resolve().parent
def population():
    """Tout artefact du lot : les documents et les instruments, découverts et non listés."""
    vus = {}
    for motif in ('redimensionnement*.md', 'redimensionnement-R1/*.md',
                  'redimensionnement-R1/*.py', 'plancher-*.py', 'borne-*.py', 'claims-*.py'):
        for f in RACINE.glob(motif):
            if f.is_file(): vus[f.stem if f.stem not in vus else str(f)] = f
    return dict(sorted(vus.items()))

N = 9  # longueur de séquence : en dessous, la prose technique produit du bruit ; mesuré sur ce lot.

strict = '--strict' in sys.argv

def norm(s):
    return re.sub(r'[^a-zà-ÿ0-9 ]', '', re.sub(r'\s+', ' ', s.lower())).strip()

textes = {k: f.read_text(encoding='utf-8') for k, f in population().items()}

# contrôle POSITIF : deux artefacts au moins, et le balayage doit voir du texte.
if len(textes) < 2:
    print(f'⛔ {len(textes)} artefact(s) lisible(s) — le balayage NE S EST PAS EXÉCUTÉ'); sys.exit(2)
mots = {k: len(norm(v).split()) for k, v in textes.items()}
if min(mots.values()) < N:
    print(f'⛔ un artefact fait moins de {N} mots normalisés — motif plus long que sa cible'); sys.exit(2)

def blocs_maximaux(a, b):
    wa, wb = norm(a).split(), norm(b).split()
    sb = {' '.join(wb[i:i+N]) for i in range(len(wb)-N+1)}
    out, i = [], 0
    while i <= len(wa)-N:
        if ' '.join(wa[i:i+N]) in sb:
            j = i+N
            while j < len(wa) and ' '.join(wa[j-N+1:j+1]) in sb: j += 1
            out.append(wa[i:j]); i = j
        else: i += 1
    return out

print(f'  artefacts balayés : {len(textes)}  ({", ".join(f"{k}={v} mots" for k, v in mots.items())})')
print(f'  séquence minimale : {N} mots normalisés\n')

total = 0
for a, b in itertools.combinations(textes, 2):
    bl = blocs_maximaux(textes[a], textes[b])
    if not bl:
        print(f'  {a:12} ∩ {b:12} : aucune'); continue
    total += len(bl)
    print(f'  {a:12} ∩ {b:12} : {len(bl)} claim(s) — à TRANCHER (citation légitime ou redite ?)')
    for i, w in enumerate(bl, 1):
        print(f'      claim {i} : {len(w)} mots · repère «{" ".join(w[:6])}…»')

# ⛔ CONTRÔLES SUR FIXTURES INERTES (IMPORTANT I1, revue ⊥ du 2026-09-01). La v1 comparait un
#    texte À LUI-MÊME : tout texte de >= N mots le satisfaisait, et le script garantit ce minimum
#    dix lignes plus haut. **Le contrôle était impossible à faire échouer** — « un contrôle qui
#    recopie le prédicat teste l'identité, pas la couverture », la faute que la docstring du script
#    frère énonce correctement pour elle-même.
#    ⇒ Deux fixtures EMBARQUÉES (jamais un fichier que quelqu'un a le droit d'éditer : la cible
#    d'un contrôle doit être INERTE) — l'une porte une séquence plantée dans les deux, l'autre est
#    garantie disjointe. Le contrôle exige les DEUX réponses, donc il peut rougir dans les deux sens.
_PLANTE = 'alpha beta gamma delta epsilon zeta eta theta iota'
_FIXT_A = f'ouverture quelconque {_PLANTE} fermeture quelconque'
_FIXT_B = f'autre ouverture totalement differente {_PLANTE} autre fermeture'
_FIXT_C = 'aucun mot commun ici seulement du remplissage sans rapport aucun avec ce qui precede vraiment'
pos = blocs_maximaux(_FIXT_A, _FIXT_B)
neg = blocs_maximaux(_FIXT_A, _FIXT_C)
if not pos:
    print('\n⛔ CONTRÔLE POSITIF MUET : le motif ne voit pas une séquence plantée dans deux textes.')
    sys.exit(2)
if neg:
    print(f'\n⛔ CONTRÔLE NÉGATIF ROUGE : {len(neg)} bloc(s) entre deux textes disjoints — faux positif.')
    sys.exit(2)
temoin = pos

print(f'\n  ⇒ {total} claim(s) partagée(s) à arbitrer')
print(f'     contrôles sur fixtures inertes : positif {len(temoin)} bloc(s) ✅ · négatif 0 bloc ✅')
print('     ⚠️ Une claim PARAPHRASÉE reste indétectable : la classe est ARBITRÉE, pas fermée.')
sys.exit(1 if (strict and total) else 0)
