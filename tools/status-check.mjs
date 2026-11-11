import { onRequestGet } from '../functions/api/status.js';

const context = { waitUntil: () => {}, request: new Request('https://control.internal/api/status') };
const response = await onRequestGet(context);
const report = await response.json();

console.log(`checkedAt: ${report.checkedAt}`);
console.log(`summary: ${JSON.stringify(report.summary)}`);
console.log('');
for (const app of report.apps) {
  console.log(`APP   ${app.status.padEnd(12)} ${String(app.httpStatus).padEnd(4)} ${String(app.latencyMs ?? '').padEnd(6)} ${app.name}`);
}
console.log('');
for (const svc of report.services) {
  console.log(`SVC   ${svc.status.padEnd(12)} ${String(svc.httpStatus).padEnd(4)} ${String(svc.latencyMs ?? '').padEnd(6)} ${svc.name}`);
}
console.log('');
for (const repo of report.repos) {
  console.log(`REPO  ${repo.ok ? 'ok' : 'fail'} ${repo.repo} ${repo.sha || ''} ${repo.date || ''}`);
}

const failed = [...report.apps, ...report.services].filter((x) => x.status === 'down');
process.exitCode = failed.length ? 1 : 0;
