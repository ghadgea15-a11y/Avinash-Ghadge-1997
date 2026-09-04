const { chromium } = require('playwright');

async function runTest() {
  console.log("Starting UI E2E Playwright Debug...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(3000); // let React render
    const html = await page.content();
    console.log("HTML length:", html.length);
    console.log("Body text:", await page.innerText('body'));
    console.log("Inputs found:");
    const inputLocators = await page.locator('input').all();
    for (let input of inputLocators) {
      console.log(await input.getAttribute('type'), await input.getAttribute('name'), await input.getAttribute('id'));
    }
  } catch (e) {
    console.error(e);
  }
  await browser.close();
}

runTest().catch(console.error);
