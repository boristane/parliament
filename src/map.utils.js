import * as d3 from 'd3';
import d3Legend from 'd3-svg-legend';
import utils from './utils';

function ordinalLegend(labels, colors) {
  const ordinal = d3.scaleOrdinal()
    .domain(labels)
    .range(colors);
  const svg = d3.select('svg');
  d3.select('.map-legend').remove();
  svg.append('g')
    .attr('class', 'map-legend')
    .attr('transform', 'translate(20,20)')
    .style('opacity', 0);
  const legendOrdinal = d3Legend.legendColor()
    .shape('path', d3.symbol().type(d3.symbolSquare).size(400)())
    .shapePadding(3)
    .shapeWidth(30)
    .scale(ordinal);
  svg.select('.map-legend')
    .call(legendOrdinal);
  d3.select('.map-legend')
    .transition()
    .duration(200)
    .style('opacity', 1);
}

function linearLegend(width, colors) {
  const numCells = (width[1] - width[0]) / 5;
  const linear = d3.scaleLinear()
    .domain(width)
    .range(colors);
  const svg = d3.select('svg');
  d3.select('.map-legend').remove();
  svg.append('g')
    .attr('class', 'map-legend')
    .attr('transform', 'translate(20,20)')
    .style('opacity', 0);
  const legendLinear = d3Legend.legendColor()
    .shapeWidth(30)
    .shapePadding(3)
    .cells(numCells)
    .orient('vertical')
    .ascending(true)
    .labelFormat(d3.format('.0%'))
    .scale(linear);
  svg.select('.map-legend')
    .call(legendLinear);
  d3.select('.map-legend')
    .transition()
    .duration(200)
    .style('opacity', 1);
}

function displayResults(partyDetails) {
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
      return utils.getColor(winnigPartyCode, partyDetails);
    });
  d3.select('.map-legend').remove();
}

function displayChangedConstituencies() {
  const gold = '#FFDF00';
  const grey = '#C0C0C0';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const hold = d.properties.results[0].ResultHoldGain.split(' ').includes('hold');
      return hold ? grey : gold;
    });
  ordinalLegend(['Gain', 'Hold'], [gold, grey]);
}

function displayGender() {
  const purple = '#551A8B';
  const blue = '#ADD8E6';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const female = d.properties.results.find(row => row.Elected === 'TRUE').CandidateGender === 'Female';
      return female ? purple : blue;
    });
  ordinalLegend(['Female', 'Male'], [purple, blue]);
}

function displayTurnout(mapData) {
  const darkBlue = '#003366';
  const lightBlue = '#ADD8E6';
  const turnoutData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results[0].TurnoutPercentageValue);
    return majority;
  });
  const min = mapData.features.find((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results[0].TurnoutPercentageValue);
    if (majority === d3.min(turnoutData)) return true;
    return false;
  });
  const max = mapData.features.find((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results[0].TurnoutPercentageValue);
    if (majority === d3.max(turnoutData)) return true;
    return false;
  });
  console.log('turnout');
  console.log(min);
  console.log(max);
  const minValue = utils.floorToNext5Percent(d3.min(turnoutData));
  const maxValue = utils.ceilToNext5Percent(d3.max(turnoutData));
  const color = d3.scaleLinear()
    .domain([minValue, maxValue])
    .range([lightBlue, darkBlue]);
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const turnout = Number.parseFloat(d.properties.results[0].TurnoutPercentageValue);
      return color(turnout);
    });
  linearLegend([minValue, maxValue], [lightBlue, darkBlue]);
}

function displayMajority(mapData) {
  const darkRed = '#8b0000';
  const lightRed = '#d39393';
  const majorityData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results.find(row => row.Elected === 'TRUE').MajorityPercentageValue);
    return majority;
  });
  const min = mapData.features.find((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results.find(row => row.Elected === 'TRUE').MajorityPercentageValue);
    if (majority === d3.min(majorityData)) return true;
    return false;
  });
  const max = mapData.features.find((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results.find(row => row.Elected === 'TRUE').MajorityPercentageValue);
    if (majority === d3.max(majorityData)) return true;
    return false;
  });
  console.log('majority');
  console.log(min);
  console.log(max);
  const minValue = utils.floorToNext5Percent(d3.min(majorityData));
  const maxValue = utils.ceilToNext5Percent(d3.max(majorityData));
  const color = d3.scaleLinear()
    .domain([minValue, maxValue])
    .range([lightRed, darkRed]);
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const majority = Number.parseFloat(d.properties.results.find(row => row.Elected === 'TRUE').MajorityPercentageValue);
      return color(majority);
    });
  linearLegend([minValue, maxValue], [lightRed, darkRed]);
}

export default {
  displayResults,
  displayChangedConstituencies,
  displayGender,
  displayTurnout,
  displayMajority,
};
