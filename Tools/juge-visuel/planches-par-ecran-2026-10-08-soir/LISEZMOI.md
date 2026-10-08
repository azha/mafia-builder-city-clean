# Planches par écran — 2026-10-08 soir (cumul `fa376cc4` + le correctif de harnais A01 commité avec ces planches)

Harnais `PlanchesParEcran` (catégorie `ClichePlanchesParEcran`, run 8 : **4/4 verts**), **compte NEUF** sur la pile dev (`http://localhost`), shell entier, 1080×2400 et 1080×1920. `journal.tsv` : pour chaque écran, l'état d'un compte neuf et le cadre de référence nommé. Verdicts : `Tools/preuves/creneau-2026-10-08b/VERDICTS.txt`.
Contient : les dix écrans E01-E10 (+ `_bas` quand la liste déborde), ⑤ (E11, carte FABRIQUÉE), ④ la file à 2 cartes (A01, cartes FABRIQUÉES, Accueil ROUVERT par Empire).
Planches PRISES SANS le décor de CLIENT-2 (`feat/decor-de-scene`, pas sur le cumul) : les aplats de scène restent ASSUMÉS.

À lire avant de juger :
- **A01 ④ — la ligne GRANDIT (4739deb6) et TIENT, mesuré** : disponible (ligne − padding 36) = **423,6 u à 2400** et **308,6 u à 1920**, pour 208,9 u voulus par la colonne « qui ». Le nom (« Lt. Kane attend vos ordres »), la gravité, la raison et « Plusieurs attendent encore » sont lisibles aux deux résolutions. « LA SUITE » monte avec la ligne (bande `BandeSuiteSurLigneHaute`).
- **Correctif du harnais pendant ce créneau** (run 3 → runs 4-8) : au run 3, A01 a noté « ÉCHEC : le panneau de la file n'est pas monté » et le test est sorti VERT (aucune planche A01). Trois causes, corrigées dans `PlanchesParEcranCapturePlayModeTests.cs` :
  1. EMPIRE ne rouvre l'Accueil que sur la carte SANS RIEN DESSUS (geste G1). L'Accueil de l'ouverture était encore en surimpression, donc le clic remontait la carte seule. Le test le referme d'abord, comme `AccueilCanon.RouvrirParEmpire`.
  2. La session fabriquée publiait la phase « — » sous un bandeau resté à « Aube » (rouge légitime de la garde de phase, run 4). Elle part maintenant de la VRAIE session : seules la tête et la file changent.
  3. « LA SUITE » se lit par le réseau, et la planche 2400 (prise la première) partait avant elle (run 5 : suite absente à 2400, présente à 1920). Le test attend `LaSuitePanelController.Lu`.
  Classe fermée : tout `Noter(… « ÉCHEC … »)` fait maintenant rougir le test qui l'a noté (A01, E11, et les dix écrans en fin de parcours).
- **E04 ㉘** : « aucun distribution_hub trouvé » — normal sur compte neuf (décision de f2 du 08/10) ; le nominal attend une paire de capture.
- **E01 ㊳, E02 ㉞, E05 ㉛ à 1920, E07 ㉓ aux deux** : la liste déborde et est remontée jusqu'au bout (planches `_bas`) ; aucun TROU.
