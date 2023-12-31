import { SuffixTree } from './search.js';
import { load_async, load_vehicle, load_brick, load_simple, yieldingLoop } from './load.js';
import { tiles } from './tiles.js';

console.log('starting...');

let search_index = new SuffixTree();
let serch_input = document.querySelector(".search-text");
let serch_results = document.querySelector("#search-results");
let serch_category = document.querySelector("#search-category");
let search_count = 0;
serch_input.addEventListener('input', function (evt) {
  search_count++;
  let local_count = search_count;
  let text = this.value;
  let results;
  if (text != '') {
    let start = performance.now();
    results = search_index.search_all_words(text);
    let end = performance.now(); console.log(`seach ${local_count}: ${end - start} ms`);
  }
  // tried those 3 options, roughly equivallent in perf:
  // option 1: 160-200ms
  //serch_results.innerHTML = '';
  //for (let tile of results)
  //  serch_results.append(tile.cloneNode(true));
  // option 2: 200-210ms
  //serch_results.innerHTML = [...results].map((tile) => tile.outerHTML).join('');  // clear all children
  // option 3: 160-210ms
  //serch_results.replaceChildren(...[...results].map((tile) => tile.cloneNode(true)));
  //
  // however, the true answer is to force a rerender mid-loop by defering
  // the loop content in a setTimeout call! here we go:
  serch_results.replaceChildren([]);
  if (text != '') {
    yieldingLoop(results.length, 32, 256, function (i) {
      if (local_count == search_count)
        serch_results.append(results[i].cloneNode(true));
    }, function () {
      //  ...add next things here
    }, `display ${local_count}`);
  }
})

// help refresh and back navigation scroll restoration until loaded [1]
document.getElementById('main').style.height = '270000px';

// fetch all data from the begining...
Promise.all([
  fetch("data/vehicles_by_id.json")
    .then(response => response.json())
    .then(vehicles => load_async(v(vehicles), load_and_index_vehicle, "vehicles")),
  fetch("data/bricks_by_id.json")
    .then(response => response.json())
])
// ...but only start loading bricks when the vehicles are done,
// to preserve search results order, and load vehicles quicker.
.then(([_, bricks]) => Promise.all([
  load_async(v(bricks), load_and_index_brick, "bricks"),
  fetch("data/brickpacks_by_id.json")
    .then(response => response.json())
]))
.then(([_, brickpacks]) => Promise.all([
  load_async(v(brickpacks), load_and_index_simple, "brickpacks"),
  fetch("data/flairs_by_id.json")
    .then(response => response.json())
]))
.then(([_, flairs]) => Promise.all([
  load_async(v(flairs), load_and_index_simple, "flairs"),
]))
// [1] restore proper page height
.then(() => {
  console.log('restoring page height')
  document.getElementById('main').style.height = '';
});

function load_and_index_vehicle(data, tiles) {
  let tile = load_vehicle(data, tiles);
  search_index.add(data.name, tile);
  //search_index.add(data.id, tile);
  if (data.perk != null) {
    search_index.add(data.perk, tile);
  }
}

function load_and_index_brick(data, tiles) {
  let tile = load_brick(data, tiles);
  search_index.add(data.name, tile);
  search_index.add(data.id.toString(), tile);
  search_index.add(data.size.join('x'), tile);
}

function load_and_index_simple(data, tiles) {
  let tile = load_simple(data, tiles)
  search_index.add(data.name, tile);
}

function v(object) {
  return Object.values(object);
}