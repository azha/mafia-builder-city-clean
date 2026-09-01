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

MODE="${1:-}"
CSPROJ="Operational.csproj"
[[ "$MODE" == "--tests" ]] && CSPROJ="CityMap.PlayMode.Tests.csproj"
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
if [[ "$MODE" == "--tests" ]]; then
  find Assets/Scripts Assets/Tests/PlayMode Assets/Editor/AssetLint -name '*.cs' > "$TMP/srcs.txt"
else
  find Assets/Scripts/Operational Assets/Scripts/ShellContracts Assets/Scripts/Theme \
       Assets/Scripts/CityMap Assets/Scripts/Shell -name '*.cs' > "$TMP/srcs.txt"
fi

sed 's|^|/r:|' "$TMP/refs.txt" > "$TMP/rsp.txt"
printf '/target:library\n/out:%s/verif.dll\n/nostdlib+\n/langversion:9.0\n' "$TMP" >> "$TMP/rsp.txt"
# UNITY_INCLUDE_TESTS : sans lui, l'assembly de tests est écartée par sa propre
# `defineConstraints` et le run compilerait 0 test en rendant EXIT=0 — un vert de non-exécution.
[[ "$MODE" == "--tests" ]] && echo '/define:UNITY_INCLUDE_TESTS' >> "$TMP/rsp.txt"
cat "$TMP/srcs.txt" >> "$TMP/rsp.txt"

if [[ "$MODE" == "--controle-positif" ]]; then
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

if [[ "${1:-}" == "--controle-positif" ]]; then
  if [[ "$ERREURS" -ge 3 ]]; then
    echo "✓ CONTRÔLE POSITIF : la faute injectée rougit ($ERREURS erreurs) — la compilation VOIT le code du lot."
    exit 0
  fi
  echo "✗ CONTRÔLE POSITIF ÉCHOUÉ : la faute injectée n'a pas rougi."
  echo "  ⇒ la passe normale ne prouve RIEN : le compilateur ne voit pas ces types."
  exit 1
fi

[[ "$RC" -eq 0 && "$ERREURS" -eq 0 ]] && echo "✓ compile (relancer avec --controle-positif pour que ce vert ait une valeur)"
exit "$RC"
