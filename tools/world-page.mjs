export function worldPage(address) {
  const url = new URL(address);
  url.searchParams.set('view', '3d');
  return url.href;
}
