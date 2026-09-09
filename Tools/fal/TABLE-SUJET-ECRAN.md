# Les 22 sujets d'état vide → l'écran qui les demande

**Pourquoi ce fichier existe.** L'appariement existait, mais **uniquement dans
`planches/reference-par-ecran.png`** — une image qu'aucun outil ne lit et qu'aucun `grep` n'atteint.
La session de montage a buté dessus. Ici il est en texte, opposable, diffable.

**Source.** Le tableau §3 de `MANIFESTE-MONTAGE.md` (« les matières d'écran — 20 · la clé est
l'écran »), qui porte le symbole et le titre. Les 22 sujets viennent de §4. **Aucune ligne n'est
inventée** : un sujet dont ma source ne nomme pas l'écran porte `—`.

| sujet | symbole d'écran | titre de l'écran |
|---|---|---|
| appro | ㉚ | Chaîne d'appro |
| autonomie | ㉔ | Autonomie |
| batiment | ② | Fiche bâtiment |
| bureau | ⑱ | Bureau |
| carnet | ㉞ | Ordres du soir |
| coffre | ㉖ | Compte |
| compression | ⑭ | Compression |
| confie | ㉜ | Ce qu'on a confié |
| conflit | ㉙ | Conflit |
| distribution | ㉘ | Distribution |
| exceptions | ⑨ | Exceptions |
| famille | ⑥ | Famille |
| journal | — | — |
| lieutenant | — | Lieutenant |
| loi | ㉛ | Loi |
| marche | ㉑ | Marché |
| police | ⑮⑰ | Police |
| raser | ㉝ | Raser un site |
| recrutement | — | — |
| revue | ⑯ | Revue |
| vente | ㉟ | Vente |
| vitrine | ㉗ | Boutique |

En texte brut, une ligne par sujet, format `<sujet> → <symbole d'écran> → <titre de l'écran>` :

```
appro         → ㉚  → Chaîne d'appro
autonomie     → ㉔  → Autonomie
batiment      → ②  → Fiche bâtiment
bureau        → ⑱  → Bureau
carnet        → ㉞  → Ordres du soir
coffre        → ㉖  → Compte
compression   → ⑭  → Compression
confie        → ㉜  → Ce qu'on a confié
conflit       → ㉙  → Conflit
distribution  → ㉘  → Distribution
exceptions    → ⑨  → Exceptions
famille       → ⑥  → Famille
journal       → —  → —
lieutenant    → —  → Lieutenant
loi           → ㉛  → Loi
marche        → ㉑  → Marché
police        → ⑮⑰ → Police
raser         → ㉝  → Raser un site
recrutement   → —  → —
revue         → ⑯  → Revue
vente         → ㉟  → Vente
vitrine       → ㉗  → Boutique
```

Arithmétique du découpage : **20 sujets** tombent sur une des 20 lignes de §3, **2** n'y sont pas
(`journal`, `recrutement`) — 20 + 2 = 22, et §3 est **entièrement couvert** (aucune de ses 20 lignes
n'est orpheline). L'appariement se fait par identité de nom, dans un des deux sens : soit le sujet
**est** le titre de l'écran (`bureau` → « Bureau »), soit il **est** le nom du fichier de matière
(`coffre` → `coffre.png` de ⑯…㉖ « Compte »). Aucune ligne n'a demandé d'arbitrage.

---

## Ce que la confrontation avec le client dit — À TRANCHER, ce n'est PAS dans ma source

⚠️ Je n'ai pas rempli les trous depuis un autre document : je les signale. `Tools/juge-visuel/INDEX.md`
du client (35 lignes, une par écran monté) **contredit ma source sur trois symboles et comble les deux
trous**. Les deux populations doivent être confrontées, pas supposées égales.

| ligne | ce que MA source dit | ce que `INDEX.md` du client dit |
|---|---|---|
| `journal` | pas d'écran | **㊳ « Le journal & la rue »**, `JournalScreenController` |
| `recrutement` | pas d'écran | **⑳ « Recruitment »** `screen_15`, dossier `recrutement` |
| `bureau` → ⑱ | ⑱ = « Bureau » | ⑱ = **« More menu »** `screen_12`, dossier `plus` |
| `coffre` → ㉖ | ㉖ = « Compte » | **㉖ n'existe pas** ; `planche_le_coffre` est sur **㉒ « Player Profile »** |
| `vitrine` → ㉗ | ㉗ = « Boutique » | **㉗ n'existe pas** ; `planche_la_vitrine` est sur **㉓ « IAP Shop »** |

★ Les trois symboles contestés sont **exactement ceux qui ne portent pas un nom de domaine** dans mes
noms de fichiers (`bureau`/`acajou`, `coffre`, `vitrine`). Les 17 autres, dont le sujet **est** le titre
de l'écran, ne sont contredits par personne. ⇒ La lecture la plus probable est que mes symboles ㉖ et ㉗
sont **décalés**, pas que les pièces sont fausses : `coffre.png` et `vitrine.png` sont les matières que
le client associe déjà à ㉒ et ㉓, sous ces noms-là. **Mais c'est une DÉDUCTION, pas un compte** — je
ne la porte pas dans la table. Qui monte tranche, en lisant `INDEX.md`.

⚠️ Et le trou de ⑱ n'est pas de la même famille : « Bureau » et « More menu » ne sont pas deux noms de
la même chose. Soit l'écran « Bureau » n'existe pas côté client, soit il porte un autre symbole. **Ni
`acajou.png` ni `vide-bureau.png` ne se montent avant que ce soit tranché.**
