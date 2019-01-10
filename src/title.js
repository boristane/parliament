export default function changeTittle(title, subtitle = '') {
  document.getElementById('title').textContent = `General Election: ${title}`;
  document.getElementById('subtitle').textContent = subtitle;
}
