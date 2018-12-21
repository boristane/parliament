import * as d3 from 'd3';
import utils from './utils';
import tooltip from './tooltip';

const geoJsonURL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/gb/wpc.json';
const padding = 40;
const width = window.innerWidth - padding;
const height = window.innerHeight - padding;
const gold = '#FFDF00';
const white = '#fff';
const grey = '#C0C0C0';
const purple = '#551A8B';
const blue = '#ADD8E6';
let partyDetails;

const select = document.getElementById('map-type');

select.addEventListener('change', (e) => {
  const mapType = e.target.options[e.target.selectedIndex].value;
  if (mapType === 'results') {
    d3.selectAll('path')
      .attr('fill', (d) => {
        const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
        return utils.getColor(winnigPartyCode, partyDetails);
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
        return female ? purple : blue;
      });
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
  };
  tooltip.displayCandidate(winningCandidate);
  tooltip.div
    .style('left', `${d3.event.pageX}px`)
    .style('top', `${d3.event.pageY - 28}px`);
}

function handleMouseOut() {
  tooltip.div.transition()
    .duration(500)
    .style('opacity', 0);
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
        d3.json('./data/parties.json')
          .then((res) => {
            partyDetails = res;
            const lat = 51.509865;
            const long = -0.118092;
            // Join the FeatureCollection's features array to path elements
            const map = svg.selectAll('path')
              .data(mapData.features);

            // Create path elements and update the d attribute using the geo generator
            map.enter()
              .append('path')
              .attr('d', geoGenerator)
              .attr('stroke', white)
              .attr('stroke-width', 0)
              .attr('class', 'constituency')
              .on('mouseover', handleMouseOver)
              .on('mouseout', handleMouseOut)
              .attr('fill', (d) => {
                const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
                return utils.getColor(winnigPartyCode, partyDetails);
              });

            // add circles to svg
            svg.selectAll('circle')
              .data([[long, lat]]).enter()
              .append('circle')
              .attr('cx', d => projection(d)[0])
              .attr('cy', d => projection(d)[1])
              .attr('r', '4px')
              .attr('fill', 'black')
              .attr('stroke', 'white')
              .attr('stroke-width', 2);
            svg.selectAll('text')
              .data([[long, lat]]).enter()
              .append('text')
              .attr('x', d => projection(d)[0] + 8)
              .attr('y', d => projection(d)[1] + 4)
              .text('London')
              .attr('class', 'city-name');
          });
      });
  });
