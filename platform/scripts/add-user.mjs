// Create or reset a login from the terminal. The password is typed hidden and only its hash leaves this machine.
//   npm run user:add -- --email you@example.com                     (admin, local database)
//   npm run user:add -- --email you@example.com --remote            (admin, live database)
//   npm run user:add -- --email owner@shop.ph --role owner --business 3 --remote
import { execFileSync } from 'node:child_process';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { hashPassword, passwordProblem } from '../src/lib.js';

const { values: a } = parseArgs({ options: { email: { type: 'string' }, role: { type: 'string', default: 'admin' }, business: { type: 'string' }, name: { type: 'string' }, remote: { type: 'boolean' } } });
const email = String(a.email || '').trim().toLowerCase();
if (!/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(email)) throw new Error('Pass a valid --email');
if (!['admin', 'owner'].includes(a.role)) throw new Error('--role must be admin or owner');
const business = a.role === 'owner' ? Number.parseInt(a.business, 10) : null;
if (a.role === 'owner' && !(business > 0)) throw new Error('Owners need --business <id> (the number in /admin/b/<id>)');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let muted = false;
  rl._writeToOutput = s => { if (!muted) rl.output.write(s); };
  return new Promise(resolve => { rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer); }); muted = true; });
}

const password = process.env.TF_PASSWORD || await ask(`Password for ${email} (hidden): `);
const problem = passwordProblem(password);
if (problem) throw new Error(problem);
if (!process.env.TF_PASSWORD && password !== await ask('Repeat password: ')) throw new Error('Passwords do not match');

const hash = await hashPassword(password); // base64 + '$' only, safe inside a SQL string
const q = s => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const sql = `INSERT INTO users (email, name, password_hash, role, business_id) VALUES (${q(email)}, ${q(a.name)}, ${q(hash)}, ${q(a.role)}, ${business ?? 'NULL'})
  ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, business_id = excluded.business_id, failed_logins = 0, locked_until = NULL;
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${q(email)});`;
execFileSync('npx', ['wrangler', 'd1', 'execute', 'tapfour', a.remote ? '--remote' : '--local', '--command', sql], { stdio: 'inherit' });
const path = a.role === 'admin' ? '/admin' : '/app';
console.log(`\n✓ ${a.role} login ready for ${email} (${a.remote ? 'live' : 'local'} database).`);
console.log(`  Log in at ${a.remote ? `https://tapfour-platform.chesterlsc.workers.dev${path}  (${a.role === "admin" ? "admin" : "dashboard"}.tap4.ph${path} once DNS is live)` : `http://localhost:8787${path}`}`);
