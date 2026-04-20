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

test('admin cria orcamento via StepConfigurator trocando template', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin/orcamento/novo');
  await page.getByLabel(/produto/i).selectOption({ label: 'Metalfort Home' });

  // sidebar desktop: botoes com labels das etapas
  await expect(page.getByRole('button', { name: /^Estrutura$/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Fechamento$/ }).first()).toBeVisible();

  // Basico vem aplicado por default
  const basico = page.getByRole('button', { name: /^Básico$/ });
  await expect(basico).toHaveAttribute('aria-pressed', 'true');

  // troca para Premium
  await page.getByRole('button', { name: /^Premium$/ }).click();
  await expect(page.getByRole('button', { name: /^Premium$/ })).toHaveAttribute('aria-pressed', 'true');

  // preenche cliente e cria rascunho
  await page.getByPlaceholder(/Nome/).fill('Teste E2E Configurator');
  await page.getByPlaceholder(/Email/).fill('e2e@test.local');
  await page.getByLabel(/Enviar PDF/).uncheck();
  await page.getByRole('button', { name: /Criar rascunho/i }).click();

  await page.waitForURL(/\/admin\/orcamento\/[a-z0-9-]+$/);
  await expect(page.getByText(/Teste E2E Configurator/)).toBeVisible();
});
