# ㉟ La vente — constats du r1 (2026-09-07) : aucun n'a été rendu contre le mauvais cadre

Atelier / DA, 2026-09-22. **Fait mesuré** : la référence fournie au r1 (`reference-1080x2102.png`) est le cadre **#107** « La vente — qui vend et ce qu'il y a dans la caisse » (7,1 % d'écart avec un rendu frais de #107 — le lot de vocabulaire de l'atelier depuis —, 34,3 % avec #108), et c'est le **bon** nominal : #107 dessine les six dealers et « AFFECTER UN DEALER » ; #108 est l'état « La caisse de Oskar » ; #113 est l'Horizon (㊱). Le dossier r1 disait #107 ; le juge a comparé à #107 et, pour le châssis, a mesuré ses invariants dans la SOURCE des six cadres (`.cerne`, `.enseigne`, `.compteurs` 6/6, `m16d`).

Ce qui était faux, c'est la **TABLE** de `construire-dossiers.py` : « corrigée » le 2026-09-07 en 108-113 / nominal 108 sur un compte d'occurrences d'une classe CSS (#107 « appartient à ㉗ » parce que son segment contient le `<style>` de la rangée). Rétablie 107-112 / nominal 107 le 2026-09-22 sur le texte affiché. Cette erreur n'a touché aucun rapport : elle est postérieure au r1 et n'a jamais fait rendre un PNG.

| id | gravité r1 | verdict | pourquoi |
|---|---|---|---|
| `B1` `B2` `B3` `M1` … `M10` `m1` … `m6` | — | **tenus, tous** | comparés au cadre #107, qui est le nominal ; le châssis (B1) est invariant sur les six cadres, mesuré |
| `M9` `M11` `m7` | MAJEUR / MAJEUR / MINEUR | **tenus — dépendent des DONNÉES** (déjà classés ainsi par le juge) | valeurs du compte de capture, non comparables sans la ligne d'identité jointe ; rien à voir avec le cadre |

**Compte** : 21 constats — **21 tenus · 0 à rejuger · 0 caduc**. Aucun re-jugement dû au cadre. Ce qui reste dû au r1 (point 3 de sa lecture globale) : le cadre d'état homologue de la capture, **#109 « Ramasser — nulle part où la porter »**, n'était pas rendu — à rendre pour le r2 (`Tools/rendre-tel.py … 109 … 3.6`, à ajouter aux `extras` de la TABLE), ce n'est pas une erreur de référence, c'est un témoin manquant.
