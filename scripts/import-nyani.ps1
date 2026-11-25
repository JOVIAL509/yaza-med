param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'client\public\nyani'
$zipFullPath = (Resolve-Path -LiteralPath $ZipPath).Path
$subjectNames = @{
  BIO = 'Biology'
  CHEMISTRY = 'Chemistry'
  ICT = 'ICT'
  LAUNGAUGE = 'Language'
  LANGUAGE = 'Language'
  MATHEMATICS = 'Mathematics'
  PHYSICS = 'Physics'
}

function ConvertTo-SafeFilePart([string]$value) {
  $extension = [IO.Path]::GetExtension($value).ToLowerInvariant()
  $name = [IO.Path]::GetFileNameWithoutExtension($value).ToLowerInvariant()
  $name = $name -replace '[^a-z0-9]+', '-'
  $name = $name.Trim('-')
  if (-not $name) { $name = 'file' }
  return "$name$extension"
}

# Replace the generated library contents on each import so removed source files
# do not remain visible in the manifest or the deployed site.
if (Test-Path -LiteralPath $destination) {
  Get-ChildItem -LiteralPath $destination -Force | Remove-Item -Recurse -Force
} else {
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
}

$archive = [IO.Compression.ZipFile]::OpenRead($zipFullPath)
$records = [Collections.Generic.List[object]]::new()
$usedPaths = @{}
try {
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    $parts = $entry.FullName -split '/'
    # Accept both "Subject/Term/File" and "ArchiveName/Subject/Term/File".
    $subjectIndex = -1
    for ($i = 0; $i -lt ($parts.Count - 2); $i++) {
      if ($subjectNames.ContainsKey($parts[$i].ToUpperInvariant()) -and $parts[$i + 1].ToUpperInvariant() -in @('MIDSEM', 'ENDSEM')) {
        $subjectIndex = $i
        break
      }
    }
    if ($subjectIndex -lt 0) { continue }

    $subject = $subjectNames[$parts[$subjectIndex].ToUpperInvariant()]
    $semester = $parts[$subjectIndex + 1].ToUpperInvariant()
    $fileParts = @($subject, $semester)
    for ($i = $subjectIndex + 2; $i -lt $parts.Count; $i++) {
      $fileParts += ConvertTo-SafeFilePart $parts[$i]
    }
    $relativePath = $fileParts -join '/'
    if ($usedPaths.ContainsKey($relativePath.ToLowerInvariant())) {
      $stem = [IO.Path]::GetFileNameWithoutExtension($fileParts[-1])
      $extension = [IO.Path]::GetExtension($fileParts[-1])
      $fileParts[-1] = "$stem-$($records.Count + 1)$extension"
      $relativePath = $fileParts -join '/'
    }
    $usedPaths[$relativePath.ToLowerInvariant()] = $true

    $targetPath = Join-Path $destination ($relativePath -replace '/', '\')
    New-Item -ItemType Directory -Path (Split-Path -Parent $targetPath) -Force | Out-Null
    $entryStream = $entry.Open()
    $fileStream = [IO.File]::Create($targetPath)
    try { $entryStream.CopyTo($fileStream) }
    finally { $entryStream.Dispose(); $fileStream.Dispose() }

    $extension = [IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
    $type = if ($extension -in @('.jpg', '.jpeg', '.png', '.webp', '.gif')) { 'image' }
      elseif ($extension -eq '.pdf') { 'pdf' }
      else { 'office' }
    $records.Add([ordered]@{
      id = $records.Count + 1
      subject = $subject
      semester = $semester
      title = [IO.Path]::GetFileNameWithoutExtension($entry.Name)
      originalName = $entry.Name
      path = "/nyani/$relativePath"
      type = $type
      extension = $extension
      bytes = $entry.Length
    })
  }
} finally {
  $archive.Dispose()
}

$json = ConvertTo-Json -InputObject @($records) -Depth 5
[IO.File]::WriteAllText((Join-Path $destination 'manifest.json'), $json, [Text.UTF8Encoding]::new($false))
Write-Host "Imported $($records.Count) Nyani files into $destination"
