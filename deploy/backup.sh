#!/usr/bin/env bash
# Backup do SQLite dos inscritos (dados pessoais: guarde FORA do repositório). Uso, na pasta do projeto:
#   deploy/backup.sh [pasta-destino]        (padrão: ~/backups-laesa)
# Seguro com o site no ar: VACUUM INTO lê um retrato consistente sem bloquear quem escreve.
set -euo pipefail
umask 077 # tudo que o script cria (pasta e arquivo) fica legível só pelo dono
destino="${1:-$HOME/backups-laesa}"
arquivo="$destino/laesa-$(date +%F-%H%M).db"
mkdir -p "$destino" && chmod 700 "$destino"

# Sempre apaga a cópia temporária dentro do contêiner; se o backup falhou no meio, apaga também o arquivo parcial.
concluido=0
limpar() {
  docker compose exec -T app rm -f /data/backup.db >/dev/null 2>&1 || true
  [ "$concluido" = 1 ] || rm -f "$arquivo"
}
trap limpar EXIT

docker compose exec -T app sh -c "rm -f /data/backup.db && node -e \"new (require('node:sqlite').DatabaseSync)('/data/laesa.db').exec(\\\"VACUUM INTO '/data/backup.db'\\\")\""
docker compose cp app:/data/backup.db "$arquivo" >/dev/null
chmod 600 "$arquivo"
concluido=1

# Retenção de 30 dias (LGPD: guardar dados pessoais só pelo tempo necessário). Só roda depois de um backup
# bem-sucedido, então nunca deixa a pasta vazia. Vale para .db e .db.gpg desta pasta; cópias levadas para
# outro lugar precisam da mesma limpeza.
find "$destino" -maxdepth 1 -type f -name 'laesa-*.db*' -mtime +30 -exec rm -f {} +

echo "backup salvo em $arquivo"
echo "recomendado: gpg --symmetric --cipher-algo AES256 \"$arquivo\" && rm \"$arquivo\""
