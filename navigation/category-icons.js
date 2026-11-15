// Minecraft-inspired inventory items: one distinct 16×16 sprite per category.
// Keep category identity independent of the scene and of editable category titles.
const PALETTE = {
  k:'#1d1d1f', w:'#fff8df', g:'#c6c6c6', G:'#6b6b6b',
  b:'#9c6b3f', B:'#5c3a1b', t:'#c89b62', y:'#f2c94c', Y:'#b8862a',
  r:'#d23c3c', R:'#8c2222', c:'#4fb3e0', C:'#2b6c9e',
  e:'#6aa84f', E:'#2f5b46', v:'#9d6bff', V:'#d9c3ff', a:'#57d6bd', A:'#247d78',
};

const SPRITES = {
  chest: [
    '................','................','..kkkkkkkkkkkk..','..kttttttttttk..',
    '..ktbbbbbbbbtk..','..ktbbbbbbbbtk..','..kkkkkkkkkkkk..','..kBBBBggBBBBk..',
    '..kbbbbgwbbbbk..','..ktbbbggbbbtk..','..ktbbbbbbbbtk..','..ktbbbbbbbbtk..',
    '..kttttttttttk..','..kkkkkkkkkkkk..','................','................',
  ],
  compass: [
    '................','......kkkk......','....kkggggkk....','...kggwwggggk...',
    '..kggwwkrkgggk..','..kgggkrrkgggk..','.kgggkrrrkggggk.', '.kgggkrrkgggggk.',
    '.kggggkkwgggggk.','.kggggkwwggggGk.','..kgggkwggggGk..','..kggggggggGGk..',
    '...kggggggGGk...','....kkGGGGkk....','......kkkk......','................',
  ],
  pearl: [
    '................','......kkkk......','....kkAAAAkk....','...kAaaaaaAAk...',
    '..kAawwaaaaAAk..','..kaawwaaaaAAk..','.kAaaaaaaaaAAAk.','.kAaaaaaaaAAAAk.',
    '.kAaaaaaaAAAAAk.','.kAAAAaaAAAAAAk.','..kAAAAAAAAAEk..','..kAAAAAAAAEEk..',
    '...kAAAEEEEEk...','....kkEEEEkk....','......kkkk......','................',
  ],
  repeater: [
    '................','................','....kk....kk....','....kr....kr....',
    '...krrk..krrk...','....kB....kB....','..kkkBkkkkkBkk..','..kwwwwwwwwwwk..',
    '..kwrrrrrrrrwk..','..kwwwwwwwwwwk..','..kggggggggggk..','...kGGGGGGGGk...',
    '....kkkkkkkk....','................','................','................',
  ],
  painting: [
    '................','.kkkkkkkkkkkkkk.','.kttttttttttttk.','.ktcccccccyyytk.',
    '.ktcccccccyyytk.','.ktcccccccccctk.','.ktcccccecccctk.','.ktccceeEeccctk.',
    '.ktcceeEEEecctk.','.ktceeEEEEEectk.','.kteEEEEEEEEetk.','.ktEEEEEEEEEEtk.',
    '.kttttttttttttk.','.kBBBBBBBBBBBBk.','.kkkkkkkkkkkkkk.','................',
  ],
  heart: [
    '................','................','...kkk...kkk....','..krrrk.krrrk...',
    '.krwwrrkrrrrrk..','.krwrrrrrrrrrk..','.krrrrrrrrrrrk..','..krrrrrrrrRk...',
    '...krrrrrrRk....','....krrrrRk.....','.....krrRk......','......kRk.......',
    '.......k........','................','................','................',
  ],
  command: [
    '................','..kkkkkkkkkkkk..','..kttttttttttk..','..ktBBBBBBBBtk..',
    '..ktBwwBBwwBtk..','..ktBwYBBYwBtk..','..ktBBBBBBBBtk..','..ktBBByyBBBtk..',
    '..ktBBByyBBBtk..','..ktBBBBBBBBtk..','..ktBwwBBwwBtk..','..ktBwYBBYwBtk..',
    '..ktBBBBBBBBtk..','..kttttttttttk..','..kkkkkkkkkkkk..','................',
  ],
  book: [
    '................','....kkkkkkkkk...','...krwwwwwwrk...','..krwwwwwwrk....',
    '.krrrrrrrrkGk...','.krRRRRRRRkwk...','.krRyyyyRRkwk...','.krRyYYyRRkwk...',
    '.krRyyyyRRkwk...','.krRRRRRRRkwk...','.krRRRRRRRkwk...','.krrrrrrrrkwk...',
    '..kkkkkkkkwwk...','...kggggggggk...','....kkkkkkkkk...','................',
  ],
  map: [
    '................','..kkkkkkkkkkkk..','..kwwwwwwwwwYk..','..kweewwcwwwYk..',
    '..kweEwwccwwYk..','..kwEEwwwcwwYk..','..kwwwwwwccwYk..','..kwwwwwwwcwYk..',
    '..kwwrrwEEwwYk..','..kwwwrwwEwwYk..','..kwwwwwwwwwYk..','..kYYYYYYYYYYk..',
    '..kkkkkkkkkkkk..','................','................','................',
  ],
  brush: [
    '................','..........kk....','.........kwwk...','........kwwgk...',
    '.......kwwgk....','......kccgk.....','.....kccCk......','.....kCCk.......',
    '....ktBk........','...ktBk.........','..ktBk..........','.ktBk...........',
    '.kBk............','..k.............','................','................',
  ],
  record: [
    '................','......kkkk......','....kkGGGGkk....','...kGGkkkkGGk...',
    '..kGGkkkkkkGGk..','..kGkkkyykkkGk..','.kGkkkywwykkkGk.','.kGkkkykkykkkGk.',
    '.kGkkkykkykkkGk.','.kGkkkYyyYkkkGk.','..kGkkkYYkkkGk..','..kGGkkkkkkGGk..',
    '...kGGkkkkGGk...','....kkGGGGkk....','......kkkk......','................',
  ],
  paper: [
    '................','...kkkkkkkkk....','...kwwwwwwwkk...','...kwwwwwwwgGk..',
    '...kwGGGwwwkkk..','...kwwwwwwwwwk..','...kwGGGGGGwwk..','...kwwwwwwwwwk..',
    '...kwGGGGwwwwk..','...kwwwwwwwwwk..','...kwGGGGGGwwk..','...kwwwwwwwwwk..',
    '...kgggggggggk..','...kkkkkkkkkkk..','................','................',
  ],
  lectern: [
    '................','...kkkkkkkkk....','..kbwwwwwwwbk...','.kbwwwwwwwwwbk..',
    '.kbbbbbbbbbbbk..','..kkkkkkkkkkk...','......ktBk......','......ktBk......',
    '......ktBk......','.....kttBBk.....','....kttttBBk....','...kttttttBBk...',
    '..kttttttttBBk..','..kkkkkkkkkkkk..','................','................',
  ],
  portal: [
    '................','...kkkkkkkkkk...','...kGGkkGGkkk...','...kGvvvvvvkk...',
    '...kkvVVvvvGk...','...kGvvvVvvkk...','...kkvvVvvvGk...','...kGvVvvvvkk...',
    '...kkvVvvvvGk...','...kGvvVVvvkk...','...kkvvvvVvGk...','...kGvvvvvvkk...',
    '...kkGGkkGGkk...','...kkkkkkkkkk...','................','................',
  ],
  pickaxe: [
    '................','....kkkkkkkk....','...kawaaaaaAk...','...kAAAkkkaAk...',
    '....kkkBkkAaAk..','......ktBkkaAk..','.....ktBk.kaAk..','....ktBk...kk...',
    '...ktBk.........','..ktBk..........','.ktBk...........', '.kBk............',
    '..k.............','................','................','................',
  ],
  key: [
    '................','....kkkk........','...kyyyyk.......','..kywkkYyk......',
    '..kyykkYyk......','...kyyyYk.......','....kYYk........','.....kYYk.......',
    '......kYYk......','.......kYYkk....','........kYYYk...','.........kYkk...',
    '..........kYk...','...........kk...','................','................',
  ],
  emerald: [
    '................','......kkkk......','.....kawwek.....','....kawwwEek....',
    '...kawwwEEeEk...','...kawwaEEeEk...','...kaaeeEEeEk...','...kaeeeEEeEk...',
    '...kaeeeEEeEk...','...kaeeeEEEEk...','....keeeEEEk....','.....keEEEk.....',
    '......kkkk......','................','................','................',
  ],
  campfire: [
    '................','.......k........','......kyk.......','......kyk.......',
    '....kkyyrk......','....kyyyrkk.....','...krywwyrk.....','...krywwyrk.....',
    '....kryyrk......','.....krrk.......','..kkktkkkttkk...','..ktttBBtttBk...',
    '...kkttttBkk....','..kttBBttttBk...','..kkkkkkkkkkk...','................',
  ],
  sapling: [
    '................','.....kk...kk....','....keeekkEek...','...keeaeeeeEek..',
    '...keeeeeEEEek..','....kEEEeeeEk...','...keeeEeEEk....','....kkEEBkk.....',
    '......ktBk......','....e.ktBk.e....','...keektBeeek...','....kektBEek....',
    '.....kttBBk.....','....kBBBBBBk....','....kkkkkkkk....','................',
  ],
};

const CATEGORY_ITEMS = {
  'common-sites':'compass', quickLinks:'pearl', 'bookmarks-f1':'chest',
  'bookmarks-f5':'repeater', 'bookmarks-f6':'painting', 'bookmarks-f8':'heart', ai:'command',
  books:'book', 'bookmarks-f4':'map', design:'brush', 'bookmarks-f3':'record',
  office:'lectern', 'software-news':'paper', network:'portal', software:'pickaxe', activation:'key',
  'bookmarks-f2':'emerald', 'bookmarks-f7':'campfire', charity:'sapling',
};
const cache = new Map();

export function categoryIcon(groupId) {
  const item = CATEGORY_ITEMS[groupId] || 'chest';
  if (cache.has(item)) return cache.get(item);
  const pixels = SPRITES[item].flatMap((row, y) => [...row].flatMap((color, x) =>
    PALETTE[color] ? [`<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[color]}"/>`] : []
  )).join('');
  const url = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">${pixels}</svg>`);
  cache.set(item, url);
  return url;
}
