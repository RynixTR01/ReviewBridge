param(
  [Parameter(Mandatory=$true)][string]$PostgresBin,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
# Production is read-only. The restore destination is a new empty database on
# the explicitly approved, expiring audit branch. Never restore into neondb.
$productionHost = 'ep-still-king-ba1rge14.c-8.eu-central-1.aws.neon.tech'
$auditHost = 'ep-damp-sunset-bazyhhcn.c-8.eu-central-1.aws.neon.tech'
$databaseName = 'restore_audit_' + (Get-Date -Format 'yyyyMMddHHmmss')
$destination = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($destination) | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpPath = Join-Path $destination "public-$stamp.dump"
$encryptedPath = "$dumpPath.dpapi"
$restoredDump = Join-Path $destination "restored-$stamp.dump"
$plainCopy = Join-Path $destination "recovery-$stamp.dump"
$variables = @('PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
function Set-DatabaseConnection([string]$connection, [string]$expectedHost) {
  $uri = [Uri]$connection
  if ($uri.Host -ne $expectedHost) { throw 'Unexpected database host' }
  $credentials = $uri.UserInfo.Split(':',2)
  $env:PGHOST=$uri.Host; $env:PGPORT='5432'; $env:PGSSLMODE='require'
  $env:PGUSER=[Uri]::UnescapeDataString($credentials[0])
  $env:PGPASSWORD=[Uri]::UnescapeDataString($credentials[1])
  $env:PGDATABASE=$uri.AbsolutePath.TrimStart('/')
}
function Assert-Exit([string]$step) { if ($LASTEXITCODE -ne 0) { throw "$step failed" } }
try {
  $production = (neon connection-string br-rough-cloud-batval9z --project-id damp-dew-35269528 --role-name neondb_owner --database-name neondb).Trim()
  Assert-Exit 'Production connection'
  Set-DatabaseConnection $production $productionHost
  & (Join-Path $PostgresBin 'pg_dump.exe') --schema=public --format=custom --no-owner --no-acl --file=$dumpPath
  Assert-Exit 'Production backup'
  $bytes = [IO.File]::ReadAllBytes($dumpPath)
  $encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [IO.File]::WriteAllBytes($encryptedPath,$encrypted)
  $decrypted = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($encryptedPath),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [IO.File]::WriteAllBytes($plainCopy,$decrypted)
  if ((Get-FileHash $dumpPath).Hash -ne (Get-FileHash $plainCopy).Hash) { throw 'Encrypted backup verification failed' }
  $audit = (neon connection-string br-muddy-glade-bay09bbt --project-id damp-dew-35269528 --role-name neondb_owner --database-name neondb).Trim()
  Assert-Exit 'Audit connection'
  Set-DatabaseConnection $audit $auditHost
  & (Join-Path $PostgresBin 'psql.exe') -X -v ON_ERROR_STOP=1 -c "CREATE DATABASE $databaseName"
  Assert-Exit 'Create isolated restore database'
  $env:PGDATABASE=$databaseName
  $restoreList = & (Join-Path $PostgresBin 'pg_restore.exe') --list $plainCopy
  Assert-Exit 'Read restore manifest'
  # template1 already supplies public; keep its ownership and restore all of its
  # objects without dropping the schema or ignoring any other restore errors.
  $restoreList | Where-Object { $_ -notmatch '^\d+; \d+ \d+ SCHEMA - public ' } | Set-Content -LiteralPath "$plainCopy.list" -Encoding utf8
  & (Join-Path $PostgresBin 'pg_restore.exe') --exit-on-error --no-owner --no-acl --use-list="$plainCopy.list" --dbname=$databaseName $plainCopy
  Assert-Exit 'Restore encrypted backup'
  # Export the restored data to verify that every COPY row survived the round trip.
  & (Join-Path $PostgresBin 'pg_dump.exe') --schema=public --format=custom --no-owner --no-acl --file=$restoredDump
  Assert-Exit 'Re-export restored database'
  & (Join-Path $PostgresBin 'pg_restore.exe') --data-only --file="$dumpPath.sql" $plainCopy
  Assert-Exit 'Read original backup data'
  & (Join-Path $PostgresBin 'pg_restore.exe') --data-only --file="$restoredDump.sql" $restoredDump
  Assert-Exit 'Read restored data'
  # Ignore tool-generated random \restrict markers and comments; compare COPY
  # contents and sequence states without publishing customer data in logs.
  function Canonical-Data([string]$path) {
    $copy = $false
    $rows = [Collections.Generic.List[string]]::new()
    $table = ''
    foreach ($line in [IO.File]::ReadLines($path)) {
      if ($line.StartsWith('COPY ')) { $table=$line; $copy=$true; $rows.Add($line); continue }
      if ($copy -and $line -eq '\.') { $copy=$false; continue }
      if ($copy) { $rows.Add("$table`t$line") }
      if ($line.StartsWith('SELECT pg_catalog.setval')) { $rows.Add($line) }
    }
    return ($rows | Sort-Object -CaseSensitive) -join "`n"
  }
  if ((Canonical-Data "$dumpPath.sql") -cne (Canonical-Data "$restoredDump.sql")) { throw 'Restored data differs from backup' }
  $proof = [ordered]@{
    checked_at=(Get-Date).ToUniversalTime().ToString('o'); scope='public schema only';
    encrypted_backup=[IO.Path]::GetFileName($encryptedPath);
    sha256=(Get-FileHash $encryptedPath).Hash; restore_branch='br-muddy-glade-bay09bbt';
    restore_database=$databaseName; all_copy_rows_and_sequences_match=$true;
    limitation='DPAPI requires the same Windows user/profile. Not off-device backup. Neon Auth identities are managed separately.'
  }
  $proof | ConvertTo-Json | Set-Content -LiteralPath "$encryptedPath.proof.json" -Encoding utf8
  Write-Output 'PASS encrypted public backup restored to isolated empty database; all table rows and sequence states match.'
  Write-Output "Encrypted backup: $encryptedPath"
} finally {
  foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
  foreach ($path in @($dumpPath,$plainCopy,$restoredDump,"$dumpPath.sql","$restoredDump.sql","$plainCopy.list")) {
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
  }
}
