import * as d3 from 'd3';
import simplify from 'simplify-geojson';
import utils from './utils';
import tooltip from './tooltip';
import cities from './cities';
import mapUtils from './map.utils';

const geoJsonURL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/gb/wpc.json';
const padding = 5;
const width = document.getElementById('content').clientWidth - padding;
const height = document.getElementById('content').clientHeight - padding;
const white = '#fff';
let partyDetails;
let mapData;

const select = document.getElementById('map-type');
const citiesCheckbox = document.getElementById('cities-box');

citiesCheckbox.addEventListener('click', (e) => {
  const checkBox = e.target;
  const citiesGroup = document.querySelector('.cities');
  if (checkBox.checked) citiesGroup.classList.remove('hidden');
  if (!checkBox.checked) citiesGroup.classList.add('hidden');
});


select.addEventListener('change', (e) => {
  const mapType = e.target.options[e.target.selectedIndex].value;
  if (mapType === 'results') {
    mapUtils.displayResults(partyDetails);
  } else if (mapType === 'changed') {
    mapUtils.displayChangedConstituencies();
  } else if (mapType === 'gender') {
    mapUtils.displayGender();
  } else if (mapType === 'turnout') {
    mapUtils.displayTurnout(mapData);
  } else if (mapType === 'majority') {
    mapUtils.displayMajority(mapData);
  }
});

function handleMouseOver(d) {
  tooltip.div.transition()
    .duration(200)
    .style('opacity', 0.9);
  const winningRow = d.properties.results.find(row => row.Elected === 'TRUE');
  const winningCandidate = {
    constituency: winningRow.ConstituencyName,
    partyName: winningRow.CandidateParty,
    partyShortName: winningRow.PartyShortName,
    partyLogo: partyDetails.find(party => party.PartyShortName === winningRow.PartyShortName).logo,
    name: winningRow.CandidateDisplayName,
    gender: winningRow.CandidateGender,
    electionShare: winningRow.ShareValue,
    position: 'MP',
  };
  tooltip.displayCandidate(winningCandidate);
  tooltip.div
    .style('left', `${d3.event.pageX}px`)
    .style('top', `${d3.event.pageY - 28}px`);
}

function handleMouseOut() {
  tooltip.div.transition()
    .duration(200)
    .style('opacity', 0);
}

const svg = d3.select('#content')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .append('g')
  .attr('class', 'map-svg');

fetch(geoJsonURL)
  .then(response => response.json())
  .then((data) => {
    mapData = simplify(data, 0.001);
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
        d3.json('./data/parties.json')
          .then((res) => {
            partyDetails = res;
            // Join the FeatureCollection's features array to path elements
            const map = svg.selectAll('.map-svg path')
              .data(mapData.features);

            // Create path elements and update the d attribute using the geo generator
            map.enter()
              .append('path')
              .attr('d', geoGenerator)
              .attr('stroke', white)
              .attr('stroke-width', 0)
              .attr('class', 'constituency-map')
              .on('mouseover', handleMouseOver)
              .on('mouseout', handleMouseOut)
              .attr('fill', (d) => {
                const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
                return utils.getColor(winnigPartyCode, partyDetails);
              });

            // Add zoom and pan events
            function zoomed() {
              console.log('zooming');
              d3.selectAll('.map-svg').attr('transform', d3.event.transform);
            }

            function wheelDelta() {
              return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1) / 100;
            }
            const zoom = d3.zoom()
              .scaleExtent([1, 50])
              .extent([[0, 0], [width, height]])
              .translateExtent([[0, 0], [width, height]])
              .wheelDelta(wheelDelta)
              .on('zoom', zoomed);
            d3.selectAll('.map-svg').call(zoom);

            // Add cities to svg
            const citiesGroup = svg.append('g')
              .attr('class', 'cities hidden');
            citiesGroup.selectAll('circle')
              .data(cities).enter()
              .append('circle')
              .attr('cx', d => projection([d.long, d.lat])[0])
              .attr('cy', d => projection([d.long, d.lat])[1])
              .attr('r', '4px')
              .attr('fill', 'black')
              .attr('stroke', 'white')
              .attr('stroke-width', 2);
            citiesGroup.selectAll('text')
              .data(cities).enter()
              .append('text')
              .attr('x', d => projection([d.long, d.lat])[0] + 8)
              .attr('y', d => projection([d.long, d.lat])[1] + 4)
              .text(d => d.name)
              .attr('class', 'city-name');
          });
      });
  });
