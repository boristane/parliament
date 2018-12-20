import * as d3 from 'd3';
import utils from './utils';

const geoJsonURL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/gb/wpc.json';
const width = 1200;
const height = 1200;

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
          .then((colors) => {
            // Join the FeatureCollection's features array to path elements
            const u = svg.selectAll('path')
              .data(mapData.features);

            // Create path elements and update the d attribute using the geo generator
            u.enter()
              .append('path')
              .attr('d', geoGenerator)
              .attr('fill', (d) => {
                const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
                console.log(winnigPartyCode);
                return utils.getColor(winnigPartyCode, colors);
              })
              .attr('stroke', '#fff')
              .attr('stoke-width', 1);
          });
      });
  });
