# Teplota Labe - Monitoring teploty vody v Labi

Aplikace pro zobrazení aktuální teploty vody, hladiny a průtoku v řece Labi. Data jsou stahována z ČHMÚ a ukládána do databáze pro rychlé načítání.

## 📋 Požadavky

- **Lokálně (XAMPP):**

  - PHP 7.4 nebo vyšší
  - MySQL/MariaDB
  - Apache server
  - XAMPP nainstalovaný na Windows

- **Na serveru:**
  - PHP 7.4 nebo vyšší
  - MySQL/MariaDB databáze
  - Možnost nastavit cron job

## 🚀 Instalace - Lokálně (XAMPP)

### 1. Zkopírujte soubory

Projekt je již ve složce `c:\xampp\htdocs\teplotaLabe`

### 2. Vytvořte konfigurační soubor

```bash
# Zkopírujte vzorový config
copy config.example.php config.php
```

Pak otevřete `config.php` a upravte produkční přihlašovací údaje (pokud nasazujete na server).

**⚠️ DŮLEŽITÉ:** Soubor `config.php` není na GitHubu (je v `.gitignore`), takže můžete bezpečně ukládat hesla.

### 3. Vytvořte databázi

Otevřete phpMyAdmin: http://localhost/phpmyadmin

**Způsob A - Automaticky:**

1. Klikněte na "Import"
2. Vyberte soubor `database.sql`
3. Klikněte "Spustit"

**Způsob B - Ručně:**

1. Vytvořte novou databázi s názvem: `teplota_labe`
2. Charset: `utf8mb4`
3. Collation: `utf8mb4_unicode_ci`
4. Otevřete SQL kartu a vložte obsah souboru `database.sql`

### 3. Zkontrolujte konfiguraci

Soubor `config.php` je nastaven pro XAMPP s výchozími hodnotami:

```php
DB_HOST: localhost
DB_NAME: teplota_labe
DB_USER: root
DB_PASS: (prázdné)
```

### 4. Naplňte databázi prvními daty

Otevřete v prohlížeči:

```
http://localhost/teplotaLabe/fetch_data.php
```

Měli byste vidět výstup:

```
=== Starting data fetch at 2024-XX-XX XX:XX:XX ===
Database connected
Fetching data from ČHMÚ...
Data fetched, parsing...
Parsed XX records
Storing in database...
Inserted/updated XX records
=== Fetch completed successfully ===
```

### 5. Otevřete aplikaci

```
http://localhost/teplotaLabe/
```

## 🔄 Automatické aktualizace dat

### Lokálně - Windows Task Scheduler

#### Vytvoření .bat souboru

Vytvořte soubor `fetch_data.bat` ve složce projektu:

```batch
@echo off
cd /d "c:\xampp\htdocs\teplotaLabe"
c:\xampp\php\php.exe fetch_data.php
```

#### Nastavení Task Scheduleru

1. Otevřete "Task Scheduler" (Plánovač úloh)
2. Klikněte "Create Basic Task" (Vytvořit základní úlohu)
3. Název: "Teplota Labe - Data Fetch"
4. Trigger: "Daily" (Denně)
5. Start time: libovolný čas
6. Action: "Start a program"
7. Program/script: `c:\xampp\htdocs\teplotaLabe\fetch_data.bat`
8. V pokročilém nastavení:
   - Zaškrtněte "Run task as soon as possible after a scheduled start is missed"
   - Zaškrtněte "Repeat task every: 30 minutes"
   - Duration: "Indefinitely"

### Na serveru - Linux Cron

Otevřete crontab:

```bash
crontab -e
```

Přidejte řádek (stahování každých 30 minut):

```bash
*/30 * * * * /usr/bin/php /path/to/teplotaLabe/fetch_data.php >> /path/to/teplotaLabe/logs/cron.log 2>&1
```

Nebo přes wget/curl:

```bash
*/30 * * * * /usr/bin/curl -s https://vase-domena.cz/teplotaLabe/fetch_data.php >> /path/to/logs/cron.log 2>&1
```

## 🌐 Nasazení na produkční server

### 1. Nahrání souborů

Nahrajte všechny soubory přes FTP/SFTP do složky na serveru.

**⚠️ BEZPEČNOST:** Pokud používáte Git, ujistěte se, že:

- Soubor `.gitignore` je součástí repozitáře
- Nikdy necommitujte `config.php` (jen `config.example.php`)
- Po nahrání na server vytvořte `config.php` ručně

### 2. Vytvoření konfigurace na serveru

Na serveru vytvořte soubor `config.php`:

```bash
# Přes SSH nebo File Manager
cp config.example.php config.php
nano config.php  # nebo editujte přes File Manager
```

Vyplňte skutečné databázové přihlašovací údaje pro produkci.

### 3. Vytvoření databáze

1. V administračním panelu hostingu vytvořte MySQL databázi
2. Poznamenejte si:

   - Název databáze
   - Uživatelské jméno
   - Heslo
   - Host (obvykle `localhost`)

3. Importujte `database.sql` přes phpMyAdmin nebo příkazovou řádku

### 3. Konfigurace

Upravte soubor `config.php` - sekci pro produkci:

```php
} else {
    // Production server settings
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'vase_databaze');
    define('DB_USER', 'vase_uzivatelske_jmeno');
    define('DB_PASS', 'vase_heslo');
}
```

### 4. První naplnění dat

Spusťte jednou ručně:

```
https://vase-domena.cz/teplotaLabe/fetch_data.php
```

### 5. Nastavení cronu

Viz sekce výše "Na serveru - Linux Cron"

### 6. Testování

Otevřete:

```
https://vase-domena.cz/teplotaLabe/
```

## 📁 Struktura projektu

```
teplotaLabe/
├── index.html          # Hlavní HTML stránka
├── style.css           # Styly
├── script.js           # JavaScript (upravený pro PHP API)
├── config.php          # Konfigurace databáze
├── api.php             # API endpoint pro načítání dat
├── fetch_data.php      # Skript pro stahování dat z ČHMÚ
├── database.sql        # SQL struktura databáze
├── fetch_data.bat      # Windows batch pro Task Scheduler (vytvoříte)
└── README.md           # Tento soubor
```

## 🗄️ Databázová struktura

### Tabulka: measurements

Ukládá všechna měření:

- `id` - Auto increment ID
- `date_time` - Datum a čas měření (DATETIME, UNIQUE)
- `water_level` - Hladina vody v cm (DECIMAL)
- `flow_rate` - Průtok v m³/s (DECIMAL)
- `temperature` - Teplota vody ve °C (DECIMAL)
- `created_at` - Čas vložení do DB (TIMESTAMP)

### Tabulka: fetch_log

Loguje operace stahování:

- `id` - Auto increment ID
- `fetch_time` - Čas stažení (TIMESTAMP)
- `status` - Stav: 'success' nebo 'error'
- `records_inserted` - Počet vložených záznamů
- `error_message` - Chybová zpráva (pokud je)

## 🔧 API Endpointy

### GET api.php

Vrací naměřená data ve formátu JSON

**Parametry:**

- `limit` - Počet záznamů (výchozí: 100, max: 500)
- `from` - Datum od (formát: YYYY-MM-DD)

**Příklad:**

```
api.php?limit=50
api.php?from=2024-12-01&limit=200
```

**Odpověď:**

```json
{
  "success": true,
  "count": 100,
  "data": [
    {
      "dateTime": "11.12.2024 14:30",
      "level": "123",
      "flow": "45,50",
      "temperature": "4,2"
    },
    ...
  ],
  "lastFetch": {
    "time": "2024-12-11 14:35:22",
    "status": "success",
    "records": 48
  },
  "timestamp": "2024-12-11 14:40:00"
}
```

## 🐛 Řešení problémů

### Data se nenačítají

1. Zkontrolujte, zda databáze obsahuje data: otevřete phpMyAdmin a podívejte se do tabulky `measurements`
2. Pokud je prázdná, spusťte: `http://localhost/teplotaLabe/fetch_data.php`
3. Zkontrolujte PHP error log v XAMPP: `c:\xampp\apache\logs\error.log`

### Chyba připojení k databázi

1. Ověřte, že MySQL běží v XAMPP Control Panel
2. Zkontrolujte nastavení v `config.php`
3. Ověřte, že databáze `teplota_labe` existuje

### fetch_data.php nefunguje

1. Zkontrolujte, zda máte připojení k internetu
2. Ověřte, že URL ČHMÚ je dostupné: https://hydro.chmi.cz/hppsoldv/hpps_prfdata.php?seq=307338
3. Zkontrolujte PHP error log

### Task Scheduler nespouští úlohu

1. Zkontrolujte cestu k php.exe v .bat souboru
2. Ověřte, že úloha má práva administrátora
3. Vyzkoušejte spustit .bat soubor ručně

## 📊 Údržba

### Mazání starých dat

Skript `fetch_data.php` automaticky maže data starší než 7 dní.
Můžete změnit v řádku:

```php
DELETE FROM measurements WHERE date_time < DATE_SUB(NOW(), INTERVAL 7 DAY)
```

### Kontrola logů

```sql
SELECT * FROM fetch_log ORDER BY fetch_time DESC LIMIT 20;
```

## 📝 Změny oproti původní verzi

1. ✅ **Odstranění PROXY_URL** - data se již nestahují přes proxy
2. ✅ **PHP backend** - data se stahují na serveru pomocí `fetch_data.php`
3. ✅ **Databázové úložiště** - rychlý přístup k datům bez čekání
4. ✅ **API endpoint** - `api.php` vrací data ve formátu JSON
5. ✅ **Upravený JavaScript** - načítá data z lokálního API
6. ✅ **Automatické aktualizace** - pomocí cron/Task Scheduler

## 🆘 Podpora

Pokud máte problémy:

1. Zkontrolujte PHP error log
2. Otevřte konzoli prohlížeče (F12) a hledejte chyby
3. Zkontrolujte, zda všechny soubory byly správně nahrány
4. Ověřte připojení k databázi

## 📜 Licence

Data jsou stahována z ČHMÚ (Český hydrometeorologický ústav).
