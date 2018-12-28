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
let geoGenerator;
let zoom;
let active = d3.select(null);

const selectMapType = document.getElementById('map-type');
const selectParty = document.getElementById('select-party');
const citiesCheckbox = document.getElementById('cities-box');

const svg = d3.select('#content')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('class', 'main-svg')
  .append('g')
  .attr('class', 'map-svg');

citiesCheckbox.addEventListener('click', (e) => {
  const checkBox = e.target;
  const citiesGroup = document.querySelector('.cities');
  if (checkBox.checked) citiesGroup.classList.remove('hidden');
  if (!checkBox.checked) citiesGroup.classList.add('hidden');
});

selectMapType.addEventListener('change', (e) => {
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
  } else if (mapType === 'share') {
    const userSelectedParty = selectParty[selectParty.selectedIndex].value;
    mapUtils.displayPartyShare(mapData, partyDetails, userSelectedParty);
  }
});

selectParty.addEventListener('change', (e) => {
  const party = e.target.options[e.target.selectedIndex].value;
  const mapType = selectMapType.options[selectMapType.selectedIndex].value;
  if (mapType === 'share') mapUtils.displayPartyShare(mapData, partyDetails, party);
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
  tooltip.div
    .style('left', `${d3.event.pageX}px`)
    .style('top', `${d3.event.pageY - 28}px`);

  setTimeout(() => {
    tooltip.displayConstituency(winningCandidate);
    tooltip.displayCandidate(winningCandidate);
    const mapType = selectMapType.options[selectMapType.selectedIndex].value;
    document.querySelectorAll('.tooltip .section').forEach(elt => elt.classList.add('none'));
    if (mapType === 'changed') {
      tooltip.displayChanged(partyDetails, winningRow.ResultHoldGain);
    } else if (mapType === 'gender') {
      const constituencyRows = d.properties.results
        .filter(row => row.ConstituencyName === winningRow.ConstituencyName);
      const genders = constituencyRows.map(row => row.CandidateGender);
      tooltip.displayGender(genders);
    }
  }, 200);
}

function handleMouseOut() {
  tooltip.div.transition()
    .duration(200)
    .style('opacity', 0);
}

function reset() {
  active.classed('active', false);
  active = d3.select(null);

  d3.select('.main-svg').transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
}

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed('active', false);
  active = d3.select(this).classed('active', true);

  const maxZoom = 20;
  const bounds = geoGenerator.bounds(d);
  const dx = bounds[1][0] - bounds[0][0];
  const dy = bounds[1][1] - bounds[0][1];
  const x = (bounds[0][0] + bounds[1][0]) / 2;
  const y = (bounds[0][1] + bounds[1][1]) / 2;
  const scale = Math.max(1, Math.min(maxZoom, 0.9 / Math.max(dx / width, dy / height)));
  const translate = [width / 2 - scale * x, height / 2 - scale * y];

  return d3.select('.main-svg').transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
}

fetch(geoJsonURL)
  .then(response => response.json())
  .then((data) => {
    mapData = simplify(data, 0.001);
    const projection = d3.geoMercator();
    projection.fitSize([width, height], mapData);
    geoGenerator = d3.geoPath()
      .projection(projection);

    d3.csv('./data/Current-Parliament-Election-Results.csv')
      .then((resultsData) => {
        mapData.features.forEach((constituency) => {
          const id = constituency.properties.PCON13CD;
          const constituencyResults = resultsData.filter(d => d.ONSconstID === id);
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
              .on('click', clicked)
              .attr('fill', (d) => {
                const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
                return utils.getColor(winnigPartyCode, partyDetails);
              });

            // Add zoom and pan events
            function zoomed() {
              d3.select('.map-svg').attr('transform', d3.event.transform);
            }
            zoom = d3.zoom()
              .scaleExtent([1, 50])
              .extent([[0, 0], [width, height]])
              .translateExtent([[0, 0], [width, height]])
              .on('zoom', zoomed);
            d3.select('.main-svg').call(zoom);

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
