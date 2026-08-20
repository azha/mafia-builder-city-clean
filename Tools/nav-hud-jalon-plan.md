# Jalon « navigation + HUD » — plan (2026-08-20, post-convergence ⊥ du district)

## 1. Navigation : Entrer dans un district (ferme la tâche #22)
Constat mesuré : AppShell (W3.U1 C1) monte des locataires par onglet via `MountTenant<T>` +
`IShellTenant.SetMountParent(ContentSlot)`. L'intérieur de district n'est PAS un onglet :
c'est un sous-écran de l'onglet City.

Forme retenue (à valider par ⊥ avant code) :
- `CityMapController.RenderDetail` ajoute un bouton « Entrer » en pied de panneau,
  actif seulement si `IsAuthenticated` (le panneau existe déjà, `SelectDistrict/HideDetail`).
- Le bouton appelle un seam `OnEnterDistrict(int districtId)` (event C# public sur
  CityMapController) — AppShell s'y abonne au montage du locataire City et pousse
  `DistrictInteriorScreenController` dans ContentSlot par le MÊME mécanisme IShellTenant
  (`SetMountParent` avant Start), avec `SetSession(Token, districtId)` puis Render au retour.
- Retour : bouton « ← Carte » dans l'écran district (en haut à gauche, sous la TopBar) →
  AppShell démonte l'intérieur et remonte CityMapController (re-tap d'onglet = précédent
  existant, « no special-cased no-op »).
- Falsifiables : (nav-F1) taper Entrer monte un DistrictInteriorScreenController dont le
  districtId == celui du panneau ; (nav-F2) « ← Carte » redonne un CityMapController monté
  ET le locataire district est détruit (pas caché) ; (nav-F3) sans token, le bouton Entrer
  est absent/inactif — anti-vacuité : avec token il est actif.

## 2. HUD v3.1 (tâche #23) — vs artefact 3c5f35c7 (validé user « c'est pas mal »)
- Barre unique en haut : solde (or, chiffres seuls), manomètre HEAT CENTRAL 3 états
  (l'idée validée « jauge heat au milieu pour la tension »), day_phase, silhouette skyline.
- S'appuie sur TopBarController (W3.U1 C2) : l'étendre, ne pas le remplacer.
- Sources : session/open (12 clés, dont game_minute — forme F fermée) + heat citywide.
- ⊥ : pixel-loop vs l'artefact, PIL uniquement, mêmes règles que le district.

## 3. Après : écrans doctrine finale (tâche #24, verre gravé + tampon, artefact 416dd684).

Ordre : 1 (petit, ferme #22) → 2 (le HUD est le prochain os visible) → 3.
⊥ : design de 1+2 relu par le reviewer AVANT implémentation (auteur ≠ relecteur).
