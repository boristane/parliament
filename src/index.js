import * as d3 from 'd3';
import simplify from 'simplify-geojson';
import utils from './utils';
import tooltip from './tooltip';
import cities from './cities';
import mapUtils from './map.utils';
import details from './details';
import changeTitle from './title';

const geoJsonGBURL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/gb/wpc.json';
const geoJsonNIURL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/ni/wpc.json';
const width = document.getElementById('content').clientWidth;
const height = document.getElementById('content').clientHeight;
const mapOffsetRight = -document.querySelector('.user-input').clientWidth / 2;
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
  document.querySelectorAll('.details .section').forEach(elt => elt.classList.add('none'));
  if (mapType === 'results') {
    mapUtils.displayResults(partyDetails);
    details.displayNationalResults(mapData, partyDetails);
  } else if (mapType === 'changed') {
    mapUtils.displayChangedConstituencies();
    details.displayNationalChanged(mapData, partyDetails);
  } else if (mapType === 'gender') {
    mapUtils.displayGender();
    details.displayNationalGender(mapData, partyDetails);
  } else if (mapType === 'turnout') {
    mapUtils.displayTurnout(mapData);
    details.displayNationalTurnout(mapData);
  } else if (mapType === 'majority') {
    mapUtils.displayMajority(mapData);
    details.displayNationalMajority(mapData);
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
  const e = d3.event;
  tooltip.show();
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

  setTimeout(() => {
    tooltip.displayConstituency(winningCandidate);
    tooltip.displayCandidate(winningCandidate);
    const mapType = selectMapType.options[selectMapType.selectedIndex].value;
    document.querySelectorAll('.tooltip .section').forEach(elt => elt.classList.add('none'));
    const constituencyRows = d.properties.results
      .filter(row => row.ConstituencyName === winningRow.ConstituencyName);
    const candidates = constituencyRows.map((elt) => {
      const party = partyDetails.find(el => el.PartyShortName === elt.PartyShortName);
      const color = party ? party.color : 'lightgray';
      return {
        name: elt.CandidateDisplayName,
        share: elt.ShareValue,
        partyShortName: elt.PartyShortName,
        color,
      };
    });

    if (mapType === 'results') {
      tooltip.displayConstituencyResults(candidates, partyDetails);
    }
    if (mapType === 'changed') {
      tooltip.displayChanged(partyDetails, winningRow.ResultHoldGain);
    } else if (mapType === 'gender') {
      const genders = constituencyRows.map(row => row.CandidateGender);
      tooltip.displayGender(genders);
    } else if (mapType === 'turnout') {
      const turnout = winningRow.TurnoutPercentageValue;
      const electorate = winningRow.Electorate;
      tooltip.displayTurnout(turnout, electorate);
    } else if (mapType === 'majority') {
      tooltip.displayConstituencyResults(candidates, partyDetails);
    }
    tooltip.move(e);
  }, 200);
}

function handleMouseOut() {
  tooltip.hide();
}

function reset() {
  active.classed('active', false);
  active = d3.select(null);

  d3.select('.main-svg').transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity.translate(mapOffsetRight, 0));
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

function zoomIn() {
  const scale = 3;
  return d3.select('.main-svg').transition()
    .duration(750)
    .call(zoom.scaleBy, scale);
}

function zoomOut() {
  const scale = 1 / 3;
  return d3.select('.main-svg').transition()
    .duration(750)
    .call(zoom.scaleBy, scale);
}

function zoomOn(constituency) {
  const d = mapData.features
    .find(p => p.properties.results[0].ConstituencyName === constituency);
  clicked(d);
  d3.selectAll('.constituency-map').classed('active', false);
  d3.select(`.constituency-map.${constituency.split(' ').join('_')}`).classed('active', true);
}

// Postcode search
const postcodeForm = document.getElementById('postcode');
function handlePostcode(e) {
  e.preventDefault();
  const postcode = this.postcode.value.split(' ').join('');
  fetch(`https://api.postcodes.io/postcodes/${postcode}`)
    .then(response => response.json())
    .then((postcodeData) => {
      if (postcodeData.status !== 200) return;
      const postcodeConstituency = postcodeData.result.parliamentary_constituency;
      zoomOn(postcodeConstituency);
    });
}
postcodeForm.addEventListener('submit', handlePostcode);

// Zoom on min and max properties
document.getElementById('turnout-min').addEventListener('click', (e) => {
  let constituency = e.target.textContent.split('(')[0];
  constituency = constituency.slice(0, constituency.length - 1);
  zoomOn(constituency);
});

document.getElementById('turnout-max').addEventListener('click', (e) => {
  let constituency = e.target.textContent.split('(')[0];
  constituency = constituency.slice(0, constituency.length - 1);
  zoomOn(constituency);
});

document.getElementById('majority-min').addEventListener('click', (e) => {
  let constituency = e.target.textContent.split('(')[0];
  constituency = constituency.slice(0, constituency.length - 1);
  zoomOn(constituency);
});

document.getElementById('majority-max').addEventListener('click', (e) => {
  let constituency = e.target.textContent.split('(')[0];
  constituency = constituency.slice(0, constituency.length - 1);
  zoomOn(constituency);
});

fetch(geoJsonGBURL)
  .then(response => response.json())
  .then((data) => {
    fetch(geoJsonNIURL)
      .then(response => response.json())
      .then((niData) => {
        niData.features.forEach((feature) => {
          data.features.push(feature);
        });
        mapData = simplify(data, 0.001);
        const projection = d3.geoMercator();
        projection.fitSize([width, height], mapData);
        geoGenerator = d3.geoPath()
          .projection(projection);

        d3.csv('./data/Current-Parliament-Election-Results.csv')
          .then((resultsData) => {
            mapData.features.forEach((constituency) => {
              const id = constituency.properties.PCON13CD || constituency.properties.PC_ID;
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
                  .attr('class', d => `${d.properties.results[0].ConstituencyName.split(' ').join('_')} constituency-map`)
                  .on('mouseover', handleMouseOver)
                  .on('mouseout', handleMouseOut)
                  .on('click', clicked)
                  .attr('fill', (d) => {
                    const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
                    return utils.getColor(winnigPartyCode, partyDetails);
                  });
                // Display the national results in the details box
                details.displayNationalResults(mapData, partyDetails);
                changeTitle('Results');

                // Add zoom and pan events
                function zoomed() {
                  d3.select('.map-svg').attr('transform', d3.event.transform);
                }
                zoom = d3.zoom()
                  .scaleExtent([1, 50])
                  .extent([[0, 0], [width, height]])
                  // .translateExtent([[0, 0], [width, height]])
                  .on('zoom', zoomed);
                d3.select('.main-svg').call(zoom);
                document.getElementById('zoom-in').addEventListener('click', zoomIn);
                document.getElementById('zoom-out').addEventListener('click', zoomOut);
                document.getElementById('reset-zoom').addEventListener('click', reset);
                d3.select('.main-svg')
                  .call(zoom.transform, d3.zoomIdentity.translate(mapOffsetRight, 0));

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
  });
