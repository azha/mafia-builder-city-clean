#!/usr/bin/env bash
# Vérifie que les scripts du client COMPILENT — sans éditeur Unity, sans MCP, sans batchmode.
#
# ⛔ POURQUOI CET INSTRUMENT EXISTE. « Est-ce que ça compile ? » est resté une inconnue pendant
# tout un lot parce qu'on croyait qu'il fallait l'éditeur pour y répondre. C'est faux : Unity
# livre Roslyn (`Data/DotNetSdkRoslyn/csc.dll`) ET son runtime .NET
# (`Data/NetCoreRuntime/dotnet`), et les `.csproj` du projet portent déjà les 288 références.
# La syntaxe et les types se vérifient donc à froid, en quelques secondes, pendant qu'un gate
# tourne — ce n'est ni un run PlayMode, ni un batchmode, ni une stack Docker.
#
# ⛔⛔ ET LE VERT DE CE SCRIPT NE VAUT RIEN SANS SON CONTRÔLE POSITIF. Ce dépôt a déjà payé un
# faux vert de cette famille exacte : un `npx tsc` qui rendait « compilation completed » et
# EXIT=0 pendant que le log disait « this is not the tsc command you are looking for » — npx
# avait résolu un autre paquet. Un compilateur qui n'a pas vu le projet ressemble trait pour
# trait à un compilateur vert. ⇒ `--controle-positif` injecte trois fautes DANS LE CODE DU LOT
# (mauvais types de retour, méthode inexistante) et EXIGE qu'elles rougissent. Si elles ne
# rougissent pas, la passe normale ne prouve rien et le script le dit.
#
# ⚠️ ET LE TROU QUE CE SCRIPT A EU LUI-MÊME PENDANT UNE HEURE : il ne compilait QUE le code de
# jeu, jamais `Assets/Tests/PlayMode`. Une suite de tests fraîchement écrite pouvait donc être
# déclarée « le code compile » alors que RIEN ne l'avait jamais compilée — un vert qui répond à
# une autre question que celle qu'on lui pose. Le mode `--tests` ferme ce trou ; il tire aussi
# `Assets/Editor/AssetLint` (les tests en dépendent) et définit `UNITY_INCLUDE_TESTS`, sans quoi
# l'assembly de tests est exclue par sa propre contrainte de define.
#
# ⛔⛔ CE QUE CE VERT NE PROUVE PAS, ET C'EST STRUCTUREL — MESURÉ LE 2026-09-03.
# Ce script rassemble les sources par `find Assets/Scripts … -name '*.cs'` et les compile dans UNE
# SEULE invocation de Roslyn. Il ne connaît donc AUCUNE frontière d'assembly : tout ce qui est dans
# l'arbre voit tout le reste. Unity, lui, compile une assembly par `.asmdef`, avec ses références
# déclarées — et refuse les cycles.
# ⇒ Un écran d'`Operational` qui lit un type de l'assembly `Shell` compile ICI et rougit LÀ-BAS.
#   Mesuré à l'euro près : ce script a rendu `EXIT=0 · erreurs=0` sur un contrôleur que le batchmode
#   a immédiatement refusé — `CS0246: The type or namespace name 'StructuralBudgetDto' could not be
#   found`, deux fois. Le `using` était juste ; c'est la RÉFÉRENCE D'ASSEMBLY qui manquait, et
#   `Shell` référence déjà `Operational` (la lecture inverse est un cycle).
# ⇒ **Son vert répond à « la syntaxe et les types tiennent-ils ? », jamais à « le découpage en
#   assemblies l'autorise-t-il ? ».** Deux questions, un seul vert. Un lot qui ajoute une dépendance
#   ENTRE dossiers d'assemblies doit passer par le batchmode ; ce script reste juste pour tout le
#   reste, qui est l'écrasante majorité des éditions.
# ⚠️ Ce n'est pas réparable en ajoutant un motif : il faudrait compiler assembly par assembly, en
#   lisant le graphe des `.asmdef`. Tant que ce n'est pas fait, la limite se DÉCLARE plutôt que de
#   se laisser découvrir — un contrôle dont on ne borne pas la portée est lu plus large qu'il n'est.
#
# usage :
#   Tools/verifier-compilation-sans-unity.sh                    # le code de jeu
#   Tools/verifier-compilation-sans-unity.sh --tests            # code de jeu + suites PlayMode
#   Tools/verifier-compilation-sans-unity.sh --controle-positif # la faute injectée DOIT rougir
set -uo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${UNITY_DATA:=/home/erutheone/Unity/Hub/Editor/6000.4.6f1/Editor/Data}"
DOTNET="$UNITY_DATA/NetCoreRuntime/dotnet"
CSC="$UNITY_DATA/DotNetSdkRoslyn/csc.dll"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[[ -x "$DOTNET" ]] || { echo "runtime .NET d'Unity introuvable : $DOTNET"; exit 2; }
[[ -f "$CSC"    ]] || { echo "Roslyn introuvable : $CSC"; exit 2; }

cd "$RACINE"
[[ -f Operational.csproj ]] || { echo "Operational.csproj absent — ouvrir l'IDE une fois pour le générer"; exit 2; }

# ⛔⛔ LE PÉRIMÈTRE EST DEVENU UN ARGUMENT SÉPARÉ DU CONTRÔLE POSITIF — trouvé en m'en servant
#    (2026-09-02) : j'ai résolu un conflit dans `Assets/Editor/MafiaCI.cs`, lancé ce script,
#    obtenu VERT + contrôle positif VERT, et failli commiter. Or le mode par défaut compile
#    `Operational.csproj` : **`Assets/Editor` n'y est pas**. Le vert ne disait rien du fichier
#    que je venais d'éditer, et son contrôle positif non plus — la sonde tapait dans
#    `MafiaCleanCity.Operational`, une assembly que ce mode voyait effectivement.
#    ⇒ *Un contrôle positif prouve que le compilateur voit LA CIBLE DE LA SONDE, pas la cible
#      de l'édition.* C'est le piège du run scopé sur la mauvaise catégorie, transposé au
#      compilateur : l'instrument a bien tourné, longtemps, sur autre chose.
#    ⇒ D'où `--editeur`, et d'où une sonde PAR PÉRIMÈTRE : celle du mode éditeur appelle une
#      méthode inexistante sur `MafiaCI` lui-même, donc son rouge prouve que `Assets/Editor`
#      est bien dans le jeu compilé.
PERIMETRE=""
CP=0
for a in "$@"; do
  case "$a" in
    --tests|--editeur) PERIMETRE="$a" ;;
    --controle-positif) CP=1 ;;
    *) echo "argument inconnu : $a (attendus : --tests, --editeur, --controle-positif)"; exit 2 ;;
  esac
done
MODE="$PERIMETRE"
CSPROJ="Operational.csproj"
[[ "$PERIMETRE" == "--tests"   ]] && CSPROJ="CityMap.PlayMode.Tests.csproj"
[[ "$PERIMETRE" == "--editeur" ]] && CSPROJ="Assembly-CSharp-Editor.csproj"
[[ -f "$CSPROJ" ]] || { echo "$CSPROJ absent — ouvrir l'IDE une fois pour le générer"; exit 2; }

# Les références : lues dans le csproj généré par Unity, jamais listées à la main.
# ⚠️ On ÉCARTE les .dll de nos propres assemblies : elles sont compilées depuis leurs sources
# juste après. Sinon une constante ajoutée aujourd'hui serait absente de la dll d'hier, et
# l'échec accuserait le code pour une raison sans rapport.
python3 - "$TMP" "$CSPROJ" <<'PY'
import re, sys
tmp, csproj = sys.argv[1], sys.argv[2]
refs = re.findall(r'<HintPath>([^<]+)</HintPath>', open(csproj).read())
refs = [r for r in refs if not re.search(
    r'/(Operational|ShellContracts|Theme|CityMap|Shell|AssetLint)\.dll$', r.replace('\\', '/'))]
# ⚠️ Le '\n' FINAL n'est pas cosmétique : sans lui, la dernière référence et l'option qui suit
# se retrouvent sur la MÊME ligne du fichier-réponse, et Roslyn cherche un fichier nommé
# « UnityEngine.UI.dll/target:library ». Le message d'erreur parle alors d'un fichier
# introuvable — un rouge qui accuse le code alors que le défaut est dans l'instrument.
# Trouvé par le contrôle positif ci-dessous, pas par relecture.
open(f'{tmp}/refs.txt', 'w').write('\n'.join(sorted(set(r.replace('\\', '/') for r in refs))) + '\n')
PY

# Les sources : les assemblies de gameplay, compilées DEPUIS LEURS SOURCES et non depuis leurs
# .dll — sinon une constante ajoutée aujourd'hui (p. ex. EchelleMaquette.LargeurEcransBrennar6)
# serait absente de la dll d'hier et le contrôle échouerait pour une raison sans rapport.
if [[ "$PERIMETRE" == "--tests" ]]; then
  find Assets/Scripts Assets/Tests/PlayMode Assets/Editor/AssetLint -name '*.cs' > "$TMP/srcs.txt"
elif [[ "$PERIMETRE" == "--editeur" ]]; then
  # Le code d'éditeur APPELLE le gameplay : le compiler seul rendrait des CS0246 qui accusent
  # le code alors que le défaut serait le périmètre. On prend donc les deux, comme `--tests`.
  find Assets/Scripts Assets/Editor -name '*.cs' > "$TMP/srcs.txt"
else
  # ⛔ PLUS DE LISTE FIGÉE DE DOSSIERS. Elle énumérait cinq assemblies à la main et devenait
  # FAUSSE dès qu'on en ajoutait une : `Assets/Scripts/I18n` (socle i18n, 2026-09-02) en était
  # absent, et ce mode rendait `CS0234 : MafiaCleanCity.I18n n'existe pas` sur du code
  # parfaitement valide — pendant que `--tests`, qui balaie `Assets/Scripts` en entier, était
  # VERT sur les mêmes fichiers.
  # ★ Deux modes du même instrument qui se contredisent : celui qui énumère à la main a tort,
  #   toujours. Un rouge d'outil ressemble trait pour trait à un rouge de code, et on va
  #   corriger le code.
  # `Assets/Scripts` en entier, comme `--tests` : le seul périmètre qui ne se périme pas.
  find Assets/Scripts -name '*.cs' > "$TMP/srcs.txt"
fi

sed 's|^|/r:|' "$TMP/refs.txt" > "$TMP/rsp.txt"
printf '/target:library\n/out:%s/verif.dll\n/nostdlib+\n/langversion:9.0\n' "$TMP" >> "$TMP/rsp.txt"
# UNITY_INCLUDE_TESTS : sans lui, l'assembly de tests est écartée par sa propre
# `defineConstraints` et le run compilerait 0 test en rendant EXIT=0 — un vert de non-exécution.
[[ "$PERIMETRE" == "--tests" ]] && echo '/define:UNITY_INCLUDE_TESTS' >> "$TMP/rsp.txt"
# Le code d'éditeur est gardé par UNITY_EDITOR : sans ce define, les fichiers d'`Assets/Editor`
# se compilent à VIDE et le mode rendrait un vert de non-exécution — la famille exacte du run
# jamais démarré. La sonde ci-dessous le prouve : sans le define, elle ne trouve pas `MafiaCI`.
[[ "$PERIMETRE" == "--editeur" ]] && printf '/define:UNITY_EDITOR\n/define:UNITY_INCLUDE_TESTS\n' >> "$TMP/rsp.txt"
cat "$TMP/srcs.txt" >> "$TMP/rsp.txt"

if [[ "$CP" == "1" && "$PERIMETRE" == "--editeur" ]]; then
  # ⚠️ SONDE DU PÉRIMÈTRE ÉDITEUR : elle vise `MafiaCI`, un type d'`Assets/Editor`. Son rouge
  #    prouve que CE dossier est compilé — la sonde gameplay, elle, resterait rouge même si
  #    `Assets/Editor` était entièrement absent du jeu de sources.
  cat > "$TMP/ControlePositif.cs" <<'CS'
public class ControlePositifSondeEditeur
{
    void DoitRougir()
    {
        MafiaCI.MethodeQuiNExistePas();          // CS0117 sur un type d'Assets/Editor
        int mauvais = MafiaCI.RunPlayModeTests;  // méthode utilisée comme champ
    }
}
CS
  echo "$TMP/ControlePositif.cs" >> "$TMP/rsp.txt"
elif [[ "$CP" == "1" ]]; then
  cat > "$TMP/ControlePositif.cs" <<'CS'
using MafiaCleanCity.Operational;
public class ControlePositifSonde
{
    void DoitRougir()
    {
        var t = new UniformTellsDto();
        int mauvais = t.ActifEstAbsorbe(UniformTellsDto.Pose.Collar); // bool -> int
        string aussi = t.CompteAbsorbe();                             // int -> string
        t.MethodeQuiNExistePas();
    }
}
CS
  echo "$TMP/ControlePositif.cs" >> "$TMP/rsp.txt"
fi

echo "sources : $(wc -l < "$TMP/srcs.txt")  ·  références : $(wc -l < "$TMP/refs.txt")"
# ⚠️ Le code de sortie est capturé AVANT tout pipe : `cmd | tail` rend le code de tail, et un
# timeout qui TUE le processus se lit alors « exit 0 » (piège déjà payé dans ce dépôt).
timeout 300 "$DOTNET" "$CSC" "@$TMP/rsp.txt" > "$TMP/out.txt" 2>&1
RC=$?
ERREURS=$(grep -cE 'error CS' "$TMP/out.txt" || true)

echo "EXIT=$RC · erreurs=$ERREURS"
grep -E 'error CS' "$TMP/out.txt" | head -30

# ⛔⛔ DEUX DÉFAUTS DE CE VERDICT, TROUVÉS EN AJOUTANT `--editeur` (2026-09-02) :
#  (a) il testait `$1`, donc `--editeur --controle-positif` ne l'atteignait JAMAIS : le script
#      sortait RC=1 en ayant parfaitement rempli son office, et un appelant qui lit le code de
#      retour aurait conclu « le lot ne compile pas » sur un contrôle RÉUSSI. Un instrument qui
#      accuse le code quand c'est lui qui a changé de forme.
#  (b) le seuil `>= 3` était le compte de la sonde GAMEPLAY, recopié comme s'il était universel.
#      La sonde éditeur en produit 2, celle des tests 5. *Un nombre dérivé d'un cas puis gelé.*
# ⇒ La propriété juste n'est pas COMBIEN d'erreurs, c'est OÙ elles sont : le contrôle exige que
#   les erreurs soient attribuées au FICHIER DE LA SONDE. Une erreur ailleurs ne prouve pas que
#   le compilateur voit la cible — elle prouve seulement que quelque chose est cassé.
if [[ "$CP" == "1" ]]; then
  SUR_SONDE=$(grep -E 'error CS' "$TMP/out.txt" | grep -cF 'ControlePositif.cs' || true)
  AILLEURS=$(( ERREURS - SUR_SONDE ))
  if [[ "$SUR_SONDE" -ge 2 ]]; then
    echo "✓ CONTRÔLE POSITIF : $SUR_SONDE erreur(s) sur la sonde — la compilation VOIT la cible de CE périmètre (${PERIMETRE:-gameplay})."
    # Une erreur HORS sonde pendant un contrôle positif est un vrai rouge du lot, masqué par
    # le bruit volontaire : le dire, sinon le ✓ le couvre.
    [[ "$AILLEURS" -gt 0 ]] && echo "  ⚠️ mais $AILLEURS erreur(s) HORS sonde : le lot ne compile pas, relancer sans --controle-positif."
    [[ "$AILLEURS" -gt 0 ]] && exit 1
    exit 0
  fi
  echo "✗ CONTRÔLE POSITIF ÉCHOUÉ : $SUR_SONDE erreur(s) sur la sonde (2 attendues au moins)."
  echo "  ⇒ la passe normale ne prouve RIEN sur ce périmètre : le compilateur ne voit pas ces types."
  exit 1
fi

[[ "$RC" -eq 0 && "$ERREURS" -eq 0 ]] && echo "✓ compile (relancer avec --controle-positif pour que ce vert ait une valeur)"
exit "$RC"
