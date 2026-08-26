import { TotpService } from './src/services/totpService';
async function test() {
  const result = await TotpService.createMfaSetup({ accountName: 'superadmin' });
  console.log("URI:", result.otpAuthUri);
  console.log("Base32 Secret length:", result.secret.length);
}
test().catch(console.error);
