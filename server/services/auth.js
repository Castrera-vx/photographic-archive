import crypto from 'node:crypto';
import config from '../config.js';
import db from '../db/turso.js';
import {safeEqual,verifyPassword} from './password.js';
const sha=(t)=>crypto.createHash('sha256').update(t).digest('hex');
export function checkCredentials(user,password){const userOk=safeEqual(user,config.adminUser);const passOk=verifyPassword(password,config.adminPasswordHash);return userOk&&passOk;}
export async function createSession(){const token=crypto.randomBytes(32).toString('base64url'),csrf=crypto.randomBytes(24).toString('base64url');await db.execute({sql:'INSERT INTO sessions(id,csrf,expires_at) VALUES(?,?,?)',args:[sha(token),csrf,Date.now()+config.sessionHours*3600e3]});return {token,csrf};}
export async function getSession(token){if(!token)return null;const r=await db.execute({sql:'SELECT id,csrf,expires_at FROM sessions WHERE id=?',args:[sha(token)]});const row=r.rows[0];return row&&row.expires_at>Date.now()?row:null;}
export const destroySession=async(token)=>db.execute({sql:'DELETE FROM sessions WHERE id=?',args:[sha(token)]});
export const purgeExpired=async()=>db.execute({sql:'DELETE FROM sessions WHERE expires_at<?',args:[Date.now()]});
