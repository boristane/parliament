import * as d3 from 'd3';
import statMethods from 'stat-methods';
import map from './map.utils';
import utils from './utils';

const maxChartWidth = document.getElementById('content').clientWidth < 768 ? 300 : 350;
const maxChartHeight = document.getElementById('content').clientWidth < 600 ? 150 : 250;

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
          + parseFloat(candidate.ResultChangeValue ? candidate.ResultChangeValue : 0);
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
    console.log(constituency);
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

  const barMargin = 5;
  const barWidth = width / numBars - barMargin;
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
      .attr('x', i * (barWidth + barMargin) + barMargin);
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
    .attr('x', (d, i) => i * (barWidth + barMargin) + barMargin)
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
    .attr('x', (d, i) => {
      const offset = width <= 300 ? 3 * barMargin : 4 * barMargin;
      return i * (barWidth + barMargin) + offset;
    })
    .attr('y', d => yScale(d[field]) - 3)
    .style('font-size', () => {
      if (width <= 300) return '10px';
      return '13px';
    })
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
    .attr('x', (d, i) => {
      const offset = width <= 300 ? 3 * barMargin : 4 * barMargin;
      return i * (barWidth + barMargin) + offset;
    })
    .attr('y', height - 5)
    .style('font-weight', 'bold')
    .style('font-size', (d) => {
      let size = 12;
      if (d.party.length > 3) size -= 2;
      if (width <= 300) size -= 3;
      return `${size}px`;
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);
}

function horizontalBarChart(obj, results) {
  const {
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

  const barMargin = 5;
  const barHeight = height / numBars - barMargin;
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
      .attr('y', i * (barHeight + barMargin) + barMargin);
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
    .attr('y', (d, i) => i * (barHeight + barMargin) + barMargin)
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
    .attr('y', (d, i) => i * (barHeight + barMargin) + barMargin + 5 * barHeight / 7)
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
    .attr('y', (d, i) => i * (barHeight + barMargin) + barMargin + 5 * barHeight / 7)
    .style('font-weight', 'bold')
    .style('font-size', '13px')
    .attr('fill', (d) => {
      if (d[field] < 0) return 'red';
      return 'green';
    })
    .classed('pointer highlightable', true)
    .on('click', handleClick);
}

function histogram(obj, bins) {
  const {
    margin,
    width,
    height,
    chartClass,
    chartContainerSelector,
    darkColor,
    lightColor,
    step,
    mapData,
    textFormat,
    xLabel,
    onClick,
  } = obj;

  d3.select(`.${chartClass}`).remove();
  const chart = d3.select(chartContainerSelector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('class', chartClass)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const yScale = d3.scaleLinear()
    .range([height, 0])
    .domain([0, d3.max(bins.map(b => b.numOccurences))]);

  chart.append('g')
    .call(d3.axisLeft(yScale));

  const xScale = d3.scaleBand()
    .range([0, width])
    .domain(bins.map(b => textFormat(b.value * 100)))
    .padding(0.2);

  chart.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  const color = d3.scaleLinear()
    .domain([d3.min(bins.map(b => b.value)), d3.max(bins.map(b => b.value))])
    .range([lightColor, darkColor]);

  let clicked;
  function handleClick(d) {
    if (clicked === d.value) {
      onClick(mapData);
      clicked = null;
    } else {
      clicked = d.value;
      onClick(mapData, [d.value - step, d.value + step]);
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
  function handleMouseOut(d) {
    d3.select(this)
      .transition()
      .ease(d3.easeElastic)
      .duration(300)
      .attr('width', xScale.bandwidth())
      .attr('x', xScale(textFormat(d.value * 100)));
  }

  chart.selectAll('rect')
    .data(bins)
    .enter()
    .append('rect')
    .attr('x', d => xScale(textFormat(d.value * 100)))
    .attr('y', d => yScale(d.numOccurences))
    .attr('width', xScale.bandwidth())
    .attr('height', d => height - yScale(d.numOccurences))
    .attr('fill', d => color(d.value))
    .classed('pointer', true)
    .on('click', handleClick)
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut);

  chart.append('text')
    .attr('x', -(height / 2))
    .attr('y', -30)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Num Constituencies')
    .attr('font-size', '12px');

  chart.append('text')
    .attr('x', width / 2)
    .attr('y', height + 30)
    .attr('text-anchor', 'middle')
    .text(xLabel)
    .attr('font-size', '12px');
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
    numBars: 10,
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
    field: 'numSeats',
    chartClass: 'national-results-chart',
    chartContainerSelector: '.details .results-chart-container',
    formatText: v => v,
    onClickMain: map.displayResults,
    onClickParty: map.displayPartyResults,
  };
  verticalBarChart(seatsResultsPlot, results, partyDetails);

  const votesResultsPlot = {
    numBars: 10,
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
    field: 'votes',
    chartClass: 'national-results-votes-chart',
    chartContainerSelector: '.details .results-chart-votes-container',
    formatText: v => `${(v / 1000000).toFixed(1)}M`,
    onClickMain: map.displayResults,
    onClickParty: map.displayPartyResults,
  };
  verticalBarChart(votesResultsPlot, results, partyDetails);
  document.querySelector('.results .header').addEventListener('click', () => {
    map.displayResults(partyDetails);
  });
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
    numBars: 10,
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
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
    numBars: 10,
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
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
  document.querySelector('.changed .header').addEventListener('click', () => map.displayChangedConstituencies);
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
    numBars: 10,
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
    field: 'femaleSeats',
    chartClass: 'national-female-seats-chart',
    chartContainerSelector: '.details .gender-chart-container',
    formatText: v => v,
    onClickMain: map.displayGender,
    onClickParty: map.displayPartyGender,
  };
  verticalBarChart(femaleResultsPlot, results, partyDetails);

  const femaleCandidatesPlot = {
    numBars: 10,
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
    field: 'femaleCandidates',
    chartClass: 'national-female-candidates-chart',
    chartContainerSelector: '.details .gender-chart-candidates-container',
    formatText: v => v,
    onClickMain: map.displayGender,
    onClickParty: map.displayPartyGenderCandidates,
  };
  verticalBarChart(femaleCandidatesPlot, results, partyDetails);
  document.querySelector('.gender .header').addEventListener('click', map.displayGender);
}

function displayNationalTurnout(mapData) {
  document.querySelector('.details .turnout').classList.remove('none');
  const step = 0.01;
  const turnoutData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    return {
      name: results[0].ConstituencyName,
      turnout: parseFloat(results[0].TurnoutPercentageValue),
    };
  });
  const bins = [];
  turnoutData.forEach((constituency) => {
    const bin = bins.find(b => Math.abs(constituency.turnout - b.value) <= step);
    if (bin) bin.numOccurences += 1;
    else {
      bins.push({
        value: utils.roundToNextPercent(constituency.turnout, 100 * step * 2),
        numOccurences: 1,
      });
    }
  });
  bins.sort((a, b) => a.value - b.value);

  const margin = {
    top: 5,
    right: 5,
    bottom: 40,
    left: 45,
  };
  const obj = {
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
    chartClass: 'national-turnout-histogram-chart',
    chartContainerSelector: '.details .turnout-chart-container',
    darkColor: '#003366',
    lightColor: '#ADD8E6',
    textFormat: d3.format('.0f'),
    mapData,
    step,
    xLabel: 'Turnout (%)',
    onClick: map.displayTurnout,
  };
  histogram(obj, bins);

  document.getElementById('turnout-average').textContent = d3.format('.1%')(statMethods.mean(turnoutData.map(d => d.turnout)));
  document.getElementById('turnout-stdev').textContent = d3.format('.1%')(statMethods.pStdev(turnoutData.map(d => d.turnout)));
  turnoutData.sort((a, b) => a.turnout - b.turnout);
  const maxTurnout = turnoutData[turnoutData.length - 1];
  const minTurnout = turnoutData[0];
  document.getElementById('turnout-max').textContent = `${maxTurnout.name} (${d3.format('.1%')(maxTurnout.turnout)})`;
  document.getElementById('turnout-max').classList.add('pointer', 'highlightable');
  document.getElementById('turnout-max').addEventListener('click', () => {
    map.displayTurnout(mapData, [maxTurnout.turnout, maxTurnout.turnout]);
  });
  document.getElementById('turnout-min').textContent = `${minTurnout.name} (${d3.format('.1%')(minTurnout.turnout)})`;
  document.getElementById('turnout-min').classList.add('pointer', 'highlightable');
  document.getElementById('turnout-min').addEventListener('click', () => {
    map.displayTurnout(mapData, [minTurnout.turnout, minTurnout.turnout]);
  });
  document.querySelector('.turnout .header').addEventListener('click', () => {
    map.displayTurnout(mapData);
  });
}

function displayNationalMajority(mapData) {
  document.querySelector('.details .majority').classList.remove('none');
  const step = 0.02;
  const majorityData = mapData.features.map((constituency) => {
    const { results } = constituency.properties;
    return {
      name: results[0].ConstituencyName,
      majority: parseFloat(results[0].MajorityPercentageValue),
    };
  });
  const bins = [];
  majorityData.forEach((constituency) => {
    const bin = bins.find(b => Math.abs(constituency.majority - b.value) <= step);
    if (bin) bin.numOccurences += 1;
    else {
      bins.push({
        value: utils.roundToNextPercent(constituency.majority, 100 * step * 2),
        numOccurences: 1,
      });
    }
  });
  bins.sort((a, b) => a.value - b.value);

  const margin = {
    top: 5,
    right: 5,
    bottom: 40,
    left: 45,
  };
  const obj = {
    margin,
    width: maxChartWidth - margin.left - margin.right,
    height: maxChartHeight - margin.top - margin.bottom,
    chartClass: 'national-majority-histogram-chart',
    chartContainerSelector: '.details .majority-chart-container',
    darkColor: '#8b0000',
    lightColor: '#d39393',
    textFormat: d3.format('.0f'),
    mapData,
    step,
    xLabel: 'Majority (%)',
    onClick: map.displayMajority,
  };
  histogram(obj, bins);

  document.getElementById('majority-average').textContent = d3.format('.1%')(statMethods.mean(majorityData.map(d => d.majority)));
  document.getElementById('majority-stdev').textContent = d3.format('.1%')(statMethods.pStdev(majorityData.map(d => d.majority)));
  majorityData.sort((a, b) => a.majority - b.majority);
  const maxMajority = majorityData[majorityData.length - 1];
  const minMajority = majorityData[0];
  document.getElementById('majority-max').textContent = `${maxMajority.name} (${d3.format('.1%')(maxMajority.majority)})`;
  document.getElementById('majority-max').classList.add('pointer', 'highlightable');
  document.getElementById('majority-max').addEventListener('click', () => {
    map.displayMajority(mapData, [maxMajority.majority, maxMajority.majority]);
  });
  document.getElementById('majority-min').textContent = `${minMajority.name} (${d3.format('.1%')(minMajority.majority)})`;
  document.getElementById('majority-min').classList.add('pointer', 'highlightable');
  document.getElementById('majority-min').addEventListener('click', () => {
    map.displayMajority(mapData, [minMajority.majority, minMajority.majority]);
  });
  document.querySelector('.majority .header').addEventListener('click', () => {
    map.displayMajority(mapData);
  });
}

function toggleDetails() {
  document.querySelector('.t-details').addEventListener('click', () => {
    document.querySelector('.details').classList.toggle('collapsed');
    document.querySelector('.user-input').classList.add('collapsed');

    document.querySelector('.details .fas').classList.toggle('fa-angle-left');
    document.querySelector('.details .fas').classList.toggle('fa-angle-right');
    document.querySelector('.user-input .fas').classList.add('fa-angle-left');
    document.querySelector('.user-input .fas').classList.remove('fa-angle-right');
  });
}

export default {
  displayNationalResults,
  displayNationalChanged,
  displayNationalGender,
  displayNationalTurnout,
  displayNationalMajority,
  toggleDetails,
};
