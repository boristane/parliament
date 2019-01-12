import * as d3 from 'd3';

function move(event) {
  const tooltip = d3.select('.tooltip');
  const tooltipPosition = tooltip.node().getBoundingClientRect();
  const parent = tooltip.node().parentNode;
  const parentPosition = parent.getBoundingClientRect();
  const eventElement = event.srcElement;
  const eventElementPosition = eventElement.getBoundingClientRect();
  let xTooltip = eventElementPosition.left + eventElementPosition.width / 2;
  let yTooltip = eventElementPosition.top + eventElementPosition.height / 2;
  if (xTooltip < 0 || yTooltip < 0) {
    xTooltip = event.clientX;
    yTooltip = event.clientY;
  }
  if (xTooltip > parentPosition.width || yTooltip > parentPosition.height) {
    xTooltip = event.clientX;
    yTooltip = event.clientY;
  }
  if (xTooltip + tooltipPosition.width > parentPosition.width) {
    xTooltip -= tooltipPosition.width;
  }
  if (yTooltip + tooltipPosition.height > parentPosition.height) {
    yTooltip -= tooltipPosition.height;
  }
  if (parentPosition.width < 768) {
    xTooltip = 20;
    yTooltip = 100;
  }
  tooltip
    .style('left', `${xTooltip}px`)
    .style('top', `${yTooltip}px`);
}

function show() {
  const tooltip = d3.select('.tooltip');
  return tooltip.transition()
    .duration(200)
    .style('opacity', 1);
}

function hide() {
  const tooltip = d3.select('.tooltip');
  return tooltip.transition()
    .duration(200)
    .style('opacity', 0);
}
document.querySelector('.tooltip').addEventListener('click', hide);

function displayCandidate(candidate) {
  document.querySelector('.tooltip .results .party-logo').src = candidate.partyLogo;
  document.querySelector('.tooltip .results .name').textContent = candidate.name;
  document.querySelector('.tooltip .results .position').textContent = candidate.position;
  document.querySelector('.tooltip .results .gender').textContent = candidate.gender;
  document.querySelector('.tooltip .results .share').textContent = `Votes: ${(candidate.electionShare * 100).toFixed(1)}%`;
}

function displayConstituency(candidate) {
  document.querySelector('.tooltip .constituency').textContent = candidate.constituency;
}

function displayChanged(partyDetails, s) {
  document.querySelector('.tooltip .changed').classList.remove('none');
  const arr = s.split(' ');
  const gainParty = partyDetails.find(party => party.PartyShortName === arr[0]).color;
  let lostParty = gainParty;
  if (!s.includes('hold')) {
    lostParty = partyDetails.find(party => party.PartyShortName === arr[3]).color;
  }
  document.querySelector('.tooltip .changed .gain').style.backgroundColor = gainParty;
  document.querySelector('.tooltip .changed .lost').style.backgroundColor = lostParty;
  document.querySelector('.tooltip .changed .gain').textContent = s.toUpperCase();
}

function displayGender(genders) {
  document.querySelector('.tooltip .gender-div').classList.remove('none');
  document.querySelector('.tooltip .gender-div .no-candidates').textContent = genders.length;
  const numMales = genders.reduce((acc, elt) => {
    if (elt === 'Male') return acc + 1;
    return acc;
  }, 0);
  const malePercentage = numMales / genders.length;
  const femalePercentage = 1 - malePercentage;
  const data = [
    {
      gender: 'Male',
      percentage: malePercentage,
    },
    {
      gender: 'Female',
      percentage: femalePercentage,
    },
  ];
  const width = 180;
  const height = 100;
  d3.select('.gender-chart').remove();
  const chart = d3.select('.tooltip .gender-div')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'gender-chart')
    .append('g');

  const xScale = d3.scaleLinear()
    .range([0, width])
    .domain([0, 1]);

  const yScale = d3.scaleBand()
    .range([height, 0])
    .domain(data.map(d => d.gender))
    .padding(0.3);

  chart.append('g')
    .call(d3.axisLeft(yScale));

  chart.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', 0.5)
    .attr('y', d => yScale(d.gender))
    .attr('height', yScale.bandwidth())
    .attr('width', d => xScale(d.percentage))
    .attr('fill', (d) => {
      if (d.gender === 'Male') return '#658B53';
      return '#1EE6BC';
    });

  chart.selectAll()
    .data(data)
    .enter()
    .append('text')
    .attr('x', 5)
    .attr('y', d => yScale(d.gender) + yScale.bandwidth() / 2 + 3)
    .attr('class', 'gender-chart-text')
    .attr('fill', 'black')
    .text(d => `${d.gender} (${Math.round(d.percentage * genders.length)})`);
}

function displayTurnout(turnout, electorate) {
  document.querySelector('.tooltip .turnout-div').classList.remove('none');
  document.querySelector('.electorate').textContent = electorate;
  document.querySelector('.turnout').textContent = `${(turnout * 100).toFixed(0)}%`;
  const data = [turnout, 1 - turnout];
  const darkBlue = '#003366';
  const lightBlue = '#ADD8E6';
  const linearColorScale = d3.scaleLinear()
    .domain([0, 1])
    .range([lightBlue, darkBlue]);
  const width = 180;
  const height = 100;
  d3.select('.turnout-chart').remove();
  const chart = d3.select('.tooltip .turnout-div .turnout-chart-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'turnout-chart')
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);
  const radius = Math.min(width, height) / 2;
  const pie = d3.pie()
    .sort(null)
    .value(d => d);

  const path = d3.arc()
    .outerRadius(radius - 5)
    .innerRadius(0);

  const arc = chart.selectAll('.arc')
    .data(pie(data))
    .enter().append('g')
    .attr('class', 'arc');

  arc.append('path')
    .attr('d', path)
    .attr('fill', (d, i) => {
      if (i === 0) return linearColorScale(d.value);
      return 'lightgray';
    });
}

function displayConstituencyResults(candidates) {
  document.querySelector('.tooltip .majority-div').classList.remove('none');
  const margin = {
    top: 5,
    right: 5,
    bottom: 0,
    left: 5,
  };
  const width = 180 - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  d3.select('.majority-chart').remove();
  const chart = d3.select('.tooltip .majority-chart-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('class', 'majority-chart')
    .append('g');

  const partyNameHeight = 15;
  const yScale = d3.scaleLinear()
    .range([height - partyNameHeight, 0])
    .domain([0, d3.max(candidates.map(elt => elt.share))]);

  const barWidth = 30;
  chart.selectAll('rect')
    .data(candidates.sort((a, b) => b.share - a.share))
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * (barWidth + 5) + 5)
    .attr('y', d => yScale(d.share))
    .attr('width', barWidth)
    .attr('height', d => height - partyNameHeight - yScale(d.share))
    .attr('fill', d => d.color);
  chart.append('g')
    .selectAll('text')
    .data(candidates.sort((a, b) => b.share - a.share))
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => `${parseFloat(d.share * 100).toFixed(0)}%`)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', (d) => {
      if (height - partyNameHeight - yScale(d.share) < 20) return yScale(d.share);
      return yScale(d.share) + 15;
    })
    .style('font-size', '13px');
  chart.append('g')
    .selectAll('text')
    .data(candidates.sort((a, b) => b.share - a.share))
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text((d) => {
      if (d.partyShortName.length > 6) return 'OTH';
      return `${d.partyShortName.toUpperCase()}`;
    })
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', height - 5)
    .style('font-weight', 'bold')
    .style('font-size', (d) => {
      if (d.partyShortName.length > 3) return '8px';
      return '10px';
    });
}

export default {
  displayConstituency,
  displayCandidate,
  displayChanged,
  displayGender,
  displayTurnout,
  displayConstituencyResults,
  move,
  hide,
  show,
};
