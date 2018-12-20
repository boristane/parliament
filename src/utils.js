function getColor(code, colors) {
  const color = colors.find(col => col.PartyShortName === code);
  return color ? color.color : '#fff';
}

export default {
  getColor,
};
