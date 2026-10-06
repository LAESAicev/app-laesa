#!/usr/bin/env bash
# Backup do SQLite dos inscritos (dados pessoais: guarde FORA do repositório). Uso, na pasta do projeto:
#   deploy/backup.sh [pasta-destino]        (padrão: ~/backups-laesa)
# Seguro com o site no ar: VACUUM INTO lê um retrato consistente sem bloquear quem escreve.
set -euo pipefail
destino="${1:-$HOME/backups-laesa}"
arquivo="$destino/laesa-$(date +%F-%H%M).db"
mkdir -p "$destino" && chmod 700 "$destino"
docker compose exec -T app sh -c "rm -f /data/backup.db && node -e \"new (require('node:sqlite').DatabaseSync)('/data/laesa.db').exec(\\\"VACUUM INTO '/data/backup.db'\\\")\""
docker compose cp app:/data/backup.db "$arquivo" >/dev/null
docker compose exec -T app rm -f /data/backup.db
chmod 600 "$arquivo"
echo "backup salvo em $arquivo"
echo "recomendado: gpg --symmetric --cipher-algo AES256 \"$arquivo\" && rm \"$arquivo\""
