import path from 'path';

export function buildLeadUploadFolderName(
  leadId: number | string,
  applicantName: string
): string {
  return `${leadId}-${applicantName.trim().replace(/\s+/g, '')}`
    .replace(/[^a-zA-Z0-9.\- ]/g, '')
    .trim();
}

export function getLeadUploadDiskDir(folderName: string): string {
  return path.join(process.cwd(), 'public', 'uploads', 'api_uploads', folderName);
}
