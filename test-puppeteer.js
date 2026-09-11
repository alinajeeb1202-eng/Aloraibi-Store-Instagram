import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent('<h1>مرحبا</h1>');
    await page.screenshot({ path: 'test-puppeteer.png' });
    await browser.close();
    console.log("Puppeteer works");
  } catch (err) {
    console.error("Puppeteer failed", err);
  }
})();
