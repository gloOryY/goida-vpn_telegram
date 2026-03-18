-- Инициализация баз данных для каждого сервиса
CREATE DATABASE auth_db;
CREATE DATABASE vpn_db;
CREATE DATABASE payment_db;

CREATE DATABASE notification_db;

-- Права для пользователя goida
GRANT ALL PRIVILEGES ON DATABASE auth_db TO goida;
GRANT ALL PRIVILEGES ON DATABASE vpn_db TO goida;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO goida;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO goida;
