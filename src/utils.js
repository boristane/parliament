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

function clamp(num, min, max) {
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function colorLuminance(hex, lumFactor) {
  const hexNum = hex.substr(1);
  let result = '#';
  for (let i = 0; i < 3; i += 1) {
    let color = parseInt(hexNum.substr(i * 2, 2), 16);
    color = Math.round(clamp(color * (1 + lumFactor), 0, 255)).toString(16);
    result += (`00${color}`).substr(color.length).toUpperCase();
  }
  return result;
}

export default {
  getColor,
  ceilToNext5Percent,
  floorToNext5Percent,
  colorLuminance,
};
