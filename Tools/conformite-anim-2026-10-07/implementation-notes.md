# Notes d'implémentation — CLIENT-3, couche de mouvement (journal lu par le reviewer)

Une déviation CONSIGNÉE est le fonctionnement normal ; une déviation muette est une faute. Chaque ligne : quoi / pourquoi / ce que la spec disait.

## E2a (08/10/2026) — Deviations

1. **Repli quand la régie ne rend pas de piste (hôte nu, refus).** `TopBarController.Virer` (B6/B7) et `PoserLAiguille` (B10) écrivent la
   couleur / l'angle d'un coup quand `Transitionner` rend un handle nul ; `BandeauEphemere` s'efface sans fondu (`Effacer()`) quand le
   fondu n'a pas de piste. *Pourquoi* : la quasi-totalité des tests de contrôleur montent un hôte NU (`Courante == null`) et l'état
   « la ville brûle » / « le bandeau s'efface » doit se voir aussi quand le quota `Melange` refuse ; sans repli le cerclage resterait laiton
   pour toujours. Le virage tenu d'avant est détaché pour qu'il ne réécrive pas sa braise. *La spec* : « plus aucune écriture directe de
   `color` sur ces deux cibles » (§3) — vrai tant qu'une piste existe ; le repli est le chemin dégradé.
2. **`de` d'un virage / d'un balayage = la CIBLE précédente**, pas la valeur en vol. Un virage inversé en plein vol saute d'abord à
   l'ancienne cible, puis revient. *La spec* : `Transitionner(…, de=ancien, vers=nouveau)` (§9) — appliqué à la lettre ; la régie
   n'expose pas la valeur courante d'une piste.
3. **G11 : REFUS à l'attachement** (`Gardes.G11(cible, canal)` consulté par `Regie.Creer`, `Refus` compté) en plus du prédicat testable.
   Modifie le mécanisme E1 (3 lignes) — non pour un bug : le design place G11 en E2 et dit « refusée ». *Prédicat littéral* : `EchelleX` /
   `EchelleY` ne sont PAS couvertes (la spec nomme `Echelle`) ; à trancher avant E3 (`ec`, `mk-buee`, `drip`, `gt` les utilisent).
4. **`Regie.Inspecter(rang, out entree, out cible)`** : accesseur de LECTURE SEULE ajouté à l'API (comme dette 16) — G6 (et G9) lisent les
   pistes vivantes d'une régie ; sans lui aucune garde de test ne peut dire sur quelle cible un canal est posé.
5. **G2 (mesure ⇄ catalogue) NON FAIT.** Les JSON sont lisibles (`Tools/conformite-anim-2026-10-07/`, chemin relatif à `Application.dataPath`),
   mais les 46 entrées d'écran du catalogue ne sont pas dans le code (revue ⊥ puis E3/E4) : la garde serait rouge par construction pour
   tout ce qui n'est pas le HUD, ou une tautologie avec une table écrite à la main. B5, B8, B9, B11 n'ont pas d'entrée HUD non plus.
6. **Les trois boucles ambiantes** sont ajoutées à `CatalogueHud` (`diorama.neon`, `diorama.fumee`, `diorama.scintillement`, écran « ① »).
   `Pistes` = 2 + 1 + 1 : le budget réel (`MaxAmbientLoops` = 4) est PARTAGÉ entre les trois et G4 somme les `Pistes` ; 4 + 4 + 4 ferait
   20 > 16 par construction. La répartition est conventionnelle ; le plafond est tenu par `TryStartAmbientLoop`. Période 2π / 1,6 =
   3,927 s, `ease-in-out` pour approcher le sinus, déphasage aléatoire par instance (`Reglage.AvecPhase(−rand)`) comme l'ancien composant.
7. **`DistrictInteriorScreenController.ClearContent` détache** (`DetacherSous`) les pistes du sous-arbre qu'il détruit. *La spec* ne le disait
   pas ; sans cela le compte de la régie n'est juste qu'au `Tick` suivant (les cibles nulles se libèrent à ce moment).
8. **« Mouvement réduit »** : `MouvementReduit` vit dans `ShellContracts/` (racine, hors `Mouvements/` : c'est de l'E/S plateforme, pas du
   mécanisme), stockage et lecture système INJECTABLES (un test ne touche jamais `PlayerPrefs`). La ligne est dans le tiroir « Le jeu » de ⑲,
   SANS sous-ligne (le canon n'en a pas ; `Bascule` saute la sous-ligne vide), visible seulement quand le profil est rendu (comme les autres).
   Clé i18n NEUVE `reglages.bloc.mouvement_reduit` (dérivée du littéral, convention de ⑲), inscrite à `DetteDatee` ; note
   `Tools/juge-donnees/i18n/cles-neuves-e2a-2026-10-08.md`. Pas de `PATCH /v1/me/settings` (design §5 : lot back différé).
9. **Le JNI Android n'est PAS typé par le typecheck habituel** (`UNITY_EDITOR` est défini dans les `.csproj`) : il a été compilé à part, avec
   les mêmes défines sans `UNITY_EDITOR`, faute injectée comprise (vue en régime Android, invisible en régime éditeur).
10. **Source de `bandeau.sortie`** : « ex-FonduS de BandeauEphemere » remplace la citation `BandeauEphemere.cs:167` (la constante n'existe plus).
11. **Tests** : les noms de `T1_LaBarre_EnDescente_PuisRetourALEtatNomme` et `T2_LePouls_EtLeTremblement` sont gardés (réécrits) ; le contrôle
    négatif de T1 (« pouls resté armé ⇒ rouge ») est un test voisin, `T1_ControleNegatif_…`, qui exécute la MÊME lecture sans désarmer.
    `Hud_LeCatalogueDuChrome_PasseToutesLesGardes` passe de 7 à 10 entrées.

## À savoir pour le créneau Unity

- Aucun test de contrôleur (Shell / CityMap / Account) n'a été exécuté : ils ne tournent qu'au créneau. Le harnais mono ne compile que les
  tests purs d'E1 (+ ceux de G11 / `Inspecter`, ajoutés dans `MouvementsGardesPlayModeTests`).
- Effet de bord attendu des planches photo avec un shell réel : l'aiguille balaie 0,7 s et le cerclage vire 0,6 s après une publication de
  chaleur (B6/B7/B10) ; une capture prise dans cet intervalle voit un état intermédiaire.
- Dette 8 (4 commentaires qui nomment `AmbientPulseLoop`) : nettoyée. Dette 17 / `PoulsPoseReduitS` : inchangée.
