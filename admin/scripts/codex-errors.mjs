// Only terminal Codex errors count; tool output and generated prose are not auth signals.
const tokenError=/refresh_token_(?:reused|expired|invalidated)|token_expired|invalid_grant|refresh token (?:has expired|was already used|has been revoked)|authentication token[^\n]*expired|(?:HTTP(?: status)?[: ]+|status[: ]+)?401\s+Unauthorized|not logged in|please (?:log in|sign in) (?:to|with) (?:ChatGPT|Codex)/i;
export function isAuthFailure(stdout,stderr=''){
 const messages=stdout.split('\n').flatMap(line=>{try{const event=JSON.parse(line);return event.type==='turn.failed'?[event.error?.message||'']:event.type==='error'?[event.message||event.error?.message||'']:[];}catch{return [];}});
 return messages.some(message=>tokenError.test(message))||stderr.split('\n').some(line=>/^(?:error:|ERROR\b|Error:)/.test(line.trim())&&tokenError.test(line));
}
