import { expect, test } from '@playwright/test';

test('public user configures and submits a quote', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Construção modular');
  await page.getByText('Metalfort Home').click();
  await expect(page).toHaveURL(/\/orcamento\/metalfort-home$/);
  await page.getByPlaceholder('Seu nome').fill('João Teste');
  await page.getByPlaceholder('Email').fill('joao@example.com');
  await page.getByRole('button', { name: /Enviar orçamento/ }).click();
  await expect(page).toHaveURL(/\/obrigado/);
  await expect(page.locator('h1')).toContainText('Orçamento enviado');
});
