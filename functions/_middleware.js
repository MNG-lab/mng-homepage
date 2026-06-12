export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === "www.dglab.yonsei.ac.kr") {
    url.hostname = "dglab.yonsei.ac.kr";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
