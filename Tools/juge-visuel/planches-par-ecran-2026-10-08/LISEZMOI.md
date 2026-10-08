# Planches par écran — 2026-10-08 (HEAD du client au run : `884db988`)

Harnais `PlanchesParEcran` (catégorie `ClichePlanchesParEcran`, 4/4 verts, VERDICT 0), **compte NEUF** sur la pile dev (`http://localhost`), shell entier, 1080×2400 et 1080×1920. `journal.tsv` : pour chaque écran, l'état d'un compte neuf et le cadre de référence nommé.
Contient : les dix écrans E01-E10 (+ `_bas` quand la liste déborde), ⑤ (E11, carte FABRIQUÉE), ④ la file à 2 cartes (A01, cartes FABRIQUÉES).
Planches PRISES SANS le décor de CLIENT-2 (`feat/decor-de-scene`, pas sur le cumul) : A1 de ㊵ et les aplats de scène restent ASSUMÉS.

À lire avant de juger :
- **A01 ④ — DÉBORDE (A), malgré « tient » au journal** : la colonne « qui » veut 208,9 u ; la ligne offre 234,3 − 36 (padding) = 198 u à 2400 et 175,7 − 36 = 139,7 u à 1920. Le nom (« Lt. Kane attend vos ordres ») et « Plusieurs attendent encore » (Ellipsis, sans retour) s'effacent entièrement — visible sur les deux planches. La garde compare des rects que la mise en page contraint : elle ne peut pas voir le débordement (à corriger : préférée vs disponible).
- **E04 ㉘** : « aucun distribution_hub trouvé parmi les districts possédés » (DerniereErreur) — le 07/10 c'était une attente fixe de 6 s.
- **E05 ㉛ (1/2), E06 ㉝ (2/2), E10 ㊵ (2/2)** : `ContenuDepasse` vrai mais planches `_bas` identiques aux hautes — le défilement ne déplace rien, à instruire (le 07/10 le journal disait « DÉBORDE — planche _bas prise » faute du contrôle d'octets).
