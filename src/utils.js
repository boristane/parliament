function getColor(code, colors) {
  const color = colors.find(col => col.PartyShortName === code);
  return color ? color.color : '#fff';
}

function ceilToNext5Percent(num) {
  return Math.ceil(num / 0.05) * 0.05;
}

function floorToNext5Percent(num) {
  return Math.floor(num / 0.05) * 0.05;
}

export default {
  getColor,
  ceilToNext5Percent,
  floorToNext5Percent,
};
