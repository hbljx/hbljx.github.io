// AI-generated pastel voxel collectibles; unknown categories use the treasure chest.
const CATEGORY_ITEMS = {
  'common-sites':'compass', quickLinks:'pearl', 'bookmarks-f1':'chest',
  'bookmarks-f5':'repeater', 'bookmarks-f6':'painting', 'bookmarks-f8':'heart', ai:'command',
  books:'book', 'bookmarks-f4':'map', design:'brush', 'bookmarks-f3':'record',
  office:'lectern', 'software-news':'paper', network:'portal', software:'pickaxe', activation:'key',
  'bookmarks-f2':'emerald', 'bookmarks-f7':'campfire', charity:'sapling',
};

export function categoryIcon(groupId) {
  const item = CATEGORY_ITEMS[groupId] || 'chest';
  return 'assets/bookmark-icons/' + item + '.webp';
}
