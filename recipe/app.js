// Recipe content is rendered as text, never interpreted as HTML.
const status = document.querySelector('#status');
document.querySelector('#print').addEventListener('click', () => window.print());
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
    if (typeof recipe.title !== 'string' || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps)) throw new Error('format');
    document.title = `${recipe.title} · Chefo`;
    document.querySelector('#title').textContent = recipe.title;
    document.querySelector('#details').textContent = [recipe.servings > 0 ? `${recipe.servings} raciones` : '', recipe.minutes > 0 ? `${recipe.minutes} min` : ''].filter(Boolean).join(' · ');
    for (const key of ['ingredients', 'steps']) {
      const list = document.getElementById(key);
      for (const value of recipe[key]) {
        if (typeof value !== 'string') throw new Error('format');
        const item = document.createElement('li'); item.textContent = value; list.append(item);
      }
      if (!recipe[key].length) { const item = document.createElement('li'); item.textContent = 'No se han añadido datos.'; list.append(item); }
    }
    status.hidden = true; document.querySelector('article').hidden = false;
  } catch { status.textContent = 'No pudimos abrir la receta. Comprueba tu conexión y recarga la página.'; }
}
loadRecipe();
