import type { APIRoute } from 'astro';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const GET: APIRoute = async ({ request, url }) => {
  // 1. Recebe os dados da URL
  const params = url.searchParams;
  const name = params.get('name') || 'Não informado';
  const total = params.get('total') || 'R$ 0,00';
  const services = params.get('services')?.split('|') || [];
  const data = { name, total, services };

  const templateParams = new URLSearchParams();
  templateParams.set('name', data.name);
  templateParams.set('total', data.total);
  templateParams.set('services', data.services.join(','));
  const quoteUrl = `${url.origin}/quote-template?${templateParams.toString()}`;

  let browser;

  try {
    // 2. Inicia o Puppeteer com a configuração final e correta
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      // As linhas 'defaultViewport' e 'headless' foram removidas
    });

    const page = await browser.newPage();
    await page.goto(quoteUrl, { waitUntil: 'networkidle0' });

    // 3. Gera o PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    // 4. Retorna o PDF
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Orçamento - ${data.name}.pdf"`,
      },
    });

  } catch (error) {
    console.error(error);
    return new Response(`Falha ao gerar o PDF com o Puppeteer. Erro: ${(error as Error).message}`, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};