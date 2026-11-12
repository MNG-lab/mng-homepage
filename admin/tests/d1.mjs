import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0001_requests.sql','0002_management.sql','0003_device_login.sql','0004_request_recovery.sql','0005_github_catalog.sql','0006_sessions.sql','0007_production.sql','0008_attachments.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 return {sqlite,async batch(statements){const results=[];for(const statement of statements)results.push(await statement.run());return results;},prepare(sql){let args=[];return {bind(...values){args=values;return this;},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};}};}};
}
