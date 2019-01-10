import * as d3 from 'd3';
import d3Legend from 'd3-svg-legend';
import utils from './utils';
import changeTitle from './title';

function ordinalLegend(labels, colors) {
  const ordinal = d3.scaleOrdinal()
    .domain(labels)
    .range(colors);
  const svg = d3.select('.main-svg');
  d3.select('.map-legend').remove();
  svg.append('g')
    .attr('class', 'map-legend')
    .attr('transform', 'translate(30,115)')
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

function linearLegend(width, colors, step = 5) {
  const numCells = (width[1] - width[0]) / step + 1;
  const linear = d3.scaleLinear()
    .domain(width.map(w => w / 100))
    .range(colors);
  const svg = d3.select('.main-svg');
  d3.select('.map-legend').remove();
  svg.append('g')
    .attr('class', 'map-legend')
    .attr('transform', 'translate(20,115)')
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
  changeTitle('Results');
}

function displayPartyResults(partyShortName, partyDetails) {
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
      if (winnigPartyCode === partyShortName) return utils.getColor(winnigPartyCode, partyDetails);
      return 'lightgray';
    });
  d3.select('.map-legend').remove();
  changeTitle('Results', `Party: ${partyShortName}`);
}

function displayChangedConstituencies() {
  const gold = '#D2691E';
  const grey = 'lightgray';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const hold = d.properties.results[0].ResultHoldGain.includes('hold');
      return hold ? grey : gold;
    });
  ordinalLegend(['Lost', 'Held'], [gold, grey]);

  changeTitle('Lost Constituencies');
}

function displayPartyChangedConstituencies(partyShortName) {
  const green = 'green';
  const red = 'red';
  const grey = 'lightgray';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const holdGain = d.properties.results[0].ResultHoldGain;
      const hold = holdGain.includes('hold');
      const correctParty = holdGain.includes(partyShortName);
      const won = holdGain.split(' ')[0] === partyShortName;
      if (hold) return grey;
      if (!correctParty) return grey;
      if (won) return green;
      return red;
    });
  ordinalLegend(['Gained', 'Lost'], [green, red]);
  changeTitle('Lost Constituencies', `Party: ${partyShortName}`);
}

function displayGender() {
  const blue = '#1EE6BC';
  const ivory = '#658B53';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const female = d.properties.results.find(row => row.Elected === 'TRUE').CandidateGender === 'Female';
      return female ? blue : ivory;
    });
  ordinalLegend(['Female', 'Male'], [blue, ivory]);
  changeTitle('Gender Representation - Seats');
}

function displayPartyGender(partyShortName) {
  const blue = '#1EE6BC';
  const green = '#658B53';
  const grey = 'lightgray';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const winnigPartyCode = d.properties.results.find(row => row.Elected === 'TRUE').PartyShortName;
      if (winnigPartyCode !== partyShortName) return grey;
      const female = d.properties.results.find(row => row.Elected === 'TRUE').CandidateGender === 'Female';
      return female ? blue : green;
    });
  ordinalLegend(['Female', 'Male'], [blue, green]);
  changeTitle('Gender Representation - Seats', `Party: ${partyShortName}`);
}

function displayPartyGenderCandidates(partyShortName) {
  const blue = '#1EE6BC';
  const green = '#658B53';
  const grey = 'lightgray';
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const participated = d.properties.results.find(row => row.PartyShortName === partyShortName);
      if (!participated) return grey;
      const female = d.properties.results.find(row => row.PartyShortName === partyShortName).CandidateGender === 'Female';
      return female ? blue : green;
    });
  ordinalLegend(['Female', 'Male'], [blue, green]);
  changeTitle('Gender Representation - Candidates', `Party: ${partyShortName}`);
}

function displayTurnout(mapData, band = [0, 1]) {
  const darkBlue = '#003366';
  const lightBlue = '#ADD8E6';
  const grey = 'lightgray';
  const turnoutData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results[0].TurnoutPercentageValue);
    return majority;
  });
  const minValue = utils.floorToNextPercent(d3.min(turnoutData), 5);
  const maxValue = utils.ceilToNextPercent(d3.max(turnoutData), 5);
  const color = d3.scaleLinear()
    .domain([minValue, maxValue])
    .range([lightBlue, darkBlue]);
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const turnout = Number.parseFloat(d.properties.results[0].TurnoutPercentageValue);
      if (turnout < band[0] || turnout > band[1]) return grey;
      return color(turnout);
    });
  linearLegend([minValue * 100, maxValue * 100], [lightBlue, darkBlue]);
  changeTitle('Turout', `Band: ${(band[0] * 100).toFixed(0)}% - ${(band[1] * 100).toFixed(0)}%`);
}

function displayMajority(mapData, band = [0, 1]) {
  const darkRed = '#8b0000';
  const lightRed = '#d39393';
  const grey = 'lightgray';
  const majorityData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    const majority = Number.parseFloat(results.find(row => row.Elected === 'TRUE').MajorityPercentageValue);
    return majority;
  });
  const minValue = utils.floorToNextPercent(d3.min(majorityData), 20);
  const maxValue = utils.ceilToNextPercent(d3.max(majorityData), 20);
  const color = d3.scaleLinear()
    .domain([minValue, maxValue])
    .range([lightRed, darkRed]);
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const majority = Number.parseFloat(d.properties.results.find(row => row.Elected === 'TRUE').MajorityPercentageValue);
      if (majority < band[0] || majority > band[1]) return grey;
      return color(majority);
    });
  linearLegend([minValue * 100, maxValue * 100], [lightRed, darkRed], 20);
  changeTitle('Majority', `Band: ${(band[0] * 100).toFixed(0)}% - ${(band[1] * 100).toFixed(0)}%`);
}

function displayPartyShare(mapData, partyDetails, partyShortName) {
  const midColor = utils.getColor(partyShortName, partyDetails);
  const darkColor = utils.colorLuminance(midColor, -0.9);
  const lightColor = utils.colorLuminance(midColor, 0.9);
  const shareData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    const participated = results.find(row => row.PartyShortName === partyShortName);
    return participated ? Number.parseFloat(participated.ShareValue) : undefined;
  });
  const minValue = utils.floorToNextPercent(d3.min(shareData), 10);
  const maxValue = utils.ceilToNextPercent(d3.max(shareData), 10);
  const color = d3.scaleLinear()
    .domain([0, 1])
    .range([lightColor, darkColor]);
  d3.selectAll('.map-svg path')
    .attr('fill', (d) => {
      const defaultColor = '#d3d3d3';
      const participated = d.properties.results.find(row => row.PartyShortName === partyShortName);
      return participated ? color(Number.parseFloat(participated.ShareValue)) : defaultColor;
    });
  linearLegend([minValue * 100, maxValue * 100], [color(minValue), color(maxValue)], 10);
}

export default {
  displayResults,
  displayPartyResults,
  displayChangedConstituencies,
  displayPartyChangedConstituencies,
  displayGender,
  displayMajority,
  displayTurnout,
  displayPartyShare,
  displayPartyGender,
  displayPartyGenderCandidates,
};
