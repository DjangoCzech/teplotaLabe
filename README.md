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

<<<<<<< HEAD

1. # Vytvořte novou databázi s názvem: `d388414_templ`
1. Vytvořte novou databázi s názvem: `teplota_labe`
   > > > > > > > 3972bb02801de949c96879360300d4cd8a7fbe35
1. Charset: `utf8mb4`
1. Collation: `utf8mb4_unicode_ci`
1. Otevřete SQL kartu a vložte obsah souboru `database.sql`

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

## 🔄 Automatické aktualizace dat na pozadí

Data se aktualizují automaticky pomocí **fetch_data.php**, který:

- Stahuje aktuální měření z ČHMÚ
- Ukládá nové záznamy do databáze
- Ověřuje duplicity podle času měření
- Loguje všechny operace

### 🪟 Lokálně - Windows Task Scheduler

Soubor **fetch_data.bat** je již připraven v projektu!

#### 1. Test ručního spuštění

Nejdřív otestuj, zda batch funguje:

```batch
# Ve složce projektu spusť:
fetch_data.bat
```

Měl bys vidět výstup o načtených datech.

#### 2. Nastavení automatického spouštění

**Krok 1:** Otevři **Task Scheduler** (Plánovač úloh Windows)

- Stiskni `Win + R`, napiš `taskschd.msc` a stiskni Enter

**Krok 2:** Vytvoř novou úlohu

- Klikni "Create Basic Task..." (Vytvořit základní úlohu)
- Název: `Teplota Labe - Auto Update`
- Popis: `Automatické stahování dat z ČHMÚ každých 30 minut`

**Krok 3:** Trigger (spouštěč)

- Vyber: **Daily** (Denně)
- Start: dnes, libovolný čas (např. 00:00)
- Recur every: **1** days

**Krok 4:** Action (akce)

- Vyber: **Start a program** (Spustit program)
- Program/script: `C:\xampp\htdocs\teplotaLabe\fetch_data.bat`
- Start in: `C:\xampp\htdocs\teplotaLabe`

**Krok 5:** Pokročilá nastavení
Po vytvoření úlohy:

- Najdi ji v seznamu úloh a klikni pravým → **Properties** (Vlastnosti)
- Záložka **Triggers** → **Edit**
  - ✅ Zaškrtni: **Repeat task every: 30 minutes**
  - ✅ For a duration of: **Indefinitely** (Neomezeně)
- Záložka **Conditions**
  - ❌ Odškrtni: "Start the task only if the computer is on AC power"
- Záložka **Settings**
  - ✅ Zaškrtni: "Run task as soon as possible after a scheduled start is missed"
  - ✅ Zaškrtni: "If the task fails, restart every: 5 minutes"

**Krok 6:** Uložení a test

- Klikni **OK**
- Pravým na úlohu → **Run** pro okamžité spuštění testu

#### 3. Sledování logů

Logy najdeš v: `logs/` složce (vytvoří se automaticky)

---

### 🐧 Na serveru - Linux Cron

Soubor **fetch_data.sh** je již připraven! Nejdřív ho udělej spustitelným:

```bash
cd /cesta/k/teplotaLabe
chmod +x fetch_data.sh
```

#### Nastavení cronu

**Otevři crontab:**

```bash
crontab -e
```

**Přidej řádek pro spouštění každých 30 minut:**

```bash
*/30 * * * * /cesta/k/teplotaLabe/fetch_data.sh
```

**Nebo přímo přes PHP:**

```bash
*/30 * * * * /usr/bin/php /cesta/k/teplotaLabe/fetch_data.php >> /cesta/k/teplotaLabe/logs/fetch.log 2>&1
```

**Nebo přes curl (pokud je projekt na webu):**

```bash
*/30 * * * * /usr/bin/curl -s https://vase-domena.cz/teplotaLabe/fetch_data.php >> /cesta/k/logs/cron.log 2>&1
```

#### Ověření, že cron běží:

```bash
# Zobraz aktivní cron joby
crontab -l

# Sleduj logy
tail -f /cesta/k/teplotaLabe/logs/fetch.log
```

---

### 📊 Jak to funguje

**Co dělá automatická aktualizace:**

1. **Každých 30 minut** se spustí `fetch_data.php`
2. Skript se připojí na ČHMÚ web a stáhne HTML data
3. Parsuje tabulku s měřeními (datum, hladina, průtok, teplota)
4. **Kontroluje duplicity** - vloží pouze nová měření (podle `date_time`)
5. Loguje operaci do `fetch_log` tabulky
6. **Čistí stará data** - maže záznamy starší než 7 dní

**Výhody:**

- ✅ Data jsou vždy aktuální
- ✅ Stránka se načítá rychle (data z databáze, ne z ČHMÚ)
- ✅ Funguje i když ČHMÚ web je nedostupný (zobrazí poslední data)
- ✅ Žádné duplicity v databázi

**Sledování:**

- Zobraz poslední fetch: `SELECT * FROM fetch_log ORDER BY fetch_time DESC LIMIT 10;`
- Zobraz nejnovější měření: `SELECT * FROM measurements ORDER BY date_time DESC LIMIT 5;`

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
