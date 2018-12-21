import * as d3 from 'd3';

const div = d3.select('.tooltip');

function displayCandidate(candidate) {
  document.querySelector('.tooltip .party-logo').src = candidate.partyLogo;
  document.querySelector('.tooltip .name').textContent = candidate.name;
  document.querySelector('.tooltip .gender').textContent = candidate.gender;
  document.querySelector('.tooltip .constituency').textContent = candidate.constituency;
  document.querySelector('.tooltip .share').textContent = `Votes: ${(candidate.electionShare * 100).toFixed(1)}%`;
}

export default {
  div,
  displayCandidate,
};
