export function createOfficeViewerUrl(fileUrl) {
  const viewer = new URL('https://view.officeapps.live.com/op/view.aspx');
  viewer.searchParams.set('src', fileUrl);
  return viewer.toString();
}
