import * as d3 from 'd3';

function getPartyResults(mapData, partyDetails) {
  const results = [];
  mapData.features.forEach((constituency) => {
    const constituencyResults = constituency.properties.results;
    constituencyResults.forEach((candidate) => {
      let result = results.find(r => r.party === candidate.PartyShortName);
      if (result) {
        result.votes += parseInt(candidate.Votes, 10);
      } else {
        const party = partyDetails.find(e => e.PartyShortName === candidate.PartyShortName);
        const color = party ? party.color : 'lightgray';
        result = {
          party: candidate.PartyShortName,
          votes: parseInt(candidate.Votes, 10),
          numSeats: 0,
          color,
          delta: 0,
        };
        results.push(result);
      }
    });
  });
  const winningPartyPerConstituency = [];
  mapData.features.forEach((constituency) => {
    const winningRow = constituency.properties.results.find(row => row.Elected === 'TRUE');
    winningPartyPerConstituency.push({
      constituency: winningRow.ConstituencyName,
      party: winningRow.PartyShortName,
      hold: winningRow.ResultHoldGain,
    });
  });
  winningPartyPerConstituency.forEach((constituency) => {
    const result = results.find(r => r.party === constituency.party);
    result.numSeats += 1;
    if (constituency.hold.includes(`${result.party} gain`)) {
      result.delta += 1;
      const arr = constituency.hold.split(' ');
      const takenFrom = results.find(r => r.party === arr[arr.length - 1]);
      takenFrom.delta -= 1;
    }
  });
  console.table(results);
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
  const numBars = 8;

  const seatsResults = results.filter(r => r.numSeats >= 1).sort((a, b) => b.numSeats - a.numSeats)
    .slice(0, numBars);
  chart.selectAll('rect')
    .data(seatsResults)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * (barWidth + 5) + 5)
    .attr('y', d => yScale(d.numSeats))
    .attr('width', barWidth)
    .attr('height', d => height - partyNameHeight - yScale(d.numSeats))
    .attr('fill', d => d.color);
  chart.append('g')
    .selectAll('text')
    .data(seatsResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => d.numSeats)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', d => yScale(d.numSeats) - 3)
    .style('font-size', '13px');
  chart.append('g')
    .selectAll('text')
    .data(seatsResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => `${d.party.toUpperCase()}`)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', height - 5)
    .style('font-weight', 'bold')
    .style('font-size', (d) => {
      if (d.party.length > 6) return '0px';
      if (d.party.length > 3) return '10px';
      return '12px';
    });

  d3.select('.national-results-votes-chart').remove();
  const chartVotes = d3.select('.details .results-chart-votes-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('class', 'national-results-votes-chart')
    .append('g');

  const yVotesScale = d3.scaleLinear()
    .range([height - partyNameHeight, 15])
    .domain([0, d3.max(results.map(result => result.votes))]);

  const votesResults = results.sort((a, b) => b.votes - a.votes).slice(0, numBars);
  chartVotes.selectAll('rect')
    .data(votesResults)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * (barWidth + 5) + 5)
    .attr('y', d => yVotesScale(d.votes))
    .attr('width', barWidth)
    .attr('height', d => height - partyNameHeight - yVotesScale(d.votes))
    .attr('fill', d => d.color);
  chartVotes.append('g')
    .selectAll('text')
    .data(votesResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => `${(d.votes / 1000000).toFixed(1)}M`)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', d => yVotesScale(d.votes) - 3)
    .style('font-size', '13px');
  chartVotes.append('g')
    .selectAll('text')
    .data(votesResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => `${d.party.toUpperCase()}`)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', height - 5)
    .style('font-weight', 'bold')
    .style('font-size', (d) => {
      if (d.party.length > 6) return '0px';
      if (d.party.length > 3) return '10px';
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
