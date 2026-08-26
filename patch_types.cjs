const fs = require('fs');
const file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');

const t1 = `export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';`;
const r1 = `export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ProvisioningSource = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SELF_SIGNUP';`;

const t2 = `export interface UserSession {`;
const r2 = `export interface UserSession {
  provisioningSource?: ProvisioningSource;`;

const t3 = `export interface ApprovalRequestRecord {`;
const r3 = `export interface ApprovalRequestRecord {
  provisioningSource?: ProvisioningSource;`;

code = code.replace(t1, r1);
code = code.replace(t2, r2);
code = code.replace(t3, r3);

fs.writeFileSync(file, code);
