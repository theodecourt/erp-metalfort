import { test, expect } from '@playwright/test';

// Prereqs: supabase running, seed applied, admin@metalfort.tech exists,
// backend uvicorn on :8000, frontend dev on :5173.

async function loginAsAdmin(page: any) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@metalfort.tech');
  await page.fill('input[type="password"]', 'metalfort2026!');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/admin$/);
}

test('admin cria orcamento via StepConfigurator', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin/orcamento/new');
  await page.getByLabel(/produto/i).selectOption({ label: 'Metalfort Home' });

  // etapas sao headings h2 dentro do configurador
  await expect(page.getByRole('heading', { name: /Estrutura/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Fechamento/ })).toBeVisible();

  // preenche cliente e cria rascunho
  await page.getByPlaceholder(/Nome/).fill('Teste E2E Configurator');
  await page.getByPlaceholder(/Email/).fill('e2e@test.local');
  await page.getByLabel(/Enviar PDF/).uncheck();
  await page.getByRole('button', { name: /Criar rascunho/i }).click();

  await page.waitForURL(/\/admin\/orcamento\/[a-z0-9-]+$/);
  await expect(page.getByText(/Teste E2E Configurator/)).toBeVisible();
});
