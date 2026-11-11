// Both environments are explicit allowlists; never accept an arbitrary branch or secret.
export const deployment = (env={}) => {
 const production=env.ADMIN_ENV==='production';
 if(env.ADMIN_ENV&&!['production','preview'].includes(env.ADMIN_ENV))throw Error('Unknown admin environment');
 return production
  ? {mode:'production',base:'main',ref:'main',label:'admin-request',marker:'<!-- mng-admin:v1 -->',prefix:'admin/issue-',title:'[Admin] ',runTitle:'Admin request #',secret:'CODEX_CLI_KEY',cache:'production:',credentialTable:'production_credential_state'}
  : {mode:'preview',base:'codex/admin-sandbox',ref:'codex/admin-portal',label:'admin-preview',marker:'<!-- mng-admin-preview:v1 -->',prefix:'admin-preview/issue-',title:'[Admin Preview] ',runTitle:'Admin preview #',secret:'CODEX_AUTH_JSON_PREVIEW',cache:'',credentialTable:'codex_credential_state'};
};
