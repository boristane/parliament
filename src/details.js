import * as d3 from 'd3';
import map from './map.utils';

function getPartyResults(mapData, partyDetails) {
  const results = [];
  const winningPartyPerConstituency = [];
  mapData.features.forEach((constituency) => {
    const winningRow = constituency.properties.results.find(row => row.Elected === 'TRUE');
    winningPartyPerConstituency.push({
      constituency: winningRow.ConstituencyName,
      party: winningRow.PartyShortName,
      hold: winningRow.ResultHoldGain,
      gender: winningRow.CandidateGender,
    });
    const constituencyResults = constituency.properties.results;
    constituencyResults.forEach((candidate) => {
      let result = results.find(r => r.party === candidate.PartyShortName);
      if (result) {
        result.votes += parseInt(candidate.Votes, 10);
        result.deltaVotes = (result.deltaVotes * result.numParticipatedConstituencies)
          + parseFloat(candidate.ResultChangeValue);
        result.numParticipatedConstituencies += 1;
        result.deltaVotes /= result.numParticipatedConstituencies;
        result.femaleCandidates += candidate.CandidateGender === 'Female' ? 1 : 0;
      } else {
        const party = partyDetails.find(e => e.PartyShortName === candidate.PartyShortName);
        const color = party ? party.color : 'lightgray';
        result = {
          party: candidate.PartyShortName,
          votes: parseInt(candidate.Votes, 10),
          numSeats: 0,
          color,
          delta: 0,
          deltaVotes: 0,
          numParticipatedConstituencies: 0,
          femaleSeats: 0,
          femaleCandidates: 0,
        };
        results.push(result);
      }
    });
  });

  winningPartyPerConstituency.forEach((constituency) => {
    const result = results.find(r => r.party === constituency.party);
    result.numSeats += 1;
    result.femaleSeats += constituency.gender === 'Female' ? 1 : 0;
    if (constituency.hold.includes(`${result.party} gain`)) {
      result.delta += 1;
      const arr = constituency.hold.split(' ');
      const takenFrom = results.find(r => r.party === arr[arr.length - 1]);
      takenFrom.delta -= 1;
    }
  });

  return results;
}

function verticalBarChart(obj, results, partyDetails) {
  const {
    barWidth,
    numBars,
    margin,
    width,
    height,
    field,
    chartClass,
    chartContainerSelector,
    formatText,
    onClickMain,
    onClickParty,
  } = obj;

  let clicked;
  function handleClick(d) {
    if (clicked === d.party) {
      onClickMain(partyDetails);
      clicked = null;
    } else {
      clicked = d.party;
      onClickParty(d.party, partyDetails);
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
  function handleMouseOut(d, i) {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('width', barWidth)
      .attr('x', i * (barWidth + 5) + 5);
  }

  d3.select(`.${chartClass}`).remove();
  const chart = d3.select(chartContainerSelector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('class', chartClass)
    .append('g');

  const partyNameHeight = 25;
  const yScale = d3.scaleLinear()
    .range([height - partyNameHeight, 15])
    .domain([0, d3.max(results.map(result => result[field]))]);

  const fieldResults = results.filter(r => r[field] >= 1).sort((a, b) => b[field] - a[field])
    .slice(0, numBars);
  chart.selectAll('rect')
    .data(fieldResults)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * (barWidth + 5) + 5)
    .attr('y', d => yScale(d[field]))
    .attr('width', barWidth)
    .attr('height', d => height - partyNameHeight - yScale(d[field]))
    .attr('fill', d => d.color)
    .classed('pointer', true)
    .on('click', handleClick)
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut);
  chart.append('g')
    .selectAll('text')
    .data(fieldResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text(d => formatText(d[field]))
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', d => yScale(d[field]) - 3)
    .style('font-size', '13px')
    .classed('pointer highlightable', true)
    .on('click', handleClick);
  chart.append('g')
    .selectAll('text')
    .data(fieldResults)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .text((d) => {
      if (d.party === 'Alliance') return 'ALLI';
      return `${d.party.toUpperCase()}`;
    })
    .attr('x', (d, i) => i * (barWidth + 5) + 20)
    .attr('y', height - 5)
    .style('font-weight', 'bold')
    .style('font-size', (d) => {
      if (d.party.length > 3) return '10px';
      return '12px';
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);
}

function horizontalBarChart(obj, results) {
  const {
    barHeight,
    numBars,
    margin,
    width,
    height,
    field,
    chartClass,
    chartContainerSelector,
    formatText,
    onClickMain,
    onClickParty,
    minDataWidth,
    maxDataWidth,
  } = obj;

  let clicked;
  function handleClick(d) {
    if (clicked === d.party) {
      onClickMain();
      clicked = null;
    } else {
      clicked = d.party;
      onClickParty(d.party);
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
  function handleMouseOut(d, i) {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('height', barHeight)
      .attr('y', i * (barHeight + 5) + 5);
  }

  d3.select(`.${chartClass}`).remove();
  const chart = d3.select(chartContainerSelector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .attr('class', chartClass)
    .append('g');

  const deltas = results.map(result => result[field]);
  const xScale = d3.scaleLinear()
    .range([0, width / 2 - 1])
    .domain([0, d3.max(deltas.map(delta => (delta > 0 ? delta : -delta)))]);

  const deltaResults = results.filter(r => r.delta !== 0).sort((a, b) => b[field] - a[field])
    .slice(0, numBars);
  chart.selectAll('rect')
    .data(deltaResults)
    .enter()
    .append('rect')
    .attr('x', (d) => {
      if (d[field] > 0) return width / 2 + 1;
      return width / 2 - xScale(Math.abs(d[field]));
    })
    .attr('y', (d, i) => i * (barHeight + 5) + 5)
    .attr('width', d => xScale(Math.abs(d[field])))
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
    .text((d) => {
      if (d.party === 'Alliance') return 'ALLI';
      return `${d.party.toUpperCase()}`;
    })
    .attr('x', (d) => {
      if (d[field] < 0) return width / 2 + 1;
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
    .text(d => formatText(d[field]))
    .attr('x', (d) => {
      const partyNameWidth = d.party.length * 9.3;
      if (d[field] < 0) return width / 2 + partyNameWidth + 4;
      return width / 2 - partyNameWidth - (Math.abs(d[field]) < 10 ? minDataWidth : maxDataWidth);
    })
    .attr('y', (d, i) => i * (barHeight + 5) + 5 + 5 * barHeight / 7)
    .style('font-weight', 'bold')
    .style('font-size', '13px')
    .attr('fill', (d) => {
      if (d[field] < 0) return 'red';
      return 'green';
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);
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

  const seatsResultsPlot = {
    barWidth: 30,
    numBars: 10,
    margin,
    width: 350 - margin.left - margin.right,
    height: 250 - margin.top - margin.bottom,
    field: 'numSeats',
    chartClass: 'national-results-chart',
    chartContainerSelector: '.details .results-chart-container',
    formatText: v => v,
    onClickMain: map.displayResults,
    onClickParty: map.displayPartyResults,
  };
  verticalBarChart(seatsResultsPlot, results, partyDetails);

  const votesResultsPlot = {
    barWidth: 30,
    numBars: 10,
    margin,
    width: 350 - margin.left - margin.right,
    height: 250 - margin.top - margin.bottom,
    field: 'votes',
    chartClass: 'national-results-votes-chart',
    chartContainerSelector: '.details .results-chart-votes-container',
    formatText: v => `${(v / 1000000).toFixed(1)}M`,
    onClickMain: map.displayResults,
    onClickParty: map.displayPartyResults,
  };
  verticalBarChart(votesResultsPlot, results, partyDetails);
}

function displayNationalChanged(mapData, partyDetails) {
  const results = getPartyResults(mapData, partyDetails);
  document.querySelector('.details .changed').classList.remove('none');
  const margin = {
    top: 5,
    right: 5,
    bottom: 0,
    left: 5,
  };

  const seatsDeltasPlot = {
    barHeight: 20,
    numBars: 10,
    margin,
    width: 350 - margin.left - margin.right,
    height: 250 - margin.top - margin.bottom,
    field: 'delta',
    chartClass: 'national-changed-chart',
    chartContainerSelector: '.details .changed-chart-container',
    formatText: v => (v < 0 ? v : `+${v}`),
    onClickMain: map.displayChangedConstituencies,
    onClickParty: map.displayPartyChangedConstituencies,
    minDataWidth: 20,
    maxDataWidth: 25,
  };
  horizontalBarChart(seatsDeltasPlot, results);

  const votesDeltasPlot = {
    barHeight: 20,
    numBars: 10,
    margin,
    width: 350 - margin.left - margin.right,
    height: 250 - margin.top - margin.bottom,
    field: 'deltaVotes',
    chartClass: 'national-changed-votes-chart',
    chartContainerSelector: '.details .changed-chart-votes-container',
    formatText: (v) => {
      const s = `${(v * 100).toFixed(1)}%`;
      return v < 0 ? s : `+${s}`;
    },
    onClickMain: map.displayChangedConstituencies,
    onClickParty: map.displayPartyChangedConstituencies,
    minDataWidth: 40,
    maxDataWidth: 45,
  };
  horizontalBarChart(votesDeltasPlot, results);
}

function displayNationalGender(mapData, partyDetails) {
  const results = getPartyResults(mapData, partyDetails);
  document.querySelector('.details .gender').classList.remove('none');
  const margin = {
    top: 5,
    right: 5,
    bottom: 0,
    left: 5,
  };

  const femaleResultsPlot = {
    barWidth: 30,
    numBars: 10,
    margin,
    width: 350 - margin.left - margin.right,
    height: 250 - margin.top - margin.bottom,
    field: 'femaleSeats',
    chartClass: 'national-female-seats-chart',
    chartContainerSelector: '.details .gender-chart-container',
    formatText: v => v,
    onClickMain: map.displayGender,
    onClickParty: map.displayPartyGender,
  };
  verticalBarChart(femaleResultsPlot, results, partyDetails);

  const femaleCandidatesPlot = {
    barWidth: 30,
    numBars: 10,
    margin,
    width: 350 - margin.left - margin.right,
    height: 250 - margin.top - margin.bottom,
    field: 'femaleCandidates',
    chartClass: 'national-female-candidates-chart',
    chartContainerSelector: '.details .gender-chart-candidates-container',
    formatText: v => v,
    onClickMain: map.displayGender,
    onClickParty: map.displayPartyGenderCandidates,
  };
  verticalBarChart(femaleCandidatesPlot, results, partyDetails);
}

export default {
  displayNationalResults,
  displayNationalChanged,
  displayNationalGender,
};
