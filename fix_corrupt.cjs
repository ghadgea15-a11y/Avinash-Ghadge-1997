const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const badStr = `    } catch (err: any) {
      console.error('[FirestoreService] recordStockTransaction error:', err);
      return { success: false, transactionId: '', newStock: 0 };
    }
  }\`);
      return { success: false, transactionId: '', newStock: 0 };
    }`;

const goodStr = `    } catch (err: any) {
      console.error('[FirestoreService] recordStockTransaction error:', err);
      return { success: false, transactionId: '', newStock: 0 };
    }
  }`;

code = code.replace(badStr, goodStr);

fs.writeFileSync('src/services/firestoreService.ts', code);
