import { expect, test } from '@playwright/test';

test('public user configures and submits a quote', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Construção modular');
  await page.getByText('Farmácia Express 3×6').click();
  await expect(page).toHaveURL(/\/produto\/farmacia-express-3x6$/);
  await page.getByRole('link', { name: /Configurar orçamento/ }).click();
  await expect(page).toHaveURL(/\/orcamento\/farmacia-express-3x6$/);
  await page.getByPlaceholder('Seu nome').fill('João Teste');
  await page.getByPlaceholder('Email').fill('joao@example.com');
  await page.getByRole('button', { name: /Enviar orçamento/ }).click();
  await expect(page).toHaveURL(/\/obrigado/);
  await expect(page.locator('h1')).toContainText('Orçamento enviado');
});
