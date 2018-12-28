import * as d3 from 'd3';

const div = d3.select('.tooltip');

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
      percentage: femalePercentage,
    },
    {
      gender: 'Female',
      percentage: malePercentage,
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

  chart.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  chart.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', 0.5)
    .attr('y', d => yScale(d.gender))
    .attr('height', yScale.bandwidth())
    .attr('width', d => width - xScale(d.percentage))
    .attr('fill', (d) => {
      if (d.gender === 'Male') return '#ADD8E6';
      return '#551A8B';
    });

  chart.selectAll()
    .data(data)
    .enter()
    .append('text')
    .attr('x', 5)
    .attr('y', d => (yScale(d.gender) + yScale.bandwidth() / 2 + 5))
    .attr('class', 'gender-chart-text')
    .attr('fill', 'black')
    .text(d => d.gender);
}

export default {
  div,
  displayConstituency,
  displayCandidate,
  displayChanged,
  displayGender,
};
