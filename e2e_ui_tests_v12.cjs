const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
      const session = {
          uid: 'mock_uid_EMPLOYEE',
          email: 'test_employee@supremefacility.com',
          role: 'EMPLOYEE',
          companyId: 'supremeFacility.com',
          fullName: 'Test EMPLOYEE',
          accountStatus: 'ACTIVE',
          branchId: 'MAIN',
          assignedSiteId: 'SITE_PUNE',
          assignedRegionId: 'REG_WEST',
          isAuthenticated: true,
          token: 'mock_token',
          timestamp: Date.now()
      };
      localStorage.setItem('lsm_auth_session', JSON.stringify(session));
  });
  
  await page.reload();
  await page.waitForTimeout(4000); 
  
  const html = await page.innerHTML('body');
  fs.writeFileSync('employee_dom.html', html);
  console.log("DOM saved to employee_dom.html");

  await browser.close();
}

runTest().catch(console.error);
