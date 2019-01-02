import * as d3 from 'd3';

function getPartyResults(mapData, partyDetails) {
  const winningPartyPerConstituency = [];
  mapData.features.forEach((constituency) => {
    const winningRow = constituency.properties.results.find(row => row.Elected === 'TRUE');
    winningPartyPerConstituency.push({
      constituency: winningRow.ConstituencyName,
      party: winningRow.PartyShortName,
      hold: winningRow.ResultHoldGain,
    });
  });
  const results = [];
  winningPartyPerConstituency.forEach((constituency) => {
    let result = results.find(r => r.party === constituency.party);
    if (result) {
      result.numSeats += 1;
    } else {
      const party = partyDetails.find(e => e.PartyShortName === constituency.party);
      const color = party ? party.color : 'lightgray';
      result = {
        party: constituency.party,
        numSeats: 1,
        color,
        delta: 0,
      };
      results.push(result);
    }
    if (constituency.hold.includes(`${result.party} gain`)) {
      result.delta += 1;
      const arr = constituency.hold.split(' ');
      let takenFrom = results.find(r => r.party === arr[arr.length - 1]);
      if (takenFrom) {
        takenFrom.delta -= 1;
      } else {
        const party = partyDetails.find(e => e.PartyShortName === arr[arr.length - 1]);
        const color = party ? party.color : 'lightgray';
        takenFrom = {
          party: arr[arr.length],
          numSeats: 0,
          color,
          delta: -1,
        };
      }
    }
  });
  return results;
}

function displayNationalResults(mapData, partyDetails) {
  const results = getPartyResults(mapData, partyDetails);
  document.querySelector('.details .results').classList.remove('none');
  const margin = {
    top: 5,
    right: 5,
    bottom: 0,
    left: 5,
  };
  const width = 300 - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  d3.select('.national-results-chart').remove();
  const chart = d3.select('.details .results-chart-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('class', 'national-results-chart')
    .append('g');

  const partyNameHeight = 25;
  const yScale = d3.scaleLinear()
    .range([height - partyNameHeight, 15])
    .domain([0, d3.max(results.map(result => result.numSeats))]);

  const barWidth = 30;
  chart.selectAll('rect')
    .data(results.sort((a, b) => b.numSeats - a.numSeats))
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * (barWidth + 5) + 5)
    .attr('y', d => yScale(d.numSeats))
    .attr('width', barWidth)
    .attr('height', d => height - partyNameHeight - yScale(d.numSeats))
    .attr('fill', d => d.color);
  chart.append('g')
    .selectAll('text')
    .data(results.sort((a, b) => b.numSeats - a.numSeats))
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => d.numSeats)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', d => yScale(d.numSeats) - 3)
    .style('font-size', '13px');
  chart.append('g')
    .selectAll('text')
    .data(results.sort((a, b) => b.numSeats - a.numSeats))
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => `${d.party.toUpperCase()}`)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', height - 5)
    .style('font-weight', 'bold')
    .style('font-size', (d) => {
      if (d.party.length > 6) return '0px';
      if (d.party.length > 3) return '8px';
      return '12px';
    });
}

function displayNationalChanged(mapData, partyDetails) {
  const results = getPartyResults(mapData, partyDetails);
  document.querySelector('.details .changed').classList.remove('none');
}

export default {
  displayNationalResults,
  displayNationalChanged,
};
