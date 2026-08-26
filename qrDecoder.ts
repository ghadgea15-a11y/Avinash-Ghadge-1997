import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';
import { TotpService } from './src/services/totpService';

async function test() {
  const result = await TotpService.createMfaSetup({ accountName: 'superadmin' });
  const dataUrl = result.qrCodeDataUrl;
  console.log('URI generated:', result.otpAuthUri);
  const image = await loadImage(dataUrl);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  console.log('Decoded QR payload:', code ? code.data : 'FAILED');
}
test().catch(console.error);
