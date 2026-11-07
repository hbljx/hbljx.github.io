export default {
  name: 'Li+', skin: '', languages: ['zh'], weather: {geolocate:true},
  dock: ['blog', 'about', 'works', 'writing', 'coffee', 'lab', 'court', 'pool'],
  start: {weather:'auto', time:'auto'},
  portal: {directory: [new URL('./navigation/portal-worlds.json', import.meta.url).href]},
  mailbox: {endpoint:'', email:'', turnstileSitekey:''}, badge:true,
};
