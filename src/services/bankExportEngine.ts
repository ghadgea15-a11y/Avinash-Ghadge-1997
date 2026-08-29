import { 
  PaymentBatchRecord, 
  PaymentBatchItemRecord, 
  PaymentBatchValidationSummary, 
  BankExportFormat, 
  BankExportFileResult, 
  PaymentBatchMethod,
  SalarySlipRecord,
  CompanyBankAccountRecord 
} from '../types';

export class BankExportEngine {
  /**
   * Masks a bank account number for UI and security compliance.
   * e.g., "123456789012" -> "••••••••9012"
   */
  static maskAccountNumber(accountNumber: string | undefined | null): string {
    if (!accountNumber) return '••••••••••••';
    const clean = String(accountNumber).trim();
    if (clean.length <= 4) return clean;
    const lastFour = clean.slice(-4);
    const maskedSection = '•'.repeat(Math.max(4, clean.length - 4));
    return `${maskedSection}${lastFour}`;
  }

  /**
   * Validates Indian Financial System Code (IFSC) format.
   * Standard: 4 letters (Bank Code), followed by 0 (Zero), followed by 6 alphanumeric chars (Branch Code).
   * Example: HDFC0001234, SBIN0000456, ICIC0000001
   */
  static validateIfsc(ifsc: string | undefined | null): { isValid: boolean; error?: string } {
    if (!ifsc || !ifsc.trim()) {
      return { isValid: false, error: 'IFSC code is missing' };
    }
    const clean = ifsc.trim().toUpperCase();
    if (clean.length !== 11) {
      return { isValid: false, error: `IFSC must be exactly 11 characters (found ${clean.length})` };
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(clean)) {
      return { isValid: false, error: 'Invalid IFSC format (Expected 4 letters + 0 + 6 alphanumeric characters)' };
    }
    return { isValid: true };
  }

  /**
   * Validates Bank Account Number.
   * Standard Indian bank accounts are 9 to 18 digits.
   */
  static validateAccountNumber(acc: string | undefined | null): { isValid: boolean; error?: string } {
    if (!acc || !acc.trim()) {
      return { isValid: false, error: 'Bank account number is missing' };
    }
    const clean = acc.trim();
    if (clean.length < 9 || clean.length > 18) {
      return { isValid: false, error: `Account number length must be 9-18 digits (found ${clean.length})` };
    }
    const accRegex = /^[0-9A-Za-z]{9,18}$/;
    if (!accRegex.test(clean)) {
      return { isValid: false, error: 'Account number contains invalid characters' };
    }
    return { isValid: true };
  }

  /**
   * Validates Beneficiary Name.
   */
  static validateBeneficiaryName(name: string | undefined | null): { isValid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { isValid: false, error: 'Beneficiary name is missing' };
    }
    const clean = name.trim();
    if (clean.length < 2) {
      return { isValid: false, error: 'Beneficiary name is too short' };
    }
    return { isValid: true };
  }

  /**
   * Determines whether to route via NEFT or RTGS based on net pay amount and selection.
   * RTGS is standard for transactions >= ₹2,00,000.
   */
  static determinePaymentMethod(netPay: number, requestedMethod: PaymentBatchMethod): 'NEFT' | 'RTGS' {
    if (requestedMethod === 'RTGS') return 'RTGS';
    if (requestedMethod === 'NEFT') return 'NEFT';
    // AUTO routing
    return netPay >= 200000 ? 'RTGS' : 'NEFT';
  }

  /**
   * Prepares and validates batch items from authoritative locked salary slips.
   */
  static prepareBatchItems(
    slips: SalarySlipRecord[],
    companyId: string,
    requestedMethod: PaymentBatchMethod,
    existingExportedSlipIds: Set<string>
  ): { items: PaymentBatchItemRecord[]; summary: PaymentBatchValidationSummary } {
    const items: PaymentBatchItemRecord[] = [];
    const globalErrors: string[] = [];
    const globalWarnings: string[] = [];

    let totalValid = 0;
    let totalInvalid = 0;
    let totalAmount = 0;

    for (let index = 0; index < slips.length; index++) {
      const slip = slips[index];
      const errors: string[] = [];

      // 1. Company Tenant Check
      if (slip.companyId !== companyId) {
        errors.push(`Tenant isolation mismatch: Slip belongs to ${slip.companyId}`);
      }

      // 2. Net Pay Validation
      if (typeof slip.netPay !== 'number' || isNaN(slip.netPay)) {
        errors.push('Net pay amount is invalid or not a number');
      } else if (slip.netPay <= 0) {
        errors.push(`Net pay must be greater than zero (Current: ₹${slip.netPay})`);
      }

      // 3. Beneficiary Name
      const nameCheck = this.validateBeneficiaryName(slip.employeeName);
      if (!nameCheck.isValid) {
        errors.push(nameCheck.error!);
      }

      // 4. Bank Details
      const bankName = slip.bankName?.trim() || 'Bank';
      const accCheck = this.validateAccountNumber(slip.accountNumber);
      if (!accCheck.isValid) {
        errors.push(accCheck.error!);
      }

      const ifscCheck = this.validateIfsc(slip.ifscCode);
      if (!ifscCheck.isValid) {
        errors.push(ifscCheck.error!);
      }

      // 5. Duplicate Payment / Idempotency Check
      if (existingExportedSlipIds.has(slip.id)) {
        errors.push('Duplicate Payment Alert: This salary slip has already been successfully exported in an active payment batch.');
      }

      const isValid = errors.length === 0;
      const paymentMethod = this.determinePaymentMethod(slip.netPay || 0, requestedMethod);
      const maskedAcc = this.maskAccountNumber(slip.accountNumber);
      const paymentRef = `PAY-${slip.year}${String(slip.month).padStart(2, '0')}-${(slip.employeeCode || slip.employeeId).slice(-6)}-${slip.id.slice(-4)}`;

      const item: PaymentBatchItemRecord = {
        id: `ITEM_${slip.id}`,
        salarySlipId: slip.id,
        employeeId: slip.employeeId,
        employeeName: slip.employeeName,
        employeeCode: slip.employeeCode || slip.employeeId,
        departmentName: slip.departmentName || 'Operations',
        designation: slip.designation || 'Staff',
        bankName,
        accountNumber: slip.accountNumber?.trim() || '',
        maskedAccountNumber: maskedAcc,
        ifscCode: (slip.ifscCode || '').trim().toUpperCase(),
        netPay: slip.netPay || 0,
        paymentMethod,
        paymentReference: paymentRef,
        validationStatus: isValid ? 'VALID' : 'INVALID',
        validationErrors: errors,
        isEligible: isValid
      };

      items.push(item);

      if (isValid) {
        totalValid++;
        totalAmount += slip.netPay;
      } else {
        totalInvalid++;
        globalErrors.push(`[${slip.employeeName}] ${errors.join(', ')}`);
      }
    }

    if (totalValid === 0 && slips.length > 0) {
      globalErrors.unshift('No eligible employees with valid bank details and net pay found for this payroll cycle.');
    }

    const summary: PaymentBatchValidationSummary = {
      totalItems: slips.length,
      totalValid,
      totalInvalid,
      totalAmount,
      isValid: totalInvalid === 0 && totalValid > 0,
      errors: globalErrors,
      warnings: globalWarnings,
      validatedAt: new Date().toISOString()
    };

    return { items, summary };
  }

  /**
   * Verifies total amount integrity.
   * Returns true only if the sum of valid items matches the batch total.
   */
  static verifyTotalIntegrity(batch: PaymentBatchRecord): { isValid: boolean; calculatedTotal: number; batchTotal: number; difference: number } {
    const calculatedTotal = batch.items
      .filter((item: any) => item.validationStatus === 'VALID')
      .reduce((sum: number, item: any) => sum + (item.netPay || 0), 0);

    const difference = Math.abs(calculatedTotal - batch.totalAmount);
    const isValid = difference < 0.01; // exact match within 1 paisa floating point tolerance

    return {
      isValid,
      calculatedTotal: Math.round(calculatedTotal * 100) / 100,
      batchTotal: Math.round(batch.totalAmount * 100) / 100,
      difference: Math.round(difference * 100) / 100
    };
  }

  /**
   * Generates the downloadable bank payment batch file based on the configured profile.
   */
  static generateBankExportFile(
    batch: PaymentBatchRecord,
    companyBank: CompanyBankAccountRecord | null,
    format: BankExportFormat
  ): BankExportFileResult {
    const validItems = batch.items.filter((i: any) => i.validationStatus === 'VALID');
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const isoDate = now.toISOString().split('T')[0];

    const debitAcc = companyBank?.accountNumber || batch.debitAccountReference || 'COMPANY_DISBURSEMENT_ACC';
    const debitHolder = companyBank?.accountHolderName || 'LOG SHEET MUSTER ENTERPRISE';

    let fileContent = '';
    let mimeType = 'text/csv;charset=utf-8;';
    let fileExtension = 'csv';

    switch (format) {
      case 'STANDARD_CSV': {
        // Universal NEFT/RTGS CSV
        const headers = [
          'Sr No',
          'Beneficiary Name',
          'Beneficiary Account Number',
          'IFSC Code',
          'Amount (INR)',
          'Payment Mode',
          'Debit Account Number',
          'Debit Account Holder',
          'Payment Reference',
          'Payment Date',
          'Remarks'
        ];
        const rows = validItems.map((item: any, index: number) => [
          index + 1,
          `"${item.employeeName.replace(/"/g, '""')}"`,
          `'${item.accountNumber}`, // Prepend apostrophe to preserve leading zeros in Excel
          item.ifscCode,
          item.netPay.toFixed(2),
          item.paymentMethod,
          `'${debitAcc}`,
          `"${debitHolder.replace(/"/g, '""')}"`,
          item.paymentReference,
          dateFormatted,
          `"Salary ${batch.payrollCycleLabel}"`
        ]);
        fileContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
        break;
      }

      case 'HDFC_CMS': {
        // HDFC Corporate E-Net CMS Format
        // Format: Transaction Type,Beneficiary Code,Beneficiary Account No,Amount,Beneficiary Name,Payment Details,Debit Account No,IFSC Code,Email ID,Date
        const headers = [
          'Txn Type',
          'Beneficiary Code',
          'Beneficiary Account No',
          'Instrument Amount',
          'Beneficiary Name',
          'Drawee Location',
          'Print Location',
          'Bene Address 1',
          'Bene Address 2',
          'Bene Address 3',
          'Bene Address 4',
          'Bene Address 5',
          'Instruction Ref No',
          'Customer Ref No',
          'Payment Details 1',
          'Debit Account No',
          'IFSC Code',
          'Bank Name',
          'Branch Name',
          'Beneficiary Email ID'
        ];
        const rows = validItems.map((item: any, index: number) => [
          item.paymentMethod === 'RTGS' ? 'R' : 'N', // N for NEFT, R for RTGS
          item.employeeCode || `EMP${index + 1}`,
          item.accountNumber,
          item.netPay.toFixed(2),
          `"${item.employeeName.replace(/"/g, '""')}"`,
          '', // Drawee location
          '', // Print location
          '', '', '', '', // Address fields
          item.paymentReference,
          `SAL-${batch.month}-${batch.year}`,
          `Salary for ${batch.payrollCycleLabel}`,
          debitAcc,
          item.ifscCode,
          item.bankName,
          '', // Branch name
          '' // Email
        ]);
        fileContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
        break;
      }

      case 'SBI_CORP': {
        // State Bank of India Corporate Bulk Payment
        // Format: Debit Account No,Value Date,Beneficiary Name,Beneficiary Account No,IFSC Code,Amount,Pay Mode,Narration
        const headers = [
          'Debit Account No',
          'Value Date',
          'Beneficiary Name',
          'Beneficiary Account No',
          'IFSC Code',
          'Amount',
          'Payment Mode',
          'Narration'
        ];
        const rows = validItems.map((item: any) => [
          debitAcc,
          dateFormatted,
          `"${item.employeeName.replace(/"/g, '""')}"`,
          item.accountNumber,
          item.ifscCode,
          item.netPay.toFixed(2),
          item.paymentMethod,
          `"Salary ${batch.payrollCycleLabel} Ref ${item.paymentReference}"`
        ]);
        fileContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
        break;
      }

      case 'ICICI_E_BANKING': {
        // ICICI Bank Corporate E-Banking CMS
        // Format: Pay Mode,Beneficiary Name,Beneficiary Bank,Beneficiary Account No,IFSC Code,Amount,Payment Date,Client Reference No,Debit Account No
        const headers = [
          'Payment Mode',
          'Beneficiary Name',
          'Beneficiary Bank Name',
          'Beneficiary Account Number',
          'IFSC Code',
          'Amount',
          'Payment Date',
          'Client Reference Number',
          'Debit Account Number',
          'Remarks'
        ];
        const rows = validItems.map((item: any) => [
          item.paymentMethod === 'RTGS' ? 'RTG' : 'NFT',
          `"${item.employeeName.replace(/"/g, '""')}"`,
          `"${item.bankName.replace(/"/g, '""')}"`,
          item.accountNumber,
          item.ifscCode,
          item.netPay.toFixed(2),
          isoDate,
          item.paymentReference,
          debitAcc,
          `"Salary ${batch.month}/${batch.year}"`
        ]);
        fileContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
        break;
      }

      case 'KOTAK_CMS': {
        // Kotak Mahindra Bank Corporate Payment
        const headers = [
          'Payment Type',
          'Beneficiary Name',
          'Beneficiary Account Number',
          'Beneficiary IFSC',
          'Amount',
          'Debit Account',
          'Payment Reference',
          'Date',
          'Remarks'
        ];
        const rows = validItems.map((item: any) => [
          item.paymentMethod,
          `"${item.employeeName.replace(/"/g, '""')}"`,
          item.accountNumber,
          item.ifscCode,
          item.netPay.toFixed(2),
          debitAcc,
          item.paymentReference,
          dateFormatted,
          `"Salary ${batch.payrollCycleLabel}"`
        ]);
        fileContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
        break;
      }

      case 'AXIS_BULK': {
        // Axis Bank Corporate Bulk Upload
        const headers = [
          'TRANS_TYPE',
          'CORP_ACC_NO',
          'VALUE_DATE',
          'TXN_AMOUNT',
          'BENEFICIARY_NAME',
          'BENEFICIARY_ACC_NO',
          'IFSC_CODE',
          'PAYMENT_REF'
        ];
        const rows = validItems.map((item: any) => [
          item.paymentMethod,
          debitAcc,
          dateFormatted,
          item.netPay.toFixed(2),
          `"${item.employeeName.replace(/"/g, '""')}"`,
          item.accountNumber,
          item.ifscCode,
          item.paymentReference
        ]);
        fileContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
        break;
      }

      case 'PIPE_DELIMITED_TXT': {
        // Pipe delimited TXT format
        mimeType = 'text/plain;charset=utf-8;';
        fileExtension = 'txt';
        const headers = 'HEADER|RECORD_TYPE|SR_NO|BENEFICIARY_NAME|ACCOUNT_NO|IFSC|AMOUNT|PAY_MODE|DEBIT_ACC|PAYMENT_REF|DATE|REMARKS';
        const rows = validItems.map((item: any, idx: number) => [
          'DETAIL',
          idx + 1,
          item.employeeName,
          item.accountNumber,
          item.ifscCode,
          item.netPay.toFixed(2),
          item.paymentMethod,
          debitAcc,
          item.paymentReference,
          isoDate,
          `Salary ${batch.payrollCycleLabel}`
        ].join('|'));
        const trailer = `TRAILER|TOTAL_RECORDS|${validItems.length}|TOTAL_AMOUNT|${batch.totalAmount.toFixed(2)}`;
        fileContent = [headers, ...rows, trailer].join('\r\n');
        break;
      }

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const cleanBatchNum = batch.batchNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanBatchNum}_${format}_${isoDate}.${fileExtension}`;

    // Simple deterministic checksum for verification
    const checksum = this.calculateChecksum(fileContent);

    return {
      fileName,
      fileContent,
      mimeType,
      format,
      recordCount: validItems.length,
      totalAmount: batch.totalAmount,
      generatedAt: now.toISOString(),
      batchNumber: batch.batchNumber,
      checksum
    };
  }

  /**
   * Helper to trigger browser file download.
   */
  static downloadFile(fileResult: BankExportFileResult): void {
    const blob = new Blob([fileResult.fileContent], { type: fileResult.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileResult.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Simple deterministic string checksum (FNV-1a 32-bit hash converted to hex).
   */
  private static calculateChecksum(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }
}
