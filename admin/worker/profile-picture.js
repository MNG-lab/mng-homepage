// Only a verified Google identity may supply this value; it is optional.
export function googleProfilePicture(value) {
 if(typeof value!=='string'||value.length>2048)return null;
 try {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  if(!['googleusercontent.com','ggpht.com'].some(host=>url.hostname.endsWith('.'+host)))return null;
  return url.href;
 }catch{return null;}
}
