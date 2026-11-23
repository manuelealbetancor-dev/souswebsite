// Shared recipe data is always rendered as text, never as markup.
const status = document.querySelector('#status');
const stickers = [
  [/pepino|cucumber/, 'cucumber'], [/tomate|tomato/, 'tomato'],
  [/guanciale|bacon|panceta|pancetta|cerdo/, 'guanciale'], [/huevo|egg/, 'egg'],
  [/parmesano|parmesan|pecorino/, 'parmesan'], [/queso|feta|mozzarella|cheese|burrata/, 'cheese'],
  [/spaghetti|pasta|espagueti|ramen|noodle|rigatoni/, 'spaghetti'],
  [/aceituna|olive|aceite|aove/, 'olive'], [/cebolla|onion|ajo|garlic/, 'onion'],
  [/\bsal\b|salt|pimienta|pepper|oregano|especia/, 'salt'],
  [/fresa|strawberry|berry/, 'strawberry'], [/leche|milk|cream|nata/, 'milk'],
  [/miel|honey|sirope|syrup/, 'honey'], [/pan|bread|toast|harina|flour|focaccia/, 'bread'],
  [/mantequilla|butter/, 'butter'], [/albahaca|basil|cilantro|perejil|espinaca|spinach|hierba|herb/, 'basil']
];
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function toggleButton(className) {
  const button = node('button', className);
  button.type = 'button'; button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')));
  return button;
}
function parseIngredient(text) {
  const match = text.match(/^([\d.,/¼½¾]+\s*(?:(?:kg|g|mg|ml|l|cdtas?|cdas?|cucharaditas?|cucharadas?|tazas?|unidades?|unidad|pizcas?)\b\.?\s*)?)(.+)$/i);
  return match ? { measurement: match[1].trim(), name: match[2].trim() } : { name: text, measurement: '' };
}
function renderIngredient(value) {
  const item = node('li');
  const button = toggleButton('ingredient');
  const sticker = node('span', 'sticker'); sticker.setAttribute('aria-hidden', 'true');
  const normalized = value.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const asset = stickers.find(([pattern]) => pattern.test(normalized));
  if (asset) { const image = node('img'); image.src = `assets/sticker_${asset[1]}.png`; image.alt = ''; sticker.append(image); }
  else sticker.textContent = value.emoji || '🥣';
  button.append(sticker, node('span', 'ingredient-name', value.name), node('span', 'measurement', value.measurement));
  item.append(button); return item;
}
function renderNutrition(nutrition) {
  const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  if (!nutrition || !keys.every(key => Number.isFinite(nutrition[key]) && nutrition[key] >= 0)) return;
  document.querySelector('#calories').textContent = Math.round(nutrition.calories);
  const labels = ['Proteínas', 'Carbs', 'Grasas', 'Fibra'];
  const colors = ['#337ae0', '#e08526', '#e85959', '#38ad6b'];
  keys.slice(1).forEach((key, index) => {
    const card = node('div', 'macro'); card.style.color = colors[index];
    card.append(node('strong', '', `${Math.round(nutrition[key] * 10) / 10} g`), node('span', '', labels[index]));
    document.querySelector('#macros').append(card);
  });
  const calories = [nutrition.protein * 4, nutrition.carbs * 4, nutrition.fat * 9];
  const sum = calories.reduce((a, b) => a + b, 0);
  calories.forEach((value, index) => { const bar = node('i'); bar.style.width = `${sum ? value / sum * 100 : 0}%`; bar.style.background = colors[index]; document.querySelector('.macro-bar').append(bar); });
  document.querySelector('#nutrition').hidden = false;
}
document.querySelector('#print').addEventListener('click', () => window.print());
document.querySelector('#cook').addEventListener('click', () => {
  const firstStep = document.querySelector('.step');
  document.querySelector('#preparation').scrollIntoView({ block: 'start' });
  if (firstStep) firstStep.focus({ preventScroll: true });
});
async function loadRecipe() {
  const id = new URLSearchParams(location.search).get('id');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
    status.textContent = 'Este enlace no es válido.'; return;
  }
  try {
    const response = await fetch(`${CHEFO_CONFIG.supabaseURL}/rest/v1/rpc/get_shared_recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CHEFO_CONFIG.publishableKey },
      body: JSON.stringify({ share_id: id })
    });
    if (!response.ok) throw new Error('request');
    const recipe = await response.json();
    if (!recipe) { status.textContent = 'Esta receta ya no está disponible.'; return; }
    if (typeof recipe.title !== 'string' || !Array.isArray(recipe.ingredients) || !recipe.ingredients.every(x => typeof x === 'string') || !Array.isArray(recipe.steps) || !recipe.steps.every(x => typeof x === 'string')) throw new Error('format');
    document.title = `${recipe.title} · Chefo`;
    document.querySelector('#title').textContent = recipe.title;
    if (typeof recipe.emoji === 'string') document.querySelector('#dish-emoji').textContent = recipe.emoji;
    const servings = document.querySelector('#servings');
    servings.textContent = Number.isFinite(recipe.servings) && recipe.servings > 0 ? `${recipe.servings} Rac` : '';
    servings.hidden = !servings.textContent;
    document.querySelector('#minutes').textContent = Number.isFinite(recipe.minutes) && recipe.minutes > 0 ? `◷ ${recipe.minutes} min` : '';
    const structured = Array.isArray(recipe.ingredientDetails) && recipe.ingredientDetails.length === recipe.ingredients.length && recipe.ingredientDetails.every(x => x && typeof x.name === 'string' && typeof x.measurement === 'string' && (x.emoji === undefined || typeof x.emoji === 'string'));
    const ingredients = structured ? recipe.ingredientDetails : recipe.ingredients.map(parseIngredient);
    const ingredientList = document.querySelector('#ingredients');
    ingredients.forEach(value => ingredientList.append(renderIngredient(value)));
    if (!ingredients.length) ingredientList.append(node('li', 'muted', 'No se han añadido ingredientes.'));
    const steps = document.querySelector('#steps');
    recipe.steps.forEach((text, index) => {
      const item = node('li'); const button = toggleButton('step');
      button.append(node('span', 'step-number', String(index + 1)), node('span', 'step-text', text));
      item.append(button); steps.append(item);
    });
    if (!recipe.steps.length) steps.append(node('li', 'muted', 'No se han añadido pasos.'));
    document.querySelector('#cook').hidden = !recipe.steps.length;
    renderNutrition(recipe.nutrition);
    status.hidden = true; document.querySelector('article').hidden = false;
  } catch { status.textContent = 'No pudimos abrir la receta. Comprueba tu conexión y recarga la página.'; }
}
loadRecipe();
