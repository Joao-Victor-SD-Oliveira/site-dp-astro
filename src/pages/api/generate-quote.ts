import type { APIRoute } from 'astro';
import puppeteer from 'puppeteer';

export const GET: APIRoute = async ({ request, url }) => {
  // PONTO DE DEPURAÇÃO: Vamos ver a URL exata que o servidor está recebendo.
  console.log('API RECEBEU A REQUISIÇÃO PARA A URL:', url.href);

  // 1. Recebe os dados diretamente dos parâmetros da URL
  const params = url.searchParams;
  const name = params.get('name') || 'Não informado';
  const total = params.get('total') || 'R$ 0,00';
  const services = params.get('services')?.split('|') || [];

  const data = { name, total, services };

  // 2. Monta a URL da nossa página-molde
  const templateParams = new URLSearchParams();
  templateParams.set('name', data.name);
  templateParams.set('total', data.total);
  templateParams.set('services', data.services.join(','));
  
  const quoteUrl = `${url.origin}/quote-template?${templateParams.toString()}`;

  // 3. O processo do Puppeteer
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    await page.goto(quoteUrl, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Orçamento - ${data.name}.pdf"`,
      },
    });

  } catch (error) {
    console.error(error);
    return new Response('Falha ao gerar o PDF com o Puppeteer.', { status: 500 });
  } finally {
    await browser.close();
  }
};