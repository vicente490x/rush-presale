$ErrorActionPreference = 'Stop'

$psql = Get-ChildItem -Path (Join-Path $env:ProgramFiles 'PostgreSQL\*\bin\psql.exe') -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if (-not $psql) {
  throw 'psql.exe non trovato. Verifica l’installazione di PostgreSQL.'
}

$service = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue |
  Where-Object Status -eq 'Running' |
  Select-Object -First 1

if (-not $service) {
  throw 'Nessun servizio PostgreSQL in esecuzione. Avvia PostgreSQL e riprova.'
}

if (-not (Test-Path -LiteralPath '.env.example')) {
  throw 'Esegui questo script dalla cartella principale del progetto RUSH.'
}

$securePassword = Read-Host 'Password PostgreSQL dell’utente postgres (input nascosto)' -AsSecureString
if ($securePassword.Length -eq 0) {
  throw 'La password PostgreSQL non può essere vuota.'
}

$passwordPointer = [IntPtr]::Zero
$adminPassword = $null
$randomBytes = New-Object byte[] 32
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$randomGenerator.GetBytes($randomBytes)
$randomGenerator.Dispose()
$appPassword = [BitConverter]::ToString($randomBytes).Replace('-', '').ToLowerInvariant()
[Array]::Clear($randomBytes, 0, $randomBytes.Length)
$oldPgPassword = $env:PGPASSWORD

try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:PGPASSWORD = $adminPassword

  $sql = @"
SELECT format('CREATE ROLE rush_presale_local LOGIN PASSWORD %L', '$appPassword')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rush_presale_local')\gexec
ALTER ROLE rush_presale_local WITH LOGIN PASSWORD '$appPassword';
SELECT 'CREATE DATABASE rush_presale_local OWNER rush_presale_local'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'rush_presale_local')\gexec
ALTER DATABASE rush_presale_local OWNER TO rush_presale_local;
GRANT ALL PRIVILEGES ON DATABASE rush_presale_local TO rush_presale_local;
"@

  $sql | & $psql.FullName -X -w -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL non ha completato la configurazione (codice $LASTEXITCODE). Verifica password, permessi e output precedente."
  }
}
finally {
  $env:PGPASSWORD = $oldPgPassword
  $adminPassword = $null
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $securePassword.Dispose()
}

$databaseUrl = "postgresql://rush_presale_local:$appPassword@127.0.0.1:5432/rush_presale_local?schema=public"
$envPath = Join-Path (Get-Location) '.env.local'
if (Test-Path -LiteralPath $envPath) {
  $envContent = [IO.File]::ReadAllText($envPath)
}
else {
  $envContent = [IO.File]::ReadAllText((Join-Path (Get-Location) '.env.example'))
}

$envContent = [regex]::Replace($envContent, '(?m)^DATABASE_URL=.*$', "DATABASE_URL=$databaseUrl")
$envContent = [regex]::Replace($envContent, '(?m)^DIRECT_URL=.*$', "DIRECT_URL=$databaseUrl")
[IO.File]::WriteAllText($envPath, $envContent, [Text.UTF8Encoding]::new($false))

$env:DATABASE_URL = $databaseUrl
$env:DIRECT_URL = $databaseUrl
Write-Output 'Utente e database PostgreSQL locali configurati. URL e password non verranno mostrati.'

npm run db:migrate
if ($LASTEXITCODE -ne 0) {
  throw "Migrazione PostgreSQL non riuscita (codice $LASTEXITCODE)."
}

npm run db:generate
if ($LASTEXITCODE -ne 0) {
  throw "Generazione Prisma Client non riuscita (codice $LASTEXITCODE)."
}

Write-Output 'Database locale pronto. Riavvia il server Next.js perché carichi .env.local.'
