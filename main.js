const kickUrl = 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/kickstarter-funding-data.json';
const moviesUrl = 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/movie-data.json';
const vgUrl = 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/video-game-sales-data.json';

// SVG dimensions
const fullWidth = 800;
const fullHeight = 800;

const margin = { top: 110, right: 10, bottom: 150, left: 10 };
const width = fullWidth - margin.right - margin.left;
const height = fullHeight - margin.top - margin.bottom;

// Create SVG area
const svg = d3.select('body')
  .append('svg')
  .attr('class', 'map')
  .attr('width', fullWidth)
  .attr('height', fullHeight);

// Disable overflow on svg
svg.append('clipPath')
  .attr('id', 'clip-map')
  .append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', width)
  .attr('height', height);

// Set format
const format = d3.format(',d');

// Set treemap
const treemap = d3.treemap()
  .tile(d3.treemapResquarify)
  .size([width, height])
  .round(true)
  .paddingInner(1);

// Set default values
let value = 'Movies';
let url = moviesUrl;
let titleText = 'Movie Sales';
let descrText = 'Top 100 Highest Grossing Movies Grouped By Genre';

// Title
const title = svg.append('text')
  .attr('x', (fullWidth / 2))
  .attr('y', (margin.top / 2.5))
  .attr('id', 'title')
  .attr('text-anchor', 'middle')
  .style('font-size', 42)
  .text(titleText);

// Description
const descr = svg.append('text')
  .attr('x', (fullWidth / 2))
  .attr('y', (margin.top / 2.5) + 30)
  .attr('id', 'description')
  .attr('text-anchor', 'middle')
  .style('font-size', 18)
  .text(descrText);

// Set tooltip
const tooltip = d3.select('body')
  .append('div')
  .attr('id', 'tooltip')
  .style('opacity', 0);

const handleClick = (e) => {
  const newValue = e.target.innerHTML;

  if (newValue !== value) {
    value = newValue;
    switch (value) {
      case 'Kickstarter':
        url = kickUrl;
        titleText = 'Kickstarter Pledges';
        descrText = 'Top 100 Most Pledged Kickstarter Campaigns Grouped By Category';
        break;
      case 'Movies':
        url = moviesUrl;
        titleText = 'Movie Sales';
        descrText = 'Top 100 Highest Grossing Movies Grouped By Genre';
        break;
      case 'Video Games':
        url = vgUrl;
        titleText = 'Video Game Sales';
        descrText = 'Top 100 Most Sold Video Games Grouped by Platform';
        break;
      default:
        break;
    }

    title.text(titleText);
    descr.text(descrText);
    d3.selectAll('g').remove();
    fetchData(url);
  }
};

// Click listener
const links = document.getElementsByClassName('links');
for (let i = 0; i < links.length; i++) {
  links[i].addEventListener('click', handleClick);
}

// Initialize display
fetchData(url);

// Display treemap
const render = (data) => {
  const root = d3.hierarchy(data)
    .eachBefore(({ data, parent }) => (
      data.id = `${(parent ? `${parent.data.name}.` : '')}${data.name}`
    ))
    .sum(sumBySize)
    // Sort nodes by descending height and value
    .sort((a, b) => b.height - a.height || b.value - a.value);

  treemap(root);

  const categories = [];
  data.children.forEach(d => categories.push(d.id));

  const scaleColor = d3.scaleLinear()
    .domain([0, categories.length])
    .range([0, 1]);

  const color = colorValue => (
    d3.interpolateWarm(scaleColor(categories.indexOf(colorValue)).toFixed(2))
  );

  const tree = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('clip-path', 'url(#clip-map)');

  const tile = tree.selectAll('g')
    .data(root.leaves()) // array of nodes with no children
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x0}, ${d.y0})`);

  tile.append('rect')
    .attr('id', d => d.data.id)
    .attr('class', 'tile')
    .attr('data-name', d => d.data.name)
    .attr('data-category', d => d.data.category)
    .attr('data-value', d => d.data.value)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .style('fill', d => color(d.parent.data.id))
    .on('mouseover', (d) => {
      tooltip.attr('data-value', d.data.value);
      tooltip.transition()
        .duration(100)
        .style('opacity', 0.9);
      tooltip.html(`Name: ${d.data.name}<br>Category: ${d.data.category}<br>Value: ${format(d.data.value)}`)
        .style('left', `${d3.event.pageX + 5}px`)
        .style('top', `${d3.event.pageY - 5}px`);
    })
    .on('mouseout', (d) => {
      tooltip.transition()
        .duration(300)
        .style('opacity', 0);
    });

  tile.append('clipPath') // clipping to deal with overflow inside svg
    .attr('id', d => `clip-${d.data.id}`)
    .append('use')
    .attr('xlink:href', d => `#${d.data.id}`);

  tile.append('text')
    .attr('clip-path', d => `url(#clip-${d.data.id})`)
    .selectAll('tspan')
    .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g)) // split words
    .enter()
    .append('tspan')
    .attr('x', 4)
    .attr('y', (d, i) => 13 + (i * 10))
    .text(d => d);

  // Set legend
  const leg = svg.append('g')
    .attr('id', 'legend')
    .attr('transform', `translate(${fullWidth / 4}, ${fullHeight - margin.bottom + 20})`);

  leg.selectAll('rect')
    .data(categories)
    .enter()
    .append('rect')
    .attr('class', 'legend-item')
    .style('fill', d => color(d))
    .attr('x', (d, i) => posLegend(i, 'x'))
    .attr('y', (d, i) => posLegend(i, 'y'))
    .attr('width', 15)
    .attr('height', 15);

  leg.selectAll('text')
    .data(categories)
    .enter()
    .append('text')
    .attr('x', (d, i) => posLegend(i, 'x') + 20)
    .attr('y', (d, i) => posLegend(i, 'y') + 10)
    .attr('text-anchor', 'start')
    .style('font-size', 10)
    .text(d => d.split('.')[1]);
};

function sumBySize(d) {
  return d.value;
}

function posLegend(i, axis) {
  const col = 4;
  const xmove = parseInt(i % col, 10);
  const ymove = yPos(i, 0, col);

  return axis === 'x' ? xmove * 95 : ymove * 25;
}

function yPos(i, n, col) {
  return i < (col * n) ? n - 1 : yPos(i, n + 1, col);
}

function fetchData(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => render(data))
    .catch(error => console.log(error));
}
