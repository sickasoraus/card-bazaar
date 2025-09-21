# Export Deployment Plan to DOCX

Use either Microsoft Word (automatic) or Pandoc (fallback) to convert the RTF into a .docx file.

## Quick Command
- Windows PowerShell (from repo root):
  - `npm run export:docx`
- Output file: `docs/Deployment_Plan_2025-09-14.docx`

## What the script does
- Tries Microsoft Word via COM automation first.
- If Word is not installed, tries `pandoc` if available.
- Writes the .docx next to the RTF.

## Manual Alternatives
- Open `docs/Deployment_Plan_2025-09-14.rtf` in Word and “Save As” `.docx`.
- Or install Pandoc and run:
  - `pandoc docs/Deployment_Plan_2025-09-14.rtf -o docs/Deployment_Plan_2025-09-14.docx`

## Troubleshooting
- “Neither Microsoft Word nor pandoc is available”:
  - Install Word, or
  - Install Pandoc: https://pandoc.org/installing.html
- “Access denied” writing the output: close the docx in Word and re-run.
