import { backupDb } from '../server/jobs.js';
backupDb().then((f) => console.log('Backup creato:', f));
