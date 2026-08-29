import jsPDF from 'jspdf';
import { SalarySlipRecord, CompanyRecord } from '../types';
import { DataProtectionService } from './dataProtectionService';

/**
 * Enterprise Payslip Service
 * Responsible for authoritative rendering, formatting, PDF generation, and export
 * strictly using approved and locked payroll calculations.
 */
export class PayslipService {
  /**
   * Format Currency into standard Indian Rupees (INR) format e.g. ₹ 25,400.00
   */
  static formatINR(amount: number | undefined | null): string {
    const val = amount || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  /**
   * Generate a unique cryptographic-style verification hash for tamper verification
   */
  static generateVerificationCode(slip: SalarySlipRecord, companyCodePrefix?: string): string {
    const raw = `${slip.companyId}_${slip.payrollCycleId}_${slip.employeeId}_${slip.netPay}_${slip.generatedAt || 'GEN'}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    const prefix = (companyCodePrefix || 'PAY').toUpperCase().slice(0, 4);
    return `${prefix}-PAY-${slip.year}${String(slip.month).padStart(2, '0')}-${hex}`;
  }

  /**
   * Generates a high-precision, publication-grade vector PDF of the payslip using jsPDF
   */
  static generatePDF(slip: SalarySlipRecord, company?: Partial<CompanyRecord> | null): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182mm

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[(slip.month || 1) - 1] || 'Month';
    const periodStr = `${monthName} ${slip.year}`;

    const companyName = (company?.name || (company as any)?.brandName || company?.legalName || (company as any)?.companyLegalName || 'AUTHORIZED CORPORATE ENTITY').toUpperCase();
    const companyAddress = company?.address || (company as any)?.registeredAddress || '';
    const companyCin = company?.cinNumber || (company as any)?.registrationNumber;
    const companyGstin = company?.gstNumber || (company as any)?.gstin;

    const subDetails: string[] = [];
    if (companyAddress) subDetails.push(companyAddress);
    if (companyCin) subDetails.push(`CIN: ${companyCin}`);
    if (companyGstin) subDetails.push(`GSTIN: ${companyGstin}`);
    const subText = subDetails.join(' | ');

    // 1. Outer Border & Header Banner
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    // Top Header Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, margin, contentWidth, 26, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, pageWidth / 2, margin + 8, { align: 'center' });

    // Company Subtext / Address
    if (subText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(subText.length > 85 ? subText.slice(0, 82) + '...' : subText, pageWidth / 2, margin + 14, { align: 'center' });
    }

    // Document Title Banner
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, margin + 26, contentWidth, 9, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, margin + 35, margin + contentWidth, margin + 35);

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`PAYSLIP FOR THE MONTH OF ${periodStr.toUpperCase()}`, pageWidth / 2, margin + 32, { align: 'center' });

    let currentY = margin + 41;

    // 2. Employee Details Section (2-Column Grid)
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 2, currentY, contentWidth - 4, 38, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + 2, currentY, contentWidth - 4, 38);

    doc.setFontSize(8.5);
    const col1X = margin + 6;
    const col1ValX = margin + 42;
    const col2X = margin + (contentWidth / 2) + 4;
    const col2ValX = margin + (contentWidth / 2) + 40;

    const rowSpacing = 6;
    let empY = currentY + 6;

    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Employee Name:', col1X, empY);
    doc.setTextColor(15, 23, 42);
    doc.text(slip.employeeName || 'N/A', col1ValX, empY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Employee Code / ID:', col2X, empY);
    doc.setTextColor(15, 23, 42);
    doc.text(slip.employeeCode || slip.employeeId || 'N/A', col2ValX, empY);

    // Row 2
    empY += rowSpacing;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Designation:', col1X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(slip.designation || 'Staff', col1ValX, empY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Department:', col2X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(slip.departmentName || 'Operations', col2ValX, empY);

    // Row 3
    empY += rowSpacing;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Bank Name:', col1X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(slip.bankName || 'Direct Transfer', col1ValX, empY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Bank Account No:', col2X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const displayAccount = slip.accountNumber ? DataProtectionService.maskBankAccount(slip.accountNumber) : 'N/A';
    doc.text(displayAccount, col2ValX, empY);

    // Row 4
    empY += rowSpacing;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('IFSC Code:', col1X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(slip.ifscCode || 'N/A', col1ValX, empY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PAN Number:', col2X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const displayPan = slip.panNumber ? DataProtectionService.maskPan(slip.panNumber) : 'N/A';
    doc.text(displayPan, col2ValX, empY);

    // Row 5
    empY += rowSpacing;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('UAN / PF No:', col1X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const rawUan = slip.uanNumber || slip.pfNumber;
    const displayUan = rawUan ? (rawUan.length > 4 ? `••••••••${rawUan.slice(-4)}` : rawUan) : 'N/A';
    doc.text(displayUan, col1ValX, empY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('ESIC Number:', col2X, empY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(slip.esicNumber || 'N/A', col2ValX, empY);

    currentY += 42;

    // 3. Attendance Metrics Bar
    doc.setFillColor(241, 245, 249);
    doc.rect(margin + 2, currentY, contentWidth - 4, 16, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + 2, currentY, contentWidth - 4, 16);

    const attCols = [
      { label: 'Calendar Days', val: slip.totalMonthDays || 30 },
      { label: 'Worked / Present', val: slip.workedDays || 0 },
      { label: 'Paid Leaves', val: slip.paidLeaveDays || 0 },
      { label: 'Loss of Pay (LOP)', val: slip.lopDays || 0 },
      { label: 'Payable Days', val: slip.payableDays || 0 },
    ];
    const attColWidth = (contentWidth - 4) / attCols.length;

    attCols.forEach((col, idx) => {
      const x = margin + 2 + (idx * attColWidth);
      if (idx > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.line(x, currentY, x, currentY + 16);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(col.label, x + (attColWidth / 2), currentY + 5.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(String(col.val), x + (attColWidth / 2), currentY + 12, { align: 'center' });
    });

    currentY += 20;

    // 4. Earnings & Deductions Dual Table
    const halfWidth = (contentWidth - 4) / 2;
    const tableHeaderY = currentY;

    // Earnings Header
    doc.setFillColor(230, 242, 235); // light emerald
    doc.rect(margin + 2, tableHeaderY, halfWidth, 7, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.rect(margin + 2, tableHeaderY, halfWidth, 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text('EARNINGS', margin + 6, tableHeaderY + 5);
    doc.text('AMOUNT (INR)', margin + 2 + halfWidth - 6, tableHeaderY + 5, { align: 'right' });

    // Deductions Header
    doc.setFillColor(254, 238, 238); // light rose
    doc.rect(margin + 2 + halfWidth, tableHeaderY, halfWidth, 7, 'F');
    doc.setDrawColor(254, 205, 211);
    doc.rect(margin + 2 + halfWidth, tableHeaderY, halfWidth, 7);

    doc.setTextColor(159, 18, 57); // rose-800
    doc.text('DEDUCTIONS', margin + 6 + halfWidth, tableHeaderY + 5);
    doc.text('AMOUNT (INR)', margin + contentWidth - 8, tableHeaderY + 5, { align: 'right' });

    currentY += 7;

    const earningsList = [
      { name: 'Basic Salary', amt: slip.earnings?.basic || 0 },
      { name: 'House Rent Allowance (HRA)', amt: slip.earnings?.hra || 0 },
      { name: 'Dearness Allowance (DA)', amt: slip.earnings?.da || 0 },
      { name: 'Conveyance Allowance', amt: slip.earnings?.conveyance || 0 },
      { name: 'Medical Allowance', amt: slip.earnings?.medical || 0 },
      { name: 'Special Allowance', amt: slip.earnings?.specialAllowance || 0 },
      { name: 'Overtime Pay', amt: slip.earnings?.overtimePay || 0 },
      { name: 'Performance Bonus / Other', amt: slip.earnings?.bonus || 0 },
    ];

    const deductionsList = [
      { name: 'Provident Fund (PF - Employee)', amt: slip.deductions?.pf || 0 },
      { name: 'Employee State Insurance (ESIC)', amt: slip.deductions?.esic || 0 },
      { name: 'Professional Tax (PT)', amt: slip.deductions?.pt || 0 },
      { name: 'Tax Deducted at Source (TDS)', amt: slip.deductions?.tds || 0 },
      { name: 'Advance / Loan Recovery', amt: slip.deductions?.advanceDeduction || 0 },
      { name: 'Loss of Pay (LOP) Deduction', amt: slip.deductions?.lopDeduction || 0 },
      { name: 'Other Deductions', amt: slip.deductions?.otherDeductions || 0 },
    ];

    const maxRows = Math.max(earningsList.length, deductionsList.length);
    const itemRowHeight = 6.5;

    for (let i = 0; i < maxRows; i++) {
      const rowY = currentY + (i * itemRowHeight);
      const isEven = i % 2 === 0;

      // Earnings Row
      if (isEven) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(249, 250, 251);
      }
      doc.rect(margin + 2, rowY, halfWidth, itemRowHeight, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(margin + 2, rowY, halfWidth, itemRowHeight);

      const ern = earningsList[i];
      if (ern) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(ern.name, margin + 6, rowY + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(ern.amt > 0 ? `₹ ${ern.amt.toLocaleString('en-IN')}` : '₹ 0', margin + 2 + halfWidth - 6, rowY + 4.5, { align: 'right' });
      }

      // Deductions Row
      doc.rect(margin + 2 + halfWidth, rowY, halfWidth, itemRowHeight, 'F');
      doc.rect(margin + 2 + halfWidth, rowY, halfWidth, itemRowHeight);

      const ded = deductionsList[i];
      if (ded) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(ded.name, margin + 6 + halfWidth, rowY + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(ded.amt > 0 ? `₹ ${ded.amt.toLocaleString('en-IN')}` : '₹ 0', margin + contentWidth - 8, rowY + 4.5, { align: 'right' });
      }
    }

    currentY += (maxRows * itemRowHeight);

    // 5. Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin + 2, currentY, halfWidth, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + 2, currentY, halfWidth, 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL GROSS EARNINGS', margin + 6, currentY + 5.5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`₹ ${(slip.earnings?.totalGross || 0).toLocaleString('en-IN')}`, margin + 2 + halfWidth - 6, currentY + 5.5, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.rect(margin + 2 + halfWidth, currentY, halfWidth, 8, 'F');
    doc.rect(margin + 2 + halfWidth, currentY, halfWidth, 8);

    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL DEDUCTIONS', margin + 6 + halfWidth, currentY + 5.5);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(`₹ ${(slip.deductions?.totalDeductions || 0).toLocaleString('en-IN')}`, margin + contentWidth - 8, currentY + 5.5, { align: 'right' });

    currentY += 12;

    // 6. Net Pay Highlight Box
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin + 2, currentY, contentWidth - 4, 18, 'F');

    doc.setTextColor(226, 232, 240);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('NET TAKE HOME SALARY', margin + 8, currentY + 7);

    doc.setTextColor(52, 211, 153); // emerald-400
    doc.setFontSize(14);
    doc.text(`₹ ${(slip.netPay || 0).toLocaleString('en-IN')}`, margin + contentWidth - 8, currentY + 11, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Amount in Words: ${slip.netPayInWords || 'Zero Rupees Only'}`, margin + 8, currentY + 13.5);

    currentY += 24;

    // 7. Security Hash, Verification Bar & Signatures
    const verificationCode = slip.verificationHash || this.generateVerificationCode(slip);

    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 2, currentY, contentWidth - 4, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + 2, currentY, contentWidth - 4, 30);

    // Left: Verification Hash and timestamp
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('SYSTEM VERIFICATION & AUDIT TRAIL', margin + 6, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Doc Token: ${verificationCode}`, margin + 6, currentY + 11);
    doc.text(`Generated On: ${slip.generatedAt || new Date().toISOString()}`, margin + 6, currentY + 16);
    doc.text(`Status: ${slip.status || 'APPROVED'} | Disbursed via Banking Channel`, margin + 6, currentY + 21);
    doc.text('Note: This is a system-generated payslip and does not require a physical signature.', margin + 6, currentY + 26);

    // Right: Authorized Signatory Stamp Box
    const signBoxX = margin + contentWidth - 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('FOR ' + companyName.slice(0, 26), signBoxX, currentY + 6);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(signBoxX, currentY + 22, signBoxX + 50, currentY + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signatory / HR Department', signBoxX, currentY + 26);

    // Footer Watermark
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Confidential Payroll Record • Digitally processed for ${companyName.slice(0, 40)}`, pageWidth / 2, pageHeight - margin + 3, { align: 'center' });

    return doc;
  }

  /**
   * Directly triggers download of the payslip PDF in the browser
   */
  static downloadPDF(slip: SalarySlipRecord, company?: Partial<CompanyRecord> | null): void {
    const doc = this.generatePDF(slip, company);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mStr = monthNames[(slip.month || 1) - 1] || 'Month';
    const safeEmpName = (slip.employeeName || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Payslip_${safeEmpName}_${mStr}_${slip.year}.pdf`;
    doc.save(filename);
  }

  /**
   * Opens print dialog for the generated PDF
   */
  static printPDF(slip: SalarySlipRecord, company?: Partial<CompanyRecord> | null): void {
    const doc = this.generatePDF(slip, company);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.src = typeof blobUrl === 'string' ? blobUrl : (blobUrl as any)?.toString() || '';
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Print iframe error', e);
      }
    }, 500);
  }

  /**
   * Generates and downloads a CSV summary of all payslips in a cycle
   */
  static exportSummaryCSV(slips: SalarySlipRecord[], cycleLabel: string): void {
    const headers = [
      'Slip ID',
      'Employee Code / ID',
      'Employee Name',
      'Department',
      'Designation',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'PAN Number',
      'UAN Number',
      'Calendar Days',
      'Worked Days',
      'LOP Days',
      'Payable Days',
      'Basic',
      'HRA',
      'DA',
      'Conveyance',
      'Medical',
      'Special Allowance',
      'Overtime Pay',
      'Bonus',
      'Total Gross',
      'PF Deduction',
      'ESIC Deduction',
      'PT Deduction',
      'TDS Deduction',
      'Advance Recovery',
      'Total Deductions',
      'Net Pay',
      'Status',
      'Published'
    ];

    const rows = slips.map(s => [
      s.id,
      s.employeeCode || s.employeeId,
      `"${s.employeeName}"`,
      `"${s.departmentName || ''}"`,
      `"${s.designation || ''}"`,
      `"${s.bankName || ''}"`,
      `"${s.accountNumber || ''}"`,
      s.ifscCode || '',
      s.panNumber || '',
      s.uanNumber || '',
      s.totalMonthDays,
      s.workedDays,
      s.lopDays,
      s.payableDays,
      s.earnings?.basic || 0,
      s.earnings?.hra || 0,
      s.earnings?.da || 0,
      s.earnings?.conveyance || 0,
      s.earnings?.medical || 0,
      s.earnings?.specialAllowance || 0,
      s.earnings?.overtimePay || 0,
      s.earnings?.bonus || 0,
      s.earnings?.totalGross || 0,
      s.deductions?.pf || 0,
      s.deductions?.esic || 0,
      s.deductions?.pt || 0,
      s.deductions?.tds || 0,
      s.deductions?.advanceDeduction || 0,
      s.deductions?.totalDeductions || 0,
      s.netPay || 0,
      s.status || 'GENERATED',
      s.isPublished ? 'YES' : 'NO'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payroll_Summary_${cycleLabel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
