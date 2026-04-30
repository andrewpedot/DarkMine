#!/bin/bash
set -e

# ============================================
#  DarkScript — Deploy Script
#  Uso: ssh root@SEU_IP "cd /var/www/darkscript && bash deploy.sh"
# ============================================

APP_NAME="darkscript"
APP_DIR="/var/www/darkscript"

echo "================================================"
echo "  🚀 Deploy DarkScript — $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

cd "$APP_DIR"

# 1. Pull das últimas alterações
echo ""
echo "📥 [1/4] Atualizando código (git pull)..."
git pull origin main

# 2. Instalar dependências
echo ""
echo "📦 [2/4] Instalando dependências..."
npm ci --production=false

# 3. Build de produção
echo ""
echo "🔨 [3/4] Gerando build de produção..."
npm run build

# 4. Reiniciar aplicação no PM2
echo ""
echo "♻️  [4/4] Reiniciando aplicação no PM2..."
pm2 restart "$APP_NAME" --update-env

# Salvar estado do PM2
pm2 save

echo ""
echo "================================================"
echo "  ✅ Deploy concluído com sucesso!"
echo "  📊 Status: pm2 status"
echo "  📋 Logs:   pm2 logs $APP_NAME"
echo "================================================"
