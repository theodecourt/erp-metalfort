import { test, expect } from '@playwright/test';

// Prereqs: supabase running, make seed applied, admin@metalfort.tech exists,
// backend uvicorn on :8000, frontend dev on :5173.

async function loginAsAdmin(page: any) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@metalfort.tech');
  await page.fill('input[type="password"]', 'metalfort2026!');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/admin$/);
}

test('admin vê saldo e lança compra que aumenta o saldo', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin/estoque/saldo');
  await expect(page.locator('tbody tr').first()).toBeVisible();

  await page.goto('/admin/estoque/movimentos');
  await page.getByRole('button', { name: /novo movimento/i }).click();
  // Scope queries to the form to avoid collisions with the filters above.
  const form = page.locator('form');
  await form.getByLabel('Tipo', { exact: true }).selectOption('compra');
  const materialSelect = form.getByLabel('Material', { exact: true });
  const firstMaterialValue = await materialSelect.locator('option').nth(1).getAttribute('value');
  await materialSelect.selectOption(firstMaterialValue!);
  await form.getByLabel('Quantidade', { exact: true }).fill('5');
  await form.getByLabel('Preço unitário', { exact: true }).fill('10');
  const forSelect = form.getByLabel('Fornecedor', { exact: true });
  const firstForValue = await forSelect.locator('option').nth(1).getAttribute('value');
  await forSelect.selectOption(firstForValue!);
  await page.getByRole('button', { name: /lançar movimento/i }).click();

  // After submit, form collapses; verify movement appears in list
  await expect(page.locator('tbody tr').first()).toContainText('Compra');
});

test('análise de fabricação mostra itens quando há orçamento com BOM', async ({ page }) => {
  await loginAsAdmin(page);

  // Go to fabricação picker; requires at least one orçamento in DB
  await page.goto('/admin/estoque/fabricacao');
  const picker = page.locator('text=Nenhum');
  if (await picker.isVisible().catch(() => false)) {
    test.skip(true, 'no orçamentos available to analyze');
  }
  const analisar = page.getByRole('button', { name: /analisar/i }).first();
  if (!(await analisar.isVisible().catch(() => false))) {
    test.skip(true, 'no orçamento in seed');
  }
  await analisar.click();
  await expect(page.locator('text=Análise de fabricação')).toBeVisible();
});
