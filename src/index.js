import * as d3 from 'd3';
import utils from './utils';
import tooltip from './tooltip';
import cities from './cities';

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
  } else if (mapType === 'turnout') {
    const darkBlue = '#003366';
    const lightBlue = '#ADD8E6';
    const color = d3.scaleLinear()
      .domain([50, 80])
      .range([lightBlue, darkBlue]);
    d3.selectAll('path')
      .attr('fill', (d) => {
        const turnout = Number.parseFloat(d.properties.results[0].TurnoutPercentageValue) * 100;
        return color(turnout);
      });
  } else if (mapType === 'majority') {
    const darkRed = '#8b0000';
    const lightRed = '#f08080';
    const color = d3.scaleLinear()
      .domain([20, 60])
      .range([lightRed, darkRed]);
    d3.selectAll('path')
      .attr('fill', (d) => {
        const majority = Number.parseFloat(d.properties.results.find(row => row.Elected === 'TRUE').MajorityPercentageValue) * 100;
        return color(majority);
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
    .duration(200)
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
            // Join the FeatureCollection's features array to path elements
            const map = svg.selectAll('path')
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
