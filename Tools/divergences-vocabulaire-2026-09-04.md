# Divergences vocabulaire — client ratifié ↔ bundle `fr` du back

**Mesuré le 2026-09-04**, dev back `main` 6ff684db recréé 10:22, bundle lu par
`curl 'http://localhost/v1/i18n/bundle?locale=fr'` (601 messages ; le même appel SANS le
paramètre rend 570 messages en `en` — contrôle négatif).

## Ce que ce document compte, et ce qu'il ne compte pas

La clé qu'un écran demande est `domaine.role.slug(LITTÉRAL)` (`Libelle.CleDe`), et le slug est
dérivé du littéral **français**. Une divergence n'existe donc que si le bundle sert CETTE clé
avec un AUTRE mot. Un mot français différent sous une clé dérivée de l'anglais
(`district.type_batiment.front_shop` = « Boutique-écran ») **n'est pas une divergence** : le
client ne demande jamais cette clé, il demande `…commerce_ecran`. C'est une clé **morte** côté
client, pas un conflit. *Vérifié avant d'écrire — l'inverse a été supposé une heure plus tôt.*

| population | compte |
| --- | ---: |
| sites d'appel `Libelle.De(` dans `Assets/Scripts` | **188** |
| … dont le 3e argument est un LITTÉRAL (analysables ici) | **151** |
| … dont le 3e argument est une VARIABLE (**hors de portée**, clé connue au runtime seulement) | **37** |
| clés DISTINCTES produites par les sites littéraux | **151** |
| … servies par le bundle `fr` | **107** |
| … absentes du bundle `fr` (⇒ repli sur le littéral français, sans effet visible) | **44** |
| ⇒ **DIVERGENTES** — servies ET différentes du mot ratifié | **2** |

⚠️ **Le dénominateur non couvert est 37**, et il est publié exprès : ces sites
passent un littéral calculé à l'exécution, donc aucun balayage statique ne peut dire quelle clé
ils demanderont. Les nommer coûterait un run instrumenté (`Libelle.NbAppels` / `DernierRepli`
existent pour ça). *Un « 0 divergence » qui tairait ces 37 se lirait « le corpus est couvert ».*

## Les divergences — ruling 7f du 2026-09-04 : **le ratifié gagne, c'est le bundle qui s'aligne**

| clé | mot ratifié (client) | mot servi (bundle `fr`) | fichier |
| --- | --- | --- | --- |
| `autonomie.etat.minimal` | `[~] Minimal` | `[~] Minime` | `AutonomyInboxController.cs` |
| `exceptions.categorie.reputation` | `RÉPUTATION` | `REPUTATION` | `ExceptionQueueController.cs` |

⇒ Pour F (qui tient `services/game-back/src/i18n/string_table.ts`) : aligner les **deux** valeurs
`fr` sur la colonne « mot ratifié ». Les clés existent déjà côté back, seule la valeur change.

## Pourquoi ça ne se voyait pas, et pourquoi ça se verra demain

Tant que le client appelait `/v1/i18n/bundle` **sans `?locale=`**, le catalogue était anglais et
`Libelle.De` retombait sur ses littéraux : les écrans étaient français **par accident de panne**.
Une fois `?locale=fr` posé (`I18nClient.Locale`), le bundle GAGNE sur le repli à chaque clé qu'il
connaît — donc ces deux mots changent sous les captures que les juges compareront aux maquettes.
