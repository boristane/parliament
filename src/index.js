import * as d3 from 'd3';
import utils from './utils';

const geoJsonURL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/gb/wpc.json';
const width = 1200;
const height = 1200;
let map;
const gold = '#FFDF00';
const white = '#fff';
const grey = '#C0C0C0';
const purple = '#551A8B';
const blue = '#ADD8E6';
let partyColors;

const select = document.getElementById('map-type');

select.addEventListener('change', (e) => {
  const mapType = e.target.options[e.target.selectedIndex].value;
  if (mapType === 'results') {
    d3.selectAll('path')
      .attr('fill', (d) => {
        const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
        return utils.getColor(winnigPartyCode, partyColors);
      });
  } else if (mapType === 'changed') {
    d3.selectAll('path')
      .attr('fill', (d) => {
        const hold = d.properties.results[0].ResultHoldGain.split(' ').includes('hold');
        return hold ? grey : gold;
      });
  } else if (mapType === 'gender') {
    d3.selectAll('path')
      .attr('fill', (d) => {
        const female = d.properties.results.find(row => row.Elected === 'TRUE').CandidateGender === 'Female';
        console.log(female);
        return female ? purple : blue;
      });
  }
});

function handleMouseEnter(d) {
  d3.select(this)
    .style('cursor', 'pointer')
    .attr('stroke-width', 2);
}

function handleMouseLeave(d) {
  d3.select(this)
    .style('cursor', 'default')
    .attr('stroke-width', 0);
}

const svg = d3.select('#content')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .append('g')
  .classed('map', true);

fetch(geoJsonURL)
  .then(response => response.json())
  .then((mapData) => {
    const projection = d3.geoMercator();
    projection.fitSize([width, height], mapData);
    const geoGenerator = d3.geoPath()
      .projection(projection);

    d3.csv('./data/Current-Parliament-Election-Results.csv')
      .then((resultsData) => {
        mapData.features.forEach((constituency) => {
          const id = constituency.properties.PCON13CD;
          const constituencyResults = resultsData.filter(data => data.ONSconstID === id);
          constituency.properties.results = constituencyResults;
        });
        d3.json('./data/colors.json')
          .then((res) => {
            partyColors = res;
            // Join the FeatureCollection's features array to path elements
            map = svg.selectAll('path')
              .data(mapData.features);

            // Create path elements and update the d attribute using the geo generator
            map.enter()
              .append('path')
              .attr('d', geoGenerator)
              .attr('stroke', white)
              .attr('stroke-width', 0)
              .on('mouseenter', handleMouseEnter)
              .on('mouseleave', handleMouseLeave)
              .attr('fill', (d) => {
                const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
                return utils.getColor(winnigPartyCode, partyColors);
              });
          });
      });
  });
