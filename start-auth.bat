@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "DATABASE_URL_AUTH=postgresql://goida:password123@localhost:5432/auth_db"
set "DATABASE_URL_VPN=postgresql://goida:password123@localhost:5432/vpn_db"
set "DATABASE_URL_PAYMENT=postgresql://goida:password123@localhost:5432/payment_db"
set "DATABASE_URL_NOTIFICATION=postgresql://goida:password123@localhost:5432/notification_db"
set "REDIS_URL=redis://:redispass@localhost:6379"
set "JWT_SECRET=supersecretjwtkeyminimum32characterslong"
set "JWT_EXPIRES_IN=7d"
set "TELEGRAM_BOT_TOKEN=8263439817:AAEYrxvznfF4Ehs-WGcvGTBH9GoP9jm-PCY"
set "PORT_AUTH=3001"
set "PORT_VPN=3002"
set "PORT_PAYMENT=3003"
set "PORT_NOTIFICATION=3004"
set "PORT_GATEWAY=3000"
set "HOST=0.0.0.0"
set "INTERNAL_SECRET=changesecret"
cd /d %~dp0apps\auth-service
npm run dev
