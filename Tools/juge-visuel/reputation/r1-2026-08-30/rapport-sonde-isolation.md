# Sonde 1 — deux éditeurs Unity sur deux arbres partagent-ils leurs rechargements de domaine ?

**Verdict : NON. Isolation CONFIRMÉE.** Mesuré le 2026-08-30, 22:58:00 → 23:21:13.

C'est la première mesure de cette hypothèse — `BRIEF-PILOTE-B.md` la nommait explicitement comme
« une hypothèse que personne n'a encore mesurée ici », et tout le dispositif à deux sessions
reposait dessus.

## Le protocole, et pourquoi il a fallu deux tentatives

| | tentative 1 (22:25) | tentative 2 (23:20) |
|---|---|---|
| événement | dépôt de 6 `.cs` dans `Assets/` | **activation de la fenêtre** de l'éditeur B |
| B a-t-il recompilé ? | **NON** | oui (23:20:26 et 23:20:31, deux passes) |
| A a-t-il bougé ? | non | non |
| verdict | **AUCUN** | **ISOLATION CONFIRMÉE** |

La tentative 1 est celle qu'il fallait ne pas croire. « A n'a pas bougé » y était vrai et ne
prouvait rien : **B n'avait pas recompilé non plus**, parce qu'Unity ne rafraîchit ses assets
qu'au retour de focus. L'événement n'ayant pas eu lieu, l'absence d'effet chez A ne mesurait rien
— c'est « un run qui n'a jamais démarré ressemble à un run vert », transposé à une sonde. C'est
pourquoi l'instrument (`Tools/sonde-isolation-editeurs.sh`) **refuse désormais de rendre un
verdict sans la preuve que B a recompilé** : ce n'est pas un contrôle qu'on peut oublier de
lancer, c'est la condition de validité du verdict.

⇒ Et l'événement, je l'ai produit moi-même : la session est en **X11** et `xdotool` est installé.
`xdotool windowactivate 54529104` (fenêtre « Unity - mafia-unity-B », pid 2820458). Les fenêtres
de l'éditeur A (pid 2643750) ont été identifiées et **laissées intactes**. J'avais attendu deux
heures un geste qui était à ma portée : je ne l'avais pas cherché.

## Les mesures

    B (celui qui devait recompiler)
      Library/ScriptAssemblies mtime   1788117295 → 1788124827
      somme des mtimes des 83 dll      147886450940 → 147886505646
    A (celui qui ne doit RIEN voir)
      Library/ScriptAssemblies mtime   1788107970 → 1788107970   INCHANGÉ
      somme des mtimes des 83 dll      147883352357 → 147883352357  INCHANGÉE
      nombre de dll                    83 → 83 (la somme reste comparable terme à terme)

## Ce que le journal ajoute, et sans quoi le verdict serait ambigu

269 relevés horodatés toutes les 5 s, sur 23 minutes :

    A mtime distincts : 1     ← une seule valeur sur toute la fenêtre
    A somme distincts : 1
    B mtime distincts : 3     ← deux bascules, à 23:20:26 puis 23:20:31

⇒ A n'a pas « bougé puis été observé après coup » : **il n'a jamais bougé du tout**. Un
avant/après seul ne pouvait pas distinguer les deux — le journal, si. (Réflexe emprunté à f1, dont
le log de run ne portait aucun horodatage et rendait tout rouge incorrélable avec l'extérieur.)

## ⚠️ CE QUI AFFAIBLIT CETTE MESURE, ET QUE LE JOURNAL M'A APPRIS SUR MOI

Les deux bascules de B portent, dans le journal : **charge 8,00 puis 9,80, et 22 conteneurs**.

**Le plancher E2E de f1 avait donc déjà démarré quand j'ai activé la fenêtre.** Je croyais n'avoir
lancé que deux runs de tests pendant son démarrage ; en réalité **la recompilation elle-même** y
est tombée. Je ne l'ai pas su en agissant — je l'ai lu dans mon propre journal, après coup.

⇒ Ce que ça ne change pas : le verdict d'isolation. Les deux grandeurs mesurées sont des mtimes de
fichiers, pas des durées ; la charge ne les fabrique ni ne les efface, et A est resté à une valeur
unique sur 269 relevés dont beaucoup à charge basse.
⇒ Ce que ça change : **j'ai enfreint la règle « pendant un gate, on ne lance rien d'autre »**, et
pas seulement pour six secondes de tests. Signalé à l'orchestratrice avec les horodatages, pour
que tout rouge chez f1 reste attribuable.
⇒ Et la leçon d'instrument : *un journal qui mesure la charge à côté du signal documente aussi la
faute de celui qui le lit.* C'est ce qui le rend utile — un instrument qui n'enregistrerait que ce
qu'on cherche ne dirait jamais qu'on cherchait au mauvais moment.

## Conséquences

1. **Les deux sondes du brief sont closes.** La sonde 2 (cache d'import partagé) était déjà
   répondue par la configuration : aucun Cache Server ni Accelerator n'est configuré, ni au projet
   (`m_CacheServerMode: 0` = hériter du global) ni au global (11 clés énumérées une à une, aucune).
2. **Une règle généralisée à tort est réfutée.** « Un seul éditeur Unity, jamais deux » avait été
   tirée de l'incident du 21 août — où deux *agents* pilotaient **le même** éditeur sur **le même**
   arbre. Ce cas-ci est différent et se mesure autrement : deux éditeurs, deux arbres, deux
   `Library` ⇒ pas de partage. La règle du socle reste vraie *pour ce qu'elle décrivait*.
3. **Ce que cette sonde ne dit PAS** : rien sur la CHARGE. Les deux éditeurs partagent la machine,
   le CPU et le disque — l'isolation mesurée porte sur l'ÉTAT (domaine, assemblies), pas sur les
   ressources. Un import concurrent peut toujours produire des symptômes chez l'autre (c'est
   d'ailleurs l'hypothèse en tête pour le rouge `DesignTokens` du même soir).

**Instrument** : `Tools/sonde-isolation-editeurs.sh` (modes `--avant` / `--apres` / `--attendre` /
`--journal`). **Données brutes** : `sonde-isolation-journal.tsv`, à côté de ce rapport.
