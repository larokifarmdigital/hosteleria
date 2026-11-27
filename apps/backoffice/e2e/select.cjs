// El backoffice usa un desplegable propio (Radix), no `<select>`: `selectOption` ya no sirve.
// Estas ayudas lo abren y eligen como lo haría una persona.
module.exports = {
  /** Elige una opción por su valor (`'hours'`) o por su texto (`{ label: 'Todos' }`). */
  async pick(page, trigger, value) {
    await trigger.click();
    const option = typeof value === 'string'
      ? page.locator(`[role="option"][data-value="${value}"]`)
      : page.getByRole('option', { name: value.label, exact: true });
    await option.click();
    await page.waitForTimeout(150);
  },
  /** Texto de la opción elegida, tal como se ve en el desplegable cerrado. */
  async text(trigger) {
    return (await trigger.innerText()).trim();
  },
  /** Títulos de los grupos de opciones (lo que antes eran `<optgroup>`). */
  async groups(page, trigger) {
    await trigger.click();
    await page.getByRole('listbox').waitFor();
    const labels = await page.getByRole('listbox').evaluate(list =>
      [...list.querySelectorAll('[role="group"]')].map(g => document.getElementById(g.getAttribute('aria-labelledby'))?.textContent?.trim() ?? ''));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    return labels;
  }
};
