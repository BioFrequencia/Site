#!/usr/bin/env bash
# Empacota o código-fonte do desktop (WPF) e do app (Expo/React Native)
# em public/downloads/, para a página /downloads oferecer os dois como
# download real. Não existe instalador (.exe) nem build (.apk) pré-compilado
# - este ambiente não tem o .NET SDK nem uma conta EAS configurada -, então
# o que é distribuído aqui é o código-fonte pronto para abrir no Visual
# Studio (desktop) ou rodar com Expo (app), não um binário.
set -euo pipefail

DIR_SITE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_PROJETO="$(cd "$DIR_SITE/.." && pwd)"
DIR_DOWNLOADS="$DIR_SITE/public/downloads"

mkdir -p "$DIR_DOWNLOADS"

echo "Empacotando código-fonte do desktop..."
(cd "$DIR_PROJETO" && zip -rq \
  "$DIR_DOWNLOADS/biofrequencia-desktop-fonte.zip" BioFrequencia \
  -x '*/bin/*' '*/obj/*' '*.user')

echo "Empacotando código-fonte do app..."
(cd "$DIR_PROJETO" && zip -rq \
  "$DIR_DOWNLOADS/biofrequencia-app-fonte.zip" mobile-app \
  -x '*/node_modules/*' '*/.expo/*')

echo "OK: $(du -h "$DIR_DOWNLOADS"/*.zip | awk '{print $2": "$1}')"
