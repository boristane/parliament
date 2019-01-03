import * as d3 from 'd3';
import map from './map.utils';

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
  return results;
}

function displayNationalResults(mapData, partyDetails) {
  let clicked;
  function handleClick(d) {
    if (clicked === d.party) {
      map.displayResults(partyDetails);
      clicked = null;
    } else {
      clicked = d.party;
      map.displayPartyResults(d.party, partyDetails);
    }
  }
  function handleMouseOver() {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('width', parseFloat(this.getAttribute('width')) + 3)
      .attr('x', parseFloat(this.getAttribute('x')) - 1.5);
  }
  function handleMouseOut() {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('width', parseFloat(this.getAttribute('width')) - 3)
      .attr('x', parseFloat(this.getAttribute('x')) + 1.5);
  }

  const results = getPartyResults(mapData, partyDetails);
  document.querySelector('.details .results').classList.remove('none');
  const margin = {
    top: 5,
    right: 5,
    bottom: 0,
    left: 5,
  };
  const width = 350 - margin.left - margin.right;
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
  const numBars = 10;

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
    .attr('fill', d => d.color)
    .classed('pointer', true)
    .on('click', handleClick)
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut);
  chart.append('g')
    .selectAll('text')
    .data(seatsResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => d.numSeats)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', d => yScale(d.numSeats) - 3)
    .style('font-size', '13px')
    .classed('pointer highlightable', true)
    .on('click', handleClick);
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
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);

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
    .attr('fill', d => d.color)
    .classed('pointer', true)
    .on('click', handleClick)
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut);
  chartVotes.append('g')
    .selectAll('text')
    .data(votesResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => `${(d.votes / 1000000).toFixed(1)}M`)
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', d => yVotesScale(d.votes) - 3)
    .style('font-size', '13px')
    .classed('pointer highlightable', true)
    .on('click', handleClick);
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
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);
}

function displayNationalChanged(mapData, partyDetails) {
  let clicked;
  function handleClick(d) {
    if (clicked === d.party) {
      map.displayChangedConstituencies();
      clicked = null;
    } else {
      clicked = d.party;
      map.displayPartyChangedConstituencies(d.party);
    }
  }
  function handleMouseOver() {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('height', parseFloat(this.getAttribute('height')) + 3)
      .attr('y', parseFloat(this.getAttribute('y')) - 1.5);
  }
  function handleMouseOut() {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('height', parseFloat(this.getAttribute('height')) - 3)
      .attr('y', parseFloat(this.getAttribute('y')) + 1.5);
  }

  const results = getPartyResults(mapData, partyDetails);
  document.querySelector('.details .changed').classList.remove('none');
  const margin = {
    top: 5,
    right: 5,
    bottom: 0,
    left: 5,
  };
  const width = 350 - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  d3.select('.national-changed-chart').remove();
  const chart = d3.select('.details .changed-chart-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('class', 'national-changed-chart')
    .append('g');

  const deltas = results.map(result => result.delta);
  const xScale = d3.scaleLinear()
    .range([0, width / 2 - 1])
    .domain([0, d3.max(deltas.map(delta => (delta > 0 ? delta : -delta)))]);

  const barHeight = 20;
  const numBars = 10;

  const deltaResults = results.filter(r => r.delta !== 0).sort((a, b) => b.delta - a.delta)
    .slice(0, numBars);
  chart.selectAll('rect')
    .data(deltaResults)
    .enter()
    .append('rect')
    .attr('x', (d) => {
      if (d.delta > 0) return width / 2 + 1;
      return width / 2 - xScale(Math.abs(d.delta));
    })
    .attr('y', (d, i) => i * (barHeight + 5) + 5)
    .attr('width', d => xScale(Math.abs(d.delta)))
    .attr('height', barHeight)
    .attr('fill', d => d.color)
    .classed('pointer', true)
    .on('click', handleClick)
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut);
  chart.append('g')
    .append('rect')
    .attr('x', width / 2)
    .attr('y', 0)
    .attr('width', 1)
    .attr('height', height + 10)
    .attr('fill', 'lightgray');
  chart.append('g')
    .selectAll('text')
    .data(deltaResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'left')
    .text(d => `${d.party.toUpperCase()}`)
    .attr('x', (d) => {
      if (d.delta < 0) return width / 2 + 1;
      const partyNameWidth = d.party.length * 9.3;
      return width / 2 - partyNameWidth - 1;
    })
    .attr('y', (d, i) => i * (barHeight + 5) + 5 + 5 * barHeight / 7)
    .style('font-weight', 'bold')
    .style('font-size', '13px')
    .classed('pointer highlightable', true)
    .on('click', handleClick);
  chart.append('g')
    .selectAll('text')
    .data(deltaResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'left')
    .text(d => (d.delta < 0 ? d.delta : `+${d.delta}`))
    .attr('x', (d) => {
      const partyNameWidth = d.party.length * 9.3;
      if (d.delta < 0) return width / 2 + partyNameWidth + 4;
      return width / 2 - partyNameWidth - (Math.abs(d.delta) < 10 ? 20 : 25);
    })
    .attr('y', (d, i) => i * (barHeight + 5) + 5 + 5 * barHeight / 7)
    .style('font-weight', 'bold')
    .style('font-size', '13px')
    .attr('fill', (d) => {
      if (d.delta < 0) return 'red';
      return 'green';
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);
}

export default {
  displayNationalResults,
  displayNationalChanged,
};
