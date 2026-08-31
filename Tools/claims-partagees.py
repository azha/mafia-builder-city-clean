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

ARTEFACTS = {
    'design':      'Tools/redimensionnement-design.md',
    'R1-mesures':  'Tools/redimensionnement-R1/R1-mesures.md',
    'plancher.py': 'Tools/plancher-decoupage.py',
    'borne.py':    'Tools/borne-producteur-unique.py',
    'claims.py':   'Tools/claims-partagees.py',
}
N = 9  # longueur de séquence : en dessous, la prose technique produit du bruit ; mesuré sur ce lot.

strict = '--strict' in sys.argv

def norm(s):
    return re.sub(r'[^a-zà-ÿ0-9 ]', '', re.sub(r'\s+', ' ', s.lower())).strip()

textes, absents = {}, []
for k, v in ARTEFACTS.items():
    p = pathlib.Path(v)
    if p.exists(): textes[k] = p.read_text(encoding='utf-8')
    else: absents.append(v)

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

if absents: print(f'  ⚠️ non lus : {absents}')
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

# contrôle NÉGATIF : le motif doit trouver un artefact dans lui-même (sinon il ne mord sur rien).
temoin = blocs_maximaux(textes[next(iter(textes))], textes[next(iter(textes))])
if not temoin:
    print('\n⛔ contrôle négatif MUET : le motif ne se reconnaît pas lui-même.'); sys.exit(2)

print(f'\n  ⇒ {total} claim(s) partagée(s) à arbitrer  (contrôle négatif : le motif MORD, {len(temoin)} blocs sur un artefact contre lui-même)')
print('     ⚠️ Une claim PARAPHRASÉE reste indétectable : la classe est ARBITRÉE, pas fermée.')
sys.exit(1 if (strict and total) else 0)
